/**
 * Context Store
 * Manages blocks, zones, and token budget state
 *
 * Uses Svelte 5 runes for reactive state management
 * Persists blocks and snapshots to localStorage
 */

import type { Block, Zone, TokenBudget, Snapshot, Role } from "../types";
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
// Persistence
// ============================================================================

const STORAGE_KEY = "aperture-context";

function saveToLocalStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ blocks, snapshots })
    );
  } catch (e) {
    console.error("Failed to save context:", e);
  }
}

function loadFromLocalStorage(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const data = JSON.parse(stored);
    if (!Array.isArray(data.blocks) || data.blocks.length === 0) return false;

    // Restore Date objects (JSON serializes them as strings)
    blocks = data.blocks.map((b: Block) => ({
      ...b,
      timestamp: new Date(b.timestamp),
    }));
    snapshots = (data.snapshots ?? []).map((s: Snapshot) => ({
      ...s,
      timestamp: new Date(s.timestamp),
      blocks: s.blocks.map((b: Block) => ({
        ...b,
        timestamp: new Date(b.timestamp),
      })),
    }));
    return true;
  } catch (e) {
    console.error("Failed to load context:", e);
    return false;
  }
}

// ============================================================================
// Derived State
// ============================================================================

// Sort blocks within zone: pinned top first, then unpinned, then pinned bottom
function sortBlocksWithPins(zoneBlocks: Block[]): Block[] {
  const pinnedTop = zoneBlocks.filter((b) => b.pinned === "top");
  const pinnedBottom = zoneBlocks.filter((b) => b.pinned === "bottom");
  const unpinned = zoneBlocks.filter((b) => b.pinned === null);
  return [...pinnedTop, ...unpinned, ...pinnedBottom];
}

// Dynamic blocks by zone - supports custom zones
const blocksByZone = $derived.by(() => {
  const result: Record<string, Block[]> = {};
  // Group blocks by zone and sort with pins
  const grouped = new Map<string, Block[]>();
  for (const block of blocks) {
    const zoneBlocks = grouped.get(block.zone) ?? [];
    zoneBlocks.push(block);
    grouped.set(block.zone, zoneBlocks);
  }
  // Sort each zone's blocks with pins
  for (const [zoneId, zoneBlocks] of grouped) {
    result[zoneId] = sortBlocksWithPins(zoneBlocks);
  }
  // Ensure built-in zones exist even if empty
  if (!result.primacy) result.primacy = [];
  if (!result.middle) result.middle = [];
  if (!result.recency) result.recency = [];
  return result;
});

const tokenBudget = $derived<TokenBudget>(calculateTokenBudget(blocks));

const blockMap = $derived(new Map(blocks.map((b) => [b.id, b])));

// ============================================================================
// Actions
// ============================================================================

function init(): void {
  const loaded = loadFromLocalStorage();
  if (!loaded) {
    loadDemoData();
  }
}

function loadDemoData(): void {
  blocks = generateDemoBlocks();
  snapshots = generateDemoSnapshots();
  saveToLocalStorage();
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
  blocks = [...blocks];
  saveToLocalStorage();
}

function moveBlocks(blockIds: string[], targetZone: Zone): void {
  const idSet = new Set(blockIds);
  blocks = blocks.map((b) => (idSet.has(b.id) ? { ...b, zone: targetZone } : b));
  saveToLocalStorage();
}

function removeBlock(blockId: string): void {
  blocks = blocks.filter((b) => b.id !== blockId);
  saveToLocalStorage();
}

function removeBlocks(blockIds: string[]): void {
  const idSet = new Set(blockIds);
  blocks = blocks.filter((b) => !idSet.has(b.id));
  saveToLocalStorage();
}

function createBlock(
  zone: Zone,
  role: Role,
  content = "",
  blockType?: string
): Block {
  const defaultContent = content || `New ${role} block`;
  const newBlock: Block = {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    blockType,
    content: defaultContent,
    tokens: Math.ceil(defaultContent.length / 4),
    timestamp: new Date(),
    zone,
    pinned: null,
    compressionLevel: "original",
    compressedVersions: {
      original: { content: defaultContent, tokens: Math.ceil(defaultContent.length / 4) },
    },
    usageHeat: 0.5,
    positionRelevance: 0.5,
    lastReferencedTurn: 0,
    referenceCount: 0,
    topicCluster: null,
    topicKeywords: [],
    metadata: { provider: "manual", turnIndex: blocks.length, filePaths: [] },
  };
  blocks = [...blocks, newBlock];
  saveToLocalStorage();
  return newBlock;
}

function updateBlockContent(blockId: string, content: string): void {
  const index = getBlockIndex(blockId);
  if (index === -1) return;

  const tokens = Math.ceil(content.length / 4);
  blocks[index] = {
    ...blocks[index],
    content,
    tokens,
    compressedVersions: {
      ...blocks[index].compressedVersions,
      original: { content, tokens },
    },
  };
  blocks = [...blocks];
  saveToLocalStorage();
}

function setBlockRole(blockId: string, role: Role, blockType?: string): void {
  const index = getBlockIndex(blockId);
  if (index === -1) return;
  blocks[index] = { ...blocks[index], role, blockType };
  blocks = [...blocks];
  saveToLocalStorage();
}

function setBlocksRole(blockIds: string[], role: Role): void {
  const idSet = new Set(blockIds);
  blocks = blocks.map((b) => (idSet.has(b.id) ? { ...b, role } : b));
  saveToLocalStorage();
}

function reorderBlock(blockId: string, newIndex: number): void {
  const currentIndex = getBlockIndex(blockId);
  if (currentIndex === -1) return;

  const block = blocks[currentIndex];
  const newBlocks = [...blocks];
  newBlocks.splice(currentIndex, 1);
  newBlocks.splice(newIndex, 0, block);
  blocks = newBlocks;
  saveToLocalStorage();
}

function reorderBlocksInZone(
  zone: Zone,
  blockIds: string[],
  insertIndex: number
): void {
  const zoneBlocks = sortBlocksWithPins(blocks.filter((b) => b.zone === zone));
  const otherBlocks = blocks.filter((b) => b.zone !== zone);
  const idSet = new Set(blockIds);

  const movingPinnedBlocks = zoneBlocks.filter(
    (b) => idSet.has(b.id) && b.pinned !== null
  );
  if (movingPinnedBlocks.length > 0) {
    return;
  }

  const movingBlocks = zoneBlocks.filter((b) => idSet.has(b.id));
  const stayingBlocks = zoneBlocks.filter((b) => !idSet.has(b.id));

  const pinnedTopCount = stayingBlocks.filter((b) => b.pinned === "top").length;
  const pinnedBottomCount = stayingBlocks.filter((b) => b.pinned === "bottom").length;
  const minIndex = pinnedTopCount;
  const maxIndex = stayingBlocks.length - pinnedBottomCount;

  const clampedIndex = Math.max(minIndex, Math.min(insertIndex, maxIndex));
  stayingBlocks.splice(clampedIndex, 0, ...movingBlocks);

  blocks = [...otherBlocks, ...stayingBlocks];
  saveToLocalStorage();
}

function setCompressionLevel(
  blockId: string,
  level: Block["compressionLevel"]
): void {
  const index = getBlockIndex(blockId);
  if (index === -1) return;

  blocks[index] = { ...blocks[index], compressionLevel: level };
  blocks = [...blocks];
  saveToLocalStorage();
}

function pinBlock(blockId: string, position: Block["pinned"]): void {
  const index = getBlockIndex(blockId);
  if (index === -1) return;

  blocks[index] = { ...blocks[index], pinned: position };
  blocks = [...blocks];
  saveToLocalStorage();
}

function getValidDropRange(zone: Zone): { min: number; max: number } {
  const zoneBlocks = sortBlocksWithPins(blocks.filter((b) => b.zone === zone));
  const pinnedTopCount = zoneBlocks.filter((b) => b.pinned === "top").length;
  const pinnedBottomCount = zoneBlocks.filter((b) => b.pinned === "bottom").length;
  return {
    min: pinnedTopCount,
    max: zoneBlocks.length - pinnedBottomCount,
  };
}

function updateBlockHeat(blockId: string, heat: number): void {
  const index = getBlockIndex(blockId);
  if (index === -1) return;

  blocks[index] = {
    ...blocks[index],
    usageHeat: Math.max(0, Math.min(1, heat)),
  };
  blocks = [...blocks];
  saveToLocalStorage();
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
  saveToLocalStorage();
  return snapshot;
}

function restoreSnapshot(snapshotId: string): boolean {
  const snapshot = snapshots.find((s) => s.id === snapshotId);
  if (!snapshot) return false;

  blocks = JSON.parse(JSON.stringify(snapshot.blocks));
  saveToLocalStorage();
  return true;
}

function deleteSnapshot(snapshotId: string): void {
  snapshots = snapshots.filter((s) => s.id !== snapshotId);
  saveToLocalStorage();
}

// ============================================================================
// Export Store Interface
// ============================================================================

export const contextStore = {
  // Reactive getters
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
  init,
  loadDemoData,
  getBlock,
  getBlockIndex,
  moveBlock,
  moveBlocks,
  removeBlock,
  removeBlocks,
  createBlock,
  updateBlockContent,
  setBlockRole,
  setBlocksRole,
  reorderBlock,
  reorderBlocksInZone,
  setCompressionLevel,
  pinBlock,
  getValidDropRange,
  updateBlockHeat,
  saveSnapshot,
  restoreSnapshot,
  deleteSnapshot,
};
