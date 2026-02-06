<script lang="ts">
  import type { Block, Zone } from "$lib/types";
  import { zonesStore } from "$lib/stores";

  interface Props {
    block: Block | null;
    x: number;
    y: number;
    visible: boolean;
    onClose: () => void;
    onPin: (position: "top" | "bottom" | null) => void;
    onMove: (zone: Zone) => void;
    onCompress: (level: Block["compressionLevel"]) => void;
    onCopy: () => void;
    onRemove: () => void;
    onOpen: () => void;
  }

  let {
    block,
    x,
    y,
    visible,
    onClose,
    onPin,
    onMove,
    onCompress,
    onCopy,
    onRemove,
    onOpen,
  }: Props = $props();

  let menuRef = $state<HTMLElement | null>(null);

  // Submenu state
  let activeSubmenu = $state<string | null>(null);

  // Close on click outside
  function handleClickOutside(e: MouseEvent) {
    if (menuRef && !menuRef.contains(e.target as Node)) {
      onClose();
    }
  }

  // Close on Escape
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  // Adjust position to keep menu in viewport
  const adjustedPos = $derived.by(() => {
    const menuWidth = 180;
    const menuHeight = 300;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
    const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
    return {
      x: x + menuWidth > vw ? vw - menuWidth - 8 : x,
      y: y + menuHeight > vh ? vh - menuHeight - 8 : y,
    };
  });

  function handleAction(action: () => void) {
    action();
    onClose();
  }
</script>

<svelte:window
  onmousedown={(e) => { if (visible) handleClickOutside(e); }}
  onkeydown={(e) => { if (visible) handleKeydown(e); }}
/>

{#if visible && block}
  <div
    class="context-menu"
    bind:this={menuRef}
    style:left="{adjustedPos.x}px"
    style:top="{adjustedPos.y}px"
  >
    <button class="menu-item" onclick={() => handleAction(onOpen)}>
      <span class="menu-icon">⎋</span> Open Details
      <span class="menu-shortcut">Enter</span>
    </button>
    <button class="menu-item" onclick={() => handleAction(onCopy)}>
      <span class="menu-icon">⎘</span> Copy Content
    </button>

    <div class="menu-separator"></div>

    <!-- Pin submenu -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="menu-item has-submenu"
      onmouseenter={() => activeSubmenu = 'pin'}
      onmouseleave={() => activeSubmenu = null}
    >
      <span class="menu-icon">📌</span> Pin
      <span class="menu-arrow">›</span>
      {#if activeSubmenu === 'pin'}
        <div class="submenu">
          <button class="menu-item" onclick={() => handleAction(() => onPin('top'))}>Pin to Top</button>
          <button class="menu-item" onclick={() => handleAction(() => onPin('bottom'))}>Pin to Bottom</button>
          {#if block.pinned}
            <button class="menu-item" onclick={() => handleAction(() => onPin(null))}>Unpin</button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Move submenu -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="menu-item has-submenu"
      onmouseenter={() => activeSubmenu = 'move'}
      onmouseleave={() => activeSubmenu = null}
    >
      <span class="menu-icon">↹</span> Move to Zone
      <span class="menu-arrow">›</span>
      {#if activeSubmenu === 'move'}
        <div class="submenu">
          {#each zonesStore.zonesByDisplayOrder as z (z.id)}
            {#if z.id !== block.zone}
              <button class="menu-item" onclick={() => handleAction(() => onMove(z.id as Zone))}>
                <span class="zone-dot" style:background={z.color}></span>
                {z.label}
              </button>
            {/if}
          {/each}
        </div>
      {/if}
    </div>

    <!-- Compress submenu -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="menu-item has-submenu"
      onmouseenter={() => activeSubmenu = 'compress'}
      onmouseleave={() => activeSubmenu = null}
    >
      <span class="menu-icon">⊘</span> Compress
      <span class="menu-arrow">›</span>
      {#if activeSubmenu === 'compress'}
        <div class="submenu">
          <button class="menu-item" class:active={block.compressionLevel === 'original'} onclick={() => handleAction(() => onCompress('original'))}>Original</button>
          <button class="menu-item" class:active={block.compressionLevel === 'trimmed'} onclick={() => handleAction(() => onCompress('trimmed'))}>Trimmed</button>
          <button class="menu-item" class:active={block.compressionLevel === 'summarized'} onclick={() => handleAction(() => onCompress('summarized'))}>Summarized</button>
          <button class="menu-item" class:active={block.compressionLevel === 'minimal'} onclick={() => handleAction(() => onCompress('minimal'))}>Minimal</button>
        </div>
      {/if}
    </div>

    <div class="menu-separator"></div>

    <button class="menu-item menu-danger" onclick={() => handleAction(onRemove)}>
      <span class="menu-icon">✕</span> Remove
    </button>
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    z-index: 1000;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: 6px;
    padding: 4px 0;
    min-width: 180px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2), 0 1px 4px rgba(0,0,0,0.1);
    font-family: var(--font-mono);
    font-size: 11px;
    animation: menu-appear 0.08s ease-out;
  }

  @keyframes menu-appear {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 12px;
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    transition: background 0.06s ease;
    position: relative;
    font-family: inherit;
    font-size: inherit;
  }

  .menu-item:hover {
    background: var(--bg-hover);
  }

  .menu-item.active {
    color: var(--accent);
    font-weight: 600;
  }

  .menu-item.menu-danger {
    color: var(--semantic-danger);
  }

  .menu-item.menu-danger:hover {
    background: color-mix(in srgb, var(--semantic-danger) 15%, transparent);
  }

  .menu-icon {
    width: 16px;
    text-align: center;
    flex-shrink: 0;
    font-size: 12px;
  }

  .menu-shortcut {
    margin-left: auto;
    color: var(--text-faint);
    font-size: 10px;
  }

  .menu-arrow {
    margin-left: auto;
    color: var(--text-muted);
    font-size: 12px;
  }

  .menu-separator {
    height: 1px;
    background: var(--border-subtle);
    margin: 4px 8px;
  }

  .has-submenu {
    position: relative;
  }

  .submenu {
    position: absolute;
    left: 100%;
    top: -4px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: 6px;
    padding: 4px 0;
    min-width: 140px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: menu-appear 0.06s ease-out;
  }

  .zone-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
