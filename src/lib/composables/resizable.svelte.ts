/**
 * Resizable Composable
 *
 * Encapsulates all resize handler logic for sidebar, zones, and terminal split.
 * Uses rAF + direct DOM manipulation during drag for smooth resizing,
 * then commits final values to stores on mouseup.
 */

import type { uiStore as UiStoreType } from "$lib/stores/ui.svelte";
import type { zonesStore as ZonesStoreType } from "$lib/stores/zones.svelte";
import type { terminalStore as TerminalStoreType } from "$lib/stores/terminal.svelte";

interface ResizableStores {
  uiStore: typeof UiStoreType;
  zonesStore: typeof ZonesStoreType;
  terminalStore: typeof TerminalStoreType;
}

// Minimum content area size before auto-collapsing context panel
const MIN_CONTENT_SIZE = 120;

export function createResizable(stores: ResizableStores) {
  const { uiStore, zonesStore, terminalStore } = stores;

  // -- Sidebar resize state --
  let isResizingSidebar = $state(false);
  let resizeStartX = $state(0);
  let resizeStartWidth = $state(0);
  let sidebarResizeRaf = $state<number | null>(null);
  let sidebarRef = $state<HTMLElement | null>(null);

  // -- Zone resize state --
  let resizingZoneId = $state<string | null>(null);
  let zoneResizeStartY = $state(0);
  let zoneResizeStartHeight = $state(0);

  // -- Terminal split resize state --
  let isResizingTerminal = $state(false);
  let termResizeStart = $state(0);
  let termResizeStartSize = $state(0);
  let termResizeRaf = $state<number | null>(null);
  let terminalPanelRef = $state<HTMLElement | null>(null);
  let contentRef = $state<HTMLElement | null>(null);

  // =========================================================================
  // Sidebar resize handlers -- uses rAF + direct DOM for smooth resize
  // =========================================================================

  function handleResizeStart(e: MouseEvent) {
    isResizingSidebar = true;
    resizeStartX = e.clientX;
    resizeStartWidth = uiStore.sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.documentElement.classList.add('is-resizing');
  }

  function handleResizeMove(e: MouseEvent) {
    if (!isResizingSidebar) return;
    // Cancel any pending rAF to coalesce rapid mousemove events
    if (sidebarResizeRaf) cancelAnimationFrame(sidebarResizeRaf);
    sidebarResizeRaf = requestAnimationFrame(() => {
      const delta = e.clientX - resizeStartX;
      // Allow dragging all the way down for snap-to-collapse
      const newWidth = Math.max(uiStore.collapsedSidebarWidth, Math.min(400, resizeStartWidth + delta));
      // Direct DOM update during drag for smoothness -- bypasses Svelte reactivity
      if (sidebarRef) {
        sidebarRef.style.width = `${newWidth}px`;
      }
    });
  }

  function handleResizeEnd() {
    if (!isResizingSidebar) return;
    if (sidebarResizeRaf) cancelAnimationFrame(sidebarResizeRaf);
    // Commit final width to store (triggers one reactive update -- handles snap-to-collapse)
    if (sidebarRef) {
      const finalWidth = parseInt(sidebarRef.style.width) || uiStore.sidebarWidth;
      uiStore.setSidebarWidth(finalWidth);
      // Sync DOM with store-determined width
      sidebarRef.style.width = `${uiStore.sidebarWidth}px`;
    }
    isResizingSidebar = false;
    document.body.style.cursor = '';
    document.documentElement.classList.remove('is-resizing');
  }

  // =========================================================================
  // Zone resize handlers
  // =========================================================================

  function handleZoneResizeStart(e: MouseEvent, zoneId: string, measuredHeight?: number) {
    e.preventDefault();
    e.stopPropagation();

    // If zone is expanded, capture its actual rendered height before un-expanding
    if (zonesStore.isZoneExpanded(zoneId)) {
      if (measuredHeight && measuredHeight > zonesStore.minZoneHeight) {
        zonesStore.setZoneHeight(zoneId, measuredHeight);
      }
      zonesStore.setZoneExpanded(zoneId, false);
    }

    resizingZoneId = zoneId;
    zoneResizeStartY = e.clientY;

    const storedHeight = zonesStore.getZoneHeight(zoneId);
    // Snap to actual content height if it's less than stored max-height.
    // This prevents a "dead zone" where dragging increases max-height
    // but nothing visual changes because content doesn't fill the zone.
    if (measuredHeight && measuredHeight < storedHeight) {
      zonesStore.setZoneHeight(zoneId, Math.max(measuredHeight, zonesStore.minZoneHeight));
      zoneResizeStartHeight = Math.max(measuredHeight, zonesStore.minZoneHeight);
    } else {
      zoneResizeStartHeight = storedHeight;
    }

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.getSelection()?.removeAllRanges();
  }

  function handleZoneResizeMove(e: MouseEvent) {
    if (!resizingZoneId) return;
    e.preventDefault();
    const delta = e.clientY - zoneResizeStartY;
    zonesStore.setZoneHeight(resizingZoneId, zoneResizeStartHeight + delta);
  }

  function handleZoneResizeEnd() {
    if (!resizingZoneId) return;
    resizingZoneId = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  // =========================================================================
  // Terminal split resize handlers -- rAF + direct DOM
  // =========================================================================

  function handleTermResizeStart(e: MouseEvent) {
    e.preventDefault();
    isResizingTerminal = true;
    const isBottom = terminalStore.position === 'bottom';
    termResizeStart = isBottom ? e.clientY : e.clientX;

    // When context is collapsed, terminal fills via flex -- measure actual DOM size
    if (uiStore.contextPanelCollapsed && terminalPanelRef) {
      termResizeStartSize = isBottom
        ? terminalPanelRef.clientHeight
        : terminalPanelRef.clientWidth;
      // Switch from flex fill to fixed size for smooth drag
      if (isBottom) {
        terminalPanelRef.style.height = `${termResizeStartSize}px`;
      } else {
        terminalPanelRef.style.width = `${termResizeStartSize}px`;
      }
      terminalPanelRef.style.flex = '0 0 auto';
    } else {
      termResizeStartSize = isBottom ? terminalStore.terminalHeight : terminalStore.terminalWidth;
    }

    document.body.style.cursor = isBottom ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    document.documentElement.classList.add('is-resizing');
  }

  function handleTermResizeMove(e: MouseEvent) {
    if (!isResizingTerminal) return;
    if (termResizeRaf) cancelAnimationFrame(termResizeRaf);
    termResizeRaf = requestAnimationFrame(() => {
      const isBottom = terminalStore.position === 'bottom';
      // Invert delta: dragging up/left should increase size
      const delta = isBottom
        ? termResizeStart - e.clientY
        : termResizeStart - e.clientX;
      const newSize = Math.max(terminalStore.collapsedSize, termResizeStartSize + delta);
      if (terminalPanelRef) {
        if (isBottom) {
          terminalPanelRef.style.height = `${newSize}px`;
        } else {
          terminalPanelRef.style.width = `${newSize}px`;
        }
      }
    });
  }

  function handleTermResizeEnd() {
    if (!isResizingTerminal) return;
    if (termResizeRaf) cancelAnimationFrame(termResizeRaf);

    const wasContextCollapsed = uiStore.contextPanelCollapsed;

    if (terminalPanelRef) {
      const isBottom = terminalStore.position === 'bottom';

      // Reset flex override from collapsed-context drag
      terminalPanelRef.style.flex = '';

      if (isBottom) {
        const finalHeight = parseInt(terminalPanelRef.style.height) || terminalStore.terminalHeight;
        terminalStore.setHeight(finalHeight);
        terminalPanelRef.style.height = `${terminalStore.terminalHeight}px`;
      } else {
        const finalWidth = parseInt(terminalPanelRef.style.width) || terminalStore.terminalWidth;
        terminalStore.setWidth(finalWidth);
        terminalPanelRef.style.width = `${terminalStore.terminalWidth}px`;
      }
    }

    if (wasContextCollapsed) {
      // Un-collapse context if terminal was dragged smaller, freeing enough space
      const isBottom = terminalStore.position === 'bottom';
      const freedSpace = termResizeStartSize - (isBottom ? terminalStore.terminalHeight : terminalStore.terminalWidth);
      if (freedSpace >= MIN_CONTENT_SIZE) {
        uiStore.toggleContextPanel();
      }
    } else if (contentRef) {
      // Auto-collapse context if content area is too small
      const isBottom = terminalStore.position === 'bottom';
      const containerSize = isBottom ? contentRef.clientHeight : contentRef.clientWidth;
      const termSize = isBottom ? terminalStore.terminalHeight : terminalStore.terminalWidth;
      const handleSize = 4;
      const remaining = containerSize - termSize - handleSize;
      if (remaining < MIN_CONTENT_SIZE) {
        uiStore.toggleContextPanel();
      }
    }

    isResizingTerminal = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.documentElement.classList.remove('is-resizing');
  }

  return {
    // Reactive state (getters + setters for bind:this refs)
    get isResizingSidebar() { return isResizingSidebar; },
    get resizingZoneId() { return resizingZoneId; },
    get isResizingTerminal() { return isResizingTerminal; },

    get sidebarRef() { return sidebarRef; },
    set sidebarRef(el: HTMLElement | null) { sidebarRef = el; },

    get terminalPanelRef() { return terminalPanelRef; },
    set terminalPanelRef(el: HTMLElement | null) { terminalPanelRef = el; },

    get contentRef() { return contentRef; },
    set contentRef(el: HTMLElement | null) { contentRef = el; },

    // Sidebar handlers
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,

    // Zone handlers
    handleZoneResizeStart,
    handleZoneResizeMove,
    handleZoneResizeEnd,

    // Terminal handlers
    handleTermResizeStart,
    handleTermResizeMove,
    handleTermResizeEnd,
  };
}
