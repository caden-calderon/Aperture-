<script lang="ts">
  import type { Block, Role } from "$lib/types";
  import { blockTypesStore } from "$lib/stores";

  interface Props {
    block: Block | null;
    open?: boolean;
    onClose?: () => void;
    onCompress?: (level: Block["compressionLevel"]) => void;
    onMove?: (zone: Block["zone"]) => void;
    onPin?: (position: Block["pinned"]) => void;
    onRemove?: () => void;
    onRoleChange?: (role: Role, blockType?: string) => void;
  }

  let {
    block,
    open = false,
    onClose,
    onCompress,
    onMove,
    onPin,
    onRemove,
    onRoleChange,
  }: Props = $props();

  let roleDropdownOpen = $state(false);

  // Get display info for current block
  const displayTypeId = $derived(block?.blockType ?? block?.role ?? "user");
  const typeInfo = $derived(blockTypesStore.getTypeById(displayTypeId));
  const displayLabel = $derived(typeInfo?.label ?? displayTypeId);

  function handleTypeSelect(typeId: string) {
    const selectedType = blockTypesStore.getTypeById(typeId);
    const isBuiltIn = selectedType?.isBuiltIn ?? false;
    const role: Role = isBuiltIn ? (typeId as Role) : "user";
    onRoleChange?.(role, isBuiltIn ? undefined : typeId);
    roleDropdownOpen = false;
  }

  const roleColors: Record<string, string> = {
    system: "var(--role-system)",
    user: "var(--role-user)",
    assistant: "var(--role-assistant)",
    tool_use: "var(--role-tool)",
    tool_result: "var(--role-tool)",
  };

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose?.();
  }

  function formatDate(date: Date): string {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && block}
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <div class="modal" style:--role-color={roleColors[block.role]}>
      <div class="modal-header">
        <div class="modal-title">
          <div class="role-dropdown-container">
            <button
              class="role-badge role-badge-clickable"
              onclick={() => roleDropdownOpen = !roleDropdownOpen}
              title="Click to change type"
            >
              {displayLabel.toUpperCase()} <span class="dropdown-arrow">▼</span>
            </button>
            {#if roleDropdownOpen}
              <div class="role-dropdown">
                {#each blockTypesStore.allTypes as type (type.id)}
                  <button
                    class="role-dropdown-item"
                    class:active={displayTypeId === type.id}
                    onclick={() => handleTypeSelect(type.id)}
                  >
                    <span class="type-dot" style:background={type.color}></span>
                    {type.label}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
          {#if block.metadata.toolName}
            <span class="tool-name">{block.metadata.toolName}</span>
          {/if}
        </div>
        <button class="close-btn" onclick={onClose}>×</button>
      </div>

      <div class="modal-meta">
        <div class="meta-item">
          <span class="meta-label">Tokens</span>
          <span class="meta-value">{block.tokens.toLocaleString()}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Zone</span>
          <span class="meta-value">{block.zone}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Compression</span>
          <span class="meta-value">{block.compressionLevel}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Created</span>
          <span class="meta-value">{formatDate(block.timestamp)}</span>
        </div>
      </div>

      <div class="modal-content">
        <pre>{block.content}</pre>
      </div>

      <div class="modal-actions">
        <div class="action-group">
          <span class="action-label">Zone</span>
          <div class="action-buttons">
            <button class:active={block.zone === "primacy"} onclick={() => onMove?.("primacy")}>Primacy</button>
            <button class:active={block.zone === "middle"} onclick={() => onMove?.("middle")}>Middle</button>
            <button class:active={block.zone === "recency"} onclick={() => onMove?.("recency")}>Recency</button>
          </div>
        </div>

        <div class="action-group">
          <span class="action-label">Compression</span>
          <div class="action-buttons">
            <button class:active={block.compressionLevel === "original"} onclick={() => onCompress?.("original")}>Original</button>
            <button class:active={block.compressionLevel === "trimmed"} onclick={() => onCompress?.("trimmed")}>Trimmed</button>
            <button class:active={block.compressionLevel === "summarized"} onclick={() => onCompress?.("summarized")}>Summarized</button>
            <button class:active={block.compressionLevel === "minimal"} onclick={() => onCompress?.("minimal")}>Minimal</button>
          </div>
        </div>

        <div class="action-group">
          <span class="action-label">Pin</span>
          <div class="action-buttons">
            <button class:active={block.pinned === "top"} onclick={() => onPin?.(block?.pinned === "top" ? null : "top")}>Top</button>
            <button class:active={block.pinned === "bottom"} onclick={() => onPin?.(block?.pinned === "bottom" ? null : "bottom")}>Bottom</button>
          </div>
        </div>

        <div class="action-group action-danger">
          <button class="btn-danger" onclick={onRemove}>Remove Block</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--bg-base) 85%, transparent);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: modal-fade-in 0.15s ease;
  }

  @keyframes modal-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modal-slide-in {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    width: 90%;
    max-width: 560px;
    max-height: 75vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
    animation: modal-slide-in 0.2s cubic-bezier(0.34, 1.2, 0.64, 1);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .modal-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

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

  .tool-name {
    font-size: 11px;
    color: var(--text-muted);
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

  .modal-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-inset);
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .meta-label {
    font-size: 9px;
    text-transform: uppercase;
    color: var(--text-faint);
    letter-spacing: 0.3px;
  }

  .meta-value {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .modal-content {
    flex: 1;
    overflow: auto;
    padding: 14px;
    background: var(--bg-elevated);
  }

  .modal-content pre {
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.55;
    color: var(--text-secondary);
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  }

  .modal-actions {
    padding: 12px 14px;
    border-top: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .action-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .action-label {
    font-size: 9px;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.4px;
    width: 72px;
    flex-shrink: 0;
  }

  .action-buttons {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .action-buttons button {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 4px 8px;
    border-radius: 3px;
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .action-buttons button:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }

  .action-buttons button.active {
    background: var(--text-primary);
    border-color: var(--text-primary);
    color: var(--bg-surface);
  }

  .action-danger {
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px dashed var(--border-subtle);
  }

  .btn-danger {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 5px 10px;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--semantic-danger) 50%, transparent);
    background: transparent;
    color: var(--semantic-danger);
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .btn-danger:hover {
    background: var(--semantic-danger);
    border-color: var(--semantic-danger);
    color: var(--bg-surface);
  }
</style>
