<script lang="ts">
  /**
   * Sparkline — Tiny inline SVG line chart for token usage over time.
   * Rendered in zone headers to show token trend.
   */

  interface Props {
    /** Array of numeric data points (token counts) */
    data: number[];
    /** CSS color for the line */
    color?: string;
    /** Width of the sparkline in px */
    width?: number;
    /** Height of the sparkline in px */
    height?: number;
    /** Label for accessibility */
    label?: string;
  }

  let {
    data,
    color = "var(--text-muted)",
    width = 40,
    height = 14,
    label = "Token trend",
  }: Props = $props();

  // Minimum points to draw a line
  const MIN_POINTS = 2;

  // Build SVG polyline points
  const polylinePoints = $derived.by(() => {
    if (data.length < MIN_POINTS) return "";
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1; // avoid div by zero
    const padding = 1; // px padding inside SVG

    const w = width - padding * 2;
    const h = height - padding * 2;

    return data
      .map((val, i) => {
        const x = padding + (i / (data.length - 1)) * w;
        const y = padding + h - ((val - min) / range) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  });

  // Trend direction for visual indicator
  const trend = $derived.by(() => {
    if (data.length < MIN_POINTS) return "flat";
    const recent = data[data.length - 1];
    const prev = data[data.length - 2];
    if (recent > prev * 1.05) return "up";
    if (recent < prev * 0.95) return "down";
    return "flat";
  });

  // Latest value for tooltip
  const latest = $derived(data.length > 0 ? data[data.length - 1] : 0);
  const first = $derived(data.length > 0 ? data[0] : 0);
  const delta = $derived(latest - first);
  const deltaSign = $derived(delta > 0 ? "+" : "");

  function formatTokens(n: number): string {
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toString();
  }
</script>

{#if data.length >= MIN_POINTS}
  <span
    class="sparkline"
    title="{label}: {formatTokens(first)} → {formatTokens(latest)} ({deltaSign}{formatTokens(delta)})"
  >
    <svg
      {width}
      {height}
      viewBox="0 0 {width} {height}"
      fill="none"
      aria-label={label}
      role="img"
    >
      <!-- Fill area under the line -->
      <polygon
        points="{width - 1},{height - 1} 1,{height - 1} {polylinePoints}"
        fill={color}
        opacity="0.1"
      />
      <!-- The line itself -->
      <polyline
        points={polylinePoints}
        stroke={color}
        stroke-width="1.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- Dot on latest value -->
      {#if data.length > 0}
        {@const lastX = width - 2}
        {@const max = Math.max(...data)}
        {@const min = Math.min(...data)}
        {@const range = max - min || 1}
        {@const lastY = 1 + (height - 2) - ((latest - min) / range) * (height - 2)}
        <circle cx={lastX} cy={lastY} r="1.5" fill={color} />
      {/if}
    </svg>
    {#if trend === "up"}
      <span class="trend trend-up" style:color={color}>↑</span>
    {:else if trend === "down"}
      <span class="trend trend-down" style:color={color}>↓</span>
    {/if}
  </span>
{/if}

<style>
  .sparkline {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    vertical-align: middle;
  }

  .sparkline svg {
    flex-shrink: 0;
  }

  .trend {
    font-size: 8px;
    font-weight: 700;
    line-height: 1;
    opacity: 0.7;
  }

  .trend-up {
    color: var(--semantic-warning);
  }

  .trend-down {
    color: var(--semantic-success);
  }
</style>
