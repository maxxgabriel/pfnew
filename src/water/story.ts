import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { layoutWord, wordWidth } from '../core/glyphs';
import { type Pt, TAU, bell, clamp, ease, hash, lerp, rng, seg } from '../core/math';
import { drawSprite, glow, paperTile } from '../core/sprites';
import { C, F, font } from '../core/style';
import { drawInk, drawLightLine, drawSeal } from '../acts/ink';
import { drawWarrior } from '../acts/warrior';
import { InkWater } from './fluid';
import { ENSO, drawBamboo } from './water';

/*
 * TWO DROPS (round 15): the story, told in ink and water.
 *
 * A blue drop and a green drop fall into still water on paper. Their ink
 * floods the dish into night and gathers into two swordsmen. They duel on the
 * mountain ridge. The water rises against them as a great wave: they cut it
 * together. In the bamboo, one spinning stroke fells the grove. In the rain,
 * one draw: Green's blade snaps and falls into the water. Green kneels, and
 * his reflection rises out of the water, the last opponent; the two make the
 * last stroke together and it bursts into ink that swirls into the ensō as
 * the night turns back to paper. The seal, and the contact card.
 *
 * The water is alive throughout (fluid.ts): every blade drags ink through
 * it, every clash splashes it, the finger stirs it, a tap drops ink.
 */

export const T = {
  title: [0, 0.55] as const,
  drops: 0.45,
  night: [0.6, 1.15] as const,
  rise: [0.95, 1.35] as const,
  ridge: [1.3, 3.4] as const,
  wave: [3.4, 5.1] as const,
  bamboo: [5.1, 6.9] as const,
  rain: [6.9, 8.7] as const,
  mirror: [8.7, 10.3] as const,
  dawn: [10.0, 10.5] as const,
  enso: [10.3, 11.4] as const,
  END: 11.9,
};

/* =========================================================== choreography */

/** a fighter at a beat: hilt (x, y as screen fractions), blade angle, blade length 0..1, alpha */
type Key = [number, number, number, number, number];
const UP_R = -1.05, UP_L = -2.09, LOW_R = -0.35, LOW_L = -2.8;
const at = (x: number, y: number): [number, number] => [x, y];
const toward = (h: [number, number], p: [number, number]) => Math.atan2(p[1] - h[1], p[0] - h[0]);

const CL1: Pt = [0.5, 0.42], CL2: Pt = [0.5, 0.62], CL3: Pt = [0.52, 0.44];
const BLUE: Key[] = [
  [1.3, 0.2, 0.62, UP_R, 0],
  [1.5, 0.2, 0.62, UP_R, 1],
  [1.7, 0.33, 0.62, UP_R, 1],
  [1.85, 0.36, 0.6, toward(at(0.36, 0.6), CL1), 1],
  [2.1, 0.24, 0.63, LOW_R, 1],
  [2.35, 0.36, 0.64, toward(at(0.36, 0.64), CL2), 1],
  [2.6, 0.38, 0.6, -1.4, 1],
  [2.85, 0.37, 0.61, toward(at(0.37, 0.61), CL3), 1],
  [3.1, 0.38, 0.61, toward(at(0.38, 0.61), CL3), 1],
  [3.35, 0.22, 0.63, LOW_R, 1],
  // the wave: both turn right and face it
  [3.7, 0.24, 0.63, -0.6, 1],
  [4.35, 0.3, 0.64, 0.4, 1],
  [4.5, 0.62, 0.42, -2.6, 1],
  [4.9, 0.6, 0.6, -0.4, 1],
  // the bamboo
  [5.3, 0.3, 0.64, LOW_R, 1],
  [5.85, 0.32, 0.62, -0.2, 1],
  [6.0, 0.34, 0.6, -3.2, 1],
  [6.5, 0.3, 0.63, LOW_R, 1],
  // the rain: far apart, still; the draw swaps them
  [7.0, 0.16, 0.64, LOW_R, 1],
  [7.7, 0.17, 0.64, -0.2, 1],
  [7.78, 0.78, 0.63, -0.15, 1],
  [8.6, 0.78, 0.64, LOW_L - 0.3, 1],
  // the reflection
  [9.0, 0.78, 0.64, UP_L, 1],
  [9.45, 0.62, 0.6, UP_L, 1],
  [9.6, 0.56, 0.5, -2.5, 1],
  [9.75, 0.48, 0.66, 2.2, 1],
  [10.2, 0.48, 0.66, 2.2, 0],
];
const GREEN: Key[] = [
  [1.3, 0.8, 0.62, UP_L, 0],
  [1.5, 0.8, 0.62, UP_L, 1],
  [1.7, 0.67, 0.62, UP_L, 1],
  [1.85, 0.64, 0.6, toward(at(0.64, 0.6), CL1), 1],
  [2.1, 0.76, 0.6, -2.3, 1],
  [2.35, 0.64, 0.64, toward(at(0.64, 0.64), CL2), 1],
  [2.6, 0.62, 0.42, -2.7, 1],
  [2.85, 0.66, 0.6, toward(at(0.66, 0.6), CL3), 1],
  [3.1, 0.65, 0.61, toward(at(0.65, 0.61), CL3), 1],
  [3.35, 0.78, 0.63, LOW_L, 1],
  [3.7, 0.4, 0.63, -0.9, 1],
  [4.35, 0.44, 0.64, 0.6, 1],
  [4.5, 0.66, 0.6, -1.0, 1],
  [4.9, 0.7, 0.62, LOW_R, 1],
  [5.3, 0.7, 0.64, LOW_L, 1],
  [5.85, 0.68, 0.62, -2.9, 1],
  [6.0, 0.66, 0.6, 0.1, 1],
  [6.5, 0.7, 0.63, LOW_L, 1],
  [7.0, 0.84, 0.64, LOW_L, 1],
  [7.7, 0.83, 0.64, -2.95, 1],
  [7.78, 0.22, 0.63, -2.95, 1],
  [8.6, 0.24, 0.72, 1.35, 1],
  [9.0, 0.24, 0.72, 1.35, 1],
  [9.45, 0.36, 0.62, UP_R, 1],
  [9.6, 0.4, 0.5, -0.6, 1],
  [9.75, 0.5, 0.66, 0.9, 1],
  [10.2, 0.5, 0.66, 0.9, 0],
];
/** strike beats: snap into them, settle out */
const STRIKES = [1.85, 2.35, 2.85, 4.5, 6.0, 7.78, 9.75];
const CLASHES: [number, Pt][] = [[1.85, CL1], [2.35, CL2], [2.85, CL3]];

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return a + d * t;
}
function pose(keys: Key[], B: number) {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] <= B) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const raw = clamp((B - k0[0]) / (k1[0] - k0[0]));
  const t = STRIKES.includes(k1[0]) ? ease.in3(raw) * 0.35 + ease.out5(raw) * 0.65 : ease.inOut3(raw);
  return { x: lerp(k0[1], k1[1], t), y: lerp(k0[2], k1[2], t), a: lerpAngle(k0[3], k1[3], t), len: lerp(k0[4], k1[4], t) };
}

/* ================================================================ state */

let water: InkWater | null = null;
let size = '';
let paper: CanvasPattern | null = null;
let lastT = 0, lastB = 0;
const ripples: { u: number; v: number; t0: number; big: number }[] = [];
const prevTip: (Pt | null)[] = [null, null];
const vel = [{ vx: 0, px: 0 }, { vx: 0, px: 0 }];
let bambooArt: HTMLCanvasElement | null = null;

const finger = { u: 0, v: 0, t: -9 };
export function storyMove(x: number, y: number, t: number, w: number, h: number) {
  if (!water) return;
  const u = x / w, v = y / h;
  const dt = Math.max(0.008, t - finger.t);
  if (t - finger.t < 0.2) water.addForce(u, v, clamp((u - finger.u) / dt, -3, 3) * 0.6, clamp(((v - finger.v) / dt) * (h / w), -3, 3) * 0.6, 0.06);
  finger.u = u;
  finger.v = v;
  finger.t = t;
}
export function storyTap(x: number, y: number, t: number, w: number, h: number) {
  if (!water) return;
  water.addInk(x / w, y / h, 0.035, 1.2);
  ripples.push({ u: x / w, v: y / h, t0: t, big: 1 });
  if (ripples.length > 24) ripples.shift();
}

function setup(f: Frame) {
  const key = `${f.w}x${f.h}`;
  if (key === size && water) return;
  size = key;
  const nx = f.portrait ? 100 : 160;
  water = new InkWater(nx, Math.round((nx * f.h) / f.w));
  bambooArt = null;
}

/* ================================================================= draw */

export function drawStory(f: Frame) {
  setup(f);
  const wtr = water!;
  const { ctx, w, h, B, t } = f;
  const S = Math.min(w, h);
  const dt = clamp(t - lastT, 0, 0.05);
  lastT = t;
  const crossed = (b: number) => lastB < b && B >= b && B - lastB < 0.4;
  const hit = (b: number) => crossed(b);
  lastB = B;
  if (!paper) paper = ctx.createPattern(paperTile(512, C.paper), 'repeat');

  // how much of the screen is night: the drops' ink floods it, the dawn takes it back
  const night = ease.inOut2(seg(B, T.night[0], T.night[1])) * (1 - ease.inOut2(seg(B, T.dawn[0], T.dawn[1])));

  // ---------------------------------------------------------- the world
  ctx.fillStyle = paper!;
  ctx.fillRect(0, 0, w, h);
  if (night > 0) {
    ctx.save();
    ctx.globalAlpha = night;
    backdrop(f, S);
    ctx.restore();
  }

  // ---------------------------------------------------------- the water
  // the drops
  const fall = seg(B, T.drops - 0.25, T.drops);
  if (B < T.drops && fall > 0) {
    for (const [u, col] of [[0.38, C.blue], [0.62, C.green]] as const) {
      ctx.fillStyle = col;
      ctx.beginPath();
      const r0 = S * 0.014;
      ctx.ellipse(w * u, lerp(-h * 0.05, h * 0.5, ease.in2(fall)) - (u > 0.5 ? h * 0.04 : 0), r0, r0 * (1 + fall * 1.4), 0, 0, TAU);
      ctx.fill();
    }
  }
  if (hit(T.drops)) {
    for (const u of [0.38, 0.62]) {
      wtr.addInk(u, 0.5, 0.06, 2.6);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        wtr.addForce(u + Math.cos(a) * 0.03, 0.5 + Math.sin(a) * 0.03, Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0.04);
      }
      ripples.push({ u, v: 0.5, t0: t, big: 2 });
    }
  }
  // the flood: the ink spreads to the edges as the night comes
  if (B > T.night[0] && B < T.night[1] && Math.random() < dt * 20) {
    wtr.addInk(Math.random(), 0.2 + Math.random() * 0.7, 0.07, 0.45);
  }
  wtr.stir(t, (0.06 + Math.min(0.1, Math.abs(f.vB) * 0.06)) * dt * 1.4);
  const dawning = B > T.dawn[0] - 0.1 && B < T.enso[0] + 0.1;
  wtr.step(dt, dawning ? 2.5 : night > 0.5 ? 0.5 : B > T.enso[0] ? 0.15 : 0.08);
  // the ensō: the ink gathers into the circle at dawn (pulled toward a ring)
  const gather = ease.inOut2(seg(B, T.enso[0], T.enso[0] + 0.4)) * (1 - seg(B, T.enso[1] - 0.2, T.enso[1]));
  if (gather > 0) {
    // a vortex round the circle's centre, and ink fed onto the ring
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + t * 0.4;
      const R = 0.33;
      const u = 0.5 + Math.cos(a) * R, v = 0.42 + Math.sin(a) * R * (w / h);
      wtr.addForce(u, v, -Math.sin(a) * 0.4 * gather, Math.cos(a) * 0.4 * gather * (w / h), 0.05);
      if (Math.random() < dt * 10) wtr.addInk(u, v, 0.03, 0.5 * gather);
    }
  }
  wtr.render(ctx, 0, 0, w, h, night);

  // --------------------------------------------------------- the scenes
  ctx.save();
  ctx.globalAlpha = night;
  wave(f, S, wtr, hit);
  bamboo(f, S, hit);
  rain(f, S);
  ctx.restore();

  // -------------------------------------------------------- the fighters
  if (B > T.rise[0] && B < T.mirror[1]) fighters(f, S, wtr, hit, dt);
  mirror(f, S, wtr, hit);

  ripplesDraw(ctx, w, h, t, S, night);
  title(f, S);
  enso(f, S);
}

/** how much of the screen is night at the frame's beat */
function night(f: Frame) {
  return ease.inOut2(seg(f.B, T.night[0], T.night[1])) * (1 - ease.inOut2(seg(f.B, T.dawn[0], T.dawn[1])));
}

/* ============================================================ backdrop */

function backdrop(f: Frame, S: number) {
  const { ctx, w, h, B, t } = f;
  // the ridge: the original moonlit range (acts/ink.ts), until the wave washes it away
  const ridge = 1 - ease.inOut2(seg(B, T.wave[0] + 0.2, T.wave[0] + 0.7));
  if (ridge > 0) {
    ctx.save();
    ctx.globalAlpha *= ridge;
    drawInk({ ...f, B: 1.9, intro: 0, hold: null }, 'night');
    ctx.restore();
  }
  if (ridge < 1) {
    // elsewhere: a plain moonlit night, a big moon, the water's surface
    ctx.save();
    ctx.globalAlpha *= 1 - ridge;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    const rainy = bell(B, T.rain[0] - 0.2, T.rain[1] + 0.2);
    g.addColorStop(0, rainy > 0.5 ? '#14171c' : '#1b1f27');
    g.addColorStop(0.7, '#2a2e36');
    g.addColorStop(1, '#16181c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const ma = 1 - rainy * 0.85;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= ma;
    drawSprite(ctx, glow('#ece6d6', 256), w * 0.7, h * 0.2, S * 1.2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = C.paper;
    ctx.beginPath();
    ctx.arc(w * 0.7, h * 0.2, S * 0.13, 0, TAU);
    ctx.fill();
    // the water line, and the moon's path on it
    ctx.fillStyle = 'rgba(10,11,14,0.55)';
    ctx.fillRect(0, h * 0.8, w, h * 0.2);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const y = h * (0.81 + i * 0.013);
      const wd = S * (0.05 + i * 0.012) * (0.7 + 0.3 * Math.sin(t * 2 + i));
      ctx.fillStyle = `rgba(236,230,214,${0.18 * (1 - i / 14)})`;
      ctx.fillRect(w * 0.7 - wd / 2 + Math.sin(t * 1.3 + i) * 4, y, wd, 2);
    }
    ctx.restore();
  }
}

/* ============================================================ fighters */

function fighters(f: Frame, S: number, wtr: InkWater, hit: (b: number) => boolean, dt: number) {
  const { ctx, w, h, B, t } = f;
  const L = Math.min(w * 0.42, h * 0.27);
  const thick = Math.max(3, S * 0.015);
  const gy = h * 0.8;
  const appear = ease.out2(seg(B, T.rise[0], T.rise[1]));
  const cols = [{ c: C.blue, hot: C.blueHot }, { c: C.green, hot: C.greenHot }];
  const ps = [pose(BLUE, B), pose(GREEN, B)];
  // the rain draw: green's blade snaps
  const broken = B > T.rain[0] + 0.95;
  const kneel = seg(B, T.rain[0] + 1.0, T.rain[0] + 1.3) * (1 - seg(B, 9.3, 9.45));
  const hilts: Pt[] = [], tips: Pt[] = [];
  ps.forEach((p, i) => {
    const bob = Math.sin(t * 1.6 + i * 2) * S * 0.006;
    let hx = p.x * w, hy = p.y * h + bob;
    if (i === 1) hy += kneel * S * 0.12;
    const len = p.len * (i === 1 && broken && B < 9.3 ? 0.5 : 1) * appear;
    hilts.push([hx, hy]);
    tips.push([hx + Math.cos(p.a) * L * len, hy + Math.sin(p.a) * L * len]);
    // blades drag ink through the water as they move
    const pt = prevTip[i];
    if (pt && dt > 0) {
      const dx = tips[i][0] - pt[0], dy = tips[i][1] - pt[1];
      const sp = Math.hypot(dx, dy) / dt;
      if (sp > S * 1.5) {
        wtr.addForce(tips[i][0] / w, tips[i][1] / h, (dx / dt / w) * 0.25, (dy / dt / w) * 0.25, 0.04);
        wtr.addInk(tips[i][0] / w, tips[i][1] / h, 0.02, Math.min(0.6, sp / (S * 20)));
      }
    }
    prevTip[i] = tips[i];
    void hx;
  });
  // swing trails: where the blades were a moment ago
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 1; k <= 5; k++) {
    const qs = [pose(BLUE, B - k * 0.02), pose(GREEN, B - k * 0.02)];
    qs.forEach((q, i) => {
      if (Math.abs(lerpAngle(q.a, ps[i].a, 1) - q.a) < 0.04 && Math.abs(q.x - ps[i].x) < 0.01) return;
      const len = q.len * (i === 1 && broken && B < 9.3 ? 0.5 : 1) * appear;
      ctx.fillStyle = cols[i].c;
      ctx.globalAlpha = 0.14 * (1 - k / 6) * appear;
      ctx.beginPath();
      ctx.moveTo(hilts[i][0], hilts[i][1]);
      ctx.lineTo(tips[i][0], tips[i][1]);
      ctx.lineTo(q.x * w + Math.cos(q.a) * L * len, q.y * h + Math.sin(q.a) * L * len);
      ctx.lineTo(q.x * w, q.y * h);
      ctx.closePath();
      ctx.fill();
    });
  }
  ctx.restore();
  // the fighters: the first film's brush warriors, painted around the blades they hold
  ps.forEach((p, i) => {
    const [hx, hy] = hilts[i];
    const v = vel[i];
    if (dt > 0 && v.px) v.vx = lerp(v.vx, (hx - v.px) / dt, 0.15);
    v.px = hx;
    drawWarrior(ctx, {
      hilt: [hx, hy], a: p.a, foeX: hilts[1 - i][0] + (hilts[1 - i][0] === hx ? 1 : 0), s: L * 1.3, groundY: gy,
      color: cols[i].c, t, vx: v.vx, vy: 0, seed: i + 1, alpha: appear * Math.max(0.0001, Math.min(1, p.len * 4)),
    });
    void B;
  });
  // the blades
  ps.forEach((p, i) => {
    if (p.len * appear < 0.01) return;
    const flick = 0.85 + 0.15 * Math.sin(t * 61 + i * 3) * Math.sin(t * 23);
    drawLightLine(ctx, hilts[i][0], hilts[i][1], tips[i][0], tips[i][1], cols[i].c, cols[i].hot, thick, flick);
  });
  // clashes: sparks, a flash, the water splashes out from the point
  for (const [b, p] of CLASHES) {
    const k = 1 - seg(B, b, b + 0.12);
    if (B >= b && k > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = k;
      drawSprite(ctx, glow('#fff3c8', 128), p[0] * w, p[1] * h, S * 0.5 * (1 + (1 - k)));
      ctx.restore();
    }
    if (hit(b)) {
      f.flash(0.3, '#fff6dc');
      f.shake(S * 0.02);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        wtr.addForce(p[0] + Math.cos(a) * 0.02, p[1] + Math.sin(a) * 0.02, Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0.03);
      }
      wtr.addInk(p[0], p[1], 0.03, 1);
    }
  }
  // the rain draw: a line of light where they passed, and green's broken half spinning into the water
  const draw = T.rain[0] + 0.88;
  const lk = seg(B, draw - 0.02, draw + 0.5);
  if (lk > 0 && lk < 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - lk;
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,250,235,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.6 - 1.5, w, 3);
    ctx.restore();
  }
  if (hit(draw)) {
    f.flash(0.8, '#ffffff');
    f.shake(S * 0.03);
  }
  const bh = seg(B, draw + 0.05, draw + 0.45);
  if (bh > 0 && bh < 1) {
    const x = lerp(w * 0.3, w * 0.45, bh), y = lerp(h * 0.45, h * 0.8, ease.in2(bh));
    const a = bh * 9;
    drawLightLine(ctx, x - Math.cos(a) * L * 0.25, y - Math.sin(a) * L * 0.25, x + Math.cos(a) * L * 0.25, y + Math.sin(a) * L * 0.25, C.green, C.greenHot, thick, 1);
  }
  if (hit(draw + 0.45)) {
    wtr.addInk(0.45, 0.8, 0.04, 1.4);
    ripples.push({ u: 0.45, v: 0.8, t0: t, big: 1.5 });
  }
}

/* ================================================================ wave */

function wave(f: Frame, S: number, wtr: InkWater, hit: (b: number) => boolean) {
  const { ctx, w, h, B, t } = f;
  const rise = ease.out3(seg(B, T.wave[0] + 0.3, T.wave[0] + 0.95));
  const cut = 4.5;
  const split = ease.out3(seg(B, cut, cut + 0.5));
  const gone = seg(B, cut + 0.2, cut + 0.6);
  if (rise <= 0 || gone >= 1) return;
  const fa = rise * (1 - gone);
  if (hit(cut)) {
    f.flash(0.9, '#ffffff');
    f.shake(S * 0.05);
    for (let i = 0; i < 16; i++) {
      const u = 0.6 + (hash(i) - 0.3) * 0.5, v = 0.2 + hash(i * 3) * 0.5;
      wtr.addInk(u, v, 0.04, 0.9);
      wtr.addForce(u, v, (u - 0.6) * 3, (v - 0.4) * 3, 0.05);
    }
  }
  // the wave: a dark mass rising at the right with a curling crest of foam
  const draw = (dy: number, clipTop: boolean) => {
    ctx.save();
    ctx.beginPath();
    // the X cut: the two halves part along a diagonal
    if (clipTop) {
      ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h * 0.3); ctx.lineTo(0, h * 0.62);
    } else {
      ctx.moveTo(0, h * 0.62); ctx.lineTo(w, h * 0.3); ctx.lineTo(w, h); ctx.lineTo(0, h);
    }
    ctx.closePath();
    ctx.clip();
    ctx.translate(split * w * (clipTop ? 0.25 : -0.1), dy);
    ctx.globalAlpha *= 1 - gone;
    const top = lerp(h * 0.95, h * 0.12, rise);
    const sway = Math.sin(t * 1.2) * S * 0.02;
    const wg = ctx.createLinearGradient(0, top, 0, h);
    wg.addColorStop(0, '#3d4b5c');
    wg.addColorStop(0.35, '#1c2531');
    wg.addColorStop(1, '#0a0d12');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h);
    ctx.bezierCurveTo(w * 0.35, h * 0.85, w * 0.45 + sway, top + h * 0.25, w * 0.62 + sway, top + h * 0.05);
    ctx.bezierCurveTo(w * 0.8 + sway, top - h * 0.06, w * 1.05, top + h * 0.02, w * 1.1, top + h * 0.1);
    ctx.lineTo(w * 1.1, h);
    ctx.closePath();
    ctx.fill();
    // the crest: a curl of foam with claws
    const cx = w * 0.6 + sway, cy = top + h * 0.1;
    const curl: Pt[] = [];
    for (let k = 0; k <= 26; k++) {
      const a = -Math.PI * 0.05 - (k / 26) * Math.PI * 1.35;
      const r = S * 0.2 * (1 - k / 40);
      curl.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    brush(ctx, curl, { width: S * 0.03, color: '#e9e4d6', progress: rise, dry: 0.5, seed: 9, press: 1.2, tail: 0.3, alpha: 0.9 * fa * night(f) });
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI * 0.4 - k * 0.22;
      const bx = cx + Math.cos(a) * S * 0.2, by = cy + Math.sin(a) * S * 0.2;
      brush(ctx, [[bx, by], [bx - S * 0.03, by + S * 0.035], [bx - S * 0.02, by + S * 0.06]], { width: S * 0.012, color: '#e9e4d6', progress: rise, dry: 0.3, seed: 20 + k, press: 1.3, tail: 0.1, alpha: 0.85 * fa * night(f) });
    }
    // foam lines down its face
    for (let k = 0; k < 4; k++) {
      const y0 = top + h * (0.15 + k * 0.12);
      brush(ctx, [[w * (0.5 + k * 0.05), y0], [w * 0.75, y0 - h * 0.03], [w * 1.05, y0 + h * 0.01]], { width: S * 0.008, color: '#9aa3ad', progress: rise, dry: 0.6, seed: 30 + k, press: 1, tail: 0.4, alpha: 0.6 * fa * night(f) });
    }
    ctx.restore();
  };
  if (B < cut) {
    draw(0, false);
    draw(0, true);
  } else {
    draw(split * h * 0.15, false);
    draw(-split * h * 0.2, true);
  }
  // the X: two great slashes of light
  const x = seg(B, cut - 0.02, cut + 0.35);
  if (x > 0 && x < 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - x;
    ctx.lineCap = 'round';
    for (const [a, b, col] of [[[0.1, 0.15], [0.95, 0.7], C.blueHot], [[0.15, 0.75], [0.95, 0.12], C.greenHot]] as [Pt, Pt, string][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = S * 0.02;
      ctx.beginPath();
      ctx.moveTo(a[0] * w, a[1] * h);
      ctx.lineTo(lerp(a[0], b[0], ease.out3(Math.min(1, x * 3))) * w, lerp(a[1], b[1], ease.out3(Math.min(1, x * 3))) * h);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* ============================================================== bamboo */

function bamboo(f: Frame, S: number, hit: (b: number) => boolean) {
  const { ctx, w, h, B, t } = f;
  const k = ease.inOut2(seg(B, T.bamboo[0], T.bamboo[0] + 0.4)) * (1 - ease.inOut2(seg(B, T.bamboo[1] - 0.3, T.bamboo[1])));
  if (k <= 0) return;
  if (!bambooArt) {
    // the grove, as dark silhouettes against the moonlit night
    const c = document.createElement('canvas');
    c.width = Math.round(w * 1.5);
    c.height = Math.round(h * 1.5);
    const g = c.getContext('2d')!;
    g.setTransform(1.5, 0, 0, 1.5, 0, 0);
    drawBamboo(g, w, h, S);
    bambooArt = c;
  }
  const cut = 6.0;
  const cy = h * 0.42;
  const fallK = ease.in2(seg(B, cut + 0.1, cut + 0.9));
  ctx.save();
  ctx.globalAlpha *= k;
  // below the cut: stays
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, cy + 1, w, h);
  ctx.clip();
  ctx.drawImage(bambooArt, 0, 0, w, h);
  ctx.restore();
  // above the cut: slides along the slash, then topples away
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, cy);
  ctx.clip();
  if (B > cut) {
    ctx.translate(w * 0.5, cy);
    ctx.rotate(fallK * 0.5);
    ctx.translate(-w * 0.5 + seg(B, cut, cut + 0.15) * S * 0.05 + fallK * w * 0.3, -cy + fallK * h * 0.5);
    ctx.globalAlpha *= 1 - fallK;
  }
  ctx.drawImage(bambooArt, 0, 0, w, h);
  ctx.restore();
  // leaves whirling round the two of them
  ctx.fillStyle = '#0c0d10';
  const r = rng(77);
  for (let i = 0; i < 40; i++) {
    const a0 = r() * TAU, rr = S * (0.25 + r() * 0.4), sp = 0.6 + r();
    const a = a0 + t * sp * (B > cut ? 2.5 : 1);
    const x = w * 0.5 + Math.cos(a) * rr * 1.1, y = h * 0.5 + Math.sin(a) * rr * 0.6 + (B > cut ? fallK * h * 0.4 * r() : 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, S * 0.03, S * 0.008, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // the spinning slash: a ring of light across the grove
  const sk = seg(B, cut - 0.03, cut + 0.3);
  if (sk > 0 && sk < 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - sk;
    ctx.strokeStyle = '#f4f8ff';
    ctx.lineWidth = S * 0.012;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, cy, w * 0.7 * ease.out3(Math.min(1, sk * 2.5)), S * 0.05, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  if (hit(cut)) {
    f.flash(0.5, '#ffffff');
    f.shake(S * 0.03);
  }
  ctx.restore();
}

/* ================================================================ rain */

function rain(f: Frame, S: number) {
  const { ctx, w, h, B, t } = f;
  const k = ease.inOut2(seg(B, T.rain[0], T.rain[0] + 0.35)) * (1 - ease.inOut2(seg(B, T.mirror[1] - 0.6, T.mirror[1])));
  if (k <= 0) return;
  const draw = T.rain[0] + 0.88;
  // at the draw, the rain stops in the air for a heartbeat
  const freeze = bell(B, draw - 0.02, draw + 0.35) > 0.2;
  const tt = freeze ? draw * 7 : t;
  ctx.save();
  ctx.strokeStyle = `rgba(200,205,215,${0.4 * k})`;
  ctx.lineWidth = Math.max(1, S * 0.0022);
  ctx.beginPath();
  for (let i = 0; i < 110; i++) {
    const x = hash(i * 2.1) * w + Math.sin(i) * 3;
    const y = ((hash(i * 5.7) + tt * (0.8 + hash(i) * 0.5)) % 1.1) * h - h * 0.05;
    const L = S * (0.04 + hash(i * 3) * 0.04);
    if (freeze && Math.abs(y - h * 0.6) < S * 0.15) {
      // split in two by the stroke
      ctx.moveTo(x, y - L * 0.6);
      ctx.lineTo(x - 1, y - L * 0.1);
      ctx.moveTo(x + 3, y + L * 0.1);
      ctx.lineTo(x + 2, y + L * 0.6);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x - L * 0.06, y + L);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/* ========================================================== reflection */

function mirror(f: Frame, S: number, wtr: InkWater, hit: (b: number) => boolean) {
  const { ctx, w, h, B, t } = f;
  const r0 = T.mirror[0];
  const show = ease.inOut2(seg(B, r0 - 0.3, r0 + 0.2)) * (1 - seg(B, 9.75, 9.85));
  if (show <= 0) return;
  const L = Math.min(w * 0.42, h * 0.27);
  const gy = h * 0.8;
  // green's reflection in the water, then it climbs out of it
  const climb = ease.inOut2(seg(B, r0 + 0.25, r0 + 0.9));
  const hx = w * lerp(0.26, 0.5, climb), hy = lerp(gy + (gy - h * 0.7), h * 0.5, climb);
  const flipY = climb < 0.5;
  ctx.save();
  if (flipY) {
    // upside down under the surface, broken by ripples
    ctx.beginPath();
    ctx.rect(0, gy, w, h - gy);
    ctx.clip();
    ctx.translate(0, gy * 2);
    ctx.scale(1, -1);
    ctx.translate(Math.sin(t * 3) * 3, 0);
  }
  const s = L * 1.3 * lerp(1, 1.5, climb);
  const a = flipY ? 1.35 : -2.2 + Math.sin(t * 1.4) * 0.1;
  const hX = flipY ? w * 0.24 : hx, hY = flipY ? h * 0.72 : hy;
  ctx.globalAlpha = show * (flipY ? 0.45 : 0.95);
  drawWarrior(ctx, { hilt: [hX, hY], a, foeX: w * 0.9, s, groundY: flipY ? gy : gy, color: '#ff3a52', t, vx: 0, vy: 0, seed: 7, sash: '#a6f03a' });
  ctx.restore();
  // its eyes
  if (!flipY) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = show;
    drawSprite(ctx, glow('#ff1f3d', 64), hx - s * 0.12, hy - s * 0.46, S * 0.08);
    ctx.restore();
    // its dark blade
    drawLightLine(ctx, hx, hy, hx + Math.cos(a) * L * 1.2, hy + Math.sin(a) * L * 1.2, '#ff2a44', '#ffb0bb', Math.max(3, S * 0.016), 1);
    // ink pours off it into the water
    if (Math.random() < 0.5) wtr.addInk(hx / w + (Math.random() - 0.5) * 0.1, hy / h + 0.1, 0.03, 0.4);
  }
  if (hit(r0 + 0.25)) {
    ripples.push({ u: 0.3, v: 0.8, t0: t, big: 2.5 });
    wtr.addInk(0.3, 0.8, 0.06, 1.5);
  }
  // the last stroke: it bursts into ink
  if (hit(9.75)) {
    f.flash(1, '#ffffff');
    f.shake(S * 0.06);
    for (let i = 0; i < 24; i++) {
      const aa = (i / 24) * TAU;
      wtr.addInk(0.5 + Math.cos(aa) * 0.05, 0.45 + Math.sin(aa) * 0.05, 0.05, 1.2);
      wtr.addForce(0.5, 0.45, Math.cos(aa) * 2, Math.sin(aa) * 2, 0.08);
    }
  }
}

/* ============================================================== ripples */

function ripplesDraw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, S: number, night: number) {
  ctx.save();
  ctx.strokeStyle = night > 0.5 ? '#d8d4c8' : C.ink;
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    const age = t - r.t0, life = 1.6 * r.big;
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
      ctx.ellipse(r.u * w, r.v * h, S * 0.12 * r.big * ease.out2(kk), S * 0.12 * r.big * ease.out2(kk) * 0.35, 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ======================================================== title and end */

let tc: { key: string; max: ReturnType<typeof layoutWord>; gab: ReturnType<typeof layoutWord>; ms: number; gs: number } | null = null;

function title(f: Frame, S: number) {
  const { ctx, w, h, B } = f;
  const fade = 1 - seg(B, T.title[1] - 0.25, T.title[1]);
  if (fade <= 0) return;
  const key = `${w}x${h}`;
  if (tc?.key !== key) {
    const ms = Math.min(w * 0.2, h * 0.12), gs = ms * 0.36;
    tc = { key, ms, gs, max: layoutWord('MAX', w / 2 - wordWidth('MAX', ms, 0.16) / 2, h * 0.2, ms, 0.16), gab: layoutWord('GABRIEL', w / 2 - wordWidth('GABRIEL', gs, 0.3) / 2, h * 0.2 + ms * 1.35, gs, 0.3) };
  }
  const { max, gab, ms, gs } = tc;
  const I = f.intro;
  max.strokes.forEach((s, i) => brush(ctx, s.pts, { width: ms * 0.14, color: C.ink, progress: ease.inOut2(seg(I, 0.3 + i * 0.12, 0.5 + i * 0.12)), dry: 0.45, seed: 40 + i, press: 1.35, tail: 0.25, alpha: fade }));
  gab.strokes.forEach((s, i) => brush(ctx, s.pts, { width: gs * 0.13, color: C.ink, progress: ease.inOut2(seg(I, 1.1 + i * 0.06, 1.3 + i * 0.06)), dry: 0.4, seed: 60 + i, press: 1.3, tail: 0.3, alpha: fade }));
  const small = seg(I, 1.8, 2.3) * fade;
  if (small > 0) {
    ctx.save();
    ctx.globalAlpha = small * 0.75;
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.font = font(Math.max(11, Math.round(S * 0.03)), F.serif, 600);
    ctx.fillText('designs and builds things that move.', w / 2, h * 0.2 + ms * 2.1);
    ctx.globalAlpha = small * 0.5 * (0.6 + 0.4 * Math.sin(f.t * 2));
    ctx.font = font(Math.max(10, Math.round(S * 0.026)), F.serif, 600);
    ctx.fillText('scroll, and touch the water', w / 2, h * 0.9);
    ctx.restore();
  }
}

function enso(f: Frame, S: number) {
  const { ctx, w, h, B, t } = f;
  const e = seg(B, T.enso[0] + 0.35, T.enso[0] + 0.85);
  if (e > 0) {
    const R = w * 0.33;
    ctx.save();
    ctx.translate(w * 0.5, h * 0.42);
    ctx.scale(R / 100, R / 100);
    brush(ctx, ENSO, { width: 15, color: C.ink, progress: ease.inOut2(e), dry: 0.45, seed: 3, press: 1.5, tail: 0.12 });
    ctx.restore();
  }
  const st = ease.outBack(seg(B, T.enso[0] + 0.85, T.enso[0] + 1.05), 2.2);
  if (st > 0) drawSeal(ctx, w * 0.7, h * 0.42 + w * 0.22, S * 0.13 * (1.5 - 0.5 * Math.min(1, st)), -0.08 + Math.sin(t * 0.8) * 0.01, Math.min(1, st));
}
