<script lang="ts">
  import Terminal from "./Terminal.svelte";
  import { terminalStore } from "$lib/stores/terminal.svelte";

  let terminalRef = $state<ReturnType<typeof Terminal> | null>(null);

  export function focusTerminal() {
    terminalRef?.focus();
  }

  export function updateTheme() {
    terminalRef?.updateTheme();
  }

  export function clearTerminal() {
    terminalRef?.clear();
  }

  function handleClear() {
    terminalRef?.clear();
  }

  function handleClose() {
    terminalStore.hide();
  }

  function handleTogglePosition() {
    terminalStore.togglePosition();
  }

  function handleExpandFromCollapsed() {
    const isBottom = terminalStore.position === 'bottom';
    if (isBottom) {
      terminalStore.setHeight(300);
    } else {
      terminalStore.setWidth(400);
    }
  }
</script>

{#if terminalStore.isVisible}
  {#if terminalStore.isCollapsed}
    <!-- Collapsed bar — icon + subtle label -->
    <button
      class="terminal-collapsed"
      class:terminal-collapsed-vertical={terminalStore.position === 'right'}
      onclick={handleExpandFromCollapsed}
      title="Expand terminal"
    >
      <!-- >_ terminal icon -->
      <svg class="terminal-collapsed-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 6 7 9 4 12" />
        <line x1="9" y1="12" x2="13" y2="12" />
      </svg>
      {#if terminalStore.position === 'bottom'}
        <span class="terminal-collapsed-label">Terminal</span>
      {/if}
    </button>
  {:else}
    <div
      class="terminal-panel"
      class:terminal-right={terminalStore.position === 'right'}
    >
      <div class="terminal-header">
        <div class="terminal-title">
          <span class="terminal-icon">&#x25B8;</span>
          <span>Terminal</span>
        </div>
        <div class="terminal-actions">
          <button class="terminal-btn" title="Clear" onclick={handleClear}>
            <!-- Eraser icon -->
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 14h8" />
              <path d="M5.5 14l-3.2-3.2a2 2 0 010-2.83l6.37-6.37a2 2 0 012.83 0l1.6 1.6a2 2 0 010 2.83L8.5 14" />
              <path d="M6 10l-2-2" />
            </svg>
          </button>
          <button class="terminal-btn" title="Toggle position (bottom/right)" onclick={handleTogglePosition}>
            {#if terminalStore.position === 'bottom'}
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="1" y="1" width="14" height="14" rx="1" />
                <line x1="11" y1="1" x2="11" y2="15" />
              </svg>
            {:else}
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="1" y="1" width="14" height="14" rx="1" />
                <line x1="1" y1="11" x2="15" y2="11" />
              </svg>
            {/if}
          </button>
          <button class="terminal-btn" title="Close terminal (Ctrl+T)" onclick={handleClose}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      <div class="terminal-body">
        <Terminal bind:this={terminalRef} />
      </div>
    </div>
  {/if}
{/if}

<style>
  /* Collapsed bar */
  .terminal-collapsed {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-subtle);
    border-left: none;
    border-right: none;
    border-bottom: none;
    cursor: pointer;
    transition: background 0.1s ease;
    height: 100%;
    width: 100%;
    padding: 0 12px;
  }

  .terminal-collapsed:hover {
    background: var(--bg-hover);
  }

  .terminal-collapsed:hover .terminal-collapsed-icon {
    color: var(--text-primary);
  }

  .terminal-collapsed-icon {
    color: var(--text-muted);
    flex-shrink: 0;
    transition: color 0.1s ease;
  }

  .terminal-collapsed-label {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .terminal-collapsed.terminal-collapsed-vertical {
    border-top: none;
    border-left: 1px solid var(--border-subtle);
    flex-direction: column;
    padding: 12px 0;
    gap: 0;
  }

  /* Expanded panel */
  .terminal-panel {
    display: flex;
    flex-direction: column;
    background: var(--bg-base);
    border-top: 1px solid var(--border-default);
    overflow: hidden;
    height: 100%;
    width: 100%;
  }

  .terminal-panel.terminal-right {
    border-top: none;
    border-left: 1px solid var(--border-default);
  }

  .terminal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 8px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
  }

  .terminal-title {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .terminal-icon {
    font-size: 10px;
    color: var(--semantic-success);
  }

  .terminal-actions {
    display: flex;
    gap: 2px;
  }

  .terminal-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s ease;
    padding: 0;
  }

  .terminal-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-subtle);
  }

  .terminal-body {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
</style>
