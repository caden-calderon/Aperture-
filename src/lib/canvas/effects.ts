/**
 * Visual effects for Aperture's dissolution/materialization animations.
 * Creates the "fax printing in" and "scattering away" effects.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
}

export interface DissolutionState {
  particles: Particle[];
  progress: number;
  complete: boolean;
}

/**
 * Initialize dissolution effect for a rectangular region.
 * Creates particles that will scatter outward.
 */
export function createDissolution(
  width: number,
  height: number,
  particleCount = 100
): DissolutionState {
  const particles: Particle[] = [];

  for (let i = 0; i < particleCount; i++) {
    // Distribute particles across the area
    const x = Math.random() * width;
    const y = Math.random() * height;

    // Random outward velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5, // Slight upward bias
      size: 1 + Math.random() * 2,
      alpha: 1,
      decay: 0.02 + Math.random() * 0.03,
    });
  }

  return { particles, progress: 0, complete: false };
}

/**
 * Update dissolution animation state.
 * Returns true when animation is complete.
 */
export function updateDissolution(state: DissolutionState, deltaTime: number): boolean {
  if (state.complete) return true;

  const dt = deltaTime / 16; // Normalize to ~60fps
  let allDead = true;

  for (const p of state.particles) {
    if (p.alpha <= 0) continue;

    allDead = false;

    // Update position
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Apply gravity
    p.vy += 0.05 * dt;

    // Fade out
    p.alpha -= p.decay * dt;
    if (p.alpha < 0) p.alpha = 0;
  }

  state.progress = Math.min(1, state.progress + 0.03 * dt);
  state.complete = allDead || state.progress >= 1;

  return state.complete;
}

/**
 * Draw dissolution particles.
 */
export function drawDissolution(
  ctx: CanvasRenderingContext2D,
  state: DissolutionState,
  color = '#e8dcc4'
): void {
  ctx.fillStyle = color;

  for (const p of state.particles) {
    if (p.alpha <= 0) continue;

    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

/**
 * Initialize materialization effect (reverse of dissolution).
 * Particles converge from scattered positions to form the shape.
 */
export function createMaterialization(
  width: number,
  height: number,
  particleCount = 100
): DissolutionState {
  const particles: Particle[] = [];

  for (let i = 0; i < particleCount; i++) {
    // Target position (where particle will end up)
    const targetX = Math.random() * width;
    const targetY = Math.random() * height;

    // Start position (scattered around target)
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 40;
    const startX = targetX + Math.cos(angle) * distance;
    const startY = targetY + Math.sin(angle) * distance;

    // Velocity toward target (arrive in ~15 frames)
    const frames = 15;
    const vx = (targetX - startX) / frames;
    const vy = (targetY - startY) / frames;

    particles.push({
      x: startX,
      y: startY,
      vx,
      vy,
      size: 1 + Math.random() * 2,
      alpha: 0, // Start invisible
      decay: -0.05 - Math.random() * 0.03, // Negative = fade in
    });
  }

  return { particles, progress: 0, complete: false };
}

/**
 * Update materialization animation state.
 */
export function updateMaterialization(state: DissolutionState, deltaTime: number): boolean {
  if (state.complete) return true;

  const dt = deltaTime / 16;
  let allSettled = true;

  for (const p of state.particles) {
    if (p.alpha >= 1 && Math.abs(p.vx) < 0.1 && Math.abs(p.vy) < 0.1) {
      continue;
    }

    allSettled = false;

    // Update position
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Slow down as it approaches target
    p.vx *= 0.95;
    p.vy *= 0.95;

    // Fade in (decay is negative)
    p.alpha -= p.decay * dt;
    if (p.alpha > 1) p.alpha = 1;
  }

  state.progress = Math.min(1, state.progress + 0.04 * dt);
  state.complete = allSettled || state.progress >= 1;

  return state.complete;
}

/**
 * Create a "scan line" materialization effect.
 * Like a fax or old CRT drawing line by line.
 */
export function createScanLineMaterialization(
  _width: number,
  _height: number,
  _lineHeight = 2
): { scanY: number; complete: boolean } {
  return { scanY: 0, complete: false };
}

/**
 * Update scan line effect.
 */
export function updateScanLine(
  state: { scanY: number; complete: boolean },
  height: number,
  speed = 5
): boolean {
  if (state.complete) return true;

  state.scanY += speed;
  if (state.scanY >= height) {
    state.scanY = height;
    state.complete = true;
  }

  return state.complete;
}

/**
 * Draw scan line effect - reveals content from top to bottom.
 */
export function drawScanLineReveal(
  ctx: CanvasRenderingContext2D,
  state: { scanY: number },
  width: number,
  color = '#e8dcc4'
): void {
  // Draw the scan line
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(0, state.scanY - 2, width, 2);

  // Draw trailing glow
  const gradient = ctx.createLinearGradient(0, state.scanY - 20, 0, state.scanY);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, color);
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, state.scanY - 20, width, 20);

  ctx.globalAlpha = 1;
}

/**
 * Compression visual effect - progressive dithering.
 * Returns opacity mask values for different compression levels.
 */
export function getCompressionMask(
  level: 'original' | 'trimmed' | 'summarized' | 'minimal'
): { opacity: number; blur: number; scale: number; dotDensity: number } {
  switch (level) {
    case 'original':
      return { opacity: 1, blur: 0, scale: 1, dotDensity: 0 };
    case 'trimmed':
      return { opacity: 0.9, blur: 0.5, scale: 0.98, dotDensity: 0.2 };
    case 'summarized':
      return { opacity: 0.7, blur: 1, scale: 0.92, dotDensity: 0.5 };
    case 'minimal':
      return { opacity: 0.4, blur: 2, scale: 0.85, dotDensity: 0.8 };
  }
}
