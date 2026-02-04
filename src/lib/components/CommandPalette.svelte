<script lang="ts">
  interface Props {
    open?: boolean;
    onClose?: () => void;
    onCommand?: (command: string) => void;
  }

  let { open = false, onClose, onCommand }: Props = $props();

  let inputEl = $state<HTMLInputElement | null>(null);
  let query = $state('');
  let selectedIndex = $state(0);

  const commands = [
    { id: 'select-all', label: 'Select All Blocks', shortcut: 'A', category: 'Selection' },
    { id: 'deselect', label: 'Deselect All', shortcut: 'Esc', category: 'Selection' },
    { id: 'remove-selected', label: 'Remove Selected', shortcut: 'Del', category: 'Edit' },
    { id: 'snapshot', label: 'Save Snapshot', shortcut: 'S', category: 'Snapshots' },
    { id: 'load-demo', label: 'Load Demo Data', shortcut: '', category: 'Data' },
    { id: 'toggle-primacy', label: 'Toggle Primacy Zone', shortcut: '', category: 'View' },
    { id: 'toggle-middle', label: 'Toggle Middle Zone', shortcut: '', category: 'View' },
    { id: 'toggle-recency', label: 'Toggle Recency Zone', shortcut: '', category: 'View' },
  ];

  let filteredCommands = $derived(
    query.trim() === ''
      ? commands
      : commands.filter(
          (cmd) =>
            cmd.label.toLowerCase().includes(query.toLowerCase()) ||
            cmd.category.toLowerCase().includes(query.toLowerCase())
        )
  );

  $effect(() => {
    void filteredCommands;
    selectedIndex = 0;
  });

  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose?.();
        break;
    }
  }

  function executeCommand(commandId: string) {
    onCommand?.(commandId);
    onClose?.();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose?.();
  }

  $effect(() => {
    if (open && inputEl) {
      query = '';
      selectedIndex = 0;
      requestAnimationFrame(() => inputEl?.focus());
    }
  });
</script>

{#if open}
  <div
    class="palette-backdrop"
    role="dialog"
    aria-modal="true"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <div class="palette">
      <div class="palette-input-wrapper">
        <span class="palette-icon">›</span>
        <input
          bind:this={inputEl}
          bind:value={query}
          class="palette-input"
          type="text"
          placeholder="Type a command..."
        />
      </div>

      <div class="palette-results">
        {#if filteredCommands.length === 0}
          <div class="palette-empty">No commands found</div>
        {:else}
          {#each filteredCommands as command, i (command.id)}
            <button
              class="palette-item"
              class:selected={i === selectedIndex}
              onclick={() => executeCommand(command.id)}
              onmouseenter={() => (selectedIndex = i)}
            >
              <span class="item-label">{command.label}</span>
              <span class="item-meta">
                {#if command.shortcut}
                  <kbd>{command.shortcut}</kbd>
                {/if}
                <span class="item-category">{command.category}</span>
              </span>
            </button>
          {/each}
        {/if}
      </div>

      <div class="palette-footer">
        <span><kbd>↑↓</kbd> navigate</span>
        <span><kbd>↵</kbd> select</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .palette-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    z-index: 1200;
    animation: fade-in 0.1s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .palette {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    width: 90%;
    max-width: 480px;
    overflow: hidden;
    box-shadow: var(--shadow-lg);
  }

  .palette-input-wrapper {
    display: flex;
    align-items: center;
    padding: var(--space-md);
    border-bottom: 1px solid var(--border-subtle);
  }

  .palette-icon {
    font-family: var(--font-mono);
    font-size: 16px;
    color: var(--text-muted);
    margin-right: var(--space-sm);
  }

  .palette-input {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 14px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    outline: none;
  }

  .palette-input::placeholder {
    color: var(--text-faint);
  }

  .palette-results {
    max-height: 280px;
    overflow-y: auto;
  }

  .palette-empty {
    padding: var(--space-lg);
    text-align: center;
    font-size: 12px;
    color: var(--text-muted);
  }

  .palette-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s ease;
  }

  .palette-item:hover,
  .palette-item.selected {
    background: var(--bg-hover);
  }

  .palette-item.selected {
    border-left: 2px solid var(--text-primary);
  }

  .item-label {
    font-size: 13px;
    color: var(--text-primary);
  }

  .item-meta {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .item-category {
    font-size: 10px;
    color: var(--text-faint);
    text-transform: uppercase;
  }

  .palette-item kbd {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 2px 5px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 2px;
    color: var(--text-muted);
  }

  .palette-footer {
    display: flex;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    border-top: 1px solid var(--border-subtle);
    background: var(--bg-elevated);
    font-size: 10px;
    color: var(--text-faint);
  }

  .palette-footer kbd {
    font-family: var(--font-mono);
    font-size: 9px;
    padding: 1px 4px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 2px;
    margin-right: 4px;
  }
</style>
