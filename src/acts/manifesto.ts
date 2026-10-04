import { drawBlot } from '../core/blot';
import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, hash, lerp, seg } from '../core/math';
import { blot, drawSprite } from '../core/sprites';
import { C, F, font } from '../core/style';
import { drawBall } from './machine';

/*
 * THE MANIFESTO.
 *
 * Spliced into the white-out after the beam lock: three title cards in big
 * riso-printed type — ink over a misregistered red — that say what the film
 * is about.
 *
 *   ONE STROKE.        stamped down letter by letter, ink splashing
 *   NO UNDO.           typed out; Blot jumps on ⌘Z twice; nothing happens;
 *                      a brush slash strikes it out
 *   SO MAKE IT MOVE.   letters land on springs; the O of MOVE is the ball,
 *                      and the ball is what carries on into the machine
 */

let splat: HTMLCanvasElement | null = null;
let lastP = 0;

interface Glyph { ch: string; x: number; y: number; w: number }

function layout(ctx: CanvasRenderingContext2D, line: string, cx: number, y: number): Glyph[] {
  const ws = [...line].map((ch) => ctx.measureText(ch).width * 0.96);
  const total = ws.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  return [...line].map((ch, i) => {
    const g = { ch, x: x + ws[i] / 2, y, w: ws[i] };
    x += ws[i];
    return g;
  });
}

/** fit a line to a width */
function fitPx(ctx: CanvasRenderingContext2D, line: string, maxW: number, maxPx: number) {
  ctx.font = font(100, F.display);
  const w100 = ctx.measureText(line).width;
  return Math.min(maxPx, (maxW / w100) * 100);
}

/** riso letter: a red pass slightly off-register, then the ink pass */
function riso(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, px: number, rot: number, sc: number, t: number, alpha = 1) {
  if (alpha <= 0 || sc <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  ctx.font = font(px, F.display);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = alpha;
  const mis = px * 0.045;
  ctx.fillStyle = C.red;
  ctx.fillText(ch, mis + Math.sin(t * 7) * px * 0.006, mis * 0.8);
  ctx.fillStyle = C.ink;
  ctx.fillText(ch, 0, 0);
  ctx.restore();
}

export function drawManifesto(f: Frame, p: number) {
  const { ctx, w, h, t } = f;
  const S = Math.min(w, h);
  if (!splat) splat = blot(91, 300);
  const prev = lastP;
  lastP = p;
  const hit = (q: number) => prev < q && p >= q;

  const fadeOut = seg(p, 0.95, 1);
  ctx.save();
  ctx.globalAlpha = 1 - fadeOut;
  ctx.fillStyle = '#fffdf6';
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  // a faint print grid that drifts, so the white is never dead
  ctx.strokeStyle = 'rgba(20,18,15,0.05)';
  ctx.lineWidth = 1;
  const gs = S * 0.08, off = (t * 6) % gs;
  ctx.beginPath();
  for (let x = -gs + off; x < w; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = -gs + off; y < h; y += gs) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();

  // crop marks in the corners, like a print sheet
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.2;
  const m = S * 0.06, l = S * 0.05;
  ctx.beginPath();
  for (const [x, y, dx, dy] of [[m, h * 0.14, 1, 1], [w - m, h * 0.14, -1, 1], [m, h * 0.86, 1, -1], [w - m, h * 0.86, -1, -1]]) {
    ctx.moveTo(x - dx * l * 0.4, y); ctx.lineTo(x + dx * l, y);
    ctx.moveTo(x, y - dy * l * 0.4); ctx.lineTo(x, y + dy * l);
  }
  ctx.stroke();
  ctx.font = font(Math.max(9, S * 0.022), F.serif, 600);
  ctx.fillStyle = 'rgba(20,18,15,0.55)';
  ctx.textAlign = 'left';
  ctx.fillText(`manifesto · ${['i', 'ii', 'iii'][p < 0.33 ? 0 : p < 0.66 ? 1 : 2]} / iii`, m, h * 0.14 - S * 0.03);

  if (p < 0.34) cardOne(f, p, S, hit);
  else if (p < 0.67) cardTwo(f, p, S, hit);
  else cardThree(f, p, S);
  ctx.restore();
}

/* ------------------------------------------------------- I. ONE STROKE. */

function cardOne(f: Frame, p: number, S: number, hit: (q: number) => boolean) {
  const { ctx, w, h, t } = f;
  const px = fitPx(ctx, 'STROKE.', w * 0.86, S * 0.3);
  ctx.font = font(px, F.display);
  const lines = [layout(ctx, 'ONE', w / 2, h * 0.42), layout(ctx, 'STROKE.', w / 2, h * 0.42 + px * 0.95)];
  const all = [...lines[0], ...lines[1]];
  const exit = seg(p, 0.28, 0.335);
  all.forEach((g, i) => {
    const at = 0.02 + i * 0.022;
    const k = seg(p, at, at + 0.03);
    if (k <= 0) return;
    if (hit(at + 0.028)) f.shake(S * 0.012);
    // the stamp: big, then down hard with a little overshoot
    const sc = lerp(2.6, 1, ease.outBack(k, 1.4));
    const rot = (hash(i * 3.7) - 0.5) * 0.12 * (1 - k * 0.7);
    // ink splash behind each letter as it lands
    if (k >= 1) {
      ctx.globalAlpha = 0.09;
      drawSprite(ctx, splat!, g.x, g.y, px * 1.2, px * 1.2, i);
      ctx.globalAlpha = 1;
    }
    const ex = ease.in3(clamp(exit * 1.6 - i * 0.06));
    riso(ctx, g.ch, g.x, g.y - ex * h * 0.6, px, rot + ex * (i % 2 ? 0.4 : -0.4), sc, t, Math.min(1, k * 3) * (1 - ex));
  });
  // the red underline, one stroke
  const u = ease.inOut2(seg(p, 0.2, 0.27)) * (1 - exit);
  if (u > 0) {
    const l = lines[1];
    const x0 = l[0].x - l[0].w / 2, x1 = l[l.length - 1].x + l[l.length - 1].w / 2;
    const y = l[0].y + px * 0.55;
    brush(ctx, UNDER(x0, x1, y), { width: S * 0.03, color: C.red, progress: u, dry: 0.55, seed: 21, press: 1.4 });
  }
}

const unders = new Map<string, Pt[]>();
function UNDER(x0: number, x1: number, y: number): Pt[] {
  const k = `${x0|0}|${x1|0}|${y|0}`;
  let pts = unders.get(k);
  if (!pts) {
    pts = [[x0, y], [lerp(x0, x1, 0.35), y + 4], [lerp(x0, x1, 0.7), y - 2], [x1, y + 3]];
    unders.set(k, pts);
  }
  return pts;
}

/* --------------------------------------------------------- II. NO UNDO. */

function cardTwo(f: Frame, p: number, S: number, hit: (q: number) => boolean) {
  const { ctx, w, h, t } = f;
  const exit = ease.in3(seg(p, 0.62, 0.67));
  ctx.save();
  ctx.translate(-exit * w * 1.2, 0);
  const px = fitPx(ctx, 'UNDO.', w * 0.8, S * 0.3);
  ctx.font = font(px, F.display);
  const yNo = h * 0.3, yUndo = h * 0.3 + px * 0.95;
  const no = layout(ctx, 'NO', w / 2, yNo);
  no.forEach((g, i) => {
    const at = 0.34 + i * 0.02;
    const k = seg(p, at, at + 0.03);
    if (hit(at + 0.028)) f.shake(S * 0.01);
    riso(ctx, g.ch, g.x, g.y, px, (hash(i + 9) - 0.5) * 0.08, lerp(2.4, 1, ease.outBack(k, 1.4)), t, Math.min(1, k * 3));
  });
  // UNDO types itself out, with a caret
  const undo = layout(ctx, 'UNDO.', w / 2, yUndo);
  const typed = Math.floor(seg(p, 0.385, 0.44) * undo.length + 0.0001);
  const slash = seg(p, 0.585, 0.605);
  const shake = slash > 0 ? Math.sin(t * 60) * S * 0.006 * (1 - seg(p, 0.605, 0.64)) : 0;
  undo.forEach((g, i) => {
    if (i >= typed) return;
    riso(ctx, g.ch, g.x + shake, g.y + (slash >= 1 ? Math.sin(i * 2 + t * 3) * S * 0.003 : 0), px, 0, 1, t);
  });
  if (p > 0.38 && p < 0.585 && Math.floor(t * 2.4) % 2 === 0) {
    const cx = typed < undo.length ? undo[typed].x - undo[typed].w / 2 : undo[undo.length - 1].x + undo[undo.length - 1].w / 2;
    ctx.fillStyle = C.red;
    ctx.fillRect(cx + 2, yUndo - px * 0.42, Math.max(3, px * 0.06), px * 0.84);
  }
  // the brush slash that strikes it out
  if (slash > 0) {
    const x0 = undo[0].x - undo[0].w * 0.7, x1 = undo[undo.length - 1].x + undo[undo.length - 1].w * 0.4;
    brush(ctx, [[x0, yUndo + px * 0.25], [lerp(x0, x1, 0.5), yUndo - px * 0.02], [x1, yUndo - px * 0.3]], {
      width: px * 0.16, color: C.ink, progress: ease.out3(slash), dry: 0.6, seed: 66, press: 1.5,
    });
  }

  // the ⌘Z key, and Blot jumping on it
  const keyIn = ease.outBounce(seg(p, 0.445, 0.49));
  if (keyIn > 0) {
    const kx = w / 2, ky0 = yUndo + px * 1.15;
    const ky = lerp(-S * 0.3, ky0, keyIn);
    const presses = [0.505, 0.555];
    let press = 0;
    for (const q of presses) press = Math.max(press, 1 - Math.min(1, Math.abs(p - q) / 0.012));
    const kw = S * 0.24, kh = S * 0.15, depth = S * 0.035 * (1 - press * 0.75);
    // key body
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.roundRect(kx - kw / 2, ky - kh / 2 + depth, kw, kh, S * 0.025);
    ctx.fill();
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    ctx.roundRect(kx - kw / 2, ky - kh / 2 + (S * 0.035 - depth), kw, kh, S * 0.025);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(2, S * 0.006);
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.font = `${Math.round(kh * 0.42)}px "Dela Gothic One", system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⌘Z', kx, ky + (S * 0.035 - depth));
    // click lines on each press
    if (press > 0.3) {
      ctx.strokeStyle = C.red;
      ctx.lineWidth = Math.max(2, S * 0.005);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(kx + s * kw * 0.6, ky - kh * 0.2);
        ctx.lineTo(kx + s * kw * 0.8, ky - kh * 0.45);
        ctx.moveTo(kx + s * kw * 0.62, ky + kh * 0.05);
        ctx.lineTo(kx + s * kw * 0.86, ky + kh * 0.02);
        ctx.stroke();
      }
    }
    if (hit(presses[0]) || hit(presses[1])) f.shake(S * 0.006);
    // Blot: hops on, presses twice, then shrugs at the camera
    const hopIn = seg(p, 0.48, 0.5);
    if (hopIn > 0) {
      const top = ky - kh / 2 + (S * 0.035 - depth);
      let by = top;
      // between presses Blot is in the air
      const air = Math.max(0, Math.sin(seg(p, 0.505, 0.555) * Math.PI)) * S * 0.08;
      by -= air;
      const bx = lerp(w * 1.1, kx + kw * 0.12, ease.out3(hopIn)) ;
      const arc = hopIn < 1 ? Math.sin(hopIn * Math.PI) * S * 0.12 : 0;
      const done = p > 0.565;
      drawBlot(ctx, bx, by - arc, S * 0.13, {
        t, pose: done ? (p > 0.6 ? 'shock' : 'idle') : air > 0 ? 'cheer' : 'idle',
        look: done ? [w / 2, h * 0.95] : [kx, ky], seed: 31, squash: press * 0.8,
      });
      if (done) {
        ctx.font = font(Math.max(11, S * 0.032), F.serif, 600);
        ctx.fillStyle = 'rgba(20,18,15,0.7)';
        ctx.textAlign = 'center';
        const k = seg(p, 0.565, 0.58);
        ctx.globalAlpha = k;
        ctx.fillText('(nothing happens)', kx, ky + kh * 0.9);
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.restore();
}

/* ------------------------------------------------- III. SO MAKE IT MOVE. */

function cardThree(f: Frame, p: number, S: number) {
  const { ctx, w, h, t } = f;
  const px = fitPx(ctx, 'MAKE IT', w * 0.84, S * 0.26);
  ctx.font = font(px, F.display);
  const lines = [
    layout(ctx, 'SO', w / 2, h * 0.28),
    layout(ctx, 'MAKE IT', w / 2, h * 0.28 + px * 0.95),
    layout(ctx, 'MOVE.', w / 2, h * 0.28 + px * 1.9),
  ];
  const all = lines.flat();
  const fall = seg(p, 0.86, 0.95);
  const oIndex = all.findIndex((g, i) => g.ch === 'O' && i > 6);
  all.forEach((g, i) => {
    if (g.ch === ' ') return;
    const at = 0.67 + i * 0.012;
    const k = seg(p, at, at + 0.05);
    if (k <= 0) return;
    // a damped spring: pops up past its mark and settles, then keeps breathing
    const spring = 1 - Math.exp(-k * 7) * Math.cos(k * 12);
    const y = lerp(g.y + px * 1.6, g.y, spring) + Math.sin(t * 3 + i) * S * 0.004;
    const sq = 1 + Math.exp(-k * 5) * Math.sin(k * 20) * 0.25;
    if (i === oIndex) return; // the O is the ball
    // falling away at the end, each on its own tumble
    const fk = ease.in2(clamp(fall * 1.5 - hash(i) * 0.5));
    riso(ctx, g.ch, g.x + fk * (hash(i * 7) - 0.5) * w * 0.6, y + fk * h, px, fk * (hash(i * 3) - 0.5) * 3, sq, t, 1 - fk * 0.5);
  });
  // the ball rolls in from the right and takes the O's place...
  const o = all[oIndex];
  const roll = ease.out3(seg(p, 0.74, 0.82));
  if (roll > 0 && o) {
    const r0 = px * 0.36;
    // ...then leaves the word behind and goes to where the story needs it
    const go = ease.inOut3(seg(p, 0.87, 0.97));
    const tx = w / 2, ty = h * 0.42, tr = f.u * 4.2;
    const bx = lerp(lerp(w + r0 * 2, o.x, roll), tx, go);
    const by = lerp(o.y, ty, go) - Math.abs(Math.sin(roll * Math.PI * 3)) * (1 - roll) * px * 0.4;
    const r = lerp(r0, tr, go);
    const spin = -(1 - roll) * 12 + t * 0.4 * (1 - go);
    drawBall(ctx, bx, by, r, spin, t, 1);
  }
  void TAU;
}
