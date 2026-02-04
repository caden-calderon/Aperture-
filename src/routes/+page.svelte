<script lang="ts">
  import { onMount } from "svelte";
  import { TokenBudgetBar, Zone, Modal, Toast, CommandPalette, ThemeToggle, DensityControl, TitleBar, ThemeCustomizer } from "$lib/components";
  import { contextStore, selectionStore, uiStore, themeStore } from "$lib/stores";
  import type { Zone as ZoneType, Block } from "$lib/types";

  // Initialize theme and density on mount
  onMount(() => {
    // Initialize theme store (loads from localStorage)
    themeStore.init();

    // Initialize density from localStorage
    uiStore.initDensity();

    // Load demo data
    contextStore.loadDemoData();
  });

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

  function handleBlockDragStart(id: string) {
    uiStore.startDrag(id);
  }

  function handleBlockDragEnd() {
    uiStore.endDrag();
  }

  function handleZoneDrop(zone: ZoneType, blockId: string) {
    contextStore.moveBlock(blockId, zone);
    uiStore.showToast(`Moved to ${zone}`, "info");
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

<svelte:window on:keydown={handleKeydown} />

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
    <aside class="sidebar">
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

      <section class="sidebar-section">
        <h3 class="sidebar-heading">Block Types</h3>
        <div class="type-list">
          <div class="type-item">
            <span class="type-dot" style="background: var(--role-system)"></span>
            <span class="type-label">system</span>
            <span class="type-count">{formatNumber(contextStore.tokenBudget.byRole.system)}</span>
          </div>
          <div class="type-item">
            <span class="type-dot" style="background: var(--role-user)"></span>
            <span class="type-label">user</span>
            <span class="type-count">{formatNumber(contextStore.tokenBudget.byRole.user)}</span>
          </div>
          <div class="type-item">
            <span class="type-dot" style="background: var(--role-assistant)"></span>
            <span class="type-label">assistant</span>
            <span class="type-count">{formatNumber(contextStore.tokenBudget.byRole.assistant)}</span>
          </div>
          <div class="type-item">
            <span class="type-dot" style="background: var(--role-tool)"></span>
            <span class="type-label">tool</span>
            <span class="type-count">{formatNumber(contextStore.tokenBudget.byRole.tool_use + contextStore.tokenBudget.byRole.tool_result)}</span>
          </div>
        </div>
      </section>

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
      <div class="zones">
        <Zone
          zone="primacy"
          blocks={contextStore.blocksByZone.primacy}
          collapsed={uiStore.isZoneCollapsed("primacy")}
          selectedIds={selectionStore.selectedIds}
          draggingBlockId={uiStore.draggingBlockId}
          onToggleCollapse={() => handleToggleZoneCollapse("primacy")}
          onBlockSelect={handleBlockSelect}
          onBlockDoubleClick={handleBlockDoubleClick}
          onBlockDragStart={handleBlockDragStart}
          onBlockDragEnd={handleBlockDragEnd}
          onDrop={handleZoneDrop}
        />

        <Zone
          zone="middle"
          blocks={contextStore.blocksByZone.middle}
          collapsed={uiStore.isZoneCollapsed("middle")}
          selectedIds={selectionStore.selectedIds}
          draggingBlockId={uiStore.draggingBlockId}
          onToggleCollapse={() => handleToggleZoneCollapse("middle")}
          onBlockSelect={handleBlockSelect}
          onBlockDoubleClick={handleBlockDoubleClick}
          onBlockDragStart={handleBlockDragStart}
          onBlockDragEnd={handleBlockDragEnd}
          onDrop={handleZoneDrop}
        />

        <Zone
          zone="recency"
          blocks={contextStore.blocksByZone.recency}
          collapsed={uiStore.isZoneCollapsed("recency")}
          selectedIds={selectionStore.selectedIds}
          draggingBlockId={uiStore.draggingBlockId}
          onToggleCollapse={() => handleToggleZoneCollapse("recency")}
          onBlockSelect={handleBlockSelect}
          onBlockDoubleClick={handleBlockDoubleClick}
          onBlockDragStart={handleBlockDragStart}
          onBlockDragEnd={handleBlockDragEnd}
          onDrop={handleZoneDrop}
        />
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
    width: 200px;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow-y: auto;
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

  /* Type list */
  .type-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .type-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: 3px 0;
    font-size: 11px;
  }

  .type-dot {
    width: 6px;
    height: 6px;
    border-radius: 1px;
    flex-shrink: 0;
  }

  .type-label {
    color: var(--text-secondary);
    flex: 1;
    font-size: 10px;
  }

  .type-count {
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
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
</style>
