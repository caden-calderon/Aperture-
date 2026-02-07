/**
 * Modal Handlers Composable
 *
 * Encapsulates modal action handlers for the block detail modal
 * (close, compress, move, pin, remove, content edit, role change).
 */

import type { uiStore as UiStoreType } from "$lib/stores/ui.svelte";
import type { contextStore as ContextStoreType } from "$lib/stores/context.svelte";
import type { blockTypesStore as BlockTypesStoreType } from "$lib/stores/blockTypes.svelte";
import type { Zone as ZoneType, Block } from "$lib/types";

interface ModalHandlerStores {
  uiStore: typeof UiStoreType;
  contextStore: typeof ContextStoreType;
  blockTypesStore: typeof BlockTypesStoreType;
}

export function createModalHandlers(stores: ModalHandlerStores) {
  const { uiStore, contextStore, blockTypesStore } = stores;

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

  return {
    handleModalClose,
    handleModalCompress,
    handleModalMove,
    handleModalPin,
    handleModalRemove,
    handleModalContentEdit,
    handleModalRoleChange,
  };
}
