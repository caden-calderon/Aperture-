<script lang="ts">
  import { themeStore } from '$lib/stores';
</script>

<button
  class="theme-toggle"
  onclick={() => themeStore.toggle()}
  aria-label="Toggle theme"
  title={themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {#if themeStore.isDark}
    <!-- In dark mode, show moon (current state) -->
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M14 10.5A6 6 0 115.5 2a5 5 0 008.5 8.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  {:else}
    <!-- In light mode, show sun (current state) -->
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .theme-toggle:hover {
    background: var(--bg-hover);
    border-color: var(--border-default);
    color: var(--text-primary);
  }

  .theme-toggle:active {
    transform: scale(0.96);
  }

  .theme-toggle svg {
    width: 14px;
    height: 14px;
  }
</style>
