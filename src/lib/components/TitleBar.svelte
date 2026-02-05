<script lang="ts">
  // TitleBar uses CSS variables from the theme, no need to import store

  // Window controls (Tauri APIs)
  async function minimize() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  }

  async function toggleMaximize() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    if (await win.isMaximized()) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
  }

  async function close() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  }
</script>

<div class="titlebar" data-tauri-drag-region>
  <div class="titlebar-left">
    <div class="logo">
      <span class="logo-mark">A</span>
    </div>
  </div>

  <div class="titlebar-center" data-tauri-drag-region>
    <span class="titlebar-title">Aperture</span>
  </div>

  <div class="titlebar-right">
    <button class="window-btn" onclick={minimize} title="Minimize">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <rect x="0" y="4" width="10" height="2" fill="currentColor"/>
      </svg>
    </button>
    <button class="window-btn" onclick={toggleMaximize} title="Maximize">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <rect x="0" y="0" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
      </svg>
    </button>
    <button class="window-btn window-btn-close" onclick={close} title="Close">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    padding: 0 8px;
    user-select: none;
    -webkit-user-select: none;
  }

  .titlebar-left,
  .titlebar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100px;
  }

  .titlebar-right {
    justify-content: flex-end;
  }

  .titlebar-center {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .titlebar-title {
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    letter-spacing: -0.01em;
  }

  .logo {
    display: flex;
    align-items: center;
  }

  .logo-mark {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--text-primary);
    color: var(--bg-surface);
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 600;
    border-radius: 3px;
  }

  .window-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .window-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .window-btn-close:hover {
    background: #e53935;
    color: white;
  }
</style>
