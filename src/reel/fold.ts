import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, hash, lerp, rng, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { drawInk } from './ink';
import { drawBg, drawBgXY } from '../sketch/bg';
import { PIG, mixHex } from './painting';
import { type Cam3, type Tri, type V3, add, cross, drawTris, lerp3, lookAt, norm, project, rotAbout, rotX, rotY, rotZ, sub } from './v3';

/*
 * II · FOLD.
 *
 * The finished scroll lets go of its painting: the paper closes in to a
 * square on a dusk sky and the ink washes off it. The square tilts back and
 * lies flat; its crease pattern draws itself (blue valleys, green
 * mountains). Then it folds — two true rigid folds, so the vermilion back of
 * the paper turns over into view — snaps open into a bird base, and the
 * crane rises out of it: neck and tail up, head bent, wings open, all
 * flat-shaded facets catching the last light. It lifts off and flies over a
 * landscape of paper whose hills, trees and houses fold up out of the ground
 * as it passes. Night falls; the camera lets it go, and it flies on into the
 * dark until it is one warm point (chapter III's bulb).
 */

/** local beats */
export const FD = {
  tilt: [0, 0.55] as const,
  creases: [0.45, 1.25] as const,
  fold1: [1.3, 2.0] as const,
  fold2: [2.1, 2.75] as const,
  snap: [2.75, 2.95] as const,
  rise: [2.95, 3.5] as const,
  head: [3.35, 3.7] as const,
  wings: [3.55, 4.05] as const,
  turn: [4.05, 4.6] as const,
  fly: 4.5,
  night: [4.7, 5.8] as const,
  /** the camera slows and lets the crane fly on alone */
  away: [5.8, 6.5] as const,
  dark: [6.1, 6.7] as const,
  end: 6.8,
};

/** the opening (chapter beats before FD's): the scroll becomes the square */
export const PRE = 1.2;

const H = 100; // half the sheet, world units
const PAPER = '#f3eee3';
const BACK = '#c8432f';

/* ------------------------------------------------------------ the sky */

/** the square of paper, on screen: the scroll shrinks into exactly this */
export function sheetRect(w: number, h: number) {
  const S = Math.min(w, h);
  return { cx: w / 2, cy: h * 0.45, side: S * 0.62 };
}

let reeds: { x: number; h: number; ph: number }[] = [];

export function drawSky(f: Frame) {
  const { ctx, w, h, t } = f;
  const S = Math.min(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#222b4a');
  g.addColorStop(0.42, '#6b5878');
  g.addColorStop(0.7, '#d4956f');
  g.addColorStop(0.85, '#f0c48f');
  g.addColorStop(1, '#f5d9ab');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // the sun, low and soft
  const sx = w * 0.7, sy = h * 0.81;
  ctx.save();
  ctx.globalAlpha = 0.55;
  drawSprite(ctx, glow('#ffe7b8', 128), sx, sy, S * 1.1);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff3da';
  ctx.beginPath();
  ctx.arc(sx, sy, S * 0.055, 0, TAU);
  ctx.fill();
  ctx.restore();
  // far hills, nearer hills, water
  const hy = h * 0.86;
  for (const [col, amp, seed, off] of [['rgba(92,74,96,0.55)', 0.05, 3, 0.012], ['rgba(54,42,62,0.85)', 0.03, 7, 0.0]] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= 40; i++) {
      const x = (i / 40) * w;
      const y = hy - off * h - amp * h * (0.5 + 0.5 * Math.sin(i * 0.55 + seed) * Math.sin(i * 0.23 + seed * 2));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  const wg = ctx.createLinearGradient(0, hy, 0, h);
  wg.addColorStop(0, '#e9b98a');
  wg.addColorStop(1, '#4a3a4e');
  ctx.fillStyle = wg;
  ctx.fillRect(0, hy, w, h - hy);
  // the sun's path on the water
  ctx.fillStyle = 'rgba(255,240,210,0.6)';
  for (let i = 0; i < 9; i++) {
    const y = hy + 4 + i * (h - hy) / 10;
    const ww = S * (0.05 + i * 0.012) * (0.7 + 0.3 * Math.sin(t * 2 + i));
    ctx.fillRect(sx - ww / 2 + Math.sin(t * 1.3 + i) * 3, y, ww, 1.5);
  }
  // reeds in the foreground, in the wind
  if (reeds.length === 0) {
    const r = rng(9);
    // two clumps at the sides; the middle stays open for the sun on the water
    reeds = Array.from({ length: 22 }, (_, i) => {
      const side = i % 2 ? r() * 0.3 : 0.72 + r() * 0.3;
      return { x: side, h: 0.03 + r() ** 1.6 * 0.12, ph: r() * TAU };
    });
  }
  ctx.strokeStyle = '#1d1720';
  ctx.lineCap = 'round';
  for (const rd of reeds) {
    const x = rd.x * w, top = h - rd.h * h * 1.4;
    const sway = Math.sin(t * 1.1 + rd.ph) * S * 0.012 + Math.sin(t * 2.7 + rd.ph * 2) * S * 0.004;
    ctx.lineWidth = Math.max(1, S * 0.004);
    ctx.beginPath();
    ctx.moveTo(x, h + 4);
    ctx.quadraticCurveTo(x + sway * 0.3, (h + top) / 2, x + sway, top);
    ctx.stroke();
    if (rd.h > 0.1) {
      ctx.lineWidth = Math.max(2, S * 0.01);
      ctx.beginPath();
      ctx.moveTo(x + sway, top);
      ctx.lineTo(x + sway * 1.05, top + S * 0.03);
      ctx.stroke();
    }
  }
}

/* ------------------------------------------------------------ the sheet */

// the sheet as a fan of 8 triangles round its centre: both diagonals are edges,
// so each fold line runs between triangles and every triangle folds whole
const O: Pt = [0, 0];
const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as Pt[];
const MID = [[0, -1], [1, 0], [0, 1], [-1, 0]] as Pt[];
const FAN: [Pt, Pt, Pt][] = [
  [O, C[0], MID[0]], [O, MID[0], C[1]], [O, C[1], MID[1]], [O, MID[1], C[2]],
  [O, C[2], MID[2]], [O, MID[2], C[3]], [O, C[3], MID[3]], [O, MID[3], C[0]],
];

/** the sheet's local (u, v) on the tilting plane */
function onSheet(u: number, v: number, tilt: number): V3 {
  return rotX([u * H, v * H, 0], -tilt * Math.PI / 2);
}

function sheetTris(L: number): Tri[] {
  const tilt = ease.inOut3(seg(L, FD.tilt[0], FD.tilt[1]));
  const k1 = ease.inOut3(seg(L, FD.fold1[0], FD.fold1[1]));
  const k2 = ease.inOut3(seg(L, FD.fold2[0], FD.fold2[1]));
  const W = (p: Pt) => onSheet(p[0], p[1], tilt);
  // fold 1: the half beyond the diagonal C3–C1 turns over onto the other
  const a1 = W(C[3]), d1 = norm(sub(W(C[1]), a1));
  // fold 2: then the half beyond the diagonal C0–C2 turns over too
  const a2 = W(C[0]), d2 = norm(sub(W(C[2]), a2));
  const lift = (p: V3, n: V3, by: number): V3 => add(p, [n[0] * by, n[1] * by, n[2] * by]);
  const up: V3 = [0, 1, 0];
  const out: Tri[] = [];
  FAN.forEach((tri, i) => {
    const moves1 = tri.some(([u, v]) => u + v > 0.01);
    // where it lies once fold 1 is done (mirror across u + v = 0)
    const flat1 = tri.map(([u, v]) => (moves1 ? [-v, -u] : [u, v]) as Pt);
    const moves2 = flat1.some(([u, v]) => v < u - 0.01);
    const pts = tri.map((p) => {
      let q = W(p);
      // the turning half lifts toward the viewer as it goes over
      if (moves1) q = lift(rotAbout(q, a1, d1, -Math.PI * k1), up, 1.5 * k1);
      if (moves2) q = lift(rotAbout(q, a2, d2, Math.PI * k2), up, 3 * k2);
      return q;
    }) as [V3, V3, V3];
    out.push({ p: pts, front: PAPER, back: BACK, edge: i % 2 ? undefined : undefined });
  });
  return out;
}

/** crease lines drawing themselves on the flat sheet */
function drawCreases(ctx: CanvasRenderingContext2D, cam: Cam3, L: number) {
  const k = seg(L, FD.creases[0], FD.creases[1]);
  const fade = 1 - seg(L, FD.fold1[0] - 0.05, FD.fold1[0] + 0.15);
  if (k <= 0 || fade <= 0) return;
  const lines: [Pt, Pt, string][] = [
    [C[0], C[2], '#2346d6'], [C[3], C[1], '#2346d6'],
    [MID[3], MID[1], '#16936a'], [MID[0], MID[2], '#16936a'],
  ];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = fade;
  lines.forEach(([a, b, col], i) => {
    const p = ease.inOut2(seg(k, i * 0.18, i * 0.18 + 0.45));
    if (p <= 0) return;
    const A = project(cam, onSheet(a[0], a[1], 1)), Bp = project(cam, onSheet(lerp(a[0], b[0], p), lerp(a[1], b[1], p), 1));
    if (!A || !Bp) return;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    if (i < 2) ctx.setLineDash([9, 6]);
    else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(Bp[0], Bp[1]);
    ctx.stroke();
    // the pen's point, travelling
    if (p < 1) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(Bp[0], Bp[1], 3.5, 0, TAU);
      ctx.fill();
    }
  });
  ctx.restore();
}

/* ------------------------------------------------------------ the crane */

// vertex names → [bird base, final crane]; the crane faces +x, y up, wings along ±z
const V: Record<string, [V3, V3]> = {
  // the bird base is a tall, thin diamond; the neck and tail flaps hang below, the wings stand above
  F: [[22, 0, 0], [40, 5, 0]],
  K: [[-22, 0, 0], [-40, 5, 0]],
  Bt: [[0, -55, 0], [0, -22, 0]],
  Tp: [[0, 55, 0], [0, 18, 0]],
  Lb: [[0, 0, -6], [0, 0, -14]],
  Rb: [[0, 0, 6], [0, 0, 14]],
  NL: [[12, -25, -3], [50, 12, -5]],
  NR: [[12, -25, 3], [50, 12, 5]],
  N: [[6, -82, 0], [95, 72, 0]],
  HL: [[8, -72, -2], [101, 66, -3]],
  HR: [[8, -72, 2], [101, 66, 3]],
  Ht: [[4, -92, 0], [114, 52, 0]],
  TL: [[-12, -25, -3], [-55, 12, -5]],
  TR: [[-12, -25, 3], [-55, 12, 5]],
  T: [[-6, -82, 0], [-102, 64, 0]],
  WF: [[10, 15, 0], [20, 17, 0]],
  WB: [[-10, 15, 0], [-20, 17, 0]],
  WLf: [[3, 48, -1], [10, 76, -112]],
  WLb: [[-3, 48, -1], [-42, 62, -92]],
  WRf: [[3, 48, 1], [10, 76, 112]],
  WRb: [[-3, 48, 1], [-42, 62, 92]],
};
export const FACES: [string, string, string][] = [
  ['F', 'Tp', 'Lb'], ['Tp', 'K', 'Lb'], ['F', 'Lb', 'Bt'], ['K', 'Bt', 'Lb'],
  ['F', 'Rb', 'Tp'], ['Tp', 'Rb', 'K'], ['F', 'Bt', 'Rb'], ['K', 'Rb', 'Bt'],
  ['F', 'N', 'NL'], ['F', 'NR', 'N'], ['N', 'HL', 'Ht'], ['N', 'Ht', 'HR'],
  ['K', 'TL', 'T'], ['K', 'T', 'TR'],
  ['WF', 'WB', 'WLb'], ['WF', 'WLb', 'WLf'], ['WF', 'WRb', 'WB'], ['WF', 'WRf', 'WRb'],
];
const NECK = new Set(['NL', 'NR', 'N', 'TL', 'TR', 'T', 'F', 'K', 'Bt', 'Tp', 'Lb', 'Rb']);
const HEAD = new Set(['HL', 'HR', 'Ht']);
const WING = new Set(['WF', 'WB', 'WLf', 'WLb', 'WRf', 'WRb']);
// the head, before it bends: straight on from the neck
const HEAD_STRAIGHT: Record<string, V3> = { HL: [104, 84, -3], HR: [104, 84, 3], Ht: [112, 96, 0] };

/** the crane's vertices in its own frame at local beat L, with the wings flapping by `flap` */
export function craneShape(L: number, flap: number): Record<string, V3> {
  const kr = ease.outBack(seg(L, FD.rise[0], FD.rise[1]), 1.3);
  const kh = ease.inOut3(seg(L, FD.head[0], FD.head[1]));
  const kw = ease.outBack(seg(L, FD.wings[0], FD.wings[1]), 1.2);
  const out: Record<string, V3> = {};
  for (const [n, [b, c]] of Object.entries(V)) {
    let p: V3;
    if (HEAD.has(n)) {
      const straight = lerp3(b, HEAD_STRAIGHT[n], kr);
      p = lerp3(straight, c, kh);
    } else if (WING.has(n)) {
      // the wings swing open in an arc rather than sliding
      p = lerp3(b, c, kw);
      p[1] += Math.sin(clamp(kw) * Math.PI) * 24;
    } else p = lerp3(b, c, NECK.has(n) ? kr : 1);
    out[n] = p;
  }
  if (flap) {
    // the wingtips turn about the ridge
    for (const [n, sgn] of [['WLf', -1], ['WLb', -1], ['WRf', 1], ['WRb', 1]] as const) {
      out[n] = rotAbout(out[n], [0, 17, 0], [1, 0, 0], sgn * flap);
    }
  }
  return out;
}

export function craneTris(verts: Record<string, V3>, place: (p: V3) => V3, tint = 0): Tri[] {
  // folded from the red side of the paper: the outside is vermilion, the inside paper
  const col = mixHex(BACK, '#8a2f3a', tint);
  const back = mixHex('#a8382a', '#6a2633', tint);
  return FACES.map(([a, b, c]) => ({ p: [place(verts[a]), place(verts[b]), place(verts[c])], front: col.startsWith('rgb') ? toHex(col) : col, back: toHex(back), edge: undefined }));
}
const toHex = (rgbStr: string) => {
  const m = rgbStr.match(/\d+/g);
  if (!m) return rgbStr;
  return '#' + m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join('');
};

/* ------------------------------------------------------- the paper world */

interface Pop { x: number; z: number; w: number; h: number; kind: 0 | 1 | 2; shade: number }
const POPS: Pop[] = (() => {
  const r = rng(808);
  const out: Pop[] = [];
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1;
    const kind = (r() < 0.38 ? 0 : r() < 0.6 ? 1 : 2) as 0 | 1 | 2;
    const z = -350 - i * 95 - r() * 60;
    const x = side * ((kind === 0 ? 420 : 230) + r() * 480);
    const w = kind === 0 ? 180 + r() * 200 : kind === 1 ? 50 + r() * 30 : 70 + r() * 50;
    const hh = kind === 0 ? 150 + r() * 220 : kind === 1 ? 110 + r() * 80 : 60 + r() * 30;
    out.push({ x, z, w, h: hh, kind, shade: 0.85 + r() * 0.15 });
  }
  return out;
})();

/** the crane's flight: where it is (world) at local beat L */
function flightZ(L: number) {
  const k = Math.max(0, L - FD.fly);
  return -k * 820 - k * k * 90;
}

function popTris(zc: number, night: number): Tri[] {
  const out: Tri[] = [];
  for (const p of POPS) {
    const ahead = zc - p.z; // positive once it is in front of the crane
    const k = ease.outBack(clamp((1250 - ahead) / 320), 1.5);
    if (k <= 0) continue;
    const ang = (Math.PI / 2) * (1 - k);
    const up = (v: V3): V3 => rotAbout(v, [0, 0, p.z], [1, 0, 0], ang);
    const col = mixHex('#f1ebde', '#2a3150', night * 0.7);
    const c = toHex(col);
    const x0 = p.x - p.w / 2, x1 = p.x + p.w / 2;
    if (p.kind === 0) {
      // a hill: two folded panels
      out.push({ p: [up([x0, 0, p.z]), up([p.x - p.w * 0.1, p.h, p.z]), up([p.x, 0, p.z])], front: c, dim: p.shade });
      out.push({ p: [up([p.x, 0, p.z]), up([p.x - p.w * 0.1, p.h, p.z]), up([x1, 0, p.z])], front: c, dim: p.shade * 0.86 });
    } else if (p.kind === 1) {
      // a tree: a tall cut triangle on a stalk
      out.push({ p: [up([x0, p.h * 0.18, p.z]), up([p.x, p.h, p.z]), up([x1, p.h * 0.18, p.z])], front: c, dim: p.shade * 0.92 });
      out.push({ p: [up([p.x - 5, 0, p.z]), up([p.x - 5, p.h * 0.2, p.z]), up([p.x + 5, 0, p.z])], front: c, dim: 0.7 });
    } else {
      // a house: a wall and a roof
      const wh = p.h * 0.62;
      out.push({ p: [up([x0, 0, p.z]), up([x0, wh, p.z]), up([x1, wh, p.z])], front: c, dim: p.shade });
      out.push({ p: [up([x0, 0, p.z]), up([x1, wh, p.z]), up([x1, 0, p.z])], front: c, dim: p.shade });
      out.push({ p: [up([x0 - 8, wh, p.z]), up([p.x, p.h, p.z]), up([x1 + 8, wh, p.z])], front: c, dim: p.shade * 0.8 });
    }
  }
  return out;
}

/** lit windows on the houses once night comes */
function drawWindows(ctx: CanvasRenderingContext2D, cam: Cam3, zc: number, night: number, t: number) {
  if (night < 0.25) return;
  ctx.save();
  for (const [i, p] of POPS.entries()) {
    if (p.kind !== 2) continue;
    const ahead = zc - p.z;
    if (clamp((1250 - ahead) / 320) < 1) continue;
    const on = seg(night, 0.25 + hash(i) * 0.4, 0.35 + hash(i) * 0.4);
    if (on <= 0) continue;
    for (let k = 0; k < 2; k++) {
      const x = p.x + (k ? 0.18 : -0.18) * p.w;
      const q = project(cam, [x, p.h * 0.32, p.z + 1]);
      if (!q) continue;
      const s = (p.w * 0.12 * cam.f) / q[2];
      const fl = 0.85 + 0.15 * Math.sin(t * 7 + i * 3 + k);
      ctx.globalAlpha = on * fl;
      ctx.fillStyle = '#ffd98a';
      ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s * 1.2);
      ctx.globalAlpha = on * 0.35;
      drawSprite(ctx, glow('#ffb84a', 64), q[0], q[1], s * 6);
    }
  }
  ctx.restore();
}

export function drawGround(ctx: CanvasRenderingContext2D, cam: Cam3, w: number, h: number, a: number, night: number, zc: number) {
  if (a <= 0) return;
  const far = project(cam, [cam.pos[0], 0, cam.pos[2] - 1e6]);
  const hy = far ? far[1] : h * 0.4;
  ctx.save();
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, hy, 0, h);
  g.addColorStop(0, mixHex('#e7dccb', '#1a1d33', night));
  g.addColorStop(1, mixHex('#f4eee2', '#2a2f4a', night));
  ctx.fillStyle = g;
  ctx.fillRect(0, hy, w, h - hy);
  // the paper's fold lines run off to the horizon
  ctx.strokeStyle = mixHex('#cbbfab', '#3a4166', night);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -10; i <= 10; i++) {
    const A = project(cam, [i * 220, 0, cam.pos[2] - 60]), Bq = project(cam, [i * 220, 0, cam.pos[2] - 6000]);
    if (A && Bq) { ctx.moveTo(A[0], A[1]); ctx.lineTo(Bq[0], Bq[1]); }
  }
  const z0 = Math.floor(zc / 300) * 300;
  for (let j = 0; j < 16; j++) {
    const z = z0 - j * 300 + 600;
    const A = project(cam, [-3000, 0, z]), Bq = project(cam, [3000, 0, z]);
    if (A && Bq) { ctx.moveTo(A[0], A[1]); ctx.lineTo(Bq[0], Bq[1]); }
  }
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------ the night */

/** night falls over the dusk: the ink-wash night painting (no field of stars: the owner dislikes clusters of small things) */
export function drawNight(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, a: number) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  if (!drawBg(ctx, 'bg_night', w, h, 0.15)) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#05060f');
    g.addColorStop(0.6, '#10142a');
    g.addColorStop(1, '#1d1b38');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
  void t;
}

/* ---------------------------------------------------------- the chapter */

// camera keys while the paper folds: [beat, pos, look-at]
const CAM: [number, V3, V3][] = [
  [0, [0, 0, 600], [0, 0, 0]],
  [0.55, [0, 430, 330], [0, 0, 0]],
  [1.3, [70, 400, 320], [0, 0, 0]],
  [2.2, [-90, 360, 320], [0, 0, 0]],
  [2.9, [0, 260, 360], [0, 20, 0]],
  [3.3, [60, 90, 560], [10, 30, 0]],
  [3.8, [260, 140, 470], [10, 40, 0]],
  [4.05, [320, 110, 420], [0, 45, 0]],
];

function camAt(L: number): [V3, V3] {
  let i = 0;
  while (i < CAM.length - 2 && CAM[i + 1][0] <= L) i++;
  const a = CAM[i], b = CAM[i + 1];
  const k = ease.inOutSine(clamp((L - a[0]) / (b[0] - a[0])));
  return [lerp3(a[1], b[1], k), lerp3(a[2], b[2], k)];
}

/** the crane's place in the world at local beat L */
export function cranePose(L: number, t: number) {
  const zc = flightZ(L);
  const turn = ease.inOut3(seg(L, FD.turn[0], FD.turn[1]));
  const lift = ease.inOut2(seg(L, FD.turn[0] + 0.15, FD.fly + 0.5));
  const alt = 30 + lift * 150 + (L > FD.fly ? Math.sin(t * 2.2) * 10 : 0);
  const bank = L > FD.fly ? Math.sin(L * 2.1) * 0.22 : 0;
  // flapping: one deep stroke at take-off, then a steady beat
  const flap = L < FD.turn[0] ? 0 : Math.sin((L - FD.turn[0]) * 9 + t * 4) * (0.25 + 0.4 * lift);
  return { zc, turn, alt, bank, flap };
}

export function placeCrane(L: number, t: number) {
  const { zc, turn, alt, bank } = cranePose(L, t);
  return (p: V3): V3 => add(rotY(rotZ(rotX(p, bank), turn * 0.15), turn * (Math.PI / 2)), [0, alt, zc]);
}

/** the camera's own beat once it lets the crane go: it slows to a stop over FD.away */
function camBeat(L: number) {
  const A = FD.away[0], D = FD.away[1] - A;
  if (L < A) return L;
  const u = clamp((L - A) / D);
  return A + D * (u - (u * u) / 2);
}

/** the scroll lets go of its painting: the paper closes in to the square and the ink washes off */
function drawLetGo(f: Frame, L: number) {
  const { ctx, w, h } = f;
  const S = Math.min(w, h);
  const sr = sheetRect(w, h);
  const k = ease.inOut3(seg(L, 0.05, 1.05));
  const wash = ease.inOut2(seg(L, 0.35, 1.0));
  drawSky(f);
  const x0 = lerp(0, sr.cx - sr.side / 2, k), x1 = lerp(w, sr.cx + sr.side / 2, k);
  const y0 = lerp(0, sr.cy - sr.side / 2, k), y1 = lerp(h, sr.cy + sr.side / 2, k);
  // its shadow on the evening light, as it comes free of the wall
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(40,24,30,0.18)';
  ctx.fillRect(x0 + S * 0.012, y0 + S * 0.02, x1 - x0, y1 - y0);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  // the scroll's last frame rides inside the paper, cropped as it closes in
  const sc = (x1 - x0) / w;
  ctx.translate((x0 + x1) / 2, (y0 + y1) / 2);
  ctx.scale(sc, sc);
  ctx.translate(-w / 2, -sr.cy);
  drawInk({ ...f, B: f.B - L, crossed: () => false, crossedFwd: () => false });
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = wash;
  ctx.fillStyle = mixHex(PIG.sheet, PAPER, k);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}

export function drawFold(f: Frame, L: number) {
  if (L < PRE) drawLetGo(f, L);
  else drawFolding(f, L - PRE);
}

/** where a rider sits, on screen, as of the last frame drawn: the sheet's centre, then the crane's back; k = pixels per world unit */
export const foldAnchor = { x: 0, y: 0, k: 1, on: 'sheet' as 'sheet' | 'crane' };

/** THE SKETCH flies the crane over the painted sea instead of the paper countryside */
let sketchSea = false;
export const setSketchSea = (on: boolean) => { sketchSea = on; };

export function drawFolding(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const sr = sheetRect(w, h);
  const night = ease.inOut2(seg(L, FD.night[0], FD.night[1]));

  // ---- the sky: the same dusk, then night falls
  drawSky(f);
  drawNight(ctx, w, h, t, night);
  // ---- (THE SKETCH) after take-off the paper countryside gives way to the painted night sea he will fall into
  const painted = sketchSea ? ease.inOut2(seg(L, FD.turn[0] + 0.2, FD.fly + 0.6)) : 0;
  if (painted > 0) drawBgXY(ctx, 'bg_inksea', w, h, lerp(0.0, 0.05, seg(L, FD.fly, FD.end)), 0, painted, 1.35);

  // ---- the camera: over the paper while it folds, then behind the crane
  const pose = cranePose(L, t);
  const fl = (sr.side * 600) / (2 * H);
  let pos: V3, at: V3;
  if (L < FD.turn[0]) [pos, at] = camAt(L);
  else {
    const k = ease.inOut3(seg(L, FD.turn[0], FD.fly + 0.4));
    const [p0, a0] = camAt(FD.turn[0]);
    // the camera rides behind the crane, then slows and lets it fly on
    const cz = flightZ(camBeat(L));
    const follow: V3 = [150, pose.alt + 120, cz + 520];
    // aimed so the crane sits in the middle of the frame
    const look: V3 = [-90, pose.alt - 10, cz - 300];
    pos = lerp3(p0, follow, k);
    at = lerp3(a0, look, k);
  }
  const roll = L > FD.fly ? -pose.bank * 0.4 : 0;
  let cam = lookAt(pos, at, fl, sr.cx, sr.cy, roll);
  // as it flies off, the frame drifts so the crane ends dead centre, where chapter III's bulb hangs
  const centre = ease.inOut2(seg(L, FD.away[0] + 0.3, FD.dark[1]));
  const birdAt: V3 = [0, pose.alt, pose.zc];
  if (centre > 0) {
    const c = project(cam, birdAt);
    if (c) cam = lookAt(pos, at, fl, sr.cx + (sr.cx - c[0]) * centre, sr.cy + (sr.cy - c[1]) * centre, roll);
  }

  // the paper ground unrolls under the take-off
  drawGround(ctx, cam, w, h, seg(L, FD.turn[0], FD.fly + 0.3) * (1 - painted), night, pose.zc);

  const tris: Tri[] = [];
  if (L < FD.snap[0] + (FD.snap[1] - FD.snap[0]) * 0.5) {
    // the sheet, and the snap: it spins as it opens, so the change of shape hides in the motion
    const sp = seg(L, FD.snap[0], FD.snap[1]);
    const spin = ease.in2(sp * 2) * Math.PI * 0.5;
    for (const tr of sheetTris(L)) tris.push({ ...tr, p: tr.p.map((p) => rotY(p, spin)) as [V3, V3, V3] });
  } else {
    const sp = seg(L, FD.snap[0], FD.snap[1]);
    const spin = L < FD.snap[1] ? Math.PI * 0.5 + ease.out2((sp - 0.5) * 2) * Math.PI * 0.5 : Math.PI;
    const verts = craneShape(L, pose.flap);
    const place = L < FD.turn[0]
      ? (p: V3): V3 => add(rotY(p, spin - Math.PI), [0, 30, 0])
      : placeCrane(L, t);
    tris.push(...craneTris(verts, place, night * 0.35));
  }
  if (L > FD.turn[0] && !sketchSea) tris.push(...popTris(pose.zc, night));
  // facing the viewer the sheet is exactly the square the scroll became; the light comes in as it tilts
  drawTris(ctx, cam, tris, lerp(1, 0.6, ease.inOut2(seg(L, FD.tilt[0], FD.tilt[1]))));
  if (L < FD.fold1[0] + 0.2) drawCreases(ctx, cam, L);
  {
    const onCrane = L >= FD.snap[1];
    const at: V3 = !onCrane ? [0, 2, 0] : L < FD.turn[0] ? [0, 62, 0] : [0, pose.alt + 30, pose.zc];
    const a = project(cam, at), b = project(cam, [at[0] + 50, at[1], at[2]]);
    if (a && b) Object.assign(foldAnchor, { x: a[0], y: a[1], k: Math.hypot(b[0] - a[0], b[1] - a[1]) / 50, on: onCrane ? 'crane' : 'sheet' });
  }
  if (!sketchSea) drawWindows(ctx, cam, pose.zc, night, t);

  // the snap's whoosh: a few air lines round the paper
  const sp = seg(L, FD.snap[0] - 0.05, FD.snap[1] + 0.05);
  if (sp > 0 && sp < 1) {
    const c = project(cam, [0, 20, 0]);
    if (c) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,248,235,0.8)';
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + sp * 3, r0 = 60 + sp * 80, r1 = r0 + 40;
        ctx.globalAlpha = Math.sin(sp * Math.PI);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c[0], c[1], (r0 + r1) / 2, a, a + 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ---- the dark: everything goes but the crane, a warm point of paper in the night
  const dark = sketchSea ? 0 : ease.inOut2(seg(L, FD.dark[0], FD.dark[1]));
  if (dark > 0) {
    ctx.save();
    ctx.globalAlpha = dark;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const c = project(cam, birdAt);
    if (c) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = dark * 0.35;
      drawSprite(ctx, glow('#ffcf7a', 64), c[0], c[1], 70);
      ctx.globalAlpha = dark;
      drawSprite(ctx, glow('#fff4dc', 32), c[0], c[1], 10);
    }
    ctx.restore();
  }
  void cross;
}
