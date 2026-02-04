/**
 * Halftone rendering utilities for Aperture's 1-bit aesthetic.
 * Creates dot patterns that encode data density visually.
 */

export interface HalftoneOptions {
  dotSize: number;
  spacing: number;
  color: string;
  opacity: number;
}

export const defaultHalftoneOptions: HalftoneOptions = {
  dotSize: 1.5,
  spacing: 4,
  color: '#e8dcc4',
  opacity: 1,
};

/**
 * Draw a halftone dot pattern on a canvas.
 * Density parameter (0-1) controls how many dots appear.
 */
export function drawHalftonePattern(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  density: number,
  options: Partial<HalftoneOptions> = {}
): void {
  const opts = { ...defaultHalftoneOptions, ...options };
  const { dotSize, spacing, color, opacity } = opts;

  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;

  // Dithering threshold based on density
  const threshold = 1 - Math.max(0, Math.min(1, density));

  for (let y = spacing / 2; y < height; y += spacing) {
    for (let x = spacing / 2; x < width; x += spacing) {
      // Use deterministic pseudo-random based on position
      const noise = seededRandom(x * 1000 + y) * 0.3;
      const localDensity = density + noise;

      if (localDensity > threshold) {
        // Scale dot size by local density
        const size = dotSize * Math.min(1, localDensity);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.globalAlpha = 1;
}

/**
 * Draw a gradient halftone (like the token budget bar).
 * Density increases from left to right based on fillPercent.
 */
export function drawGradientHalftone(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fillPercent: number,
  options: Partial<HalftoneOptions> = {}
): void {
  const opts = { ...defaultHalftoneOptions, ...options };
  const { dotSize, spacing, color, opacity } = opts;

  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;

  const fillWidth = width * (fillPercent / 100);

  for (let y = spacing / 2; y < height; y += spacing) {
    for (let x = spacing / 2; x < width; x += spacing) {
      if (x > fillWidth) continue;

      // Density increases toward the edge (pressure effect)
      const positionRatio = x / fillWidth;
      const baseDensity = 0.4 + positionRatio * 0.6;

      // Add noise for organic feel
      const noise = seededRandom(x * 1000 + y) * 0.2;
      const finalDensity = baseDensity + noise;

      if (finalDensity > 0.3) {
        const size = dotSize * Math.min(1.2, finalDensity);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.globalAlpha = 1;
}

/**
 * Draw heat visualization as varying dot density.
 * Heat value (0-1) determines dot density and brightness.
 */
export function drawHeatOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  heat: number,
  options: Partial<HalftoneOptions> = {}
): void {
  const opts = { ...defaultHalftoneOptions, ...options };

  // Interpolate color based on heat
  const coldColor = '#3a352c';
  const hotColor = opts.color;

  // More dots and brighter for hot, fewer and dimmer for cold
  const adjustedSpacing = opts.spacing * (1.5 - heat * 0.5);
  const adjustedOpacity = 0.1 + heat * 0.5;

  ctx.fillStyle = heat > 0.5 ? hotColor : coldColor;
  ctx.globalAlpha = adjustedOpacity;

  for (let y = adjustedSpacing / 2; y < height; y += adjustedSpacing) {
    for (let x = adjustedSpacing / 2; x < width; x += adjustedSpacing) {
      const noise = seededRandom(x * 1000 + y) * 0.3;
      if (heat + noise > 0.4) {
        const size = opts.dotSize * (0.5 + heat * 0.5);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.globalAlpha = 1;
}

/**
 * Simple seeded random for deterministic patterns.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
