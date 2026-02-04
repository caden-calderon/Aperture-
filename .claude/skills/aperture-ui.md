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

## Color System (CSS Variables)

```css
:root {
  /* Base */
  --bg-primary: #0a0a0a;
  --bg-surface: #141414;
  --bg-elevated: #1a1a1a;
  --text-primary: #e0e0e0;
  --text-secondary: #888888;
  --text-muted: #555555;

  /* Zone Accents */
  --primacy: #00d4aa;      /* Teal — primacy zone, selection, active */
  --middle: #f0c040;       /* Yellow — middle zone, warnings */
  --recency: #ff6b9d;      /* Pink — recency zone */

  /* Heat Scale (dot density + color) */
  --heat-hot: #00d4aa;     /* Dense bright dots */
  --heat-warm: #88ccaa;
  --heat-cool: #666666;
  --heat-cold: #333333;    /* Sparse dim dots */

  /* Budget Bar Pressure */
  --pressure-calm: #00d4aa;
  --pressure-attention: #f0c040;
  --pressure-warning: #ff8c00;
  --pressure-urgent: #ff4444;
  --pressure-critical: #cc0000;

  /* Block Types */
  --block-system: #9b59b6;    /* Purple */
  --block-user: #3498db;      /* Blue */
  --block-assistant: #2ecc71; /* Green */
  --block-tool: #b8a9c9;      /* Lavender */
}
```

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
- 0-60%: Sparse dots, teal
- 60-80%: Denser dots, shifts yellow
- 80-90%: Dense, subtle pulse (~2s), orange
- 90-95%: Very dense, faster pulse (~1s), red-orange
- 95%+: Nearly solid, rapid pulse, red

### Block Heat
- **Hot blocks**: Dense bright teal dots
- **Cold blocks**: Sparse dim gray dots (literally fading away)
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
- **Click**: Instant teal border (no fade, decisive)
- **Hover**: Subtle 1px lift, shadow increase, dots intensify

### Toast Notifications
- Materialize from dots (bottom-right)
- Auto-dismiss 3s with dissolution

### Checkpoint Save
- Vertical teal flash line stamps through block list
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
