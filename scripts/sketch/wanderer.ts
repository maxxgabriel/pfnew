import { brush } from '../../src/core/brush';
import { type Pt, TAU, hash } from '../../src/core/math';
import type { Pose } from './chibi';

/*
 * THE SKETCH, wanderer version (dev study, after the owner's reference).
 *
 * Chibi proportions (the head is about a third of the height), all dry
 * brush: a mop of tapered hair strokes with silver streaks and one antenna
 * strand, a round face, a scarf whose tails stream in the wind, a long coat
 * built from a few broad dry strokes, slim legs and boots. Units are the
 * face radius s; y = 0 is the ground; the figure faces right.
 */

const INK = '#1a1613';
const SILVER = '#b8b2aa';
const PAPER = '#f3eee3';

const P = (x: number, y: number, s: number): Pt => [x * s, y * s];

/** a tapered dry-brush strand from a to b, bowed by `bend` (in s) */
function strand(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, bend: number, w: number, col: string, seed: number, dry = 0.25) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const m: Pt = [(a[0] + b[0]) / 2 - (dy / l) * bend, (a[1] + b[1]) / 2 + (dx / l) * bend];
  brush(ctx, [a, m, b], { width: w, color: col, seed, dry, press: 1.3, tail: 0.03, halo: 0 });
}

function limb(ctx: CanvasRenderingContext2D, from: Pt, ang: number, len: number, w: number, seed: number, end: 'hand' | 'boot') {
  const tip: Pt = [from[0] + Math.sin(ang) * len, from[1] + Math.cos(ang) * len];
  const mid: Pt = [(from[0] + tip[0]) / 2 + Math.cos(ang) * len * 0.06, (from[1] + tip[1]) / 2 - Math.sin(ang) * len * 0.06];
  brush(ctx, [from, mid, tip], { width: w, color: INK, seed, dry: 0.3, press: 1.05, tail: 0.85, halo: 0 });
  ctx.fillStyle = INK;
  ctx.beginPath();
  if (end === 'hand') ctx.arc(tip[0], tip[1], w * 0.55, 0, TAU);
  else {
    // a boot: a rounded toe pointing forward along the ground direction
    const fx = Math.cos(ang), fy = -Math.sin(ang);
    ctx.ellipse(tip[0] + fx * w * 0.35, tip[1] + fy * w * 0.35, w * 0.95, w * 0.6, Math.atan2(fy, fx), 0, TAU);
  }
  ctx.fill();
  return tip;
}

export function drawWanderer(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pose, seed = 1) {
  const sq = p.squash ?? 1;
  const st = p.stream, wv = p.wave;
  const legLen = (p.legLen ?? 0.82) * s, armLen = (p.armLen ?? 0.74) * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 / Math.sqrt(sq), sq);
  // the hips; everything above leans about them
  const hip: Pt = [0, -1.0 * s];
  ctx.translate(hip[0], hip[1]);

  // ---- legs and boots
  limb(ctx, [-0.13 * s, 0], p.legL, legLen, 0.17 * s, seed + 1, 'boot');
  limb(ctx, [0.13 * s, 0], p.legR, legLen, 0.17 * s, seed + 2, 'boot');

  ctx.rotate(p.lean);
  const sh = -0.8 * s; // shoulder line above the hips

  // ---- the scarf's tails, behind everything, streaming back (left) in the wind
  const knot = P(-0.32, sh / s - 0.08, s);
  const tailPts = (len: number, ph: number, drop: number): Pt[] => {
    const pts: Pt[] = [knot];
    for (let i = 1; i <= 6; i++) {
      const u = i / 6;
      const back = len * s * u * (0.3 + 0.7 * st);
      const fall = (1 - st) * len * s * 0.9 * u * u + drop * s * u;
      const w = Math.sin(wv + ph + u * 4) * s * 0.14 * u * (0.3 + st);
      pts.push([knot[0] - back, knot[1] + fall + w + u * s * 0.1]);
    }
    return pts;
  };
  brush(ctx, tailPts(2.1, 0, 0.3), { width: 0.32 * s, color: INK, seed: seed + 3, dry: 0.4, press: 1.1, tail: 0.75, halo: 0 });
  brush(ctx, tailPts(1.7, 1.3, 0.55), { width: 0.26 * s, color: INK, seed: seed + 4, dry: 0.45, press: 1.1, tail: 0.7, halo: 0 });

  // ---- the far arm, behind the coat
  limb(ctx, [-0.27 * s, sh + 0.12 * s], p.armL, armLen, 0.19 * s, seed + 5, 'hand');

  // ---- the coat: an under-fill, then broad dry strokes from the shoulders to the hem
  const hemY = 0.48 * s;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-0.3 * s, sh);
  ctx.quadraticCurveTo(0, sh - 0.06 * s, 0.3 * s, sh);
  ctx.quadraticCurveTo(0.42 * s, -0.2 * s, 0.6 * s - st * 0.05 * s, hemY);
  ctx.quadraticCurveTo(0, hemY + 0.07 * s, -0.62 * s - st * 0.12 * s, hemY + 0.02 * s);
  ctx.quadraticCurveTo(-0.44 * s, -0.2 * s, -0.3 * s, sh);
  ctx.fill();
  // dry strokes down the coat, so its edges and hem break like brushwork
  for (let i = 0; i < 4; i++) {
    const u = i / 3 - 0.5;
    strand(ctx, P(u * 0.5, sh / s + 0.04, s), P(u * 1.15 - st * 0.1, hemY / s + 0.05, s), 0.02 * s, 0.28 * s, INK, seed + 10 + i, 0.3);
  }
  // the coat's opening and collar, drawn in silver
  ctx.strokeStyle = 'rgba(184,178,170,0.55)';
  ctx.lineWidth = Math.max(1, 0.025 * s);
  ctx.beginPath();
  ctx.moveTo(0.1 * s, sh + 0.28 * s);
  ctx.quadraticCurveTo(0.15 * s, 0, 0.12 * s, hemY);
  ctx.moveTo(-0.16 * s, sh + 0.05 * s);
  ctx.lineTo(0.08 * s, sh + 0.3 * s);
  ctx.lineTo(0.26 * s, sh + 0.06 * s);
  ctx.stroke();

  // ---- the head
  ctx.save();
  ctx.translate(0, sh - 0.02 * s);
  ctx.rotate(p.tilt);
  const hc: Pt = [0.04 * s, -0.86 * s]; // face centre above the neck
  const H = (hx: number, hy: number): Pt => [hc[0] + hx * s, hc[1] + hy * s];
  const wind = (pt: Pt, k: number): Pt => [pt[0] - st * k * s, pt[1] + Math.sin(wv + k * 3) * 0.04 * s * st];

  // back hair: long locks behind the face, both sides, swept back by the wind
  const lock = (r: Pt, c: Pt, t: Pt, w: number, k: number, col = INK, dry = 0.25) => {
    const tip = wind(H(t[0], t[1]), k);
    brush(ctx, [H(r[0], r[1]), wind(H(c[0], c[1]), k * 0.5), tip], { width: w * s, color: col, seed: seed + Math.round(r[0] * 97 + r[1] * 31 + t[0] * 13), dry, press: 1.3, tail: 0.03, halo: 0 });
  };
  lock([-0.5, -0.5], [-1.15, -0.1], [-1.2, 0.55], 0.36, 0.35);
  lock([-0.4, -0.6], [-1.2, -0.45], [-1.55, -0.1], 0.3, 0.4);
  lock([0.5, -0.5], [1.0, -0.15], [0.9, 0.55], 0.34, 0.15);
  lock([0.2, -0.7], [0.75, -0.55], [1.2, -0.05], 0.28, 0.2);
  // the face
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(hc[0], hc[1], 0.86 * s, 0, TAU);
  ctx.fill();
  // the cheek and chin line: one brush arc round the bottom
  const chin: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const a = -0.15 + (i / 20) * (Math.PI + 0.25);
    chin.push([hc[0] + Math.cos(a) * 0.86 * s, hc[1] + Math.sin(a) * 0.86 * s * 1.0]);
  }
  brush(ctx, chin, { width: 0.07 * s, color: INK, seed: seed + 30, dry: 0.3, press: 0.9, tail: 0.6, halo: 0 });

  // the face's features (three-quarter: shifted toward where it faces)
  face(ctx, H(0.16 + p.look[0] * 0.12, 0.12 + p.look[1] * 0.1), s, p.face);

  // the mop: a full dark dome down to a ragged brow line, then locks round its edge
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hc[0] - 0.02 * s, hc[1] - 0.08 * s, 0.97 * s, Math.PI * 1.04, Math.PI * 1.96);
  const brow: Pt[] = [[0.92, -0.3], [0.7, -0.02], [0.5, -0.2], [0.3, -0.06], [0.08, -0.22], [-0.15, -0.08], [-0.38, -0.24], [-0.62, 0.0], [-0.9, -0.3]];
  for (const [bx, by] of brow) ctx.lineTo(...H(bx, by));
  ctx.closePath();
  ctx.fill();
  // locks round the dome: rooted inside it, flicking out past its edge
  for (let k = 0; k < 10; k++) {
    const th = ((196 + k * 16) * Math.PI) / 180;
    const rr = 1.28 + hash(seed * 5 + k) * 0.3;
    const r: Pt = [Math.cos(th) * 0.5, Math.sin(th) * 0.5 - 0.12];
    const c: Pt = [Math.cos(th - 0.12) * 0.98, Math.sin(th - 0.12) * 0.98 - 0.12];
    const t: Pt = [Math.cos(th + 0.1) * rr, Math.sin(th + 0.1) * rr * 0.88 - 0.12];
    lock(r, c, t, 0.3 - Math.abs(k - 4.5) * 0.012, 0.12 + (Math.cos(th) < 0 ? 0.15 : 0.02));
  }
  // silver streaks across the upper left
  lock([-0.15, -0.72], [-0.65, -0.82], [-1.15, -0.55], 0.1, 0.2, SILVER, 0.3);
  lock([-0.2, -0.6], [-0.7, -0.6], [-1.05, -0.2], 0.08, 0.2, SILVER, 0.3);
  lock([-0.05, -0.8], [-0.35, -1.05], [-0.75, -1.15], 0.07, 0.15, SILVER, 0.3);
  // the fringe: locks from the crown over the brow
  const crown: Pt = [-0.05, -0.78];
  const fringe: [Pt, Pt][] = [
    [[-0.55, -0.55], [-0.7, 0.12]], [[-0.3, -0.5], [-0.32, -0.02]], [[0.0, -0.55], [0.06, -0.06]],
    [[0.32, -0.55], [0.4, -0.02]], [[0.6, -0.5], [0.72, 0.1]],
  ];
  fringe.forEach(([c, t], i) => lock(crown, c, t, 0.24 - i * 0.01, 0.06));
  lock([-0.3, -0.7], [-0.5, -0.4], [-0.55, -0.1], 0.07, 0.06, SILVER, 0.3);
  // the antenna strand
  const top = H(-0.02, -1.25);
  brush(ctx, [H(-0.06, -0.9), H(-0.08, -1.25), [top[0] + 0.3 * s - st * 0.2 * s, top[1] - 0.25 * s], [top[0] + 0.48 * s - st * 0.3 * s, top[1] - 0.05 * s]], { width: 0.08 * s, color: INK, seed: seed + 80, dry: 0.4, press: 1.2, tail: 0.05, halo: 0 });
  ctx.restore();

  // ---- the scarf wrapped round the neck, and its knot, over the collar
  brush(ctx, [P(-0.38, sh / s - 0.02, s), P(0, sh / s + 0.1, s), P(0.38, sh / s - 0.05, s)], { width: 0.3 * s, color: INK, seed: seed + 90, dry: 0.25, press: 1.1, tail: 0.8, halo: 0 });
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(knot[0], knot[1] + 0.04 * s, 0.17 * s, 0, TAU);
  ctx.fill();

  // ---- the near arm
  const hand = limb(ctx, [0.27 * s, sh + 0.12 * s], p.armR, armLen, 0.19 * s, seed + 6, 'hand');
  if (p.prop === 'brush') {
    const a = p.armR - Math.PI / 2 - 0.6;
    const d: Pt = [Math.cos(a), Math.sin(a)];
    const tipP: Pt = [hand[0] + d[1] * s * 0.55, hand[1] - d[0] * s * 0.55];
    const butt: Pt = [hand[0] - d[1] * s * 0.45, hand[1] + d[0] * s * 0.45];
    ctx.strokeStyle = '#8a6a44';
    ctx.lineWidth = 0.08 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(butt[0], butt[1]);
    ctx.lineTo(tipP[0], tipP[1]);
    ctx.stroke();
    brush(ctx, [tipP, [tipP[0] + d[1] * s * 0.16, tipP[1] - d[0] * s * 0.16], [tipP[0] + d[1] * s * 0.34, tipP[1] - d[0] * s * 0.34]], { width: 0.13 * s, color: INK, seed: seed + 91, dry: 0.3, press: 1.1, tail: 0.05, halo: 0 });
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(hand[0], hand[1], 0.14 * s, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function face(ctx: CanvasRenderingContext2D, c: Pt, s: number, f: Pose['face']) {
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const eyes: Pt[] = [[c[0] - 0.3 * s, c[1]], [c[0] + 0.22 * s, c[1] - 0.01 * s]];
  eyes.forEach(([ex, ey], i) => {
    const k = i ? 0.92 : 1; // the far eye a touch smaller
    ctx.lineWidth = 0.045 * s;
    if (f === 'blink' || f === 'grin') {
      ctx.beginPath();
      if (f === 'grin') ctx.arc(ex, ey + 0.06 * s, 0.1 * s * k, Math.PI * 1.15, Math.PI * 1.85);
      else { ctx.moveTo(ex - 0.09 * s, ey + 0.02 * s); ctx.quadraticCurveTo(ex, ey + 0.07 * s, ex + 0.09 * s, ey + 0.02 * s); }
      ctx.stroke();
      return;
    }
    if (f === 'strain') {
      const d = i ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(ex - 0.09 * s * d, ey - 0.07 * s);
      ctx.lineTo(ex + 0.07 * s * d, ey);
      ctx.lineTo(ex - 0.09 * s * d, ey + 0.07 * s);
      ctx.stroke();
      return;
    }
    const big = f === 'wow' ? 1.2 : 1;
    // almond eye with a lid line, like a brush flick
    ctx.beginPath();
    ctx.ellipse(ex, ey, 0.065 * s * k * big, 0.11 * s * k * big, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 0.04 * s;
    ctx.beginPath();
    ctx.moveTo(ex - 0.1 * s * k, ey - 0.08 * s);
    ctx.quadraticCurveTo(ex, ey - 0.15 * s * big, ex + 0.11 * s * k, ey - 0.09 * s);
    ctx.stroke();
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.arc(ex - 0.02 * s, ey - 0.04 * s, 0.022 * s * big, 0, TAU);
    ctx.fill();
    ctx.fillStyle = INK;
    if (f === 'focus') {
      ctx.lineWidth = 0.045 * s;
      ctx.beginPath();
      ctx.moveTo(ex - 0.1 * s, ey - 0.2 * s + (i ? -0.03 : 0.03) * s);
      ctx.lineTo(ex + 0.1 * s, ey - 0.2 * s + (i ? 0.03 : -0.03) * s);
      ctx.stroke();
    }
  });
  // the mouth
  const m: Pt = [c[0] - 0.02 * s, c[1] + 0.36 * s];
  ctx.lineWidth = 0.04 * s;
  ctx.beginPath();
  if (f === 'wow') { ctx.ellipse(m[0], m[1], 0.05 * s, 0.07 * s, 0, 0, TAU); ctx.fill(); }
  else if (f === 'grin') { ctx.arc(m[0], m[1] - 0.04 * s, 0.11 * s, 0.15, Math.PI - 0.15); ctx.closePath(); ctx.fill(); }
  else if (f === 'strain') { ctx.moveTo(m[0] - 0.1 * s, m[1]); for (let i = 1; i <= 4; i++) ctx.lineTo(m[0] - 0.1 * s + i * 0.05 * s, m[1] + (i % 2 ? -0.03 : 0) * s); ctx.stroke(); }
  else if (f === 'focus') { ctx.moveTo(m[0] - 0.06 * s, m[1]); ctx.lineTo(m[0] + 0.06 * s, m[1] - 0.01 * s); ctx.stroke(); }
  else { ctx.moveTo(m[0] - 0.08 * s, m[1] - 0.02 * s); ctx.quadraticCurveTo(m[0], m[1] + 0.05 * s, m[0] + 0.09 * s, m[1] - 0.04 * s); ctx.stroke(); }
}
