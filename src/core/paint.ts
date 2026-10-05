import type { Frame } from './frame';
import { ease, hash, seg } from './math';
import { blot, canvas } from './sprites';

/*
 * PAINT: the visitor's finger is the brush (INK v5, beat 1, "awe").
 *
 * During the opening, wherever a finger (or a pressed mouse) moves, wet ink
 * goes down; the ink is a window: through it the night world shows. Every
 * touch is a ragged blot; as the reader scrolls, every blot bleeds outward,
 * and blooms of its own open up across the page, so by PAINT_END the night
 * has taken the whole sheet and the film carries on in it. Scrolling with a
 * finger paints too (the finger moves across the glass as the page scrolls).
 *
 * Cheap on a phone: the night is rendered at half size into one buffer, the
 * mask is the blots stamped straight into that buffer with destination-in,
 * and nothing is ever read back from a canvas.
 */

/** film beats: painting is live from PAINT_START; by PAINT_END the night owns the screen */
export const PAINT_START = 0.0;
export const PAINT_END = 2.2;

interface Dab { x: number; y: number; r: number; t0: number; seed: number }
const dabs: Dab[] = [];
let last: { x: number; y: number; t: number } | null = null;
let blots: HTMLCanvasElement[] = [];
const MAX_DABS = 420;

/** the finger moved (screen px, clock s); only call while painting is live */
export function paintMove(x: number, y: number, t: number, w: number, h: number) {
  const S = Math.min(w, h);
  if (last) {
    const d = Math.hypot(x - last.x, y - last.y);
    if (d < S * 0.018) return;
    // slow = a fat wet blot, fast = a thinner stroke; fill the gap between samples
    const sp = d / Math.max(0.008, t - last.t);
    const r = S * (0.075 - Math.min(0.045, sp / 40000));
    const n = Math.ceil(d / (r * 0.6));
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      add(last.x + (x - last.x) * k, last.y + (y - last.y) * k, r, t, w, h);
    }
  } else add(x, y, S * 0.085, t, w, h);
  last = { x, y, t };
}
export function paintEnd() {
  last = null;
}
function add(x: number, y: number, r: number, t: number, w: number, h: number) {
  const seed = (dabs.length * 7.13 + t * 31) % 997;
  dabs.push({ x: x / w, y: y / h, r: r / Math.min(w, h), t0: t, seed });
  if (dabs.length > MAX_DABS) dabs.splice(0, dabs.length - MAX_DABS);
}
export function painted() {
  return dabs.length;
}

let buf: ReturnType<typeof canvas> | null = null;
const SCALE = 0.5;

/**
 * Draw the night through the ink. `drawNight` renders the night version of the scene into the
 * context it's given (full-size coordinates; it's drawn at half size into the buffer).
 */
export function drawPainted(f: Frame, drawNight: (g: CanvasRenderingContext2D) => void, ghost: number, intro: number) {
  const { ctx, w, h, B, t } = f;
  const S = Math.min(w, h);
  if (!blots.length) blots = [3, 5, 7, 9, 11].map((s) => blot(s * 13 + 1, 256));
  // how far the night has spread on its own
  const k = seg(B, PAINT_START + 0.35, PAINT_END - 0.05);
  // the hint's drop, falling before it lands
  const gx = w * 0.76, gy = h * 0.8;
  const fall = seg(intro, 3.0, 3.4);
  if (!dabs.length && fall > 0 && fall < 1 && B < 0.3) {
    ctx.fillStyle = '#121010';
    const r0 = S * 0.012;
    ctx.beginPath();
    ctx.ellipse(gx, gy - (1 - ease.in2(fall)) * h * 0.8, r0, r0 * (1 + fall * 1.5), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!dabs.length && k <= 0 && ghost <= 0) return;
  const bw = Math.ceil(w * SCALE), bh = Math.ceil(h * SCALE);
  if (!buf || buf.c.width !== bw || buf.c.height !== bh) buf = canvas(bw, bh);
  const g = buf.ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, bw, bh);
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  drawNight(g);
  // the mask: the ink, stamped into a scratch canvas; the night is then cut down to it
  const m = maskCanvas(bw, bh);
  const mg = m.ctx;
  mg.setTransform(1, 0, 0, 1, 0, 0);
  mg.clearRect(0, 0, bw, bh);
  mg.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const spread = 1 + ease.in3(k) * 3;
  for (const d of dabs) {
    // wet ink keeps creeping for a couple of seconds, then the scroll makes it bleed further
    const wet = 1 + 0.35 * ease.out2(Math.min(1, (t - d.t0) / 2.2));
    const r = d.r * S * wet * spread;
    mg.globalAlpha = 1;
    stamp(mg, d.x * w, d.y * h, r, d.seed);
  }
  // blooms of its own, opening one after another until the sheet is covered
  for (let i = 0; i < 14; i++) {
    const delay = 0.42 + hash(i * 3.1) * 0.38;
    const b = ease.inOut2(seg(k, delay, delay + 0.3));
    if (b <= 0) continue;
    const x = hash(i * 7.7) * w, y = h * (0.15 + hash(i * 1.3) * 0.8);
    stamp(mg, x, y, S * (0.1 + b * (0.6 + hash(i) * 0.7)), i * 17);
  }
  if (k > 0.85) {
    // the last of the paper goes under one great wash
    mg.globalAlpha = ease.in2(seg(k, 0.85, 1));
    mg.fillStyle = '#000';
    mg.fillRect(0, 0, w, h);
    mg.globalAlpha = 1;
  }
  // the first-time hint: a single drop falls and opens a window, to show what ink does here
  if (ghost > 0) stamp(mg, gx, gy, S * 0.13 * ghost, 5);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(m.c, 0, 0);
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(buf.c, 0, 0, w, h);
}

let mk: ReturnType<typeof canvas> | null = null;
function maskCanvas(bw: number, bh: number) {
  if (!mk || mk.c.width !== bw || mk.c.height !== bh) mk = canvas(bw, bh);
  return mk;
}

/** one ragged ink blot of radius r */
function stamp(g: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number) {
  const b = blots[Math.floor(hash(seed) * blots.length)];
  g.save();
  g.translate(x, y);
  g.rotate(hash(seed + 1) * Math.PI * 2);
  g.drawImage(b, -r, -r, r * 2, r * 2);
  g.restore();
}
