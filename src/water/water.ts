import { brush, ensoPath } from '../core/brush';
import type { Frame } from '../core/frame';
import { layoutWord, wordWidth } from '../core/glyphs';
import { type Pt, TAU, clamp, ease, hash, lerp, rng, seg } from '../core/math';
import { paperTile } from '../core/sprites';
import { C, F, font } from '../core/style';
import { drawSeal } from '../acts/ink';
import { InkWater } from './fluid';
import { drawInk } from '../acts/ink';

/*
 * INK IN WATER (round 14).
 *
 * The whole screen is a dish of still water on paper. A drop of ink falls and
 * blooms; as you scroll, the drifting clouds of ink gather into pictures and
 * let go of them again: mountains under a white moon, a bamboo grove, waves,
 * rain falling into the water, and at last one great ensō with Max's seal.
 *
 * Two layers, like real sumi-e: the soft wash is a live fluid simulation
 * (fluid.ts) pulled toward each picture's shape, and on top of it a few
 * crisp brush lines (the ridge, the moon's rim, the bamboo's leaves) fade in
 * once the ink has settled. Your finger stirs the water; a tap drops ink.
 */

export const W = {
  title: [0, 0.55] as const,
  drop: 0.42,
  mountains: [0.9, 2.9] as const,
  bamboo: [3.3, 5.1] as const,
  rain: [5.4, 6.8] as const,
  enso: [7.0, 8.1] as const,
  END: 8.7,
};

type Scene = 'mountains' | 'bamboo' | 'enso';

let water: InkWater | null = null;
let size = '';
let paper: CanvasPattern | null = null;
const targets = new Map<Scene, Float32Array>();
let lastT = 0, lastB = 0;
let dropped = false;
const ripples: { u: number; v: number; t0: number; big: number }[] = [];

/* ============================================================== input */

const finger = { u: 0, v: 0, t: -9 };
/** the finger moved (screen px): stir the water */
export function waterMove(x: number, y: number, t: number, w: number, h: number) {
  if (!water) return;
  const u = x / w, v = y / h;
  const dt = Math.max(0.008, t - finger.t);
  if (t - finger.t < 0.2) {
    const fx = clamp((u - finger.u) / dt, -3, 3), fy = clamp(((v - finger.v) / dt) * (h / w), -3, 3);
    water.addForce(u, v, fx * 0.6, fy * 0.6, 0.06);
  }
  finger.u = u;
  finger.v = v;
  finger.t = t;
}
/** a tap: a drop of ink and a ring */
export function waterTap(x: number, y: number, t: number, w: number, h: number) {
  if (!water) return;
  water.addInk(x / w, y / h, 0.035, 1.2);
  ripples.push({ u: x / w, v: y / h, t0: t, big: 1 });
  if (ripples.length > 24) ripples.shift();
}

/* ============================================================ targets */

/**
 * Each picture is real ink art, drawn once into a canvas the size of the screen with paper made
 * transparent (so it can fade in over the wash), and downsampled to the grid as the shape the
 * wash gathers into. The mountains are the original ink film's range (acts/ink.ts); the bamboo
 * and the ensō are drawn here.
 */
const arts = new Map<Scene, HTMLCanvasElement>();

function art(scene: Scene, f: Frame): HTMLCanvasElement {
  const have = arts.get(scene);
  if (have) return have;
  const { w, h } = f;
  const sc = 1.5;
  const c = document.createElement('canvas');
  c.width = Math.round(w * sc);
  c.height = Math.round(h * sc);
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.setTransform(sc, 0, 0, sc, 0, 0);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, w, h);
  const S = Math.min(w, h);
  if (scene === 'mountains') {
    // the original range: moonlit peaks, mist, the pine on the crag (day ink, title and characters off)
    drawInk({ ...f, ctx: g, B: 1.6, intro: 0, t: 1, vB: 0, hold: null }, 'day');
  } else if (scene === 'bamboo') drawBamboo(g, w, h, S);
  else {
    g.save();
    g.translate(w * 0.5, h * 0.42);
    const R = w * 0.33;
    g.scale(R / 100, R / 100);
    brush(g, ENSO, { width: 15, color: C.ink, progress: 1, dry: 0.45, seed: 3, press: 1.5, tail: 0.12 });
    g.restore();
  }
  // paper → transparent: alpha from how much darker than the paper each pixel is
  g.setTransform(1, 0, 0, 1, 0, 0);
  const im = g.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    const a = clamp((222 - lum) / 190);
    d[i] = 20; d[i + 1] = 18; d[i + 2] = 18;
    d[i + 3] = Math.round(a * 255);
  }
  g.putImageData(im, 0, 0);
  arts.set(scene, c);
  return c;
}

/** the art's darkness at grid resolution, blurred: what the wash gathers into */
function target(scene: Scene, f: Frame, nx: number, ny: number): Float32Array {
  const have = targets.get(scene);
  if (have) return have;
  const c = document.createElement('canvas');
  c.width = nx;
  c.height = ny;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(art(scene, f), 0, 0, nx, ny);
  const d = g.getImageData(0, 0, nx, ny).data;
  let out = new Float32Array(nx * ny);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] / 255;
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(out.length);
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue;
        sum += out[xx + yy * nx];
        n++;
      }
      tmp[x + y * nx] = Math.min(1, (sum / n) * 1.4);
    }
    out = tmp;
  }
  targets.set(scene, out);
  return out;
}

/** a bamboo grove: jointed stalks, twigs at the joints, drooping leaves in fans */
export function drawBamboo(g: CanvasRenderingContext2D, w: number, h: number, S: number) {
  const r = rng(8);
  // uneven spacing, near stalks dark and thick, far ones pale and thin
  const stalks: [number, boolean][] = [[0.08, true], [0.22, false], [0.31, false], [0.47, true], [0.6, false], [0.74, true], [0.9, false]];
  stalks.forEach(([u0, near], i) => {
    const wd = S * (near ? 0.034 : 0.022);
    const lean = (r() - 0.5) * 0.06;
    const tone = near ? 1 : 0.55;
    let y = h * 1.02;
    const top = -h * 0.05;
    const seg = h * (0.13 + r() * 0.04);
    const xAt = (yy: number) => (u0 + lean * (1 - yy / h)) * w;
    while (y > top) {
      const y1 = Math.max(top, y - seg);
      // one segment: a single loaded stroke, pressed at the joint
      brush(g, [[xAt(y), y], [xAt((y + y1) / 2) + wd * 0.1, (y + y1) / 2], [xAt(y1 + seg * 0.06), y1 + seg * 0.06]], {
        width: wd, color: C.ink, dry: 0.35, seed: 200 + i * 31 + Math.round(y), press: 1.15, tail: 0.85, alpha: tone,
      });
      // the joint: a short dark tick
      g.save();
      g.globalAlpha = tone;
      g.strokeStyle = C.ink;
      g.lineWidth = Math.max(1, wd * 0.22);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(xAt(y1) - wd * 0.55, y1 + seg * 0.03);
      g.quadraticCurveTo(xAt(y1), y1 - seg * 0.01, xAt(y1) + wd * 0.55, y1 + seg * 0.03);
      g.stroke();
      g.restore();
      // twigs and leaves from some joints, more near the top
      if (y1 < h * 0.6 && r() > 0.35) {
        const side = r() > 0.5 ? 1 : -1;
        const tx = xAt(y1) + side * S * (0.06 + r() * 0.05), ty = y1 - S * 0.03;
        g.save();
        g.globalAlpha = tone;
        g.strokeStyle = C.ink;
        g.lineWidth = Math.max(1, wd * 0.12);
        g.beginPath();
        g.moveTo(xAt(y1), y1);
        g.quadraticCurveTo((xAt(y1) + tx) / 2, y1 - S * 0.04, tx, ty);
        g.stroke();
        g.restore();
        const n = 3 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) {
          const a = Math.PI / 2 + side * (0.2 + k * 0.32) + (r() - 0.5) * 0.25;
          leaf(g, tx, ty, a, S * (0.1 + r() * 0.06), S * (0.016 + r() * 0.006), tone * (0.75 + r() * 0.25));
        }
      }
      y = y1 - seg * 0.04;
    }
  });
}

/** a bamboo leaf: pressed at the stem, swelling, tapering to a fine point */
function leaf(g: CanvasRenderingContext2D, x: number, y: number, a: number, L: number, wd: number, alpha: number) {
  const c = Math.cos(a), s = Math.sin(a);
  const P = (t: number, o: number): Pt => [x + c * t * L - s * o, y + s * t * L + c * o];
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = C.ink;
  g.beginPath();
  const a0 = P(0, 0), m1 = P(0.35, wd), m2 = P(0.35, -wd * 0.8), tip = P(1, wd * 0.15);
  g.moveTo(a0[0], a0[1]);
  g.quadraticCurveTo(m1[0], m1[1], tip[0], tip[1]);
  g.quadraticCurveTo(m2[0], m2[1], a0[0], a0[1]);
  g.fill();
  g.restore();
}

/* ============================================================== draw */

function setup(f: Frame) {
  const key = `${f.w}x${f.h}`;
  if (key === size && water) return;
  size = key;
  const nx = f.portrait ? 110 : 170;
  const ny = Math.round((nx * f.h) / f.w);
  water = new InkWater(nx, ny);
  targets.clear();
  arts.clear();
  dropped = false;
}

/** how strongly each scene holds the ink at beat B: 0 outside, rising, holding, letting go */
function hold(B: number, r: readonly [number, number]) {
  return ease.inOut2(seg(B, r[0], r[0] + 0.45)) * (1 - ease.inOut2(seg(B, r[1] - 0.35, r[1])));
}

export function drawWater(f: Frame) {
  setup(f);
  const wtr = water!;
  const { ctx, w, h, B, t } = f;
  const S = Math.min(w, h);
  const dt = clamp(t - lastT, 0, 0.05);
  lastT = t;
  const dB = B - lastB;
  lastB = B;
  if (!paper) paper = ctx.createPattern(paperTile(512, C.paper), 'repeat');
  ctx.fillStyle = paper!;
  ctx.fillRect(0, 0, w, h);

  // ---- the first drop: falls, and blooms
  const fall = seg(B, W.drop - 0.25, W.drop);
  if (B < W.drop && fall > 0) {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    const r0 = S * 0.014;
    ctx.ellipse(w * 0.5, lerp(-h * 0.05, h * 0.45, ease.in2(fall)), r0, r0 * (1 + fall * 1.4), 0, 0, TAU);
    ctx.fill();
  }
  if (B >= W.drop && !dropped) {
    dropped = true;
    wtr.addInk(0.5, 0.45, 0.06, 3);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + hash(i) * 0.4;
      wtr.addForce(0.5 + Math.cos(a) * 0.03, 0.45 + Math.sin(a) * 0.03, Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0.04);
    }
    ripples.push({ u: 0.5, v: 0.45, t0: t, big: 2 });
  }
  if (B < W.drop - 0.05) dropped = false;

  // ---- the water is never still; scrolling stirs it a little more
  // (stir adds per frame; with drag 1.4/s the current settles near `strength` widths/s)
  wtr.stir(t, (0.07 + Math.min(0.1, Math.abs(f.vB) * 0.06)) * dt * 1.4);
  // the scenes: pull the ink into each picture, let go between them
  const scenes: [Scene, readonly [number, number], number][] = [
    ['mountains', W.mountains, 0.3],
    ['bamboo', W.bamboo, 0.24],
    ['enso', W.enso, 0.45],
  ];
  let held = 0;
  for (const [sc, r, lvl] of scenes) {
    const k = hold(B, r);
    if (k <= 0) continue;
    held = Math.max(held, k);
    // ink comes in from the edges of the picture so it gathers rather than appears
    wtr.attract(target(sc, f, wtr.nx, wtr.ny), 1.4 * k, lvl, 1.2 * k, dt);
  }
  // rain: drops fall into the water
  const rain = ease.inOut2(seg(B, W.rain[0], W.rain[0] + 0.3)) * (1 - ease.inOut2(seg(B, W.rain[1] - 0.3, W.rain[1])));
  if (rain > 0 && Math.random() < rain * dt * 9) {
    const u = 0.05 + Math.random() * 0.9, v = 0.1 + Math.random() * 0.85;
    wtr.addInk(u, v, 0.02, 0.5);
    ripples.push({ u, v, t0: t, big: 0.6 });
  }
  // the old ink thins away between pictures, so nothing turns to mud
  wtr.step(dt, held > 0.5 ? 0.05 : 1.1);
  void dB;
  wtr.render(ctx, 0, 0, w, h);

  // ---- crisp brushwork once the wash has settled
  drawLines(f, S);
  drawRain(f, rain, S);
  drawRipples(ctx, w, h, t, S);
  drawTitle(f, S);
  drawEnd(f, S);
}

/* ----------------------------------------- the art, out of the wash */

function drawLines(f: Frame, _S: number) {
  const { ctx, w, h, B } = f;
  // each picture's brushwork comes up through the wash once it has gathered, and sinks back before it lets go
  const show = (r: readonly [number, number]) => ease.inOut2(seg(B, r[0] + 0.3, r[0] + 0.75)) * (1 - ease.inOut2(seg(B, r[1] - 0.5, r[1] - 0.1)));
  for (const [sc, r] of [['mountains', W.mountains], ['bamboo', W.bamboo]] as const) {
    const k = show(r);
    if (k <= 0) continue;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.drawImage(art(sc, f), 0, 0, w, h);
    ctx.restore();
  }
  // the ensō: the brush goes round once, over the gathered wash
  const e = seg(B, W.enso[0] + 0.3, W.enso[0] + 0.8);
  if (e > 0) {
    const R = w * 0.33;
    ctx.save();
    ctx.translate(w * 0.5, h * 0.42);
    ctx.scale(R / 100, R / 100);
    brush(ctx, ENSO, { width: 15, color: C.ink, progress: ease.inOut2(e), dry: 0.45, seed: 3, press: 1.5, tail: 0.12 });
    ctx.restore();
  }
}
export const ENSO = ensoPath(0, 0, 100, 3, 0.9, -2.2);

function drawRain(f: Frame, k: number, S: number) {
  if (k <= 0) return;
  const { ctx, w, h, t } = f;
  ctx.save();
  ctx.strokeStyle = `rgba(30,28,26,${0.35 * k})`;
  ctx.lineWidth = Math.max(1, S * 0.002);
  ctx.beginPath();
  const n = Math.floor(70 * k);
  for (let i = 0; i < n; i++) {
    const x = hash(i * 2.1) * w + Math.sin(t + i) * 4;
    const y = ((hash(i * 5.7) + t * (0.7 + hash(i) * 0.5)) % 1.1) * h - h * 0.05;
    const L = S * (0.05 + hash(i * 3) * 0.05);
    ctx.moveTo(x, y);
    ctx.lineTo(x - L * 0.08, y + L);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRipples(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, S: number) {
  ctx.save();
  ctx.strokeStyle = C.ink;
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    const age = t - r.t0;
    const life = 1.6 * r.big;
    if (age > life || age < 0) {
      ripples.splice(i, 1);
      continue;
    }
    const k = age / life;
    for (let j = 0; j < 2; j++) {
      const kk = k - j * 0.15;
      if (kk <= 0) continue;
      ctx.globalAlpha = 0.35 * (1 - kk);
      ctx.lineWidth = Math.max(0.8, S * 0.003 * (1 - kk));
      ctx.beginPath();
      ctx.ellipse(r.u * w, r.v * h, S * 0.12 * r.big * ease.out2(kk), S * 0.12 * r.big * ease.out2(kk) * 0.92, 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------ title and end */

let titleCache: { key: string; max: ReturnType<typeof layoutWord>; gab: ReturnType<typeof layoutWord>; ms: number; gs: number } | null = null;

function drawTitle(f: Frame, S: number) {
  const { ctx, w, h, B } = f;
  const fade = 1 - seg(B, W.title[1] - 0.25, W.title[1]);
  if (fade <= 0) return;
  const key = `${w}x${h}`;
  if (titleCache?.key !== key) {
    const ms = Math.min(w * 0.2, h * 0.12), gs = ms * 0.36;
    const mw = wordWidth('MAX', ms, 0.16), gw = wordWidth('GABRIEL', gs, 0.3);
    titleCache = { key, ms, gs, max: layoutWord('MAX', w / 2 - mw / 2, h * 0.2, ms, 0.16), gab: layoutWord('GABRIEL', w / 2 - gw / 2, h * 0.2 + ms * 1.35, gs, 0.3) };
  }
  const { max, gab, ms, gs } = titleCache;
  const I = f.intro;
  max.strokes.forEach((s, i) => {
    const on = ease.inOut2(seg(I, 0.3 + i * 0.12, 0.5 + i * 0.12));
    brush(ctx, s.pts, { width: ms * 0.14, color: C.ink, progress: on, dry: 0.45, seed: 40 + i, press: 1.35, tail: 0.25, alpha: fade });
  });
  gab.strokes.forEach((s, i) => {
    const on = ease.inOut2(seg(I, 1.1 + i * 0.06, 1.3 + i * 0.06));
    brush(ctx, s.pts, { width: gs * 0.13, color: C.ink, progress: on, dry: 0.4, seed: 60 + i, press: 1.3, tail: 0.3, alpha: fade });
  });
  const small = seg(I, 1.8, 2.3) * fade;
  if (small > 0) {
    ctx.save();
    ctx.globalAlpha = small * 0.75;
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.font = font(Math.max(11, Math.round(S * 0.03)), F.serif, 600);
    ctx.fillText('designs and builds things that move.', w / 2, h * 0.2 + ms * 2.1);
    ctx.font = font(Math.max(10, Math.round(S * 0.026)), F.serif, 600);
    ctx.globalAlpha = small * 0.5 * (0.6 + 0.4 * Math.sin(f.t * 2));
    ctx.fillText('scroll, and touch the water', w / 2, h * 0.9);
    ctx.restore();
  }
}

function drawEnd(f: Frame, S: number) {
  const { ctx, w, h, B, t } = f;
  const st = ease.outBack(seg(B, W.enso[0] + 0.8, W.enso[0] + 1.0), 2.2);
  if (st <= 0) return;
  const s = S * 0.13 * (1.5 - 0.5 * Math.min(1, st));
  drawSeal(ctx, w * 0.5 + w * 0.2, h * 0.42 + w * 0.22, s, -0.08 + Math.sin(t * 0.8) * 0.01, Math.min(1, st));
}
