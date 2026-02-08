<script lang="ts">
  /**
   * ContextDiff — Shows diff between current context and a snapshot.
   * Displays added, removed, and modified blocks with inline line-level diffs.
   * Supports zone filtering, clickable entries, and bidirectional modal navigation.
   */
  import { untrack } from "svelte";
  import type { Block } from "$lib/types";
  import { contextStore, zonesStore } from "$lib/stores";
  import { focusTrap } from "$lib/utils";
  import { diffLines, type DiffLine } from "$lib/utils/diff";
  import ContextDiffStats from "./ContextDiffStats.svelte";
  import ContextDiffEntry from "./ContextDiffEntry.svelte";
  import ContextDiffSelector from "./ContextDiffSelector.svelte";

  interface Props {
    open?: boolean;
    onClose?: () => void;
    filterZone?: string | null;
    highlightBlockId?: string | null;
    onOpenBlock?: (blockId: string) => void;
    onRevert?: (blockId: string, content: string) => void;
  }

  let {
    open = false,
    onClose,
    filterZone = null,
    highlightBlockId = null,
    onOpenBlock,
    onRevert,
  }: Props = $props();

  let selectedSnapshotId = $state<string | null>(null);
  let showAllZones = $state(false);
  let expandedEntryId = $state<string | null>(null);
  let diffListRef = $state<HTMLElement | null>(null);

  // Advanced from/to mode
  let advancedMode = $state(false);
  let fromSnapshotId = $state<string | null>(null); // null = current state
  let toSnapshotId = $state<string | null>(null);   // null = current state

  // Pending reverts: blockId -> { revertContent, originalContent }
  let pendingReverts = $state<Record<string, { revertContent: string; originalContent: string }>>({})

  // Auto-select most recent snapshot (that isn't the active one) when opening
  $effect(() => {
    if (open && !selectedSnapshotId && contextStore.snapshots.length > 0) {
      // Pick the most recent snapshot that isn't currently active
      const candidates = contextStore.snapshots.filter(s => s.id !== contextStore.activeSnapshotId);
      if (candidates.length > 0) {
        selectedSnapshotId = candidates[candidates.length - 1].id;
      } else {
        selectedSnapshotId = contextStore.snapshots[contextStore.snapshots.length - 1].id;
      }
    }
    if (!open) {
      // Wrap cleanup in untrack to prevent infinite loop:
      // Object.entries(pendingReverts) reads the proxy, and pendingReverts = {}
      // writes a new reference, which would re-trigger this effect endlessly.
      untrack(() => {
        if (onRevert) {
          for (const [blockId, { revertContent }] of Object.entries(pendingReverts)) {
            onRevert(blockId, revertContent);
          }
        }
        selectedSnapshotId = null;
        showAllZones = false;
        expandedEntryId = null;
        advancedMode = false;
        fromSnapshotId = null;
        toSnapshotId = null;
        pendingReverts = {};
      });
    }
  });

  // Auto-scroll to highlighted entry after diff renders
  $effect(() => {
    if (diffListRef && highlightBlockId && diff.length > 0) {
      requestAnimationFrame(() => {
        const el = diffListRef?.querySelector('.diff-entry.highlighted') as HTMLElement | null;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  });

  const selectedSnapshot = $derived(
    contextStore.snapshots.find((s) => s.id === selectedSnapshotId) ?? null
  );

  // Get blocks for a given state identifier (null = current, string = snapshot id)
  function getBlocksForState(stateId: string | null): Block[] {
    if (stateId === null) return contextStore.blocks;
    const snap = contextStore.snapshots.find(s => s.id === stateId);
    return snap?.blocks ?? [];
  }

  // Filter zone label
  const filterZoneLabel = $derived.by(() => {
    if (!filterZone) return null;
    return zonesStore.getZoneById(filterZone)?.label ?? filterZone;
  });

  // Compute diff
  interface DiffEntry {
    status: "added" | "removed" | "modified" | "unchanged";
    current: Block | null;
    snapshot: Block | null;
    changes: string[];
    hasContentChange: boolean;
  }

  const allDiff = $derived.by((): DiffEntry[] => {
    let fromBlocks: Block[];
    let toBlocks: Block[];

    if (advancedMode) {
      fromBlocks = getBlocksForState(fromSnapshotId);
      toBlocks = getBlocksForState(toSnapshotId);
      // Don't diff if comparing same state
      if (fromSnapshotId === toSnapshotId) return [];
    } else {
      if (!selectedSnapshot) return [];
      // "From" = snapshot, "To" = current state
      fromBlocks = selectedSnapshot.blocks;
      toBlocks = contextStore.blocks;
    }

    const currentMap = new Map(toBlocks.map((b) => [b.id, b]));
    const snapMap = new Map(fromBlocks.map((b) => [b.id, b]));
    const allIds = new Set([...currentMap.keys(), ...snapMap.keys()]);

    const entries: DiffEntry[] = [];
    for (const id of allIds) {
      const cur = currentMap.get(id) ?? null;
      const snap = snapMap.get(id) ?? null;

      if (cur && !snap) {
        entries.push({ status: "added", current: cur, snapshot: null, changes: [], hasContentChange: false });
      } else if (!cur && snap) {
        entries.push({ status: "removed", current: null, snapshot: snap, changes: [], hasContentChange: false });
      } else if (cur && snap) {
        const changes: string[] = [];
        let hasContentChange = false;
        if (cur.content !== snap.content) {
          changes.push("content");
          hasContentChange = true;
        }
        if (cur.zone !== snap.zone) {
          const fromLabel = zonesStore.getZoneById(snap.zone)?.label ?? snap.zone;
          const toLabel = zonesStore.getZoneById(cur.zone)?.label ?? cur.zone;
          changes.push(`zone: ${fromLabel} → ${toLabel}`);
        }
        if (cur.compressionLevel !== snap.compressionLevel) {
          changes.push(`compression: ${snap.compressionLevel} → ${cur.compressionLevel}`);
        }
        if (cur.tokens !== snap.tokens) {
          const delta = cur.tokens - snap.tokens;
          const sign = delta > 0 ? "+" : "";
          changes.push(`tokens: ${sign}${delta}`);
        }
        if (cur.pinned !== snap.pinned) changes.push("pin changed");
        if (cur.role !== snap.role) changes.push(`role: ${snap.role} → ${cur.role}`);

        if (changes.length > 0) {
          entries.push({ status: "modified", current: cur, snapshot: snap, changes, hasContentChange });
        }
      }
    }

    const order = { removed: 0, modified: 1, added: 2, unchanged: 3 };
    entries.sort((a, b) => order[a.status] - order[b.status]);
    return entries;
  });

  // Apply zone filter
  const diff = $derived.by((): DiffEntry[] => {
    if (!filterZone || showAllZones) return allDiff;
    return allDiff.filter((entry) => {
      const block = entry.current ?? entry.snapshot;
      return block?.zone === filterZone;
    });
  });

  // Stats
  const addedCount = $derived(diff.filter((d) => d.status === "added").length);
  const removedCount = $derived(diff.filter((d) => d.status === "removed").length);
  const modifiedCount = $derived(diff.filter((d) => d.status === "modified").length);

  const tokenDelta = $derived.by(() => {
    if (advancedMode) {
      const fromBlocks = getBlocksForState(fromSnapshotId);
      const toBlocks = getBlocksForState(toSnapshotId);
      const fromTokens = fromBlocks.reduce((sum, b) => sum + b.tokens, 0);
      const toTokens = toBlocks.reduce((sum, b) => sum + b.tokens, 0);
      return toTokens - fromTokens;
    }
    if (!selectedSnapshot) return 0;
    return contextStore.tokenBudget.used - selectedSnapshot.totalTokens;
  });

  // Inline diff cache
  const inlineDiffCache = $derived.by((): Record<string, DiffLine[]> => {
    if (!expandedEntryId) return {};
    const entry = diff.find((e) => (e.current?.id ?? e.snapshot?.id) === expandedEntryId);
    if (!entry || !entry.hasContentChange || !entry.current || !entry.snapshot) return {};
    const lines = diffLines(entry.snapshot.content, entry.current.content);
    return { [expandedEntryId]: lines };
  });

  function formatDate(date: Date): string {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose?.();
  }

  function getEntryId(entry: DiffEntry): string {
    return entry.current?.id ?? entry.snapshot?.id ?? "";
  }

  function toggleInlineDiff(entryId: string) {
    expandedEntryId = expandedEntryId === entryId ? null : entryId;
  }

  function setPendingRevert(
    entryId: string,
    payload: { revertContent: string; originalContent: string } | null
  ) {
    if (!payload) {
      const { [entryId]: _, ...rest } = pendingReverts;
      pendingReverts = rest;
      return;
    }

    pendingReverts = {
      ...pendingReverts,
      [entryId]: payload,
    };
  }
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
  <div
    class="diff-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="Context Diff View"
    onclick={handleBackdrop}
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <div class="diff-modal" use:focusTrap={{ enabled: open, onEscape: onClose }}>
      <div class="diff-header">
        <h2 class="diff-title">Context Diff</h2>
        <button class="close-btn" onclick={onClose}>×</button>
      </div>

      <!-- Zone filter bar -->
      {#if filterZone && !showAllZones}
        <div class="diff-filter-bar">
          <span class="filter-label">Filtered: <strong>{filterZoneLabel}</strong></span>
          <button class="filter-toggle" onclick={() => showAllZones = true}>Show All Zones</button>
        </div>
      {:else if filterZone && showAllZones}
        <div class="diff-filter-bar">
          <span class="filter-label">All zones</span>
          <button class="filter-toggle" onclick={() => showAllZones = false}>Filter: {filterZoneLabel}</button>
        </div>
      {/if}

      <ContextDiffSelector
        {advancedMode}
        {selectedSnapshotId}
        {fromSnapshotId}
        {toSnapshotId}
        snapshots={contextStore.snapshots}
        {formatDate}
        onAdvancedModeChange={(value) => advancedMode = value}
        onSelectedSnapshotIdChange={(value) => selectedSnapshotId = value}
        onFromSnapshotIdChange={(value) => fromSnapshotId = value}
        onToSnapshotIdChange={(value) => toSnapshotId = value}
      />

      {#if (advancedMode || selectedSnapshot) && diff.length > 0}
        <ContextDiffStats {addedCount} {removedCount} {modifiedCount} {tokenDelta} />

        <!-- Diff entries -->
        <div class="diff-list" bind:this={diffListRef}>
          {#each diff as entry (getEntryId(entry))}
            {@const entryId = getEntryId(entry)}
            <ContextDiffEntry
              {entry}
              {entryId}
              highlighted={entryId === highlightBlockId}
              expanded={expandedEntryId === entryId}
              inlineDiffLines={inlineDiffCache[entryId]}
              pendingRevert={pendingReverts[entryId]}
              onOpenBlock={onOpenBlock}
              onToggleInlineDiff={toggleInlineDiff}
              onSetPendingRevert={setPendingRevert}
            />
          {/each}
        </div>
      {:else if advancedMode}
        <div class="diff-empty">{fromSnapshotId === toSnapshotId ? "Select two different states to compare." : "No differences found."}</div>
      {:else if selectedSnapshot}
        <div class="diff-empty">No changes since this snapshot.</div>
      {:else}
        <div class="diff-empty">Select a snapshot to compare.</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .diff-backdrop {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--bg-base) 85%, transparent);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: diff-fade-in 0.15s ease;
  }

  @keyframes diff-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .diff-modal {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    width: 90%;
    max-width: 720px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
    animation: diff-slide-in 0.2s cubic-bezier(0.34, 1.2, 0.64, 1);
    overflow: hidden;
  }

  @keyframes diff-slide-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .diff-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .diff-title {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .close-btn {
    font-size: 18px;
    line-height: 1;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    opacity: 0.6;
    transition: all 0.1s ease;
  }

  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    opacity: 1;
  }

  /* Zone filter bar */
  .diff-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 14px;
    background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface));
    border-bottom: 1px solid var(--border-subtle);
  }

  .filter-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
  }

  .filter-label strong {
    color: var(--text-primary);
  }

  .filter-toggle {
    font-family: var(--font-mono);
    font-size: 9px;
    padding: 2px 6px;
    border: 1px solid var(--border-default);
    border-radius: 2px;
    background: var(--bg-surface);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .filter-toggle:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  .diff-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    scrollbar-width: thin;
    scrollbar-color: var(--border-default) transparent;
  }

  .diff-empty {
    padding: 32px 14px;
    text-align: center;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-faint);
  }

</style>
