import { TAU } from './math';
import { drawSprite, glow } from './sprites';

/*
 * THE MARBLE.
 *
 * One glass marble with a red and a blue twist inside runs through every
 * world: the pearl the dragon carries, the ball in the machine, the star the
 * bike chases, the match ball. In the reveal it's what it always was, a kid's
 * marble. Every world draws it with these two functions so it always reads as
 * the same object.
 */

export const TWIST = { a: '#ff4021', b: '#2f5bff' };

/** the twist: two ribbons curling through the middle, centred on the origin, clipped by the caller */
export function marbleTwist(ctx: CanvasRenderingContext2D, r: number, spin: number, cols: [string, string] = [TWIST.a, TWIST.b]) {
  ctx.save();
  ctx.rotate(spin);
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.3;
  cols.forEach((col, k) => {
    const o = k ? -1 : 1;
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, o * r * 0.12);
    ctx.bezierCurveTo(-r * 0.25, o * r * 0.62, r * 0.25, -o * r * 0.38, r * 0.62, o * r * 0.12);
    ctx.stroke();
  });
  ctx.restore();
}

/** the marble in glass, lit from the top left; `glowA` adds a halo (the magical worlds) */
export function drawMarble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, o: { spin?: number; glowA?: number; glowCol?: string; alpha?: number } = {}) {
  const a = o.alpha ?? 1;
  if (a <= 0 || r <= 0) return;
  ctx.save();
  if (o.glowA) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = o.glowA * a;
    drawSprite(ctx, glow(o.glowCol ?? '#d8f0ff', 128), x, y, r * 7);
    ctx.restore();
  }
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  const body = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  body.addColorStop(0, '#f4fbff');
  body.addColorStop(0.55, '#a9d9ef');
  body.addColorStop(1, '#2d5f8a');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, TAU);
  ctx.clip();
  marbleTwist(ctx, r, o.spin ?? 0);
  ctx.restore();
  // the glass over the twist: a darker rim and the window highlight
  ctx.strokeStyle = 'rgba(16,40,70,0.55)';
  ctx.lineWidth = Math.max(0.8, r * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.24, r * 0.14, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}
