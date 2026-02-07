<script lang="ts">
  import { uiStore } from '$lib/stores';

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    uiStore.setDensity(parseFloat(target.value));
  }
</script>

<div class="density-control">
  <div class="density-header">
    <span class="density-label">Density</span>
    <span class="density-value">{Math.round(uiStore.density * 100)}%</span>
  </div>
  <div class="density-slider">
    <button
      class="density-btn"
      onclick={() => uiStore.decreaseDensity()}
      title="Decrease density"
      aria-label="Decrease density"
    >−</button>
    <input
      type="range"
      min="0.75"
      max="1.25"
      step="0.05"
      value={uiStore.density}
      oninput={handleInput}
      aria-label="UI density"
    />
    <button
      class="density-btn"
      onclick={() => uiStore.increaseDensity()}
      title="Increase density"
      aria-label="Increase density"
    >+</button>
  </div>
</div>

<style>
  .density-control {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .density-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .density-label {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
  }

  .density-value {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .density-slider {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .density-btn {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 500;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 3px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s ease;
    padding: 0;
    line-height: 1;
  }

  .density-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-default);
    color: var(--text-primary);
  }

  .density-btn:active {
    transform: scale(0.95);
  }

  input[type="range"] {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--bg-inset);
    border-radius: 2px;
    cursor: pointer;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 2px;
    background: var(--text-primary);
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  input[type="range"]::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    background: var(--text-primary);
    border: none;
    cursor: pointer;
  }
</style>
