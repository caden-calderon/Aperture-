<script lang="ts">
  import { onMount } from "svelte";

  // Placeholder state - will be replaced with real stores
  let tokensUsed = $state(0);
  let tokensLimit = $state(200000);
  let tokensFree = $derived(tokensLimit - tokensUsed);

  // Demo animation on mount
  onMount(() => {
    // Animate token count up for demo effect
    const target = 67420;
    const duration = 1500;
    const start = performance.now();

    function animate(time: number) {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      tokensUsed = Math.floor(target * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);
  });

  function formatNumber(n: number): string {
    return n.toLocaleString();
  }
</script>

<div class="app">
  <!-- Header -->
  <header class="header">
    <div class="logo">
      <div class="logo-icon">⬡</div>
      <span class="logo-text">
        APERTURE
        <span class="logo-version">v0.1</span>
      </span>
    </div>
    <div class="header-actions">
      <button class="btn">◆ Load Demo</button>
      <button class="btn">↑ Import</button>
      <button class="btn btn-accent">↓ Export</button>
    </div>
  </header>

  <!-- Token Budget Bar -->
  <div class="token-bar">
    <div class="token-bar-header">
      <span class="token-bar-label">TOKEN BUDGET</span>
      <div class="token-bar-stats">
        <span>Used: <strong>{formatNumber(tokensUsed)}</strong></span>
        <span>Free: <strong>{formatNumber(tokensFree)}</strong></span>
        <span>Limit: <strong>{formatNumber(tokensLimit)}</strong></span>
      </div>
    </div>
    <div class="token-bar-track">
      <div
        class="token-bar-fill"
        style="width: {(tokensUsed / tokensLimit) * 100}%"
      ></div>
    </div>
    <div class="token-bar-zones">
      <div class="zone-label">
        <div class="zone-dot zone-dot-primacy"></div>
        Primacy
      </div>
      <div class="zone-label">
        <div class="zone-dot zone-dot-middle"></div>
        Middle
      </div>
      <div class="zone-label">
        <div class="zone-dot zone-dot-recency"></div>
        Recency
      </div>
    </div>
  </div>

  <!-- Main Layout -->
  <div class="main-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-section">
        <h3 class="sidebar-title">SNAPSHOTS</h3>
        <div class="sidebar-placeholder">No snapshots yet</div>
        <button class="btn btn-full">+ Save Snapshot</button>
      </div>

      <div class="sidebar-section">
        <h3 class="sidebar-title">BLOCK TYPES</h3>
        <div class="filter-list">
          <div class="filter-item">
            <div class="filter-dot" style="background: var(--accent-system)"></div>
            system
            <span class="filter-tokens">1,247</span>
          </div>
          <div class="filter-item">
            <div class="filter-dot" style="background: var(--accent-user)"></div>
            user
            <span class="filter-tokens">12,840</span>
          </div>
          <div class="filter-item">
            <div class="filter-dot" style="background: var(--accent-assistant)"></div>
            assistant
            <span class="filter-tokens">38,920</span>
          </div>
          <div class="filter-item">
            <div class="filter-dot" style="background: var(--accent-tool)"></div>
            tool_result
            <span class="filter-tokens">14,413</span>
          </div>
        </div>
      </div>

      <div class="sidebar-section sidebar-section-grow">
        <h3 class="sidebar-title">KEYBOARD</h3>
        <div class="shortcuts">
          <div><kbd>A</kbd> Select all</div>
          <div><kbd>Esc</kbd> Deselect</div>
          <div><kbd>Del</kbd> Remove</div>
          <div><kbd>C</kbd> Condense</div>
          <div><kbd>S</kbd> Snapshot</div>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="content">
      <div class="content-toolbar">
        <div class="selection-info">
          <strong>0</strong> blocks selected · <strong>0</strong> tokens
        </div>
        <div class="toolbar-actions">
          <button class="btn">Select All</button>
          <button class="btn">Deselect</button>
          <button class="btn btn-condense">✦ Condense</button>
          <button class="btn btn-danger">✕ Remove</button>
        </div>
      </div>

      <div class="zones-container">
        <!-- Placeholder for zones -->
        <div class="placeholder-message">
          <div class="placeholder-icon">⬡</div>
          <h2>Aperture is Running</h2>
          <p>
            The UI shell is ready. Phase 0 will build out the full block visualization,
            zones, drag-and-drop, and canvas effects.
          </p>
          <p class="placeholder-hint">
            Next: Validate proxy concept, then build UI components
          </p>
        </div>
      </div>
    </main>
  </div>
</div>

<style>
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-deep);
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, var(--accent-primacy), var(--accent-recency));
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: var(--bg-deep);
  }

  .logo-text {
    font-family: "JetBrains Mono", monospace;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 1px;
    color: var(--text-primary);
  }

  .logo-version {
    font-size: 10px;
    color: var(--text-dim);
    font-weight: 400;
    margin-left: 4px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  /* Buttons */
  .btn {
    font-family: "IBM Plex Mono", monospace;
    font-size: 11px;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 5px;
    border: 1px solid var(--border-dim);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-active);
  }

  .btn-accent {
    border-color: rgba(78, 205, 196, 0.3);
    color: var(--accent-primacy);
  }

  .btn-accent:hover {
    background: rgba(78, 205, 196, 0.1);
    border-color: var(--accent-primacy);
  }

  .btn-danger {
    border-color: rgba(255, 71, 87, 0.3);
    color: var(--accent-danger);
  }

  .btn-danger:hover {
    background: rgba(255, 71, 87, 0.1);
    border-color: var(--accent-danger);
  }

  .btn-condense {
    border-color: rgba(240, 147, 251, 0.3);
    color: var(--accent-condense);
  }

  .btn-condense:hover {
    background: rgba(240, 147, 251, 0.1);
    border-color: var(--accent-condense);
  }

  .btn-full {
    width: 100%;
    justify-content: center;
    margin-top: 8px;
  }

  /* Token Bar */
  .token-bar {
    padding: 10px 20px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0;
  }

  .token-bar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .token-bar-label {
    font-family: "IBM Plex Mono", monospace;
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 1px;
  }

  .token-bar-stats {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--text-secondary);
    display: flex;
    gap: 16px;
  }

  .token-bar-stats strong {
    color: var(--text-primary);
  }

  .token-bar-track {
    height: 6px;
    background: var(--token-free);
    border-radius: 3px;
    overflow: hidden;
  }

  .token-bar-fill {
    height: 100%;
    background: linear-gradient(
      90deg,
      var(--accent-primacy) 0%,
      var(--accent-primacy) 20%,
      var(--accent-middle) 20%,
      var(--accent-middle) 70%,
      var(--accent-recency) 70%,
      var(--accent-recency) 100%
    );
    transition: width 0.3s ease;
  }

  .token-bar-zones {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
  }

  .zone-label {
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .zone-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .zone-dot-primacy {
    background: var(--accent-primacy);
  }
  .zone-dot-middle {
    background: var(--accent-middle);
  }
  .zone-dot-recency {
    background: var(--accent-recency);
  }

  /* Main Layout */
  .main-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* Sidebar */
  .sidebar {
    width: 220px;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-dim);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .sidebar-section {
    padding: 12px;
    border-bottom: 1px solid var(--border-dim);
  }

  .sidebar-section-grow {
    flex: 1;
    border-bottom: none;
  }

  .sidebar-title {
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 1.5px;
    color: var(--text-dim);
    margin-bottom: 8px;
  }

  .sidebar-placeholder {
    font-size: 11px;
    color: var(--text-dim);
    font-style: italic;
    padding: 4px 0;
  }

  .filter-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .filter-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-secondary);
    transition: background 0.1s;
  }

  .filter-item:hover {
    background: var(--bg-elevated);
  }

  .filter-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .filter-tokens {
    margin-left: auto;
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    color: var(--text-dim);
  }

  .shortcuts {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 11px;
    color: var(--text-dim);
  }

  kbd {
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
    padding: 2px 5px;
    background: var(--bg-deep);
    border: 1px solid var(--border-dim);
    border-radius: 3px;
    margin-right: 6px;
  }

  /* Content Area */
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .content-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0;
  }

  .selection-info {
    font-family: "IBM Plex Mono", monospace;
    font-size: 11px;
    color: var(--text-dim);
  }

  .selection-info strong {
    color: var(--accent-primacy);
  }

  .toolbar-actions {
    display: flex;
    gap: 6px;
  }

  .zones-container {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder-message {
    text-align: center;
    max-width: 400px;
  }

  .placeholder-icon {
    font-size: 48px;
    margin-bottom: 16px;
    background: linear-gradient(135deg, var(--accent-primacy), var(--accent-recency));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .placeholder-message h2 {
    font-family: "Space Grotesk", sans-serif;
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
  }

  .placeholder-message p {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 8px;
  }

  .placeholder-hint {
    font-family: "IBM Plex Mono", monospace;
    font-size: 12px;
    color: var(--text-dim);
    padding-top: 8px;
    border-top: 1px solid var(--border-dim);
    margin-top: 16px;
  }
</style>
