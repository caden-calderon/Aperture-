---
name: aperture-ui
description: Aperture UI design system. Activates when building ANY UI component, page, or visual element. Enforces the halftone/dithering aesthetic, typography, animations, and the core principle that density = meaning. Combines general frontend excellence with Aperture's specific vision.
---

# Aperture UI Design System

Aperture is a context visualization tool for LLM workflows. Its aesthetic is **Obra Dinn meets IDE** — halftone dithering as functional data visualization, not decoration.

## Core Principle: Density = Meaning

Every visual property communicates data. Nothing is decorative.

- **Dot density** = usage heat (how often referenced)
- **Block height** = token cost
- **Dot color** = position relevance
- **Dissolution level** = compression state
- **Border style** = selection state

If it's visible, it encodes information.

---

## Design Thinking (Before Coding)

1. **Purpose**: What does this component visualize? What data does it encode?
2. **Tone**: Industrial, utilitarian, precise. Think: terminal meets newspaper print.
3. **Differentiation**: What makes this memorable? The dithering IS the data.
4. **No generic aesthetics**: If you're reaching for a standard card layout or gradient, stop and rethink.

---

## Color System (Theme Customizer)

**User-customizable themes with 13 built-in presets.**

### Built-in Presets
**Dark:** Charcoal, Tokyo Night, Gruvbox, Catppuccin, Nord, Dracula, One Dark, Solarized
**Light:** Warm, Gruvbox Light, Tokyo Light, Sepia, Solarized Light

### Theme Store API (`$lib/stores/theme.svelte`)
```typescript
import { themeStore } from '$lib/stores';

// Switch preset
themeStore.setPreset('tokyo-night');

// Customize individual color
themeStore.setColor('bgBase', '#1a1b26');

// Get current colors
const colors = themeStore.effectiveColors;

// Save custom theme
themeStore.saveCurrentAsPreset('My Theme');

// Check mode
if (themeStore.isDark) { ... }
```

### CSS Variables (set by theme store)
```css
--bg-base, --bg-surface, --bg-elevated, --bg-hover, --bg-muted, --bg-inset
--border-subtle, --border-default, --border-strong
--text-primary, --text-secondary, --text-muted, --text-faint
--accent, --accent-subtle, --accent-muted
```

### Components
- `ThemeCustomizer` — Sidebar panel with presets and color pickers
- `ThemeToggle` — Quick dark/light toggle button
- `TitleBar` — Custom window title bar (Tauri `decorations: false`)
- `DensityControl` — UI scale slider (75%-125%)

All themes persist to localStorage.

---

## Typography

| Use | Font | Rationale |
|-----|------|-----------|
| Code, data, metrics | JetBrains Mono | Raw terminal feel |
| Headers, labels | IBM Plex Mono | Clean contrast against dithering |
| Pixel art elements | Bitmap pixel font | Block type icons, status indicators |

**BANNED FONTS** (generic AI slop):
- Inter, Roboto, Arial, Open Sans, system fonts
- Space Grotesk, Geist, or any trendy sans-serif

---

## Halftone / Dithering Visual Language

### Token Budget Bar
Dithered gradient. Tension increases with fill:
- 0-60%: Sparse dots, warm gold
- 60-80%: Denser dots, shifts ochre
- 80-90%: Dense, subtle pulse (~2s), rust
- 90-95%: Very dense, faster pulse (~1s), burnt sienna
- 95%+: Nearly solid, rapid pulse, deep rust

### Block Heat
- **Hot blocks**: Dense bright cream dots
- **Cold blocks**: Sparse dim charcoal dots (literally fading away)
- Heat transitions smoothly (~500ms) on data updates

### Compression Indicator
Blocks visually dissolve as compression increases:
- Original = solid
- Trimmed = slight dither
- Summarized = heavy dither
- Minimal = barely there, scattered dots

### Zone Borders
Stippled/dithered lines, not solid borders.

### Backgrounds
Subtle halftone patterns, noise grain on surfaces.

---

## Animation Timings

### Block Appearing (Materialize)
- Duration: 200–300ms
- Effect: Scattered halftone dots consolidate to solid
- Feel: Like a fax printing in

### Block Removing (Dissolution)
- Duration: 250ms
- Effect: Dissolve into scattered dots and fade
- Feel: Information literally scattering

### Compression (Slider)
- Continuous, real-time
- Text blurs/fades, height shrinks, halftone thins
- Feel: Like adjusting opacity in Photoshop

### Zone Movement
- Spring physics with slight overshoot and settle
- Leaving zone dims, entering zone glows
- Feel: Physical weight

### Heat Transitions
- Duration: ~500ms smooth
- On data update events, not per-frame
- Blocks densify or thin as relevance changes

### Selection
- **Click**: Instant cream border (no fade, decisive)
- **Hover**: Subtle 1px lift, shadow increase, dots intensify

### Toast Notifications
- Materialize from dots (bottom-right)
- Auto-dismiss 3s with dissolution

### Checkpoint Save
- Vertical cream flash line stamps through block list
- Fades to persistent marker

---

## Svelte 5 Implementation

### Component Structure
```svelte
<script lang="ts">
  // 1. Imports
  import { onMount } from 'svelte';

  // 2. Props (runes)
  let { blocks = $bindable([]), onSelect }: Props = $props();

  // 3. State
  let selectedIds = $state(new Set<string>());

  // 4. Derived
  let selectedCount = $derived(selectedIds.size);

  // 5. Effects
  $effect(() => {
    console.log('Selection changed:', selectedCount);
  });

  // 6. Functions
  function handleClick(id: string) { ... }
</script>

<!-- Use Svelte transitions -->
<div class="block" transition:fade={{ duration: 250 }}>
  ...
</div>

<style>
  /* Custom CSS for dithering effects */
  .halftone {
    background-image: radial-gradient(circle, var(--dot-color) 1px, transparent 1px);
    background-size: var(--dot-spacing) var(--dot-spacing);
  }
</style>
```

### Rendering Strategy
- **Blocks**: DOM elements (accessibility, text selection, interaction)
- **Effects**: Canvas layer (halftone dots, heat maps, dissolution)
- **Layout**: Tailwind for spacing/flexbox
- **Visual effects**: Custom CSS + Canvas API

---

## Anti-Patterns (NEVER DO)

### Visual
- Solid color backgrounds with no texture
- Generic card layouts with rounded corners and drop shadows
- Purple/blue gradient hero sections
- Smooth linear animations with no physics
- Decorative icons that don't encode data

### Technical
- React-style useState/useEffect patterns (use Svelte runes)
- Heavy animation libraries when CSS/Svelte transitions work
- Over-complicated state management

### Aesthetic
- Any font from the banned list
- Cookie-cutter dashboard aesthetics
- "AI startup" visual language (gradients, blur, glass)

---

## Reference Files

- `APERTURE.md` — Full design doc, interaction specs, animation details
- `reference/context-forge-prototype.html` — Working HTML prototype
- `src/app.css` — Design system CSS variables

---

## Quick Checklist

Before submitting any UI code:

- [ ] Does every visual element encode data?
- [ ] Are fonts JetBrains Mono or IBM Plex Mono?
- [ ] Is dithering used for heat/compression/pressure?
- [ ] Are animations physical (spring, overshoot) not linear?
- [ ] Does it look NOTHING like a generic dashboard?
- [ ] Would someone remember this design?
