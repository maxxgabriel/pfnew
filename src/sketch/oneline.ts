import data from '../assets/sketch/oneline.json';
import type { Pt } from '../core/math';

/*
 * THE ONE-LINE BIRTH.
 *
 * A line drawing of the hero (made with the image tool) traced into one
 * ordered pen path by scripts/trace-oneline.py: `pts` in drawing order, `pen`
 * the indices where the pen lifts and hops to the next stroke. Drawn up to a
 * progress, it reads as one continuous line looping the figure into being.
 * Hops cost a fifth of their length, so the pen zips across them.
 */

const D = data as { w: number; h: number; foot: [number, number]; pts: number[]; pen: number[] };
const N = D.pts.length / 2;
const lift = new Uint8Array(N);
for (const i of D.pen) lift[i] = 1;
// the "time" each point is reached at: drawn length, hops discounted
const at = new Float32Array(N);
for (let i = 1; i < N; i++) {
  const l = Math.hypot(D.pts[i * 2] - D.pts[i * 2 - 2], D.pts[i * 2 + 1] - D.pts[i * 2 - 1]);
  at[i] = at[i - 1] + (lift[i] ? l * 0.2 : l);
}
const TOTAL = at[N - 1];
const TOP = Math.min(...D.pts.filter((_, i) => i % 2 === 1));

/** the drawing's height above its foot point, in its own pixels */
export const ONE_HEIGHT = D.foot[1] - TOP;
/** the first point of the line (where the pen starts: the tip of the antenna), relative to the foot */
export const ONE_START: Pt = [D.pts[0] - D.foot[0], D.pts[1] - D.foot[1]];

/**
 * Draw the line up to `progress` (0..1), its foot at (x, y), `scale` screen px per drawing px.
 * Returns the pen's current point on screen.
 */
export function drawOneLine(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, progress: number, width: number, color: string): Pt {
  const P = (i: number): Pt => [x + (D.pts[i * 2] - D.foot[0]) * scale, y + (D.pts[i * 2 + 1] - D.foot[1]) * scale];
  if (progress <= 0) return P(0);
  const until = progress * TOTAL;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  let p = P(0);
  ctx.moveTo(p[0], p[1]);
  for (let i = 1; i < N; i++) {
    if (at[i] > until) {
      // part of the way along this last segment
      const k = (until - at[i - 1]) / (at[i] - at[i - 1] || 1);
      const q = P(i);
      p = [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
      if (!lift[i]) ctx.lineTo(p[0], p[1]);
      break;
    }
    p = P(i);
    if (lift[i]) ctx.moveTo(p[0], p[1]);
    else ctx.lineTo(p[0], p[1]);
  }
  ctx.stroke();
  ctx.restore();
  return p;
}
