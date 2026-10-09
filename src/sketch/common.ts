import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { layoutWord, wordWidth } from '../core/glyphs';
import { type Pt, TAU, clamp, ease } from '../core/math';
import { paperTile } from '../core/sprites';

/*
 * What every chapter of THE SKETCH shares: the paper, the brushed title,
 * the Spark, a brushed ground line, and the size of the hero on screen.
 */

export const INK = '#1b1714';
export const PAPER = '#efe9dc';
export const RED = '#e8432a';

/** the hero's face width on screen: everything about him scales from this */
export const faceOf = (f: Frame) => Math.min(f.w * 0.19, f.h * 0.088);

let tile: HTMLCanvasElement | null = null;
let pat: CanvasPattern | null = null;
export function drawPaper(ctx: CanvasRenderingContext2D, w: number, h: number, col = PAPER) {
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, w, h);
  if (!tile) tile = paperTile(512, PAPER);
  if (!pat) pat = ctx.createPattern(tile, 'repeat');
  if (pat) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/** a brushed horizon line the hero stands on */
const grounds = new Map<string, Pt[]>();
export function drawGround(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, width: number, progress = 1, seed = 3, col = INK) {
  const key = `${x0}|${x1}|${y}`;
  let pts = grounds.get(key);
  if (!pts) {
    pts = [[x0, y + 1], [(x0 * 2 + x1) / 3, y + 3], [(x0 + x1 * 2) / 3, y - 1], [x1, y + 2]];
    grounds.set(key, pts);
  }
  brush(ctx, pts, { width, color: col, progress, seed, dry: 0.6, press: 1.2, tail: 0.2, halo: 0 });
}

/* ------------------------------------------------------------ the title */

let title: { pts: Pt[]; order: number; size: number; word: number }[] | null = null;
let titleKey = '';
/** MAX GABRIEL, brushed stroke by stroke as the page opens (on the intro clock) */
export function drawTitle(f: Frame, cx: number, top: number, scale: number, alpha = 1) {
  const { ctx } = f;
  const MAXS = 300, GABS = 118;
  const key = 'v1';
  if (!title || titleKey !== key) {
    const m = layoutWord('MAX', -wordWidth('MAX', MAXS, 0.16) / 2, 0, MAXS, 0.16);
    const g = layoutWord('GABRIEL', -wordWidth('GABRIEL', GABS, 0.2) / 2, 390, GABS, 0.2);
    title = [
      ...m.strokes.map((s) => ({ pts: s.pts, order: s.order, size: MAXS, word: 0 })),
      ...g.strokes.map((s) => ({ pts: s.pts, order: s.order, size: GABS, word: 1 })),
    ];
    titleKey = key;
  }
  const I = f.intro;
  const nM = title.filter((s) => s.word === 0).length;
  const nG = title.length - nM;
  ctx.save();
  ctx.translate(cx, top);
  ctx.scale(scale, scale);
  ctx.globalAlpha *= alpha;
  for (const s of title) {
    const [a0, a1, n] = s.word === 0 ? [0.2, 1.3, nM] : [1.2, 2.1, nG];
    const step = (a1 - a0) / n;
    const p = ease.out2(clamp((I - a0 - s.order * step) / (step * 1.6)));
    if (p <= 0) continue;
    brush(ctx, s.pts, { width: s.size * (s.word === 0 ? 0.13 : 0.12), color: INK, progress: p, seed: 7 + s.order + s.word * 20, dry: 0.4, press: 1.35, tail: 0.3 });
  }
  ctx.restore();
}

/* ------------------------------------------------------------ the spark */

/** the Spark: one vermilion dot, a soft glow, a highlight; squash > 1 is tall */
export function drawSpark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, squash = 1, glow = 1) {
  ctx.save();
  if (glow > 0) {
    const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.4);
    g.addColorStop(0, `rgba(232,67,42,${0.38 * glow})`);
    g.addColorStop(1, 'rgba(232,67,42,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.4, 0, TAU);
    ctx.fill();
  }
  ctx.translate(x, y);
  ctx.scale(1 / squash, squash);
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,220,0.85)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.36, r * 0.24, r * 0.16, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** a fast spark leaves one tapering streak behind it, never a trail of dots */
export function drawSparkStreak(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, r: number, alpha = 1) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const l = Math.hypot(dx, dy);
  if (l < r * 1.5) return;
  const nx = -dy / l, ny = dx / l;
  ctx.save();
  const g = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);
  g.addColorStop(0, 'rgba(232,67,42,0)');
  g.addColorStop(1, `rgba(232,67,42,${0.7 * alpha})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0] + nx * r, to[1] + ny * r);
  ctx.lineTo(to[0] - nx * r, to[1] - ny * r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** keyframed motion: [beat, x, y] in screen fractions, eased between keys; returns pixels */
export function track(keys: [number, number, number][], L: number, w: number, h: number, e = ease.inOut2): Pt {
  if (L <= keys[0][0]) return [keys[0][1] * w, keys[0][2] * h];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (L <= b[0]) {
      const k = e(clamp((L - a[0]) / (b[0] - a[0])));
      return [(a[1] + (b[1] - a[1]) * k) * w, (a[2] + (b[2] - a[2]) * k) * h];
    }
  }
  const z = keys[keys.length - 1];
  return [z[1] * w, z[2] * h];
}

/** a hop between two points: a parabola of height `hgt` (pixels), k 0..1 */
export function hop(a: Pt, b: Pt, hgt: number, k: number): Pt {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * hgt];
}

/** pick the frame of a cycle: name_0..name_{n-1} at `fps`, on clock t */
export const cycle = (name: string, n: number, t: number, fps = 12) => `${name}_${Math.floor(t * fps) % n}`;

/**
 * Idle life: when the reader stops scrolling and he is standing on the page, he passes the time —
 * a stretch, a doodle with the brush, a sit with his chin on his knees, a nap — `after` seconds in.
 * Returns the pose, or null while the page is still moving.
 */
export function idlePose(f: Frame, after = 3): string | null {
  const s = f.idle - after;
  if (s < 0) return null;
  const order = ['idle_3', 'idle_0', 'idle_0', 'idle_1', 'idle_2', 'idle_2'];
  return order[Math.floor(s / 2.6) % order.length];
}
