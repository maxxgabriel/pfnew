import { brush, ensoPath } from '../core/brush';
import type { Frame } from '../core/frame';
import { layoutWord, wordWidth } from '../core/glyphs';
import { type Pt, TAU, clamp, ease, fbm1, hash, lerp, rng, seg } from '../core/math';
import { paperTile } from '../core/sprites';
import { C, F, font } from '../core/style';
import { drawSeal } from '../acts/ink';
import { InkWater } from './fluid';

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
  mountains: [0.9, 2.5] as const,
  bamboo: [2.9, 4.3] as const,
  waves: [4.7, 6.1] as const,
  rain: [6.4, 7.7] as const,
  enso: [7.9, 9.0] as const,
  END: 9.6,
};

type Scene = 'mountains' | 'bamboo' | 'waves' | 'enso';

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

/** draw a picture's shape at grid resolution, read it back once, blur it a little */
function target(scene: Scene, nx: number, ny: number, aspect: number): Float32Array {
  const have = targets.get(scene);
  if (have) return have;
  const c = document.createElement('canvas');
  c.width = nx;
  c.height = ny;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, nx, ny);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  const X = (u: number) => u * nx, Y = (v: number) => v * ny;
  if (scene === 'mountains') {
    // three ranges, far (pale) to near (dark)
    [[0.5, 0.45, 0.35], [0.62, 0.7, 0.65], [0.75, 1, 1]].forEach(([base, amp, lvl], i) => {
      g.globalAlpha = lvl;
      g.beginPath();
      g.moveTo(0, ny);
      for (let k = 0; k <= 60; k++) {
        const u = k / 60;
        const peak = Math.pow(Math.abs(Math.sin(u * (2.2 + i) * Math.PI + i * 1.7)), 1.6);
        const y = base - (0.08 + 0.14 * peak) * amp - fbm1(u * 6, i * 9) * 0.04;
        g.lineTo(X(u), Y(y));
      }
      g.lineTo(nx, ny);
      g.fill();
    });
    // the moon is where the ink is not
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(X(0.66), Y(0.2), nx * 0.16, 0, TAU);
    g.fill();
  } else if (scene === 'bamboo') {
    const r = rng(4);
    for (let i = 0; i < 7; i++) {
      const u = 0.08 + i * 0.14 + (r() - 0.5) * 0.05;
      g.globalAlpha = 0.45 + r() * 0.55;
      g.lineWidth = nx * (0.025 + r() * 0.02);
      g.beginPath();
      g.moveTo(X(u), ny);
      g.quadraticCurveTo(X(u + (r() - 0.5) * 0.08), Y(0.5), X(u + (r() - 0.5) * 0.12), Y(-0.05));
      g.stroke();
      // a cloud of leaves near the top of some stalks
      if (r() > 0.4) {
        g.globalAlpha *= 0.7;
        g.beginPath();
        g.ellipse(X(u + (r() - 0.5) * 0.1), Y(0.12 + r() * 0.25), nx * 0.13, ny * 0.05, (r() - 0.5) * 0.8, 0, TAU);
        g.fill();
      }
    }
  } else if (scene === 'waves') {
    // three swells, each with a curling crest
    for (let i = 0; i < 3; i++) {
      const base = 0.5 + i * 0.16;
      g.globalAlpha = 0.5 + i * 0.25;
      g.beginPath();
      g.moveTo(0, ny);
      for (let k = 0; k <= 50; k++) {
        const u = k / 50;
        g.lineTo(X(u), Y(base - 0.06 * Math.sin(u * TAU * (1.2 + i * 0.4) + i * 2)));
      }
      g.lineTo(nx, ny);
      g.fill();
      g.lineWidth = nx * 0.03;
      g.beginPath();
      const cx = 0.25 + i * 0.28, cy = base - 0.07;
      g.arc(X(cx), Y(cy), nx * 0.07, Math.PI * 0.9, Math.PI * 2.2);
      g.stroke();
    }
  } else {
    // the ensō: one great open circle
    g.lineWidth = nx * 0.07;
    g.beginPath();
    const R = nx * 0.33;
    g.arc(X(0.5), Y(0.42), R, -2.2, -2.2 + TAU * 0.9);
    g.stroke();
  }
  const d = g.getImageData(0, 0, nx, ny).data;
  let out = new Float32Array(nx * ny);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  // soften: two box-blur passes
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(out.length);
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue;
        s += out[xx + yy * nx];
        n++;
      }
      tmp[x + y * nx] = s / n;
    }
    out = tmp;
  }
  void aspect;
  targets.set(scene, out);
  return out;
}

/* ============================================================== draw */

function setup(f: Frame) {
  const key = `${f.w}x${f.h}`;
  if (key === size && water) return;
  size = key;
  const nx = f.portrait ? 84 : 140;
  const ny = Math.round((nx * f.h) / f.w);
  water = new InkWater(nx, ny);
  targets.clear();
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
  wtr.stir(t, 0.012 + Math.min(0.05, Math.abs(f.vB) * 0.03));
  // the scenes: pull the ink into each picture, let go between them
  const scenes: [Scene, readonly [number, number], number][] = [
    ['mountains', W.mountains, 1.0],
    ['bamboo', W.bamboo, 0.9],
    ['waves', W.waves, 0.9],
    ['enso', W.enso, 1.1],
  ];
  let held = 0;
  for (const [sc, r, lvl] of scenes) {
    const k = hold(B, r);
    if (k <= 0) continue;
    held = Math.max(held, k);
    // ink comes in from the edges of the picture so it gathers rather than appears
    wtr.attract(target(sc, wtr.nx, wtr.ny, h / w), 1.6 * k, lvl, 0.9 * k, dt);
  }
  // rain: drops fall into the water
  const rain = ease.inOut2(seg(B, W.rain[0], W.rain[0] + 0.3)) * (1 - ease.inOut2(seg(B, W.rain[1] - 0.3, W.rain[1])));
  if (rain > 0 && Math.random() < rain * dt * 9) {
    const u = 0.05 + Math.random() * 0.9, v = 0.1 + Math.random() * 0.85;
    wtr.addInk(u, v, 0.02, 0.5);
    ripples.push({ u, v, t0: t, big: 0.6 });
  }
  // the old ink thins away between pictures, so nothing turns to mud
  wtr.step(dt, held > 0.5 ? 0.02 : 0.12);
  void dB;
  wtr.render(ctx, 0, 0, w, h);

  // ---- crisp brushwork once the wash has settled
  drawLines(f, S);
  drawRain(f, rain, S);
  drawRipples(ctx, w, h, t, S);
  drawTitle(f, S);
  drawEnd(f, S);
}

/* -------------------------------------------------------- the lines */

function drawLines(f: Frame, S: number) {
  const { ctx, w, h, B, t } = f;
  const settle = (r: readonly [number, number]) => seg(B, r[0] + 0.45, r[0] + 0.85) * (1 - seg(B, r[1] - 0.45, r[1] - 0.15));
  // mountains: the moon's rim and one ridge line
  const m = settle(W.mountains);
  if (m > 0) {
    ctx.save();
    ctx.globalAlpha = m * 0.8;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(1, S * 0.004);
    ctx.beginPath();
    ctx.arc(w * 0.66, h * 0.2, w * 0.16 * 0.92, 0, TAU);
    ctx.stroke();
    ctx.restore();
    const ridge: Pt[] = [];
    for (let k = 0; k <= 40; k++) {
      const u = k / 40, i = 2;
      const peak = Math.pow(Math.abs(Math.sin(u * (2.2 + i) * Math.PI + i * 1.7)), 1.6);
      ridge.push([u * w, (0.75 - (0.08 + 0.14 * peak) - fbm1(u * 6, i * 9) * 0.04) * h]);
    }
    brush(ctx, ridge, { width: S * 0.012, color: C.ink, progress: ease.out2(m), dry: 0.6, seed: 31, press: 1.2, tail: 0.3, alpha: m * 0.85 });
    // a pine on the near ridge
    // (left out on purpose: the ridge and the moon say enough)
  }
  // bamboo: leaves, each a single brush flick
  const b = settle(W.bamboo);
  if (b > 0) {
    const r = rng(4);
    for (let i = 0; i < 7; i++) {
      const u = 0.08 + i * 0.14 + (r() - 0.5) * 0.05;
      r(); r(); r();
      for (let k = 0; k < 4; k++) {
        const lx = u * w + (r() - 0.5) * S * 0.2, ly = h * (0.08 + r() * 0.5);
        const a = -0.4 + (r() - 0.5) * 1.6 + Math.sin(t * 0.8 + i + k) * 0.06;
        const L = S * (0.08 + r() * 0.06);
        const p0: Pt = [lx, ly], p1: Pt = [lx + Math.cos(a) * L * 0.5, ly + Math.sin(a) * L * 0.5 + S * 0.01], p2: Pt = [lx + Math.cos(a) * L, ly + Math.sin(a) * L];
        brush(ctx, [p0, p1, p2], { width: S * 0.022, color: C.ink, progress: ease.out2(seg(b, k * 0.15, k * 0.15 + 0.5)), dry: 0.2, seed: 50 + i * 4 + k, press: 1.6, tail: 0.05, alpha: 0.9 * b });
      }
    }
  }
  // waves: the crest lines, and spray
  const wv = settle(W.waves);
  if (wv > 0) {
    for (let i = 0; i < 3; i++) {
      const base = 0.5 + i * 0.16;
      const pts: Pt[] = [];
      for (let k = 0; k <= 30; k++) {
        const u = k / 30;
        pts.push([u * w, (base - 0.06 * Math.sin(u * TAU * (1.2 + i * 0.4) + i * 2 + t * 0.15)) * h]);
      }
      brush(ctx, pts, { width: S * 0.008, color: C.ink, progress: ease.out2(seg(wv, i * 0.2, i * 0.2 + 0.6)), dry: 0.5, seed: 70 + i, press: 1, tail: 0.4, alpha: 0.7 * wv });
      const cx = (0.25 + i * 0.28) * w, cy = (base - 0.07) * h, R = w * 0.07;
      const curl: Pt[] = [];
      for (let k = 0; k <= 20; k++) {
        const a = Math.PI * 0.9 + (k / 20) * Math.PI * 1.3;
        const rr = R * (1 - k / 40);
        curl.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      brush(ctx, curl, { width: S * 0.012, color: C.ink, progress: ease.out2(seg(wv, 0.3 + i * 0.15, 0.7 + i * 0.15)), dry: 0.4, seed: 80 + i, press: 1.4, tail: 0.2, alpha: 0.85 * wv });
    }
  }
  // the ensō: the brush goes round once, over the wash
  const e = seg(B, W.enso[0] + 0.3, W.enso[0] + 0.85);
  if (e > 0) {
    const R = w * 0.33;
    ctx.save();
    ctx.translate(w * 0.5, h * 0.42);
    ctx.scale(R / 100, R / 100);
    brush(ctx, ENSO, { width: 15, color: C.ink, progress: ease.inOut2(e), dry: 0.45, seed: 3, press: 1.5, tail: 0.12 });
    ctx.restore();
  }
}
const ENSO = ensoPath(0, 0, 100, 3, 0.9, -2.2);

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
