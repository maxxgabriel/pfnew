import { brush } from '../../src/core/brush';
import { type Pt, TAU } from '../../src/core/math';

/*
 * THE SKETCH, round version (dev study for the character sheet).
 *
 * Built around the head radius s: a big paper-white head ringed in brush ink,
 * a small solid ink body, stubby limbs, one curl on top and a headband whose
 * long tail is the motion line (it droops, it streams, it whips).
 */

export const INK = '#1b1714';
export const PAPER = '#f3eee3';
export const RED = '#e8432a';
/** the icy highlight in the hair, and the eyes */
export const ICE = '#bfe4f0';
export const ICE_DEEP = '#7fbcd6';
export const IRIS = '#2b6fd6';

export interface Pose {
  /** body lean, radians (+ = forward, to the right) */
  lean: number;
  /** head tilt relative to the body */
  tilt: number;
  /** arms: angle from straight down, radians (+ = forward); length in s */
  armL: number; armR: number; armLen?: number;
  /** legs: angle from straight down; knee bend */
  legL: number; legR: number; legLen?: number;
  /** where the eyes look, -1..1 */
  look: [number, number];
  face: 'calm' | 'strain' | 'wow' | 'grin' | 'blink' | 'focus';
  /** headband tail: how far it streams back (0 droop, 1 flat out) and its wave phase */
  stream: number; wave: number;
  /** squash and stretch: >1 tall, <1 squat */
  squash?: number;
  /** something in the near hand */
  prop?: 'brush';
}

const rot = (p: Pt, a: number): Pt => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];

/** a short tapered limb with a round end */
function limb(ctx: CanvasRenderingContext2D, from: Pt, ang: number, len: number, w: number, seed: number) {
  const tip: Pt = [from[0] + Math.sin(ang) * len, from[1] + Math.cos(ang) * len];
  const mid: Pt = [(from[0] + tip[0]) / 2 + Math.cos(ang) * len * 0.08, (from[1] + tip[1]) / 2 - Math.sin(ang) * len * 0.08];
  brush(ctx, [from, mid, tip], { width: w, color: INK, seed, dry: 0.1, press: 1.05, tail: 0.95, halo: 0 });
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(tip[0], tip[1], w * 0.62, 0, TAU);
  ctx.fill();
  return tip;
}

export function drawChibi(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pose, seed = 1) {
  const sq = p.squash ?? 1;
  const armLen = (p.armLen ?? 0.62) * s, legLen = (p.legLen ?? 0.5) * s;
  ctx.save();
  ctx.translate(x, y);
  // y is the ground under the feet
  const hip: Pt = [0, -legLen * 0.95];
  ctx.translate(hip[0], hip[1]);
  ctx.scale(1 / Math.sqrt(sq), sq);

  // ---- legs (behind the body)
  limb(ctx, [-s * 0.18, -s * 0.02], p.legL, legLen, s * 0.2, seed + 1);
  limb(ctx, [s * 0.18, -s * 0.02], p.legR, legLen, s * 0.2, seed + 2);

  ctx.rotate(p.lean);
  // ---- the far arm
  const shoulder = -s * 0.62;
  limb(ctx, [-s * 0.26, shoulder], p.armL, armLen * (Math.abs(p.armL) > 1.7 ? 2 : 1), s * 0.17, seed + 3);

  // ---- the body: a small ink bean
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-s * 0.36, 0);
  ctx.bezierCurveTo(-s * 0.46, -s * 0.35, -s * 0.34, -s * 0.78, 0, -s * 0.8);
  ctx.bezierCurveTo(s * 0.34, -s * 0.78, s * 0.46, -s * 0.35, s * 0.36, 0);
  ctx.quadraticCurveTo(0, s * 0.1, -s * 0.36, 0);
  ctx.fill();

  // a raised arm goes up beside the big head, so it sits behind it and reaches further
  const raised = Math.abs(p.armR) > 1.7;
  if (raised) limb(ctx, [s * 0.3, shoulder], p.armR, armLen * 2, s * 0.17, seed + 8);

  // ---- the head
  const neck: Pt = [0, -s * 0.74];
  ctx.save();
  ctx.translate(neck[0], neck[1]);
  ctx.rotate(p.tilt);
  const hc: Pt = [0, -s * 0.92];

  // headband tail, behind the head: streams back (to the left) as it runs
  const knot: Pt = [hc[0] - s * 0.86, hc[1] - s * 0.18];
  const tail: Pt[] = [knot];
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const back = s * 1.55 * u;
    const droop = (1 - p.stream) * s * 1.2 * u * u;
    const wav = Math.sin(p.wave + u * 4.2) * s * 0.16 * u * (0.4 + p.stream);
    const a = -p.tilt - p.lean; // keep the streaming in world space
    const d = rot([-back * (0.25 + 0.75 * p.stream), droop * 0.9 + wav + s * 0.15 * u], a);
    tail.push([knot[0] + d[0], knot[1] + d[1]]);
  }
  brush(ctx, tail, { width: s * 0.13, color: INK, seed: seed + 4, dry: 0.5, press: 1.2, tail: 0.2 });

  // the hair: long locks behind the head, down past the jaw, swept back by the wind
  const wind = (pt: Pt, k: number): Pt => [pt[0] - p.stream * k * s, pt[1] - p.stream * k * s * 0.25 + Math.sin(p.wave + k * 4) * s * 0.04 * p.stream];
  const lock = (a: Pt, b: Pt, c: Pt, w: number, k: number, col = INK, sd = 0) =>
    brush(ctx, [[hc[0] + a[0] * s, hc[1] + a[1] * s], wind([hc[0] + b[0] * s, hc[1] + b[1] * s], k * 0.5), wind([hc[0] + c[0] * s, hc[1] + c[1] * s], k)], { width: w * s, color: col, seed: seed + 50 + sd, dry: 0.25, press: 1.3, tail: 0.04, halo: 0 });
  lock([-0.6, -0.55], [-1.1, -0.1], [-1.02, 0.66], 0.28, 0.5, INK, 1);
  lock([-0.35, -0.8], [-1.1, -0.5], [-1.22, 0.18], 0.24, 0.55, INK, 2);
  lock([0.6, -0.55], [1.08, -0.1], [0.98, 0.62], 0.28, 0.25, INK, 3);
  lock([0.35, -0.8], [1.08, -0.5], [1.12, 0.12], 0.22, 0.25, INK, 4);

  // face plate
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(hc[0], hc[1], s, 0, TAU);
  ctx.fill();
  // the ring of the head: one brush turn, open at the top-left like an ensō
  const ring: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const a = -2.2 + (i / 40) * TAU * 0.97;
    const r = s * (1 + 0.025 * Math.sin(a * 3 + seed));
    ring.push([hc[0] + Math.cos(a) * r, hc[1] + Math.sin(a) * r]);
  }
  brush(ctx, ring, { width: s * 0.11, color: INK, seed: seed + 5, dry: 0.35, press: 1.4, tail: 0.5 });
  // the top of the hair: a dome to the brow, its edge broken into locks
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hc[0], hc[1] - s * 0.02, s * 1.02, Math.PI * 1.06, Math.PI * 1.94);
  // a ragged brow line, not a bowl cut
  const brow: Pt[] = [[0.9, -0.36], [0.62, -0.16], [0.42, -0.34], [0.2, -0.12], [-0.02, -0.36], [-0.25, -0.14], [-0.46, -0.36], [-0.68, -0.14], [-0.92, -0.36]];
  for (const [bx, by] of brow) ctx.lineTo(hc[0] + bx * s, hc[1] + by * s);
  ctx.closePath();
  ctx.fill();
  for (let k = 0; k < 7; k++) {
    const th = Math.PI * (1.1 + k * 0.133);
    const tip = 1.13 + ((k * 37) % 5) * 0.015;
    lock([Math.cos(th) * 0.5, Math.sin(th) * 0.5 - 0.1], [Math.cos(th - 0.1) * 0.98, Math.sin(th - 0.1) * 0.98 - 0.05], [Math.cos(th + 0.1) * tip, Math.sin(th + 0.1) * tip - 0.03], 0.22, Math.cos(th) < 0 ? 0.25 : 0.06, INK, 10 + k);
  }
  // icy highlights: long streaks from the crown sweeping down the left side
  lock([0.05, -0.95], [-0.62, -0.92], [-0.98, -0.12], 0.1, 0.25, ICE, 20);
  lock([0.0, -0.85], [-0.5, -0.66], [-0.72, -0.2], 0.07, 0.22, ICE_DEEP, 21);
  lock([0.12, -1.0], [-0.35, -1.1], [-0.82, -0.75], 0.06, 0.2, ICE, 22);
  // side locks framing the face, down to the jaw
  lock([-0.84, -0.42], [-0.98, 0.0], [-0.88, 0.55], 0.17, 0.22, INK, 23);
  lock([0.84, -0.42], [0.98, 0.0], [0.86, 0.52], 0.17, 0.08, INK, 24);
  lock([-0.84, -0.3], [-0.95, 0.02], [-0.88, 0.36], 0.045, 0.22, ICE, 25);
  // the fringe, three locks poking out under the band, clear of the eyes
  [[-0.5, -0.1], [-0.12, -0.13], [0.3, -0.1]].forEach(([fx, fy], i) =>
    lock([fx + 0.08, -0.5], [fx + 0.03, -0.32], [fx - 0.05, fy], 0.15, 0.04, INK, 30 + i));

  // headband across the brow
  brush(ctx, [[hc[0] - s * 0.98, hc[1] - s * 0.2], [hc[0], hc[1] - s * 0.4], [hc[0] + s * 0.96, hc[1] - s * 0.28]], { width: s * 0.14, color: INK, seed: seed + 6, dry: 0.2, press: 1.1, tail: 0.9 });
  // the curl on top
  brush(ctx, [[hc[0] + s * 0.05, hc[1] - s * 0.98], [hc[0] + s * 0.1, hc[1] - s * 1.32], [hc[0] + s * 0.38, hc[1] - s * 1.38], [hc[0] + s * 0.36, hc[1] - s * 1.18]], { width: s * 0.1, color: INK, seed: seed + 7, dry: 0.4, press: 1.3, tail: 0.3 });

  // ---- the face
  const ex = p.look[0] * s * 0.16, ey = p.look[1] * s * 0.12 + s * 0.05;
  const eye = (cx: number) => {
    const X = hc[0] + cx + ex, Y = hc[1] + ey;
    ctx.fillStyle = INK;
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    if (p.face === 'blink' || p.face === 'grin') {
      ctx.lineWidth = s * 0.07;
      ctx.beginPath();
      if (p.face === 'grin') ctx.arc(X, Y + s * 0.05, s * 0.11, Math.PI * 1.15, Math.PI * 1.85);
      else { ctx.moveTo(X - s * 0.1, Y); ctx.lineTo(X + s * 0.1, Y); }
      ctx.stroke();
      return;
    }
    if (p.face === 'strain') {
      // squeezed shut: > <
      ctx.lineWidth = s * 0.06;
      const k = cx < 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(X - s * 0.1 * k, Y - s * 0.08);
      ctx.lineTo(X + s * 0.08 * k, Y);
      ctx.lineTo(X - s * 0.1 * k, Y + s * 0.08);
      ctx.stroke();
      return;
    }
    const big = p.face === 'wow' ? 1.25 : 1;
    ctx.beginPath();
    ctx.ellipse(X, Y, s * 0.085 * big, s * 0.135 * big, 0, 0, TAU);
    ctx.fill();
    // a blue iris inside the ink rim, deeper at the top
    const ig = ctx.createLinearGradient(0, Y - s * 0.1 * big, 0, Y + s * 0.12 * big);
    ig.addColorStop(0, '#1d3f8f');
    ig.addColorStop(1, IRIS);
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.ellipse(X, Y + s * 0.015 * big, s * 0.062 * big, s * 0.105 * big, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(X, Y + s * 0.02 * big, s * 0.03 * big, s * 0.05 * big, 0, 0, TAU);
    ctx.fill();
    // the catch-light
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.arc(X - s * 0.025, Y - s * 0.05, s * 0.03 * big, 0, TAU);
    ctx.fill();
    if (p.face === 'focus') {
      // brows down
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      const k = cx < 0 ? 1 : -1;
      ctx.moveTo(X - s * 0.12 * k, Y - s * 0.24);
      ctx.lineTo(X + s * 0.1 * k, Y - s * 0.17);
      ctx.stroke();
    }
  };
  eye(-s * 0.3);
  eye(s * 0.3);
  // mouth
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.055;
  ctx.lineCap = 'round';
  const mx = hc[0] + ex * 0.8, my = hc[1] + s * 0.42 + ey * 0.5;
  ctx.beginPath();
  if (p.face === 'wow') {
    ctx.fillStyle = INK;
    ctx.ellipse(mx, my, s * 0.07, s * 0.1, 0, 0, TAU);
    ctx.fill();
  } else if (p.face === 'grin') {
    ctx.fillStyle = INK;
    ctx.arc(mx, my - s * 0.04, s * 0.15, 0.1, Math.PI - 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (p.face === 'strain') {
    ctx.moveTo(mx - s * 0.13, my);
    for (let i = 1; i <= 4; i++) ctx.lineTo(mx - s * 0.13 + i * s * 0.065, my + (i % 2 ? -s * 0.04 : 0));
    ctx.stroke();
  } else if (p.face === 'focus') {
    ctx.moveTo(mx - s * 0.08, my);
    ctx.lineTo(mx + s * 0.08, my);
    ctx.stroke();
  } else {
    ctx.arc(mx, my - s * 0.06, s * 0.08, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }
  ctx.restore();

  // ---- the near arm, over the body
  const hand: Pt = raised ? [0, 0] : limb(ctx, [s * 0.26, shoulder], p.armR, armLen, s * 0.17, seed + 8);
  if (p.prop === 'brush' && !raised) {
    // a brush held out, handle up, wet tip forward
    const a = p.armR - Math.PI / 2 - 0.6;
    const d: Pt = [Math.cos(a), Math.sin(a)];
    const back: Pt = [hand[0] - d[1] * s * 0.55, hand[1] + d[0] * s * 0.55];
    const tipP: Pt = [hand[0] + d[1] * s * 0.5, hand[1] - d[0] * s * 0.5];
    ctx.strokeStyle = '#8a6a44';
    ctx.lineWidth = s * 0.09;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(back[0], back[1]);
    ctx.lineTo(hand[0], hand[1]);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hand[0], hand[1]);
    ctx.lineTo(tipP[0], tipP[1]);
    ctx.stroke();
    brush(ctx, [tipP, [tipP[0] + d[1] * s * 0.14, tipP[1] - d[0] * s * 0.14], [tipP[0] + d[1] * s * 0.32, tipP[1] - d[0] * s * 0.32]], { width: s * 0.12, color: INK, seed: seed + 9, dry: 0.3, press: 1.1, tail: 0.05 });
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(hand[0], hand[1], s * 0.11, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** the Spark: one vermilion dot with a soft glow and a highlight */
export function drawSpark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, squash = 1) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.2);
  g.addColorStop(0, 'rgba(232,67,42,0.35)');
  g.addColorStop(1, 'rgba(232,67,42,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 3.2, 0, TAU);
  ctx.fill();
  ctx.translate(x, y);
  ctx.scale(1 / squash, squash);
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,220,0.85)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.36, r * 0.24, r * 0.16, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}
