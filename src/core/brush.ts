import { type Pt, clamp, noise1, spline, TAU } from './math';

/**
 * SUMI BRUSH.
 *
 * A stroke is a loaded brush dragged along a path: it presses down hard at
 * the start (the blob), runs wet through the middle, and runs out of ink at
 * the end, where the bristles separate and leave the white streaks that ink
 * painters call "flying white". Body, wet halo and bristles are drawn as
 * three passes so the same stroke can be scrubbed on with `progress`.
 */
export interface BrushOpts {
  width: number;
  color: string;
  /** 0..1 of the path painted so far */
  progress?: number;
  seed?: number;
  /** how early the brush runs dry: 0 = wet to the end, 1 = dry from mid-stroke */
  dry?: number;
  alpha?: number;
  /** pressure at the very start, as a multiple of width (the press blob) */
  press?: number;
  /** pressure left at the tail */
  tail?: number;
  /** soft wet halo around the body */
  halo?: number;
}

interface Prepared {
  pts: Pt[];
  nx: Float32Array;
  ny: Float32Array;
}

const cache = new WeakMap<Pt[], Prepared>();

function prepare(points: Pt[], spacing: number): Prepared {
  const pts = spline(points, spacing);
  const n = pts.length;
  const nx = new Float32Array(n), ny = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    nx[i] = -dy; ny[i] = dx;
  }
  return { pts, nx, ny };
}

export function brush(ctx: CanvasRenderingContext2D, points: Pt[], o: BrushOpts) {
  const progress = clamp(o.progress ?? 1);
  if (progress <= 0) return;
  const seed = o.seed ?? 1;
  const W = o.width;
  // spacing scales with width so fat strokes stay cheap and thin ones smooth
  let prep = cache.get(points);
  if (!prep) {
    prep = prepare(points, Math.max(1.2, W * 0.18));
    cache.set(points, prep);
  }
  const { pts, nx, ny } = prep;
  const N = pts.length;
  const vis = Math.max(2, Math.floor(N * progress));
  const dry = o.dry ?? 0.35;
  const press = o.press ?? 1.25;
  const tail = o.tail ?? 0.18;

  const width = new Float32Array(vis);
  for (let i = 0; i < vis; i++) {
    const t = i / (N - 1);
    // press-in at the start, taper at the end, wobble in the middle
    const start = t < 0.06 ? press - (press - 1) * (t / 0.06) : 1;
    const end = t > 0.7 ? 1 - (1 - tail) * ((t - 0.7) / 0.3) ** 1.6 : 1;
    const wob = 1 + 0.16 * noise1(t * 9, seed) + 0.06 * noise1(t * 31, seed + 4);
    let w = W * start * end * wob;
    // the still-wet head of a stroke being painted is rounder
    if (progress < 1 && i > vis - 4) w *= 0.92;
    width[i] = Math.max(0.4, w);
  }

  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.fillStyle = o.color;
  ctx.strokeStyle = o.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // the solid body stops where the brush starts running dry
  const dryStart = 1 - dry;
  const bodyEnd = Math.min(vis, Math.floor(N * (dryStart + 0.12)));

  const halo = o.halo ?? 0.12;
  if (halo > 0 && bodyEnd > 2) {
    ctx.globalAlpha = (o.alpha ?? 1) * halo;
    ribbon(ctx, pts, nx, ny, width, 0, bodyEnd, 1.18);
    ctx.globalAlpha = o.alpha ?? 1;
  }
  if (bodyEnd > 1) {
    // the body narrows into the dry section rather than stopping square
    ribbon(ctx, pts, nx, ny, width, 0, bodyEnd, 1, N * dryStart);
    // the press blob at the very start
    const r = width[0] * 0.5;
    ctx.beginPath();
    ctx.ellipse(pts[0][0], pts[0][1], r * 1.02, r * 0.92, Math.atan2(ny[0], nx[0]), 0, TAU);
    ctx.fill();
  }

  // bristles: thin lines across the width, breaking up as the ink runs out
  const K = W > 14 ? 13 : W > 6 ? 9 : 5;
  ctx.lineWidth = Math.max(0.6, (W / K) * 1.25);
  ctx.beginPath();
  for (let k = 0; k < K; k++) {
    const off = (k / (K - 1) - 0.5) * 0.92;
    const bseed = seed * 31 + k * 7.13;
    let down = false;
    for (let i = 0; i < vis; i++) {
      const t = i / (N - 1);
      // probability of ink grows with the remaining load
      const load = t < dryStart ? 1 : 1 - (t - dryStart) / Math.max(0.01, 1 - dryStart);
      const edge = Math.abs(off) * 2; // outer bristles dry first
      const thresh = 1.15 - load * 1.6 + edge * 0.35;
      const on = noise1(t * 26 + bseed, bseed) * 0.5 + 0.5 > thresh;
      const x = pts[i][0] + nx[i] * width[i] * off;
      const y = pts[i][1] + ny[i] * width[i] * off;
      if (on) {
        if (!down) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        down = true;
      } else down = false;
    }
  }
  ctx.stroke();
  ctx.restore();
}

function ribbon(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  nx: Float32Array,
  ny: Float32Array,
  width: Float32Array,
  from: number,
  to: number,
  scale: number,
  narrowFrom = Infinity,
) {
  const k = (i: number) => {
    let s = scale * 0.5;
    if (i > narrowFrom) s *= Math.max(0.05, 1 - (i - narrowFrom) / Math.max(1, to - narrowFrom));
    return width[i] * s;
  };
  ctx.beginPath();
  for (let i = from; i < to; i++) {
    const w = k(i);
    const x = pts[i][0] + nx[i] * w, y = pts[i][1] + ny[i] * w;
    if (i === from) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = to - 1; i >= from; i--) {
    const w = k(i);
    ctx.lineTo(pts[i][0] - nx[i] * w, pts[i][1] - ny[i] * w);
  }
  ctx.closePath();
  ctx.fill();
}

/** Points for an ensō: one turn, slightly open, slightly wandering. */
export function ensoPath(cx: number, cy: number, r: number, seed = 3, turn = 0.94, start = -2.2): Pt[] {
  const pts: Pt[] = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = start + t * TAU * turn;
    const rr = r * (1 + 0.035 * noise1(t * 5, seed) + 0.03 * t);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}
