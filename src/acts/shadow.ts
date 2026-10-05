import type { Frame } from '../core/frame';
import { type Pt, TAU, bell, clamp, ease, hash, lerp, seg } from '../core/math';
import { drawSprite, glow, withAlpha } from '../core/sprites';

/*
 * LIGHTS OUT (the bridge between TITAN and the night ride).
 *
 * TITAN's punch tears the poster open and behind it the room is dark. A torch
 * clicks on under the blanket and two hand shadows fight on the wall, a wolf
 * and a dragon, snapping over the round shadow of the marble. The marble gets
 * away: it drops, the torch follows it down to the floor, and where it lands
 * in the pool of light the ripple is the same ring that opens the night ride's
 * puddle.
 *
 * It's literally hands: the first plain clue that a kid is playing all this.
 * `u` (0..1) runs through the `shadow` hold (the first SHADOW_HOLD_SHARE of it)
 * and then on in film time up to the ride, so the scroll never goes dead.
 */

/** the share of the bridge that plays inside the hold; the rest runs in film time */
export const SHADOW_HOLD_SHARE = 0.72;

const WALL = '#07080d';
const INK = '#120d0b';
const LIGHT = { hot: '#ffe9bf', mid: '#f0b373', low: '#9a5f33' };

interface G { ctx: CanvasRenderingContext2D; w: number; h: number; S: number; t: number }

export function drawShadow(f: Frame, u: number) {
  const { ctx, w, h, t } = f;
  const S = Math.min(w, h);
  const g: G = { ctx, w, h, S, t };
  u = clamp(u);
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, w, h);
  // the torch clicks on (with one stutter), then later follows the marble down to the floor
  const on = u < 0.03 ? 0 : u < 0.045 ? 0.85 : u < 0.055 ? 0.25 : 1;
  const pan = ease.inOut2(seg(u, 0.64, 0.82));
  const span = h * 0.95;
  // the wall, sliding up out of frame as the torch tips down
  ctx.save();
  ctx.translate(0, -pan * span);
  wall(g, u, on);
  ctx.restore();
  // the floor coming up under it
  if (pan > 0) {
    ctx.save();
    ctx.translate(0, (1 - pan) * span);
    floor(g, u, on);
    ctx.restore();
  }
  marble(g, u, pan, span, on);
  // the blanket in the foreground, the torch peeking out of it (gone as we tip down)
  if (pan < 1) {
    ctx.save();
    ctx.translate(0, pan * h * 0.6);
    blanket(g, on * (1 - pan));
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ the wall */

function lightOn(g: G): { x: number; y: number; R: number } {
  const { w, h, S, t } = g;
  // a hand-held torch: the circle drifts a little
  return { x: w * 0.5 + Math.sin(t * 0.9) * S * 0.008, y: h * 0.4 + Math.sin(t * 0.7 + 1) * S * 0.006, R: S * 0.62 };
}

function wall(g: G, u: number, on: number) {
  const { ctx, S, t } = g;
  if (on <= 0) return;
  const L = lightOn(g);
  ctx.save();
  ctx.globalAlpha = on;
  pool(ctx, L.x, L.y, L.R, L.R);
  // the wallpaper: small stars, only where the light is
  ctx.save();
  ctx.beginPath();
  ctx.arc(L.x, L.y, L.R, 0, TAU);
  ctx.clip();
  ctx.fillStyle = withAlpha(LIGHT.low, 0.28);
  const step = S * 0.11;
  for (let gy = -3; gy <= 3; gy++) {
    for (let gx = -3; gx <= 3; gx++) {
      const x = L.x + gx * step + (gy % 2 ? step / 2 : 0);
      const y = L.y + gy * step;
      star4(ctx, x, y, S * 0.012);
    }
  }
  // a paper kite pinned at the edge of the light, its tail hanging down
  kite(ctx, L.x - L.R * 0.72, L.y - L.R * 0.62, S * 0.16, t);
  ctx.restore();
  // the fight
  ctx.save();
  ctx.beginPath();
  ctx.arc(L.x, L.y, L.R * 1.05, 0, TAU);
  ctx.clip();
  fight(g, u, L);
  ctx.restore();
  ctx.restore();
}

/** a soft pool of torch light, as an ellipse (rx, ry) */
function pool(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, LIGHT.hot);
  gr.addColorStop(0.5, LIGHT.mid);
  gr.addColorStop(0.86, LIGHT.low);
  gr.addColorStop(0.95, withAlpha(LIGHT.low, 0.35));
  gr.addColorStop(1, withAlpha(LIGHT.low, 0));
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  // the reflector's ring, a touch brighter near the rim
  ctx.strokeStyle = withAlpha(LIGHT.hot, 0.18);
  ctx.lineWidth = rx * 0.03;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 0.84, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function star4(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function kite(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25);
  ctx.fillStyle = withAlpha('#c0392b', 0.55);
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.6);
  ctx.lineTo(s * 0.4, 0);
  ctx.lineTo(0, s * 0.75);
  ctx.lineTo(-s * 0.4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = withAlpha('#3a2416', 0.6);
  ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.6);
  ctx.lineTo(0, s * 0.75);
  ctx.moveTo(-s * 0.4, 0);
  ctx.lineTo(s * 0.4, 0);
  ctx.stroke();
  // the tail: a string with paper bows, swaying
  ctx.beginPath();
  let px = 0, py = s * 0.75;
  ctx.moveTo(px, py);
  for (let i = 1; i <= 8; i++) {
    px = Math.sin(i * 0.8 + t * 1.2) * s * 0.08 * (i / 8);
    py = s * 0.75 + i * s * 0.18;
    ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = withAlpha('#c0392b', 0.5);
  for (let i = 2; i <= 8; i += 3) {
    const bx = Math.sin(i * 0.8 + t * 1.2) * s * 0.08 * (i / 8), by = s * 0.75 + i * s * 0.18;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - s * 0.08, by - s * 0.05);
    ctx.lineTo(bx - s * 0.08, by + s * 0.05);
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + s * 0.08, by - s * 0.05);
    ctx.lineTo(bx + s * 0.08, by + s * 0.05);
    ctx.fill();
  }
  ctx.restore();
}

/* ----------------------------------------------------------------- the fight */

/** where the marble's shadow is on the wall at u (null once it has fallen out of the light) */
function marbleOnWall(g: G, u: number, L: { x: number; y: number; R: number }): Pt | null {
  const { t } = g;
  if (u < 0.08 || u > 0.66) return null;
  const rise = ease.out3(seg(u, 0.08, 0.2));
  let x = L.x + Math.sin(t * 2.1) * L.R * 0.02, y = lerp(L.y + L.R * 1.1, L.y - L.R * 0.12, rise) + Math.sin(t * 3) * L.R * 0.015;
  // caught in the wolf's jaws, then it pops free and drops
  const caught = seg(u, 0.53, 0.57) * (1 - seg(u, 0.585, 0.6));
  x = lerp(x, L.x - L.R * 0.05, caught);
  const pop = seg(u, 0.585, 0.66);
  if (pop > 0) {
    x += pop * L.R * 0.25;
    y += -Math.sin(Math.min(1, pop * 1.6) * Math.PI) * L.R * 0.35 + ease.in2(pop) * L.R * 1.4;
  }
  return [x, y];
}

function fight(g: G, u: number, L: { x: number; y: number; R: number }) {
  const { ctx, t } = g;
  const s = L.R * 0.5;
  const enter = ease.out3(seg(u, 0.1, 0.24));
  const leave = ease.in2(seg(u, 0.62, 0.7));
  // lunges (toward the middle), jaw opens and snaps
  const lA = bell(u, 0.25, 0.36) * 0.2 + bell(u, 0.46, 0.58) * 0.22;
  const lB = bell(u, 0.35, 0.47) * 0.2 + bell(u, 0.46, 0.58) * 0.2;
  const openA = Math.max(bell(u, 0.22, 0.31), bell(u, 0.5, 0.555)) * 0.55 + 0.06 + Math.sin(t * 3) * 0.03;
  const openB = Math.max(bell(u, 0.32, 0.41), bell(u, 0.44, 0.5)) * 0.6 + 0.05 + Math.sin(t * 2.6 + 1) * 0.03;
  // the clash: both locked, shaking
  const lock = bell(u, 0.47, 0.57);
  const jit = lock * L.R * 0.012;
  const jx = (hash(Math.floor(t * 24)) - 0.5) * jit, jy = (hash(Math.floor(t * 24) + 5) - 0.5) * jit;
  const ax = L.x - L.R * 0.5 - (1 - enter) * L.R * 1.1 + lA * L.R - leave * L.R * 1.2 + jx;
  const ay = L.y + L.R * 0.12 + (1 - enter) * L.R * 0.5 + bell(u, 0.25, 0.36) * -L.R * 0.06 + jy;
  const bx = L.x + L.R * 0.5 + (1 - enter) * L.R * 1.1 - lB * L.R + leave * L.R * 1.2 - jx;
  const by = L.y + L.R * 0.1 + (1 - enter) * L.R * 0.5 + bell(u, 0.35, 0.47) * -L.R * 0.06 - jy;
  handShadow(ctx, ax, ay, s, 1, openA, 'wolf', -0.12 + bell(u, 0.25, 0.36) * 0.15);
  handShadow(ctx, bx, by, s * 1.05, -1, openB, 'dragon', -0.1 + bell(u, 0.35, 0.47) * 0.15);
  const m = marbleOnWall(g, u, L);
  if (m) marbleShadow(ctx, m[0], m[1], L.R * 0.075, t);
}

/**
 * A shadow made by a hand, like a shadow puppet: the forearm rising from below, the palm as the
 * head, the fingers as the snout, the thumb as the jaw, and an ear (wolf) or swept horns (dragon).
 * One organic outline (sharp only at the ear tips), with a soft penumbra. `dir` +1 faces right.
 */
type HP = [number, number, boolean?];
function handShadow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dir: number, open: number, kind: 'wolf' | 'dragon', tilt: number) {
  const hinge: Pt = [0.18, 0.05];
  const lift = -open * 0.32, drop = open * 0.5;
  const rot = (p: HP, a: number): HP => {
    const dx = p[0] - hinge[0], dy = p[1] - hinge[1];
    return [hinge[0] + dx * Math.cos(a) - dy * Math.sin(a), hinge[1] + dx * Math.sin(a) + dy * Math.cos(a), p[2]];
  };
  const snoutLen = kind === 'dragon' ? 0.92 : 0.74;
  // head and snout, from the back of the neck round to the corner of the mouth
  const head: HP[] = [
    [-0.3, 0.3], [-0.38, 0.02],
    ...(kind === 'wolf'
      ? ([[-0.3, -0.16], [-0.16, -0.58, true], [-0.02, -0.2]] as HP[])
      : ([[-0.34, -0.12], [-0.6, -0.5, true], [-0.2, -0.2], [-0.32, -0.62, true], [-0.04, -0.2]] as HP[])),
    [0.1, -0.21],
    ...([[0.3, -0.19], [0.5, -0.15], [snoutLen - 0.05, -0.1], [snoutLen, -0.04], [snoutLen - 0.04, 0.02], [0.24, 0.04]] as HP[]).map((p) => rot(p, lift)),
    [0.12, 0.12],
    // the throat runs into the wrist, the wrist into the forearm (wider as it nears the torch)
    [0.06, 0.32], [0.16, 1.0], [0.3, 2.0], [-0.75, 2.0], [-0.55, 1.0],
  ];
  // the jaw: the thumb, hinged at the corner of the mouth
  const jaw: HP[] = ([[0.12, 0.06], [0.4, 0.06], [kind === 'dragon' ? 0.7 : 0.6, 0.09], [0.56, 0.15], [0.3, 0.17], [0.08, 0.2]] as HP[]).map((p) => rot(p, drop));
  const path = (pts: HP[]) => {
    const n = pts.length;
    const mid = (i: number): Pt => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    ctx.beginPath();
    const m0 = mid(0);
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 1; i <= n; i++) {
      const p = pts[i % n], m = mid(i);
      if (p[2]) {
        ctx.lineTo(p[0], p[1]);
        ctx.lineTo(m[0], m[1]);
      } else ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  ctx.rotate(tilt);
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  // the penumbra: the outline, widened and faint
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 0.07;
  for (const sh of [head, jaw]) {
    path(sh);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.95;
  for (const sh of [head, jaw]) {
    path(sh);
    ctx.fill();
  }
  // the knuckles show as small bumps along the top of the snout
  for (const k of [0.26, 0.4, 0.54]) {
    const p = rot([k, -0.17], lift);
    ctx.beginPath();
    ctx.arc(p[0], p[1], 0.045, 0, TAU);
    ctx.fill();
  }
  // the eye: a gap between two fingers where the light gets through
  const e = rot([kind === 'dragon' ? 0.2 : 0.14, -0.09], lift * 0.3);
  ctx.globalAlpha = 1;
  ctx.fillStyle = LIGHT.mid;
  ctx.beginPath();
  ctx.ellipse(e[0], e[1], 0.045, 0.022, -0.15, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** the shadow of a glass marble: a dark disc with a bright point where the glass focuses the light */
function marbleShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.15, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1;
  drawSprite(ctx, glow(LIGHT.hot, 64), x + r * 0.15, y + r * 0.1, r * (1.6 + Math.sin(t * 5) * 0.1));
  ctx.restore();
}

/* ----------------------------------------------------------------- the floor */

/** the pool of light on the floor: the same ellipse as the night ride's puddle */
function floorPool(g: G) {
  const { w, h } = g;
  return { x: w / 2, y: h * 0.62, rx: w * 0.62, ry: h * 0.14 };
}

function floor(g: G, u: number, on: number) {
  const { ctx, w, h, S } = g;
  ctx.fillStyle = '#060609';
  ctx.fillRect(0, h * 0.05, w, h * 2);
  const P = floorPool(g);
  bed(g, P, on);
  ctx.save();
  ctx.globalAlpha = on;
  pool(ctx, P.x, P.y, P.rx, P.ry);
  // the rug: a few worn lines, only where the light is
  ctx.save();
  ctx.translate(P.x, P.y);
  ctx.scale(1, P.ry / P.rx);
  ctx.beginPath();
  ctx.arc(0, 0, P.rx * 0.95, 0, TAU);
  ctx.restore();
  ctx.clip();
  ctx.strokeStyle = withAlpha('#5a3a20', 0.35);
  ctx.lineWidth = Math.max(1, S * 0.004);
  ctx.beginPath();
  ctx.moveTo(0, P.y + P.ry * 0.55);
  ctx.lineTo(w, P.y + P.ry * 0.45);
  ctx.moveTo(P.x + P.rx * 0.35, P.y - P.ry);
  ctx.lineTo(P.x + P.rx * 0.3, P.y + P.ry);
  ctx.stroke();
  ctx.restore();
  // where the marble lands: rings run out across the light (and on into the puddle)
  const land = seg(u, 0.86, 1);
  if (land > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      // matched to the puddle's rings at its first frame
      const qq = land * 0.35 - k * 0.15 + (k ? 0 : 0);
      if (qq <= 0 || qq >= 1) continue;
      ctx.strokeStyle = withAlpha(k ? '#9fe8ff' : '#ffd6f4', (1 - qq) * 0.8);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(P.x, P.y, P.rx * ease.out2(qq), P.ry * ease.out2(qq), 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** the side of the bed beyond the pool: the duvet hanging down, and the dark gap underneath it */
function bed(g: G, P: { x: number; y: number; rx: number; ry: number }, on: number) {
  const { ctx, w, h, S, t } = g;
  const hem = P.y - P.ry - h * 0.06;
  // under the bed: the darkest place in the room
  ctx.fillStyle = '#020203';
  ctx.fillRect(0, hem, w, P.y - P.ry - hem + h * 0.02);
  // the duvet, hanging in loose folds, its hem caught by the pool of light
  const gr = ctx.createLinearGradient(0, h * 0.05, 0, hem);
  gr.addColorStop(0, '#08090f');
  gr.addColorStop(1, '#1a1410');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(-10, h * 0.05);
  ctx.lineTo(w + 10, h * 0.05);
  ctx.lineTo(w + 10, hem);
  const n = 6;
  for (let i = n; i >= 0; i--) {
    const x = (i / n) * (w + 20) - 10;
    const y = hem + Math.sin(i * 2.3) * S * 0.012 + Math.sin(t * 0.6 + i) * S * 0.002;
    ctx.quadraticCurveTo(x + (w / n) * 0.5, y + S * 0.02, x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = 0.5 * on;
  ctx.strokeStyle = LIGHT.low;
  ctx.lineWidth = Math.max(1, S * 0.004);
  ctx.stroke();
  // fold shadows running down the duvet
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#030305';
  ctx.lineWidth = S * 0.02;
  for (let i = 1; i < n; i++) {
    const x = (i / n) * w + Math.sin(i * 3.1) * S * 0.03;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.08);
    ctx.quadraticCurveTo(x + S * 0.02, (h * 0.08 + hem) / 2, x - S * 0.01, hem - S * 0.01);
    ctx.stroke();
  }
  ctx.restore();
}

/* --------------------------------------------------------------- the marble */

function marble(g: G, u: number, pan: number, span: number, on: number) {
  const { ctx, S, t } = g;
  if (u < 0.655 || on <= 0) return;
  const L = lightOn(g);
  const P = floorPool(g);
  // from where it popped out of the wolf's jaws (on the wall) down into the pool on the floor
  const start = marbleOnWall(g, 0.655, L)!;
  const k = seg(u, 0.655, 0.86);
  const sx = start[0], sy = start[1] - pan * span;
  const ex = P.x, ey = P.y + (1 - pan) * span;
  const x = lerp(sx, ex, ease.inOut2(k)) + Math.sin(k * Math.PI) * S * 0.05;
  let y = lerp(sy, ey, ease.in2(k));
  // a little bounce where it lands, then still
  const b = seg(u, 0.86, 0.96);
  if (b > 0) y = ey - Math.abs(Math.sin(b * Math.PI * 2)) * S * 0.03 * (1 - b);
  // the real thing now: glass, lit by the torch (it only shows once it's out of the shadow play)
  const a = seg(u, 0.655, 0.675);
  if (a <= 0) return;
  const r = S * 0.028;
  ctx.save();
  ctx.globalAlpha = a;
  if (b > 0 || k >= 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.3, ey + r * 0.8, r * 1.2, r * 0.35, 0, 0, TAU);
    ctx.fill();
  }
  drawMarbleBall(ctx, x, y, r, t);
  ctx.restore();
}

/** a glass marble with a coloured twist inside: the one object that runs through every world */
export function drawMarbleBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.save();
  const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  body.addColorStop(0, 'rgba(235,250,255,0.95)');
  body.addColorStop(0.5, 'rgba(120,200,235,0.75)');
  body.addColorStop(1, 'rgba(20,60,110,0.9)');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  // the twist inside: a red and a blue ribbon
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, TAU);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(t * 0.4);
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = 'round';
  for (const [col, off] of [['#ff4021', 0], ['#2f5bff', Math.PI]] as const) {
    ctx.strokeStyle = col;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = off + (i / 12) * Math.PI;
      const rr = r * 0.62 * Math.sin((i / 12) * Math.PI);
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.5;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
  // the window highlight
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.13, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* -------------------------------------------------------------- the blanket */

function blanket(g: G, on: number) {
  const { ctx, w, h, S, t } = g;
  const top = h * 0.8;
  // the torch is down behind the fold: only its beam shows, a faint cone up to the wall
  if (on > 0) {
    const L = lightOn(g);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.07 * on;
    const gr = ctx.createLinearGradient(0, top, 0, L.y);
    gr.addColorStop(0, LIGHT.hot);
    gr.addColorStop(1, withAlpha(LIGHT.mid, 0));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - S * 0.03, top + S * 0.02);
    ctx.lineTo(L.x - L.R * 0.85, L.y);
    ctx.lineTo(L.x + L.R * 0.85, L.y);
    ctx.lineTo(w * 0.5 + S * 0.03, top + S * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // the blanket: two big soft folds across the bottom of the frame
  ctx.fillStyle = '#05050a';
  ctx.beginPath();
  ctx.moveTo(-10, h + 10);
  ctx.lineTo(-10, top + S * 0.06);
  ctx.bezierCurveTo(w * 0.15, top - S * 0.02, w * 0.32, top + S * 0.01, w * 0.5, top + S * 0.05 + Math.sin(t * 0.8) * S * 0.003);
  ctx.bezierCurveTo(w * 0.66, top + S * 0.09, w * 0.82, top - S * 0.04, w + 10, top + S * 0.03);
  ctx.lineTo(w + 10, h + 10);
  ctx.closePath();
  ctx.fill();
  // the torch's light catching the top of the folds
  if (on > 0) {
    ctx.save();
    ctx.globalAlpha = 0.4 * on;
    ctx.strokeStyle = LIGHT.mid;
    ctx.lineWidth = Math.max(1, S * 0.004);
    ctx.beginPath();
    ctx.moveTo(-10, top + S * 0.06);
    ctx.bezierCurveTo(w * 0.15, top - S * 0.02, w * 0.32, top + S * 0.01, w * 0.5, top + S * 0.05 + Math.sin(t * 0.8) * S * 0.003);
    ctx.bezierCurveTo(w * 0.66, top + S * 0.09, w * 0.82, top - S * 0.04, w + 10, top + S * 0.03);
    ctx.stroke();
    ctx.restore();
  }
}
