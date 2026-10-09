import { clamp, lerp } from '../core/math';

/*
 * The light-blade: drawn in code over the cut-out (the drawings carry their
 * blade as flat cyan, which the cutter measures and erases). A coloured glow
 * in three widths round a white-hot core; `ignite` grows it from the hilt.
 */

export const BLUE = '#3aa7ff';
export const RED_BLADE = '#ff2e3a';

export function drawBlade(ctx: CanvasRenderingContext2D, a: [number, number], b: [number, number], color: string, width: number, ignite = 1, flicker = 0, onBright = false) {
  const k = clamp(ignite);
  if (k <= 0) return;
  const e: [number, number] = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const fl = 1 + Math.sin(flicker * 90) * 0.04 + Math.sin(flicker * 37) * 0.03;
  ctx.save();
  ctx.lineCap = 'round';
  // on a bright wall an additive glow just whitens: paint it on instead
  ctx.globalCompositeOperation = onBright ? 'source-over' : 'lighter';
  for (const [wd, al] of [[5.5, 0.12], [3, 0.28], [1.7, 0.55]] as const) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = al;
    ctx.lineWidth = width * wd * fl;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(e[0], e[1]);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.strokeStyle = onBright ? '#ffe2e2' : '#ffffff';
  ctx.lineWidth = width * 0.75;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(e[0], e[1]);
  ctx.stroke();
  ctx.restore();
}

/** the light a blade throws on what's behind it: a soft coloured wash round its middle */
export function bladeLight(ctx: CanvasRenderingContext2D, a: [number, number], b: [number, number], color: string, r: number, alpha = 0.35) {
  const m: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const g = ctx.createRadialGradient(m[0], m[1], 0, m[0], m[1], r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(m[0] - r, m[1] - r, r * 2, r * 2);
  ctx.restore();
}
