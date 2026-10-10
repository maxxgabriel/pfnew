import { drawSeal } from '../acts/ink';
import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { type Pt, TAU, ease, lerp, seg } from '../core/math';
import { canvas } from '../core/sprites';
import { drawInk } from './ink';
import { PRE, drawFold } from './fold';
import { drawShadow } from './shadow';
import { drawImpact } from './impact';
import { PIG } from './painting';

/*
 * V · THE PAGE.
 *
 * The white the last chapter burned to is the inside of a brushed circle on
 * a page. The camera pulls out of it; round it, four more circles brush
 * themselves onto the paper, and each one is a chapter still playing: the
 * duel, the crane, the bulb, the beams. The seal stamps into the middle one.
 * A single stroke runs round all four, in order, and ends at the seal — a
 * signature — and the contact card rises under it.
 */

/** local beats */
export const PG = {
  pull: [0, 1.7] as const,
  rings: [0.55, 1.5] as const,
  live: [0.9, 1.8] as const,
  seal: 2.0,
  sign: [2.3, 3.2] as const,
  end: 6.0,
};

const PAPER = '#f3eee3';
const INK = '#1b1714';

/** each ring's chapter, the stretch of it that loops, and its order round the ring (from the top, clockwise) */
const LOOPS: { draw: (f: Frame, L: number) => void; from: number; a: number; b: number }[] = [
  { draw: (f) => drawInk(f), from: 0, a: 2.4, b: 7.9 },
  { draw: drawFold, from: 9.6, a: PRE + 1.2, b: PRE + 5.2 },
  { draw: drawShadow, from: 17.6, a: 0.8, b: 4.6 },
  { draw: drawImpact, from: 23.8, a: 0.6, b: 4.7 },
];
const SPEED = 0.6; // beats a second inside the circles
/** the first circle's angle: a corner, so four sit as a square and clear the sides of a phone */
const A0 = -Math.PI / 2 + Math.PI / LOOPS.length;

/** the page's layout: the centre circle and the others round it, clear of the contact card */
function layout(w: number, h: number) {
  const r = Math.min(w * 0.15, h * 0.075);
  const D = r * 2.18;
  // low enough that the wreath clears the top, high enough to clear the contact card
  const c: Pt = [w / 2, Math.max(h * 0.32, D + r * 1.45 + h * 0.06)];
  const ring = LOOPS.map((_, i) => {
    const an = A0 + (i / LOOPS.length) * TAU;
    return [c[0] + Math.cos(an) * D, c[1] + Math.sin(an) * D] as Pt;
  });
  return { r, c, ring };
}

// a brushed ring (radius 100 around 0,0), slightly open, as an ensō is
const RINGS: Pt[][] = Array.from({ length: 7 }, (_, k) => {
  const a0 = -2.1 + k * 0.9, sweep = TAU * (0.9 + (k % 3) * 0.025);
  const pts: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const an = a0 + (i / 40) * sweep;
    const rr = 100 * (1 + 0.025 * Math.sin(an * 3 + k) + (i / 40) * 0.04);
    pts.push([Math.cos(an) * rr, Math.sin(an) * rr]);
  }
  return pts;
});

/* ------------------------------------------------------------ the minis */

const layer = { c: null as HTMLCanvasElement | null, key: '' };
const minis: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D; at: number }[] = [];
let turn = 0;

function miniFrame(parent: Frame, ctx: CanvasRenderingContext2D, size: number, B: number): Frame {
  return {
    ...parent,
    ctx,
    w: size,
    h: size,
    u: size / 100,
    portrait: false,
    B,
    vB: 0,
    hold: null,
    crossed: () => false,
    crossedFwd: () => false,
    shake: () => {},
    flash: () => {},
  };
}

/** paint the chapters into their circles, one a frame (each runs at ~10 fps, like a flip book), so the page stays cheap */
function updateMinis(f: Frame, size: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const px = Math.max(8, Math.round(size * dpr));
  for (let i = 0; i < LOOPS.length; i++) {
    if (!minis[i] || minis[i].c.width !== px) {
      const m = canvas(px, px);
      minis[i] = { c: m.c, ctx: m.ctx, at: -1 };
    }
  }
  {
    const i = turn++ % LOOPS.length;
    const m = minis[i], lp = LOOPS[i];
    const span = lp.b - lp.a;
    const L = lp.a + ((f.t * SPEED + i * 1.7) % span);
    m.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    m.ctx.save();
    try {
      lp.draw(miniFrame(f, m.ctx, size, lp.from + L), L);
    } catch {
      /* a chapter that can't draw this small just keeps its last picture */
    }
    m.ctx.restore();
    m.at = f.t;
  }
}

/* ------------------------------------------------------------ the chapter */

export function drawPage(f: Frame, L: number) {
  const { ctx, w, h } = f;
  const { r, c, ring } = layout(w, h);
  // the camera pulls out of the centre circle
  const kz = ease.inOut3(seg(L, PG.pull[0], PG.pull[1]));
  const zoom = Math.exp(lerp(Math.log(Math.hypot(w, h) / r * 0.62), 0, kz));
  if (f.crossedFwd(f.B - L + PG.seal)) f.shake(Math.min(w, h) * 0.02);

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);

  const live = seg(L, PG.live[0], PG.live[1]);
  if (live > 0) updateMinis(f, r * 2);

  ctx.save();
  // the centre circle starts filling the screen and settles into its place on the page
  ctx.translate(lerp(w / 2, c[0], kz), lerp(h / 2, c[1], kz));
  ctx.scale(zoom, zoom);
  ctx.translate(-c[0], -c[1]);

  // the chapters, in their circles
  ring.forEach((p, i) => {
    const rk = ease.out3(seg(L, PG.rings[0] + i * 0.1, PG.rings[0] + i * 0.1 + 0.45));
    if (rk <= 0) return;
    const m = minis[i];
    if (m && live > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p[0], p[1], r * 0.94, 0, TAU);
      ctx.clip();
      ctx.globalAlpha = live;
      ctx.drawImage(m.c, p[0] - r, p[1] - r, r * 2, r * 2);
      ctx.restore();
    } else {
      // ink washing in before the picture arrives
      ctx.save();
      ctx.globalAlpha = 0.12 * rk;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(p[0], p[1], r * 0.9 * rk, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  });
  ctx.restore();

  // the ink on the page: painted live while it's being painted, then kept
  const done = L >= PG.sign[1] + 0.05;
  const key = `${w}|${h}`;
  if (done && layer.key === key && layer.c) {
    ctx.drawImage(layer.c, 0, 0, w, h);
    return;
  }
  let g = ctx;
  if (done) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const o = canvas(Math.round(w * dpr), Math.round(h * dpr));
    o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layer.c = o.c;
    layer.key = key;
    g = o.ctx;
  }
  g.save();
  g.translate(lerp(w / 2, c[0], kz), lerp(h / 2, c[1], kz));
  g.scale(zoom, zoom);
  g.translate(-c[0], -c[1]);
  ring.forEach((p, i) => ring_(g, p, r, RINGS[i + 1], ease.out3(seg(L, PG.rings[0] + i * 0.1, PG.rings[0] + i * 0.1 + 0.45)), i + 2, 1));
  ring_(g, c, r, RINGS[0], 1, 1, 1.1);
  const st = seg(L, PG.seal - 0.1, PG.seal);
  if (st > 0) {
    const s = r * 0.62 * lerp(1.7, 1, ease.in3(st));
    drawSeal(g, c[0], c[1], s, -0.06, Math.min(1, st * 3));
    // the ink the stamp squeezes out
    const sp = seg(L, PG.seal, PG.seal + 0.25);
    if (sp > 0 && sp < 1) {
      g.save();
      g.globalAlpha = 1 - sp;
      g.strokeStyle = PIG.red;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(c[0], c[1], s * (0.8 + sp * 0.9), 0, TAU);
      g.stroke();
      g.restore();
    }
  }
  // the signature: one stroke wreathing every chapter, in order
  const sk = seg(L, PG.sign[0], PG.sign[1]);
  if (sk > 0) brush(g, signPath(ring, c, r), { width: r * 0.075, color: INK, progress: ease.inOut2(sk), seed: 7, dry: 0.6, press: 1.8, tail: 0.15, alpha: 0.9 });
  g.restore();
  if (done) ctx.drawImage(layer.c!, 0, 0, w, h);
}

// the signature's path is cached per layout so the brush can keep its preparation
let signKey = '';
let signPts: Pt[] = [];
function signPath(ring: Pt[], c: Pt, r: number): Pt[] {
  const key = `${ring[0][0]}|${ring[0][1]}|${r}`;
  if (key === signKey) return signPts;
  signKey = key;
  // a wreath round the outside, bulging past each circle and dipping between, one turn and a flick
  const D = Math.hypot(ring[0][0] - c[0], ring[0][1] - c[1]);
  const pts: Pt[] = [];
  const a0 = -Math.PI / 2 - 0.45;
  for (let i = 0; i <= 72; i++) {
    const u = i / 72;
    const an = a0 + u * TAU * 1.04;
    const R = D + r * 1.18 + r * 0.16 * Math.cos(LOOPS.length * (an - A0)) - u * r * 0.12;
    pts.push([c[0] + Math.cos(an) * R, c[1] + Math.sin(an) * R]);
  }
  const last = pts[pts.length - 1];
  pts.push([last[0] + r * 0.5, last[1] + r * 0.05]);
  signPts = pts;
  return pts;
}

function ring_(ctx: CanvasRenderingContext2D, p: Pt, r: number, pts: Pt[], k: number, seed: number, wd: number) {
  if (k <= 0) return;
  ctx.save();
  ctx.translate(p[0], p[1]);
  ctx.scale(r / 100, r / 100);
  brush(ctx, pts, { width: 9 * wd, color: INK, progress: k, seed, dry: 0.55, press: 1.5, tail: 0.3 });
  ctx.restore();
}

