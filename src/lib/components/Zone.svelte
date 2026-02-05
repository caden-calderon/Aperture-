<script lang="ts">
  import type { Block, Zone as ZoneType } from "$lib/types";
  import { contextStore, zonesStore } from "$lib/stores";
  import ContextBlock from "./ContextBlock.svelte";

  interface Props {
    zone: ZoneType;
    blocks: Block[];
    collapsed?: boolean;
    selectedIds?: Set<string>;
    draggingBlockIds?: string[];
    onToggleCollapse?: () => void;
    onBlockSelect?: (id: string, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void;
    onBlockDoubleClick?: (id: string) => void;
    onBlockDragStart?: (ids: string[]) => void;
    onBlockDragEnd?: () => void;
    onDrop?: (zone: ZoneType, blockIds: string[]) => void;
    onCreateBlock?: (zone: ZoneType, typeId: string) => void;
    onReorder?: (zone: ZoneType, blockIds: string[], insertIndex: number) => void;
  }

  let {
    zone,
    blocks,
    collapsed = false,
    selectedIds = new Set<string>(),
    draggingBlockIds = [],
    onToggleCollapse,
    onBlockSelect,
    onBlockDoubleClick,
    onBlockDragStart,
    onBlockDragEnd,
    onDrop,
    onCreateBlock,
    onReorder,
  }: Props = $props();

  let isDragOver = $state(false);
  let isTypeDropOver = $state(false);
  let dropInsertIndex = $state<number | null>(null);
  let zoneContentRef = $state<HTMLElement | null>(null);
  let dragEnterCount = $state(0); // Track nested drag enter/leave events

  // Get zone config from store (supports custom zones)
  const config = $derived.by(() => {
    const zoneInfo = zonesStore.getZoneById(zone);
    if (zoneInfo) {
      return {
        label: zoneInfo.label,
        color: zoneInfo.color,
        description: zoneInfo.isBuiltIn
          ? zone === "primacy"
            ? "High priority, always included"
            : zone === "recency"
              ? "Recent context, high position relevance"
              : "Standard context, compressed as needed"
          : "Custom zone",
      };
    }
    // Fallback for unknown zones
    return {
      label: zone,
      color: "var(--text-muted)",
      description: "Unknown zone",
    };
  });
  let totalTokens = $derived(blocks.reduce((sum, b) => sum + b.tokens, 0));
  let selectedInZone = $derived(blocks.filter((b) => selectedIds.has(b.id)));

  function formatTokens(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toString();
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    dragEnterCount++;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer) return;

    // Check if it's a block type being dragged from sidebar
    const hasBlockType = e.dataTransfer.types.includes('application/x-block-type');

    if (hasBlockType) {
      e.dataTransfer.dropEffect = "copy";
      isTypeDropOver = true;
      isDragOver = false;
      dropInsertIndex = null;
    } else {
      e.dataTransfer.dropEffect = "move";
      isDragOver = true;
      isTypeDropOver = false;

      // Calculate insertion index based on mouse position
      if (zoneContentRef && blocks.length > 0) {
        const blockElements = zoneContentRef.querySelectorAll('[data-block-id]');
        let insertIdx = blocks.length; // Default to end

        for (let i = 0; i < blockElements.length; i++) {
          const rect = blockElements[i].getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            insertIdx = i;
            break;
          }
        }

        // Clamp to valid range (respecting pinned blocks)
        const { min, max } = contextStore.getValidDropRange(zone);
        insertIdx = Math.max(min, Math.min(insertIdx, max));

        // Only update if changed to reduce re-renders
        if (dropInsertIndex !== insertIdx) {
          dropInsertIndex = insertIdx;
        }
      } else if (dropInsertIndex !== 0) {
        dropInsertIndex = 0;
      }
    }
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    dragEnterCount--;
    // Only reset when truly leaving the zone (counter reaches 0)
    if (dragEnterCount <= 0) {
      dragEnterCount = 0;
      isDragOver = false;
      isTypeDropOver = false;
      dropInsertIndex = null;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const currentInsertIndex = dropInsertIndex;
    isDragOver = false;
    isTypeDropOver = false;
    dropInsertIndex = null;
    dragEnterCount = 0;

    // Check if it's a block type drop (create new block)
    const typeData = e.dataTransfer?.getData("application/x-block-type");
    if (typeData && onCreateBlock) {
      try {
        const parsed = JSON.parse(typeData);
        if (parsed.action === 'create' && parsed.typeId) {
          onCreateBlock(zone, parsed.typeId);
          return;
        }
      } catch {
        // Not a valid block type data
      }
    }

    // Otherwise, it's a block move
    const data = e.dataTransfer?.getData("text/plain");
    if (data) {
      try {
        // Try parsing as JSON array
        const blockIds: string[] = JSON.parse(data);
        if (Array.isArray(blockIds)) {
          // Check if blocks are from this zone (reorder) or different zone (move)
          const allFromThisZone = blockIds.every((id) =>
            blocks.some((b) => b.id === id)
          );

          if (allFromThisZone && onReorder && currentInsertIndex !== null) {
            onReorder(zone, blockIds, currentInsertIndex);
          } else if (onDrop) {
            onDrop(zone, blockIds);
          }
        } else if (onDrop) {
          // Fallback for single ID
          onDrop(zone, [data]);
        }
      } catch {
        // Fallback for plain string ID
        if (onDrop) {
          onDrop(zone, [data]);
        }
      }
    }
  }
</script>

<section
  class="zone"
  class:collapsed
  class:drag-over={(isDragOver && draggingBlockIds.length > 0) || isTypeDropOver}
  style:--zone-color={config.color}
  aria-label="{config.label} zone"
  ondragenter={handleDragEnter}
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
    <div class="zone-content" bind:this={zoneContentRef}>
      {#if blocks.length === 0}
        <div class="zone-empty">Drop blocks here</div>
      {:else}
        {#each blocks as block, index (block.id)}
          {#if dropInsertIndex === index && isDragOver}
            <div class="drop-line"></div>
          {/if}
          <ContextBlock
            {block}
            selected={selectedIds.has(block.id)}
            dragging={draggingBlockIds.includes(block.id)}
            {selectedIds}
            onSelect={onBlockSelect}
            onDoubleClick={onBlockDoubleClick}
            onDragStart={onBlockDragStart}
            onDragEnd={onBlockDragEnd}
          />
        {/each}
        {#if dropInsertIndex === blocks.length && isDragOver}
          <div class="drop-line"></div>
        {/if}
      {/if}
    </div>
  {/if}

  {#if isTypeDropOver}
    <div class="drop-indicator drop-indicator-create">
      <span>+ Create block in {config.label}</span>
    </div>
  {:else if isDragOver && draggingBlockIds.length > 0}
    <div class="drop-indicator">
      <span>Drop {draggingBlockIds.length > 1 ? `${draggingBlockIds.length} blocks` : ''} to {config.label}</span>
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

  .drop-line {
    height: 2px;
    background: var(--zone-color);
    border-radius: 1px;
    margin: 2px 0;
    box-shadow: 0 0 4px var(--zone-color);
    animation: pulse-line 0.8s ease-in-out infinite;
  }

  @keyframes pulse-line {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
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

  .drop-indicator-create {
    background: color-mix(in srgb, var(--semantic-success) 10%, var(--bg-base) 80%);
  }

  .drop-indicator-create span {
    background: var(--semantic-success);
  }
</style>
