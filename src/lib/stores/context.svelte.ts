/**
 * Context Store
 * Manages blocks, zones, and token budget state
 *
 * Uses Svelte 5 runes for reactive state management
 */

import type { Block, Zone, TokenBudget, Snapshot } from "../types";
import {
  generateDemoBlocks,
  generateDemoSnapshots,
  calculateTokenBudget,
} from "../mock-data";

// ============================================================================
// State
// ============================================================================

let blocks = $state<Block[]>([]);
let snapshots = $state<Snapshot[]>([]);
const tokenLimit = 200000;

// ============================================================================
// Derived State
// ============================================================================

const blocksByZone = $derived({
  primacy: blocks.filter((b) => b.zone === "primacy"),
  middle: blocks.filter((b) => b.zone === "middle"),
  recency: blocks.filter((b) => b.zone === "recency"),
});

const tokenBudget = $derived<TokenBudget>(calculateTokenBudget(blocks));

const blockMap = $derived(new Map(blocks.map((b) => [b.id, b])));

// ============================================================================
// Actions
// ============================================================================

function loadDemoData(): void {
  blocks = generateDemoBlocks();
  snapshots = generateDemoSnapshots();
}

function getBlock(id: string): Block | undefined {
  return blockMap.get(id);
}

function getBlockIndex(id: string): number {
  return blocks.findIndex((b) => b.id === id);
}

function moveBlock(blockId: string, targetZone: Zone): void {
  const index = getBlockIndex(blockId);
  if (index === -1) return;

  blocks[index] = { ...blocks[index], zone: targetZone };
  // Trigger reactivity
  blocks = [...blocks];
}

function moveBlocks(blockIds: string[], targetZone: Zone): void {
  const idSet = new Set(blockIds);
  blocks = blocks.map((b) => (idSet.has(b.id) ? { ...b, zone: targetZone } : b));
}

function removeBlock(blockId: string): void {
  blocks = blocks.filter((b) => b.id !== blockId);
}

function removeBlocks(blockIds: string[]): void {
  const idSet = new Set(blockIds);
  blocks = blocks.filter((b) => !idSet.has(b.id));
}

function reorderBlock(blockId: string, newIndex: number): void {
  const currentIndex = getBlockIndex(blockId);
  if (currentIndex === -1) return;

  const block = blocks[currentIndex];
  const newBlocks = [...blocks];
  newBlocks.splice(currentIndex, 1);
  newBlocks.splice(newIndex, 0, block);
  blocks = newBlocks;
}

function setCompressionLevel(
  blockId: string,
  level: Block["compressionLevel"]
): void {
  const index = getBlockIndex(blockId);
  if (index === -1) return;

  blocks[index] = { ...blocks[index], compressionLevel: level };
  blocks = [...blocks];
}

function pinBlock(blockId: string, position: Block["pinned"]): void {
  const index = getBlockIndex(blockId);
  if (index === -1) return;

  blocks[index] = { ...blocks[index], pinned: position };
  blocks = [...blocks];
}

function updateBlockHeat(blockId: string, heat: number): void {
  const index = getBlockIndex(blockId);
  if (index === -1) return;

  blocks[index] = {
    ...blocks[index],
    usageHeat: Math.max(0, Math.min(1, heat)),
  };
  blocks = [...blocks];
}

function saveSnapshot(name: string): Snapshot {
  const snapshot: Snapshot = {
    id: `snap-${Date.now()}`,
    name,
    timestamp: new Date(),
    blocks: JSON.parse(JSON.stringify(blocks)),
    totalTokens: tokenBudget.used,
    type: "soft",
  };

  snapshots = [...snapshots, snapshot];
  return snapshot;
}

function restoreSnapshot(snapshotId: string): boolean {
  const snapshot = snapshots.find((s) => s.id === snapshotId);
  if (!snapshot) return false;

  blocks = JSON.parse(JSON.stringify(snapshot.blocks));
  return true;
}

function deleteSnapshot(snapshotId: string): void {
  snapshots = snapshots.filter((s) => s.id !== snapshotId);
}

// ============================================================================
// Export Store Interface
// ============================================================================

export const contextStore = {
  // Reactive getters (must be accessed as functions due to $derived)
  get blocks() {
    return blocks;
  },
  get blocksByZone() {
    return blocksByZone;
  },
  get tokenBudget() {
    return tokenBudget;
  },
  get tokenLimit() {
    return tokenLimit;
  },
  get snapshots() {
    return snapshots;
  },

  // Actions
  loadDemoData,
  getBlock,
  getBlockIndex,
  moveBlock,
  moveBlocks,
  removeBlock,
  removeBlocks,
  reorderBlock,
  setCompressionLevel,
  pinBlock,
  updateBlockHeat,
  saveSnapshot,
  restoreSnapshot,
  deleteSnapshot,
};
