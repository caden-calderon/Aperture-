# Phase 0: UI Foundation

**Status**: IN PROGRESS
**Goal**: Complete Tauri + Svelte 5 app shell with full visual UI using mock data
**Prerequisites**: None
**Estimated Scope**: ~60-80k context

---

## Context

This is the foundation phase. We build the entire UI experience with mock data before touching any backend. The visual experience IS the product — if it doesn't feel incredible, nothing else matters.

**Reference**: `reference/context-forge-prototype.html` — Working HTML prototype showing core interactions

---

## Problem Statement

1. **No app shell** — Need Tauri v2 + Svelte 5 project initialized
2. **No visual UI** — Need to translate prototype into production Svelte components
3. **No effects layer** — Need Canvas integration for halftone/dithering effects
4. **No animations** — Need the dissolution, materialization, and transition effects

---

## Deliverables

### 1. Tauri + Svelte Project Skeleton

- Tauri v2 app that launches
- Svelte 5 with SvelteKit
- Tailwind CSS configured
- TypeScript throughout
- Dev workflow: `pnpm tauri dev`

### 2. Core UI Components

| Component | Description |
|-----------|-------------|
| `TokenBudgetBar` | Top bar showing token usage by zone, dithered gradient |
| `ZoneContainer` | Primacy/Middle/Recency zone with collapsible header |
| `ContextBlock` | Individual block with type indicator, preview, tokens |
| `Sidebar` | Snapshots, block type filters, keyboard shortcuts |
| `Toolbar` | Selection actions (select all, condense, remove) |
| `CommandPalette` | Cmd+K palette for quick actions |

### 3. Interactions

- Click to select, shift+click for range select
- Drag blocks between zones
- Drag to trash zone (slides up from bottom)
- Double-click to expand block detail modal
- Keyboard shortcuts (A, Esc, Del, C, S)
- Pin cycling (primacy → recency → middle)

### 4. Visual Effects (Canvas Layer)

- Halftone dot patterns for heat visualization
- Dithered token budget bar
- Block dissolution animation (removal)
- Block materialization animation (appearance)
- Compression visual feedback (block shrinks, dithers)

### 5. Mock Data System

- Realistic demo context data
- Multiple block types (system, user, assistant, tool_use, tool_result)
- Simulated compression (UI only, no LLM)
- Snapshot save/restore (local state only)

### 6. Theming

- Dark mode (primary)
- CSS variables for all colors
- Halftone/dithering aesthetic throughout

---

## Key Files to Create

| File | Purpose |
|------|---------|
| `src/lib/components/TokenBudgetBar.svelte` | Token usage visualization |
| `src/lib/components/Zone.svelte` | Zone container |
| `src/lib/components/ContextBlock.svelte` | Individual block |
| `src/lib/components/Sidebar.svelte` | Left sidebar |
| `src/lib/components/Toolbar.svelte` | Selection actions |
| `src/lib/components/CommandPalette.svelte` | Cmd+K palette |
| `src/lib/components/Modal.svelte` | Block detail modal |
| `src/lib/components/Toast.svelte` | Notification toasts |
| `src/lib/canvas/halftone.ts` | Halftone rendering |
| `src/lib/canvas/effects.ts` | Dissolution/materialization |
| `src/lib/stores/context.ts` | Context state store |
| `src/lib/stores/selection.ts` | Selection state |
| `src/lib/stores/ui.ts` | UI state (modals, toasts) |
| `src/lib/types.ts` | TypeScript interfaces |
| `src/lib/mock-data.ts` | Demo data generator |

---

## Implementation Steps

### Step 1: Project Setup (~10k context)

1. Initialize Tauri v2 + Svelte 5 project
2. Configure Tailwind CSS
3. Set up TypeScript
4. Create basic app shell that launches
5. Verify `pnpm tauri dev` works

### Step 2: Layout & Core Components (~20k context)

1. Create main layout (header, sidebar, main area)
2. Build TokenBudgetBar component
3. Build Zone components (primacy, middle, recency)
4. Build ContextBlock component
5. Build Sidebar with sections
6. Wire up mock data

### Step 3: Interactions (~15k context)

1. Implement selection (click, shift+click, select all)
2. Implement drag-and-drop between zones
3. Implement trash zone
4. Implement keyboard shortcuts
5. Implement modal for block details
6. Implement toast notifications

### Step 4: Canvas Effects Layer (~15k context)

1. Set up Canvas overlay system
2. Implement halftone dot rendering
3. Implement dithered gradients for budget bar
4. Implement dissolution animation
5. Implement materialization animation
6. Implement compression visual feedback

### Step 5: Polish & Theming (~10k context)

1. Refine all animations and transitions
2. Ensure dark theme is consistent
3. Add hover states, focus states
4. Test keyboard navigation
5. Performance optimization

---

## Visual Reference

From `APERTURE.md` Aesthetic Direction:

- **Token budget bar**: Dithered gradient, dissolves from solid to scattered dots as limit approaches
- **Block heat**: Dot density = usage heat, dot color = position relevance
- **Compression**: Blocks visually "dissolve" — original=solid, minimal=almost gone
- **Zone borders**: Stippled/dithered lines
- **Colors**: Teal (primacy), yellow (middle), pink (recency)

---

## Success Criteria

- [ ] `pnpm tauri dev` launches the app
- [ ] All core components render correctly
- [ ] Mock data displays in zones
- [ ] Selection works (click, shift+click, keyboard)
- [ ] Drag-and-drop works between zones and to trash
- [ ] Animations are smooth (60fps)
- [ ] Halftone effects render correctly
- [ ] Dark theme is consistent throughout
- [ ] Keyboard shortcuts work
- [ ] `make check` passes

---

## Implementation Progress

*Updated: 2026-02-04*

### Step 1: Project Setup (COMPLETE)
- [x] Initialize Tauri v2 + Svelte 5 project
- [x] Configure Tailwind CSS (via @tailwindcss/vite)
- [x] TypeScript configured
- [x] Rust dependencies (axum, tokio, tiktoken-rs, etc.)
- [x] Basic UI shell renders
- [ ] Verify full `npm run tauri dev` workflow (first build is slow, needs test)

### Step 2: Layout & Components (PARTIAL)
- [x] Main layout structure (header, sidebar, main area)
- [x] TokenBudgetBar (basic, with animated fill)
- [ ] Zone components (primacy, middle, recency) — placeholder only
- [ ] ContextBlock component
- [x] Sidebar (sections, filters, shortcuts)

### Step 3: Interactions
- [ ] Selection (click, shift+click, select all)
- [ ] Drag-and-drop between zones
- [ ] Keyboard shortcuts
- [ ] Modal for block details
- [ ] Toasts

### Step 4: Canvas Effects
- [ ] Canvas overlay system
- [ ] Halftone rendering
- [ ] Dissolution/materialization
- [ ] Compression visual

### Step 5: Polish
- [ ] Animation refinement
- [ ] Theme consistency
- [ ] Performance

---

## Pre-Phase 0: Proxy Validation (NEXT)

Before continuing UI work, validate the proxy architecture:
- [ ] Write minimal axum proxy in `src-tauri/src/proxy/`
- [ ] Test with `ANTHROPIC_BASE_URL=http://localhost:5400`
- [ ] Confirm SSE streaming works (request flows through, response streams back)
- [ ] Log intercepted requests to verify capture works

---

## Notes

- The HTML prototype (`reference/context-forge-prototype.html`) has working CSS that can be adapted
- Svelte 5 uses "runes" (`$state`, `$derived`, `$effect`) — different from Svelte 4
- Canvas layer sits behind/over DOM elements for per-pixel effects
- Consider `svelte-dnd-action` for drag-and-drop
