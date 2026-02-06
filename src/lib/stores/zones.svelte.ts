/**
 * Zones Store
 * Manages built-in and custom zones with display order and context order
 *
 * Context Order: primacy (first) -> custom zones -> recency (always last)
 * Display Order: Visual position in UI (independent of context order)
 *
 * NOTE: Uses Record<string, boolean> instead of Set<string> for expandedZones
 * because Svelte 5's $state deeply proxies plain objects but NOT Set/Map.
 * Set.has() calls are not tracked as reactive dependencies.
 */

// ============================================================================
// Types
// ============================================================================

export interface ZoneConfig {
  id: string;
  label: string;
  color: string;
  isBuiltIn: boolean;
  contextOrder: number; // Lower = earlier in context (primacy=0, recency=Infinity)
  displayOrder: number; // Visual order in UI
}

// ============================================================================
// Built-in Zones
// ============================================================================

const BUILT_IN_ZONES: ZoneConfig[] = [
  {
    id: "primacy",
    label: "Primacy",
    color: "var(--zone-primacy)",
    isBuiltIn: true,
    contextOrder: 0, // Always first in context
    displayOrder: 0,
  },
  {
    id: "middle",
    label: "Middle",
    color: "var(--zone-middle)",
    isBuiltIn: true,
    contextOrder: 50, // Middle of context
    displayOrder: 1,
  },
  {
    id: "recency",
    label: "Recency",
    color: "var(--zone-recency)",
    isBuiltIn: true,
    contextOrder: 1000, // Always last in context
    displayOrder: 2,
  },
];

// ============================================================================
// State
// ============================================================================

let customZones = $state<ZoneConfig[]>([]);
let displayOrderOverrides = $state<Record<string, number>>({}); // id -> displayOrder
let builtInOverrides = $state<Record<string, { label?: string; color?: string }>>({}); // id -> overrides
let zoneHeights = $state<Record<string, number>>({}); // id -> height in pixels
let expandedZones = $state<Record<string, boolean>>({}); // id -> expanded (plain object for reactivity)
let contentExpandedZones = $state<Record<string, boolean>>({}); // id -> content expanded (blocks show full text)

const DEFAULT_ZONE_HEIGHT = 200;
const MIN_ZONE_HEIGHT = 80;

// Token history: last N data points per zone for sparklines
const MAX_HISTORY_POINTS = 20;
let tokenHistory = $state<Record<string, number[]>>({});

// ============================================================================
// Derived
// ============================================================================

const allZones = $derived.by(() => {
  const zones = [...BUILT_IN_ZONES, ...customZones];
  // Apply overrides (display order, label, color for built-in zones)
  return zones.map((z) => {
    const overrides = builtInOverrides[z.id];
    return {
      ...z,
      displayOrder: displayOrderOverrides[z.id] ?? z.displayOrder,
      label: overrides?.label ?? z.label,
      color: overrides?.color ?? z.color,
    };
  });
});

// Zones sorted by display order (for UI rendering)
const zonesByDisplayOrder = $derived.by(() => {
  return [...allZones].sort((a, b) => a.displayOrder - b.displayOrder);
});

// Zones sorted by context order (for actual context building)
const zonesByContextOrder = $derived.by(() => {
  return [...allZones].sort((a, b) => a.contextOrder - b.contextOrder);
});

// Zone IDs in context order
const zoneIdsInContextOrder = $derived.by(() => {
  return zonesByContextOrder.map((z) => z.id);
});

// ============================================================================
// Actions
// ============================================================================

function addCustomZone(label: string, color: string): string {
  const id = `zone-${Date.now()}`;
  // Custom zones get context order between primacy and recency
  const maxContextOrder = Math.max(
    ...customZones.map((z) => z.contextOrder),
    50 // Start after middle
  );
  const maxDisplayOrder = Math.max(
    ...allZones.map((z) => z.displayOrder),
    2
  );

  const newZone: ZoneConfig = {
    id,
    label,
    color,
    isBuiltIn: false,
    contextOrder: maxContextOrder + 10, // Before recency (1000)
    displayOrder: maxDisplayOrder + 1,
  };
  customZones = [...customZones, newZone];
  saveToLocalStorage();
  return id;
}

function updateZone(
  id: string,
  updates: Partial<Omit<ZoneConfig, "id" | "isBuiltIn">>
): void {
  // Check if it's a built-in zone
  const builtIn = BUILT_IN_ZONES.find((z) => z.id === id);
  if (builtIn) {
    // Handle displayOrder
    if (updates.displayOrder !== undefined) {
      displayOrderOverrides[id] = updates.displayOrder;
      displayOrderOverrides = { ...displayOrderOverrides };
    }

    // Handle label and color overrides for built-in zones
    if (updates.label !== undefined || updates.color !== undefined) {
      const existing = builtInOverrides[id] ?? {};
      builtInOverrides[id] = {
        ...existing,
        ...(updates.label !== undefined && { label: updates.label }),
        ...(updates.color !== undefined && { color: updates.color }),
      };
      builtInOverrides = { ...builtInOverrides };
    }
    saveToLocalStorage();
    return;
  }

  // Update custom zone
  customZones = customZones.map((z) =>
    z.id === id ? { ...z, ...updates } : z
  );
  saveToLocalStorage();
}

function deleteZone(id: string): void {
  // Can't delete built-in zones
  const builtIn = BUILT_IN_ZONES.find((z) => z.id === id);
  if (builtIn) return;

  customZones = customZones.filter((z) => z.id !== id);
  delete displayOrderOverrides[id];
  displayOrderOverrides = { ...displayOrderOverrides };
  saveToLocalStorage();
}

function getZoneById(id: string): ZoneConfig | undefined {
  return allZones.find((z) => z.id === id);
}

function getZoneColor(id: string): string {
  const zone = getZoneById(id);
  return zone?.color ?? "var(--text-muted)";
}

function reorderZonesDisplay(zoneIds: string[]): void {
  // Update display order based on new array order
  zoneIds.forEach((id, index) => {
    displayOrderOverrides[id] = index;
  });
  displayOrderOverrides = { ...displayOrderOverrides };
  saveToLocalStorage();
}

function resetBuiltInZone(id: string): void {
  const builtIn = BUILT_IN_ZONES.find((z) => z.id === id);
  if (!builtIn) return;

  // Remove overrides for this zone
  delete builtInOverrides[id];
  builtInOverrides = { ...builtInOverrides };
  delete displayOrderOverrides[id];
  displayOrderOverrides = { ...displayOrderOverrides };
  saveToLocalStorage();
}

function getOriginalBuiltIn(id: string): ZoneConfig | undefined {
  return BUILT_IN_ZONES.find((z) => z.id === id);
}

function getZoneHeight(id: string): number {
  return zoneHeights[id] ?? DEFAULT_ZONE_HEIGHT;
}

function setZoneHeight(id: string, height: number): void {
  // No upper limit - let content determine max
  zoneHeights[id] = Math.max(MIN_ZONE_HEIGHT, height);
  zoneHeights = { ...zoneHeights };
  saveToLocalStorage();
}

function resetZoneHeight(id: string): void {
  delete zoneHeights[id];
  zoneHeights = { ...zoneHeights };
  saveToLocalStorage();
}

function isZoneExpanded(id: string): boolean {
  return expandedZones[id] === true;
}

function toggleZoneExpanded(id: string): void {
  expandedZones[id] = !expandedZones[id];
  saveToLocalStorage();
}

function setZoneExpanded(id: string, expanded: boolean): void {
  expandedZones[id] = expanded;
  saveToLocalStorage();
}

function isContentExpanded(id: string): boolean {
  return contentExpandedZones[id] === true;
}

function toggleContentExpanded(id: string): void {
  contentExpandedZones[id] = !contentExpandedZones[id];
  saveToLocalStorage();
}

function setZoneContextOrder(id: string, contextOrder: number): void {
  // Can't change context order of primacy (always 0) or recency (always last)
  if (id === "primacy" || id === "recency") return;

  // Clamp between primacy and recency
  const clampedOrder = Math.max(1, Math.min(contextOrder, 999));

  const zone = customZones.find((z) => z.id === id);
  if (zone) {
    customZones = customZones.map((z) =>
      z.id === id ? { ...z, contextOrder: clampedOrder } : z
    );
  } else if (id === "middle") {
    // For middle zone, store in overrides conceptually
    // Actually middle is built-in, so we'd need different handling
    // For now, middle stays at 50
  }
  saveToLocalStorage();
}

// ============================================================================
// Token History (for sparklines)
// ============================================================================

/**
 * Record a token snapshot for zones. Call when blocks change.
 * Accepts a pre-computed map of zoneId→tokenCount to avoid
 * reading reactive derived state (allZones) inside $effects.
 */
function recordTokenSnapshot(tokensByZone: Record<string, number>): void {
  let changed = false;
  const updated = { ...tokenHistory };

  for (const [zoneId, tokens] of Object.entries(tokensByZone)) {
    const history = updated[zoneId] ?? [];
    // Skip if same as last value to avoid flat lines
    if (history.length > 0 && history[history.length - 1] === tokens) continue;
    // Seed first entry with 0 so sparkline has ≥2 points immediately
    if (history.length === 0) {
      updated[zoneId] = [0, tokens];
    } else {
      updated[zoneId] = [...history.slice(-(MAX_HISTORY_POINTS - 1)), tokens];
    }
    changed = true;
  }

  // Only trigger reactivity if data actually changed
  if (changed) {
    tokenHistory = updated;
    saveToLocalStorage();
  }
}

function getTokenHistory(zoneId: string): number[] {
  return tokenHistory[zoneId] ?? [];
}

// ============================================================================
// State Capture / Restore (for snapshots)
// ============================================================================

import type { SnapshotZoneState } from "../types";

function captureState(): SnapshotZoneState {
  return {
    customZones: JSON.parse(JSON.stringify(customZones)),
    displayOrderOverrides: { ...displayOrderOverrides },
    builtInOverrides: JSON.parse(JSON.stringify(builtInOverrides)),
    zoneHeights: { ...zoneHeights },
    expandedZones: Object.entries(expandedZones).filter(([, v]) => v).map(([k]) => k),
    contentExpandedZones: Object.entries(contentExpandedZones).filter(([, v]) => v).map(([k]) => k),
    tokenHistory: JSON.parse(JSON.stringify(tokenHistory)),
  };
}

function restoreState(state: SnapshotZoneState): void {
  customZones = state.customZones ?? [];
  displayOrderOverrides = state.displayOrderOverrides ?? {};
  builtInOverrides = state.builtInOverrides ?? {};
  zoneHeights = state.zoneHeights ?? {};
  expandedZones = Object.fromEntries((state.expandedZones ?? []).map(id => [id, true]));
  contentExpandedZones = Object.fromEntries((state.contentExpandedZones ?? []).map(id => [id, true]));
  tokenHistory = state.tokenHistory ?? {};
  saveToLocalStorage();
}

// ============================================================================
// Persistence
// ============================================================================

// Bump this when the localStorage schema changes to auto-migrate
const STORAGE_VERSION = 4;

function saveToLocalStorage(): void {
  if (typeof localStorage === "undefined") return;
  const expandedIds = Object.entries(expandedZones)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const contentExpandedIds = Object.entries(contentExpandedZones)
    .filter(([, v]) => v)
    .map(([k]) => k);
  localStorage.setItem(
    "aperture-custom-zones",
    JSON.stringify({
      version: STORAGE_VERSION,
      customZones,
      displayOrderOverrides,
      builtInOverrides,
      zoneHeights,
      expandedZones: expandedIds,
      contentExpandedZones: contentExpandedIds,
      tokenHistory,
    })
  );
}

function loadFromLocalStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const stored = localStorage.getItem("aperture-custom-zones");
    if (!stored) return;

    const data = JSON.parse(stored);
    const version = data.version ?? 1;

    // Auto-migrate: if schema is too old, reset and re-save
    if (version < STORAGE_VERSION) {
      console.info(`Migrating zone storage v${version} → v${STORAGE_VERSION}`);
    }

    customZones = data.customZones ?? [];
    displayOrderOverrides = data.displayOrderOverrides ?? {};
    builtInOverrides = data.builtInOverrides ?? {};
    zoneHeights = data.zoneHeights ?? {};

    // expandedZones: stored as array of IDs, loaded as Record<string, boolean>
    const raw = data.expandedZones;
    if (Array.isArray(raw)) {
      const obj: Record<string, boolean> = {};
      for (const id of raw) {
        obj[id] = true;
      }
      expandedZones = obj;
    } else {
      expandedZones = {};
    }

    // contentExpandedZones: same format
    const rawContent = data.contentExpandedZones;
    if (Array.isArray(rawContent)) {
      const obj: Record<string, boolean> = {};
      for (const id of rawContent) {
        obj[id] = true;
      }
      contentExpandedZones = obj;
    } else {
      contentExpandedZones = {};
    }

    // Token history for sparklines
    if (data.tokenHistory && typeof data.tokenHistory === "object") {
      tokenHistory = data.tokenHistory;
    } else {
      tokenHistory = {};
    }

    // Re-save to upgrade version tag
    if (version < STORAGE_VERSION) {
      saveToLocalStorage();
    }
  } catch (e) {
    console.error("Failed to load custom zones:", e);
  }
}

function init(): void {
  loadFromLocalStorage();
}

// ============================================================================
// Export Store Interface
// ============================================================================

export const zonesStore = {
  // Reactive getters
  get builtInZones() {
    return BUILT_IN_ZONES;
  },
  get customZones() {
    return customZones;
  },
  get allZones() {
    return allZones;
  },
  get zonesByDisplayOrder() {
    return zonesByDisplayOrder;
  },
  get zonesByContextOrder() {
    return zonesByContextOrder;
  },
  get zoneIdsInContextOrder() {
    return zoneIdsInContextOrder;
  },

  // Actions
  init,
  addCustomZone,
  updateZone,
  deleteZone,
  getZoneById,
  getZoneColor,
  reorderZonesDisplay,
  setZoneContextOrder,
  resetBuiltInZone,
  getOriginalBuiltIn,
  getZoneHeight,
  setZoneHeight,
  resetZoneHeight,
  isZoneExpanded,
  toggleZoneExpanded,
  setZoneExpanded,
  isContentExpanded,
  toggleContentExpanded,
  minZoneHeight: MIN_ZONE_HEIGHT,
  defaultZoneHeight: DEFAULT_ZONE_HEIGHT,

  // Token history (sparklines)
  recordTokenSnapshot,
  getTokenHistory,

  // State capture/restore (for snapshots)
  captureState,
  restoreState,
};
