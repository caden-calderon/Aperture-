/**
 * Search Store
 * Manages context search state: query, filters, matches, navigation
 */

import { contextStore } from "./context.svelte";

// ============================================================================
// Types
// ============================================================================

export interface SearchMatch {
  blockId: string;
  matchIndex: number; // Which match within this block (0-based)
  startPos: number;
  endPos: number;
}

// ============================================================================
// State
// ============================================================================

let isOpen = $state(false);
let query = $state("");
let caseSensitive = $state(false);
let useRegex = $state(false);
let filterZones = $state<string[]>([]);
let filterBlockTypes = $state<string[]>([]);
let matches = $state<SearchMatch[]>([]);
let currentMatchIndex = $state(0);
let filtersExpanded = $state(false);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

// ============================================================================
// Derived
// ============================================================================

const matchCount = $derived(matches.length);
const currentMatch = $derived(matches[currentMatchIndex] ?? null);
const hasMatches = $derived(matches.length > 0);

// ============================================================================
// Search Logic
// ============================================================================

function performSearch(): void {
  if (!query.trim()) {
    matches = [];
    currentMatchIndex = 0;
    return;
  }

  let regex: RegExp;
  try {
    const flags = caseSensitive ? "g" : "gi";
    const pattern = useRegex ? query : escapeRegex(query);
    regex = new RegExp(pattern, flags);
  } catch {
    // Invalid regex — clear results
    matches = [];
    currentMatchIndex = 0;
    return;
  }

  const newMatches: SearchMatch[] = [];
  const blocks = contextStore.blocks;

  for (const block of blocks) {
    // Apply zone filter
    if (filterZones.length > 0 && !filterZones.includes(block.zone)) continue;

    // Apply block type filter
    if (filterBlockTypes.length > 0) {
      const typeId = block.blockType ?? block.role;
      if (!filterBlockTypes.includes(typeId)) continue;
    }

    // Find all matches in content
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    let matchIdx = 0;
    while ((match = regex.exec(block.content)) !== null) {
      newMatches.push({
        blockId: block.id,
        matchIndex: matchIdx++,
        startPos: match.index,
        endPos: match.index + match[0].length,
      });
      // Prevent infinite loops on zero-length matches
      if (match[0].length === 0) regex.lastIndex++;
    }
  }

  matches = newMatches;
  // Keep current index in bounds, reset if out of range
  if (currentMatchIndex >= newMatches.length) {
    currentMatchIndex = 0;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Debounced search — called by any setter that changes search parameters */
function scheduleSearch(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch();
  }, 250);
}

// ============================================================================
// Actions
// ============================================================================

function open(): void {
  isOpen = true;
}

function close(): void {
  isOpen = false;
  query = "";
  matches = [];
  currentMatchIndex = 0;
  filtersExpanded = false;
  if (debounceTimer) clearTimeout(debounceTimer);
}

function toggle(): void {
  if (isOpen) {
    close();
  } else {
    open();
  }
}

function setQuery(q: string): void {
  query = q;
  scheduleSearch();
}

function nextMatch(): void {
  if (matches.length === 0) return;
  currentMatchIndex = (currentMatchIndex + 1) % matches.length;
}

function previousMatch(): void {
  if (matches.length === 0) return;
  currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
}

function toggleCaseSensitive(): void {
  caseSensitive = !caseSensitive;
  scheduleSearch();
}

function toggleUseRegex(): void {
  useRegex = !useRegex;
  scheduleSearch();
}

function toggleFiltersExpanded(): void {
  filtersExpanded = !filtersExpanded;
}

function addZoneFilter(zoneId: string): void {
  if (!filterZones.includes(zoneId)) {
    filterZones = [...filterZones, zoneId];
    scheduleSearch();
  }
}

function removeZoneFilter(zoneId: string): void {
  filterZones = filterZones.filter((z) => z !== zoneId);
  scheduleSearch();
}

function addBlockTypeFilter(typeId: string): void {
  if (!filterBlockTypes.includes(typeId)) {
    filterBlockTypes = [...filterBlockTypes, typeId];
    scheduleSearch();
  }
}

function removeBlockTypeFilter(typeId: string): void {
  filterBlockTypes = filterBlockTypes.filter((t) => t !== typeId);
  scheduleSearch();
}

function clearFilters(): void {
  filterZones = [];
  filterBlockTypes = [];
  scheduleSearch();
}

function getBlockMatches(blockId: string): SearchMatch[] {
  return matches.filter((m) => m.blockId === blockId);
}

function isCurrentMatchBlock(blockId: string): boolean {
  return currentMatch !== null && currentMatch.blockId === blockId;
}

function getCurrentMatchForBlock(blockId: string): SearchMatch | null {
  if (!currentMatch || currentMatch.blockId !== blockId) return null;
  return currentMatch;
}

function selectAllResults(): string[] {
  // Return unique block IDs that have matches
  const blockIds = new Set<string>();
  for (const m of matches) {
    blockIds.add(m.blockId);
  }
  return [...blockIds];
}

// ============================================================================
// Export Store Interface
// ============================================================================

export const searchStore = {
  // Reactive getters
  get isOpen() {
    return isOpen;
  },
  get query() {
    return query;
  },
  get caseSensitive() {
    return caseSensitive;
  },
  get useRegex() {
    return useRegex;
  },
  get filterZones() {
    return filterZones;
  },
  get filterBlockTypes() {
    return filterBlockTypes;
  },
  get matches() {
    return matches;
  },
  get currentMatchIndex() {
    return currentMatchIndex;
  },
  get matchCount() {
    return matchCount;
  },
  get currentMatch() {
    return currentMatch;
  },
  get hasMatches() {
    return hasMatches;
  },
  get filtersExpanded() {
    return filtersExpanded;
  },

  // Actions
  open,
  close,
  toggle,
  setQuery,
  nextMatch,
  previousMatch,
  toggleCaseSensitive,
  toggleUseRegex,
  toggleFiltersExpanded,
  addZoneFilter,
  removeZoneFilter,
  addBlockTypeFilter,
  removeBlockTypeFilter,
  clearFilters,
  getBlockMatches,
  isCurrentMatchBlock,
  getCurrentMatchForBlock,
  selectAllResults,
};
