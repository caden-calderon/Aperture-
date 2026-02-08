<script lang="ts">
  import type { Block } from "$lib/types";
  import ModalZoneDropdown from "./ModalZoneDropdown.svelte";

  interface SnapshotDiff {
    status: "new" | "modified" | "unchanged";
    changes: string[];
    snapshotName: string;
  }

  interface Props {
    block: Block;
    zoneLabel: string;
    snapshotDiff: SnapshotDiff | null;
    hasEditHistory: boolean;
    versionCount: number;
    hasVersions: boolean;
    isEditing: boolean;
    diffExpanded: boolean;
    onToggleDiff?: () => void;
    onMove?: (zone: Block["zone"]) => void;
    onCompress?: (level: Block["compressionLevel"]) => void;
    onPin?: (position: Block["pinned"]) => void;
    onOpenDiff?: (filterZone?: string, highlightBlockId?: string) => void;
    onRemove?: () => void;
  }

  let {
    block,
    zoneLabel,
    snapshotDiff,
    hasEditHistory,
    versionCount,
    hasVersions,
    isEditing,
    diffExpanded,
    onToggleDiff,
    onMove,
    onCompress,
    onPin,
    onOpenDiff,
    onRemove,
  }: Props = $props();

  let zoneDropdownOpen = $state(false);
</script>

<div class="modal-actions">
  <div class="action-group">
    <span class="action-label">Zone</span>
    <ModalZoneDropdown
      currentZoneId={block.zone}
      currentZoneLabel={zoneLabel}
      open={zoneDropdownOpen}
      onToggle={() => zoneDropdownOpen = !zoneDropdownOpen}
      onSelect={(zoneId) => {
        onMove?.(zoneId);
        zoneDropdownOpen = false;
      }}
    />
  </div>

  <div class="action-group">
    <span class="action-label">Compression</span>
    <div class="action-buttons">
      <button class:active={block.compressionLevel === "original"} onclick={() => onCompress?.("original")}>Original</button>
      <button class:active={block.compressionLevel === "trimmed"} onclick={() => onCompress?.("trimmed")}>Trimmed</button>
      <button class:active={block.compressionLevel === "summarized"} onclick={() => onCompress?.("summarized")}>Summarized</button>
      <button class:active={block.compressionLevel === "minimal"} onclick={() => onCompress?.("minimal")}>Minimal</button>
    </div>
  </div>

  <div class="action-group">
    <span class="action-label">Pin</span>
    <div class="action-buttons">
      <button class:active={block.pinned === "top"} onclick={() => onPin?.(block.pinned === "top" ? null : "top")}>Top</button>
      <button class:active={block.pinned === "bottom"} onclick={() => onPin?.(block.pinned === "bottom" ? null : "bottom")}>Bottom</button>
    </div>
  </div>

  {#if snapshotDiff || hasEditHistory}
    <div class="action-group">
      <span class="action-label">{snapshotDiff ? "Snapshot" : "History"}</span>
      <div class="snapshot-diff-info">
        {#if snapshotDiff}
          {#if snapshotDiff.status === "new"}
            <span class="diff-badge diff-badge-new">New</span>
            <span class="diff-detail">Not in "{snapshotDiff.snapshotName}"</span>
          {:else if snapshotDiff.status === "modified"}
            <span class="diff-badge diff-badge-modified">Modified</span>
            <span class="diff-detail">{snapshotDiff.changes.join(", ")}</span>
          {:else}
            <span class="diff-badge diff-badge-unchanged">Unchanged</span>
          {/if}
        {:else if hasEditHistory}
          <span class="diff-badge diff-badge-history">{versionCount} version{versionCount === 1 ? "" : "s"}</span>
        {/if}
        {#if hasVersions && !isEditing}
          <button class="diff-view-btn" onclick={onToggleDiff}>{diffExpanded ? "Hide Diff" : "Show Diff"}</button>
        {/if}
        {#if onOpenDiff}
          <button class="diff-view-btn" onclick={() => onOpenDiff?.(block.zone, block.id)}>Full Diff</button>
        {/if}
      </div>
    </div>
  {/if}

  <div class="action-group action-danger">
    <button class="btn-danger" onclick={onRemove}>Remove Block</button>
  </div>
</div>

<style>
  .modal-actions {
    padding: 12px 14px;
    border-top: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
  }

  .action-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .action-label {
    font-size: 9px;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.4px;
    width: 72px;
    flex-shrink: 0;
  }

  .action-buttons {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .action-buttons button {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 4px 8px;
    border-radius: 3px;
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .action-buttons button:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }

  .action-buttons button.active {
    background: var(--text-primary);
    border-color: var(--text-primary);
    color: var(--bg-surface);
  }

  .action-danger {
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px dashed var(--border-subtle);
  }

  .btn-danger {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 5px 10px;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--semantic-danger) 50%, transparent);
    background: transparent;
    color: var(--semantic-danger);
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .btn-danger:hover {
    background: var(--semantic-danger);
    border-color: var(--semantic-danger);
    color: var(--bg-surface);
  }

  .snapshot-diff-info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .diff-badge {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    padding: 2px 5px;
    border-radius: 2px;
    letter-spacing: 0.2px;
    flex-shrink: 0;
  }

  .diff-badge-new {
    color: var(--semantic-success);
    background: color-mix(in srgb, var(--semantic-success) 15%, transparent);
  }

  .diff-badge-modified {
    color: var(--semantic-warning);
    background: color-mix(in srgb, var(--semantic-warning) 15%, transparent);
  }

  .diff-badge-unchanged {
    color: var(--text-faint);
    background: var(--bg-inset);
  }

  .diff-detail {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }

  .diff-view-btn {
    font-family: var(--font-mono);
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 2px;
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s ease;
    margin-left: auto;
    flex-shrink: 0;
  }

  .diff-view-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  .diff-badge-history {
    color: var(--text-muted);
    background: var(--bg-inset);
  }
</style>
