<script lang="ts">
  import { themeStore, type ThemeColors } from '$lib/stores/theme.svelte';

  let expanded = $state(false);
  let newThemeName = $state('');
  let showSaveDialog = $state(false);
  let copiedColor = $state<string | null>(null);
  let activeColorPicker = $state<keyof ThemeColors | null>(null);

  const colorLabels: Record<keyof ThemeColors, string> = {
    bgBase: 'Background',
    bgSurface: 'Surface',
    bgElevated: 'Elevated',
    bgHover: 'Hover',
    bgMuted: 'Muted',
    borderSubtle: 'Border Light',
    borderDefault: 'Border',
    textPrimary: 'Text',
    textSecondary: 'Text Secondary',
    textMuted: 'Text Muted',
    accent: 'Accent',
  };

  // Get unique colors from current theme for the palette
  function getThemePalette(): string[] {
    const colors = Object.values(themeStore.effectiveColors);
    return [...new Set(colors)];
  }

  function handleColorChange(key: keyof ThemeColors, e: Event) {
    const target = e.target as HTMLInputElement;
    themeStore.setColor(key, target.value);
  }

  function handlePaletteClick(color: string) {
    if (activeColorPicker) {
      themeStore.setColor(activeColorPicker, color);
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(color);
      copiedColor = color;
      setTimeout(() => copiedColor = null, 1500);
    }
  }

  function handleSaveTheme() {
    if (newThemeName.trim()) {
      themeStore.saveCurrentAsPreset(newThemeName.trim());
      newThemeName = '';
      showSaveDialog = false;
    }
  }

  function handleDeletePreset(id: string) {
    if (confirm('Delete this custom theme?')) {
      themeStore.deleteCustomPreset(id);
    }
  }
</script>

<div class="theme-customizer">
  <button class="section-header" onclick={() => expanded = !expanded}>
    <span class="section-title">Theme</span>
    <span class="section-toggle">{expanded ? '−' : '+'}</span>
  </button>

  {#if expanded}
    <div class="section-content">
      <!-- Presets -->
      <div class="preset-section">
        <span class="label">Presets</span>
        <div class="preset-grid">
          {#each themeStore.builtInPresets as preset (preset.id)}
            <button
              class="preset-btn"
              class:active={themeStore.currentPresetId === preset.id}
              onclick={() => themeStore.setPreset(preset.id)}
              title={preset.name}
            >
              <span
                class="preset-swatch"
                style:background={preset.colors.bgBase}
                style:border-color={preset.colors.borderDefault}
              >
                <span class="preset-text" style:color={preset.colors.textPrimary}>A</span>
              </span>
              <span class="preset-name">{preset.name}</span>
            </button>
          {/each}
        </div>

        {#if themeStore.savedThemes.length > 0}
          <span class="label" style="margin-top: 8px; display: block;">Custom Themes</span>
          <div class="preset-grid">
            {#each themeStore.savedThemes as preset (preset.id)}
              <div class="preset-item">
                <button
                  class="preset-btn"
                  class:active={themeStore.currentPresetId === preset.id}
                  onclick={() => themeStore.setPreset(preset.id)}
                  title={preset.name}
                >
                  <span
                    class="preset-swatch"
                    style:background={preset.colors.bgBase}
                    style:border-color={preset.colors.borderDefault}
                  >
                    <span class="preset-text" style:color={preset.colors.textPrimary}>A</span>
                  </span>
                  <span class="preset-name">{preset.name}</span>
                </button>
                <button
                  class="delete-btn"
                  onclick={() => handleDeletePreset(preset.id)}
                  title="Delete"
                >×</button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Color Palette (click to copy, or apply to active picker) -->
      <div class="palette-section">
        <span class="label">
          Theme Palette
          {#if copiedColor}
            <span class="copied-badge">Copied!</span>
          {/if}
          {#if activeColorPicker}
            <span class="active-badge">Click to apply to {colorLabels[activeColorPicker]}</span>
          {/if}
        </span>
        <div class="palette-grid">
          {#each getThemePalette() as color}
            <button
              class="palette-swatch"
              style:background={color}
              onclick={() => handlePaletteClick(color)}
              title={color}
            ></button>
          {/each}
        </div>
      </div>

      <!-- Color Pickers -->
      <div class="colors-section">
        <span class="label">Customize Colors</span>
        <div class="color-grid">
          {#each Object.entries(colorLabels) as [key, label]}
            <div
              class="color-row"
              class:active={activeColorPicker === key}
            >
              <button
                class="color-label-btn"
                onclick={() => activeColorPicker = activeColorPicker === key ? null : key as keyof ThemeColors}
                title="Click to enable palette apply"
              >
                {label}
                {#if activeColorPicker === key}
                  <span class="target-icon">*</span>
                {/if}
              </button>
              <div class="color-input-wrap">
                <input
                  type="color"
                  value={themeStore.effectiveColors[key as keyof ThemeColors]}
                  oninput={(e) => handleColorChange(key as keyof ThemeColors, e)}
                />
                <span class="color-value">
                  {themeStore.effectiveColors[key as keyof ThemeColors]}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        {#if Object.keys(themeStore.customColors).length > 0}
          <button class="action-btn" onclick={() => themeStore.resetCustomColors()}>
            Reset Colors
          </button>
        {/if}
        <button class="action-btn action-btn-primary" onclick={() => showSaveDialog = true}>
          Save as Preset
        </button>
      </div>

      {#if showSaveDialog}
        <div class="save-dialog">
          <input
            type="text"
            placeholder="Theme name..."
            bind:value={newThemeName}
            onkeydown={(e) => e.key === 'Enter' && handleSaveTheme()}
          />
          <button class="save-btn" onclick={handleSaveTheme}>Save</button>
          <button class="cancel-btn" onclick={() => showSaveDialog = false}>Cancel</button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .theme-customizer {
    border-top: 1px solid var(--border-subtle);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .section-header:hover {
    background: var(--bg-hover);
  }

  .section-title {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
  }

  .section-toggle {
    font-size: 12px;
    color: var(--text-muted);
  }

  .section-content {
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .label {
    display: block;
    font-size: 9px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: var(--text-muted);
    margin-bottom: 6px;
  }

  .preset-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .preset-item {
    position: relative;
  }

  .preset-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.1s ease;
    min-width: 52px;
  }

  .preset-btn:hover {
    border-color: var(--border-default);
  }

  .preset-btn.active {
    border-color: var(--accent);
    background: var(--accent-subtle);
  }

  .preset-swatch {
    width: 28px;
    height: 20px;
    border-radius: 3px;
    border: 1px solid;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preset-text {
    font-size: 10px;
    font-weight: 600;
  }

  .preset-name {
    font-size: 8px;
    color: var(--text-muted);
    max-width: 48px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .delete-btn {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 14px;
    height: 14px;
    font-size: 10px;
    line-height: 1;
    background: var(--semantic-danger);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: none;
  }

  .preset-item:hover .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Palette */
  .palette-section {
    margin-bottom: 4px;
  }

  .palette-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .palette-swatch {
    width: 20px;
    height: 20px;
    border: 1px solid var(--border-default);
    border-radius: 3px;
    cursor: pointer;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
    padding: 0;
  }

  .palette-swatch:hover {
    transform: scale(1.15);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 1;
  }

  .copied-badge,
  .active-badge {
    font-size: 8px;
    padding: 1px 4px;
    border-radius: 2px;
    margin-left: 4px;
    text-transform: none;
    letter-spacing: 0;
  }

  .copied-badge {
    background: var(--semantic-success);
    color: white;
  }

  .active-badge {
    background: var(--accent);
    color: var(--bg-surface);
  }

  .color-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .color-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 2px 4px;
    border-radius: 3px;
    margin: 0 -4px;
  }

  .color-row.active {
    background: var(--accent-subtle);
  }

  .color-label-btn {
    font-size: 10px;
    color: var(--text-secondary);
    flex: 1;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .color-label-btn:hover {
    color: var(--text-primary);
  }

  .target-icon {
    color: var(--accent);
    font-weight: bold;
  }

  .color-input-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  input[type="color"] {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid var(--border-default);
    border-radius: 3px;
    cursor: pointer;
    background: transparent;
  }

  input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 2px;
  }

  .color-value {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-muted);
    width: 56px;
  }

  .actions {
    display: flex;
    gap: 6px;
    margin-top: 4px;
  }

  .action-btn {
    flex: 1;
    padding: 6px 8px;
    font-size: 10px;
    font-family: var(--font-mono);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: 4px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .action-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .action-btn-primary {
    background: var(--text-primary);
    color: var(--bg-surface);
    border-color: var(--text-primary);
  }

  .action-btn-primary:hover {
    opacity: 0.9;
    color: var(--bg-surface);
  }

  .save-dialog {
    display: flex;
    gap: 4px;
    margin-top: 8px;
  }

  .save-dialog input {
    flex: 1;
    padding: 6px 8px;
    font-size: 10px;
    font-family: var(--font-mono);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 4px;
    color: var(--text-primary);
  }

  .save-btn,
  .cancel-btn {
    padding: 6px 10px;
    font-size: 10px;
    font-family: var(--font-mono);
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid var(--border-default);
  }

  .save-btn {
    background: var(--semantic-success);
    color: white;
    border-color: var(--semantic-success);
  }

  .cancel-btn {
    background: var(--bg-elevated);
    color: var(--text-secondary);
  }
</style>
