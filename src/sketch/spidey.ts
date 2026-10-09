import { type Pt, TAU } from '../core/math';
import { drawFig, figPoint, meta } from './art';

/*
 * THE WEB-SWINGER (round 22): a Spider-Verse-style homage drawn in code over
 * plain black silhouettes (scripts/gen-spidey.sh, scripts/cutout-sil.py).
 * The look is all here: the print misregistration (a red and a blue copy
 * jittering off the black on a 12 fps step), the white angular eye lenses,
 * and white web lines. No emblem, no web-pattern suit, no name.
 */

/** per drawing: head centre and radius (drawing px) and which way the face looks (R, L, or F = toward us) */
const HEAD: Record<string, [number, number, number, 'R' | 'L' | 'F']> = {
  sil_swing_0: [230, 172, 24, 'R'],
  sil_swing_1: [107, 190, 26, 'R'],
  sil_swing_2: [249, 173, 24, 'R'],
  sil_swing_3: [77, 251, 22, 'R'],
  sil_swing_4: [202, 106, 22, 'F'],
  sil_pose_0: [94, 30, 34, 'L'],
  sil_pose_1: [159, 31, 36, 'F'],
  sil_pose_2: [158, 44, 38, 'L'],
  sil_pose_3: [142, 219, 36, 'R'],
};
/** where the left arm hooks round someone he's carrying (sil_swing_2) */
export const CARRY: Pt = [156, 254];

export interface SpOpts { flip?: boolean; rot?: number; anchor?: [number, number]; t: number; alpha?: number }

/** the drawing's rope hand (its topmost ink) */
export const handOf = (k: string): [number, number] => meta(k)?.hand ?? [0, 0];

/** an angular lens: a slanted teardrop, white with a thick black rim */
function lens(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, mirror: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(mirror, 1);
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, -r * 0.35);
  ctx.quadraticCurveTo(-r * 0.2, -r * 0.75, r * 0.95, -r * 0.55);
  ctx.quadraticCurveTo(r * 0.7, r * 0.55, -r * 0.1, r * 0.6);
  ctx.quadraticCurveTo(-r * 0.75, r * 0.45, -r * 0.95, -r * 0.35);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.28;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.fillStyle = '#f7f7f2';
  ctx.fill();
  ctx.restore();
}

/** draw the web-swinger: drawing `k` at pixel `scale`, its anchor point (default foot) at (x, y) */
export function drawSpidey(ctx: CanvasRenderingContext2D, k: string, x: number, y: number, scale: number, o: SpOpts) {
  const step = Math.floor(o.t * 12);
  const j = (n: number) => (Math.sin(step * 12.9898 + n * 78.233) * 43758.5453) % 1;
  const off = scale * 9;
  const base = { anchor: o.anchor, flip: o.flip, rot: o.rot, alpha: o.alpha };
  // the misregistered print: red and blue copies off the black
  drawFig(ctx, k, x - off + j(1) * off * 0.5, y + j(2) * off * 0.3, scale, { ...base, tint: '#e3263a', alpha: 0.85 * (o.alpha ?? 1) });
  drawFig(ctx, k, x + off * 0.8 + j(3) * off * 0.4, y - j(4) * off * 0.3, scale, { ...base, tint: '#2b8cff', alpha: 0.7 * (o.alpha ?? 1) });
  drawFig(ctx, k, x, y, scale, base);
  // the lenses
  const hd = HEAD[k];
  if (!hd) return;
  const [hx, hy, hr, look] = hd;
  const c = figPoint(k, [hx, hy], x, y, scale, base);
  const r = hr * scale;
  const rot = o.rot ?? 0;
  const facing = (look === 'R') !== !!o.flip ? 1 : -1;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  if (look === 'F') {
    lens(ctx, c[0] - r * 0.42, c[1] + r * 0.05, r * 0.5, rot + 0.35, -1);
    lens(ctx, c[0] + r * 0.42, c[1] + r * 0.05, r * 0.5, rot - 0.35, 1);
  } else {
    // in profile: one big lens toward the face, a sliver of the far one
    const ax = Math.cos(rot) * facing, ay = Math.sin(rot) * facing;
    lens(ctx, c[0] + ax * r * 0.35, c[1] + ay * r * 0.35 + r * 0.05, r * 0.55, rot - 0.3 * facing, facing);
    lens(ctx, c[0] + ax * r * 0.85, c[1] + ay * r * 0.85 + r * 0.02, r * 0.26, rot - 0.2 * facing, facing);
  }
  ctx.restore();
}

/** a web line: white with a soft dark edge so it reads on paper and on the sky */
export function webLine(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, width: number, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(20,16,14,0.55)';
  ctx.lineWidth = width * 2.2;
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

/** the 'thwip': a web shooting out of the hand toward `to`, k 0..1 */
export function webShot(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, width: number, k: number) {
  const e: Pt = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
  webLine(ctx, from, e, width);
  if (k < 1) {
    // the little star of web at its head
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = width * 0.8;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.moveTo(e[0], e[1]);
      ctx.lineTo(e[0] + Math.cos(a) * width * 4, e[1] + Math.sin(a) * width * 4);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** a point on a swing: hanging from `anchor` on a rope of length `R`, at angle `th` from straight down (+ = to the right) */
export const swingAt = (anchor: Pt, R: number, th: number): Pt => [anchor[0] + Math.sin(th) * R, anchor[1] + Math.cos(th) * R];
