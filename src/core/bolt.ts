import { type Pt, TAU, clamp, hash, lerp } from './math';
import { drawSprite, glow } from './sprites';

/**
 * LIGHTNING.
 *
 * One colour of gold that appears nowhere else in the film, so the thunder
 * moments read as something apart from the blue and green rivals.
 */
export const GOLD = { core: '#fffbe6', hot: '#ffe27a', c: '#ffbf1f', deep: '#e08a00' };

/**
 * Jag a path into lightning: every segment is split and its midpoints
 * pushed sideways, re-rolled `rate` times a second so the bolt crackles.
 */
export function jag(path: Pt[], t: number, amp: number, seed = 1, rate = 24, depth = 3): Pt[] {
  let pts = path.slice();
  const k = Math.floor(t * rate);
  let a = amp;
  for (let d = 0; d < depth; d++) {
    const out: Pt[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const dx = x1 - x0, dy = y1 - y0;
      const l = Math.hypot(dx, dy) || 1;
      const off = (hash(i * 7.3 + d * 13 + seed * 31 + k * 3.7) - 0.5) * 2 * a * Math.min(1, l / (amp * 4));
      out.push([(x0 + x1) / 2 - (dy / l) * off, (y0 + y1) / 2 + (dx / l) * off], pts[i]);
    }
    pts = out;
    a *= 0.55;
  }
  return pts;
}

/** cumulative length along a polyline */
function lengths(pts: Pt[]) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return L;
}

/** the part of a path between fractions a and b of its length */
export function slice(pts: Pt[], a: number, b: number): Pt[] {
  if (pts.length < 2) return pts;
  const L = lengths(pts);
  const total = L[L.length - 1];
  const from = clamp(a) * total, to = clamp(b) * total;
  const out: Pt[] = [];
  for (let i = 1; i < pts.length; i++) {
    const l0 = L[i - 1], l1 = L[i];
    if (l1 < from || l0 > to) continue;
    const s0 = clamp((from - l0) / (l1 - l0 || 1)), s1 = clamp((to - l0) / (l1 - l0 || 1));
    const p = (s: number): Pt => [lerp(pts[i - 1][0], pts[i][0], s), lerp(pts[i - 1][1], pts[i][1], s)];
    if (out.length === 0) out.push(p(s0));
    out.push(p(s1));
  }
  return out;
}

export function pointAt(pts: Pt[], f: number): Pt {
  const s = slice(pts, 0, f);
  return s[s.length - 1] ?? pts[0];
}

function stroke(ctx: CanvasRenderingContext2D, pts: Pt[], w: number, color: string, alpha: number) {
  if (pts.length < 2) return;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

/**
 * Draw a bolt along `path`. `width` is the core width; the glow is built from
 * wider, fainter passes. `branches` throws small forks off the main line.
 */
export function drawBolt(
  ctx: CanvasRenderingContext2D, path: Pt[], t: number,
  o: { width: number; amp?: number; seed?: number; alpha?: number; branches?: number; ink?: boolean; paper?: boolean; pal?: typeof GOLD },
) {
  const alpha = o.alpha ?? 1;
  if (alpha <= 0 || path.length < 2) return;
  const amp = o.amp ?? o.width * 4;
  const pts = jag(path, t, amp, o.seed ?? 1);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (o.ink) {
    // the impact frame: lightning drawn in solid black
    stroke(ctx, pts, o.width * 2.2, '#000000', alpha);
    ctx.restore();
    return;
  }
  if (o.paper) {
    // on paper light can't glow, so it's printed: an ink keyline, gold, a hot core
    stroke(ctx, pts, o.width * 3.6, '#14120f', alpha);
    stroke(ctx, pts, o.width * 2.2, GOLD.c, alpha);
    stroke(ctx, pts, o.width * 0.8, GOLD.core, alpha);
    ctx.restore();
    return;
  }
  const P = o.pal ?? GOLD;
  ctx.globalCompositeOperation = 'lighter';
  stroke(ctx, pts, o.width * 9, P.deep, alpha * 0.12);
  stroke(ctx, pts, o.width * 4.5, P.c, alpha * 0.35);
  stroke(ctx, pts, o.width * 2, P.hot, alpha * 0.9);
  stroke(ctx, pts, o.width * 0.8, P.core, alpha);
  // forks
  const n = o.branches ?? 6;
  const k = Math.floor(t * 18);
  for (let b = 0; b < n; b++) {
    const at = hash(b * 3.1 + k + (o.seed ?? 1)) * 0.9 + 0.05;
    const p0 = pointAt(pts, at);
    const ang = hash(b * 5.7 + k) * TAU;
    const len = amp * (1.5 + hash(b * 9.1 + k) * 3);
    const fork = jag([p0, [p0[0] + Math.cos(ang) * len, p0[1] + Math.sin(ang) * len]], t, len * 0.25, b + 9, 30, 2);
    stroke(ctx, fork, o.width * 2.4, P.c, alpha * 0.3);
    stroke(ctx, fork, o.width * 0.6, P.core, alpha * 0.8);
  }
  ctx.restore();
}

/** short sparks crawling over a point — the charge before the strike */
export function drawCrackle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, intensity: number, seed = 1) {
  if (intensity <= 0) return;
  const k = Math.floor(t * 20);
  const n = Math.round(2 + intensity * 7);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = intensity * 0.5;
  drawSprite(ctx, glow(GOLD.c, 64), x, y, r * 3.2);
  ctx.restore();
  for (let i = 0; i < n; i++) {
    const a = hash(i * 7 + k + seed) * TAU;
    const d0 = r * (0.2 + hash(i * 3 + k) * 0.5);
    const d1 = r * (0.8 + hash(i * 11 + k) * 0.9);
    drawBolt(ctx, [[x + Math.cos(a) * d0, y + Math.sin(a) * d0], [x + Math.cos(a + 0.4) * d1, y + Math.sin(a + 0.4) * d1]], t, {
      width: Math.max(0.8, r * 0.025), amp: r * 0.12, seed: i + seed, alpha: intensity * (0.5 + hash(i + k * 2) * 0.5), branches: 0,
    });
  }
}
