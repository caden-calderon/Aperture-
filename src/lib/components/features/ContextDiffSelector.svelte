<script lang="ts">
  import type { Snapshot } from "$lib/types";

  interface Props {
    advancedMode: boolean;
    selectedSnapshotId: string | null;
    fromSnapshotId: string | null;
    toSnapshotId: string | null;
    snapshots: Snapshot[];
    formatDate: (date: Date) => string;
    onAdvancedModeChange?: (value: boolean) => void;
    onSelectedSnapshotIdChange?: (value: string | null) => void;
    onFromSnapshotIdChange?: (value: string | null) => void;
    onToSnapshotIdChange?: (value: string | null) => void;
  }

  let {
    advancedMode,
    selectedSnapshotId,
    fromSnapshotId,
    toSnapshotId,
    snapshots,
    formatDate,
    onAdvancedModeChange,
    onSelectedSnapshotIdChange,
    onFromSnapshotIdChange,
    onToSnapshotIdChange,
  }: Props = $props();
</script>

<div class="diff-selector">
  {#if advancedMode}
    <div class="diff-advanced-selectors">
      <div class="diff-selector-row">
        <span class="selector-label">From:</span>
        <select
          class="snapshot-select"
          value={fromSnapshotId ?? ""}
          onchange={(e) => {
            const value = (e.currentTarget as HTMLSelectElement).value;
            onFromSnapshotIdChange?.(value === "" ? null : value);
          }}
        >
          <option value="">Current State</option>
          {#each snapshots as snap (snap.id)}
            <option value={snap.id}>
              {snap.name} — {formatDate(snap.timestamp)}
            </option>
          {/each}
        </select>
      </div>
      <div class="diff-selector-row">
        <span class="selector-label">To:</span>
        <select
          class="snapshot-select"
          value={toSnapshotId ?? ""}
          onchange={(e) => {
            const value = (e.currentTarget as HTMLSelectElement).value;
            onToSnapshotIdChange?.(value === "" ? null : value);
          }}
        >
          <option value="">Current State</option>
          {#each snapshots as snap (snap.id)}
            <option value={snap.id}>
              {snap.name} — {formatDate(snap.timestamp)}
            </option>
          {/each}
        </select>
      </div>
    </div>
  {:else}
    <span class="selector-label">Compare with:</span>
    {#if snapshots.length === 0}
      <span class="no-snapshots">No snapshots available. Save one first (S).</span>
    {:else}
      <select
        class="snapshot-select"
        value={selectedSnapshotId ?? ""}
        onchange={(e) => {
          const value = (e.currentTarget as HTMLSelectElement).value;
          onSelectedSnapshotIdChange?.(value === "" ? null : value);
        }}
      >
        {#each snapshots as snap (snap.id)}
          <option value={snap.id}>
            {snap.name} — {formatDate(snap.timestamp)} ({snap.totalTokens.toLocaleString()} tokens)
          </option>
        {/each}
      </select>
    {/if}
  {/if}
  <button
    class="diff-mode-toggle"
    onclick={() => onAdvancedModeChange?.(!advancedMode)}
    title={advancedMode ? "Simple mode" : "Compare any two states"}
  >{advancedMode ? "Simple" : "From/To"}</button>
</div>

<style>
  .diff-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--bg-inset);
    border-bottom: 1px solid var(--border-subtle);
  }

  .diff-advanced-selectors {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .diff-selector-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .diff-mode-toggle {
    font-family: var(--font-mono);
    font-size: 9px;
    padding: 3px 7px;
    border: 1px solid var(--border-default);
    border-radius: 2px;
    background: var(--bg-surface);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s ease;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .diff-mode-toggle:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  .selector-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .no-snapshots {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-faint);
    font-style: italic;
  }

  .snapshot-select {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 4px 6px;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: 3px;
    color: var(--text-secondary);
    cursor: pointer;
    color-scheme: dark;
  }

  .snapshot-select option {
    background: var(--bg-base);
    color: var(--text-secondary);
  }

  .snapshot-select:focus {
    outline: none;
    border-color: var(--accent);
  }
</style>
