/**
 * UI Store
 * Manages UI state: modals, toasts, command palette, drag state
 */

import { SvelteSet } from "svelte/reactivity";

// UI Store types and state

// ============================================================================
// Toast Types
// ============================================================================

export interface Toast {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  duration: number;
}

// ============================================================================
// State
// ============================================================================

let modalBlockId = $state<string | null>(null);
let commandPaletteOpen = $state(false);
let draggingBlockIds = $state<string[]>([]);
let dragOverZone = $state<string | null>(null);
let toasts = $state<Toast[]>([]);
let collapsedZones = $state(new SvelteSet<string>());
let compressionSliderOpen = $state(false);
let sidebarCollapsed = $state(false);
let sidebarWidth = $state(220); // Default width in pixels
let contextPanelCollapsed = $state(false);

// Density: 0.8 = compact, 1.0 = normal, 1.2 = comfortable
let density = $state(1.0);

// Minimap visibility
let minimapVisible = $state(false);

// Batch mode: disables transitions during rapid updates (e.g., streaming)
let batchMode = $state(false);

// ============================================================================
// Derived State
// ============================================================================

const hasModal = $derived(modalBlockId !== null);
const isDragging = $derived(draggingBlockIds.length > 0);

// ============================================================================
// Modal Actions
// ============================================================================

function openModal(blockId: string): void {
  modalBlockId = blockId;
}

function closeModal(): void {
  modalBlockId = null;
}

// ============================================================================
// Command Palette Actions
// ============================================================================

function openCommandPalette(): void {
  commandPaletteOpen = true;
}

function closeCommandPalette(): void {
  commandPaletteOpen = false;
}

function toggleCommandPalette(): void {
  commandPaletteOpen = !commandPaletteOpen;
}

// ============================================================================
// Drag State Actions
// ============================================================================

function startDrag(blockIds: string[]): void {
  draggingBlockIds = blockIds;
}

function setDragOverZone(zone: string | null): void {
  dragOverZone = zone;
}

function endDrag(): void {
  draggingBlockIds = [];
  dragOverZone = null;
}

// ============================================================================
// Zone Collapse Actions
// ============================================================================

function toggleZoneCollapse(zone: string): void {
  if (collapsedZones.has(zone)) {
    collapsedZones.delete(zone);
  } else {
    collapsedZones.add(zone);
  }
}

function isZoneCollapsed(zone: string): boolean {
  return collapsedZones.has(zone);
}

// ============================================================================
// Toast Actions
// ============================================================================

let toastId = 0;

function showToast(
  message: string,
  type: Toast["type"] = "info",
  duration = 3000
): string {
  const id = `toast-${++toastId}`;
  const toast: Toast = { id, message, type, duration };
  toasts = [...toasts, toast];

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }

  return id;
}

function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
}

// ============================================================================
// Compression Slider Actions
// ============================================================================

function openCompressionSlider(): void {
  compressionSliderOpen = true;
}

function closeCompressionSlider(): void {
  compressionSliderOpen = false;
}

// ============================================================================
// Sidebar Actions
// ============================================================================

function toggleSidebar(): void {
  if (sidebarCollapsed) {
    // Expand: restore pre-collapse width
    sidebarCollapsed = false;
    sidebarWidth = preCollapseWidth;
    localStorage.setItem('aperture-sidebar-collapsed', 'false');
    localStorage.setItem('aperture-sidebar-width', sidebarWidth.toString());
  } else {
    // Collapse: save current width then collapse
    preCollapseWidth = sidebarWidth;
    localStorage.setItem('aperture-sidebar-width-before-collapse', preCollapseWidth.toString());
    sidebarCollapsed = true;
    sidebarWidth = COLLAPSED_SIDEBAR_WIDTH;
    localStorage.setItem('aperture-sidebar-collapsed', 'true');
  }
}

function toggleContextPanel(): void {
  contextPanelCollapsed = !contextPanelCollapsed;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('aperture-context-panel-collapsed', JSON.stringify(contextPanelCollapsed));
  }
}

function initContextPanel(): void {
  if (typeof localStorage === 'undefined') return;
  const stored = localStorage.getItem('aperture-context-panel-collapsed');
  if (stored) {
    try { contextPanelCollapsed = JSON.parse(stored); } catch { /* invalid JSON, keep default */ }
  }
}

function expandAllZones(): void {
  collapsedZones.clear();
}

function collapseAllZonesFrom(zoneIds: string[]): void {
  collapsedZones.clear();
  for (const id of zoneIds) {
    collapsedZones.add(id);
  }
}

// ============================================================================
// Sidebar Width Actions
// ============================================================================

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const COLLAPSED_SIDEBAR_WIDTH = 36;
const COLLAPSE_THRESHOLD = 90;
let preCollapseWidth = $state(220); // Width to restore when expanding

function setSidebarWidth(width: number): void {
  // Snap to collapsed if below threshold
  if (width < COLLAPSE_THRESHOLD) {
    if (!sidebarCollapsed) {
      preCollapseWidth = Math.max(MIN_SIDEBAR_WIDTH, sidebarWidth);
      localStorage.setItem('aperture-sidebar-width-before-collapse', preCollapseWidth.toString());
    }
    sidebarCollapsed = true;
    sidebarWidth = COLLAPSED_SIDEBAR_WIDTH;
    localStorage.setItem('aperture-sidebar-collapsed', 'true');
    return;
  }
  sidebarCollapsed = false;
  sidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width));
  localStorage.setItem('aperture-sidebar-width', sidebarWidth.toString());
  localStorage.setItem('aperture-sidebar-collapsed', 'false');
}

function initSidebarWidth(): void {
  const storedCollapsed = localStorage.getItem('aperture-sidebar-collapsed');
  const storedPreCollapse = localStorage.getItem('aperture-sidebar-width-before-collapse');
  if (storedPreCollapse) {
    const val = parseInt(storedPreCollapse, 10);
    if (!isNaN(val)) preCollapseWidth = val;
  }
  if (storedCollapsed === 'true') {
    sidebarCollapsed = true;
    sidebarWidth = COLLAPSED_SIDEBAR_WIDTH;
    return;
  }
  const stored = localStorage.getItem('aperture-sidebar-width');
  if (stored) {
    const value = parseInt(stored, 10);
    if (!isNaN(value)) {
      sidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, value));
    }
  }
}

// ============================================================================
// Density Actions
// ============================================================================

function setDensity(value: number): void {
  density = Math.max(0.75, Math.min(1.25, value));
  // Apply to CSS custom property
  document.documentElement.style.setProperty('--density-scale', density.toString());
  localStorage.setItem('aperture-density', density.toString());
}

function increaseDensity(): void {
  setDensity(density + 0.05);
}

function decreaseDensity(): void {
  setDensity(density - 0.05);
}

function resetDensity(): void {
  setDensity(1.0);
}

function initDensity(): void {
  const stored = localStorage.getItem('aperture-density');
  if (stored) {
    const value = parseFloat(stored);
    if (!isNaN(value)) {
      setDensity(value);
    }
  }
}

// ============================================================================
// Minimap Actions
// ============================================================================

function toggleMinimap(): void {
  minimapVisible = !minimapVisible;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('aperture-minimap-visible', JSON.stringify(minimapVisible));
  }
}

function initMinimap(): void {
  if (typeof localStorage === 'undefined') return;
  const stored = localStorage.getItem('aperture-minimap-visible');
  if (stored) {
    try { minimapVisible = JSON.parse(stored); } catch { /* invalid JSON, keep default */ }
  }
}

// ============================================================================
// Batch Mode Actions
// ============================================================================

function startBatch(): void {
  batchMode = true;
}

function endBatch(): void {
  batchMode = false;
}

// ============================================================================
// Export Store Interface
// ============================================================================

export const uiStore = {
  // Reactive getters
  get modalBlockId() {
    return modalBlockId;
  },
  get hasModal() {
    return hasModal;
  },
  get commandPaletteOpen() {
    return commandPaletteOpen;
  },
  get draggingBlockIds() {
    return draggingBlockIds;
  },
  get dragOverZone() {
    return dragOverZone;
  },
  get isDragging() {
    return isDragging;
  },
  get toasts() {
    return toasts;
  },
  get collapsedZones() {
    return collapsedZones;
  },
  get compressionSliderOpen() {
    return compressionSliderOpen;
  },
  get sidebarCollapsed() {
    return sidebarCollapsed;
  },
  get contextPanelCollapsed() {
    return contextPanelCollapsed;
  },
  get sidebarWidth() {
    return sidebarWidth;
  },
  get minSidebarWidth() {
    return MIN_SIDEBAR_WIDTH;
  },
  get maxSidebarWidth() {
    return MAX_SIDEBAR_WIDTH;
  },
  get collapsedSidebarWidth() {
    return COLLAPSED_SIDEBAR_WIDTH;
  },
  get collapseThreshold() {
    return COLLAPSE_THRESHOLD;
  },
  get density() {
    return density;
  },
  get minimapVisible() {
    return minimapVisible;
  },
  get batchMode() {
    return batchMode;
  },
  get transitionDuration() {
    return batchMode ? 0 : 150;
  },

  // Modal
  openModal,
  closeModal,

  // Command Palette
  openCommandPalette,
  closeCommandPalette,
  toggleCommandPalette,

  // Drag
  startDrag,
  setDragOverZone,
  endDrag,

  // Zones
  toggleZoneCollapse,
  isZoneCollapsed,
  expandAllZones,
  collapseAllZonesFrom,

  // Toasts
  showToast,
  dismissToast,

  // Compression
  openCompressionSlider,
  closeCompressionSlider,

  // Sidebar
  toggleSidebar,
  setSidebarWidth,
  initSidebarWidth,

  // Context Panel
  toggleContextPanel,
  initContextPanel,

  // Density
  setDensity,
  increaseDensity,
  decreaseDensity,
  resetDensity,
  initDensity,

  // Minimap
  toggleMinimap,
  initMinimap,

  // Batch mode
  startBatch,
  endBatch,
};
