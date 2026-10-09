import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, hash, lerp, rng, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { drawInk, inkToScreen } from './ink';
import { BIRDS, birdAt, hideBirds, mixHex } from './painting';

/*
 * II · FLOCK.
 *
 * The little ink birds lift off the finished scroll into a real dusk, and
 * multiply: a murmuration of thousands of starlings, one living cloud that
 * flows into shapes — a billow, a rolling wave, a whale that swims across
 * the sky, a turning vortex — and finally packs itself into one flat square
 * that turns to paper (chapter III folds it).
 *
 * Every bird is a point in 3D, projected through a camera, so near birds are
 * bigger and darker and far ones fade into the haze. A shape change sweeps
 * across the flock like the ripple through a real murmuration instead of
 * everyone moving at once. Positions are a pure function of the scroll and
 * the clock, so scrolling back un-flies it.
 */

export const N = 3000;
const D = 1000;

/** local beats */
export const M = {
  /** the painting slides away below, the painted birds come alive */
  lift: [0.15, 1.1] as const,
  spawn: [0.25, 0.9] as const,
  wave: [1.9, 2.8] as const,
  whale: [3.2, 4.1] as const,
  vortex: [4.9, 5.5] as const,
  sheet: [6.0, 6.85] as const,
  /** the birds have become paper */
  paper: [6.42, 6.85] as const,
  end: 7.6,
};

/** the square the flock packs into, on screen: chapter III starts from exactly this */
export function sheetRect(w: number, h: number) {
  const S = Math.min(w, h);
  return { cx: w / 2, cy: h * 0.45, side: S * 0.62 };
}

/* ------------------------------------------------------------- shapes */

type Shape = Float32Array; // N × 3

const KEY = (x: number, y: number) => x * 0.8 + y * 0.6;

/** order a shape's points along one diagonal, so bird i sits in the same part of every shape */
function ranked(pts: [number, number, number][]): Shape {
  pts.sort((a, b) => KEY(a[0], a[1]) - KEY(b[0], b[1]));
  const out = new Float32Array(N * 3);
  pts.forEach((p, i) => out.set(p, i * 3));
  return out;
}

function sphere(r: () => number): [number, number, number] {
  // a random direction (rejection in the cube)
  for (;;) {
    const x = r() * 2 - 1, y = r() * 2 - 1, z = r() * 2 - 1;
    const d = x * x + y * y + z * z;
    if (d > 0.01 && d <= 1) {
      const k = 1 / Math.sqrt(d);
      return [x * k, y * k, z * k];
    }
  }
}

function makeCloud(): Shape {
  const r = rng(101);
  const lobes = [[-170, -30, 0, 250], [150, 30, 60, 220], [20, -110, -80, 200], [-40, 80, 40, 160]];
  return ranked(Array.from({ length: N }, () => {
    const [cx, cy, cz, R] = lobes[Math.floor(r() * lobes.length)];
    const [dx, dy, dz] = sphere(r);
    const rr = R * Math.cbrt(r());
    return [cx + dx * rr * 1.1, cy + dy * rr * 0.62, cz + dz * rr];
  }));
}

function makeWave(): Shape {
  const r = rng(202);
  return ranked(Array.from({ length: N }, () => {
    const s = r();
    const x = lerp(-640, 640, s);
    const base = 120 * Math.sin(s * TAU * 1.1 + 0.6);
    const R = 34 + 46 * Math.sin(s * Math.PI);
    const th = r() * TAU, rr = R * Math.sqrt(r());
    return [x, base + Math.cos(th) * rr, Math.sin(th) * rr];
  }));
}

// a humpback in profile: head left, flukes right (world units, y down)
const WHALE: Pt[] = [
  [-560, 12], [-525, -48], [-430, -96], [-260, -122], [-60, -116], [150, -92], [300, -58], [420, -28], [498, -14],
  [552, -70], [600, -122], [645, -112], [600, -30], [655, 52], [612, 70], [528, 18],
  [410, 38], [210, 80], [0, 102], [-200, 98], [-380, 72], [-500, 44],
];
const FIN: Pt[] = [[-270, 58], [-180, 150], [-130, 196], [-150, 120], [-200, 80]];

function inside(poly: Pt[], x: number, y: number) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function makeWhale(): Shape {
  const r = rng(303);
  const pts: [number, number, number][] = [];
  while (pts.length < N) {
    const x = lerp(-570, 660, r()), y = lerp(-130, 200, r());
    const fin = inside(FIN, x, y);
    if (!inside(WHALE, x, y) && !fin) continue;
    const thick = fin ? 18 : 150 * Math.max(0.12, 1 - Math.abs(x + 60) / 640);
    pts.push([x, y, (r() * 2 - 1) * thick]);
  }
  return ranked(pts);
}

function makeVortex(): Shape {
  const r = rng(404);
  return ranked(Array.from({ length: N }, () => {
    const y = lerp(-520, 430, r());
    // a twister: wide where it meets the sky, narrow at the ground
    const R = 30 + ((430 - y) / 950) ** 1.7 * 430;
    const th = r() * TAU, rr = R * (0.82 + r() * 0.18);
    return [Math.cos(th) * rr, y, Math.sin(th) * rr];
  }));
}

function makeSheet(side: number, oy: number): Shape {
  const g = Math.ceil(Math.sqrt(N));
  const pts: [number, number, number][] = [];
  for (let i = 0; i < N; i++) {
    const ix = i % g, iy = Math.floor(i / g);
    pts.push([((ix + 0.5) / g - 0.5) * side, ((iy + 0.5) / g - 0.5) * side + oy, 0]);
  }
  return ranked(pts);
}

let shapes: { cloud: Shape; wave: Shape; whale: Shape; vortex: Shape; sheet: Shape; key: string } | null = null;
function build(w: number, h: number) {
  const key = `${w}x${h}`;
  if (shapes?.key === key) return shapes;
  const S = Math.min(w, h);
  const sr = sheetRect(w, h);
  // world units at z = 0: 1000 across the shorter side
  const k = S / 1000;
  shapes = {
    cloud: shapes?.cloud ?? makeCloud(),
    wave: shapes?.wave ?? makeWave(),
    whale: shapes?.whale ?? makeWhale(),
    vortex: shapes?.vortex ?? makeVortex(),
    sheet: makeSheet(sr.side / k, (sr.cy - h * 0.42) / k),
    key,
  };
  return shapes;
}

/* --------------------------------------------- how each shape lives */

const tmp = new Float32Array(3);

/** the live position of bird i in a shape at clock t (writes tmp) */
function live(sh: Shape, which: string, i: number, t: number) {
  let x = sh[i * 3], y = sh[i * 3 + 1], z = sh[i * 3 + 2];
  if (which === 'wave') {
    // the tube rolls about its own length
    const s = (x + 640) / 1280;
    const base = 120 * Math.sin(s * TAU * 1.1 + 0.6 + t * 0.7);
    const dy = y - 120 * Math.sin(s * TAU * 1.1 + 0.6), a = t * 1.3 + s * 3;
    const c = Math.cos(a), sn = Math.sin(a);
    y = base + dy * c - z * sn;
    z = dy * sn + z * c;
  } else if (which === 'whale') {
    // the flukes beat, the body undulates, the whole whale yaws as it swims
    const tail = clamp((x + 60) / 700);
    y += Math.sin(t * 2.0 - x * 0.004) * 52 * tail * tail;
    const yaw = Math.sin(t * 0.35) * 0.35;
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    const nx = x * c - z * sn;
    z = x * sn + z * c;
    x = nx;
  } else if (which === 'vortex') {
    const R = Math.hypot(x, z);
    const a = Math.atan2(z, x) + t * 1.8 * (520 / (R + 160));
    // the column sways as it turns
    x = Math.cos(a) * R + Math.sin(y * 0.004 + t * 0.9) * 70;
    z = Math.sin(a) * R;
  }
  tmp[0] = x; tmp[1] = y; tmp[2] = z;
}

/* ------------------------------------------------------------- the sky */

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

/* ------------------------------------------------------------- the flock */

/** where the flock is centred (world units), as the chapter plays */
const CENTRE: [number, number, number][] = [
  [0.8, -170, -300], [1.6, -70, -150], [2.4, 0, -80], [3.4, 20, -60], [4.4, -10, -40], [5.4, 0, -60], [6.6, 0, 0], [99, 0, 0],
];
function centreAt(L: number): Pt {
  let i = 0;
  while (i < CENTRE.length - 2 && CENTRE[i + 1][0] <= L) i++;
  const a = CENTRE[i], b = CENTRE[i + 1];
  const k = ease.inOut2(clamp((L - a[0]) / (b[0] - a[0])));
  return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
}

// the sequence of shapes and the windows between them
const STEPS: { from: keyof typeof SHAPE_OF; to: keyof typeof SHAPE_OF; w: readonly [number, number] }[] = [
  { from: 'cloud', to: 'wave', w: M.wave },
  { from: 'wave', to: 'whale', w: M.whale },
  { from: 'whale', to: 'vortex', w: M.vortex },
  { from: 'vortex', to: 'sheet', w: M.sheet },
];
const SHAPE_OF = { cloud: 0, wave: 1, whale: 2, vortex: 3, sheet: 4 };
const FLOW = { cloud: 46, wave: 18, whale: 9, vortex: 14, sheet: 0 };

const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);

export function drawMurmur(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const S = Math.min(w, h);
  const sh = build(w, h);
  const fl = S; // focal length: 1000 world units across the shorter side at z = 0
  const cx = w / 2, cy = h * 0.42;
  const k0 = fl / D;

  drawSky(f);

  // ---- the lift: the finished scroll slides away below, the painted birds come alive
  const lift = ease.in3(seg(L, M.lift[0], M.lift[1]));
  const inkB = f.B - L; // the ink chapter's last beat
  if (lift < 1) {
    hideBirds(L > M.spawn[0]);
    const dy = lift * h * 1.15;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, dy, w, h);
    ctx.clip();
    ctx.translate(0, dy);
    drawInk({ ...f, B: inkB, crossed: () => false, crossedFwd: () => false });
    ctx.restore();
    // the paper's top edge melts into the sky
    const fade = ctx.createLinearGradient(0, dy - S * 0.25, 0, dy + S * 0.05);
    fade.addColorStop(0, 'rgba(240,196,143,0)');
    fade.addColorStop(1, `rgba(221,212,194,${lift > 0 ? 1 : 0})`);
    if (lift > 0) {
      ctx.fillStyle = fade;
      ctx.fillRect(0, dy - S * 0.25, w, S * 0.3);
    }
    if (L < M.spawn[0]) return;
  }
  hideBirds(false);

  // where the painted birds were, in world units (they slide with the painting)
  const seeds: Pt[] = [];
  for (let j = 0; j < BIRDS; j++) {
    const [bx, by] = birdAt(j, t);
    const [sx, sy] = inkToScreen(f, bx, by, inkB);
    seeds.push([(sx - cx) / k0, (sy + lift * h * 1.15 - cy) / k0]);
  }

  // ---- which shapes, and how far between them
  let step = -1;
  for (let s = 0; s < STEPS.length; s++) if (L >= STEPS[s].w[0]) step = s;
  const [ccx, ccy] = centreAt(L);

  for (let i = 0; i < N; i++) {
    const d = i / N;
    let x: number, y: number, z: number, flow: number;
    if (step < 0) {
      // born at a painted bird, flying out into the cloud
      live(sh.cloud, 'cloud', i, t);
      const tx = tmp[0] + ccx, ty = tmp[1] + ccy, tz = tmp[2];
      const born = M.spawn[0] + (M.spawn[1] - M.spawn[0]) * d ** 0.7;
      if (L < born) { pz[i] = NaN; continue; }
      const u = ease.inOut2(clamp((L - born) / 0.55));
      const sd = seeds[i % BIRDS];
      const jx = (hash(i * 1.3) - 0.5) * 60 * u, jy = (hash(i * 2.7) - 0.5) * 40 * u;
      x = lerp(sd[0] + jx, tx, u);
      y = lerp(sd[1] + jy, ty, u) - Math.sin(u * Math.PI) * 120 * hash(i);
      z = lerp(0, tz, u);
      flow = FLOW.cloud * u;
    } else {
      const st = STEPS[step];
      const s = seg(L, st.w[0], st.w[1]);
      // the change sweeps across the flock
      const u = ease.inOut2(clamp((s - d * 0.45) / 0.55));
      live(sh[st.from], st.from, i, t);
      const ax = tmp[0], ay = tmp[1], az = tmp[2];
      live(sh[st.to], st.to, i, t);
      const swirl = Math.sin(u * Math.PI) * (st.to === 'sheet' ? 60 : 140);
      const sa = hash(i * 3.1) * TAU;
      x = lerp(ax, tmp[0], u) + Math.cos(sa) * swirl;
      y = lerp(ay, tmp[1], u) + Math.sin(sa) * swirl * 0.6;
      z = lerp(az, tmp[2], u) + Math.sin(sa * 2) * swirl;
      flow = lerp(FLOW[st.from], FLOW[st.to], u);
      if (st.to !== 'sheet') { x += ccx; y += ccy; }
      else { x += ccx * (1 - u); y += ccy * (1 - u); }
    }
    if (flow > 0) {
      x += Math.sin(y * 0.006 + t * 0.9 + 1.3) * flow;
      y += Math.sin(x * 0.005 - t * 0.7) * flow * 0.7;
      z += Math.sin((x + y) * 0.004 + t * 0.6) * flow;
    }
    px[i] = x; py[i] = y; pz[i] = z;
  }

  // ---- draw: far to near in three bands of haze; the sheet turns the birds to paper
  const paper = seg(L, M.paper[0], M.paper[1]);
  const sheetK = ease.inOut2(seg(L, M.sheet[0] + 0.42, M.sheet[1]));
  const g = Math.ceil(Math.sqrt(N));
  const cell = (sheetRect(w, h).side / g) * 1.08;
  const bands: [number, number, string, number][] = [[200, 9999, '#3a3040', 0.55], [-120, 200, '#221a26', 0.8], [-9999, -120, '#120d14', 0.95]];
  for (const [z0, z1, col, al] of bands) {
    ctx.save();
    ctx.globalAlpha = al + (1 - al) * sheetK;
    ctx.fillStyle = ctx.strokeStyle = mixHex(col, '#f3eee3', paper);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const dots = new Path2D(), wings = new Path2D();
    let lw = 1;
    for (let i = 0; i < N; i++) {
      const z = pz[i];
      if (!(z >= z0 && z < z1)) continue;
      const kk = fl / (z + D);
      const sx = cx + px[i] * kk, sy = cy + py[i] * kk;
      if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
      if (sheetK > 0) {
        // packing into the sheet: each bird grows into its tile
        const sz = lerp(2, cell, sheetK);
        dots.rect(sx - sz / 2, sy - sz / 2, sz, sz);
        continue;
      }
      const span = 7 * kk;
      if (span < 2.2) {
        dots.rect(sx - span * 0.4, sy - span * 0.25, span * 0.8, span * 0.5);
      } else {
        const flap = Math.sin(t * 13 + hash(i) * TAU) * span * 0.45;
        wings.moveTo(sx - span, sy - flap);
        wings.lineTo(sx, sy + span * 0.18);
        wings.lineTo(sx + span, sy - flap);
        lw = Math.max(lw, span * 0.24);
      }
    }
    ctx.fill(dots);
    ctx.lineWidth = Math.min(lw, 3);
    ctx.stroke(wings);
    ctx.restore();
  }

  // ---- the finished sheet: crisp paper, a soft shadow on the evening light
  if (paper >= 1) {
    const sr = sheetRect(w, h);
    ctx.save();
    ctx.fillStyle = 'rgba(40,24,30,0.18)';
    ctx.fillRect(sr.cx - sr.side / 2 + S * 0.012, sr.cy - sr.side / 2 + S * 0.02, sr.side, sr.side);
    ctx.fillStyle = '#f3eee3';
    ctx.fillRect(sr.cx - sr.side / 2, sr.cy - sr.side / 2, sr.side, sr.side);
    ctx.restore();
  }
}
