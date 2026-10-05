import { drawBlot } from '../core/blot';
import { brush, ensoPath } from '../core/brush';
import type { Frame } from '../core/frame';
import { POWERS_AT } from '../core/holds';
import { type Pt, TAU, ease, lerp, seg } from '../core/math';
import { drawSprite, glow, paperTile, withAlpha } from '../core/sprites';
import { C } from '../core/style';
import { alterShotP, drawAlter } from './alter';
import { drawInk } from './ink';
import { drawMachine, machineBall } from './machine';
import { drawMatch } from './match';
import { drawRide, rideShotP } from './ride';

/*
 * V · POWERS OF TEN.
 *
 * After the goal the camera pulls back and never stops. The net is the
 * stadium's glow in the city Blot rode through; the city is a star in the
 * sky of the back of the page; that sky is the ball inside the machine;
 * the machine is the pearl between the two ink warriors; the duel is the
 * first circle the brush ever painted, on one sheet of paper, with the Hand
 * still holding the brush and Blot sitting beside it. Circles inside circles,
 * one world per step, and it was one drawing all along.
 *
 * Every world is drawn live by its own act under a camera transform, so the
 * zoom stays sharp at any scale and the ambient motion keeps going.
 */


interface Portal { x: number; y: number; r: number }
interface Level {
  draw(f: Frame): void;
  /** where the next world in is drawn, in this world's screen coordinates */
  portal?(f: Frame): Portal;
  /** decorate the portal's edge (drawn in this world's coordinates, over the inner world) */
  edge?(f: Frame, P: Portal, k: number): void;
}

const noop = () => {};
const no = () => false;
function sub(f: Frame, B: number): Frame {
  return { ...f, B, hold: null, vB: 0, dt: 0, crossed: no, crossedFwd: no, shake: noop, flash: noop };
}

/* ------------------------------------------------------------- the page */

let paperPat: CanvasPattern | null = null;
const ENSO = ensoPath(0, 0, 100, 8, 0.95, -2.0);

/** the finale's composition: where the first circle sits on the page */
export function pageEnso(f: { w: number; h: number; portrait: boolean }) {
  const { w, h, portrait } = f;
  return { x: w / 2, y: h * (portrait ? 0.3 : 0.31), r: Math.min(w * 0.34, h * (portrait ? 0.19 : 0.2)) };
}
export { ENSO as PAGE_ENSO };

/**
 * The Hand: the artist, never more than a black silhouette with a paper rim.
 * `tip` is where the brush touches the page; the arm comes in from the right.
 */
export function drawHand(ctx: CanvasRenderingContext2D, tip: Pt, S0: number, t: number, alpha = 1, lift = 0) {
  if (alpha <= 0) return;
  const S = S0 * 0.8;
  const th = -1.32 + Math.sin(t * 0.9) * 0.02;
  const d: Pt = [Math.cos(th), Math.sin(th)], n: Pt = [-d[1], d[0]];
  const P = (a: number, b: number): Pt => [tip[0] + (d[0] * a + n[0] * b) * S, tip[1] - lift * S + (d[1] * a + n[1] * b) * S];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const poly = (pts: Pt[], fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fill();
  };
  const cap = (a0: number, b0: number, a1: number, b1: number, wd: number, col: string) => {
    const p0 = P(a0, b0), p1 = P(a1, b1);
    ctx.strokeStyle = col;
    ctx.lineWidth = wd * S;
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.stroke();
  };
  // the brush: bristles, ferrule, bamboo handle with two nodes
  poly([P(0, 0), P(0.055, -0.011), P(0.07, -0.009), P(0.07, 0.009), P(0.055, 0.011)], C.ink);
  cap(0.07, 0, 0.09, 0, 0.022, '#6d5a3a');
  cap(0.09, 0, 0.44, 0, 0.016, '#2d2318');
  for (const a of [0.19, 0.33]) cap(a, -0.008, a, 0.008, 0.004, '#0d0a07');
  // the sleeve: soft cloth from the wrist, curving away off the page, a few folds
  const curve = (pts: Pt[], fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ctx.closePath();
    ctx.fill();
  };
  // (it runs on off the edge of the frame: an arm reaching in, never a closed shape on the page)
  const sleeve: Pt[] = [P(0.29, 0.075), P(0.33, -0.035), P(0.55, -0.065), P(0.95, -0.05), P(1.7, 0.0), P(2.8, 0.08), P(2.8, 0.4), P(1.7, 0.33), P(0.95, 0.28), P(0.6, 0.24), P(0.42, 0.16)];
  ctx.save();
  ctx.translate(-1.5, -1.5);
  curve(sleeve, withAlpha(C.paper, 0.9));
  ctx.restore();
  curve(sleeve, '#100e0c');
  ctx.strokeStyle = withAlpha(C.paper, 0.2);
  ctx.lineWidth = Math.max(1, S * 0.003);
  for (const [a0, b0, a1, b1] of [[0.44, 0.05, 0.78, 0.12], [0.48, 0.13, 0.75, 0.24], [0.5, -0.02, 0.8, 0.02]]) {
    const p0 = P(a0, b0), p1 = P(a1, b1);
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.quadraticCurveTo((p0[0] + p1[0]) / 2 + S * 0.01, (p0[1] + p1[1]) / 2, p1[0], p1[1]);
    ctx.stroke();
  }
  // the hand: a loose fist around the handle, thumb and index pinching it
  const hand = (col: string) => {
    poly([P(0.15, -0.03), P(0.19, -0.05), P(0.27, -0.045), P(0.32, 0.0), P(0.3, 0.08), P(0.22, 0.09), P(0.16, 0.05)], col);
    cap(0.2, -0.04, 0.125, -0.02, 0.024, col); // index along the handle
    cap(0.19, 0.045, 0.13, 0.017, 0.026, col); // thumb opposite
    cap(0.22, 0.075, 0.17, 0.06, 0.022, col); // curled fingers under
    cap(0.25, 0.085, 0.2, 0.08, 0.02, col);
  };
  // a paper rim, then the black hand over it
  ctx.save();
  ctx.translate(-1.4, -1.4);
  const ink = '#100e0c';
  hand(withAlpha(C.paper, 0.85));
  ctx.restore();
  hand(ink);
  // the knuckles catch the light
  ctx.strokeStyle = withAlpha(C.paper, 0.35);
  ctx.lineWidth = Math.max(1, S * 0.0025);
  ctx.beginPath();
  const k0 = P(0.2, -0.045), k1 = P(0.29, -0.03);
  ctx.moveTo(k0[0], k0[1]);
  ctx.quadraticCurveTo((k0[0] + k1[0]) / 2 - S * 0.01, (k0[1] + k1[1]) / 2 - S * 0.01, k1[0], k1[1]);
  ctx.stroke();
  ctx.restore();
}

function pageLevel(f: Frame) {
  const { ctx, w, h } = f;
  if (!paperPat) paperPat = ctx.createPattern(paperTile(512, C.paper), 'repeat');
  ctx.fillStyle = paperPat!;
  ctx.fillRect(0, 0, w, h);
}

/* ----------------------------------------------------------- the worlds */

const LEVELS: Level[] = [
  // 0: the net, the ball in it
  { draw: (f) => drawMatch(sub(f, POWERS_AT)) },
  // 1: the city at night; the stadium is a glow among the towers
  {
    draw: (f) => drawRide(sub(f, f.B), rideShotP('chase', 0.92)),
    portal: (f) => {
      const S = Math.min(f.w, f.h);
      return { x: f.w * 0.74, y: f.h * 0.62 + f.h * 0.05 - S * 0.3 * 0.3, r: S * 0.11 };
    },
    edge: (f, P, k) => stadiumEdge(f.ctx, P, k),
  },
  // 2: the back of the page; the city is a star in its sky
  {
    draw: (f) => drawAlter(sub(f, f.B), alterShotP('after', 0.85)),
    portal: (f) => ({ x: f.w * 0.3, y: f.h * 0.2, r: Math.min(f.w, f.h) * 0.1 }),
    edge: (f, P, k) => starEdge(f.ctx, P, k, f.t),
  },
  // 2: the machine; the back of the page is inside the ball
  {
    draw: (f) => drawMachine(sub(f, 11.3)),
    portal: (f) => {
      const [x, y, r] = machineBall(f, 11.3);
      return { x, y, r };
    },
    edge: (f, P, k) => ballEdge(f.ctx, P, k),
  },
  // 3: the ink duel; the machine is the pearl between the blades
  {
    draw: (f) => drawInk(sub({ ...f, t: 0 }, 6.1)),
    portal: (f) => ({ x: f.w / 2, y: f.h * 0.555, r: Math.min(f.w, f.h) * 0.12 }),
    edge: (f, P, k) => orbEdge(f.ctx, P, k, f.t),
  },
  // 4: one sheet of paper; the duel is the first circle the brush painted
  {
    draw: (f) => pageLevel(f),
    portal: (f) => {
      const E = pageEnso(f);
      return { x: E.x, y: E.y, r: E.r * 0.86 };
    },
    edge: (f, P, k) => ensoEdge(f, P, k),
  },
];

function starEdge(ctx: CanvasRenderingContext2D, P: Portal, k: number, t: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.save();
  ctx.beginPath();
  ctx.rect(P.x - P.r * 4, P.y - P.r * 4, P.r * 8, P.r * 8);
  ctx.arc(P.x, P.y, P.r, 0, TAU, true);
  ctx.clip();
  ctx.globalAlpha = k;
  drawSprite(ctx, glow('#ffd27a', 128), P.x, P.y, P.r * 4.5);
  ctx.restore();
  ctx.globalAlpha = k;
  ctx.strokeStyle = '#fff6dc';
  ctx.lineWidth = P.r * 0.06;
  ctx.beginPath();
  ctx.arc(P.x, P.y, P.r, 0, TAU);
  ctx.stroke();
  ctx.translate(P.x, P.y);
  ctx.rotate(t * 0.15);
  ctx.fillStyle = '#fff6dc';
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(P.r * 0.95, -P.r * 0.06);
    ctx.lineTo(P.r * 2.6, 0);
    ctx.lineTo(P.r * 0.95, P.r * 0.06);
    ctx.fill();
  }
  ctx.restore();
}

function stadiumEdge(ctx: CanvasRenderingContext2D, P: Portal, k: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.rect(P.x - P.r * 4, P.y - P.r * 4, P.r * 8, P.r * 8);
  ctx.arc(P.x, P.y, P.r, 0, TAU, true);
  ctx.clip();
  ctx.globalAlpha = 0.7 * k;
  drawSprite(ctx, glow('#9fd2ff', 128), P.x, P.y, P.r * 4);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = k;
  ctx.strokeStyle = 'rgba(220,236,255,0.9)';
  ctx.lineWidth = Math.max(1, P.r * 0.05);
  ctx.beginPath();
  ctx.arc(P.x, P.y, P.r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function ballEdge(ctx: CanvasRenderingContext2D, P: Portal, k: number) {
  ctx.save();
  ctx.globalAlpha = k;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = P.r * 0.14;
  ctx.beginPath();
  ctx.arc(P.x, P.y, P.r, 0, TAU);
  ctx.stroke();
  // a cartoon shine on the glass of it
  ctx.strokeStyle = withAlpha('#ffffff', 0.7);
  ctx.lineWidth = P.r * 0.07;
  ctx.beginPath();
  ctx.arc(P.x, P.y, P.r * 0.78, -2.6, -1.8);
  ctx.stroke();
  ctx.restore();
}

function orbEdge(ctx: CanvasRenderingContext2D, P: Portal, k: number, t: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // the glow sits around the pearl, not over the world inside it
  ctx.beginPath();
  ctx.rect(P.x - P.r * 4, P.y - P.r * 4, P.r * 8, P.r * 8);
  ctx.arc(P.x, P.y, P.r, 0, TAU, true);
  ctx.clip();
  ctx.globalAlpha = k * 0.8;
  drawSprite(ctx, glow(C.blue, 128), P.x - P.r * 0.3, P.y, P.r * 3.6);
  drawSprite(ctx, glow(C.green, 128), P.x + P.r * 0.3, P.y, P.r * 3.6);
  ctx.globalAlpha = k;
  ctx.strokeStyle = withAlpha('#ffffff', 0.85);
  ctx.lineWidth = P.r * 0.05;
  ctx.beginPath();
  ctx.arc(P.x, P.y, P.r * (1 + Math.sin(t * 9) * 0.01), 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function ensoEdge(f: Frame, P: Portal, k: number) {
  const { ctx, t } = f;
  const E = pageEnso(f);
  void P;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(E.x, E.y);
  ctx.rotate(t * 0.03);
  ctx.scale(E.r / 100, E.r / 100);
  brush(ctx, ENSO, { width: 15, color: C.ink, dry: 0.42, seed: 8, press: 1.5, tail: 0.12 });
  ctx.restore();
}

/* ------------------------------------------------------------- the zoom */

let buf: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D; key: string } | null = null;

/** how much of world `li` fits in its parent's portal: the disc of radius S/2 */
const kOf = (f: Frame, P: Portal) => P.r / (Math.min(f.w, f.h) / 2);

/** the pull-back: p runs 0→1 over the hold */
export function drawPowers(f: Frame, p: number) {
  const { ctx, w, h } = f;
  const N = LEVELS.length - 1;
  const zoom = seg(p, 0, 0.86);
  // each step slows a touch as it reaches its world, so every world registers
  const zs = zoom * N;
  const i = Math.min(N - 1, Math.floor(zs));
  const fr = zoom >= 1 ? 1 : zs - i;
  const ef = lerp(fr, ease.inOut2(fr), 0.6);
  const Cx = w / 2, Cy = h / 2;
  const outer = LEVELS[i + 1];
  const P = outer.portal!(f);
  const k = kOf(f, P);
  // at the start of a step the inner world is exactly full screen (s·k = 1); at the end the outer is (s = 1)
  const s0 = 1 / k;
  const s = s0 ** (1 - ef);
  const wgt = (s0 / s - 1) / (s0 - 1);
  const cx = lerp(P.x, Cx, wgt), cy = lerp(P.y, Cy, wgt);
  const camera = () => {
    ctx.translate(Cx, Cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
  };
  // the next world out appears around the circle like an iris closing
  const around = ease.inOut2(seg(ef, 0, 0.14));
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  // the inner world, filling its circle (and, while the iris closes, the whole frame)
  ctx.save();
  camera();
  ctx.translate(P.x, P.y);
  ctx.scale(k, k);
  ctx.translate(-w / 2, -h / 2);
  drawLevel(f, i, 1);
  ctx.restore();
  // at the very end the duel dries back into the paper: the page is blank again, ready to be signed
  const dry = seg(p, 0.9, 1);
  if (dry > 0 && i + 1 === N && fr >= 1) {
    if (!paperPat) paperPat = ctx.createPattern(paperTile(512, C.paper), 'repeat');
    ctx.save();
    camera();
    ctx.globalAlpha = ease.inOut2(dry);
    ctx.fillStyle = paperPat!;
    ctx.beginPath();
    ctx.arc(P.x, P.y, P.r * 1.02, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // the outer world, everywhere outside the circle; drawn straight to the frame
  // once it's fully in, and aside (so it can fade) only while the iris closes
  if (around >= 1) {
    ctx.save();
    camera();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.arc(P.x, P.y, P.r, 0, TAU, true);
    ctx.clip();
    outer.draw(f);
    if (i + 1 === N) pageLife(f, p);
    ctx.restore();
    ctx.save();
    camera();
    outer.edge?.(f, P, 1);
    ctx.restore();
  } else if (around > 0) {
    const dpr = ctx.getTransform().a;
    const key = `${w}x${h}x${dpr}`;
    if (buf?.key !== key) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * dpr);
      c.height = Math.ceil(h * dpr);
      buf = { c, ctx: c.getContext('2d')!, key };
    }
    const b = buf!;
    b.ctx.setTransform(1, 0, 0, 1, 0, 0);
    b.ctx.clearRect(0, 0, b.c.width, b.c.height);
    b.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fb: Frame = { ...f, ctx: b.ctx };
    b.ctx.save();
    b.ctx.translate(Cx, Cy);
    b.ctx.scale(s, s);
    b.ctx.translate(-cx, -cy);
    b.ctx.save();
    b.ctx.beginPath();
    b.ctx.rect(0, 0, w, h);
    b.ctx.clip();
    outer.draw(fb);
    b.ctx.restore();
    if (i + 1 === N) pageLife(fb, p);
    // cut the circle out, so the inner world shows through
    b.ctx.globalCompositeOperation = 'destination-out';
    b.ctx.beginPath();
    b.ctx.arc(P.x, P.y, P.r, 0, TAU);
    b.ctx.fill();
    b.ctx.globalCompositeOperation = 'source-over';
    outer.edge?.(fb, P, 1);
    b.ctx.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = around;
    ctx.drawImage(b.c, 0, 0);
    ctx.restore();
  }
}

/** the page's own life: Blot beside the circle, the Hand that drew it all */
function pageLife(f: Frame, p: number) {
  const { ctx, w, h } = f;
  const S = Math.min(w, h);
  const E = pageEnso(f);
  const settle = ease.inOut2(seg(p, 0.88, 1));
  drawBlot(ctx, ...blotSpot(f), S * 0.09, { t: f.t, pose: 'idle', look: [E.x + E.r * 0.8, E.y + E.r * 0.9], seed: 4, eye: C.white, rot: -0.06 });
  drawHand(ctx, handRest(f), S, f.t, 1, settle * 0.02);
  void h;
}

/** where Blot sits on the page, beside the circle */
export function blotSpot(f: { w: number; h: number; portrait: boolean }): [number, number] {
  const E = pageEnso(f);
  return [E.x - E.r * 1.12, E.y + E.r * 0.62];
}

/** where the brush rests on the page when it isn't writing */
export function handRest(f: { w: number; h: number; portrait: boolean }): Pt {
  const E = pageEnso(f);
  return [E.x + E.r * 0.95, E.y + E.r * 0.6];
}

/** draw world `li` in its own coordinates, with the next world in its portal (to `depth` levels) */
function drawLevel(f: Frame, li: number, depth: number) {
  const { ctx, w, h } = f;
  const L = LEVELS[li];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  L.draw(f);
  ctx.restore();
  if (li === LEVELS.length - 1) pageLife(f, 1);
  if (!L.portal || li === 0 || depth <= 0) return;
  const P = L.portal(f);
  const k = kOf(f, P);
  if (ctx.getTransform().a * P.r > 1.5) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(P.x, P.y, P.r, 0, TAU);
    ctx.clip();
    ctx.translate(P.x, P.y);
    ctx.scale(k, k);
    ctx.translate(-w / 2, -h / 2);
    drawLevel(f, li - 1, depth - 1);
    ctx.restore();
  }
  L.edge?.(f, P, 1);
}
