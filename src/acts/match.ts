import type { Frame } from '../core/frame';
import { type Pt, TAU, bell, clamp, ease, hash, lerp, rng, seg } from '../core/math';
import { CONFETTI, Particles } from '../core/particles';
import { drawSprite, glow, withAlpha } from '../core/sprites';
import { C, F, extruded, font } from '../core/style';
import { drawBall } from './machine';
import { drawBlot } from '../core/blot';
import { GOLD, drawBolt, drawCrackle } from '../core/bolt';
import { penTrail } from '../core/signature';
import { brush, ensoPath } from '../core/brush';

const MOON_ENSO = ensoPath(0, 0, 100, 3, 0.93, -2.3);

/*
 * ACT IV — THE NIGHT MATCH.
 *
 * The ball comes down out of the sky like a falling star into a dark
 * stadium; the floodlights clunk on one tower at a time. The rivalry from the
 * ink duel is still going — blue against green — only now it is a match,
 * filmed like a broadcast: a crane down from the gantry, a tracking shot
 * along the wing with the tactics chalked onto the grass ahead of each pass,
 * then a low, slowed-down chase behind the ball into the top corner. The net
 * is a real cloth simulation. The camera keeps going, into the net.
 */

type V3 = [number, number, number];

/* --------------------------------------------------------------- camera */

interface Cam {
  x: number; y: number; z: number;
  cyaw: number; syaw: number; cp: number; sp: number;
  f: number; cx: number; cy: number;
}
const NEAR = 0.3;

function toCam(c: Cam, p: V3): V3 {
  const x = p[0] - c.x, y = p[1] - c.y, z = p[2] - c.z;
  const x1 = x * c.cyaw - z * c.syaw;
  const z1 = x * c.syaw + z * c.cyaw;
  const y2 = y * c.cp + z1 * c.sp;
  const z2 = -y * c.sp + z1 * c.cp;
  return [x1, y2, z2];
}
function proj(c: Cam, q: V3): Pt {
  return [c.cx + (c.f * q[0]) / q[2], c.cy - (c.f * q[1]) / q[2]];
}
function P(c: Cam, p: V3): [number, number, number] | null {
  const q = toCam(c, p);
  if (q[2] < NEAR) return null;
  const s = proj(c, q);
  return [s[0], s[1], q[2]];
}

function clipPoly(q: V3[]): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < q.length; i++) {
    const a = q[i], b = q[(i + 1) % q.length];
    const ain = a[2] >= NEAR, bin = b[2] >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }
  return out;
}
function poly(ctx: CanvasRenderingContext2D, c: Cam, pts: V3[]) {
  const q = clipPoly(pts.map((p) => toCam(c, p)));
  if (q.length < 3) return false;
  ctx.beginPath();
  q.forEach((p, i) => {
    const s = proj(c, p);
    if (i) ctx.lineTo(s[0], s[1]);
    else ctx.moveTo(s[0], s[1]);
  });
  ctx.closePath();
  return true;
}
function line(ctx: CanvasRenderingContext2D, c: Cam, pts: V3[], closed = false) {
  const q = pts.map((p) => toCam(c, p));
  const n = closed ? q.length : q.length - 1;
  for (let i = 0; i < n; i++) {
    let a = q[i], b = q[(i + 1) % q.length];
    if (a[2] < NEAR && b[2] < NEAR) continue;
    if (a[2] < NEAR) a = lerp3(a, b, (NEAR - a[2]) / (b[2] - a[2]));
    if (b[2] < NEAR) b = lerp3(b, a, (NEAR - b[2]) / (a[2] - b[2]));
    const sa = proj(c, a), sb = proj(c, b);
    ctx.moveTo(sa[0], sa[1]);
    ctx.lineTo(sb[0], sb[1]);
  }
}
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** smooth path through keyed values (Catmull-Rom over beats) */
function keyed<T extends number[]>(keys: [number, ...number[]][], B: number): T {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] <= B) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const t = ease.inOutSine(clamp((B - k1[0]) / (k2[0] - k1[0])));
  const out: number[] = [];
  for (let d = 1; d < k1.length; d++) {
    const p0 = k0[d], p1 = k1[d], p2 = k2[d], p3 = k3[d];
    const t2 = t * t, t3 = t2 * t;
    out.push(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
  }
  return out as T;
}

// [beat, camX, camY, camZ, lookX, lookY, lookZ]
const CAM_KEYS: [number, ...number[]][] = [
  [12.4, 0, 26, 24, 0, 70, 90],
  [12.9, 0, 30, 20, 0, 40, 80],
  [13.35, 0, 26, 22, 0, 0, 60],
  [13.9, 0, 14, 34, 0, 0, 55],
  [14.2, -3, 12, 38, -7, 0, 50],
  [14.6, -10, 11, 52, -21, 0, 72],
  [14.95, -13, 9, 64, -19, 0, 84],
  [15.3, -5, 5, 75, -2, 0.5, 89],
  [15.55, -1.2, 1.6, 83, 0.3, 1.2, 100],
  [16.45, 0.8, 1.5, 96.5, 2.4, 1.7, 106],
  [17.0, 1.6, 1.75, 100, 2.6, 1.9, 108],
  [17.6, 2.3, 1.9, 104.2, 2.6, 1.9, 112],
  [18.3, 2.6, 1.9, 106.9, 2.6, 1.9, 120],
  [19.0, 2.6, 1.9, 107.5, 2.6, 1.9, 125],
];

function camera(f: Frame, shake: Pt): Cam {
  const [x, y, z, lx, ly, lz] = keyed<number[]>(CAM_KEYS, f.B);
  // a broadcast camera is never perfectly still
  const hx = Math.sin(f.t * 0.7) * 0.15, hy = Math.sin(f.t * 0.9 + 1) * 0.1;
  return makeCam(f, shake, [x + hx, y + hy, z], [lx, ly, lz]);
}

function makeCam(f: { w: number; h: number }, shake: Pt, pos: V3, look: V3, rect?: { x: number; y: number; w: number; h: number }): Cam {
  const dx = look[0] - pos[0], dy = look[1] - pos[1], dz = look[2] - pos[2];
  const yaw = Math.atan2(dx, dz);
  const pitch = Math.atan2(-dy, Math.hypot(dx, dz));
  const fl = Math.min(f.w * 1.15, f.h * 1.05);
  return {
    x: pos[0], y: pos[1], z: pos[2],
    cyaw: Math.cos(yaw), syaw: Math.sin(yaw),
    cp: Math.cos(pitch), sp: Math.sin(pitch),
    f: fl, cx: (rect ? rect.x + rect.w / 2 : f.w / 2) + shake[0], cy: (rect ? rect.y + rect.h / 2 : f.h / 2) + shake[1],
  };
}

/*
 * BULLET TIME. At the instant of the strike the film freezes and the camera
 * walks a full circle around the ball and the striker, debris hanging in the
 * air, before the shot is let go. Implemented as a remap of the playhead:
 * the act lives in its own "match time", which stops for FZ beats.
 */
const FREEZE = 15.6, FZ = 1.1;
export function matchLocal(B: number) {
  return B < FREEZE ? B : B < FREEZE + FZ ? FREEZE : B - FZ;
}

function orbitCam(f: Frame, bt: number, shake: Pt): Cam {
  const ball = ballAt(FREEZE);
  const [x, y, z, lx, ly, lz] = keyed<number[]>(CAM_KEYS, FREEZE);
  const th = ease.inOutSine(bt) * TAU;
  const rx = x - ball[0], rz = z - ball[2];
  const r0 = Math.hypot(rx, rz);
  const a0 = Math.atan2(rx, rz);
  const swell = Math.sin(bt * Math.PI);
  const r = r0 * (1 - 0.55 * swell);
  const pos: V3 = [ball[0] + Math.sin(a0 + th) * r, y + swell * 0.9, ball[2] + Math.cos(a0 + th) * r];
  const k = Math.min(1, swell * 3);
  const look: V3 = [lerp(lx, ball[0], k), lerp(ly, ball[1] + 0.3, k), lerp(lz, ball[2], k)];
  return makeCam(f, shake, pos, look);
}

/** where the falling star sits on screen at film beat B: Alter's exit lands its ring there */
export function starOnScreen(f: { w: number; h: number }, B: number): Pt | null {
  const b = matchLocal(B);
  const [x, y, z, lx, ly, lz] = keyed<number[]>(CAM_KEYS, b);
  const p = P(makeCam(f, [0, 0], [x, y, z], [lx, ly, lz]), ballAt(b));
  return p ? [p[0], p[1]] : null;
}

/* ------------------------------------------------------------- the play */

function ballAt(B: number): V3 {
  if (B < 13.3) {
    // falling star: a long arc out of the sky onto the centre spot
    const s = ease.in2(seg(B, 12.45, 13.3));
    return [lerp(-3, 0, s), lerp(80, 0.35, s), lerp(95, 52.5, ease.out2(seg(B, 12.45, 13.3)))];
  }
  if (B < 13.9) {
    // bounces and settles on the spot
    const s = seg(B, 13.3, 13.85);
    const bounce = Math.abs(Math.sin(s * Math.PI * 3)) * 3.2 * (1 - s) ** 2;
    return [0, 0.35 + bounce, 52.5];
  }
  const pass = (b0: number, b1: number, a: V3, b: V3, loft = 0): V3 | null => {
    if (B < b0 || B > b1) return null;
    const s = seg(B, b0, b1);
    const e = ease.out2(s);
    return [lerp(a[0], b[0], e), 0.35 + loft * Math.sin(s * Math.PI), lerp(a[2], b[2], e)];
  };
  return (
    pass(13.9, 14.18, [0, 0, 52.5], [-8, 0, 45]) ??
    hold(B, 14.18, 14.22, [-8, 0, 45]) ??
    pass(14.22, 14.58, [-8, 0, 45], [-25, 0, 72], 5.5) ??
    pass(14.58, 14.9, [-25, 0, 72], [-24, 0, 85]) ??
    pass(14.9, 15.25, [-24, 0, 85], [-2, 0, 88]) ??
    pass(15.25, 15.5, [-2, 0, 88], [0, 0, 89.5]) ??
    shot(B)
  );
}
function hold(B: number, b0: number, b1: number, p: V3): V3 | null {
  return B >= b0 && B < b1 ? [p[0], 0.35, p[2]] : null;
}
const IMPACT: V3 = [2.6, 1.95, 105];
function shot(B: number): V3 {
  if (B < 16.5) {
    const s = seg(B, 15.5, 16.5);
    // bend: drifts out then curls back in
    return [lerp(0, IMPACT[0], s) - Math.sin(s * Math.PI) * 1.6, lerp(0.35, IMPACT[1], ease.out2(s)) + Math.sin(s * Math.PI) * 0.6, lerp(89.5, IMPACT[2], s)];
  }
  const s = seg(B, 16.5, 17.0);
  return [IMPACT[0] + s * 0.2, lerp(IMPACT[1], 0.35, ease.in2(s)), lerp(IMPACT[2], 106.4, ease.out3(s))];
}

interface Player { team: 0 | 1; n: number; keys: [number, ...number[]][] }
// team 0 = blue (defending), 1 = green (attacking). keys: [beat, x, z]
const PLAYERS: Player[] = [
  { team: 1, n: 9, keys: [[13, 0, 51], [13.9, 0, 51], [14.4, 2, 66], [15.0, 6, 86], [16, 7, 95]] },
  { team: 1, n: 8, keys: [[13, -8, 44], [14.18, -8, 45], [14.6, -9, 58], [15.5, -8, 74]] },
  { team: 1, n: 7, keys: [[13, -22, 52], [14.2, -24, 62], [14.58, -25, 72], [14.9, -24, 85], [15.5, -20, 88]] },
  // #10 arrives at the ball by thunder-dash: the dash happens in a hold at 15.0
  { team: 1, n: 10, keys: [[13, -5, 48], [14.2, -6, 58], [14.9, -4, 80], [15.0, -3.6, 82], [15.004, -2, 88], [15.25, -2, 88], [15.5, -0.5, 89], [16.6, 1, 92]] },
  { team: 1, n: 11, keys: [[13, 20, 52], [14.4, 22, 66], [15.2, 16, 86], [16.2, 12, 94]] },
  { team: 0, n: 4, keys: [[13, -6, 72], [14.6, -12, 80], [15.2, -6, 88], [15.6, -3, 92], [16.4, -1, 95]] },
  { team: 0, n: 5, keys: [[13, 6, 72], [14.6, 2, 80], [15.4, 3, 92], [16.4, 4, 97]] },
  { team: 0, n: 2, keys: [[13, -18, 76], [14.6, -21, 80], [15.0, -22, 86], [15.6, -18, 92]] },
  { team: 0, n: 3, keys: [[13, 18, 76], [14.6, 14, 82], [15.6, 10, 92]] },
  { team: 0, n: 1, keys: [[13, 0, 103.5], [15.2, 0.6, 103.2], [16.1, 0.4, 103], [16.45, -2.6, 103.3], [17.2, -3.1, 103.5]] },
];
/*
 * THE DASH. Mid-pass the match holds; #10 drops into a crouch, crackles,
 * and flashes through two defenders to the ball. They spin away a beat late.
 */
let dashP = -1;
let frozenMT = -1;
let lastDashP = -1;
const DASH_AT = 15.0;
const DASHED = [5, 6]; // indices in PLAYERS of the two defenders it goes through

function dashPath(): V3[] {
  const start = keyedPos(PLAYERS[3], DASH_AT);
  const d4 = keyedPos(PLAYERS[5], DASH_AT), d5 = keyedPos(PLAYERS[6], DASH_AT);
  return [
    [start[0], 1, start[2]],
    [d4[0] + 0.8, 1, d4[2] - 0.6],
    [d5[0] - 0.6, 1, d5[2] + 0.3],
    [-5, 1, 89.6],
    [-2, 1, 88],
  ];
}
function keyedPos(p: Player, B: number): V3 {
  const [x, z] = keyed<number[]>(p.keys, B);
  return [x, 0, z];
}
function knockOf(i: number, B: number) {
  if (!DASHED.includes(i)) return 0;
  if (dashP >= 0) return ease.out3(seg(dashP, 0.64, 0.86));
  return B > DASH_AT ? 1 - ease.inOut2(seg(B, 15.2, 15.6)) : 0;
}

function playerAt(p: Player, B: number, t: number): V3 {
  if (dashP >= 0 && p.team === 1 && p.n === 10) {
    const path = dashPath();
    const q = ease.out3(seg(dashP, 0.4, 0.44));
    const n = path.length - 1;
    const fpos = q * n;
    const i = Math.min(n - 1, Math.floor(fpos));
    const k = fpos - i;
    return [lerp(path[i][0], path[i + 1][0], k), 0, lerp(path[i][2], path[i + 1][2], k)];
  }
  const ix = PLAYERS.indexOf(p);
  const kn = knockOf(ix, B);
  // everyone but the striker is frozen while the dash charges
  if (dashP >= 0 && frozenMT >= 0) t = frozenMT;
  const [x, z] = keyed<number[]>(p.keys.length > 1 ? p.keys : [p.keys[0], p.keys[0]], B);
  if (kn > 0) {
    const side = ix === 5 ? -1 : 1;
    return [x + side * 2.2 * kn, Math.sin(kn * Math.PI) * 0.6, z + 0.8 * kn];
  }
  // idle jog so the shape never freezes
  const jog = Math.sin(t * 1.3 + p.n * 1.7) * 0.6;
  const jz = Math.cos(t * 1.1 + p.n) * 0.5;
  let y = 0;
  if (p.n === 1 && p.team === 0) y = bell(B, 16.12, 16.75) * 1.3; // the dive
  return [x + jog, y, z + jz];
}

// chalk: the plan, drawn on the grass ahead of each pass  [from, to, b0]
const CHALK: [V3, V3, number][] = [
  [[0, 0, 52.5], [-8, 0, 45], 13.7],
  [[-8, 0, 45], [-25, 0, 72], 14.0],
  [[-25, 0, 72], [-24, 0, 85], 14.4],
  [[-24, 0, 85], [-2, 0, 88], 14.7],
  [[0, 0, 89.5], [2.6, 0, 105], 15.3],
];

/* ------------------------------------------------------------------ net */

const NU = 15, NV = 9;
interface Node { x: number; y: number; z: number; px: number; py: number; pz: number; rx: number; ry: number; rz: number; pin: boolean }
const net: Node[] = [];
function netRest(u: number, v: number): V3 {
  const x = lerp(-3.66, 3.66, u);
  // profile: crossbar (y 2.44, z 105) → back top (y 2.1, z 107.2) → ground (y 0, z 107.2)
  if (v < 0.3) {
    const s = v / 0.3;
    return [x, lerp(2.44, 2.1, s), lerp(105, 107.2, s)];
  }
  const s = (v - 0.3) / 0.7;
  return [x, lerp(2.1, 0, s), 107.2];
}
function buildNet() {
  for (let j = 0; j < NV; j++)
    for (let i = 0; i < NU; i++) {
      const [x, y, z] = netRest(i / (NU - 1), j / (NV - 1));
      net.push({ x, y, z, px: x, py: y, pz: z, rx: x, ry: y, rz: z, pin: j === 0 || j === NV - 1 || i === 0 || i === NU - 1 });
    }
}
function stepNet(dt: number) {
  const k = Math.min(1, dt * 60);
  for (const n of net) {
    if (n.pin) continue;
    const vx = (n.x - n.px) * 0.94, vy = (n.y - n.py) * 0.94, vz = (n.z - n.pz) * 0.94;
    n.px = n.x; n.py = n.y; n.pz = n.z;
    // spring back to rest (the mesh's own tension), plus a breath of wind
    n.x += vx + (n.rx - n.x) * 0.02 * k;
    n.y += vy + (n.ry - n.y) * 0.02 * k - 0.0006 * k;
    n.z += vz + (n.rz - n.z) * 0.02 * k;
  }
  for (let it = 0; it < 3; it++) {
    for (let j = 0; j < NV; j++)
      for (let i = 0; i < NU; i++) {
        const a = net[j * NU + i];
        if (i < NU - 1) relax(a, net[j * NU + i + 1]);
        if (j < NV - 1) relax(a, net[(j + 1) * NU + i]);
      }
  }
}
function relax(a: Node, b: Node) {
  const rd = Math.hypot(a.rx - b.rx, a.ry - b.ry, a.rz - b.rz);
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  if (d < rd) return; // nets go slack, they don't push
  const k = ((d - rd) / d) * 0.5;
  if (!a.pin) { a.x += dx * k; a.y += dy * k; a.z += dz * k; }
  if (!b.pin) { b.x -= dx * k; b.y -= dy * k; b.z -= dz * k; }
}
function hitNet(p: V3, power: number) {
  for (const n of net) {
    if (n.pin) continue;
    const d = Math.hypot(n.x - p[0], n.y - p[1]);
    const f = Math.max(0, 1 - d / 2.2);
    n.pz -= f * f * power;
    n.py += f * 0.02;
  }
}

/* --------------------------------------------------------------- crowd */

interface Fan { p: V3; c: number; ph: number }
let fans: Fan[] = [];
function buildCrowd() {
  const r = rng(404);
  const cols = [0, 0, 1, 1, 2, 3];
  for (let i = 0; i < 2400; i++) {
    const zone = r();
    let p: V3;
    if (zone < 0.62) {
      const side = r() < 0.5 ? -1 : 1;
      const d = r();
      p = [side * (39 + d * 18), d * 16 + 0.8, -4 + r() * 113];
    } else {
      const end = r() < 0.5;
      const d = r();
      p = [-38 + r() * 76, d * 14 + 0.8, end ? 113 + d * 16 : -8 - d * 16];
    }
    fans.push({ p, c: cols[Math.floor(r() * cols.length)], ph: r() * TAU });
  }
}

/* ------------------------------------------------------------- drawing */

const confetti = new Particles(320, 260, 0.6);
let lastT = 0;
let built = false;
let shake: Pt = [0, 0];
let shakeAmt = 0;
let stars: [number, number, number][] = [];

const TOWERS: V3[] = [[-33, 0, 116], [33, 0, 116], [-52, 0, -8], [52, 0, -8]];
const LIGHT_ON = [12.95, 13.07, 13.19, 13.31];

let prevLocal = 0, lastCall = -1;

function scene(f: Frame, cam: Cam, S: number, frozen: number) {
  const { ctx, w, h, B, t } = f;
  const lit = LIGHT_ON.filter((b) => B >= b).length;
  const L = lit / 4;

  // ---- sky
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#04060f');
  sky.addColorStop(0.6, C.night);
  sky.addColorStop(1, C.nightUp);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // stars hang far away, so only the camera's angle moves them
  const horizon = P(cam, [cam.x, cam.y, cam.z + 1000]);
  const hy = horizon ? horizon[1] : h * 0.4;
  const yawShift = Math.atan2(cam.syaw, cam.cyaw) * cam.f;
  for (const [sx, sy, ph] of stars) {
    const x = ((sx * w * 2 - yawShift) % (w * 2) + w * 2) % (w * 2) - w * 0.5;
    const y = hy - sy * h * 1.4;
    if (y < -5 || y > h) continue;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + ph * 2) + ph * 9));
    ctx.fillStyle = `rgba(236,230,214,${tw * (1 - L * 0.55)})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  // the moon again: the ensō, now hung over the stadium
  const moon = P(cam, [cam.x - 300, cam.y + 420, cam.z + 900]);
  if (moon) {
    const mr = S * 0.05;
    ctx.globalAlpha = 0.5;
    drawSprite(ctx, glow(C.paper, 128), moon[0], moon[1], mr * 6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.paper;
    ctx.beginPath();
    ctx.arc(moon[0], moon[1], mr, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(moon[0], moon[1]);
    ctx.rotate(t * 0.02);
    ctx.scale(mr / 90, mr / 90);
    brush(ctx, MOON_ENSO, { width: 13, color: '#04060f', dry: 0.45, seed: 3, press: 1.4, alpha: 0.75 });
    ctx.restore();
  }

  // ---- stands
  ctx.fillStyle = '#0b1129';
  for (const side of [-1, 1]) {
    if (poly(ctx, cam, [[side * 38, 0, -6], [side * 38, 0, 111], [side * 58, 18, 111], [side * 58, 18, -6]])) ctx.fill();
  }
  for (const z of [[112, 130], [-7, -25]]) {
    if (poly(ctx, cam, [[-40, 0, z[0]], [40, 0, z[0]], [40, 16, z[1]], [-40, 16, z[1]]])) ctx.fill();
  }
  drawCrowd(ctx, cam, f, L);

  // ---- pitch
  const stripe = 105 / 14;
  for (let i = 0; i < 14; i++) {
    if (poly(ctx, cam, [[-36, 0, i * stripe], [36, 0, i * stripe], [36, 0, (i + 1) * stripe], [-36, 0, (i + 1) * stripe]])) {
      ctx.fillStyle = i % 2 ? C.pitchA : C.pitchB;
      ctx.fill();
    }
  }
  // run-off around the pitch
  ctx.fillStyle = '#123d22';
  for (const [a, b] of [[-38, -36], [36, 38]]) {
    if (poly(ctx, cam, [[a, 0, -5], [b, 0, -5], [b, 0, 110], [a, 0, 110]])) ctx.fill();
  }
  // darkness until the lights come on
  ctx.fillStyle = `rgba(3,5,14,${0.82 * (1 - L)})`;
  if (poly(ctx, cam, [[-38, 0.01, -5], [38, 0.01, -5], [38, 0.01, 110], [-38, 0.01, 110]])) ctx.fill();
  // floodlight pools
  if (L > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    TOWERS.forEach((tw, i) => {
      if (B < LIGHT_ON[i]) return;
      const pool = P(cam, [tw[0] * 0.45, 0, lerp(52, tw[2], 0.45)]);
      if (!pool) return;
      const r = (cam.f * 60) / pool[2];
      ctx.globalAlpha = 0.16;
      drawSprite(ctx, glow('#d8e4ff', 128), pool[0], pool[1], r * 2, r * 0.9);
    });
    ctx.restore();
  }
  // markings
  ctx.strokeStyle = `rgba(236,240,230,${0.25 + 0.55 * L})`;
  ctx.lineWidth = Math.max(1, S * 0.003);
  ctx.beginPath();
  line(ctx, cam, [[-34, 0, 0], [34, 0, 0], [34, 0, 105], [-34, 0, 105]], true);
  line(ctx, cam, [[-34, 0, 52.5], [34, 0, 52.5]]);
  line(ctx, cam, circle3(0, 52.5, 9.15), true);
  for (const [z0, dir] of [[0, 1], [105, -1]] as const) {
    line(ctx, cam, [[-20.16, 0, z0], [-20.16, 0, z0 + dir * 16.5], [20.16, 0, z0 + dir * 16.5], [20.16, 0, z0]]);
    line(ctx, cam, [[-9.16, 0, z0], [-9.16, 0, z0 + dir * 5.5], [9.16, 0, z0 + dir * 5.5], [9.16, 0, z0]]);
    const arc: V3[] = [];
    for (let k = 0; k <= 16; k++) {
      const a = lerp(-0.93, 0.93, k / 16);
      arc.push([Math.sin(a) * 9.15, 0, z0 + dir * (11 + Math.cos(a) * 9.15)]);
    }
    line(ctx, cam, arc.filter((p) => Math.abs(p[2] - z0) > 16.5));
  }
  ctx.stroke();
  const spot = P(cam, [0, 0, 52.5]);
  if (spot) {
    ctx.fillStyle = 'rgba(236,240,230,0.8)';
    ctx.beginPath();
    ctx.arc(spot[0], spot[1], Math.max(1, (cam.f * 0.25) / spot[2]), 0, TAU);
    ctx.fill();
  }

  drawChalk(ctx, cam, B, t, S);

  // sort players/ball/goal back-to-front
  const items: { z: number; draw: () => void }[] = [];
  const goalZ = toCam(cam, [0, 1, 105])[2];
  items.push({ z: goalZ, draw: () => drawGoal(ctx, cam, S, B, t) });
  PLAYERS.forEach((p) => {
    const pos = playerAt(p, B, t);
    const q = toCam(cam, pos);
    if (q[2] < NEAR) return;
    items.push({ z: q[2], draw: () => drawPlayer(ctx, cam, p, pos, B, t, S) });
  });
  const ball = ballAt(B);
  const bq = toCam(cam, ball);
  if (bq[2] > NEAR) items.push({ z: bq[2] - 0.01, draw: () => draw3DBall(ctx, cam, ball, B, t) });
  items.sort((a, b) => b.z - a.z);
  for (const it of items) it.draw();

  // ---- the towers, drawn last: they stand in front of the stands
  drawTowers(ctx, cam, B, t, S);

  drawFrozenDebris(ctx, cam, frozen, S);
}

export function drawMatch(fg: Frame) {
  const lb = matchLocal(fg.B);
  // a fresh entry (a jump) shouldn't fire every event it skipped over
  const plb = fg.t - lastCall > 0.25 ? lb : prevLocal;
  prevLocal = lb;
  lastCall = fg.t;
  const f: Frame = {
    ...fg,
    B: lb,
    crossed: (b: number) => (plb < b) !== (lb < b),
    crossedFwd: (b: number) => plb < b && lb >= b,
  };
  const { ctx, w, h, t } = f;
  const dt = Math.min(0.05, t - lastT || 0.016);
  lastT = t;
  if (!built) {
    built = true;
    buildNet();
    buildCrowd();
    const r = rng(8);
    stars = Array.from({ length: 140 }, () => [r(), r() * 0.7, r()]);
  }
  const S = Math.min(w, h);
  const bt = seg(fg.B, FREEZE, FREEZE + FZ);
  if (fg.hold?.kind === 'dash') {
    dashP = fg.hold.p;
    if (frozenMT < 0) frozenMT = t;
  } else {
    dashP = -1;
    frozenMT = -1;
  }

  shakeAmt = Math.max(0, shakeAmt - dt * 40);
  shake = [(Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt];
  // ---- goal + net
  stepNet(dt);
  if (f.crossedFwd(16.5)) {
    hitNet(IMPACT, 1.4);
    shakeAmt = S * 0.03;
    f.flash(0.5, '#ffffff');
    const cols = [C.green, C.paper, C.greenHot, C.blue, C.red];
    for (let k = 0; k < cols.length; k++) {
      confetti.burst(w * (0.2 + k * 0.15), h * 0.15, 30, S * 1.4, { color: cols[k], kind: CONFETTI, size: S * 0.012, max: 3.5, dir: Math.PI / 2, spread: 2.4 });
    }
  }

  const frozen = bt > 0 && bt < 1 ? Math.min(1, Math.sin(bt * Math.PI) * 4) : 0;
  let cam = frozen > 0 ? orbitCam(f, bt, shake) : camera(f, shake);
  if (dashP >= 0) {
    // the dash gets its own camera: low, wide, everything the bolt crosses in frame
    const [x, y, z, lx, ly, lz] = keyed<number[]>(CAM_KEYS, DASH_AT);
    const k = ease.inOut3(seg(dashP, 0, 0.14)) * (1 - ease.inOut3(seg(dashP, 0.86, 1)));
    const push = ease.inOut2(seg(dashP, 0.14, 0.4)) * 0.25;
    const pos: V3 = [lerp(x, -12 + push * 4, k), lerp(y, 3.2 - push * 1.2, k), lerp(z, 76 + push * 4, k)];
    const look: V3 = [lerp(lx, -2.5, k), lerp(ly, 0.9, k), lerp(lz, 86.5, k)];
    cam = makeCam(f, shake, pos, look);
  }
  ctx.save();
  scene(f, cam, S, frozen);
  ctx.restore();
  if (dashP >= 0) drawDash(f, cam, S);
  drawPanels(f, S, shake);
  if (frozen > 0) drawBulletHud(f, S, bt, frozen);

  // ---- broadcast graphics
  drawScorebug(f, S);
  drawLowerThird(f, S);
  drawPlayerCard(f, S);
  drawGoalType(f, S);
  confetti.update(dt);
  confetti.draw(ctx);
}

function circle3(x: number, z: number, r: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU;
    out.push([x + Math.cos(a) * r, 0, z + Math.sin(a) * r]);
  }
  return out;
}

function drawCrowd(ctx: CanvasRenderingContext2D, cam: Cam, f: Frame, L: number) {
  const { B, t } = f;
  const goal = seg(B, 16.5, 16.55) * (1 - seg(B, 18, 18.4));
  const cols = ['#24305e', '#2f5bff', '#76b22a', '#ece6d6'];
  const batches: string[][] = [[], [], [], []];
  const pts: number[][] = [[], [], [], []];
  for (const fan of fans) {
    // the crowd rises on the goal, otherwise they sway
    // a slow Mexican wave rolls round the stands between the sways
    const wave = Math.max(0, Math.sin(fan.p[0] * 0.08 - t * 1.6)) ** 12 * 0.5;
    const jump = goal > 0 ? Math.abs(Math.sin(t * 9 + fan.ph)) * 0.6 * goal : Math.sin(t * 2 + fan.ph) * 0.05 + wave;
    const q = toCam(cam, [fan.p[0], fan.p[1] + jump, fan.p[2]]);
    if (q[2] < NEAR) continue;
    const s = proj(cam, q);
    if (s[0] < -2 || s[0] > f.w + 2 || s[1] < -2 || s[1] > f.h + 2) continue;
    if (q[2] < 6) continue;
    pts[fan.c].push(s[0], s[1], Math.min(3.2, Math.max(0.8, (cam.f * 0.32) / q[2])));
  }
  void batches;
  const dim = 0.25 + L * 0.75;
  pts.forEach((arr, c) => {
    ctx.fillStyle = withAlpha(cols[c], c === 0 ? dim * 0.9 : dim * 0.75);
    ctx.beginPath();
    for (let i = 0; i < arr.length; i += 3) ctx.rect(arr[i], arr[i + 1], arr[i + 2], arr[i + 2] * 1.4);
    ctx.fill();
  });
  // phone flashes, more of them on the goal
  const n = 6 + Math.floor(goal * 40);
  const k = Math.floor(t * 8);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const fan = fans[Math.floor(hash(i * 13.7 + k) * fans.length)];
    const p = P(cam, fan.p);
    if (!p) continue;
    if (p[2] < 6) continue;
    drawSprite(ctx, glow('#ffffff', 64), p[0], p[1], Math.min(40, Math.max(4, (cam.f * 1.6) / p[2])));
  }
  ctx.restore();
}

function drawTowers(ctx: CanvasRenderingContext2D, cam: Cam, B: number, t: number, S: number) {
  TOWERS.forEach((tw, i) => {
    const on = B >= LIGHT_ON[i];
    const base = P(cam, tw), top = P(cam, [tw[0], 44, tw[2]]);
    if (!base || !top) return;
    ctx.strokeStyle = '#1a2142';
    ctx.lineWidth = Math.max(1.5, (cam.f * 0.7) / base[2]);
    ctx.beginPath();
    ctx.moveTo(base[0], base[1]);
    ctx.lineTo(top[0], top[1]);
    ctx.stroke();
    // lamp bank
    const sz = Math.max(4, (cam.f * 7) / top[2]);
    ctx.fillStyle = on ? '#fbfbff' : '#2a3150';
    ctx.fillRect(top[0] - sz / 2, top[1] - sz * 0.35, sz, sz * 0.7);
    if (on) {
      // the clunk: a hot overshoot right as it comes on, then a steady hum
      const kick = 1 + bell(B, LIGHT_ON[i], LIGHT_ON[i] + 0.12) * 1.5;
      const hum = 1 + Math.sin(t * 50 + i) * 0.02;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.9;
      drawSprite(ctx, glow('#dfe8ff', 128), top[0], top[1], sz * 6 * kick * hum);
      ctx.globalAlpha = 0.5;
      drawSprite(ctx, glow('#ffffff', 64), top[0], top[1], sz * 18 * kick, sz * 1.2);
      ctx.restore();
    }
  });
  void S;
}

function drawChalk(ctx: CanvasRenderingContext2D, cam: Cam, B: number, t: number, S: number) {
  ctx.save();
  ctx.lineCap = 'round';
  CHALK.forEach(([a, b, b0], idx) => {
    const draw = ease.inOut2(seg(B, b0, b0 + 0.18));
    const fade = 1 - seg(B, b0 + 0.6, b0 + 0.8);
    if (draw <= 0 || fade <= 0) return;
    // the arrow bows a little, like a coach's hand
    const mid: V3 = [(a[0] + b[0]) / 2 + (b[2] - a[2]) * 0.12, 0, (a[2] + b[2]) / 2 - (b[0] - a[0]) * 0.12];
    const pts: V3[] = [];
    const n = 24;
    for (let k = 0; k <= n * draw; k++) {
      const s = k / n;
      const p0 = lerp3(a, mid, s), p1 = lerp3(mid, b, s);
      pts.push(lerp3(p0, p1, s));
    }
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = `rgba(250,250,240,${(pass ? 0.45 : 0.85) * fade})`;
      ctx.lineWidth = Math.max(1.2, S * (pass ? 0.008 : 0.004));
      ctx.setLineDash(pass ? [] : [S * 0.02, S * 0.012]);
      ctx.beginPath();
      line(ctx, cam, pts.map((p, k) => [p[0] + (hash(k + pass * 9 + idx) - 0.5) * 0.25, 0.02, p[2]] as V3));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (draw > 0.98 && pts.length > 2) {
      // arrowhead
      const tip = pts[pts.length - 1], back = pts[pts.length - 3];
      const dx = tip[0] - back[0], dz = tip[2] - back[2];
      const l = Math.hypot(dx, dz) || 1;
      const ux = dx / l, uz = dz / l;
      ctx.lineWidth = Math.max(1.5, S * 0.006);
      ctx.strokeStyle = `rgba(250,250,240,${0.9 * fade})`;
      ctx.beginPath();
      line(ctx, cam, [[tip[0] - ux * 2 - uz * 1.4, 0.02, tip[2] - uz * 2 + ux * 1.4], tip, [tip[0] - ux * 2 + uz * 1.4, 0.02, tip[2] - uz * 2 - ux * 1.4]]);
      ctx.stroke();
    }
  });
  // the plan's Xs and Os, chalked in before kick-off
  const plan = seg(B, 13.55, 13.8) * (1 - seg(B, 14.6, 14.9));
  if (plan > 0) {
    PLAYERS.forEach((p, i) => {
      const pos = playerAt(p, 13.6, 0);
      const r = 1.3;
      ctx.strokeStyle = `rgba(250,250,240,${0.7 * plan})`;
      ctx.lineWidth = Math.max(1, S * 0.004);
      ctx.beginPath();
      if (p.team === 1) line(ctx, cam, circle3(pos[0], pos[2], r * ease.out3(plan)).map((q) => [q[0], 0.02, q[2]] as V3), true);
      else {
        const k = r * ease.out3(plan);
        line(ctx, cam, [[pos[0] - k, 0.02, pos[2] - k], [pos[0] + k, 0.02, pos[2] + k]]);
        line(ctx, cam, [[pos[0] - k, 0.02, pos[2] + k], [pos[0] + k, 0.02, pos[2] - k]]);
      }
      ctx.stroke();
      void i;
    });
  }
  ctx.restore();
  void t;
}

function drawPlayer(ctx: CanvasRenderingContext2D, cam: Cam, p: Player, pos: V3, B: number, t: number, S: number) {
  const col = p.team ? C.green : C.blue;
  const hot = p.team ? C.greenHot : C.blueHot;
  // the trail: where they were, chalked on the grass
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = withAlpha(col, 0.35);
  ctx.lineWidth = Math.max(1, S * 0.006);
  ctx.beginPath();
  const trail: V3[] = [];
  for (let k = 0; k < 10; k++) {
    const q = playerAt(p, B - k * 0.04, t - k * 0.05);
    trail.push([q[0], 0.03, q[2]]);
  }
  line(ctx, cam, trail);
  ctx.stroke();
  ctx.restore();

  const foot = P(cam, [pos[0], 0.02, pos[2]]);
  const kn = knockOf(PLAYERS.indexOf(p), B);
  const spin = kn > 0 ? t * 9 + PLAYERS.indexOf(p) : 0;
  const head = P(cam, [pos[0] + Math.cos(spin) * 1.3 * kn, pos[1] + 1.85 - 0.7 * kn, pos[2] + Math.sin(spin) * 1.3 * kn]);
  if (!foot || !head) return;
  const r = (cam.f * 0.75) / foot[2];
  // long shadows thrown away from each floodlight tower, snapping out as each one clunks on
  TOWERS.forEach((tw, i) => {
    const on = seg(B, LIGHT_ON[i], LIGHT_ON[i] + 0.12);
    if (on <= 0 || kn > 0.5) return;
    const dx = pos[0] - tw[0], dz = pos[2] - tw[2], d = Math.hypot(dx, dz) || 1;
    const len = 4.2 * ease.outBack(on, 1.6);
    const end = P(cam, [pos[0] + (dx / d) * len, 0.02, pos[2] + (dz / d) * len]);
    if (!end) return;
    const g = ctx.createLinearGradient(foot[0], foot[1], end[0], end[1]);
    g.addColorStop(0, 'rgba(0,0,0,0.38)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(1, r * 0.5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(foot[0], foot[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
  });
  // shadow disc
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(foot[0], foot[1], r * 1.1, r * 0.35, 0, 0, TAU);
  ctx.fill();
  // ring on the grass
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.beginPath();
  ctx.ellipse(foot[0], foot[1], r, r * 0.32, 0, 0, TAU);
  ctx.stroke();
  // body: a light pin from the grass to the head
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1.5, r * 0.45);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(foot[0], foot[1] - r * 0.1);
  ctx.lineTo(head[0], head[1]);
  ctx.stroke();
  const hr = Math.max(2.5, (cam.f * 0.32) / head[2]);
  drawSprite(ctx, glow(col, 64), head[0], head[1], hr * 5);
  ctx.restore();
  ctx.fillStyle = hot;
  ctx.beginPath();
  ctx.arc(head[0], head[1], hr, 0, TAU);
  ctx.fill();
  // shirt number floating above
  if (hr > 3 && hr < S * 0.03) {
    ctx.font = font(hr * 1.5, F.display);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.white;
    ctx.fillText(String(p.n), head[0], head[1] - hr * 1.6);
  }
  // Max wears a crown of light when he has the ball
  if (p.team === 1 && p.n === 10 && B > 15.2 && B < 16.0) {
    const k = bell(B, 15.2, 16.0);
    ctx.strokeStyle = `rgba(255,64,33,${k})`;
    ctx.lineWidth = Math.max(1.5, hr * 0.3);
    ctx.beginPath();
    ctx.ellipse(foot[0], foot[1], r * 1.8 + Math.sin(t * 8) * r * 0.1, r * 0.6, 0, 0, TAU);
    ctx.stroke();
  }
}

function draw3DBall(ctx: CanvasRenderingContext2D, cam: Cam, b: V3, B: number, t: number) {
  // the flourish of the signature: the ball's whole route, from the long ball to the net,
  // left on the pitch as a pen-line that lingers through the celebration
  const pen = seg(B, 14.25, 14.4) * (1 - seg(B, 18.1, 18.6));
  if (pen > 0) {
    const trail: Pt[] = [];
    for (let bb = 14.22; bb <= Math.min(B, 17.0); bb += 0.015) {
      const q = P(cam, ballAt(bb));
      if (q) trail.push([q[0], q[1]]);
    }
    penTrail(ctx, trail, pen * 0.4, Math.min(cam.cx, cam.cy) * 2);
  }
  const p = P(cam, b);
  const sh = P(cam, [b[0], 0.01, b[2]]);
  // the star only enters this sky once it has risen out of ALTER
  if (!p || B < 12.63) return;
  const r = Math.max(2, (cam.f * 0.34) / p[2]);
  if (sh) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(sh[0], sh[1], r * 1.1, r * 0.3, 0, 0, TAU);
    ctx.fill();
  }
  // a falling star until it lands
  if (B < 13.3) {
    const k = 1 - seg(B, 13.1, 13.3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < 14; i++) {
      const q = P(cam, ballAt(B - i * 0.018));
      if (!q) continue;
      ctx.globalAlpha = (1 - i / 14) * 0.5 * k;
      drawSprite(ctx, glow('#ffe9b0', 64), q[0], q[1], r * (5 - i * 0.25));
    }
    ctx.globalAlpha = k;
    drawSprite(ctx, glow('#ffffff', 64), p[0], p[1], r * 9);
    ctx.restore();
  }
  // during the shot it smears
  if (B > 15.5 && B < 16.5) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    for (let i = 1; i < 5; i++) {
      const q = P(cam, ballAt(B - i * 0.012));
      if (!q) continue;
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.arc(q[0], q[1], r * (1 - i * 0.12), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  drawBall(ctx, p[0], p[1], r, b[2] * 0.9 + b[0] * 0.4, t, 1);
}

function drawGoal(ctx: CanvasRenderingContext2D, cam: Cam, S: number, B: number, t: number) {
  // net mesh
  ctx.strokeStyle = 'rgba(240,244,255,0.55)';
  ctx.lineWidth = Math.max(0.8, S * 0.0018);
  ctx.beginPath();
  for (let j = 0; j < NV; j++) line(ctx, cam, net.slice(j * NU, j * NU + NU).map((n) => [n.x, n.y, n.z] as V3));
  for (let i = 0; i < NU; i++) {
    const col: V3[] = [];
    for (let j = 0; j < NV; j++) { const n = net[j * NU + i]; col.push([n.x, n.y, n.z]); }
    line(ctx, cam, col);
  }
  // side nets
  for (const x of [-3.66, 3.66]) {
    for (let k = 1; k < 6; k++) {
      const s = k / 6;
      line(ctx, cam, [[x, lerp(2.44, 0, s), 105], [x, lerp(2.1, 0, s), 107.2]]);
      line(ctx, cam, [[x, 0, lerp(105, 107.2, s)], [x, lerp(2.44, 2.1, s), lerp(105, 107.2, s)]]);
    }
  }
  ctx.stroke();
  // posts and bar
  ctx.strokeStyle = C.white;
  ctx.lineWidth = Math.max(2, (cam.f * 0.12) / Math.max(1, toCam(cam, [0, 1, 105])[2]));
  ctx.lineCap = 'round';
  ctx.beginPath();
  line(ctx, cam, [[-3.66, 0, 105], [-3.66, 2.44, 105], [3.66, 2.44, 105], [3.66, 0, 105]]);
  ctx.stroke();
  // Blot has the best seat in the house: on the crossbar, until the ball arrives
  const fall = seg(B, 16.5, 16.72);
  const bp: V3 = fall <= 0 ? [-1.5, 2.47, 105] : [lerp(-1.5, -0.6, fall), lerp(2.47, 0.05, ease.in2(fall)), lerp(105, 106.6, fall)];
  const bs = P(cam, bp);
  if (bs) {
    const size = (cam.f * 0.75) / bs[2];
    if (size > 2) {
      const ballS = P(cam, ballAt(B));
      const pose = fall > 0 && fall < 1 ? 'fall' : fall >= 1 ? 'cheer' : B > 16.2 ? 'shock' : 'idle';
      ctx.globalAlpha = 0.35;
      drawSprite(ctx, glow(C.paper, 64), bs[0], bs[1] - size * 0.45, size * 1.8);
      ctx.globalAlpha = 1;
      // legs dangling off the bar
      if (fall <= 0) {
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = Math.max(1, size * 0.07);
        for (const k of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(bs[0] + k * size * 0.15, bs[1]);
          ctx.lineTo(bs[0] + k * size * 0.16 + Math.sin(t * 4 + k) * size * 0.08, bs[1] + size * 0.22);
          ctx.stroke();
        }
      }
      drawBlot(ctx, bs[0], bs[1], size, { t, pose, look: ballS ? [ballS[0], ballS[1]] : undefined, seed: 4, eye: C.white, rot: fall > 0 && fall < 1 ? fall * 3 : 0 });
    }
  }
}

/* ------------------------------------------------- broadcast graphics */

function drawScorebug(f: Frame, S: number) {
  const { ctx, B, t } = f;
  const show = ease.out3(seg(B, 13.35, 13.6)) * (1 - seg(B, 17.6, 17.9));
  if (show <= 0) return;
  const goals = B >= 16.52 ? 1 : 0;
  const px = Math.max(11, S * 0.032);
  const x = 16, y = 70 + (1 - show) * -40;
  const minute = 88 + Math.floor((t / 7) % 2);
  const sec = Math.floor((t * 8.6) % 60);
  ctx.save();
  ctx.globalAlpha = show;
  ctx.font = font(px, F.display);
  ctx.textBaseline = 'middle';
  const segs: [string, string, string][] = [
    ['GRN', C.green, C.ink],
    [`${goals}`, C.paper, C.ink],
    ['–', C.paper, C.ink],
    ['0', C.paper, C.ink],
    ['BLU', C.blue, C.white],
    [`${minute}:${String(sec).padStart(2, '0')}`, C.ink, C.paper],
  ];
  let cx = x;
  const hgt = px * 1.9;
  segs.forEach(([s, bg, fg], i) => {
    const wpx = ctx.measureText(s).width + px * (i === 2 ? 0.5 : 1.1);
    ctx.fillStyle = bg;
    ctx.fillRect(cx, y, wpx, hgt);
    // the scored digit flips over
    let sy = 1;
    if (i === 1) {
      const fl = seg(B, 16.52, 16.66);
      sy = fl > 0 && fl < 1 ? Math.abs(Math.cos(fl * Math.PI)) : 1;
    }
    ctx.save();
    ctx.translate(cx + wpx / 2, y + hgt / 2);
    ctx.scale(1, sy);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.fillText(s, 0, px * 0.05);
    ctx.restore();
    cx += wpx;
  });
  ctx.restore();
}

function drawLowerThird(f: Frame, S: number) {
  const { ctx, w, h, B, t } = f;
  const inn = ease.out5(seg(B, 13.4, 13.65));
  const out = ease.in3(seg(B, 13.95, 14.15));
  if (inn <= 0 || out >= 1) return;
  const y = h * 0.74;
  const px = Math.min(w * 0.11, S * 0.11);
  ctx.save();
  // two slabs crossing in from opposite sides
  const gx = lerp(-w, 0, inn) - out * w;
  const bx = lerp(w, 0, inn) + out * w;
  ctx.fillStyle = C.green;
  ctx.fillRect(gx, y - px * 0.95, w * 0.62, px * 1.25);
  ctx.fillStyle = C.blue;
  ctx.fillRect(bx + w * 0.38, y + px * 0.45, w * 0.62, px * 1.25);
  extruded(ctx, 'GREEN', gx + 16, y - px * 0.32, px, { face: C.ink, side: C.paper, depth: px * 0.08, align: 'left', outline: C.ink, line: 0.1 });
  extruded(ctx, 'BLUE', bx + w - 16, y + px * 1.08, px, { face: C.white, side: C.ink, depth: px * 0.08, align: 'right', outline: C.ink, line: 0.1 });
  // the VS seal stamps between them
  const vs = ease.outBack(seg(B, 13.6, 13.72), 2.5) * (1 - out);
  if (vs > 0) {
    const r = px * 0.48 * vs;
    ctx.save();
    ctx.translate(w * 0.56, y + px * 0.18);
    ctx.rotate(-0.15 + Math.sin(t * 4) * 0.04);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(3, 3, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.font = font(r * 0.8, F.display);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.paper;
    ctx.fillText('VS', 0, r * 0.05);
    ctx.restore();
  }
  ctx.font = font(Math.max(10, px * 0.2), F.serif, 800);
  ctx.textAlign = 'left';
  ctx.fillStyle = C.paper;
  ctx.globalAlpha = inn * (1 - out);
  ctx.fillText('THE REMATCH · 89TH MINUTE', 16, y - px * 1.25);
  ctx.restore();
}

function drawPlayerCard(f: Frame, S: number) {
  const { ctx, w, h, B, t } = f;
  const inn = seg(B, 15.01, 15.16);
  const out = seg(B, 15.45, 15.6);
  if (inn <= 0 || out >= 1) return;
  const cw = Math.min(w * 0.62, S * 0.62, 300), ch = cw * 1.38;
  const x = w - cw - 16, y = h * 0.16;
  // the card flips in on its vertical axis and flips away
  const flip = inn < 1 ? ease.outBack(inn, 1.4) : 1 - ease.in3(out);
  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.scale(Math.max(0.001, flip), 1);
  ctx.rotate(-0.04 + Math.sin(t * 1.5) * 0.008);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.fillStyle = C.ink;
  ctx.fillRect(6, 6, cw, ch);
  ctx.fillStyle = C.green;
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, cw - 3, ch - 3);
  // the number
  extruded(ctx, '10', cw * 0.08, ch * 0.16, cw * 0.32, { face: C.paper, side: C.ink, depth: cw * 0.025, align: 'left', line: 1.2 });
  ctx.fillStyle = C.ink;
  ctx.font = font(cw * 0.06, F.serif, 800);
  ctx.textAlign = 'left';
  ctx.fillText('PLAYMAKER', cw * 0.09, ch * 0.29);
  // name
  ctx.font = font(cw * 0.115, F.display);
  ctx.fillText('MAX', cw * 0.08, ch * 0.42);
  ctx.fillText('GABRIEL', cw * 0.08, ch * 0.51);
  // stats, counting up
  const stats: [string, number][] = [['MOTION', 99], ['CODE', 94], ['TYPE', 92], ['TASTE', 97], ['SLEEP', 41]];
  stats.forEach(([k, v], i) => {
    const grow = ease.out3(seg(B, 14.88 + i * 0.04, 15.1 + i * 0.04));
    const yy = ch * (0.6 + i * 0.075);
    ctx.font = font(cw * 0.05, F.display);
    ctx.fillStyle = C.ink;
    ctx.fillText(k, cw * 0.08, yy);
    const bx = cw * 0.38, bw = cw * 0.4;
    ctx.fillStyle = 'rgba(20,18,15,0.18)';
    ctx.fillRect(bx, yy - cw * 0.035, bw, cw * 0.045);
    ctx.fillStyle = v < 50 ? C.red : C.ink;
    ctx.fillRect(bx, yy - cw * 0.035, bw * (v / 100) * grow, cw * 0.045);
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(v * grow)), cw * 0.92, yy);
    ctx.textAlign = 'left';
  });
  ctx.restore();
}

function drawGoalType(f: Frame, S: number) {
  const { ctx, w, h, B, t } = f;
  if (B < 16.52 || B > 18.2) return;
  const out = ease.in3(seg(B, 17.5, 17.9));
  // GOAL, then more O's the longer you hold on it
  const extra = Math.floor(seg(B, 16.75, 17.4) * 4);
  const word = 'G' + 'O'.repeat(1 + extra) + 'AL';
  const px = Math.min((w * 0.92) / (word.length * 0.82), S * 0.3);
  const cols = [C.green, C.paper, C.green, C.paper, C.green, C.paper, C.green, C.paper];
  ctx.save();
  ctx.font = font(px, F.display);
  const widths = [...word].map((ch) => ctx.measureText(ch).width * 0.92);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = w / 2 - total / 2;
  [...word].forEach((ch, i) => {
    const land = seg(B, 16.52 + i * 0.03, 16.52 + i * 0.03 + 0.08);
    if (land <= 0) { x += widths[i]; return; }
    const sc = lerp(3.2, 1, ease.out3(land)) * (1 + Math.sin(t * 12 + i) * 0.03);
    const y = h * 0.42 + Math.sin(t * 6 + i * 0.9) * px * 0.04 - out * h * 0.8 * (1 + i * 0.1);
    ctx.save();
    ctx.translate(x + widths[i] / 2, y);
    ctx.rotate(Math.sin(t * 5 + i) * 0.05 + (i % 2 ? 0.04 : -0.04));
    ctx.scale(sc, sc);
    ctx.globalAlpha = Math.min(1, land * 3);
    extruded(ctx, ch, 0, 0, px, { face: cols[i % cols.length], side: C.ink, depth: px * 0.12, outline: C.ink, line: px * 0.035 });
    ctx.restore();
    x += widths[i];
  });
  ctx.restore();
}

/* -------------------------------------------- comic panels, bullet time */

function drawPanels(f: Frame, S: number, shake: Pt) {
  const { ctx, w, h, B, t } = f;
  const inn = seg(B, 14.16, 14.3), out = seg(B, 14.5, 14.64);
  if (inn <= 0 || out >= 1) return;
  const ball = ballAt(B);
  const p8 = playerAt(PLAYERS[1], B, t), p7 = playerAt(PLAYERS[2], B, t);
  const shots: { pos: V3; look: V3; label: string }[] = [
    { pos: [p8[0] + 3.2, 1.5, p8[2] - 3.8], look: [p8[0], 1.1, p8[2] + 1], label: '#8 · THE LONG BALL' },
    { pos: [ball[0] - 2.2, Math.max(0.25, ball[1] - 1.4), ball[2] - 3.2], look: ball, label: 'IN THE AIR' },
    { pos: [p7[0] - 3.6, 1.7, p7[2] + 4.2], look: [p7[0], 1.0, p7[2] - 2], label: '#7 · ON THE WING' },
  ];
  const portrait = h > w;
  const gut = S * 0.018;
  shots.forEach((sh, i) => {
    const k = ease.out3(clamp(inn * 1.7 - i * 0.3)) * (1 - ease.in3(clamp(out * 1.7 - i * 0.3)));
    if (k <= 0) return;
    const slant = S * 0.06 * (i % 2 ? 1 : -1);
    // panel polygon: stripes on a phone, columns on a wide screen
    let poly: Pt[];
    let rect: { x: number; y: number; w: number; h: number };
    if (portrait) {
      const y0 = (h * i) / 3, y1 = (h * (i + 1)) / 3;
      const off = (1 - k) * w * (i % 2 ? 1 : -1);
      poly = [[off, y0 + (i ? slant : 0)], [w + off, y0 - (i ? slant : 0)], [w + off, y1 - (i < 2 ? -slant : 0)], [off, y1 + (i < 2 ? -slant : 0)]];
      rect = { x: off, y: y0, w, h: y1 - y0 };
    } else {
      const x0 = (w * i) / 3, x1 = (w * (i + 1)) / 3;
      const off = (1 - k) * h * (i % 2 ? 1 : -1);
      poly = [[x0 + (i ? slant : 0), off], [x1 + (i < 2 ? slant : 0), off], [x1 - (i < 2 ? slant : 0), h + off], [x0 - (i ? slant : 0), h + off]];
      rect = { x: x0, y: off, w: x1 - x0, h };
    }
    ctx.save();
    ctx.beginPath();
    poly.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.save();
    ctx.clip();
    const cam = makeCam(f, shake, sh.pos, sh.look, rect);
    scene(f, cam, S, 0);
    ctx.restore();
    // gutter: paper then an ink keyline, like a comic page
    ctx.lineJoin = 'round';
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = gut * 2;
    ctx.stroke();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = gut * 0.4;
    ctx.stroke();
    // caption box
    const lx = Math.max(poly[0][0], poly[3][0]) + S * 0.05, ly = poly[0][1] + S * 0.07 + (i === 0 || !portrait ? 96 : 0);
    ctx.font = font(Math.max(10, S * 0.03), F.display);
    const tw = ctx.measureText(sh.label).width;
    ctx.fillStyle = C.ink;
    ctx.fillRect(lx + 3, ly - S * 0.03 + 3, tw + S * 0.04, S * 0.05);
    ctx.fillStyle = i === 1 ? C.paper : C.green;
    ctx.fillRect(lx, ly - S * 0.03, tw + S * 0.04, S * 0.05);
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(sh.label, lx + S * 0.02, ly - S * 0.005);
    ctx.restore();
  });
}

function drawFrozenDebris(ctx: CanvasRenderingContext2D, cam: Cam, frozen: number, S: number) {
  if (frozen <= 0) return;
  const ball = ballAt(FREEZE);
  const r = rng(91);
  ctx.save();
  ctx.globalAlpha = frozen;
  // turf and dust kicked up by the strike, hanging in the air
  for (let i = 0; i < 70; i++) {
    const a = r() * TAU, el = (r() - 0.3) * 1.2, d = 0.3 + r() * 1.6;
    const p: V3 = [ball[0] + Math.cos(a) * d * 0.8, Math.max(0.05, ball[1] - 0.2 + el * d * 0.5), ball[2] - 0.5 - Math.abs(Math.sin(a)) * d];
    const q = P(cam, p);
    if (!q) continue;
    const size = Math.min(S * 0.03, (cam.f * (0.03 + r() * 0.05)) / q[2]);
    ctx.fillStyle = r() > 0.4 ? '#2b7a3f' : '#4a3b28';
    ctx.save();
    ctx.translate(q[0], q[1]);
    ctx.rotate(r() * TAU);
    ctx.fillRect(-size / 2, -size * 0.15, size, size * 0.3);
    ctx.restore();
  }
  // shock rings frozen around the ball, perpendicular to its flight
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, S * 0.003);
  for (const rr of [0.55, 0.9, 1.3]) {
    const ring: V3[] = [];
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * TAU;
      ring.push([ball[0] + Math.cos(a) * rr, ball[1] + Math.sin(a) * rr, ball[2] - rr * 0.8]);
    }
    ctx.beginPath();
    line(ctx, cam, ring, true);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBulletHud(f: Frame, S: number, bt: number, frozen: number) {
  const { ctx, w, h, t } = f;
  ctx.save();
  ctx.globalAlpha = frozen;
  // viewfinder corners
  const m = S * 0.07, l = S * 0.07;
  ctx.strokeStyle = C.white;
  ctx.lineWidth = Math.max(1.5, S * 0.004);
  ctx.beginPath();
  for (const [x, y, dx, dy] of [[m, h * 0.18, 1, 1], [w - m, h * 0.18, -1, 1], [m, h * 0.82, 1, -1], [w - m, h * 0.82, -1, -1]]) {
    ctx.moveTo(x, y + dy * l);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * l, y);
  }
  ctx.stroke();
  ctx.font = font(Math.max(11, S * 0.032), F.display);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = C.red;
  ctx.fillRect(m, h * 0.18 + l * 0.4, S * 0.025, S * 0.025);
  ctx.fillStyle = C.white;
  ctx.fillText('×1000 SLOW', m + S * 0.04, h * 0.18 + l * 0.32);
  const frames = Math.floor(bt * 24);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`89:14:${String(7 + Math.floor(bt * 2)).padStart(2, '0')}:${String(frames).padStart(2, '0')}`, w - m, h * 0.82 - l * 0.3);
  ctx.restore();
  void t;
}

function drawZone(f: Frame, cam: Cam, S: number, k: number) {
  const { ctx, w, h, B, t } = f;
  ctx.save();
  ctx.fillStyle = `rgba(13,28,21,${0.95 * k})`;
  ctx.fillRect(0, 0, w, h);
  const chalk = (a: number) => `rgba(236,242,230,${a * k})`;
  // the stands become hatching
  const hatch = (pts: V3[], seed: number) => {
    ctx.save();
    if (!poly(ctx, cam, pts)) {
      ctx.restore();
      return;
    }
    ctx.clip();
    ctx.strokeStyle = chalk(0.28);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const sp = S * 0.018;
    for (let x = -h; x < w + h; x += sp) {
      const j = (hash(x * 0.37 + seed) - 0.5) * sp * 0.6;
      ctx.moveTo(x + j, h);
      ctx.lineTo(x + h * 0.7 + j, 0);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = chalk(0.6);
    ctx.lineWidth = Math.max(1, S * 0.003);
    if (poly(ctx, cam, pts)) ctx.stroke();
  };
  for (const side of [-1, 1]) hatch([[side * 38, 0, -6], [side * 38, 0, 111], [side * 58, 18, 111], [side * 58, 18, -6]], side);
  hatch([[-40, 0, 112], [40, 0, 112], [40, 16, 130], [-40, 16, 130]], 3);
  // the pitch markings, in chalk, slightly wobbly
  ctx.strokeStyle = chalk(0.85);
  ctx.lineWidth = Math.max(1.2, S * 0.004);
  ctx.beginPath();
  line(ctx, cam, [[-34, 0, 0], [34, 0, 0], [34, 0, 105], [-34, 0, 105]], true);
  line(ctx, cam, [[-34, 0, 52.5], [34, 0, 52.5]]);
  line(ctx, cam, circle3(0, 52.5, 9.15), true);
  for (const [z0, dir] of [[0, 1], [105, -1]] as const) {
    line(ctx, cam, [[-20.16, 0, z0], [-20.16, 0, z0 + dir * 16.5], [20.16, 0, z0 + dir * 16.5], [20.16, 0, z0]]);
    line(ctx, cam, [[-9.16, 0, z0], [-9.16, 0, z0 + dir * 5.5], [9.16, 0, z0 + dir * 5.5], [9.16, 0, z0]]);
  }
  // the goal frame
  line(ctx, cam, [[-3.66, 0, 105], [-3.66, 2.44, 105], [3.66, 2.44, 105], [3.66, 0, 105]]);
  ctx.stroke();
  // everyone else is a chalk mark where they stand
  PLAYERS.forEach((pl, i) => {
    if (i === 3 || DASHED.includes(i)) return;
    const pos = playerAt(pl, B, t);
    const a = P(cam, [pos[0], 0, pos[2]]), b = P(cam, [pos[0], 1.8, pos[2]]);
    if (!a || !b) return;
    const r = Math.max(2, (cam.f * 0.45) / a[2]);
    ctx.strokeStyle = chalk(0.75);
    ctx.lineWidth = Math.max(1, r * 0.25);
    ctx.beginPath();
    ctx.ellipse(a[0], a[1], r * 1.2, r * 0.45, 0, 0, TAU);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.arc(b[0], b[1] - r * 0.6, r * 0.6, Math.PI / 2, Math.PI / 2 + TAU);
    ctx.stroke();
  });
  ctx.restore();
  // and the ones who matter, in colour, on top
  const keep: { z: number; draw: () => void }[] = [];
  [3, ...DASHED].forEach((i) => {
    const pl = PLAYERS[i];
    const pos = playerAt(pl, B, t);
    const q = toCam(cam, pos);
    if (q[2] < NEAR) return;
    keep.push({ z: q[2], draw: () => drawPlayer(ctx, cam, pl, pos, B, t, S) });
  });
  const ball = ballAt(B);
  const bq = toCam(cam, ball);
  if (bq[2] > NEAR) keep.push({ z: bq[2], draw: () => draw3DBall(ctx, cam, ball, B, t) });
  keep.sort((a, b) => b.z - a.z);
  ctx.save();
  ctx.globalAlpha = 1;
  for (const it of keep) it.draw();
  ctx.restore();
}

function drawDash(f: Frame, cam: Cam, S: number) {
  const { ctx, w, h, t } = f;
  const p = dashP;
  const prev = lastDashP;
  lastDashP = p;
  const hit = (q: number) => prev >= 0 && prev < q && p >= q && p - prev < 0.25;
  const drain = ease.inOut2(seg(p, 0.03, 0.15)) * (1 - ease.inOut2(seg(p, 0.7, 0.85)));
  if (drain > 0) {
    ctx.fillStyle = `rgba(3,5,14,${0.55 * drain})`;
    ctx.fillRect(0, 0, w, h);
  }
  // THE ZONE: for a heartbeat before the dash the stadium drains to chalk on a
  // dark board; only #10, the two defenders and the ball keep their colour
  const zone = ease.inOut2(seg(p, 0.05, 0.14)) * (1 - ease.out3(seg(p, 0.38, 0.41)));
  if (zone > 0) drawZone(f, cam, S, zone);
  const me = playerAt(PLAYERS[3], DASH_AT, t);
  const feet = P(cam, [me[0], 0.05, me[2]]);
  const chest = P(cam, [me[0], 1.2, me[2]]);
  const charge = seg(p, 0.12, 0.4) * (p < 0.4 ? 1 : 0);
  if (charge > 0 && feet && chest) {
    const r = Math.min(S * 0.12, (cam.f * 1.4) / feet[2]);
    drawCrackle(ctx, feet[0], feet[1], r, t, charge, 3);
    drawCrackle(ctx, chest[0], chest[1], r * 0.7, t, charge * 0.7, 4);
    if (Math.random() < charge) f.shake(S * 0.005 * charge);
  }
  if (hit(0.4)) {
    f.flash(0.8, GOLD.hot);
    f.shake(S * 0.045);
  }
  const path = dashPath().map((q) => P(cam, q)).filter((q): q is [number, number, number] => !!q).map((q) => [q[0], q[1]] as Pt);
  const head = ease.out3(seg(p, 0.4, 0.44));
  const after = 1 - ease.in2(seg(p, 0.46, 0.66));
  if (p >= 0.4 && after > 0 && path.length > 1) {
    const n = path.length - 1;
    const shown: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const at = i / n;
      if (at <= head) shown.push(path[i]);
      else {
        const k = (head - (i - 1) / n) * n;
        shown.push([lerp(path[i - 1][0], path[i][0], k), lerp(path[i - 1][1], path[i][1], k)]);
        break;
      }
    }
    drawBolt(ctx, shown, t, { width: S * 0.006, amp: S * 0.012, seed: 11, alpha: after, branches: 8 });
  }
  // the defenders feel it a beat late
  if (hit(0.64)) {
    f.shake(S * 0.03);
    f.flash(0.3, '#ffffff');
  }
  // broadcast caption, because of course they measured it
  const cap = seg(p, 0.5, 0.6) * (1 - seg(p, 0.9, 1));
  if (cap > 0) {
    ctx.save();
    ctx.globalAlpha = cap;
    ctx.font = font(Math.max(11, S * 0.032), F.display);
    const txt = '#10 · TOP SPEED · 0.2 SEC';
    const tw = ctx.measureText(txt).width;
    const x = 16, y = h * 0.8;
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + 3, y + 3, tw + S * 0.05, S * 0.06);
    ctx.fillStyle = GOLD.c;
    ctx.fillRect(x, y, tw + S * 0.05, S * 0.06);
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, x + S * 0.025, y + S * 0.032);
    ctx.restore();
  }
}
