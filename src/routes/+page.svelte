<script lang="ts">
  import { onMount } from "svelte";
  import { TokenBudgetBar, Zone, Modal, Toast, CommandPalette, ThemeToggle, DensityControl, TitleBar, ThemeCustomizer, BlockTypeManager, ZoneManager, SearchBar, TerminalPanel, ContextMenu } from "$lib/components";
  import { contextStore, selectionStore, uiStore, themeStore, blockTypesStore, zonesStore, searchStore, terminalStore } from "$lib/stores";
  import type { Zone as ZoneType, Block } from "$lib/types";

  // Sidebar resize state
  let isResizingSidebar = $state(false);
  let resizeStartX = $state(0);
  let resizeStartWidth = $state(0);
  let sidebarResizeRaf = $state<number | null>(null);
  let sidebarRef = $state<HTMLElement | null>(null);

  // Zone resize state
  let resizingZoneId = $state<string | null>(null);
  let zoneResizeStartY = $state(0);
  let zoneResizeStartHeight = $state(0);

  // Terminal split resize state
  let isResizingTerminal = $state(false);
  let termResizeStart = $state(0);
  let termResizeStartSize = $state(0);
  let termResizeRaf = $state<number | null>(null);
  let terminalPanelRef = $state<HTMLElement | null>(null);
  let terminalPanelComponentRef = $state<ReturnType<typeof TerminalPanel> | null>(null);
  let contentRef = $state<HTMLElement | null>(null);

  // Context menu state
  let contextMenuBlock = $state<string | null>(null);
  let contextMenuX = $state(0);
  let contextMenuY = $state(0);
  let contextMenuVisible = $state(false);

  // Minimum content area size before auto-collapsing context panel
  const MIN_CONTENT_SIZE = 120;

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

    // Initialize context panel state
    uiStore.initContextPanel();

    // Initialize terminal store
    terminalStore.init();

    // Load persisted blocks or demo data
    contextStore.init();

    // Cleanup terminal session on window close
    const handleBeforeUnload = () => {
      const sid = terminalStore.sessionId;
      if (sid) {
        // Use navigator.sendBeacon-style sync cleanup isn't possible with Tauri IPC,
        // but invoke is async. Fire-and-forget is the best we can do.
        import("@tauri-apps/api/core").then(({ invoke }) => {
          invoke('kill_session', { sessionId: sid }).catch(() => {});
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });

  // Reactively update terminal theme when theme changes
  $effect(() => {
    // Track theme changes
    void themeStore.currentPresetId;
    void themeStore.customColors;
    // Update terminal if visible
    terminalPanelComponentRef?.updateTheme();
  });

  // Sidebar resize handlers — uses rAF + direct DOM for smooth resize
  function handleResizeStart(e: MouseEvent) {
    isResizingSidebar = true;
    resizeStartX = e.clientX;
    resizeStartWidth = uiStore.sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.documentElement.classList.add('is-resizing');
  }

  function handleResizeMove(e: MouseEvent) {
    if (!isResizingSidebar) return;
    // Cancel any pending rAF to coalesce rapid mousemove events
    if (sidebarResizeRaf) cancelAnimationFrame(sidebarResizeRaf);
    sidebarResizeRaf = requestAnimationFrame(() => {
      const delta = e.clientX - resizeStartX;
      // Allow dragging all the way down for snap-to-collapse
      const newWidth = Math.max(uiStore.collapsedSidebarWidth, Math.min(400, resizeStartWidth + delta));
      // Direct DOM update during drag for smoothness — bypasses Svelte reactivity
      if (sidebarRef) {
        sidebarRef.style.width = `${newWidth}px`;
      }
    });
  }

  function handleResizeEnd() {
    if (!isResizingSidebar) return;
    if (sidebarResizeRaf) cancelAnimationFrame(sidebarResizeRaf);
    // Commit final width to store (triggers one reactive update — handles snap-to-collapse)
    if (sidebarRef) {
      const finalWidth = parseInt(sidebarRef.style.width) || uiStore.sidebarWidth;
      uiStore.setSidebarWidth(finalWidth);
      // Sync DOM with store-determined width
      sidebarRef.style.width = `${uiStore.sidebarWidth}px`;
    }
    isResizingSidebar = false;
    document.body.style.cursor = '';
    document.documentElement.classList.remove('is-resizing');
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

    const storedHeight = zonesStore.getZoneHeight(zoneId);
    // Snap to actual content height if it's less than stored max-height.
    // This prevents a "dead zone" where dragging increases max-height
    // but nothing visual changes because content doesn't fill the zone.
    if (measuredHeight && measuredHeight < storedHeight) {
      zonesStore.setZoneHeight(zoneId, Math.max(measuredHeight, zonesStore.minZoneHeight));
      zoneResizeStartHeight = Math.max(measuredHeight, zonesStore.minZoneHeight);
    } else {
      zoneResizeStartHeight = storedHeight;
    }

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

  // Terminal split resize handlers — rAF + direct DOM
  function handleTermResizeStart(e: MouseEvent) {
    e.preventDefault();
    isResizingTerminal = true;
    const isBottom = terminalStore.position === 'bottom';
    termResizeStart = isBottom ? e.clientY : e.clientX;

    // When context is collapsed, terminal fills via flex — measure actual DOM size
    if (uiStore.contextPanelCollapsed && terminalPanelRef) {
      termResizeStartSize = isBottom
        ? terminalPanelRef.clientHeight
        : terminalPanelRef.clientWidth;
      // Switch from flex fill to fixed size for smooth drag
      if (isBottom) {
        terminalPanelRef.style.height = `${termResizeStartSize}px`;
      } else {
        terminalPanelRef.style.width = `${termResizeStartSize}px`;
      }
      terminalPanelRef.style.flex = '0 0 auto';
    } else {
      termResizeStartSize = isBottom ? terminalStore.terminalHeight : terminalStore.terminalWidth;
    }

    document.body.style.cursor = isBottom ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    document.documentElement.classList.add('is-resizing');
  }

  function handleTermResizeMove(e: MouseEvent) {
    if (!isResizingTerminal) return;
    if (termResizeRaf) cancelAnimationFrame(termResizeRaf);
    termResizeRaf = requestAnimationFrame(() => {
      const isBottom = terminalStore.position === 'bottom';
      // Invert delta: dragging up/left should increase size
      const delta = isBottom
        ? termResizeStart - e.clientY
        : termResizeStart - e.clientX;
      const newSize = Math.max(terminalStore.collapsedSize, termResizeStartSize + delta);
      if (terminalPanelRef) {
        if (isBottom) {
          terminalPanelRef.style.height = `${newSize}px`;
        } else {
          terminalPanelRef.style.width = `${newSize}px`;
        }
      }
    });
  }

  function handleTermResizeEnd() {
    if (!isResizingTerminal) return;
    if (termResizeRaf) cancelAnimationFrame(termResizeRaf);

    const wasContextCollapsed = uiStore.contextPanelCollapsed;

    if (terminalPanelRef) {
      const isBottom = terminalStore.position === 'bottom';

      // Reset flex override from collapsed-context drag
      terminalPanelRef.style.flex = '';

      if (isBottom) {
        const finalHeight = parseInt(terminalPanelRef.style.height) || terminalStore.terminalHeight;
        terminalStore.setHeight(finalHeight);
        terminalPanelRef.style.height = `${terminalStore.terminalHeight}px`;
      } else {
        const finalWidth = parseInt(terminalPanelRef.style.width) || terminalStore.terminalWidth;
        terminalStore.setWidth(finalWidth);
        terminalPanelRef.style.width = `${terminalStore.terminalWidth}px`;
      }
    }

    if (wasContextCollapsed) {
      // Un-collapse context if terminal was dragged smaller, freeing enough space
      const isBottom = terminalStore.position === 'bottom';
      const freedSpace = termResizeStartSize - (isBottom ? terminalStore.terminalHeight : terminalStore.terminalWidth);
      if (freedSpace >= MIN_CONTENT_SIZE) {
        uiStore.toggleContextPanel();
      }
    } else if (contentRef) {
      // Auto-collapse context if content area is too small
      const isBottom = terminalStore.position === 'bottom';
      const containerSize = isBottom ? contentRef.clientHeight : contentRef.clientWidth;
      const termSize = isBottom ? terminalStore.terminalHeight : terminalStore.terminalWidth;
      const handleSize = 4;
      const remaining = containerSize - termSize - handleSize;
      if (remaining < MIN_CONTENT_SIZE) {
        uiStore.toggleContextPanel();
      }
    }

    isResizingTerminal = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.documentElement.classList.remove('is-resizing');
  }

  // Flat ordered list of all visible blocks (zone display order)
  const allBlocksFlat = $derived(
    zonesStore.zonesByDisplayOrder.flatMap(z => contextStore.blocksByZone[z.id] ?? [])
  );

  // Navigate blocks with keyboard (J/K/Arrow)
  function navigateBlock(direction: 'up' | 'down'): void {
    const flat = allBlocksFlat;
    if (flat.length === 0) return;

    const currentFocused = selectionStore.focusedId;
    const currentIdx = currentFocused ? flat.findIndex(b => b.id === currentFocused) : -1;

    let nextIdx: number;
    if (currentIdx === -1) {
      // No current focus — start from first or last
      nextIdx = direction === 'down' ? 0 : flat.length - 1;
    } else {
      nextIdx = direction === 'down' ? currentIdx + 1 : currentIdx - 1;
    }

    // Clamp to bounds
    if (nextIdx < 0 || nextIdx >= flat.length) return;
    selectionStore.focus(flat[nextIdx].id);
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    // Ctrl+T toggles terminal, even from inputs
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
      e.preventDefault();
      // If terminal is visible and focused, hide it. If visible but not focused, focus it.
      // If hidden, show and focus it.
      if (terminalStore.isVisible) {
        const termEl = terminalPanelRef?.querySelector('.xterm-helper-textarea');
        if (termEl && document.activeElement === termEl) {
          terminalStore.hide();
        } else {
          requestAnimationFrame(() => terminalPanelComponentRef?.focusTerminal());
        }
      } else {
        terminalStore.show();
        requestAnimationFrame(() => terminalPanelComponentRef?.focusTerminal());
      }
      return;
    }

    // Ctrl+F always opens search, even from inputs
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      searchStore.toggle();
      return;
    }

    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (uiStore.hasModal || uiStore.commandPaletteOpen) {
      return;
    }

    // F3 / Shift+F3 for search navigation (when search is open)
    if (e.key === "F3" && searchStore.isOpen) {
      e.preventDefault();
      if (e.shiftKey) searchStore.previousMatch();
      else searchStore.nextMatch();
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
        if (searchStore.isOpen) {
          searchStore.close();
        } else {
          selectionStore.deselect();
        }
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
        } else {
          e.preventDefault();
          navigateBlock('up');
        }
        break;
      case "[":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          uiStore.toggleSidebar();
        }
        break;
      case "j":
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          navigateBlock('down');
        }
        break;
      case "arrowdown":
        e.preventDefault();
        navigateBlock('down');
        break;
      case "arrowup":
        e.preventDefault();
        navigateBlock('up');
        break;
      case "enter":
        if (selectionStore.focusedId) {
          e.preventDefault();
          uiStore.openModal(selectionStore.focusedId);
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

  function handleBlockContextMenu(id: string, e: MouseEvent) {
    e.preventDefault();
    contextMenuBlock = id;
    contextMenuX = e.clientX;
    contextMenuY = e.clientY;
    contextMenuVisible = true;
    // Select the block if not already selected
    if (!selectionStore.selectedIds.has(id)) {
      selectionStore.select(id);
    }
  }

  function closeContextMenu() {
    contextMenuVisible = false;
    contextMenuBlock = null;
  }

  function handleZoneDrop(zone: ZoneType, blockIds: string[]) {
    for (const id of blockIds) {
      contextStore.moveBlock(id, zone);
    }
    const count = blockIds.length;
    const zoneName = zonesStore.getZoneById(zone)?.label ?? zone;
    uiStore.showToast(`Moved ${count > 1 ? `${count} blocks` : '1 block'} to ${zoneName}`, "info");
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
    const zoneName = zonesStore.getZoneById(zone)?.label ?? zone;
    uiStore.showToast(`Created ${label} block in ${zoneName}`, "success");
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

  function handleModalContentEdit(content: string) {
    if (uiStore.modalBlockId) {
      contextStore.updateBlockContent(uiStore.modalBlockId, content);
      uiStore.showToast("Content updated", "success");
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
      // View
      case 'toggle-sidebar':
        uiStore.toggleSidebar();
        break;
      case 'toggle-context-panel':
        uiStore.toggleContextPanel();
        break;
      case 'expand-all-zones': {
        uiStore.expandAllZones();
        // Also expand all zone heights
        for (const z of zonesStore.zonesByDisplayOrder) {
          zonesStore.setZoneExpanded(z.id, true);
        }
        uiStore.showToast('All zones expanded', 'info');
        break;
      }
      case 'collapse-all-zones':
        uiStore.collapseAllZonesFrom(zonesStore.zonesByDisplayOrder.map(z => z.id));
        uiStore.showToast('All zones collapsed', 'info');
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

      // Search
      case 'search':
        searchStore.open();
        break;
      case 'search-next':
        searchStore.nextMatch();
        break;
      case 'search-prev':
        searchStore.previousMatch();
        break;
      case 'search-select-all': {
        const matchedIds = searchStore.selectAllResults();
        if (matchedIds.length > 0) {
          selectionStore.deselect();
          for (const id of matchedIds) {
            selectionStore.handleClick(id, { shiftKey: false, ctrlKey: true, metaKey: false });
          }
          uiStore.showToast(`Selected ${matchedIds.length} matching block(s)`, 'info');
        }
        break;
      }

      // Selection
      case 'select-all':
        selectionStore.selectAll();
        uiStore.showToast('Selected all blocks', 'info');
        break;
      case 'deselect':
        selectionStore.deselect();
        break;

      // Edit
      case 'remove-selected':
        if (selectionStore.hasSelection) {
          const count = selectionStore.count;
          contextStore.removeBlocks([...selectionStore.selectedIds]);
          selectionStore.deselect();
          uiStore.showToast(`Removed ${count} block(s)`, 'success');
        }
        break;
      case 'pin-selected-top':
        if (selectionStore.hasSelection) {
          for (const id of selectionStore.selectedIds) {
            contextStore.pinBlock(id, 'top');
          }
          uiStore.showToast(`Pinned ${selectionStore.count} block(s) to top`, 'success');
        }
        break;
      case 'pin-selected-bottom':
        if (selectionStore.hasSelection) {
          for (const id of selectionStore.selectedIds) {
            contextStore.pinBlock(id, 'bottom');
          }
          uiStore.showToast(`Pinned ${selectionStore.count} block(s) to bottom`, 'success');
        }
        break;
      case 'unpin-selected':
        if (selectionStore.hasSelection) {
          for (const id of selectionStore.selectedIds) {
            contextStore.pinBlock(id, null);
          }
          uiStore.showToast(`Unpinned ${selectionStore.count} block(s)`, 'success');
        }
        break;
      case 'compress-selected-trimmed':
        if (selectionStore.hasSelection) {
          for (const id of selectionStore.selectedIds) {
            contextStore.setCompressionLevel(id, 'trimmed');
          }
          uiStore.showToast(`Compressed ${selectionStore.count} block(s) to trimmed`, 'success');
        }
        break;
      case 'compress-selected-summarized':
        if (selectionStore.hasSelection) {
          for (const id of selectionStore.selectedIds) {
            contextStore.setCompressionLevel(id, 'summarized');
          }
          uiStore.showToast(`Compressed ${selectionStore.count} block(s) to summarized`, 'success');
        }
        break;
      case 'move-selected-primacy':
        if (selectionStore.hasSelection) {
          for (const id of selectionStore.selectedIds) {
            contextStore.moveBlock(id, 'primacy');
          }
          uiStore.showToast(`Moved ${selectionStore.count} block(s) to Primacy`, 'success');
        }
        break;
      case 'move-selected-middle':
        if (selectionStore.hasSelection) {
          for (const id of selectionStore.selectedIds) {
            contextStore.moveBlock(id, 'middle');
          }
          uiStore.showToast(`Moved ${selectionStore.count} block(s) to Middle`, 'success');
        }
        break;
      case 'move-selected-recency':
        if (selectionStore.hasSelection) {
          for (const id of selectionStore.selectedIds) {
            contextStore.moveBlock(id, 'recency');
          }
          uiStore.showToast(`Moved ${selectionStore.count} block(s) to Recency`, 'success');
        }
        break;

      // Terminal
      case 'toggle-terminal':
        terminalStore.toggle();
        if (terminalStore.isVisible) {
          requestAnimationFrame(() => terminalPanelComponentRef?.focusTerminal());
        }
        break;
      case 'terminal-position-bottom':
        terminalStore.setPosition('bottom');
        if (!terminalStore.isVisible) terminalStore.show();
        break;
      case 'terminal-position-right':
        terminalStore.setPosition('right');
        if (!terminalStore.isVisible) terminalStore.show();
        break;
      case 'terminal-clear':
        terminalPanelComponentRef?.clearTerminal();
        break;

      // Data
      case 'snapshot': {
        const snap = contextStore.saveSnapshot(`Snapshot ${contextStore.snapshots.length + 1}`);
        uiStore.showToast(`Saved: ${snap.name}`, 'success');
        break;
      }
      case 'load-demo':
        contextStore.loadDemoData();
        uiStore.showToast('Demo data loaded', 'success');
        break;
      case 'clear-all-blocks':
        contextStore.removeBlocks(contextStore.blocks.map(b => b.id));
        selectionStore.deselect();
        uiStore.showToast('All blocks cleared', 'success');
        break;
    }
  }

  function formatNumber(n: number): string {
    return n.toLocaleString();
  }
</script>

<svelte:window
  on:keydown={handleKeydown}
  on:mousemove={(e) => { handleResizeMove(e); handleZoneResizeMove(e); handleTermResizeMove(e); }}
  on:mouseup={() => { handleResizeEnd(); handleZoneResizeEnd(); handleTermResizeEnd(); }}
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
    <aside
      class="sidebar"
      class:sidebar-collapsed={uiStore.sidebarCollapsed}
      class:sidebar-animating={!isResizingSidebar}
      bind:this={sidebarRef}
      style:width="{uiStore.sidebarWidth}px"
    >
      {#if uiStore.sidebarCollapsed}
        <!-- Collapsed icon bar -->
        <div class="sidebar-icons">
          <button class="sidebar-icon" title="Snapshots" onclick={() => uiStore.toggleSidebar()}>S</button>
          <button class="sidebar-icon" title="Block Types" onclick={() => uiStore.toggleSidebar()}>B</button>
          <button class="sidebar-icon" title="Zones" onclick={() => uiStore.toggleSidebar()}>Z</button>
          <button class="sidebar-icon" title="Theme" onclick={() => uiStore.toggleSidebar()}>T</button>
          <button class="sidebar-icon" title="Display" onclick={() => uiStore.toggleSidebar()}>D</button>
        </div>
      {:else}
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
            <div class="shortcut"><kbd>J/K</kbd> Navigate</div>
            <div class="shortcut"><kbd>↑/↓</kbd> Navigate</div>
            <div class="shortcut"><kbd>Enter</kbd> Open block</div>
            <div class="shortcut"><kbd>A</kbd> Select all</div>
            <div class="shortcut"><kbd>Esc</kbd> Deselect</div>
            <div class="shortcut"><kbd>Del</kbd> Remove</div>
            <div class="shortcut"><kbd>S</kbd> Snapshot</div>
            <div class="shortcut"><kbd>⌘K</kbd> Commands</div>
            <div class="shortcut"><kbd>⌘[</kbd> Sidebar</div>
            <div class="shortcut"><kbd>⌘F</kbd> Search</div>
            <div class="shortcut"><kbd>⌃T</kbd> Terminal</div>
          </div>
        </section>
      {/if}
    </aside>

    <!-- Sidebar Resize Handle -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="sidebar-resize-handle"
      class:active={isResizingSidebar}
      onmousedown={handleResizeStart}
    >
      <button
        class="sidebar-toggle-btn"
        title={uiStore.sidebarCollapsed ? "Expand sidebar (Ctrl+[)" : "Collapse sidebar (Ctrl+[)"}
        onmousedown={(e) => e.stopPropagation()}
        onclick={() => uiStore.toggleSidebar()}
      >{uiStore.sidebarCollapsed ? "›" : "‹"}</button>
    </div>

    <!-- Content -->
    <div class="content" class:content-right={terminalStore.isVisible && terminalStore.position === 'right'} bind:this={contentRef}>
      {#if uiStore.contextPanelCollapsed}
        <!-- Context panel collapsed bar -->
        <button class="context-collapsed" onclick={() => uiStore.toggleContextPanel()} title="Expand context panel">
          <svg class="context-collapsed-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="12" height="12" rx="1" />
            <line x1="5" y1="6" x2="11" y2="6" />
            <line x1="5" y1="10" x2="9" y2="10" />
          </svg>
          <span class="context-collapsed-label">Context</span>
          <span class="context-collapsed-count">{contextStore.blocks.length}</span>
        </button>
      {:else}
        <div class="content-main">
          <!-- Toolbar -->
          <div class="toolbar">
            <div class="toolbar-info">
              <strong>{selectionStore.count}</strong> selected
              <span class="toolbar-sep">·</span>
              <strong>{formatNumber(selectionStore.selectedTokens)}</strong> tokens
            </div>
            <div class="toolbar-actions">
              <button class="btn btn-sm" onclick={() => uiStore.toggleContextPanel()} title="Collapse context panel">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                  <line x1="3" y1="8" x2="13" y2="8" />
                </svg>
              </button>
              <button class="btn btn-sm" onclick={() => searchStore.toggle()} title="Search (Ctrl+F)">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6.5" cy="6.5" r="5"/><line x1="10.5" y1="10.5" x2="15" y2="15"/></svg>
              </button>
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

          <!-- Search Bar -->
          <SearchBar />

          <!-- Zones -->
          <div class="zones" class:resizing={resizingZoneId !== null}>
            {#if contextStore.blocks.length === 0}
              <div class="empty-state">
                <div class="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="6" y="6" width="36" height="36" rx="4" />
                    <line x1="6" y1="18" x2="42" y2="18" />
                    <line x1="6" y1="30" x2="42" y2="30" />
                    <line x1="18" y1="6" x2="18" y2="42" />
                  </svg>
                </div>
                <h2 class="empty-title">No context blocks</h2>
                <p class="empty-description">
                  Connect to the proxy to capture live conversation data,
                  or load demo blocks to explore the interface.
                </p>
                <div class="empty-actions">
                  <button class="btn" onclick={() => contextStore.loadDemoData()}>
                    Load Demo Data
                  </button>
                  <button class="btn" onclick={() => uiStore.toggleCommandPalette()}>
                    Open Commands <kbd>⌘K</kbd>
                  </button>
                </div>
                <div class="empty-hints">
                  <div class="empty-hint">
                    <kbd>J</kbd>/<kbd>K</kbd> Navigate blocks
                  </div>
                  <div class="empty-hint">
                    <kbd>Enter</kbd> Open block details
                  </div>
                  <div class="empty-hint">
                    <kbd>⌃T</kbd> Toggle terminal
                  </div>
                </div>
              </div>
            {:else}
              {#each zonesStore.zonesByDisplayOrder as zoneConfig (zoneConfig.id)}
                <Zone
                  zone={zoneConfig.id as ZoneType}
                  blocks={contextStore.blocksByZone[zoneConfig.id] ?? []}
                  collapsed={uiStore.isZoneCollapsed(zoneConfig.id)}
                  selectedIds={selectionStore.selectedIds}
                  focusedBlockId={selectionStore.focusedId}
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
                  onBlockContextMenu={handleBlockContextMenu}
                  onBlockDragStart={handleBlockDragStart}
                  onBlockDragEnd={handleBlockDragEnd}
                  onDrop={handleZoneDrop}
                  onCreateBlock={handleCreateBlock}
                  onReorder={handleZoneReorder}
                  onResizeStart={(e, h) => handleZoneResizeStart(e, zoneConfig.id, h)}
                />
              {/each}
            {/if}
          </div>
        </div>
      {/if}

      <!-- Terminal Split Handle + Panel -->
      {#if terminalStore.isVisible}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="terminal-split-handle"
          class:terminal-split-vertical={terminalStore.position === 'right'}
          class:active={isResizingTerminal}
          onmousedown={handleTermResizeStart}
        >
          <button
            class="terminal-toggle-btn"
            class:terminal-toggle-vertical={terminalStore.position === 'right'}
            title={terminalStore.isCollapsed ? "Expand terminal" : "Collapse terminal"}
            onmousedown={(e) => e.stopPropagation()}
            onclick={() => terminalStore.toggleCollapsed()}
          >
            {#if terminalStore.position === 'bottom'}
              {terminalStore.isCollapsed ? "▴" : "▾"}
            {:else}
              {terminalStore.isCollapsed ? "‹" : "›"}
            {/if}
          </button>
        </div>

        <div
          class="terminal-panel-wrapper"
          class:terminal-panel-right={terminalStore.position === 'right'}
          class:terminal-fill={uiStore.contextPanelCollapsed}
          bind:this={terminalPanelRef}
          style={uiStore.contextPanelCollapsed
            ? ''
            : (terminalStore.position === 'bottom'
              ? `height: ${terminalStore.terminalHeight}px`
              : `width: ${terminalStore.terminalWidth}px`)}
        >
          <TerminalPanel bind:this={terminalPanelComponentRef} />
        </div>
      {/if}
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
  onContentEdit={handleModalContentEdit}
/>

<!-- Toasts -->
<Toast toasts={uiStore.toasts} onDismiss={(id) => uiStore.dismissToast(id)} />

<!-- Command Palette -->
<CommandPalette
  open={uiStore.commandPaletteOpen}
  onClose={() => uiStore.toggleCommandPalette()}
  onCommand={handleCommand}
/>

<!-- Context Menu (right-click) -->
<ContextMenu
  block={contextMenuBlock ? contextStore.getBlock(contextMenuBlock) ?? null : null}
  x={contextMenuX}
  y={contextMenuY}
  visible={contextMenuVisible}
  onClose={closeContextMenu}
  onPin={(pos: "top" | "bottom" | null) => {
    if (contextMenuBlock) {
      contextStore.pinBlock(contextMenuBlock, pos);
      const label = pos ? `Pinned to ${pos}` : 'Unpinned';
      uiStore.showToast(label, 'success');
    }
  }}
  onMove={(zone: ZoneType) => {
    if (contextMenuBlock) {
      contextStore.moveBlock(contextMenuBlock, zone);
      const zoneName = zonesStore.getZoneById(zone)?.label ?? zone;
      uiStore.showToast(`Moved to ${zoneName}`, 'info');
    }
  }}
  onCompress={(level: Block["compressionLevel"]) => {
    if (contextMenuBlock) {
      contextStore.setCompressionLevel(contextMenuBlock, level);
      uiStore.showToast(`Set to ${level}`, 'success');
    }
  }}
  onCopy={() => {
    if (contextMenuBlock) {
      const block = contextStore.getBlock(contextMenuBlock);
      if (block) {
        navigator.clipboard.writeText(block.content);
        uiStore.showToast('Copied to clipboard', 'success');
      }
    }
  }}
  onRemove={() => {
    if (contextMenuBlock) {
      contextStore.removeBlock(contextMenuBlock);
      uiStore.showToast('Block removed', 'success');
    }
  }}
  onOpen={() => {
    if (contextMenuBlock) {
      uiStore.openModal(contextMenuBlock);
    }
  }}
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
    scrollbar-gutter: stable;
  }

  /* Sidebar collapsed state */
  .sidebar.sidebar-collapsed {
    overflow: hidden;
  }

  .sidebar.sidebar-animating {
    transition: width 0.2s ease;
  }

  .sidebar-icons {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 0;
    width: 100%;
  }

  .sidebar-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .sidebar-icon:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-subtle);
  }

  /* Sidebar Resize Handle */
  .sidebar-resize-handle {
    width: 4px;
    cursor: col-resize;
    background: transparent;
    transition: background 0.15s ease;
    flex-shrink: 0;
    position: relative;
  }

  .sidebar-resize-handle:hover,
  .sidebar-resize-handle.active {
    background: var(--accent);
  }

  .sidebar-toggle-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 3px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, color 0.1s ease;
    z-index: 5;
    padding: 0;
    line-height: 1;
  }

  .sidebar-resize-handle:hover .sidebar-toggle-btn {
    opacity: 1;
  }

  .sidebar-toggle-btn:hover {
    color: var(--text-primary);
    border-color: var(--accent);
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

  .content.content-right {
    flex-direction: row;
  }

  .content-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    min-width: 0;
  }

  /* Context panel collapsed bar */
  .context-collapsed {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--bg-surface);
    border: none;
    border-bottom: 1px solid var(--border-subtle);
    cursor: pointer;
    transition: background 0.1s ease;
    padding: 6px 12px;
    flex-shrink: 0;
    width: 100%;
  }

  /* When terminal is on right, context collapsed bar should be vertical */
  .content.content-right .context-collapsed {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    width: auto;
    height: 100%;
    padding: 12px 6px;
    border-bottom: none;
    border-right: 1px solid var(--border-subtle);
    flex-direction: column;
  }

  .context-collapsed:hover {
    background: var(--bg-hover);
  }

  .context-collapsed:hover .context-collapsed-icon {
    color: var(--text-primary);
  }

  .context-collapsed-icon {
    color: var(--text-muted);
    flex-shrink: 0;
    transition: color 0.1s ease;
  }

  .context-collapsed-label {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .context-collapsed-count {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
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

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: var(--space-xl, 32px);
    text-align: center;
    gap: 12px;
    min-height: 300px;
  }

  .empty-icon {
    color: var(--text-faint);
    opacity: 0.5;
    margin-bottom: 4px;
  }

  .empty-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0;
  }

  .empty-description {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    max-width: 340px;
    line-height: 1.5;
    margin: 0;
  }

  .empty-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .empty-hints {
    display: flex;
    gap: 16px;
    margin-top: 12px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-faint);
  }

  .empty-hint {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Terminal split handle */
  .terminal-split-handle {
    height: 4px;
    cursor: row-resize;
    background: transparent;
    transition: background 0.15s ease;
    flex-shrink: 0;
    position: relative;
  }

  .terminal-split-handle.terminal-split-vertical {
    height: auto;
    width: 4px;
    cursor: col-resize;
  }

  .terminal-split-handle:hover,
  .terminal-split-handle.active {
    background: var(--accent);
  }

  /* Terminal toggle button on split handle — matches sidebar toggle size */
  .terminal-toggle-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 32px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 3px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, color 0.1s ease;
    z-index: 5;
    padding: 0;
    line-height: 1;
  }

  .terminal-toggle-btn.terminal-toggle-vertical {
    width: 16px;
    height: 32px;
  }

  .terminal-split-handle:hover .terminal-toggle-btn {
    opacity: 1;
  }

  .terminal-toggle-btn:hover {
    color: var(--text-primary);
    border-color: var(--accent);
  }

  /* Terminal panel wrapper */
  .terminal-panel-wrapper {
    flex-shrink: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .terminal-panel-wrapper.terminal-panel-right {
    height: 100%;
  }

  .terminal-panel-wrapper.terminal-fill {
    flex: 1;
    min-height: 0;
    min-width: 0;
  }
</style>
