/**
 * Zones Store
 * Manages built-in and custom zones with display order and context order
 *
 * Context Order: primacy (first) -> custom zones -> recency (always last)
 * Display Order: Visual position in UI (independent of context order)
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

// ============================================================================
// Derived
// ============================================================================

const allZones = $derived.by(() => {
  const zones = [...BUILT_IN_ZONES, ...customZones];
  // Apply display order overrides
  return zones.map((z) => ({
    ...z,
    displayOrder: displayOrderOverrides[z.id] ?? z.displayOrder,
  }));
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
  // Check if it's a built-in zone - only allow updating displayOrder
  const builtIn = BUILT_IN_ZONES.find((z) => z.id === id);
  if (builtIn) {
    if (updates.displayOrder !== undefined) {
      displayOrderOverrides[id] = updates.displayOrder;
      displayOrderOverrides = { ...displayOrderOverrides };
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
// Persistence
// ============================================================================

function saveToLocalStorage(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    "aperture-custom-zones",
    JSON.stringify({ customZones, displayOrderOverrides })
  );
}

function loadFromLocalStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const stored = localStorage.getItem("aperture-custom-zones");
    if (stored) {
      const data = JSON.parse(stored);
      customZones = data.customZones ?? [];
      displayOrderOverrides = data.displayOrderOverrides ?? {};
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
};
