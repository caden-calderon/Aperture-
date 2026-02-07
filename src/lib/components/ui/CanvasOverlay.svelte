<script lang="ts">
  import { onMount } from 'svelte';
  import { drawHalftonePattern, drawHeatOverlay } from '$lib/canvas';

  // Props
  interface Props {
    width?: number;
    height?: number;
    density?: number;
    heat?: number;
    color?: string;
    mode?: 'halftone' | 'heat' | 'custom';
    class?: string;
  }

  let {
    width = 100,
    height = 100,
    density = 0.5,
    heat = 0,
    color = 'var(--accent-primary)',
    mode = 'halftone',
    class: className = '',
  }: Props = $props();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;

  // Resolve CSS variable to actual color
  function resolveCSSColor(cssColor: string): string {
    if (!cssColor.startsWith('var(')) return cssColor;

    // Extract variable name
    const varName = cssColor.slice(4, -1).trim();
    const computed = getComputedStyle(document.documentElement).getPropertyValue(varName);
    return computed.trim() || '#e8dcc4';
  }

  function render() {
    if (!ctx || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = width * dpr;
    const h = height * dpr;

    // Set canvas size accounting for device pixel ratio
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const resolvedColor = resolveCSSColor(color);

    switch (mode) {
      case 'halftone':
        drawHalftonePattern(ctx, width, height, density, {
          color: resolvedColor,
          opacity: 0.6,
        });
        break;

      case 'heat':
        drawHeatOverlay(ctx, width, height, heat, {
          color: resolvedColor,
        });
        break;

      case 'custom':
        // For custom rendering, emit the context
        break;
    }
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    render();
  });

  // Re-render when props change
  $effect(() => {
    // Touch reactive props to track them
    void width;
    void height;
    void density;
    void heat;
    void color;
    void mode;

    render();
  });
</script>

<canvas
  bind:this={canvas}
  class="canvas-overlay {className}"
  aria-hidden="true"
></canvas>

<style>
  .canvas-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }
</style>
