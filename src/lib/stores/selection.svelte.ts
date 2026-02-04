/**
 * Selection Store
 * Manages block selection state with support for:
 * - Single click selection
 * - Shift+click range selection
 * - Ctrl/Cmd+click toggle selection
 * - Select all / deselect
 */

import { contextStore } from "./context.svelte";

// ============================================================================
// State
// ============================================================================

let selectedIds = $state(new Set<string>());
let _lastSelectedId = $state<string | null>(null);
let lastSelectedIndex = $state<number | null>(null);

// ============================================================================
// Derived State
// ============================================================================

const selectedBlocks = $derived(
  contextStore.blocks.filter((b) => selectedIds.has(b.id))
);

const selectedTokens = $derived(
  selectedBlocks.reduce((sum, b) => sum + b.tokens, 0)
);

const hasSelection = $derived(selectedIds.size > 0);

// ============================================================================
// Actions
// ============================================================================

function select(blockId: string): void {
  selectedIds = new Set([blockId]);
  _lastSelectedId = blockId;
  lastSelectedIndex = contextStore.getBlockIndex(blockId);
}

function toggle(blockId: string): void {
  const newSet = new Set(selectedIds);
  if (newSet.has(blockId)) {
    newSet.delete(blockId);
  } else {
    newSet.add(blockId);
  }
  selectedIds = newSet;
  _lastSelectedId = blockId;
  lastSelectedIndex = contextStore.getBlockIndex(blockId);
}

function rangeSelect(blockId: string): void {
  if (lastSelectedIndex === null) {
    select(blockId);
    return;
  }

  const blocks = contextStore.blocks;
  const targetIndex = contextStore.getBlockIndex(blockId);
  if (targetIndex === -1) return;

  const start = Math.min(lastSelectedIndex, targetIndex);
  const end = Math.max(lastSelectedIndex, targetIndex);

  const newSet = new Set(selectedIds);
  for (let i = start; i <= end; i++) {
    newSet.add(blocks[i].id);
  }
  selectedIds = newSet;
}

function selectAll(): void {
  selectedIds = new Set(contextStore.blocks.map((b) => b.id));
}

function selectZone(zone: "primacy" | "middle" | "recency"): void {
  const zoneBlocks = contextStore.blocksByZone[zone];
  selectedIds = new Set(zoneBlocks.map((b) => b.id));
}

function deselect(): void {
  selectedIds = new Set();
  _lastSelectedId = null;
  lastSelectedIndex = null;
}

function isSelected(blockId: string): boolean {
  return selectedIds.has(blockId);
}

function handleClick(
  blockId: string,
  event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }
): void {
  if (event.shiftKey) {
    rangeSelect(blockId);
  } else if (event.ctrlKey || event.metaKey) {
    toggle(blockId);
  } else {
    select(blockId);
  }
}

// ============================================================================
// Export Store Interface
// ============================================================================

export const selectionStore = {
  // Reactive getters
  get selectedIds() {
    return selectedIds;
  },
  get selectedBlocks() {
    return selectedBlocks;
  },
  get selectedTokens() {
    return selectedTokens;
  },
  get hasSelection() {
    return hasSelection;
  },
  get count() {
    return selectedIds.size;
  },

  // Actions
  select,
  toggle,
  rangeSelect,
  selectAll,
  selectZone,
  deselect,
  isSelected,
  handleClick,
};
