import type { Frame } from '../core/frame';
import { type Pt, clamp, ease, lerp, seg } from '../core/math';
import { canvas } from '../core/sprites';
import { drawRivalsFlat } from '../reel/duel';
import { drawPose } from './art';
import { INK, drawGround, drawPaper, drawSpark, drawSparkStreak, faceOf } from './common';
import { ST, drawStill, stage } from './still';

/*
 * II · FLIP.
 *
 * He lifts the corner and the page turns — and he is in a flip book. Every
 * page is one drawing; the scroll turns them, slowly at first, then faster
 * and faster, so the drawings start to move: a frozen figure, a gasp (he
 * moved!), wobbly first steps, a walk, a run. Through the thin paper the
 * last page shows faintly, the way a flip book's previous drawing does.
 * Halfway, the book holds a page from another story — the two rivals of the
 * old reel mid-duel — and he slides right under their crossed blades. A
 * cartwheel, a backflip, a sprint; the Spark shoots off the edge of the
 * page and he runs straight off it after it (chapter III is the fall).
 */

interface Pg { pose: string; x: number; dy?: number; rot?: number; spark: number; sy?: number; rivals?: number }

// the book: one entry per page
const BOOK: Pg[] = [];
{
  const add = (p: Pg) => BOOK.push(p);
  add({ pose: 'still_0', x: 0.24, spark: 0.62 });
  add({ pose: 'still_2', x: 0.24, spark: 0.6 });
  add({ pose: 'still_2', x: 0.24, dy: -0.15, spark: 0.58 });
  // wobbly first steps: each one tilts the other way
  for (let i = 0; i < 6; i++) add({ pose: `walk_${i % 6}`, x: 0.25 + i * 0.012, rot: (i % 2 ? 1 : -1) * 0.09, spark: 0.6 + i * 0.01 });
  // a walk
  for (let i = 0; i < 12; i++) add({ pose: `walk_${(i + 6) % 6}`, x: 0.33 + i * 0.022, spark: 0.68 + i * 0.012, sy: Math.sin(i) * 0.02 });
  // the page from another story: the rivals mid-duel, and he slides under their blades
  for (let i = 0; i < 4; i++) add({ pose: `run_${i % 6}`, x: 0.2 + i * 0.05, spark: 0.55 + i * 0.05, rivals: i });
  for (let i = 0; i < 4; i++) add({ pose: 'acro_0', x: 0.42 + i * 0.07, spark: 0.85, rivals: 4 + i });
  for (let i = 0; i < 3; i++) add({ pose: `run_${(i + 2) % 6}`, x: 0.72 + i * 0.05, spark: 0.95, rivals: 8 + i });
  // a sprint, a cartwheel, a backflip, a landing
  for (let i = 0; i < 8; i++) add({ pose: `run_${i % 6}`, x: 0.12 + i * 0.045, spark: 0.62 + i * 0.03 });
  add({ pose: 'acro_1', x: 0.5, spark: 0.88 });
  add({ pose: 'acro_1', x: 0.56, dy: -0.1, rot: 0.6, spark: 0.9 });
  add({ pose: 'acro_2', x: 0.62, dy: -0.35, spark: 0.92 });
  add({ pose: 'acro_2', x: 0.68, dy: -0.3, rot: 0.8, spark: 0.93 });
  add({ pose: 'acro_3', x: 0.74, spark: 0.95 });
  add({ pose: 'acro_3', x: 0.75, spark: 0.97 });
  // the sprint to the edge; the Spark leaves the page, and so does he
  for (let i = 0; i < 12; i++) add({ pose: `run_${i % 6}`, x: 0.1 + i * 0.075, spark: 0.5 + i * 0.07, sy: -0.02 * i });
  // the empty pages he left
  for (let i = 0; i < 8; i++) add({ pose: 'run_0', x: 1.4, spark: 1.5 });
}

/** pages turned by local beat L: slow at first, then a riffle */
function turned(L: number) {
  const a = 0.35; // the first turn starts here
  if (L < a) return 0;
  const u = L - a;
  // rate grows from ~0.9 to ~9 pages a beat over the first 5 beats
  return Math.min(BOOK.length - 1.0001, 0.9 * u + 0.75 * u * u * Math.min(1, u / 5) + (u > 5 ? (u - 5) * 2 : 0));
}

const pageC: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D }[] = [];
let lastKey = '';

/** paint page i (and, faintly, the drawing of page i-1 through the paper) */
function paintPage(g: CanvasRenderingContext2D, f: Frame, i: number) {
  const { w, h, t } = f;
  const { face, gy, r } = stage(f);
  drawPaper(g, w, h);
  drawGround(g, w * 0.06, w * 0.94, gy + face * 0.05, face * 0.07, 1, 3 + (i % 3));
  const p = BOOK[Math.max(0, Math.min(BOOK.length - 1, i))];
  const q = BOOK[i - 1];
  if (q) drawPose(g, q.pose, q.x * w, gy + (q.dy ?? 0) * face * 4, face, { rot: q.rot, alpha: 0.12 });
  if (p.rivals !== undefined) {
    // the rivals: their duel from the first reel, frozen at a clash, a page from another book
    const k = face * 0.0068;
    g.save();
    g.translate(w * 0.54, gy + face * 0.05);
    g.scale(k, k);
    g.translate(-500, -1842);
    drawRivalsFlat(g, 2.55 + p.rivals * 0.028, t, INK);
    g.restore();
  }
  drawPose(g, p.pose, p.x * w, gy + (p.dy ?? 0) * face * 4, face, { rot: p.rot });
  const sx = p.spark * w, sy = gy - face * 1.6 + (p.sy ?? 0) * h;
  if (sx < w + r * 3) drawSpark(g, sx, sy, r);
  if (q && q.spark * w < w + r * 3) drawSparkStreak(g, [q.spark * w, gy - face * 1.6 + (q.sy ?? 0) * h], [sx, sy], r, 0.6);
}

function page(f: Frame, slot: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(f.w * dpr), H = Math.round(f.h * dpr);
  if (!pageC[slot] || pageC[slot].c.width !== W || pageC[slot].c.height !== H) pageC[slot] = canvas(W, H);
  const pc = pageC[slot];
  pc.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return pc;
}

export function drawFlip(f: Frame, L: number) {
  const { ctx, w, h } = f;
  const n = turned(L);
  const i = Math.floor(n), p = n - i;
  const key = `${i}|${w}|${h}`;

  // the page underneath (i + 1) and the page turning (i); before the first turn the turning page is chapter I's last frame
  const under = page(f, 0);
  const over = page(f, 1);
  if (key !== lastKey || BOOK[i + 1]?.rivals !== undefined || BOOK[i]?.rivals !== undefined) {
    paintPage(under.ctx, f, i + 1);
    over.ctx.save();
    if (i === 0) {
      // the very first page is the one he lifted in chapter I
      const fr = { ...f, ctx: over.ctx, B: f.B - L + 0, crossed: () => false, crossedFwd: () => false } as Frame;
      drawStill({ ...fr, B: ST.end - 0.001 }, ST.end - 0.001);
    } else paintPage(over.ctx, f, i);
    over.ctx.restore();
    lastKey = key;
  }

  // ---- the turn: the page swings about its left edge toward the reader and away
  ctx.drawImage(under.c, 0, 0, w, h);
  const th = ease.inOut2(p) * Math.PI;
  const cw = Math.cos(th) * w;
  if (cw > 1) {
    // shadow the turning page casts on the next one
    const sh = ctx.createLinearGradient(cw, 0, Math.min(w, cw + w * 0.25), 0);
    sh.addColorStop(0, `rgba(30,22,14,${0.28 * Math.sin(th)})`);
    sh.addColorStop(1, 'rgba(30,22,14,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(cw, 0, w * 0.25, h);
    // the page itself, foreshortened, darkening toward its lifted edge
    ctx.drawImage(over.c, 0, 0, over.c.width, over.c.height, 0, 0, cw, h);
    const g = ctx.createLinearGradient(0, 0, cw, 0);
    g.addColorStop(0, 'rgba(30,22,14,0)');
    g.addColorStop(1, `rgba(30,22,14,${0.22 * Math.sin(th)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, h);
    // the bright curl of its edge
    ctx.fillStyle = `rgba(255,252,244,${0.6 * Math.sin(th)})`;
    ctx.fillRect(cw - 2, 0, 2, h);
  }

  // ---- the book's edge: the stack of pages still to turn, thinning
  const left = clamp(1 - n / BOOK.length);
  ctx.save();
  ctx.strokeStyle = 'rgba(27,23,20,0.18)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    const x = w - 2 - k * 3 * left;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.restore();

  // ---- off the edge: in the last beat the page slides away and he falls (chapter III)
  const off = seg(L, 8.45, 9.0);
  if (off > 0) {
    const { face } = stage(f);
    ctx.save();
    ctx.fillStyle = '#efe9dc';
    ctx.globalAlpha = ease.in2(off);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    drawPose(ctx, 'fall_0', lerp(w * 0.95, w * 0.5, ease.out2(off)), lerp(h * 0.7, h * 0.38, ease.inOut2(off)), face);
  }
  void faceOf;
}

export const FLIP_PAGES = BOOK.length;
export const flipTurned = turned;
export type { Pt };
