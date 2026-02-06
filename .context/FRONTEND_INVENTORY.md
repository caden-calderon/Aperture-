# Frontend Inventory

> **Purpose**: Comprehensive list of all Phase 0 UI features, stores, Tauri commands, and what needs backend integration.
> **Last Updated**: 2026-02-06

---

## Components (16 total)

| Component | Location | Purpose | Backend Needs |
|-----------|----------|---------|---------------|
| `TitleBar` | `components/TitleBar.svelte` | Custom Tauri window title bar (−, □, ×) | None (Tauri native) |
| `TokenBudgetBar` | `components/TokenBudgetBar.svelte` | Token usage bar with canvas halftone | Real token counts from proxy |
| `Zone` | `components/Zone.svelte` | Collapsible zone container, resize handle with grip pill, drag-drop | Block data from context engine |
| `ContextBlock` | `components/ContextBlock.svelte` | Individual block with per-block collapse, content expand, compact drag ghost | Block data, compression levels |
| `Modal` | `components/Modal.svelte` | Block detail view/edit with role dropdown, zone selector, expandable content | Block CRUD operations |
| `Toast` | `components/Toast.svelte` | Notification system with auto-dismiss | Event stream from proxy |
| `CommandPalette` | `components/CommandPalette.svelte` | Ctrl+K quick actions (28 commands across 6 categories) | Command execution |
| `SearchBar` | `components/SearchBar.svelte` | Context search (Ctrl+F) with regex, case-sensitive, zone/type filters | None (client-side filtering) |
| `ThemeToggle` | `components/ThemeToggle.svelte` | Dark/light mode toggle (sun/moon icons) | None (client-side) |
| `ThemeCustomizer` | `components/ThemeCustomizer.svelte` | Full theme editor with 13 presets, 18 color pickers, custom save/delete | None (client-side) |
| `DensityControl` | `components/DensityControl.svelte` | UI density slider (75%-125%) | None (client-side) |
| `BlockTypeManager` | `components/BlockTypeManager.svelte` | Custom block types CRUD in sidebar | Persist to config |
| `ZoneManager` | `components/ZoneManager.svelte` | Custom zones CRUD with drag reorder in sidebar | Persist to config |
| `CanvasOverlay` | `components/CanvasOverlay.svelte` | Canvas effects layer (halftone, dissolution) | None (visual only) |
| `Terminal` | `components/Terminal.svelte` | xterm.js wrapper — PTY spawn, resize, theme sync, reconnect | **Uses Tauri IPC** |
| `TerminalPanel` | `components/TerminalPanel.svelte` | Terminal chrome — collapsed/expanded bar, clear/position/close | None (wraps Terminal) |

All component paths are relative to `src/lib/`.

---

## Stores (8 total)

| Store | Location | Purpose | Backend Needs |
|-------|----------|---------|---------------|
| `contextStore` | `stores/context.svelte.ts` | Blocks, snapshots, CRUD, persistence | **PRIMARY** — Proxy data feed, replace mock data |
| `selectionStore` | `stores/selection.svelte.ts` | Multi-select state, shift/ctrl-click | None (UI only) |
| `uiStore` | `stores/ui.svelte.ts` | Modals, toasts, drag, sidebar, context panel collapse, density | None (UI only) |
| `themeStore` | `stores/theme.svelte.ts` | 13 presets, 18 color keys, custom themes, xterm theme mapping | Persist to user config |
| `blockTypesStore` | `stores/blockTypes.svelte.ts` | Built-in + custom block types | Persist to user config |
| `zonesStore` | `stores/zones.svelte.ts` | Built-in + custom zones, heights, expand states, schema v3 | Persist to user config |
| `searchStore` | `stores/search.svelte.ts` | Search query, filters, match navigation | None (client-side) |
| `terminalStore` | `stores/terminal.svelte.ts` | Terminal session, visibility, size, position, collapse tracking | None (uses Tauri IPC directly) |

All store paths are relative to `src/lib/`.

---

## Tauri IPC Commands (6 total)

| Command | Module | Purpose | Called From |
|---------|--------|---------|-------------|
| `get_proxy_address` | `lib.rs` | Get proxy server address | Future proxy UI |
| `is_proxy_running` | `lib.rs` | Check proxy health | Future proxy UI |
| `spawn_shell` | `terminal/mod.rs` | Spawn PTY shell, returns session ID | `Terminal.svelte` |
| `send_input` | `terminal/mod.rs` | Write data to PTY stdin | `Terminal.svelte` |
| `resize_terminal` | `terminal/mod.rs` | Resize PTY (cols × rows) | `Terminal.svelte` |
| `kill_session` | `terminal/mod.rs` | Kill PTY session, cleanup | `Terminal.svelte`, `+page.svelte` |

### Tauri Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `terminal:output` | Rust → Frontend | `[sessionId, data]` | PTY stdout/stderr stream |
| `terminal:exit` | Rust → Frontend | `sessionId` | PTY process exit notification |

---

## Data Types (from `src/lib/types.ts`)

### Block
```typescript
interface Block {
  id: string;
  role: Role;                    // system | user | assistant | tool_use | tool_result
  blockType?: string;            // Custom type ID (display), falls back to role
  content: string;
  tokens: number;
  timestamp: Date;
  zone: Zone;                    // primacy | middle | recency | custom string
  pinned: PinPosition | null;    // top | bottom | null
  compressionLevel: CompressionLevel;  // original | trimmed | summarized | minimal
  compressedVersions: CompressionVersions;
  usageHeat: number;             // 0-1
  positionRelevance: number;     // 0-1
  lastReferencedTurn: number;
  referenceCount: number;
  topicCluster: string | null;
  topicKeywords: string[];
  metadata: BlockMetadata;       // provider, turnIndex, toolName?, filePaths
}
```

### Zone Config (from `zonesStore`)
- Built-in: `primacy`, `middle`, `recency`
- Custom: `zone-{timestamp}` IDs
- Each has: `id`, `label`, `color`, `contextOrder`, `displayOrder`, `isBuiltIn`
- Built-in overrides: label and color can be customized, reset to defaults

### Compression Levels
- `original`: Full content (always preserved)
- `trimmed`: Whitespace/formatting removed
- `summarized`: LLM-generated summary
- `minimal`: Key points only

---

## Keyboard Shortcuts

| Key | Action | Scope |
|-----|--------|-------|
| `Ctrl+T` | Toggle terminal (show/focus/hide) | Global |
| `Ctrl+F` | Toggle search bar | Global |
| `Ctrl+K` | Command palette | Global |
| `Ctrl+[` | Toggle sidebar | Global |
| `A` | Select all blocks | When not in input |
| `Esc` | Deselect / close search | When not in input |
| `Del/Backspace` | Remove selected blocks | When not in input |
| `S` | Save snapshot | When not in input |
| `F3` | Next search match | When search open |
| `Shift+F3` | Previous search match | When search open |

---

## Command Palette Commands (28 total)

| Category | Commands |
|----------|----------|
| **View** (7) | Toggle sidebar, Toggle context panel, Expand/collapse all zones, Toggle primacy/middle/recency |
| **Search** (4) | Search context, Next/previous match, Select all results |
| **Selection** (2) | Select all, Deselect all |
| **Edit** (9) | Remove selected, Pin top/bottom, Unpin, Compress trimmed/summarized, Move to primacy/middle/recency |
| **Terminal** (4) | Toggle terminal, Position bottom/right, Clear |
| **Data** (3) | Save snapshot, Load demo data, Clear all blocks |

---

## localStorage Keys (14 total)

| Key | Store | Data |
|-----|-------|------|
| `aperture-context` | contextStore | All blocks + snapshots |
| `aperture-theme` | themeStore | Current preset ID + custom color overrides |
| `aperture-custom-presets` | themeStore | User-saved custom themes |
| `aperture-custom-block-types` | blockTypesStore | Custom block type definitions |
| `aperture-custom-zones` | zonesStore | Zones config, heights, expand states (schema v3) |
| `aperture-density` | uiStore | UI density scale (0.75-1.25) |
| `aperture-sidebar-width` | uiStore | Sidebar width in pixels |
| `aperture-sidebar-collapsed` | uiStore | Sidebar collapsed boolean |
| `aperture-sidebar-width-before-collapse` | uiStore | Pre-collapse sidebar width for restore |
| `aperture-context-panel-collapsed` | uiStore | Context panel collapsed boolean |
| `aperture-terminal-height` | terminalStore | Terminal panel height (bottom mode) |
| `aperture-terminal-width` | terminalStore | Terminal panel width (right mode) |
| `aperture-terminal-visible` | terminalStore | Terminal visibility boolean |
| `aperture-terminal-position` | terminalStore | Terminal position: `bottom` or `right` |

---

## Layout Architecture

### Main Layout (`+page.svelte`)
```
┌─────────────────────────────────────────────┐
│ TitleBar (custom Tauri, draggable)          │
├─────────────────────────────────────────────┤
│ Header (TokenBudgetBar + ThemeToggle + btns)│
├────┬──┬─────────────────────────────────────┤
│    │  │ Content Area                        │
│ S  │R │ ┌─────────────────────────────────┐ │
│ i  │e │ │ Toolbar (selection info + btns) │ │
│ d  │s │ │ SearchBar (Ctrl+F)             │ │
│ e  │i │ │ Zones (scrollable)             │ │
│ b  │z │ │   Zone (header + blocks + grip)│ │
│ a  │e │ │   Zone ...                     │ │
│ r  │  │ └─────────────────────────────────┘ │
│    │H │ ── Terminal Split Handle ──          │
│    │a │ ┌─────────────────────────────────┐ │
│    │n │ │ TerminalPanel (header + xterm)  │ │
│    │d │ └─────────────────────────────────┘ │
│    │l │                                     │
├────┴──┴─────────────────────────────────────┤
```

### Collapsible Panels
- **Sidebar**: Snap-to-collapse at <90px → 36px icon bar. Toggle via Ctrl+[ or handle button.
- **Context panel**: Collapses to thin bar (icon + "Context" + block count). Auto-collapses when terminal eats space (<120px remaining). Auto-un-collapses when terminal freed ≥120px.
- **Terminal**: Snap-to-collapse at <120px height / <180px width → 28px bar with `>_` icon. Toggle via handle button or Ctrl+T.
- **Zones**: Collapse via header click or grip pill button on resize handle.

### Resize Handles
All resize handles use rAF + direct DOM during drag, commit to store on mouseup.
- **Sidebar**: Vertical 4px handle, `‹`/`›` button (16×32px)
- **Zones**: Horizontal 16px handle, grip pill morphs from line → zone-colored pill with `▾` chevron
- **Terminal**: 4px handle (horizontal or vertical), `▾`/`▴` or `›`/`‹` button (32×16px / 16×32px)

---

## Backend Integration Points

### Phase 1: Proxy Core
| UI Feature | Backend Hook | Notes |
|------------|--------------|-------|
| TokenBudgetBar | `proxy.getTokenUsage()` | Real-time token counts |
| Block list | `proxy.onMessage()` | Stream new blocks as they arrive via SSE |
| Toast notifications | `proxy.onEvent()` | Errors, warnings, status changes |
| Terminal | Already integrated | PTY via Tauri IPC, no proxy needed |

### Phase 2: Context Engine
| UI Feature | Backend Hook | Notes |
|------------|--------------|-------|
| Zone assignment | `engine.assignZone(blockId, zone)` | Auto or manual placement |
| Block CRUD | `engine.createBlock()`, `updateBlock()`, `deleteBlock()` | Replace localStorage |
| Pinning | `engine.pinBlock(blockId, position)` | Top/bottom within zone |
| Reordering | `engine.reorderBlocks(zone, blockIds, insertIndex)` | Within-zone drag |
| Token counting | `engine.countTokens(content)` | tiktoken-rs for accuracy |
| Snapshots | `engine.saveSnapshot()`, `restoreSnapshot()` | Persist to disk |

### Phase 3: Compression
| UI Feature | Backend Hook | Notes |
|------------|--------------|-------|
| Compression slider | `engine.compress(blockId, level)` | Non-destructive, cached |
| Compressed versions | `engine.getCompressedVersion(blockId, level)` | LLM-generated for summarized/minimal |
| Batch compression | `engine.compressZone(zone, level)` | Apply to all blocks in zone |

### Phase 4+: Advanced Features
| UI Feature | Backend Hook | Notes |
|------------|--------------|-------|
| Heat visualization | `engine.getUsageHeat(blockId)` | Updated per conversation turn |
| Topic clusters | `engine.getTopicClusters()` | ML-based clustering |
| Search | `engine.search(query, options)` | Full-text + semantic search |

---

## Current Mock Data

Location: `src/lib/mock-data.ts`

Generates:
- 4 system prompts (primacy, 1 pinned top)
- 10 user messages (distributed across zones)
- 10 assistant responses
- 10 tool use/result pairs
- 5 blocks in recency zone

Used until proxy integration in Phase 1. `contextStore.init()` loads from localStorage, falls back to mock data if empty.

---

## CSS Design System

### Fonts
- Headers/Labels: `IBM Plex Mono` (`--font-display`)
- Code/Data: `JetBrains Mono` (`--font-mono`)

### Color Variables (18 theme keys)
- **Background** (5): `--bg-base`, `--bg-surface`, `--bg-elevated`, `--bg-hover`, `--bg-muted`
- **Border** (2): `--border-subtle`, `--border-default`
- **Text** (3): `--text-primary`, `--text-secondary`, `--text-muted`
- **Accent** (1): `--accent`
- **Roles** (4): `--role-system`, `--role-user`, `--role-assistant`, `--role-tool`
- **Semantic** (3): `--semantic-danger`, `--semantic-warning`, `--semantic-success`

### Additional CSS Variables
- `--bg-inset` — Recessed areas (resize handles, etc.)
- `--accent-subtle` — Faint accent for active states
- `--border-strong` — Hover borders
- `--text-faint` — Very low contrast text
- `--density-scale` — UI density multiplier (0.75-1.25)
- `--zone-color` — Per-zone dynamic color (set via inline style)

### Theme Presets (13)
**Dark** (8): Charcoal, Tokyo Night, Gruvbox, Catppuccin, Nord, Dracula, One Dark, Solarized
**Light** (5): Warm, Gruvbox Light, Tokyo Light, Sepia, Solarized Light
