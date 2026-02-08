<script lang="ts">
  import { blockTypesStore } from "$lib/stores";

  interface Props {
    displayLabel: string;
    displayTypeId: string;
    open: boolean;
    onToggle?: () => void;
    onSelect?: (typeId: string) => void;
  }

  let {
    displayLabel,
    displayTypeId,
    open,
    onToggle,
    onSelect,
  }: Props = $props();
</script>

<div class="role-dropdown-container">
  <button
    class="role-badge role-badge-clickable"
    onclick={onToggle}
    title="Click to change type"
  >
    {displayLabel.toUpperCase()} <span class="dropdown-arrow">▼</span>
  </button>
  {#if open}
    <div class="role-dropdown">
      {#each blockTypesStore.allTypes as type (type.id)}
        <button
          class="role-dropdown-item"
          class:active={displayTypeId === type.id}
          onclick={() => onSelect?.(type.id)}
        >
          <span class="type-dot" style:background={type.color}></span>
          {type.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .role-dropdown-container {
    position: relative;
  }

  .role-badge {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    padding: 3px 6px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--role-color) 18%, transparent);
    color: var(--role-color);
    letter-spacing: 0.2px;
  }

  .role-badge-clickable {
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.1s ease;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .role-badge-clickable:hover {
    border-color: var(--role-color);
    background: color-mix(in srgb, var(--role-color) 25%, transparent);
  }

  .dropdown-arrow {
    font-size: 7px;
    opacity: 0.7;
  }

  .role-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: 4px;
    box-shadow: var(--shadow-md);
    z-index: 100;
    min-width: 100px;
    overflow: hidden;
  }

  .role-dropdown-item {
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

  .role-dropdown-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .role-dropdown-item.active {
    background: var(--accent-subtle);
    color: var(--text-primary);
    font-weight: 600;
  }

  .type-dot {
    width: 6px;
    height: 6px;
    border-radius: 1px;
    flex-shrink: 0;
  }
</style>
