# Frontend Inventory

> **Purpose**: Comprehensive list of all Phase 0 UI features and what needs backend integration.
> **Last Updated**: 2026-02-04

---

## Components (14 total)

| Component | Location | Purpose | Backend Needs |
|-----------|----------|---------|---------------|
| `TitleBar` | `src/lib/components/TitleBar.svelte` | Custom Tauri window title bar | None (Tauri native) |
| `TokenBudgetBar` | `src/lib/components/TokenBudgetBar.svelte` | Token usage visualization | Real token counts from proxy |
| `Zone` | `src/lib/components/Zone.svelte` | Collapsible zone container | Block data from context engine |
| `ContextBlock` | `src/lib/components/ContextBlock.svelte` | Individual context block | Block data, compression levels |
| `Modal` | `src/lib/components/Modal.svelte` | Block detail view/edit | Block CRUD operations |
| `Toast` | `src/lib/components/Toast.svelte` | Notification system | Event stream from proxy |
| `CommandPalette` | `src/lib/components/CommandPalette.svelte` | Cmd+K quick actions | Command execution |
| `ThemeToggle` | `src/lib/components/ThemeToggle.svelte` | Dark/light mode toggle | None (client-side) |
| `ThemeCustomizer` | `src/lib/components/ThemeCustomizer.svelte` | Full theme editor | None (client-side) |
| `DensityControl` | `src/lib/components/DensityControl.svelte` | UI scale slider | None (client-side) |
| `BlockTypeManager` | `src/lib/components/BlockTypeManager.svelte` | Custom block types | Persist to config |
| `ZoneManager` | `src/lib/components/ZoneManager.svelte` | Custom zones CRUD | Persist to config |
| `CanvasOverlay` | `src/lib/components/CanvasOverlay.svelte` | Canvas effects layer | None (visual only) |

---

## Stores (6 total)

| Store | Location | Purpose | Backend Needs |
|-------|----------|---------|---------------|
| `contextStore` | `src/lib/stores/context.svelte.ts` | Block state, snapshots | **PRIMARY** — Proxy data feed |
| `selectionStore` | `src/lib/stores/selection.svelte.ts` | Selection state | None (UI only) |
| `uiStore` | `src/lib/stores/ui.svelte.ts` | Modals, toasts, drag state | None (UI only) |
| `themeStore` | `src/lib/stores/theme.svelte.ts` | Theme colors, presets | Persist to user config |
| `blockTypesStore` | `src/lib/stores/blockTypes.svelte.ts` | Custom block types | Persist to user config |
| `zonesStore` | `src/lib/stores/zones.svelte.ts` | Custom zones, heights | Persist to user config |

---

## Data Types

### Block (from `src/lib/types.ts`)
```typescript
interface Block {
  id: string;
  role: Role;  // system | user | assistant | tool_use | tool_result
  content: string;
  tokens: number;
  timestamp: Date;
  zone: Zone;
  pinned: 'top' | 'bottom' | null;
  compressionLevel: CompressionLevel;
  compressedVersions: Record<CompressionLevel, { content: string; tokens: number }>;
  usageHeat: number;  // 0-1, how often referenced
  positionRelevance: number;  // 0-1, position-based relevance
  lastReferencedTurn: number;
  referenceCount: number;
  topicCluster: string | null;
  topicKeywords: string[];
  metadata: BlockMetadata;
  blockType?: string;  // Custom type ID
}
```

### Zone Types
- Built-in: `primacy`, `middle`, `recency`
- Custom: User-defined with `zone-{timestamp}` IDs
- Each has: `label`, `color`, `contextOrder`, `displayOrder`

### Compression Levels
- `original`: Full content
- `trimmed`: Whitespace/formatting removed
- `summarized`: LLM-generated summary
- `minimal`: Key points only

---

## Backend Integration Points

### Phase 1: Proxy Core
| UI Feature | Backend Hook | Notes |
|------------|--------------|-------|
| TokenBudgetBar | `proxy.getTokenUsage()` | Real-time token counts |
| Block list | `proxy.onMessage()` | Stream new blocks as they arrive |
| Toast notifications | `proxy.onEvent()` | Errors, warnings, status |

### Phase 2: Context Engine
| UI Feature | Backend Hook | Notes |
|------------|--------------|-------|
| Zone assignment | `engine.assignZone(blockId, zone)` | Auto or manual |
| Block CRUD | `engine.createBlock()`, `engine.updateBlock()`, `engine.deleteBlock()` | |
| Pinning | `engine.pinBlock(blockId, position)` | |
| Reordering | `engine.reorderBlocks(zone, blockIds)` | Within-zone |
| Token counting | `engine.countTokens(content)` | tiktoken-rs |

### Phase 3: Compression
| UI Feature | Backend Hook | Notes |
|------------|--------------|-------|
| Compression slider | `engine.compress(blockId, level)` | |
| Compressed versions | `engine.getCompressedVersion(blockId, level)` | Cached |
| Batch compression | `engine.compressZone(zone, level)` | |

### Phase 4+: Advanced Features
| UI Feature | Backend Hook | Notes |
|------------|--------------|-------|
| Heat visualization | `engine.getUsageHeat(blockId)` | Updated per turn |
| Topic clusters | `engine.getTopicClusters()` | ML clustering |
| Snapshots | `engine.saveSnapshot()`, `engine.restoreSnapshot()` | |
| Search | `engine.search(query)` | Full-text + semantic |

---

## Current Mock Data

Location: `src/lib/mock-data.ts`

Generates:
- 1 system prompt (primacy, pinned top)
- 10 user messages
- 10 assistant responses
- 10 tool use/result pairs
- Distributed across zones

Used until proxy integration in Phase 1.

---

## Keyboard Shortcuts

| Key | Action | Handler Location |
|-----|--------|------------------|
| `A` | Select all | `+page.svelte` |
| `Esc` | Deselect | `+page.svelte` |
| `Del/Backspace` | Remove selected | `+page.svelte` |
| `S` | Save snapshot | `+page.svelte` |
| `Cmd+K` | Command palette | `+page.svelte` |

---

## localStorage Keys

| Key | Store | Data |
|-----|-------|------|
| `aperture-theme` | themeStore | Current theme ID + custom colors |
| `aperture-custom-presets` | themeStore | User-created themes |
| `aperture-density` | uiStore | UI density scale |
| `aperture-sidebar-width` | uiStore | Sidebar width in pixels |
| `aperture-custom-block-types` | blockTypesStore | Custom block type definitions |
| `aperture-custom-zones` | zonesStore | Custom zones + overrides + heights |

---

## Known Issues (to fix next session)

1. **Primacy/Recency zones don't resize** — Drag handle works visually but height doesn't change. Middle and custom zones resize correctly.
2. **Primacy/Recency always expanded** — No inner scroll appears, they grow with content. Middle and custom zones have correct inner scroll behavior.
3. **Likely same root cause** — Something specific to built-in primacy/recency zone handling vs middle/custom zones. Check if:
   - `zonesStore.getZoneHeight()` returns different values
   - `expanded` state defaults differently
   - CSS is being applied differently

---

## CSS Design System

### Fonts
- Headers/Labels: `IBM Plex Mono`
- Code/Data: `JetBrains Mono`

### Color Variables
- Background: `--bg-base`, `--bg-surface`, `--bg-elevated`, `--bg-hover`, `--bg-inset`
- Border: `--border-subtle`, `--border-default`, `--border-strong`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-faint`
- Accent: `--accent`, `--accent-subtle`
- Roles: `--role-system`, `--role-user`, `--role-assistant`, `--role-tool`
- Semantic: `--semantic-danger`, `--semantic-warning`, `--semantic-success`
- Zones: `--zone-primacy`, `--zone-middle`, `--zone-recency`

### Theme Presets (13)
**Dark**: Charcoal, Tokyo Night, Gruvbox, Catppuccin, Nord, Dracula, One Dark, Solarized
**Light**: Warm, Gruvbox Light, Tokyo Light, Sepia, Solarized Light
