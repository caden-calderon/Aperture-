<script lang="ts">
  import type { Toast } from "$lib/stores/ui.svelte";

  interface Props {
    toasts: Toast[];
    onDismiss?: (id: string) => void;
  }

  let { toasts, onDismiss }: Props = $props();

  const typeConfig: Record<Toast["type"], { icon: string; color: string }> = {
    info: { icon: "i", color: "var(--semantic-info)" },
    success: { icon: "✓", color: "var(--semantic-success)" },
    warning: { icon: "!", color: "var(--semantic-warning)" },
    error: { icon: "×", color: "var(--semantic-danger)" },
  };
</script>

<div class="toast-container" role="region" aria-label="Notifications">
  {#each toasts as toast (toast.id)}
    <div class="toast" style:--toast-color={typeConfig[toast.type].color} role="alert">
      <span class="toast-icon">{typeConfig[toast.type].icon}</span>
      <span class="toast-message">{toast.message}</span>
      <button class="toast-dismiss" onclick={() => onDismiss?.(toast.id)}>×</button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: var(--space-lg);
    right: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    z-index: 1100;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-left: 3px solid var(--toast-color);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
    pointer-events: auto;
    animation: slide-up 0.2s ease;
    max-width: 320px;
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .toast-icon {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--toast-color);
    color: var(--bg-surface);
    border-radius: 2px;
    flex-shrink: 0;
  }

  .toast-message {
    font-size: 12px;
    color: var(--text-primary);
    flex: 1;
  }

  .toast-dismiss {
    font-size: 14px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 2px;
  }

  .toast-dismiss:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
</style>
