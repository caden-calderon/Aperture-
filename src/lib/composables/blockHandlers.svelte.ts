/**
 * Block Handlers Composable
 *
 * Encapsulates block interaction handlers (select, drag, context menu, zone ops)
 * and context menu state.
 */

import type { selectionStore as SelectionStoreType } from "$lib/stores/selection.svelte";
import type { uiStore as UiStoreType } from "$lib/stores/ui.svelte";
import type { contextStore as ContextStoreType } from "$lib/stores/context.svelte";
import type { zonesStore as ZonesStoreType } from "$lib/stores/zones.svelte";
import type { blockTypesStore as BlockTypesStoreType } from "$lib/stores/blockTypes.svelte";
import type { Zone as ZoneType, Block } from "$lib/types";

interface BlockHandlerStores {
  selectionStore: typeof SelectionStoreType;
  uiStore: typeof UiStoreType;
  contextStore: typeof ContextStoreType;
  zonesStore: typeof ZonesStoreType;
  blockTypesStore: typeof BlockTypesStoreType;
}

export function createBlockHandlers(stores: BlockHandlerStores) {
  const { selectionStore, uiStore, contextStore, zonesStore, blockTypesStore } = stores;

  // Context menu state
  let contextMenuBlock = $state<string | null>(null);
  let contextMenuX = $state(0);
  let contextMenuY = $state(0);
  let contextMenuVisible = $state(false);

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

  return {
    // Context menu state
    get contextMenuBlock() { return contextMenuBlock; },
    get contextMenuX() { return contextMenuX; },
    get contextMenuY() { return contextMenuY; },
    get contextMenuVisible() { return contextMenuVisible; },

    // Handlers
    handleBlockSelect,
    handleBlockDoubleClick,
    handleBlockDragStart,
    handleBlockDragEnd,
    handleBlockContextMenu,
    closeContextMenu,
    handleZoneDrop,
    handleZoneReorder,
    handleCreateBlock,
    handleToggleZoneCollapse,
  };
}
