/**
 * UI Store
 * Manages UI state: modals, toasts, command palette, drag state
 */

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
let draggingBlockId = $state<string | null>(null);
let dragOverZone = $state<string | null>(null);
let toasts = $state<Toast[]>([]);
let collapsedZones = $state(new Set<string>());
let compressionSliderOpen = $state(false);
let sidebarCollapsed = $state(false);

// Density: 0.8 = compact, 1.0 = normal, 1.2 = comfortable
let density = $state(1.0);

// ============================================================================
// Derived State
// ============================================================================

const hasModal = $derived(modalBlockId !== null);
const isDragging = $derived(draggingBlockId !== null);

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

function startDrag(blockId: string): void {
  draggingBlockId = blockId;
}

function setDragOverZone(zone: string | null): void {
  dragOverZone = zone;
}

function endDrag(): void {
  draggingBlockId = null;
  dragOverZone = null;
}

// ============================================================================
// Zone Collapse Actions
// ============================================================================

function toggleZoneCollapse(zone: string): void {
  const newSet = new Set(collapsedZones);
  if (newSet.has(zone)) {
    newSet.delete(zone);
  } else {
    newSet.add(zone);
  }
  collapsedZones = newSet;
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
  sidebarCollapsed = !sidebarCollapsed;
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
  get draggingBlockId() {
    return draggingBlockId;
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
  get density() {
    return density;
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

  // Toasts
  showToast,
  dismissToast,

  // Compression
  openCompressionSlider,
  closeCompressionSlider,

  // Sidebar
  toggleSidebar,

  // Density
  setDensity,
  increaseDensity,
  decreaseDensity,
  resetDensity,
  initDensity,
};
