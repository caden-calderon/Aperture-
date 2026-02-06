<script lang="ts">
  /**
   * ContextDiff — Shows diff between current context and a snapshot.
   * Displays added, removed, and modified blocks with inline line-level diffs.
   * Supports zone filtering, clickable entries, and bidirectional modal navigation.
   */
  import { untrack } from "svelte";
  import type { Block } from "$lib/types";
  import { contextStore, zonesStore, blockTypesStore } from "$lib/stores";
  import { diffLines, diffStats, type DiffLine } from "$lib/utils/diff";

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

  // Get label for a state identifier
  function getStateLabel(stateId: string | null): string {
    if (stateId === null) return "Current State";
    const snap = contextStore.snapshots.find(s => s.id === stateId);
    return snap?.name ?? "Unknown";
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

  function getBlockLabel(block: Block): string {
    const typeId = block.blockType ?? block.role;
    const typeInfo = blockTypesStore.getTypeById(typeId);
    return typeInfo?.shortLabel ?? block.role.toUpperCase();
  }

  function getBlockColor(block: Block): string {
    const roleColors: Record<string, string> = {
      system: "var(--role-system)",
      user: "var(--role-user)",
      assistant: "var(--role-assistant)",
      tool_use: "var(--role-tool)",
      tool_result: "var(--role-tool)",
    };
    return roleColors[block.role] ?? "var(--text-muted)";
  }

  function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.slice(0, max) + "…";
  }

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

  function handleEntryClick(entry: DiffEntry) {
    const blockId = entry.current?.id ?? entry.snapshot?.id;
    if (blockId && onOpenBlock) {
      onOpenBlock(blockId);
    }
  }

  function toggleInlineDiff(e: MouseEvent, entryId: string) {
    e.stopPropagation();
    expandedEntryId = expandedEntryId === entryId ? null : entryId;
  }

  function getDiffMarker(type: DiffLine["type"]): string {
    if (type === "added") return "+";
    if (type === "removed") return "-";
    return " ";
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
    <div class="diff-modal">
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

      <!-- Snapshot selector -->
      <div class="diff-selector">
        {#if advancedMode}
          <div class="diff-advanced-selectors">
            <div class="diff-selector-row">
              <span class="selector-label">From:</span>
              <select class="snapshot-select" bind:value={fromSnapshotId}>
                <option value={null}>Current State</option>
                {#each contextStore.snapshots as snap (snap.id)}
                  <option value={snap.id}>
                    {snap.name} — {formatDate(snap.timestamp)}
                  </option>
                {/each}
              </select>
            </div>
            <div class="diff-selector-row">
              <span class="selector-label">To:</span>
              <select class="snapshot-select" bind:value={toSnapshotId}>
                <option value={null}>Current State</option>
                {#each contextStore.snapshots as snap (snap.id)}
                  <option value={snap.id}>
                    {snap.name} — {formatDate(snap.timestamp)}
                  </option>
                {/each}
              </select>
            </div>
          </div>
        {:else}
          <span class="selector-label">Compare with:</span>
          {#if contextStore.snapshots.length === 0}
            <span class="no-snapshots">No snapshots available. Save one first (S).</span>
          {:else}
            <select
              class="snapshot-select"
              bind:value={selectedSnapshotId}
            >
              {#each contextStore.snapshots as snap (snap.id)}
                <option value={snap.id}>
                  {snap.name} — {formatDate(snap.timestamp)} ({snap.totalTokens.toLocaleString()} tokens)
                </option>
              {/each}
            </select>
          {/if}
        {/if}
        <button
          class="diff-mode-toggle"
          onclick={() => advancedMode = !advancedMode}
          title={advancedMode ? "Simple mode" : "Compare any two states"}
        >{advancedMode ? "Simple" : "From/To"}</button>
      </div>

      {#if (advancedMode || selectedSnapshot) && diff.length > 0}
        <!-- Summary stats -->
        <div class="diff-stats">
          {#if addedCount > 0}
            <span class="stat stat-added">+{addedCount} added</span>
          {/if}
          {#if removedCount > 0}
            <span class="stat stat-removed">−{removedCount} removed</span>
          {/if}
          {#if modifiedCount > 0}
            <span class="stat stat-modified">~{modifiedCount} modified</span>
          {/if}
          <span class="stat stat-tokens">
            {tokenDelta >= 0 ? "+" : ""}{tokenDelta.toLocaleString()} tokens
          </span>
        </div>

        <!-- Diff entries -->
        <div class="diff-list" bind:this={diffListRef}>
          {#each diff as entry (getEntryId(entry))}
            {@const block = entry.current ?? entry.snapshot}
            {@const entryId = getEntryId(entry)}
            {@const isHighlighted = entryId === highlightBlockId}
            {#if block}
              <div
                class="diff-entry diff-{entry.status}"
                class:highlighted={isHighlighted}
                role="button"
                tabindex="0"
                onclick={() => handleEntryClick(entry)}
                onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEntryClick(entry); } }}
              >
                <div class="diff-entry-header">
                  <span class="diff-status-badge">{
                    entry.status === "added" ? "+" :
                    entry.status === "removed" ? "−" :
                    "~"
                  }</span>
                  <span
                    class="diff-role-badge"
                    style:--role-color={getBlockColor(block)}
                  >{getBlockLabel(block)}</span>
                  <span class="diff-preview">{truncate(block.content.replace(/\n/g, " "), 60)}</span>
                  {#if entry.changes.length > 0}
                    <span class="diff-changes">
                      {entry.changes.join(", ")}
                    </span>
                  {/if}
                  {#if entry.hasContentChange}
                    <button
                      class="diff-expand-btn"
                      class:expanded={expandedEntryId === entryId}
                      onclick={(e) => toggleInlineDiff(e, entryId)}
                      title="Toggle inline diff"
                    >
                      {expandedEntryId === entryId ? "▾ diff" : "▸ diff"}
                    </button>
                  {/if}
                </div>

                <!-- Inline diff -->
                {#if expandedEntryId === entryId && inlineDiffCache[entryId]}
                  <div class="inline-diff" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="presentation">
                    {#each inlineDiffCache[entryId] as line}
                      <div class="diff-line diff-line-{line.type}">
                        <span class="diff-line-marker">{getDiffMarker(line.type)}</span>
                        <span class="diff-line-num">{line.oldLineNum ?? ""}</span>
                        <span class="diff-line-num">{line.newLineNum ?? ""}</span>
                        <span class="diff-line-content">{line.content || " "}</span>
                      </div>
                    {/each}
                    {#if entry.snapshot && entry.current}
                      <div class="inline-diff-footer">
                        {#if pendingReverts[entryId]}
                          <button
                            class="inline-revert-btn inline-revert-undo"
                            onclick={(e) => {
                              e.stopPropagation();
                              const { [entryId]: _, ...rest } = pendingReverts;
                              pendingReverts = rest;
                            }}
                          >Undo Revert</button>
                        {:else}
                          <button
                            class="inline-revert-btn"
                            onclick={(e) => {
                              e.stopPropagation();
                              if (entry.snapshot && entry.current) {
                                pendingReverts = {
                                  ...pendingReverts,
                                  [entryId]: {
                                    revertContent: entry.snapshot.content,
                                    originalContent: entry.current.content,
                                  },
                                };
                              }
                            }}
                          >Revert to snapshot version</button>
                        {/if}
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
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

  .diff-stats {
    display: flex;
    gap: 10px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--border-subtle);
    flex-wrap: wrap;
  }

  .stat {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 2px;
  }

  .stat-added {
    color: var(--semantic-success);
    background: color-mix(in srgb, var(--semantic-success) 12%, transparent);
  }

  .stat-removed {
    color: var(--semantic-danger);
    background: color-mix(in srgb, var(--semantic-danger) 12%, transparent);
  }

  .stat-modified {
    color: var(--semantic-warning);
    background: color-mix(in srgb, var(--semantic-warning) 12%, transparent);
  }

  .stat-tokens {
    color: var(--text-muted);
    background: var(--bg-inset);
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

  .diff-entry {
    border: 1px solid var(--border-subtle);
    border-radius: 3px;
    overflow: hidden;
    transition: border-color 0.1s ease, box-shadow 0.1s ease;
    background: var(--bg-inset);
    cursor: pointer;
  }

  .diff-entry:hover {
    border-color: var(--border-default);
    background: var(--bg-surface);
  }

  .diff-entry:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .diff-entry.highlighted {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent), 0 0 8px color-mix(in srgb, var(--accent) 25%, transparent);
  }

  .diff-entry.diff-added {
    border-left: 3px solid var(--semantic-success);
    background: color-mix(in srgb, var(--semantic-success) 4%, var(--bg-inset));
  }

  .diff-entry.diff-removed {
    border-left: 3px solid var(--semantic-danger);
    background: color-mix(in srgb, var(--semantic-danger) 4%, var(--bg-inset));
  }

  .diff-entry.diff-modified {
    border-left: 3px solid var(--semantic-warning);
    background: color-mix(in srgb, var(--semantic-warning) 4%, var(--bg-inset));
  }

  .diff-entry-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
  }

  .diff-status-badge {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    width: 14px;
    text-align: center;
    flex-shrink: 0;
  }

  .diff-added .diff-status-badge { color: var(--semantic-success); }
  .diff-removed .diff-status-badge { color: var(--semantic-danger); }
  .diff-modified .diff-status-badge { color: var(--semantic-warning); }

  .diff-role-badge {
    font-family: var(--font-mono);
    font-size: 8px;
    font-weight: 600;
    padding: 2px 4px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--role-color) 18%, transparent);
    color: var(--role-color);
    letter-spacing: 0.2px;
    flex-shrink: 0;
  }

  .diff-preview {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .diff-changes {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
    max-width: 180px;
  }

  .diff-expand-btn {
    font-family: var(--font-mono);
    font-size: 9px;
    padding: 1px 5px;
    border: 1px solid var(--border-default);
    border-radius: 2px;
    background: var(--bg-surface);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s ease;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .diff-expand-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  .diff-expand-btn.expanded {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  /* Inline diff */
  .inline-diff {
    max-height: 200px;
    overflow-y: auto;
    border-top: 1px solid var(--border-subtle);
    background: var(--bg-base);
    scrollbar-width: thin;
    scrollbar-color: var(--border-default) transparent;
  }

  .diff-line {
    display: flex;
    align-items: stretch;
    font-family: var(--font-mono);
    font-size: 10px;
    line-height: 1.5;
    min-height: 18px;
  }

  .diff-line-added {
    background: color-mix(in srgb, var(--semantic-success) 10%, transparent);
  }

  .diff-line-removed {
    background: color-mix(in srgb, var(--semantic-danger) 10%, transparent);
    opacity: 0.7;
  }

  .diff-line-unchanged {
    color: var(--text-muted);
  }

  .diff-line-marker {
    width: 16px;
    text-align: center;
    flex-shrink: 0;
    font-weight: 700;
    user-select: none;
  }

  .diff-line-added .diff-line-marker { color: var(--semantic-success); }
  .diff-line-removed .diff-line-marker { color: var(--semantic-danger); }
  .diff-line-unchanged .diff-line-marker { color: var(--text-faint); }

  .diff-line-num {
    width: 28px;
    text-align: right;
    padding-right: 4px;
    color: var(--text-faint);
    flex-shrink: 0;
    user-select: none;
    font-size: 9px;
  }

  .diff-line-content {
    flex: 1;
    white-space: pre-wrap;
    word-break: break-all;
    padding-left: 4px;
  }

  .diff-empty {
    padding: 32px 14px;
    text-align: center;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-faint);
  }

  /* Inline diff footer with revert button */
  .inline-diff-footer {
    padding: 4px 8px;
    border-top: 1px solid var(--border-subtle);
    background: var(--bg-surface);
  }

  .inline-revert-btn {
    font-family: var(--font-mono);
    font-size: 9px;
    padding: 3px 8px;
    border-radius: 2px;
    border: 1px solid color-mix(in srgb, var(--semantic-warning) 50%, transparent);
    background: transparent;
    color: var(--semantic-warning);
    cursor: pointer;
    transition: all 0.1s ease;
    width: 100%;
  }

  .inline-revert-btn:hover {
    background: var(--semantic-warning);
    border-color: var(--semantic-warning);
    color: var(--bg-surface);
  }

  .inline-revert-btn.inline-revert-undo {
    border-color: color-mix(in srgb, var(--semantic-danger) 50%, transparent);
    color: var(--semantic-danger);
  }

  .inline-revert-btn.inline-revert-undo:hover {
    background: var(--semantic-danger);
    border-color: var(--semantic-danger);
    color: var(--bg-surface);
  }
</style>
