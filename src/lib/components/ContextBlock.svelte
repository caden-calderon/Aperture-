<script lang="ts">
  import type { Block } from "$lib/types";
  import { blockTypesStore } from "$lib/stores";

  interface Props {
    block: Block;
    selected?: boolean;
    dragging?: boolean;
    contentExpanded?: boolean;
    selectedIds?: Set<string>;
    onSelect?: (id: string, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void;
    onDoubleClick?: (id: string) => void;
    onDragStart?: (ids: string[]) => void;
    onDragEnd?: () => void;
  }

  let {
    block,
    selected = false,
    dragging = false,
    contentExpanded = false,
    selectedIds = new Set<string>(),
    onSelect,
    onDoubleClick,
    onDragStart,
    onDragEnd,
  }: Props = $props();

  // Per-block collapsed state (local, not persisted)
  let isCollapsed = $state(false);

  // Count how many blocks are being dragged
  const dragCount = $derived(selected && selectedIds.size > 1 ? selectedIds.size : 1);

  // Get display info: use blockType if set, otherwise use role
  const displayTypeId = $derived(block.blockType ?? block.role);
  const typeInfo = $derived(blockTypesStore.getTypeById(displayTypeId));
  const displayColor = $derived(typeInfo?.color ?? "var(--text-muted)");
  const displayLabel = $derived(typeInfo?.shortLabel ?? displayTypeId.slice(0, 4).toUpperCase());

  // Whether to show full content (zone-level expand OR block not collapsed)
  const showContent = $derived(!isCollapsed);
  const showFullContent = $derived(contentExpanded && !isCollapsed);

  function handleClick(e: MouseEvent) {
    onSelect?.(block.id, {
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
    });
  }

  function handleDoubleClick() {
    onDoubleClick?.(block.id);
  }

  function handleDragStart(e: DragEvent) {
    const idsToMove = selected && selectedIds.size > 1
      ? [...selectedIds]
      : [block.id];

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", JSON.stringify(idsToMove));
    }
    onDragStart?.(idsToMove);
  }

  function handleDragEnd() {
    onDragEnd?.();
  }

  function toggleCollapse(e: MouseEvent) {
    e.stopPropagation();
    isCollapsed = !isCollapsed;
  }

  function getPreview(content: string, maxLength = 180): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + "…";
  }

  function formatTokens(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toString();
  }
</script>

<div
  class="block"
  class:selected
  class:dragging
  class:collapsed={isCollapsed}
  class:pinned={block.pinned !== null}
  style:--role-color={displayColor}
  data-block-id={block.id}
  role="button"
  tabindex="0"
  draggable="true"
  onclick={handleClick}
  ondblclick={handleDoubleClick}
  ondragstart={handleDragStart}
  ondragend={handleDragEnd}
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleClick(e as unknown as MouseEvent);
    }
  }}
>
  <div class="block-header" class:no-margin={isCollapsed}>
    <span class="role-badge">{displayLabel}</span>
    {#if block.pinned}
      <span class="pin-badge" title="Pinned to {block.pinned}">
        <span class="pin-icon">📌</span>
        <span class="pin-direction">{block.pinned === "top" ? "↑" : "↓"}</span>
      </span>
    {/if}
    {#if block.metadata.toolName}
      <span class="tool-name">{block.metadata.toolName}</span>
    {/if}
    <span class="token-count">{formatTokens(block.tokens)}</span>
    <button
      class="collapse-toggle"
      onclick={toggleCollapse}
      title={isCollapsed ? "Expand block" : "Collapse block"}
    >
      {isCollapsed ? "▸" : "▾"}
    </button>
  </div>

  {#if showContent}
    <div class="block-content" class:content-expanded={showFullContent}>
      <pre>{showFullContent ? block.content : getPreview(block.content)}</pre>
    </div>
  {/if}

  {#if block.compressionLevel !== "original"}
    <span class="compression-badge">{block.compressionLevel}</span>
  {/if}

  {#if dragging && dragCount > 1}
    <span class="drag-count-badge">+{dragCount - 1}</span>
  {/if}
</div>

<style>
  .block {
    position: relative;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    padding: calc(6px * var(--density-scale, 1)) calc(10px * var(--density-scale, 1));
    cursor: pointer;
    transition: all 0.1s ease;
    animation: block-materialize 0.2s ease-out;
  }

  @keyframes block-materialize {
    0% {
      opacity: 0;
      transform: translateY(4px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .block::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--role-color);
    border-radius: 4px 0 0 4px;
  }

  .block:hover {
    border-color: var(--border-default);
    background: var(--bg-hover);
  }

  .block.selected {
    border-color: var(--accent);
    background: var(--accent-subtle);
    box-shadow: inset 0 0 0 1px var(--accent);
  }

  .block.dragging {
    opacity: 0.5;
    transform: scale(1.005);
    box-shadow: var(--shadow-md);
  }

  .block.pinned::after {
    content: "";
    position: absolute;
    top: 4px;
    right: 4px;
    width: 4px;
    height: 4px;
    border-radius: 1px;
    background: var(--role-color);
  }

  .block-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .block-header.no-margin {
    margin-bottom: 0;
  }

  .role-badge {
    font-family: var(--font-mono);
    font-size: calc(9px * var(--density-scale, 1));
    font-weight: 600;
    padding: 2px 5px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--role-color) 25%, transparent);
    color: var(--role-color);
    letter-spacing: 0.2px;
  }

  .pin-badge {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--semantic-warning) 20%, transparent);
    color: var(--semantic-warning);
  }

  .pin-icon {
    font-size: 8px;
  }

  .pin-direction {
    font-weight: 600;
  }

  .tool-name {
    font-size: 10px;
    color: var(--text-muted);
    background: var(--bg-muted);
    padding: 1px 4px;
    border-radius: 2px;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .token-count {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .collapse-toggle {
    font-size: 11px;
    color: var(--text-muted);
    background: none;
    border: 1px solid var(--border-subtle);
    cursor: pointer;
    padding: 2px 5px;
    border-radius: 3px;
    line-height: 1;
    transition: all 0.1s ease;
    flex-shrink: 0;
  }

  .collapse-toggle:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
    border-color: var(--border-default);
  }

  .block-content {
    position: relative;
  }

  .block-content pre {
    font-family: var(--font-mono);
    font-size: calc(11px * var(--density-scale, 1));
    line-height: 1.45;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    max-height: calc(60px * var(--density-scale, 1));
    overflow: hidden;
  }

  .block-content.content-expanded pre {
    max-height: none;
  }

  .block-content.content-expanded::after {
    display: none;
  }

  /* Fade out at bottom of truncated content */
  .block-content::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(transparent, var(--bg-elevated));
    pointer-events: none;
  }

  .block.selected .block-content::after {
    background: linear-gradient(transparent, var(--accent-subtle));
  }

  .block:hover .block-content::after {
    background: linear-gradient(transparent, var(--bg-hover));
  }

  .compression-badge {
    position: absolute;
    top: 6px;
    right: 8px;
    font-family: var(--font-mono);
    font-size: 8px;
    text-transform: uppercase;
    color: var(--text-faint);
    letter-spacing: 0.3px;
    background: var(--bg-muted);
    padding: 1px 3px;
    border-radius: 2px;
  }

  .drag-count-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    color: var(--bg-surface);
    background: var(--accent);
    padding: 2px 5px;
    border-radius: 10px;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
</style>
