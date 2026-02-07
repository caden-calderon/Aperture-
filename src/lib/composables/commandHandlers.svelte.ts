/**
 * Command Handlers Composable
 *
 * Encapsulates the full command palette dispatch (the big switch statement).
 */

import type { uiStore as UiStoreType } from "$lib/stores/ui.svelte";
import type { selectionStore as SelectionStoreType } from "$lib/stores/selection.svelte";
import type { contextStore as ContextStoreType } from "$lib/stores/context.svelte";
import type { searchStore as SearchStoreType } from "$lib/stores/search.svelte";
import type { terminalStore as TerminalStoreType } from "$lib/stores/terminal.svelte";
import type { zonesStore as ZonesStoreType } from "$lib/stores/zones.svelte";
import type TerminalPanel from "$lib/components/layout/TerminalPanel.svelte";

interface CommandHandlerStores {
  uiStore: typeof UiStoreType;
  selectionStore: typeof SelectionStoreType;
  contextStore: typeof ContextStoreType;
  searchStore: typeof SearchStoreType;
  terminalStore: typeof TerminalStoreType;
  zonesStore: typeof ZonesStoreType;
}

interface CommandHandlerRefs {
  readonly terminalPanelComponentRef: ReturnType<typeof TerminalPanel> | null;
}

// Callback for opening the diff view from command palette
interface CommandCallbacks {
  openDiffView: () => void;
}

export function createCommandHandlers(stores: CommandHandlerStores, refs: CommandHandlerRefs, callbacks: CommandCallbacks) {
  const { uiStore, selectionStore, contextStore, searchStore, terminalStore, zonesStore } = stores;

  function handleCommand(command: string) {
    switch (command) {
      // View
      case 'toggle-sidebar':
        uiStore.toggleSidebar();
        break;
      case 'toggle-context-panel':
        uiStore.toggleContextPanel();
        break;
      case 'toggle-minimap':
        uiStore.toggleMinimap();
        uiStore.showToast(uiStore.minimapVisible ? 'Minimap shown' : 'Minimap hidden', 'info');
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
          requestAnimationFrame(() => refs.terminalPanelComponentRef?.focusTerminal());
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
        refs.terminalPanelComponentRef?.clearTerminal();
        break;

      // Data
      case 'snapshot': {
        const snap = contextStore.saveSnapshot(`Snapshot ${contextStore.snapshots.length + 1}`);
        uiStore.showToast(`Saved: ${snap.name}`, 'success');
        break;
      }
      case 'diff-view':
        callbacks.openDiffView();
        break;
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

  return {
    handleCommand,
  };
}
