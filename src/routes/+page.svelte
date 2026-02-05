<script lang="ts">
  import { onMount } from "svelte";
  import { TokenBudgetBar, Zone, Modal, Toast, CommandPalette, ThemeToggle, DensityControl, TitleBar, ThemeCustomizer, BlockTypeManager, ZoneManager } from "$lib/components";
  import { contextStore, selectionStore, uiStore, themeStore, blockTypesStore, zonesStore } from "$lib/stores";
  import type { Zone as ZoneType, Block } from "$lib/types";

  // Sidebar resize state
  let isResizingSidebar = $state(false);
  let resizeStartX = $state(0);
  let resizeStartWidth = $state(0);

  // Zone resize state
  let resizingZoneId = $state<string | null>(null);
  let zoneResizeStartY = $state(0);
  let zoneResizeStartHeight = $state(0);

  // Initialize stores on mount
  onMount(() => {
    // Initialize theme store (loads from localStorage)
    themeStore.init();

    // Initialize density from localStorage
    uiStore.initDensity();

    // Initialize sidebar width
    uiStore.initSidebarWidth();

    // Initialize custom block types
    blockTypesStore.init();

    // Initialize zones store
    zonesStore.init();

    // Load demo data
    contextStore.loadDemoData();
  });

  // Sidebar resize handlers
  function handleResizeStart(e: MouseEvent) {
    isResizingSidebar = true;
    resizeStartX = e.clientX;
    resizeStartWidth = uiStore.sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function handleResizeMove(e: MouseEvent) {
    if (!isResizingSidebar) return;
    const delta = e.clientX - resizeStartX;
    uiStore.setSidebarWidth(resizeStartWidth + delta);
  }

  function handleResizeEnd() {
    if (!isResizingSidebar) return;
    isResizingSidebar = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  // Zone resize handlers
  function handleZoneResizeStart(e: MouseEvent, zoneId: string, measuredHeight?: number) {
    e.preventDefault();
    e.stopPropagation();

    // If zone is expanded, capture its actual rendered height before un-expanding
    if (zonesStore.isZoneExpanded(zoneId)) {
      if (measuredHeight && measuredHeight > zonesStore.minZoneHeight) {
        zonesStore.setZoneHeight(zoneId, measuredHeight);
      }
      zonesStore.setZoneExpanded(zoneId, false);
    }

    resizingZoneId = zoneId;
    zoneResizeStartY = e.clientY;
    zoneResizeStartHeight = zonesStore.getZoneHeight(zoneId);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.getSelection()?.removeAllRanges();
  }

  function handleZoneResizeMove(e: MouseEvent) {
    if (!resizingZoneId) return;
    e.preventDefault();
    const delta = e.clientY - zoneResizeStartY;
    zonesStore.setZoneHeight(resizingZoneId, zoneResizeStartHeight + delta);
  }

  function handleZoneResizeEnd() {
    if (!resizingZoneId) return;
    resizingZoneId = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (uiStore.hasModal || uiStore.commandPaletteOpen) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case "a":
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          selectionStore.selectAll();
          uiStore.showToast("Selected all blocks", "info");
        }
        break;
      case "escape":
        e.preventDefault();
        selectionStore.deselect();
        break;
      case "delete":
      case "backspace":
        if (selectionStore.hasSelection) {
          e.preventDefault();
          const count = selectionStore.count;
          contextStore.removeBlocks([...selectionStore.selectedIds]);
          selectionStore.deselect();
          uiStore.showToast(`Removed ${count} block(s)`, "success");
        }
        break;
      case "s":
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const snap = contextStore.saveSnapshot(`Snapshot ${contextStore.snapshots.length + 1}`);
          uiStore.showToast(`Saved: ${snap.name}`, "success");
        }
        break;
      case "k":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          uiStore.toggleCommandPalette();
        }
        break;
    }
  }

  // Event handlers
  function handleBlockSelect(id: string, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) {
    selectionStore.handleClick(id, event);
  }

  function handleBlockDoubleClick(id: string) {
    uiStore.openModal(id);
  }

  function handleBlockDragStart(ids: string[]) {
    uiStore.startDrag(ids);
  }

  function handleBlockDragEnd() {
    uiStore.endDrag();
  }

  function handleZoneDrop(zone: ZoneType, blockIds: string[]) {
    for (const id of blockIds) {
      contextStore.moveBlock(id, zone);
    }
    const count = blockIds.length;
    uiStore.showToast(`Moved ${count > 1 ? `${count} blocks` : '1 block'} to ${zone}`, "info");
  }

  function handleZoneReorder(zone: ZoneType, blockIds: string[], insertIndex: number) {
    contextStore.reorderBlocksInZone(zone, blockIds, insertIndex);
    const count = blockIds.length;
    uiStore.showToast(`Reordered ${count > 1 ? `${count} blocks` : 'block'}`, "info");
  }

  function handleCreateBlock(zone: ZoneType, typeId: string) {
    // Create a new block with the specified type
    const blockTypeInfo = blockTypesStore.getTypeById(typeId);
    const label = blockTypeInfo?.label ?? typeId;

    // Determine role: built-in types use their ID as role, custom types default to "user"
    const isBuiltIn = blockTypeInfo?.isBuiltIn ?? false;
    const role: Block["role"] = isBuiltIn ? (typeId as Block["role"]) : "user";
    const content = `New ${label} block`;

    // Pass blockType for custom types so display knows which type this is
    const newBlock = contextStore.createBlock(zone, role, content, isBuiltIn ? undefined : typeId);
    selectionStore.select(newBlock.id);
    uiStore.openModal(newBlock.id);
    uiStore.showToast(`Created ${label} block in ${zone}`, "success");
  }

  function handleToggleZoneCollapse(zone: ZoneType) {
    uiStore.toggleZoneCollapse(zone);
  }

  // Modal handlers
  function handleModalClose() {
    uiStore.closeModal();
  }

  function handleModalCompress(level: Block["compressionLevel"]) {
    if (uiStore.modalBlockId) {
      contextStore.setCompressionLevel(uiStore.modalBlockId, level);
    }
  }

  function handleModalMove(zone: ZoneType) {
    if (uiStore.modalBlockId) {
      contextStore.moveBlock(uiStore.modalBlockId, zone);
    }
  }

  function handleModalPin(position: Block["pinned"]) {
    if (uiStore.modalBlockId) {
      contextStore.pinBlock(uiStore.modalBlockId, position);
    }
  }

  function handleModalRemove() {
    if (uiStore.modalBlockId) {
      contextStore.removeBlock(uiStore.modalBlockId);
      uiStore.closeModal();
      uiStore.showToast("Block removed", "success");
    }
  }

  function handleModalRoleChange(role: Block["role"], blockType?: string) {
    if (uiStore.modalBlockId) {
      contextStore.setBlockRole(uiStore.modalBlockId, role, blockType);
      const label = blockType
        ? blockTypesStore.getTypeById(blockType)?.label ?? blockType
        : role;
      uiStore.showToast(`Changed type to ${label}`, "success");
    }
  }

  // Command palette handler
  function handleCommand(command: string) {
    switch (command) {
      case 'select-all':
        selectionStore.selectAll();
        uiStore.showToast('Selected all blocks', 'info');
        break;
      case 'deselect':
        selectionStore.deselect();
        break;
      case 'remove-selected':
        if (selectionStore.hasSelection) {
          const count = selectionStore.count;
          contextStore.removeBlocks([...selectionStore.selectedIds]);
          selectionStore.deselect();
          uiStore.showToast(`Removed ${count} block(s)`, 'success');
        }
        break;
      case 'snapshot': {
        const snap = contextStore.saveSnapshot(`Snapshot ${contextStore.snapshots.length + 1}`);
        uiStore.showToast(`Saved: ${snap.name}`, 'success');
        break;
      }
      case 'load-demo':
        contextStore.loadDemoData();
        uiStore.showToast('Demo data loaded', 'success');
        break;
      case 'toggle-primacy':
        uiStore.toggleZoneCollapse('primacy');
        break;
      case 'toggle-middle':
        uiStore.toggleZoneCollapse('middle');
        break;
      case 'toggle-recency':
        uiStore.toggleZoneCollapse('recency');
        break;
    }
  }

  function formatNumber(n: number): string {
    return n.toLocaleString();
  }
</script>

<svelte:window
  on:keydown={handleKeydown}
  on:mousemove={(e) => { handleResizeMove(e); handleZoneResizeMove(e); }}
  on:mouseup={() => { handleResizeEnd(); handleZoneResizeEnd(); }}
/>

<div class="app">
  <!-- Custom Title Bar (replaces OS title bar) -->
  <TitleBar />

  <!-- Header -->
  <header class="header">
    <div class="header-left">
      <TokenBudgetBar budget={contextStore.tokenBudget} limit={contextStore.tokenLimit} />
    </div>

    <div class="header-right">
      <ThemeToggle />
      <button class="btn" onclick={() => contextStore.loadDemoData()}>Demo</button>
      <button class="btn btn-primary" onclick={() => uiStore.toggleCommandPalette()}>
        <span>⌘K</span>
      </button>
    </div>
  </header>

  <!-- Main -->
  <main class="main">
    <!-- Sidebar -->
    <aside class="sidebar" style:width="{uiStore.sidebarWidth}px">
      <section class="sidebar-section">
        <h3 class="sidebar-heading">Snapshots</h3>
        {#if contextStore.snapshots.length === 0}
          <p class="sidebar-empty">No snapshots</p>
        {:else}
          <div class="snapshot-list">
            {#each contextStore.snapshots as snapshot (snapshot.id)}
              <button
                class="snapshot-item"
                onclick={() => {
                  contextStore.restoreSnapshot(snapshot.id);
                  uiStore.showToast(`Restored: ${snapshot.name}`, "success");
                }}
              >
                <span class="snapshot-name">{snapshot.name}</span>
                <span class="snapshot-meta">{formatNumber(snapshot.totalTokens)}</span>
              </button>
            {/each}
          </div>
        {/if}
        <button
          class="btn btn-full"
          onclick={() => {
            const snap = contextStore.saveSnapshot(`Snapshot ${contextStore.snapshots.length + 1}`);
            uiStore.showToast(`Saved: ${snap.name}`, "success");
          }}
        >
          Save Snapshot
        </button>
      </section>

      <!-- Block Types Manager -->
      <BlockTypeManager />

      <!-- Zone Manager -->
      <ZoneManager />

      <section class="sidebar-section">
        <h3 class="sidebar-heading">Display</h3>
        <DensityControl />
      </section>

      <!-- Theme Customizer -->
      <ThemeCustomizer />

      <section class="sidebar-section sidebar-grow">
        <h3 class="sidebar-heading">Shortcuts</h3>
        <div class="shortcuts">
          <div class="shortcut"><kbd>A</kbd> Select all</div>
          <div class="shortcut"><kbd>Esc</kbd> Deselect</div>
          <div class="shortcut"><kbd>Del</kbd> Remove</div>
          <div class="shortcut"><kbd>S</kbd> Snapshot</div>
          <div class="shortcut"><kbd>⌘K</kbd> Commands</div>
        </div>
      </section>
    </aside>

    <!-- Sidebar Resize Handle -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="sidebar-resize-handle"
      class:active={isResizingSidebar}
      onmousedown={handleResizeStart}
    ></div>

    <!-- Content -->
    <div class="content">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-info">
          <strong>{selectionStore.count}</strong> selected
          <span class="toolbar-sep">·</span>
          <strong>{formatNumber(selectionStore.selectedTokens)}</strong> tokens
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-sm" onclick={() => selectionStore.selectAll()}>Select All</button>
          <button class="btn btn-sm" onclick={() => selectionStore.deselect()}>Clear</button>
          <button
            class="btn btn-sm btn-danger"
            disabled={!selectionStore.hasSelection}
            onclick={() => {
              const count = selectionStore.count;
              contextStore.removeBlocks([...selectionStore.selectedIds]);
              selectionStore.deselect();
              uiStore.showToast(`Removed ${count} block(s)`, "success");
            }}
          >
            Remove
          </button>
        </div>
      </div>

      <!-- Zones -->
      <div class="zones" class:resizing={resizingZoneId !== null}>
        {#each zonesStore.zonesByDisplayOrder as zoneConfig (zoneConfig.id)}
          <Zone
            zone={zoneConfig.id as ZoneType}
            blocks={contextStore.blocksByZone[zoneConfig.id] ?? []}
            collapsed={uiStore.isZoneCollapsed(zoneConfig.id)}
            selectedIds={selectionStore.selectedIds}
            draggingBlockIds={uiStore.draggingBlockIds}
            height={zonesStore.getZoneHeight(zoneConfig.id)}
            expanded={zonesStore.isZoneExpanded(zoneConfig.id)}
            contentExpanded={zonesStore.isContentExpanded(zoneConfig.id)}
            isResizing={resizingZoneId === zoneConfig.id}
            onToggleCollapse={() => handleToggleZoneCollapse(zoneConfig.id as ZoneType)}
            onToggleExpanded={() => { if (!resizingZoneId) zonesStore.toggleZoneExpanded(zoneConfig.id); }}
            onToggleContentExpanded={() => zonesStore.toggleContentExpanded(zoneConfig.id)}
            onBlockSelect={handleBlockSelect}
            onBlockDoubleClick={handleBlockDoubleClick}
            onBlockDragStart={handleBlockDragStart}
            onBlockDragEnd={handleBlockDragEnd}
            onDrop={handleZoneDrop}
            onCreateBlock={handleCreateBlock}
            onReorder={handleZoneReorder}
            onResizeStart={(e, h) => handleZoneResizeStart(e, zoneConfig.id, h)}
          />
        {/each}
      </div>
    </div>
  </main>
</div>

<!-- Modal -->
<Modal
  block={uiStore.modalBlockId ? contextStore.getBlock(uiStore.modalBlockId) ?? null : null}
  open={uiStore.hasModal}
  onClose={handleModalClose}
  onCompress={handleModalCompress}
  onMove={handleModalMove}
  onPin={handleModalPin}
  onRemove={handleModalRemove}
  onRoleChange={handleModalRoleChange}
/>

<!-- Toasts -->
<Toast toasts={uiStore.toasts} onDismiss={(id) => uiStore.dismissToast(id)} />

<!-- Command Palette -->
<CommandPalette
  open={uiStore.commandPaletteOpen}
  onClose={() => uiStore.toggleCommandPalette()}
  onCommand={handleCommand}
/>

<style>
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-base);
    position: relative;
  }

  /* Header — Below title bar */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(var(--space-sm) * var(--density-scale, 1)) var(--space-md);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    gap: var(--space-md);
    z-index: 10;
  }

  .header-left {
    flex: 1;
    max-width: 500px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-shrink: 0;
  }

  /* Buttons */
  .btn {
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 5px 10px;
    border: 1px solid var(--border-default);
    border-radius: 4px;
    background: var(--bg-surface);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.12s ease;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  .btn:active:not(:disabled) {
    transform: scale(0.98);
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-sm {
    font-size: 10px;
    padding: 3px 7px;
  }

  .btn-primary {
    background: var(--text-primary);
    color: var(--bg-surface);
    border-color: var(--text-primary);
    font-weight: 500;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.85;
    color: var(--bg-surface);
  }

  .btn-danger {
    color: var(--semantic-danger);
    border-color: color-mix(in srgb, var(--semantic-danger) 50%, transparent);
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--semantic-danger);
    color: var(--bg-surface);
    border-color: var(--semantic-danger);
  }

  .btn-full {
    width: 100%;
    justify-content: center;
  }

  /* Main layout */
  .main {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  /* Sidebar */
  .sidebar {
    background: var(--bg-surface);
    border-right: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* Sidebar Resize Handle */
  .sidebar-resize-handle {
    width: 4px;
    cursor: col-resize;
    background: transparent;
    transition: background 0.15s ease;
    flex-shrink: 0;
  }

  .sidebar-resize-handle:hover,
  .sidebar-resize-handle.active {
    background: var(--accent);
  }

  .sidebar-section {
    padding: var(--space-md) var(--space-sm);
    border-bottom: 1px solid var(--border-subtle);
  }

  .sidebar-section:last-child {
    border-bottom: none;
  }

  .sidebar-grow {
    flex: 1;
  }

  .sidebar-heading {
    font-family: var(--font-display);
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-muted);
    margin-bottom: var(--space-sm);
    padding-left: 2px;
  }

  .sidebar-empty {
    font-size: 11px;
    color: var(--text-faint);
    font-style: italic;
    margin-bottom: var(--space-sm);
  }

  /* Snapshots */
  .snapshot-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: var(--space-sm);
    max-height: 100px;
    overflow-y: auto;
  }

  .snapshot-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.1s ease;
    text-align: left;
    width: 100%;
  }

  .snapshot-item:hover {
    background: var(--bg-hover);
    border-color: var(--border-default);
  }

  .snapshot-name {
    font-size: 10px;
    color: var(--text-secondary);
  }

  .snapshot-meta {
    font-size: 9px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  /* Shortcuts */
  .shortcuts {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 10px;
    color: var(--text-muted);
  }

  .shortcut {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  kbd {
    font-family: var(--font-mono);
    font-size: 9px;
    padding: 2px 4px;
    background: var(--bg-inset);
    border: 1px solid var(--border-subtle);
    border-radius: 2px;
    color: var(--text-secondary);
    min-width: 20px;
    text-align: center;
  }

  /* Content area */
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-base);
  }

  /* Toolbar */
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px var(--space-md);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
  }

  .toolbar-info {
    font-size: 11px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .toolbar-info strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .toolbar-sep {
    margin: 0 4px;
    opacity: 0.4;
  }

  .toolbar-actions {
    display: flex;
    gap: 4px;
  }

  /* Zones container */
  .zones {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    scrollbar-width: thin;
    scrollbar-color: var(--border-default) transparent;
  }

  .zones::-webkit-scrollbar {
    width: 8px;
  }

  .zones::-webkit-scrollbar-track {
    background: transparent;
  }

  .zones::-webkit-scrollbar-thumb {
    background: var(--border-default);
    border-radius: 4px;
  }

  .zones::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }

  .zones.resizing {
    user-select: none;
    cursor: row-resize;
  }
</style>
