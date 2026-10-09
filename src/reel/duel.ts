import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, lerp, rng, seg } from '../core/math';
import { drawWarrior, solve } from '../acts/warrior';
import { PIG, setMoonFrom, MOON_SPIN } from './painting';

/*
 * THE DUEL.
 *
 * Two fighters painted in ink, their blades stroked in mineral pigment
 * (azurite blue, malachite green). Each is keyed to the scroll as a hilt
 * position, a blade angle and the ground under their feet; the body is
 * solved from the blade (acts/warrior.ts). Strikes snap; everything else
 * eases. A fast swing leaves smear frames; every clash gets a frame of
 * negative and a burst of ink that stays on the paper.
 */

export const S = 400; // figure height, painting units
const L = S * 0.95; // blade length

/** 0 smooth, 1 snap into this key, 2 hold the previous key until this one, 3 raw angle (a full spin) */
type Key = [b: number, x: number, y: number, a: number, gy: number, mode: number];

const BLUE: Key[] = [
  [1.35, 300, 1712, -0.9, 1842, 0],
  [1.9, 300, 1712, -0.9, 1842, 0],
  [2.3, 300, 1722, -0.55, 1842, 0],
  [2.55, 290, 1748, 2.72, 1842, 0],
  [2.77, 286, 1750, 2.76, 1842, 2],
  [2.86, 760, 1712, -0.22, 1842, 1],
  [3.1, 772, 1712, -0.3, 1842, 0],
  [3.4, 760, 1712, -2.35, 1842, 0],
  [3.86, 742, 1730, -2.5, 1842, 0],
  [4.1, 418, 662, -2.2, 766, 1],
  [4.45, 420, 664, -2.4, 766, 0],
  [4.95, 392, 666, -2.15, 766, 0],
  [5.0, 368, 672, -2.92, 766, 1],
  [5.15, 374, 682, -2.5, 766, 1],
  [5.3, 362, 660, -1.9, 766, 1],
  [5.45, 452, 666, -2.3, 766, 1],
  [5.9, 452, 666, -2.3, 766, 0],
  [6.05, 344, 652, -2.62, 766, 1],
  [6.45, 336, 656, -2.72, 766, 0],
  [6.5, 336, 656, -2.72, 766, 2],
  [6.62, 352, 656, -2.72 + TAU, 766, 3],
  [6.95, 360, 660, -2.6 + TAU, 766, 0],
  [7.16, 172, 1712, -0.7, 1842, 1],
  [7.35, 172, 1716, -0.72, 1842, 0],
  [7.55, 164, 1756, 2.92, 1842, 0],
  [7.6, 164, 1756, 2.92, 1842, 2],
  [7.62, 902, 1736, -0.06, 1842, 1],
  [9.0, 902, 1736, -0.06, 1842, 0],
];

const GREEN: Key[] = [
  [1.35, 700, 1712, -2.24, 1842, 0],
  [1.9, 700, 1712, -2.24, 1842, 0],
  [2.3, 700, 1722, -2.55, 1842, 0],
  [2.55, 710, 1748, 0.42, 1842, 0],
  [2.77, 714, 1750, 0.38, 1842, 2],
  [2.86, 240, 1712, -2.92, 1842, 1],
  [3.1, 228, 1712, -2.84, 1842, 0],
  [3.4, 240, 1712, -0.72, 1842, 0],
  [3.72, 252, 1742, -1.2, 1842, 0],
  [4.0, 196, 660, -1.42, 764, 1],
  [4.45, 196, 662, -0.8, 764, 0],
  [4.95, 236, 666, -1.0, 764, 0],
  [5.0, 256, 670, -0.24, 764, 1],
  [5.15, 250, 660, -0.62, 764, 1],
  [5.3, 262, 676, -1.26, 764, 1],
  [5.45, 150, 666, -0.8, 764, 1],
  [5.9, 150, 666, -0.8, 764, 0],
  [6.05, 270, 650, -0.46, 764, 1],
  [6.45, 278, 656, -0.42, 764, 0],
  [6.5, 278, 656, -0.42, 764, 2],
  [6.62, 210, 672, -0.95, 764, 1],
  [6.95, 212, 672, -0.9, 764, 0],
  [7.16, 762, 1712, -2.3, 1842, 1],
  [7.6, 762, 1712, -2.3, 1842, 0],
  [7.86, 762, 1712, -2.3, 1842, 2],
  [8.02, 756, 1764, -2.02, 1842, 1],
  [9.0, 756, 1764, -2.02, 1842, 0],
];

/** the keys were blocked out low; stand the fighters up (hilt height above their ground × 1.85) */
const stand = (keys: Key[]): Key[] => keys.map(([b, x, y, a, gy, m]) => [b, x, gy - (gy - y) * 2.05, a, gy, m]);
const BLUE_K = stand(BLUE), GREEN_K = stand(GREEN);

function angLerp(a: number, b: number, t: number) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

export interface Pose { x: number; y: number; a: number; gy: number; vx: number }

function poseOf(keys: Key[], B: number): Omit<Pose, 'vx'> {
  if (B <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], a: keys[0][3], gy: keys[0][4] };
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] <= B) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const raw = clamp((B - k0[0]) / (k1[0] - k0[0]));
  const mode = k1[5];
  const t = mode === 1 ? ease.out5(raw) : mode === 2 ? (raw >= 1 ? 1 : 0) : ease.inOut2(raw);
  // a leap arcs: the hilt rises over the straight line between two grounds
  const leap = k0[4] !== k1[4] ? Math.sin(t * Math.PI) * 220 : 0;
  return {
    x: lerp(k0[1], k1[1], t),
    y: lerp(k0[2], k1[2], t) - leap,
    a: mode === 3 ? lerp(k0[3], k1[3], ease.inOut2(raw)) : angLerp(k0[3], k1[3], t),
    // the ground switches when the leap is past its top
    gy: k0[4] === k1[4] ? k0[4] : t < 0.5 ? k0[4] : k1[4],
  };
}

export function poses(B: number): [Pose, Pose] {
  const d = 0.004;
  const b = poseOf(BLUE_K, B), g = poseOf(GREEN_K, B);
  const bp = poseOf(BLUE_K, B - d), gp = poseOf(GREEN_K, B - d);
  return [
    { ...b, vx: (b.x - bp.x) / d },
    { ...g, vx: (g.x - gp.x) / d },
  ];
}

/* ------------------------------------------------------------- clashes */

/** [beat, strength] of every clash; where it happens is measured from the blades */
const CLASH_AT: [number, number][] = [[2.82, 1.2], [3.98, 1], [5.0, 0.8], [5.15, 0.8], [5.3, 0.8], [6.05, 1], [7.61, 1.6]];

/** the closest points of the two blades at beat B (the thunder has no meeting: it's at Green) */
function meet(B: number): Pt {
  const b = poseOf(BLUE_K, B), g = poseOf(GREEN_K, B);
  const segOf = (p: { x: number; y: number; a: number }): [Pt, Pt] => [[p.x, p.y], [p.x + Math.cos(p.a) * L, p.y + Math.sin(p.a) * L]];
  const [a0, a1] = segOf(b), [b0, b1] = segOf(g);
  let best: Pt = [(a1[0] + b1[0]) / 2, (a1[1] + b1[1]) / 2], bd = Infinity;
  for (let i = 0; i <= 20; i++) {
    const p: Pt = [lerp(a0[0], a1[0], i / 20), lerp(a0[1], a1[1], i / 20)];
    for (let j = 0; j <= 20; j++) {
      const q: Pt = [lerp(b0[0], b1[0], j / 20), lerp(b0[1], b1[1], j / 20)];
      const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (d < bd) { bd = d; best = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; }
    }
  }
  return best;
}

/** [beat, x, y, strength]: where blade meets blade */
export const CLASHES: [number, number, number, number][] = CLASH_AT.map(([c, st]) => {
  if (c === 7.61) {
    const g = poseOf(GREEN_K, c);
    return [c, g.x, g.y - 60, st];
  }
  const [x, y] = meet(c);
  return [c, x, y, st];
});

/** a frame or two of negative on every clash, like an anime impact frame */
export function impactNow(B: number) {
  for (const [c, , , st] of CLASHES) if (B >= c && B < c + 0.012 * st) return true;
  return false;
}

/** ink thrown off a clash: flies, lands, and stays on the paper */
function drawSplatter(ctx: CanvasRenderingContext2D, B: number) {
  CLASHES.forEach(([c, x, y, st], ci) => {
    const q = seg(B, c, c + 0.16);
    if (q <= 0) return;
    const r = rng(300 + ci);
    const n = Math.round(13 * st);
    for (let i = 0; i < n; i++) {
      const an = r() * TAU, v = (50 + r() * 200) * st, sz = 2.5 + r() * 7 * st;
      const fly = ease.out3(q);
      const px = x + Math.cos(an) * v * fly, py = y + Math.sin(an) * v * fly + q * q * 90;
      const col = i % 5 === 0 ? PIG.blue : i % 5 === 1 ? PIG.green : PIG.ink;
      ctx.fillStyle = col;
      // what lands on the ground stays; what flew off in the air dries away
      const stays = y > 1500;
      const fade = stays ? 1 : 1 - seg(B, c + 0.2, c + 0.6);
      if (fade <= 0) continue;
      ctx.globalAlpha = (q < 1 ? 1 : 0.85) * fade;
      ctx.save();
      ctx.translate(px, py);
      // in flight a drop is a streak along its path; landed, a round spot
      const stretch = q < 1 ? 1 + (1 - q) * 3 : 1;
      ctx.rotate(an);
      ctx.beginPath();
      ctx.ellipse(0, 0, sz * stretch, sz, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // a ring of wet ink where it hit
    const ring = seg(B, c, c + 0.07);
    if (ring > 0 && ring < 1) {
      ctx.strokeStyle = PIG.ink;
      ctx.globalAlpha = (1 - ring) * 0.8;
      ctx.lineWidth = 6 * (1 - ring) + 1;
      ctx.beginPath();
      ctx.arc(x, y, 30 + ease.out3(ring) * 260 * st, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

/* --------------------------------------------------------------- blades */

/** a blade stroked in pigment; `from`/`to` (0..1 of its length) draw a broken piece */
function drawBlade(ctx: CanvasRenderingContext2D, hx: number, hy: number, a: number, col: string, seed: number, from = 0, to = 1) {
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const wb = L * 0.028;
  const P = (s: number, o: number): Pt => [hx + dx * L * s + nx * o, hy + dy * L * s + ny * o];
  // grip and guard in ink
  if (from === 0) {
    ctx.strokeStyle = PIG.ink;
    ctx.lineCap = 'round';
    ctx.lineWidth = wb * 1.3;
    ctx.beginPath();
    ctx.moveTo(...P(-0.2, 0));
    ctx.lineTo(...P(0.02, 0));
    ctx.stroke();
    ctx.lineWidth = wb * 0.9;
    ctx.beginPath();
    ctx.moveTo(...P(0.03, -wb * 2.2));
    ctx.lineTo(...P(0.03, wb * 2.2));
    ctx.stroke();
  }
  const s0 = Math.max(0.05, from), s1 = to;
  // the blade: a crisp tapered body...
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(...P(s0, wb));
  ctx.lineTo(...P(Math.min(s1, 0.93), wb * 0.85 * (s1 < 1 ? 1 : 1)));
  if (s1 >= 1) ctx.lineTo(...P(1, 0));
  ctx.lineTo(...P(Math.min(s1, 0.93), -wb * 0.85));
  ctx.lineTo(...P(s0, -wb));
  ctx.closePath();
  ctx.fill();
  // ...a dry stroke of the same pigment over it for the hand, and one paper-white edge
  brush(ctx, [P(s0 + 0.02, -wb * 0.2), P((s0 + s1) / 2, wb * 0.1), P(s1 - 0.03, 0)], { width: wb * 1.6, color: col, dry: 0.85, seed, press: 1, tail: 0.4, alpha: 0.6 });
  ctx.strokeStyle = 'rgba(246,242,232,0.85)';
  ctx.lineWidth = Math.max(1.5, wb * 0.18);
  ctx.beginPath();
  ctx.moveTo(...P(s0 + 0.04, -wb * 0.45));
  ctx.lineTo(...P(s1 - 0.06, -wb * 0.35));
  ctx.stroke();
}

/** the smear a fast swing leaves: one soft crescent of pigment over the arc, dry at its outer edge */
function drawSmear(ctx: CanvasRenderingContext2D, keys: Key[], B: number, col: string) {
  const n = 8, dt = 0.0075;
  const pts: { x: number; y: number; a: number }[] = [];
  for (let j = 0; j <= n; j++) pts.push(poseOf(keys, B - j * dt));
  // the sweep is the blade's turn (a leap moves the hilt, it doesn't swing the blade)
  let turn = 0;
  for (let j = 0; j < n; j++) turn += Math.abs(angLerp(pts[j + 1].a, pts[j].a, 1) - pts[j + 1].a);
  if (turn < 0.95) return;
  const k = clamp((turn - 0.95) / 1.3);
  const tip = (p: { x: number; y: number; a: number }, s: number): Pt => [p.x + Math.cos(p.a) * L * s, p.y + Math.sin(p.a) * L * s];
  ctx.save();
  // the crescent: outer edge along the tip's path, inner edge closer to the hilt, thinning to the tail
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.42 * k;
  ctx.beginPath();
  for (let j = 0; j <= n; j++) {
    const p = tip(pts[j], 1.03);
    if (j) ctx.lineTo(p[0], p[1]);
    else ctx.moveTo(p[0], p[1]);
  }
  for (let j = n; j >= 0; j--) {
    const inner = lerp(0.35, 0.92, j / n);
    const p = tip(pts[j], inner);
    ctx.lineTo(p[0], p[1]);
  }
  ctx.closePath();
  ctx.fill();
  // the dry outer edge: the brush running out along the tip's path
  const edge: Pt[] = [];
  for (let j = 0; j <= n; j++) edge.push(tip(pts[j], 0.98));
  ctx.globalAlpha = 0.8 * k;
  brush(ctx, edge, { width: L * 0.07, color: col, dry: 0.92, seed: 9, press: 1.1, tail: 0.15 });
  ctx.restore();
}

/* ------------------------------------------------------------- the fighters */

/** Green's blade snaps after the thunder; the broken half flies up and stamps the seal */
export const SNAP = 7.86;
export const SEAL = { x: 96, y: 640, size: 82, at: 8.34 };

function brokenPiece(B: number): { x: number; y: number; a: number } | null {
  if (B < SNAP || B > SEAL.at + 0.01) return null;
  const g = poseOf(GREEN_K, SNAP);
  const sx = g.x + Math.cos(g.a) * L * 0.75, sy = g.y + Math.sin(g.a) * L * 0.75;
  const k = seg(B, SNAP, SEAL.at);
  const e = ease.inOut2(k);
  // a high arc up to the corner of the scroll, spinning, landing point-down
  const x = lerp(sx, SEAL.x, e);
  const y = lerp(sy, SEAL.y - L * 0.25, e) - Math.sin(k * Math.PI) * 260;
  const a = lerp(g.a, Math.PI / 2 + TAU * 3, ease.out2(k));
  return { x, y, a };
}

export function drawDuel(f: Frame, ctx: CanvasRenderingContext2D, B: number, t: number) {
  const [b, g] = poses(B);
  drawSplatter(ctx, B);
  // the drops bloom the fighters into being
  const bloom = (cx: number, k: number, draw: () => void) => {
    if (k <= 0) return;
    if (k >= 1) return draw();
    ctx.save();
    ctx.beginPath();
    const R = ease.out3(k) * 420;
    for (let i = 0; i <= 48; i++) {
      const an = (i / 48) * TAU;
      const rr = R * (1 + 0.08 * Math.sin(an * 7 + cx) + 0.05 * Math.sin(an * 13));
      const x = cx + Math.cos(an) * rr, y = 1842 + Math.sin(an) * rr;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.clip();
    draw();
    ctx.restore();
  };
  const warrior = (p: Pose, foe: Pose, col: string, seed: number, keys: Key[], broken: boolean) => {
    drawWarrior(ctx, { hilt: [p.x, p.y], a: p.a, foeX: foe.x, s: S, groundY: p.gy, color: col, t, vx: p.vx, vy: 0, seed, alpha: 1 });
    drawSmear(ctx, keys, B, col);
    drawBlade(ctx, p.x, p.y, p.a, col, seed, 0, broken ? 0.5 : 1);
  };
  const bk = seg(B, 1.3, 1.62), gk = seg(B, 1.3, 1.62);
  bloom(300, bk, () => warrior(b, g, PIG.blue, 1, BLUE_K, false));
  bloom(700, gk, () => warrior(g, b, PIG.green, 2, GREEN_K, B >= SNAP));

  // the moon is the circle the spinning guard leaves
  if (B >= MOON_SPIN.b0 - 0.05) {
    const p = poseOf(BLUE_K, MOON_SPIN.b0);
    setMoonFrom(p.x, p.y, L * 0.98);
  }

  // the thunder: gold crackling round Blue's hilt as the draw charges
  const charge = seg(B, 7.38, 7.6);
  if (charge > 0 && B < 7.6) {
    ctx.save();
    ctx.strokeStyle = PIG.gold;
    ctx.lineCap = 'round';
    const r = rng(Math.floor(t * 18));
    for (let i = 0; i < 9; i++) {
      const an = r() * TAU, d0 = 30 + r() * 40, d1 = d0 + 40 + r() * 90 * charge;
      ctx.lineWidth = 3 + r() * 4;
      ctx.globalAlpha = 0.5 + 0.5 * charge;
      ctx.beginPath();
      ctx.moveTo(b.x + Math.cos(an) * d0, b.y + Math.sin(an) * d0);
      ctx.lineTo(b.x + Math.cos(an + 0.3) * (d0 + d1) / 2, b.y + Math.sin(an + 0.3) * (d0 + d1) / 2);
      ctx.lineTo(b.x + Math.cos(an) * d1, b.y + Math.sin(an) * d1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // the broken half, flying to the corner
  const piece = brokenPiece(B);
  if (piece) {
    const hx = piece.x - Math.cos(piece.a) * L * 0.75, hy = piece.y - Math.sin(piece.a) * L * 0.75;
    drawBlade(ctx, hx, hy, piece.a, PIG.green, 2, 0.5, 1);
  }
  void f;
  void solve;
}

/** the two fighters as plain silhouettes (painting units), for the chapters that show them as shadows */
export function drawRivalsFlat(ctx: CanvasRenderingContext2D, B: number, t: number, col: string) {
  const [b, g] = poses(B);
  for (const [p, foe, seed] of [[b, g, 1], [g, b, 2]] as const) {
    drawWarrior(ctx, { hilt: [p.x, p.y], a: p.a, foeX: foe.x, s: S, groundY: p.gy, color: col, t, vx: 0, vy: 0, seed, alpha: 1 });
    drawBlade(ctx, p.x, p.y, p.a, col, seed);
  }
}
