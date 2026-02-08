<script lang="ts">
  import type { Block } from "$lib/types";
  import { zonesStore } from "$lib/stores";

  interface Props {
    currentZoneId: Block["zone"];
    currentZoneLabel: string;
    open: boolean;
    onToggle?: () => void;
    onSelect?: (zoneId: Block["zone"]) => void;
  }

  let {
    currentZoneId,
    currentZoneLabel,
    open,
    onToggle,
    onSelect,
  }: Props = $props();
</script>

<div class="zone-dropdown-container">
  <button class="zone-dropdown-trigger" onclick={onToggle}>
    <span class="zone-dot-small" style:background={zonesStore.getZoneColor(currentZoneId)}></span>
    {currentZoneLabel}
    <span class="dropdown-arrow">▼</span>
  </button>
  {#if open}
    <div class="zone-dropdown">
      {#each zonesStore.zonesByDisplayOrder as zone (zone.id)}
        <button
          class="zone-dropdown-item"
          class:active={currentZoneId === zone.id}
          onclick={() => onSelect?.(zone.id as Block["zone"])}
        >
          <span class="zone-dot-small" style:background={zone.color}></span>
          {zone.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .zone-dropdown-container {
    position: relative;
  }

  .dropdown-arrow {
    font-size: 7px;
    opacity: 0.7;
  }

  .zone-dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    font-family: var(--font-mono);
    font-size: 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 3px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .zone-dropdown-trigger:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
    color: var(--text-primary);
  }

  .zone-dot-small {
    width: 6px;
    height: 6px;
    border-radius: 1px;
    flex-shrink: 0;
  }

  .zone-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: 4px;
    box-shadow: var(--shadow-md);
    z-index: 100;
    min-width: 120px;
    overflow: hidden;
  }

  .zone-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    font-family: var(--font-mono);
    font-size: 10px;
    text-align: left;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.1s ease;
  }

  .zone-dropdown-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .zone-dropdown-item.active {
    background: var(--accent-subtle);
    color: var(--text-primary);
    font-weight: 600;
  }
</style>
