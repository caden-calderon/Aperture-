<script lang="ts">
  import { searchStore } from "$lib/stores/search.svelte";
  import { zonesStore } from "$lib/stores/zones.svelte";
  import { blockTypesStore } from "$lib/stores/blockTypes.svelte";
  import { selectionStore } from "$lib/stores/selection.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";

  let inputEl = $state<HTMLInputElement | null>(null);

  // Auto-focus input when search opens
  $effect(() => {
    if (searchStore.isOpen && inputEl) {
      requestAnimationFrame(() => inputEl?.focus());
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        searchStore.close();
        break;
      case "Enter":
        e.preventDefault();
        if (e.shiftKey) {
          searchStore.previousMatch();
        } else {
          searchStore.nextMatch();
        }
        break;
      case "F3":
        e.preventDefault();
        if (e.shiftKey) {
          searchStore.previousMatch();
        } else {
          searchStore.nextMatch();
        }
        break;
    }
  }

  function handleSelectAll() {
    const blockIds = searchStore.selectAllResults();
    if (blockIds.length > 0) {
      selectionStore.deselect();
      for (const id of blockIds) {
        selectionStore.handleClick(id, { shiftKey: false, ctrlKey: true, metaKey: false });
      }
      uiStore.showToast(`Selected ${blockIds.length} matching block(s)`, "info");
    }
  }

  function toggleZoneFilter(zoneId: string) {
    if (searchStore.filterZones.includes(zoneId)) {
      searchStore.removeZoneFilter(zoneId);
    } else {
      searchStore.addZoneFilter(zoneId);
    }
  }

  function toggleBlockTypeFilter(typeId: string) {
    if (searchStore.filterBlockTypes.includes(typeId)) {
      searchStore.removeBlockTypeFilter(typeId);
    } else {
      searchStore.addBlockTypeFilter(typeId);
    }
  }
</script>

{#if searchStore.isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="search-bar" onkeydown={handleKeydown}>
    <div class="search-main">
      <span class="search-icon">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6.5" cy="6.5" r="5"/><line x1="10.5" y1="10.5" x2="15" y2="15"/></svg>
      </span>
      <input
        bind:this={inputEl}
        type="text"
        class="search-input"
        placeholder="Search context blocks..."
        value={searchStore.query}
        oninput={(e) => searchStore.setQuery(e.currentTarget.value)}
      />

      {#if searchStore.query.trim()}
        <span class="match-counter">
          {#if searchStore.hasMatches}
            {searchStore.currentMatchIndex + 1} of {searchStore.matchCount}
          {:else}
            0 results
          {/if}
        </span>
      {/if}

      <button
        class="search-btn"
        class:active={searchStore.caseSensitive}
        title="Case sensitive"
        onclick={() => searchStore.toggleCaseSensitive()}
      >Aa</button>

      <button
        class="search-btn"
        class:active={searchStore.useRegex}
        title="Use regex"
        onclick={() => searchStore.toggleUseRegex()}
      >.*</button>

      <div class="search-nav">
        <button
          class="search-btn nav-btn"
          title="Previous match (Shift+Enter)"
          disabled={!searchStore.hasMatches}
          onclick={() => searchStore.previousMatch()}
        >↑</button>
        <button
          class="search-btn nav-btn"
          title="Next match (Enter)"
          disabled={!searchStore.hasMatches}
          onclick={() => searchStore.nextMatch()}
        >↓</button>
      </div>

      <button
        class="search-btn"
        class:active={searchStore.filtersExpanded}
        title="Toggle filters"
        onclick={() => searchStore.toggleFiltersExpanded()}
      >⊞</button>

      <button
        class="search-btn close-btn"
        title="Close search (Escape)"
        onclick={() => searchStore.close()}
      >✕</button>
    </div>

    {#if searchStore.filtersExpanded}
      <div class="search-filters">
        <div class="filter-group">
          <span class="filter-label">Zones:</span>
          <div class="filter-chips">
            {#each zonesStore.zonesByDisplayOrder as zone (zone.id)}
              <button
                class="filter-chip"
                class:active={searchStore.filterZones.includes(zone.id)}
                onclick={() => toggleZoneFilter(zone.id)}
              >
                <span class="chip-dot" style:background={zone.color}></span>
                {zone.label}
              </button>
            {/each}
          </div>
        </div>

        <div class="filter-group">
          <span class="filter-label">Types:</span>
          <div class="filter-chips">
            {#each blockTypesStore.allTypes as btype (btype.id)}
              <button
                class="filter-chip"
                class:active={searchStore.filterBlockTypes.includes(btype.id)}
                onclick={() => toggleBlockTypeFilter(btype.id)}
              >
                <span class="chip-dot" style:background={btype.color}></span>
                {btype.shortLabel}
              </button>
            {/each}
          </div>
        </div>

        <div class="filter-actions">
          {#if searchStore.filterZones.length > 0 || searchStore.filterBlockTypes.length > 0}
            <button class="search-btn text-btn" onclick={() => searchStore.clearFilters()}>Clear filters</button>
          {/if}
          {#if searchStore.hasMatches}
            <button class="search-btn text-btn select-btn" onclick={handleSelectAll}>Select all results</button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .search-bar {
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
    animation: search-slide-in 0.15s ease;
  }

  @keyframes search-slide-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .search-main {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
  }

  .search-icon {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 12px;
    background: var(--bg-inset);
    border: 1px solid var(--border-subtle);
    border-radius: 3px;
    color: var(--text-primary);
    padding: 4px 8px;
    outline: none;
    min-width: 0;
  }

  .search-input:focus {
    border-color: var(--accent);
  }

  .search-input::placeholder {
    color: var(--text-faint);
  }

  .match-counter {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  .search-btn {
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 3px 6px;
    background: transparent;
    border: 1px solid var(--border-subtle);
    border-radius: 3px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s ease;
    flex-shrink: 0;
    line-height: 1;
  }

  .search-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .search-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .search-btn.active {
    background: var(--accent-subtle);
    color: var(--accent);
    border-color: var(--accent);
  }

  .search-nav {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  .nav-btn {
    padding: 3px 5px;
  }

  .close-btn {
    font-size: 10px;
    padding: 3px 5px;
  }

  /* Filters */
  .search-filters {
    padding: 6px 8px;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filter-label {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    flex-shrink: 0;
    min-width: 40px;
  }

  .filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .filter-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 2px 6px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .filter-chip:hover {
    border-color: var(--border-default);
    color: var(--text-secondary);
  }

  .filter-chip.active {
    background: var(--accent-subtle);
    border-color: var(--accent);
    color: var(--accent);
  }

  .chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .filter-actions {
    display: flex;
    gap: 8px;
  }

  .text-btn {
    border: none;
    font-size: 10px;
    padding: 2px 4px;
  }

  .select-btn {
    color: var(--accent);
  }
</style>
