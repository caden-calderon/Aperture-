/**
 * Edit History Store
 * Tracks per-block edit history for version comparison and undo/redo.
 *
 * Uses Record<string, EditEntry[]> (NOT Map) for Svelte 5 $state reactivity.
 * Timestamps are Unix ms numbers (NOT Date objects) for JSON serialization.
 */

export type EditType = "content" | "zone" | "compression" | "role" | "pin";

export interface EditEntry {
  id: string;
  blockId: string;
  timestamp: number;
  type: EditType;
  before: Record<string, string | null>;
  after: Record<string, string | null>;
}

const STORAGE_KEY = "aperture-edit-history";
const MAX_ENTRIES_PER_BLOCK = 50;

// ============================================================================
// Debounced persistence
// ============================================================================

let _dirty = false;
let _saveTimer: ReturnType<typeof setTimeout> | undefined;

function markDirty(): void {
  _dirty = true;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    saveToLocalStorage();
    _dirty = false;
  }, 1500);
}

function flushPendingWrites(): void {
  if (_dirty) {
    saveToLocalStorage();
    _dirty = false;
  }
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = undefined;
  }
}

// ============================================================================
// State
// ============================================================================

let history = $state<Record<string, EditEntry[]>>({});
let undoStack = $state<EditEntry[]>([]);
let redoStack = $state<EditEntry[]>([]);

// ============================================================================
// Persistence
// ============================================================================

function saveToLocalStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ history }));
  } catch (e) {
    console.error("Failed to save edit history:", e);
  }
}

function loadFromLocalStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const data = JSON.parse(stored);
    if (data.history && typeof data.history === "object") {
      history = data.history;
    }
  } catch (e) {
    console.error("Failed to load edit history:", e);
  }
}

// ============================================================================
// Actions
// ============================================================================

function init(): void {
  loadFromLocalStorage();
}

function recordEdit(
  blockId: string,
  type: EditType,
  before: Record<string, string | null>,
  after: Record<string, string | null>
): void {
  const entry: EditEntry = {
    id: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    blockId,
    timestamp: Date.now(),
    type,
    before,
    after,
  };

  const existing = history[blockId] ?? [];
  // Newest first
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES_PER_BLOCK);
  history = { ...history, [blockId]: updated };

  // Push to undo stack, clear redo
  undoStack = [...undoStack, entry];
  redoStack = [];

  markDirty();
}

function getBlockHistory(blockId: string): EditEntry[] {
  return history[blockId] ?? [];
}

function clearBlockHistory(blockId: string): void {
  if (!(blockId in history)) return;
  const { [blockId]: _, ...rest } = history;
  history = rest;
  markDirty();
}

function popUndo(): EditEntry | null {
  if (undoStack.length === 0) return null;
  const entry = undoStack[undoStack.length - 1];
  undoStack = undoStack.slice(0, -1);
  redoStack = [...redoStack, entry];
  return entry;
}

function popRedo(): EditEntry | null {
  if (redoStack.length === 0) return null;
  const entry = redoStack[redoStack.length - 1];
  redoStack = redoStack.slice(0, -1);
  undoStack = [...undoStack, entry];
  return entry;
}

// ============================================================================
// Export Store Interface
// ============================================================================

export const editHistoryStore = {
  get history() {
    return history;
  },
  get undoStack() {
    return undoStack;
  },
  get redoStack() {
    return redoStack;
  },

  init,
  flushPendingWrites,
  recordEdit,
  getBlockHistory,
  clearBlockHistory,
  popUndo,
  popRedo,
};
