<script lang="ts">
  import type { Block, Zone as ZoneType } from "$lib/types";
  import ContextBlock from "./ContextBlock.svelte";

  interface Props {
    zone: ZoneType;
    blocks: Block[];
    collapsed?: boolean;
    selectedIds?: Set<string>;
    draggingBlockId?: string | null;
    onToggleCollapse?: () => void;
    onBlockSelect?: (id: string, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void;
    onBlockDoubleClick?: (id: string) => void;
    onBlockDragStart?: (id: string) => void;
    onBlockDragEnd?: () => void;
    onDrop?: (zone: ZoneType, blockId: string) => void;
  }

  let {
    zone,
    blocks,
    collapsed = false,
    selectedIds = new Set<string>(),
    draggingBlockId = null,
    onToggleCollapse,
    onBlockSelect,
    onBlockDoubleClick,
    onBlockDragStart,
    onBlockDragEnd,
    onDrop,
  }: Props = $props();

  let isDragOver = $state(false);

  const zoneConfig: Record<ZoneType, { label: string; color: string; description: string }> = {
    primacy: {
      label: "Primacy",
      color: "var(--zone-primacy)",
      description: "High priority, always included",
    },
    middle: {
      label: "Middle",
      color: "var(--zone-middle)",
      description: "Standard context, compressed as needed",
    },
    recency: {
      label: "Recency",
      color: "var(--zone-recency)",
      description: "Recent context, high position relevance",
    },
  };

  const config = $derived(zoneConfig[zone]);
  let totalTokens = $derived(blocks.reduce((sum, b) => sum + b.tokens, 0));
  let selectedInZone = $derived(blocks.filter((b) => selectedIds.has(b.id)));

  function formatTokens(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toString();
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    isDragOver = true;
  }

  function handleDragLeave() {
    isDragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
    const blockId = e.dataTransfer?.getData("text/plain");
    if (blockId && onDrop) onDrop(zone, blockId);
  }
</script>

<section
  class="zone"
  class:collapsed
  class:drag-over={isDragOver && draggingBlockId !== null}
  style:--zone-color={config.color}
  aria-label="{config.label} zone"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <button
    class="zone-header"
    onclick={onToggleCollapse}
    aria-expanded={!collapsed}
    title={config.description}
  >
    <div class="zone-info">
      <span class="zone-indicator"></span>
      <span class="zone-label">{config.label}</span>
      <span class="zone-stats">
        {blocks.length} blocks · {formatTokens(totalTokens)} tokens
        {#if selectedInZone.length > 0}
          · <span class="selected-stat">{selectedInZone.length} selected</span>
        {/if}
      </span>
    </div>
    <span class="collapse-icon">{collapsed ? "+" : "−"}</span>
  </button>

  {#if !collapsed}
    <div class="zone-content">
      {#if blocks.length === 0}
        <div class="zone-empty">Drop blocks here</div>
      {:else}
        {#each blocks as block (block.id)}
          <ContextBlock
            {block}
            selected={selectedIds.has(block.id)}
            dragging={draggingBlockId === block.id}
            onSelect={onBlockSelect}
            onDoubleClick={onBlockDoubleClick}
            onDragStart={onBlockDragStart}
            onDragEnd={onBlockDragEnd}
          />
        {/each}
      {/if}
    </div>
  {/if}

  {#if isDragOver && draggingBlockId !== null}
    <div class="drop-indicator">
      <span>Drop to move to {config.label}</span>
    </div>
  {/if}
</section>

<style>
  .zone {
    position: relative;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
    overflow: hidden;
  }

  .zone::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--zone-color);
  }

  .zone.drag-over {
    border-color: var(--zone-color);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--zone-color) 20%, transparent);
  }

  .zone-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px 8px 14px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text-primary);
    transition: background 0.1s ease;
  }

  .zone-header:hover {
    background: var(--bg-hover);
  }

  .zone-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .zone-indicator {
    width: 6px;
    height: 6px;
    border-radius: 1px;
    background: var(--zone-color);
  }

  .zone-label {
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .zone-stats {
    font-size: 11px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .selected-stat {
    color: var(--zone-color);
    font-weight: 500;
  }

  .collapse-icon {
    font-size: 12px;
    color: var(--text-muted);
    width: 16px;
    text-align: center;
    opacity: 0.6;
  }

  .zone-header:hover .collapse-icon {
    opacity: 1;
  }

  .zone-content {
    padding: calc(4px * var(--density-scale, 1)) calc(10px * var(--density-scale, 1)) calc(10px * var(--density-scale, 1)) 12px;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: calc(4px * var(--density-scale, 1));
    animation: zone-expand 0.15s ease-out;
  }

  @keyframes zone-expand {
    0% {
      opacity: 0;
      transform: translateY(-4px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .zone-empty {
    padding: var(--space-md);
    text-align: center;
    border: 1px dashed var(--border-default);
    border-radius: 4px;
    color: var(--text-faint);
    font-size: 11px;
    margin: 4px 0;
  }

  .drop-indicator {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--zone-color) 10%, var(--bg-base) 80%);
    border-radius: 6px;
    pointer-events: none;
    z-index: 10;
    backdrop-filter: blur(2px);
  }

  .drop-indicator span {
    font-size: 11px;
    font-weight: 500;
    color: var(--bg-surface);
    padding: 6px 12px;
    background: var(--zone-color);
    border-radius: 4px;
  }
</style>
