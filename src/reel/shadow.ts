import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, hash, lerp, seg } from '../core/math';
import { canvas, drawSprite, glow } from '../core/sprites';
import { drawRivalsFlat } from './duel';
import { FD, craneShape, FACES } from './fold';
import { type V3, add, lookAt, mul, norm, project, rotX, rotY, sub } from './v3';

/*
 * V · SHADOW.
 *
 * In the dark after the O, one bulb. It clicks on, swinging, over a sheet
 * of paper standing in the void, and between the bulb and the paper hangs a
 * cloud of nine hundred paper shards. Their shadow is noise — until the
 * swing dies and the bulb comes to rest, and the noise snaps into a crane.
 * Flick the bulb, the shards drift, and the shadow becomes mountains under
 * a moon, then the two rivals from the first chapter, blades raised. The
 * camera walks round the side to show the trick (the shards are scattered
 * through depth; only the bulb sees the picture). Then the shards fall —
 * and the shadow stays. The light sinks into a sunset on the paper, and two
 * silhouettes stand on its horizon (chapter VI is their fight).
 */

/** local beats */
export const SH = {
  click: 0.32,
  shapes: [[1.75, 2.55], [2.95, 3.75]] as const,
  reveal: [3.95, 4.55] as const,
  back: [4.55, 5.1] as const,
  real: 5.08,
  fall: [5.12, 5.7] as const,
  sunset: [5.15, 6.0] as const,
  end: 6.2,
};

const N = 900;
// the light at rest, the pivot it hangs from
const REST: V3 = [0, 420, 700];
const PIVOT: V3 = [0, 1500, 700];
const ROPE = PIVOT[1] - REST[1];
/** the shapes live on the wall in x ∈ [-480, 480], y ∈ [0, 960] */
const MW = 240, WU = 4; // mask px, wall units per mask px
const RIVALS_B = 1.9; // the duel's opening guard
const K_RIV = 1.1; // painting units → wall units

/* ------------------------------------------------------------- the shapes */

type Paint = (g: CanvasRenderingContext2D) => void;

const toWall = (g: CanvasRenderingContext2D) => g.setTransform(1 / WU, 0, 0, -1 / WU, MW / 2, MW);

const CRANE: Paint = (g) => {
  toWall(g);
  const v = craneShape(FD.end, 0);
  const P = (p: V3): Pt => {
    const q = rotX(rotY(p, 0.62), -0.32);
    return [q[0] * 3.3 - 20, q[1] * 3.3 + 300];
  };
  g.fillStyle = '#000';
  for (const [a, b, c] of FACES) {
    const A = P(v[a]), Bp = P(v[b]), C = P(v[c]);
    g.beginPath();
    g.moveTo(...A);
    g.lineTo(...Bp);
    g.lineTo(...C);
    g.closePath();
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = '#000';
    g.stroke();
  }
};

const PEAKS: Paint = (g) => {
  toWall(g);
  g.fillStyle = '#000';
  // karst peaks, as in the scroll, and the moon over them
  const ridge: Pt[] = [[-480, 0], [-470, 170], [-420, 300], [-380, 330], [-330, 250], [-280, 420], [-235, 560], [-200, 600], [-160, 540], [-120, 380], [-60, 300], [0, 360], [40, 470], [80, 520], [120, 470], [150, 330], [210, 250], [270, 300], [320, 400], [360, 430], [400, 360], [440, 240], [480, 160], [480, 0]];
  g.beginPath();
  ridge.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p)));
  g.closePath();
  g.fill();
  g.beginPath();
  g.arc(250, 760, 105, 0, TAU);
  g.fill();
};

const RIVALS: Paint = (g) => {
  g.setTransform(K_RIV / WU, 0, 0, K_RIV / WU, MW / 2 - (500 * K_RIV) / WU, MW - (1842 * K_RIV) / WU);
  drawRivalsFlat(g, RIVALS_B, 0, '#000');
};

interface Shape { pts: Pt[]; cell: number; img: HTMLCanvasElement }
let shapes: Shape[] | null = null;

function build(paint: Paint, seed: number): Shape {
  const { c, ctx } = canvas(MW, MW);
  paint(ctx);
  const d = ctx.getImageData(0, 0, MW, MW).data;
  const on = (x: number, y: number) => {
    const xi = x | 0, yi = y | 0;
    return xi >= 0 && yi >= 0 && xi < MW && yi < MW && d[(yi * MW + xi) * 4 + 3] > 90;
  };
  let filled = 0;
  for (let i = 0; i < MW * MW; i++) if (d[i * 4 + 3] > 90) filled++;
  const step = Math.sqrt(filled / N);
  let pts: Pt[] = [];
  for (let y = 0; y < MW; y += step) {
    for (let x = 0; x < MW; x += step) {
      const k = pts.length + seed * 977;
      const px = x + hash(k) * step, py = y + hash(k + 0.5) * step;
      if (on(px, py)) pts.push([(px - MW / 2) * WU, (MW - py) * WU]);
    }
  }
  // exactly N: drop or double up (with a nudge) evenly
  while (pts.length > N) pts.splice(Math.floor(hash(pts.length + seed) * pts.length), 1);
  const base = pts.slice();
  for (let i = 0; pts.length < N; i++) {
    const p = base[Math.floor(hash(i * 3 + seed) * base.length)];
    pts.push([p[0] + (hash(i + 7) - 0.5) * step * WU, p[1] + (hash(i + 9) - 0.5) * step * WU]);
  }
  // shuffle, so a morph scrambles rather than slides
  pts = pts.map((p, i) => [hash(i * 13.1 + seed * 7), p] as const).sort((a, b) => a[0] - b[0]).map((e) => e[1]);
  return { pts, cell: step * WU, img: c };
}

function getShapes() {
  if (!shapes) shapes = [build(CRANE, 1), build(PEAKS, 2), build(RIVALS, 3)];
  return shapes;
}

/* ------------------------------------------------------------- the light */

/** the swing: a flick, a decaying swing, and rest (exactly) by each shape's moment */
function swing(L: number) {
  const kicks: [number, number, number][] = [[SH.click, 0.5, 1.3], [1.7, 0.42, 2.6], [2.9, 0.42, 3.8]];
  let a = 0;
  for (const [t0, A, rest] of kicks) {
    if (L <= t0 || L >= rest) continue;
    const u = L - t0;
    a += A * Math.exp(-u * 1.6) * Math.sin(u * 9.5) * (1 - ease.inOut2(seg(L, rest - 0.35, rest)));
  }
  return a;
}

function lightAt(L: number): V3 {
  const a = swing(L);
  const up = ease.inOut2(seg(L, SH.sunset[0] + 0.05, SH.sunset[1] - 0.2)) * 1400;
  return [Math.sin(a) * ROPE, PIVOT[1] - Math.cos(a) * ROPE + up, PIVOT[2] + Math.sin(a * 0.6) * 120];
}

/** where the shards are, and how they're turned, at L */
function shardFrame(L: number) {
  const sh = getShapes();
  const m1 = ease.inOut3(seg(L, SH.shapes[0][0], SH.shapes[0][1]));
  const m2 = ease.inOut3(seg(L, SH.shapes[1][0], SH.shapes[1][1]));
  const out: { c: V3; r: number; rot: number; tilt: number; tax: number }[] = [];
  for (let i = 0; i < N; i++) {
    const at = (k: number): V3 => {
      const q = sh[k].pts[i];
      const s = 0.3 + 0.62 * hash(i * 1.37 + k * 101);
      return add(REST, mul(sub([q[0], q[1], 0], REST), s));
    };
    const size = (k: number) => sh[k].cell * 1.2 * (0.3 + 0.62 * hash(i * 1.37 + k * 101));
    let c = at(0), r = size(0);
    if (m1 > 0) { c = lerpV(c, at(1), m1); r = lerp(r, size(1), m1); }
    if (m2 > 0) { c = lerpV(c, at(2), m2); r = lerp(r, size(2), m2); }
    // a drift through the morph so they swirl rather than slide
    const sw = Math.sin(m1 * Math.PI) + Math.sin(m2 * Math.PI);
    if (sw > 0) {
      const ang = hash(i * 5.3) * TAU;
      c = add(c, [Math.cos(ang) * 90 * sw, Math.sin(ang) * 90 * sw, (hash(i * 2.1) - 0.5) * 160 * sw]);
    }
    // the fall: the shadow has become real, so the paper drops
    const fd = L - SH.fall[0] - hash(i * 3.3) * 0.3;
    if (fd > 0) {
      const y = c[1] - 2600 * fd * fd;
      c = [c[0] + (hash(i * 8.1) - 0.5) * 200 * fd, Math.max(4, y), c[2]];
    }
    out.push({ c, r, rot: hash(i * 7.7) * TAU + (m1 + m2) * (hash(i) - 0.5) * 6 + (fd > 0 ? fd * 9 * (hash(i * 4) - 0.5) : 0), tilt: (hash(i * 9.9) - 0.5) * 0.9, tax: hash(i * 6.6) * TAU });
  }
  return out;
}
const lerpV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

function triOf(s: { c: V3; r: number; rot: number; tilt: number; tax: number }): [V3, V3, V3] {
  const ax: V3 = [Math.cos(s.tax), Math.sin(s.tax), 0];
  const out: V3[] = [];
  for (let j = 0; j < 3; j++) {
    const a = s.rot + (j * TAU) / 3;
    let v: V3 = [Math.cos(a) * s.r, Math.sin(a) * s.r, 0];
    // tilt about an axis in the plane (Rodrigues, axis ⟂ z)
    const c = Math.cos(s.tilt), sn = Math.sin(s.tilt), d = v[0] * ax[0] + v[1] * ax[1];
    v = [v[0] * c + ax[0] * d * (1 - c), v[1] * c + ax[1] * d * (1 - c), (ax[0] * v[1] - ax[1] * v[0]) * sn];
    out.push(add(s.c, v));
  }
  return out as [V3, V3, V3];
}

/** the point on the wall (z = 0) that a ray from the light through p lands on */
function onWall(Lp: V3, p: V3): V3 | null {
  const dz = Lp[2] - p[2];
  if (dz <= 1) return null;
  const t = Lp[2] / dz;
  return [Lp[0] + (p[0] - Lp[0]) * t, Lp[1] + (p[1] - Lp[1]) * t, 0];
}

/* ------------------------------------------------------------- the camera */

function camera(L: number, w: number, h: number) {
  const fl = Math.min(w, h * 0.5) * 1.9;
  const cy = h * 0.45;
  // far off in the dark (a dot), then in and round to the side
  const kIn = ease.inOut3(seg(L, SH.click, 1.25));
  const kRev = ease.inOut3(seg(L, SH.reveal[0], SH.reveal[1]));
  const kBack = ease.inOut3(seg(L, SH.back[0], SH.back[1]));
  const th = lerp(lerp(0, 0.42, kIn) + 0.55 * kRev, 0, kBack);
  const r = lerp(lerp(4900, 1750, kIn) + 150 * kRev, 1650, kBack);
  const atY = lerp(REST[1], 400, kIn);
  // round the side, the eye goes to the cloud between the bulb and the paper
  const at: V3 = [lerp(lerp(0, -30, kIn), -120, kRev) * (1 - kBack), lerp(atY, 470, kBack), lerp(lerp(0, 120, kIn), 260, kRev) * (1 - kBack)];
  const pos: V3 = [Math.sin(th) * r, lerp(REST[1], 520, kIn) - 90 * kBack, Math.cos(th) * r];
  return lookAt(pos, at, fl, w / 2, cy);
}

/* ------------------------------------------------------------- the chapter */

const off = { c: null as HTMLCanvasElement | null, ctx: null as CanvasRenderingContext2D | null };

export function drawShadow(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const cam = camera(L, w, h);
  const Lp = lightAt(L);
  // the bulb struggles, then clicks on
  const pre = L < SH.click ? (hash(Math.floor(t * 14)) < 0.25 + L * 1.5 ? 0.45 : 0.15) : 1;
  const on = L < SH.click ? 0 : 1;
  if (f.crossedFwd(f.B - L + SH.click)) f.flash(0.35, '#fff1d6');
  const sun = ease.inOut2(seg(L, SH.sunset[0], SH.sunset[1]));

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  if (on) {
    // ---- the floor and the paper wall, lit by the bulb (and then by the sunset)
    const hot: V3 = [Lp[0] * (1 - sun), lerp(Lp[1], 170, sun), 0];
    const H = project(cam, hot);
    const foot = project(cam, [Lp[0], 0, Math.min(Lp[2], 900)]);
    const fl = project(cam, [-2400, 0, 2200]), fr = project(cam, [2400, 0, 2200]), bl = project(cam, [-1500, 0, 0]), br = project(cam, [1500, 0, 0]);
    if (foot && fl && fr && bl && br) {
      const R = (1400 * cam.f) / foot[2];
      const g = ctx.createRadialGradient(foot[0], foot[1], 0, foot[0], foot[1], R);
      g.addColorStop(0, mix('#4a3a2a', '#2a1418', sun));
      g.addColorStop(0.5, mix('#1e1610', '#120a0e', sun));
      g.addColorStop(1, '#000');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bl[0], bl[1]);
      ctx.lineTo(br[0], br[1]);
      ctx.lineTo(fr[0], fr[1]);
      ctx.lineTo(fl[0], fl[1]);
      ctx.fill();
    }
    const W = [[-1500, 0], [1500, 0], [1500, 3400], [-1500, 3400]].map(([x, y]) => project(cam, [x, y, 0]));
    if (H && W.every(Boolean)) {
      const R = (1900 * cam.f) / H[2];
      const g = ctx.createRadialGradient(H[0], H[1], 0, H[0], H[1], R);
      g.addColorStop(0, mix('#f6e9cc', '#ffe2a8', sun));
      g.addColorStop(0.3, mix('#cdb48c', '#f08a45', sun));
      g.addColorStop(0.65, mix('#5e4a34', '#a0303a', sun));
      g.addColorStop(1, mix('#000000', '#2a0c26', sun));
      ctx.fillStyle = g;
      ctx.beginPath();
      W.forEach((p, i) => (i ? ctx.lineTo(p![0], p![1]) : ctx.moveTo(p![0], p![1])));
      ctx.closePath();
      ctx.fill();
      // the sun the bulb becomes, low on the paper
      if (sun > 0) {
        const r = (95 * cam.f) / H[2];
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = sun * 0.6;
        drawSprite(ctx, glow('#ff9a4a', 128), H[0], H[1], r * 8);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = ease.out2(seg(sun, 0.2, 0.7));
        ctx.fillStyle = '#fff0cf';
        ctx.beginPath();
        ctx.arc(H[0], H[1], r, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    // ---- the shadow: every shard projected from the bulb onto the paper, one union, soft-edged
    const shards = shardFrame(L);
    const tris = shards.map(triOf);
    const real = L >= SH.real;
    const sw = Math.ceil(w / 2), shh = Math.ceil(h / 2);
    if (!off.c || off.c.width !== sw || off.c.height !== shh) {
      const o = canvas(sw, shh);
      off.c = o.c;
      off.ctx = o.ctx;
    }
    const o = off.ctx!;
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, sw, shh);
    o.setTransform(0.5, 0, 0, 0.5, 0, 0);
    o.fillStyle = '#000';
    // shadows land only on the paper
    const WP = [[-1500, 0], [1500, 0], [1500, 3400], [-1500, 3400]].map(([x, y]) => project(cam, [x, y, 0]));
    o.save();
    if (WP.every(Boolean)) {
      o.beginPath();
      WP.forEach((p, i) => (i ? o.lineTo(p![0], p![1]) : o.moveTo(p![0], p![1])));
      o.closePath();
      o.clip();
    }
    if (!real) {
      // one small fill each (a single 900-part path is slower to rasterise); the layer is opaque, so overlaps don't stack
      for (const tri of tris) {
        const a = onWall(Lp, tri[0]), b = onWall(Lp, tri[1]), c = onWall(Lp, tri[2]);
        if (!a || !b || !c) continue;
        const A = project(cam, a), Bq = project(cam, b), C = project(cam, c);
        if (!A || !Bq || !C) continue;
        o.beginPath();
        o.moveTo(A[0], A[1]);
        o.lineTo(Bq[0], Bq[1]);
        o.lineTo(C[0], C[1]);
        o.fill();
      }
    }
    // the rivals' own silhouette takes over (the same picture), and stays when the paper falls
    const realK = seg(L, SH.real - 0.12, SH.real);
    if (realK > 0) {
      const img = getShapes()[2].img;
      const tl = project(cam, [-MW / 2 * WU, MW * WU, 0]), br2 = project(cam, [MW / 2 * WU, 0, 0]);
      if (tl && br2) {
        o.globalAlpha = realK;
        o.drawImage(img, tl[0], tl[1], br2[0] - tl[0], br2[1] - tl[1]);
        o.globalAlpha = 1;
      }
    }
    o.restore();
    ctx.save();
    ctx.globalAlpha = lerp(0.82, 1, sun);
    ctx.drawImage(off.c!, 0, 0, w, h);
    ctx.restore();
    // and the silhouettes harden into figures: a crisp pass over the soft one
    if (sun > 0) {
      const img = getShapes()[2].img;
      const tl = project(cam, [-MW / 2 * WU, MW * WU, 0]), br2 = project(cam, [MW / 2 * WU, 0, 0]);
      if (tl && br2) {
        ctx.save();
        ctx.globalAlpha = sun;
        ctx.drawImage(img, tl[0], tl[1], br2[0] - tl[0], br2[1] - tl[1]);
        ctx.restore();
      }
    }

    // ---- the shards themselves, catching the bulb
    // grouped by tone so the fill colour changes ten times, not nine hundred
    const TONES = 10;
    const groups: number[][][] = Array.from({ length: TONES }, () => []);
    for (const [i, s] of shards.entries()) {
      const tri = tris[i];
      const A = project(cam, tri[0]), Bq = project(cam, tri[1]), C = project(cam, tri[2]);
      if (!A || !Bq || !C) continue;
      const n = norm(crossV(sub(tri[1], tri[0]), sub(tri[2], tri[0])));
      const toL = norm(sub(Lp, s.c));
      const dist = Math.hypot(...sub(Lp, s.c));
      const lit = Math.abs(n[0] * toL[0] + n[1] * toL[1] + n[2] * toL[2]) * clamp(900 / dist, 0, 1.4) * (1 - sun * 0.7);
      groups[Math.min(TONES - 1, Math.floor(clamp(lit) * TONES))].push([A[0], A[1], Bq[0], Bq[1], C[0], C[1]]);
    }
    groups.forEach((g, i) => {
      const k = 0.1 + 0.55 * ((i + 0.5) / TONES);
      ctx.fillStyle = `rgb(${(246 * k) | 0},${(232 * k) | 0},${(204 * k) | 0})`;
      for (const q of g) {
        ctx.beginPath();
        ctx.moveTo(q[0], q[1]);
        ctx.lineTo(q[2], q[3]);
        ctx.lineTo(q[4], q[5]);
        ctx.fill();
      }
    });
  }

  // ---- the bulb on its cord
  drawBulb(ctx, cam, Lp, on ? 1 : pre, L, w, h, sun);
}

const crossV = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function drawBulb(ctx: CanvasRenderingContext2D, cam: ReturnType<typeof lookAt>, Lp: V3, power: number, L: number, w: number, h: number, sun: number) {
  const b = project(cam, Lp);
  if (!b) return;
  const fade = 1 - sun;
  if (fade <= 0) return;
  const r = (26 * cam.f) / b[2];
  ctx.save();
  ctx.globalAlpha = fade;
  // the cord, up out of the frame
  if (L >= SH.click) {
    const top = project(cam, [PIVOT[0], PIVOT[1] + 2000, PIVOT[2]]);
    if (top) {
      ctx.strokeStyle = '#2a2219';
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(b[0], b[1] - r);
      ctx.lineTo(top[0], top[1]);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  if (L < SH.click) {
    // the dot the last chapter left, stuttering
    ctx.globalAlpha = 0.7 * power + 0.1;
    drawSprite(ctx, glow('#ffcf7a', 64), b[0], b[1], 70);
    ctx.globalAlpha = 1;
    drawSprite(ctx, glow('#fff4dc', 32), b[0], b[1], 8 + power * 6);
  } else {
    ctx.globalAlpha = 0.55 * fade;
    drawSprite(ctx, glow('#ffcf7a', 128), b[0], b[1], r * 14);
    ctx.globalAlpha = fade;
    drawSprite(ctx, glow('#fff6e0', 64, 0.35), b[0], b[1], r * 2.6);
  }
  ctx.restore();
  void w;
  void h;
}

function mix(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], clamp(k)))).join(',')})`;
}

/** where the rivals stand at the end of the chapter, on screen: chapter VI starts from this */
export function rivalsOnScreen(w: number, h: number) {
  const cam = camera(SH.end, w, h);
  const p = (x: number, y: number) => project(cam, [x, y, 0])!;
  // painting units → screen: the duel's x = 500 and its ground (1842) map to wall x = 0, y = 0
  const o = p(0, 0), u = p(100, 0);
  const k = ((u[0] - o[0]) / 100) * K_RIV;
  return { x0: o[0], y0: o[1], k, sun: p(0, 170), sunR: (95 * cam.f) / p(0, 170)[2] };
}
