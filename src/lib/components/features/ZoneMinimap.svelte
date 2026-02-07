<script lang="ts">
  /**
   * ZoneMinimap — Horizontal bar showing zone proportions.
   * Zone-colored segments left→right in display order,
   * proportional to token counts. Click to scroll.
   */
  import { contextStore, zonesStore, uiStore } from "$lib/stores";
  import type { Zone as ZoneType, Block } from "$lib/types";

  interface Props {
    /** Reference to the scrollable zones container */
    zonesContainer?: HTMLElement | null;
    onDrop?: (zone: ZoneType, blockIds: string[]) => void;
  }

  let { zonesContainer = null, onDrop }: Props = $props();

  let hoveredZone = $state<string | null>(null);
  let dropTargetZone = $state<string | null>(null);

  // Compute zone data: block counts, token totals, proportions
  const zoneData = $derived.by(() => {
    const zones = zonesStore.zonesByDisplayOrder;
    const totalTokens = contextStore.tokenBudget.used || 1;

    return zones.map((z) => {
      const blocks = contextStore.blocksByZone[z.id] ?? [];
      const tokens = blocks.reduce((sum: number, b: Block) => sum + b.tokens, 0);
      const pct = (tokens / totalTokens) * 100;

      return {
        id: z.id,
        label: z.label,
        color: z.color,
        blockCount: blocks.length,
        tokens,
        pct,
        collapsed: uiStore.isZoneCollapsed(z.id),
      };
    });
  });

  // Normalize to total 100%
  const normalizedZones = $derived.by(() => {
    const total = zoneData.reduce((sum, z) => sum + z.pct, 0);
    if (total === 0) return zoneData.map((z) => ({ ...z, normalizedPct: 100 / zoneData.length }));
    return zoneData.map((z) => ({
      ...z,
      normalizedPct: (z.pct / total) * 100,
    }));
  });

  function formatTokens(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toString();
  }

  /**
   * Click handler: scroll the zones container so the clicked position within
   * the segment maps to the equivalent scroll position in the container.
   */
  function handleSegmentClick(e: MouseEvent, zoneId: string) {
    // Un-collapse if needed
    if (uiStore.isZoneCollapsed(zoneId)) {
      uiStore.toggleZoneCollapse(zoneId);
    }

    if (!zonesContainer) return;

    // Find the zone element in the DOM
    const zoneConfig = zonesStore.getZoneById(zoneId);
    const zoneEl = zonesContainer.querySelector(
      `[aria-label="${zoneConfig?.label ?? zoneId} zone"]`
    ) as HTMLElement | null;
    if (!zoneEl) return;

    // Get the click position within the segment (0-1 ratio, horizontal)
    const segmentEl = (e.currentTarget as HTMLElement);
    const rect = segmentEl.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    // Map that ratio to a position within the zone element
    const zoneTop = zoneEl.offsetTop;
    const zoneHeight = zoneEl.offsetHeight;
    const targetScrollTop = zoneTop + (clickRatio * zoneHeight) - (zonesContainer.clientHeight / 3);

    zonesContainer.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });
  }

  function handleDragEnter(e: DragEvent, zoneId: string) {
    e.preventDefault();
    dropTargetZone = zoneId;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  function handleDragLeave(e: DragEvent, zoneId: string) {
    e.preventDefault();
    if (dropTargetZone === zoneId) dropTargetZone = null;
  }

  function handleDrop(e: DragEvent, zoneId: string) {
    e.preventDefault();
    dropTargetZone = null;
    const data = e.dataTransfer?.getData("text/plain");
    if (data && onDrop) {
      try {
        const blockIds: string[] = JSON.parse(data);
        if (Array.isArray(blockIds)) {
          onDrop(zoneId as ZoneType, blockIds);
        } else {
          onDrop(zoneId as ZoneType, [data]);
        }
      } catch {
        onDrop(zoneId as ZoneType, [data]);
      }
    }
  }
</script>

<div class="minimap-bar" role="navigation" aria-label="Zone minimap">
  <!-- Toggle button -->
  <button
    class="minimap-toggle"
    title="Hide minimap"
    onclick={() => uiStore.toggleMinimap()}
  >
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <rect x="1" y="2" width="3" height="6" rx="0.5" />
      <rect x="5" y="1" width="4" height="8" rx="0.5" />
    </svg>
  </button>

  <!-- Zone segments -->
  <div class="minimap-track">
    {#each normalizedZones as zone (zone.id)}
      <div
        class="minimap-segment"
        class:collapsed={zone.collapsed}
        class:drop-target={dropTargetZone === zone.id}
        class:hovered={hoveredZone === zone.id}
        style:--zone-color={zone.color}
        style:flex-basis="{Math.max(zone.normalizedPct, 4)}%"
        role="button"
        tabindex="0"
        onclick={(e) => handleSegmentClick(e, zone.id)}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSegmentClick(e as unknown as MouseEvent, zone.id); } }}
        onmouseenter={() => hoveredZone = zone.id}
        onmouseleave={() => hoveredZone = null}
        ondragenter={(e) => handleDragEnter(e, zone.id)}
        ondragover={handleDragOver}
        ondragleave={(e) => handleDragLeave(e, zone.id)}
        ondrop={(e) => handleDrop(e, zone.id)}
        title="{zone.label}: {zone.blockCount} blocks · {formatTokens(zone.tokens)}"
      >
      </div>
    {/each}
  </div>
</div>

<style>
  .minimap-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: 1000px;
    flex: 1;
    min-width: 60px;
    animation: minimap-slide-in 0.15s ease;
  }

  @keyframes minimap-slide-in {
    from { opacity: 0; max-width: 0; }
    to { opacity: 1; max-width: 1000px; }
  }

  .minimap-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    background: none;
    border: none;
    color: var(--text-faint);
    cursor: pointer;
    border-radius: 2px;
    flex-shrink: 0;
    transition: all 0.1s ease;
    opacity: 0;
  }

  .minimap-bar:hover .minimap-toggle {
    opacity: 1;
  }

  .minimap-toggle:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .minimap-track {
    flex: 1;
    height: 16px;
    display: flex;
    border-radius: 3px;
    overflow: hidden;
    background: var(--bg-inset);
    border: 1px solid var(--border-subtle);
    gap: 1px;
  }

  .minimap-segment {
    flex-grow: 1;
    min-width: 6px;
    cursor: pointer;
    background: color-mix(in srgb, var(--zone-color) 55%, transparent);
    transition: all 0.1s ease;
    position: relative;
  }

  .minimap-segment:first-child {
    border-radius: 2px 0 0 2px;
  }

  .minimap-segment:last-child {
    border-radius: 0 2px 2px 0;
  }

  .minimap-segment:hover {
    background: color-mix(in srgb, var(--zone-color) 80%, transparent);
    filter: brightness(1.15);
  }

  .minimap-segment.collapsed {
    opacity: 0.3;
  }

  .minimap-segment.drop-target {
    background: var(--zone-color);
    box-shadow: inset 0 0 0 1px var(--zone-color);
  }
</style>
