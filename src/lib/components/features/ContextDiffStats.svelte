<script lang="ts">
  interface Props {
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    tokenDelta: number;
  }

  let { addedCount, removedCount, modifiedCount, tokenDelta }: Props = $props();
</script>

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

<style>
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
</style>
