import { drawBlot } from '../core/blot';
import { drawBolt } from '../core/bolt';
import { brush, ensoPath } from '../core/brush';
import type { Frame } from '../core/frame';
import { ALTER_AT } from '../core/holds';
import { type Pt, TAU, bell, clamp, ease, hash, lerp, noise1, rng, seg } from '../core/math';
import { canvas, drawSprite, glow, withAlpha } from '../core/sprites';
import { F, font } from '../core/style';
import { starOnScreen } from './match';
import { drawWarrior } from './warrior';

/*
 * III · ALTER.
 *
 * The film's set piece, cut like an episode of anime: eighteen shots, hard
 * cuts between them, close-ups, impact frames, speed lines. The blue warrior
 * comes back corrupted, a black knight with red light running through
 * them, against a beast made of living ink that drops out of a target ring
 * in a bruised purple sky. It plays inside a hold, so its own progress (p)
 * runs 0→1 while the rest of the film waits at the edge of the night sky.
 *
 * Everything is a function of p (the scroll) and t (the clock), so scrolling
 * back plays the fight in reverse and holding still keeps the embers rising.
 */

export const RED = { deep: '#7a0014', c: '#ff1f3d', hot: '#ff7486', core: '#fff1f3' };
export const VIOLET = { deep: '#2a0a66', c: '#7b3cff', hot: '#b892ff', core: '#f1e9ff' };
const K = {
  sky0: '#06030c', sky1: '#1a0e2c', sky2: '#2e1a48', ink: '#050307', floor: '#07040b',
  moon: '#6a0f22', ash: '#3a3346',
};

/* ---------------------------------------------------------------- shots */

type Shot = { name: string; dur: number; draw: (g: G, q: number) => void };

interface G {
  f: Frame;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  S: number;
  t: number;
  portrait: boolean;
}

const SHOTS: Shot[] = [
  { name: 'corrupt', dur: 0.9, draw: shotCorrupt },
  { name: 'title', dur: 0.6, draw: shotTitle },
  { name: 'wide', dur: 1.0, draw: shotWide },
  { name: 'feet', dur: 0.45, draw: shotFeet },
  { name: 'sword', dur: 0.6, draw: shotSword },
  { name: 'eyes', dur: 0.5, draw: shotEyes },
  { name: 'ring', dur: 0.65, draw: shotRing },
  { name: 'impact', dur: 0.75, draw: shotImpact },
  { name: 'roar', dur: 0.5, draw: shotRoar },
  { name: 'standoff', dur: 0.5, draw: shotStandoff },
  { name: 'dash', dur: 0.38, draw: shotDash },
  { name: 'clash', dur: 0.6, draw: shotClash },
  { name: 'slashes', dur: 0.7, draw: shotSlashes },
  { name: 'tendrils', dur: 0.75, draw: shotTendrils },
  { name: 'charge', dur: 1.0, draw: shotCharge },
  { name: 'beam', dur: 1.2, draw: shotBeam },
  { name: 'after', dur: 0.75, draw: shotAfter },
  { name: 'exit', dur: 0.5, draw: shotExit },
];
const TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0);

let lastShot = -1;
let lastQ = 0;

export function drawAlter(f: Frame, p: number) {
  const { ctx, w, h, t } = f;
  const g: G = { f, ctx, w, h, S: Math.min(w, h), t, portrait: h > w };
  // which shot, and how far through it
  let acc = 0, i = 0;
  const at = clamp(p) * TOTAL;
  while (i < SHOTS.length - 1 && acc + SHOTS[i].dur <= at) acc += SHOTS[i++].dur;
  const q = clamp((at - acc) / SHOTS[i].dur);
  // a hard cut lands with a jolt
  if (i !== lastShot && lastShot >= 0 && Math.abs(i - lastShot) === 1 && !f.reduced) f.shake(g.S * 0.008);
  const prevQ = i === lastShot ? lastQ : -1;
  lastShot = i;
  lastQ = q;
  hitQ = (x: number) => prevQ >= 0 && prevQ < x && q >= x;
  ctx.save();
  SHOTS[i].draw(g, q);
  ctx.restore();
  // embers and ash in front of every shot but the black title
  if (SHOTS[i].name !== 'title') drawEmbers(g, i === 0 ? ease.inOut2(seg(q, 0.3, 1)) : SHOTS[i].name === 'exit' ? 1 - q : 1);
  // the cut itself: a frame of red-tinted overexposure on every new shot
  if (i > 0 && SHOTS[i].name !== 'exit') cutFlash(g, q / 0.06);
  void t;
}

let hitQ: (x: number) => boolean = () => false;

/* ------------------------------------------------------- shared: world */

let spireCache: { key: string; c: HTMLCanvasElement } | null = null;
function spires(w: number, h: number) {
  const key = `${w}x${h}`;
  if (spireCache?.key === key) return spireCache.c;
  const W = Math.ceil(w * 1.8), H = Math.ceil(h * 0.5);
  const { c, ctx } = canvas(W, H);
  const r = rng(66);
  const base = H * 0.92;
  ctx.fillStyle = '#0b0614';
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, base - H * 0.2);
  let x = 0;
  while (x < W) {
    const kind = r();
    if (kind < 0.35) {
      // a spire
      const sw = W * (0.012 + r() * 0.02), sh = H * (0.35 + r() * 0.55);
      ctx.lineTo(x, base - H * 0.18);
      ctx.lineTo(x + sw * 0.5, base - H * 0.18 - sh);
      ctx.lineTo(x + sw, base - H * 0.18);
      x += sw;
    } else if (kind < 0.6) {
      // a ruined wall with broken teeth
      const ww = W * (0.04 + r() * 0.06), wh = H * (0.15 + r() * 0.15);
      for (let k = 0; k < 6; k++) {
        ctx.lineTo(x + (ww * k) / 6, base - wh - (k % 2 ? r() * H * 0.04 : 0));
      }
      x += ww;
    } else {
      // a hill
      const hw = W * (0.05 + r() * 0.08);
      ctx.quadraticCurveTo(x + hw / 2, base - H * (0.2 + r() * 0.25), x + hw, base - H * 0.15);
      x += hw;
    }
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  // faint red rim along the top edge, lit by the moon
  ctx.globalCompositeOperation = 'source-atop';
  const gr = ctx.createLinearGradient(0, base - H * 0.9, 0, base);
  gr.addColorStop(0, 'rgba(255,40,70,0.25)');
  gr.addColorStop(0.5, 'rgba(255,40,70,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, H);
  spireCache = { key, c };
  return c;
}

const MOON_ENSO = ensoPath(0, 0, 100, 4, 0.93, -2.3);

interface Cam { x: number; y: number; z: number; rot?: number }

/** the corrupted world, parallaxed by depth around a camera */
function world(g: G, cam: Cam, o: { horizon?: number; moon?: boolean; tint?: number } = {}) {
  const { ctx, w, h, S, t } = g;
  const hz = h * (o.horizon ?? 0.62);
  const layer = (d: number, fn: () => void) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((cam.rot ?? 0) * d);
    ctx.scale(1 + (cam.z - 1) * d, 1 + (cam.z - 1) * d);
    ctx.translate(-w / 2 - cam.x * S * d, -h / 2 - cam.y * S * d);
    fn();
    ctx.restore();
  };
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, K.sky0);
  sky.addColorStop(0.6, K.sky1);
  sky.addColorStop(1, K.sky2);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  if (o.moon !== false) {
    layer(0.08, () => {
      const mx = w * 0.74, my = h * 0.2, mr = S * 0.1;
      ctx.globalAlpha = 0.5;
      drawSprite(ctx, glow(RED.c, 128), mx, my, mr * 6);
      ctx.globalAlpha = 1;
      ctx.fillStyle = K.moon;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(t * 0.03);
      ctx.scale((mr * 1.08) / 100, (mr * 1.08) / 100);
      brush(ctx, MOON_ENSO, { width: 14, color: '#000000', dry: 0.45, seed: 9, press: 1.4, alpha: 0.9 });
      ctx.restore();
    });
  }
  // clouds, drifting
  layer(0.2, () => {
    for (let i = 0; i < 6; i++) {
      const x = ((t * (4 + i) + i * w * 0.37) % (w * 1.8)) - w * 0.4;
      const y = h * (0.08 + (i % 3) * 0.12);
      ctx.globalAlpha = 0.55;
      drawSprite(ctx, glow('#1d1230', 128), x, y, S * (1.2 + (i % 2) * 0.5), S * 0.35);
    }
    ctx.globalAlpha = 1;
  });
  // spires
  layer(0.35, () => {
    const sp = spires(w, h);
    ctx.drawImage(sp, -w * 0.4, hz - sp.height * 0.92);
  });
  // mist on the horizon
  layer(0.5, () => {
    for (let i = 0; i < 4; i++) {
      const x = ((t * (10 + i * 4) + i * w * 0.5) % (w * 1.6)) - w * 0.3;
      ctx.globalAlpha = 0.35;
      drawSprite(ctx, glow('#4a2e72', 128), x, hz - S * 0.02, S * 1.4, S * 0.22);
    }
    ctx.globalAlpha = 1;
  });
  // floor: black water that holds the red light
  layer(0.8, () => {
    const fl = ctx.createLinearGradient(0, hz, 0, h * 1.4);
    fl.addColorStop(0, '#120a1c');
    fl.addColorStop(0.2, K.floor);
    fl.addColorStop(1, '#020103');
    ctx.fillStyle = fl;
    ctx.fillRect(-w, hz, w * 3, h * 2);
    // reflection of the moon
    ctx.globalAlpha = 0.25;
    drawSprite(ctx, glow(RED.c, 64), w * 0.74, hz + S * 0.12, S * 0.12, S * 0.5);
    ctx.globalAlpha = 1;
  });
  if (o.tint) {
    ctx.fillStyle = `rgba(120,0,30,${o.tint})`;
    ctx.fillRect(0, 0, w, h);
  }
  return { layer, hz };
}

/* ---------------------------------------------------- shared: the knight */

/** the black blade with red runes; `lit` ignites the rings from the hilt out */
function blade(g: G, hx: number, hy: number, a: number, L: number, lit: number, glowK = 1) {
  const { ctx, S, t } = g;
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const wb = L * 0.055;
  const pt = (s: number, o: number): Pt => [hx + dx * s * L + nx * o, hy + dy * s * L + ny * o];
  // glow first
  if (lit > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * lit * glowK;
    const mid = pt(0.5, 0);
    ctx.translate(mid[0], mid[1]);
    ctx.rotate(a);
    drawSprite(ctx, glow(RED.c, 128), 0, 0, L * 1.3, wb * 6);
    ctx.restore();
  }
  // the blade: long, heavy, tapering to a point
  const bg = ctx.createLinearGradient(hx + nx * wb, hy + ny * wb, hx - nx * wb, hy - ny * wb);
  bg.addColorStop(0, '#3a2a52');
  bg.addColorStop(0.45, '#0d0814');
  bg.addColorStop(0.55, '#0d0814');
  bg.addColorStop(1, '#241833');
  ctx.fillStyle = bg;
  ctx.beginPath();
  const p0 = pt(0.08, wb), p1 = pt(0.92, wb * 0.8), p2 = pt(1, 0), p3 = pt(0.92, -wb * 0.8), p4 = pt(0.08, -wb);
  ctx.moveTo(p0[0], p0[1]);
  ctx.lineTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.lineTo(p3[0], p3[1]);
  ctx.lineTo(p4[0], p4[1]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = withAlpha('#9a7fd0', 0.85);
  ctx.lineWidth = Math.max(1, wb * 0.08);
  ctx.stroke();
  // the fuller: a red channel that fills from the hilt
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const f0 = pt(0.12, 0), f1 = pt(lerp(0.12, 0.88, lit), 0);
  ctx.strokeStyle = RED.c;
  ctx.lineWidth = wb * 0.35;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(f0[0], f0[1]);
  ctx.lineTo(f1[0], f1[1]);
  ctx.stroke();
  ctx.strokeStyle = RED.core;
  ctx.lineWidth = wb * 0.1;
  ctx.stroke();
  // rings near the guard, igniting in turn
  for (let k = 0; k < 5; k++) {
    const on = clamp((lit - k * 0.12) / 0.15);
    if (on <= 0) continue;
    const c = pt(0.16 + k * 0.065, 0);
    const pulse = 1 + Math.sin(t * 6 - k) * 0.08;
    ctx.globalAlpha = on;
    ctx.strokeStyle = RED.hot;
    ctx.lineWidth = Math.max(1, wb * 0.16);
    ctx.beginPath();
    ctx.ellipse(c[0], c[1], wb * 0.55 * pulse, wb * 0.55 * pulse, a, 0, TAU);
    ctx.stroke();
    drawSprite(ctx, glow(RED.c, 64), c[0], c[1], wb * 3 * on);
  }
  ctx.restore();
  // guard and grip
  const gA = pt(0, wb * 2.2), gB = pt(0, -wb * 2.2);
  ctx.strokeStyle = '#1b1222';
  ctx.lineWidth = wb * 0.7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(gA[0], gA[1]);
  ctx.lineTo(gB[0], gB[1]);
  ctx.stroke();
  const gr = pt(-0.16, 0);
  ctx.lineWidth = wb * 0.6;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(gr[0], gr[1]);
  ctx.stroke();
  void S;
}

/** the corrupted knight: the warrior body, a red rim, red veins pulsing */
function knight(g: G, hx: number, hy: number, a: number, s: number, foeX: number, groundY: number, o: { lit?: number; veins?: number; alpha?: number; vx?: number } = {}) {
  const { ctx, t } = g;
  const wi = { hilt: [hx, hy] as Pt, a, foeX, s, groundY, color: RED.c, t, vx: o.vx ?? 0, vy: 0, seed: 7, alpha: o.alpha ?? 1 };
  // a violet backlight so the black silhouette reads against the night
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55 * (o.alpha ?? 1);
  drawSprite(ctx, glow(VIOLET.c, 128), hx - Math.cos(a) * s * 0.1, hy + s * 0.05, s * 1.3, s * 1.9);
  ctx.restore();
  const k = drawWarrior(ctx, wi);
  const veins = o.veins ?? 1;
  if (veins > 0) {
    // veins of red light along the limbs and down the chest
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.6 + 0.4 * Math.sin(t * 5);
    const paths: Pt[][] = [
      [k.shoulder, k.elbow1, k.hand1],
      [k.chest, k.pelvis],
      [k.pelvis, k.kneeF, k.footF],
      [k.pelvis, k.kneeB, k.footB],
    ];
    paths.forEach((pp, i) => {
      drawBolt(ctx, pp, t * 0.3, { width: s * 0.004, amp: s * 0.02, seed: 40 + i, alpha: veins * pulse * (o.alpha ?? 1), branches: 2, pal: RED });
    });
    ctx.restore();
  }
  blade(g, hx, hy, a, s * 0.95, o.lit ?? 1);
  // the pool of red light under them
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 * (o.alpha ?? 1);
  drawSprite(ctx, glow(RED.c, 128), k.pelvis[0], groundY, s * 1.8, s * 0.35);
  ctx.restore();
  return k;
}

/* ------------------------------------------------------ shared: the beast */

interface BeastPose {
  /** arm reaching toward the knight: 0 hanging, 1 raised, 2 struck down */
  arm: number;
  /** jaw open 0..1 */
  roar: number;
  /** 0..1 wobble of the ink surface */
  boil: number;
  /** 0..1 the beam eating it away */
  dissolve: number;
  /** facing: -1 = toward the left */
  face: number;
  wounds: number;
}

/**
 * A hulk of living ink, drawn as a crowd of wobbling blobs with a purple
 * rim, red veins, red eyes. (x, y) is between the feet; `s` its height.
 */
function beast(g: G, x: number, y: number, s: number, pose: Partial<BeastPose>) {
  const { ctx, t } = g;
  const P: BeastPose = { arm: 0, roar: 0, boil: 0.4, dissolve: 0, face: -1, wounds: 0, ...pose };
  const fx = P.face;
  // body parts in local units: [x, y, r] with y up negative
  const breathe = Math.sin(t * 1.8) * 0.01;
  const reach = P.arm;
  const shoulderF: Pt = [0.32 * fx, -0.64 + breathe];
  const upper = 0.34, fore = 0.32;
  // angles in "forward space": 0 points at the knight, +π/2 down, -π/2 up
  const aU = reach <= 1 ? lerp(Math.PI * 0.42, -Math.PI * 0.62, ease.inOut2(clamp(reach))) : lerp(-Math.PI * 0.62, Math.PI * 0.12, ease.out3(clamp(reach - 1)));
  const aF = aU + (reach <= 1 ? lerp(0.35, -0.5, clamp(reach)) : lerp(-0.5, 0.1, clamp(reach - 1)));
  const elbow: Pt = [shoulderF[0] + Math.cos(aU) * upper * fx, shoulderF[1] + Math.sin(aU) * upper];
  const fist: Pt = [elbow[0] + Math.cos(aF) * fore * fx, elbow[1] + Math.sin(aF) * fore];
  const parts: [number, number, number][] = [
    [0, -0.22, 0.25], [0.04 * fx, -0.4, 0.3], [0.06 * fx, -0.6 + breathe, 0.3],
    [shoulderF[0], shoulderF[1], 0.2], [-0.28 * fx, -0.62 + breathe, 0.17],
    [0.2 * fx, -0.86 + breathe - P.roar * 0.03, 0.13],
    [-0.12, -0.06, 0.12], [0.14, -0.06, 0.12],
    [fist[0], fist[1], 0.11],
    [(shoulderF[0] + elbow[0]) / 2, (shoulderF[1] + elbow[1]) / 2, 0.11],
    [(elbow[0] + fist[0]) / 2, (elbow[1] + fist[1]) / 2, 0.1],
    [-0.36 * fx, -0.36, 0.1], [-0.4 * fx, -0.18, 0.09],
  ];
  const blob = (cx: number, cy: number, r: number, seed: number, grow = 1) => {
    ctx.beginPath();
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const an = (i / n) * TAU;
      const k = 1 + noise1(an * 2 + t * (1.5 + P.boil * 3) + seed, seed) * (0.08 + P.boil * 0.12);
      const xx = x + (cx + Math.cos(an) * r * k * grow) * s, yy = y + (cy + Math.sin(an) * r * k * grow) * s;
      if (i) ctx.lineTo(xx, yy);
      else ctx.moveTo(xx, yy);
    }
    ctx.closePath();
  };
  const alive = 1 - P.dissolve;
  const headAt: Pt = [x + 0.2 * fx * s, y + (-0.86 - P.roar * 0.03) * s];
  const mouth: Pt = [headAt[0] + 0.05 * fx * s, headAt[1] + 0.07 * s];
  if (alive <= 0) return { fist: [x + fist[0] * s, y + fist[1] * s] as Pt, head: headAt, mouth };
  ctx.save();
  // purple rim
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = withAlpha(VIOLET.c, 0.45 * alive);
  parts.forEach(([cx, cy, r], i) => {
    blob(cx + 0.012, cy - 0.012, r, i * 7, 1.06);
    ctx.fill();
  });
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = alive;
  ctx.fillStyle = K.ink;
  parts.forEach(([cx, cy, r], i) => {
    blob(cx, cy, r, i * 7);
    ctx.fill();
  });
  // claws
  ctx.strokeStyle = K.ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.03;
  for (let k = -1; k <= 1; k++) {
    const ca = Math.atan2(fist[1] - elbow[1], fist[0] - elbow[0]) + k * 0.4;
    ctx.beginPath();
    ctx.moveTo(x + fist[0] * s, y + fist[1] * s);
    ctx.lineTo(x + (fist[0] + Math.cos(ca) * 0.16) * s, y + (fist[1] + Math.sin(ca) * 0.16) * s);
    ctx.stroke();
  }
  // drips
  for (let k = 0; k < 4; k++) {
    const dq = (t * 0.7 + k * 0.27) % 1;
    const src = parts[[8, 9, 11, 12][k]];
    ctx.fillStyle = K.ink;
    ctx.beginPath();
    ctx.ellipse(x + src[0] * s, y + (src[1] + src[2] + dq * 0.3) * s, s * 0.012, s * 0.02, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // veins, eyes, mouth
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alive;
  const pulse = 0.55 + 0.45 * Math.sin(t * 4.3);
  const vein = (pts: Pt[], sd: number) =>
    drawBolt(ctx, pts.map(([px, py]) => [x + px * s, y + py * s] as Pt), t * 0.25, { width: s * 0.004, amp: s * 0.025, seed: sd, alpha: pulse * alive, branches: 2, pal: RED });
  vein([[0.04 * fx, -0.75], [0, -0.5], [0.06, -0.3], [-0.02, -0.12]], 3);
  vein([[shoulderF[0], shoulderF[1]], [elbow[0], elbow[1]], [fist[0], fist[1]]], 4);
  vein([[-0.28 * fx, -0.62], [-0.38 * fx, -0.3]], 5);
  // wounds: the slashes still glowing where they cut
  if (P.wounds > 0) {
    // four cuts in four directions, spread over the body rather than through one point
    const cuts: [Pt, Pt][] = [[[-0.34, -0.82], [0.06, -0.54]], [[-0.08, -0.6], [0.32, -0.3]], [[0.3, -0.8], [0.02, -0.4]], [[-0.38, -0.34], [0.26, -0.42]]];
    cuts.slice(0, Math.ceil(P.wounds * 4)).forEach(([a, b], k) => {
      drawBolt(ctx, [[x + a[0] * s, y + a[1] * s], [x + b[0] * s, y + b[1] * s]], t, { width: s * 0.01, amp: s * 0.004, seed: 60 + k, alpha: alive * Math.min(1, P.wounds * 4 - k), branches: 0, pal: RED });
    });
  }
  const head = headAt;
  for (const ex of [-1, 1]) {
    const eX = head[0] + (ex * 0.045 + 0.04 * fx) * s, eY = head[1] - 0.01 * s;
    drawSprite(ctx, glow(RED.c, 64), eX, eY, s * (0.08 + P.roar * 0.08));
    ctx.fillStyle = RED.core;
    ctx.beginPath();
    ctx.ellipse(eX, eY, s * 0.016, s * 0.007, ex * 0.3 * fx, 0, TAU);
    ctx.fill();
  }
  if (P.roar > 0) {
    const [mx, my] = mouth;
    drawSprite(ctx, glow(RED.c, 64), mx, my, s * 0.25 * P.roar);
    ctx.fillStyle = RED.hot;
    ctx.beginPath();
    ctx.ellipse(mx, my, s * 0.05, s * 0.045 * P.roar, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  return { fist: [x + fist[0] * s, y + fist[1] * s] as Pt, head, mouth };
}

/* ------------------------------------------------------ shared: effects */

interface Ember { x: number; y: number; v: number; ph: number; r: number; ash: boolean }
let embers: Ember[] = [];
let lastT = 0;
function drawEmbers(g: G, alpha: number) {
  const { ctx, w, h, S, t } = g;
  const dt = Math.min(0.05, t - lastT || 0.016);
  lastT = t;
  if (embers.length === 0) {
    const r = rng(3);
    embers = Array.from({ length: 110 }, (_, i) => ({ x: r() * w, y: r() * h, v: 0.3 + r(), ph: r() * TAU, r: 0.6 + r() * 1.6, ash: i % 3 === 0 }));
  }
  if (alpha <= 0) return;
  ctx.save();
  for (const e of embers) {
    if (e.ash) {
      e.y += S * 0.03 * e.v * dt;
      e.x += Math.sin(t + e.ph) * S * 0.02 * dt;
    } else {
      e.y -= S * 0.09 * e.v * dt;
      e.x += Math.sin(t * 1.3 + e.ph) * S * 0.04 * dt;
    }
    if (e.y < -10) { e.y = h + 10; e.x = Math.random() * w; }
    if (e.y > h + 10) { e.y = -10; e.x = Math.random() * w; }
    const fl = 0.5 + 0.5 * Math.sin(t * 9 + e.ph * 5);
    if (e.ash) {
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = K.ash;
      ctx.fillRect(e.x, e.y, e.r * 2, e.r);
    } else {
      ctx.globalAlpha = alpha * (0.4 + 0.6 * fl);
      ctx.fillStyle = fl > 0.7 ? RED.hot : RED.c;
      ctx.fillRect(e.x, e.y, e.r, e.r * 1.6);
    }
  }
  ctx.restore();
}

/** debris that follows q exactly, so scrubbing back puts it back */
function debris(g: G, ox: number, oy: number, q: number, n: number, seed: number, spread: number, color = '#1a1220') {
  const { ctx, S } = g;
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * spread;
    const v = S * (0.6 + r() * 1.6);
    const sz = S * (0.008 + r() * 0.03);
    const x = ox + Math.cos(a) * v * q;
    const y = oy + Math.sin(a) * v * q + S * 2.2 * q * q;
    const rot = r() * TAU + q * (r() - 0.5) * 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-sz, -sz * 0.4);
    ctx.lineTo(sz * 0.3, -sz * 0.8);
    ctx.lineTo(sz, sz * 0.2);
    ctx.lineTo(-sz * 0.2, sz * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(RED.c, 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

function speedLines(g: G, cx: number, cy: number, color: string, n = 70, inner = 0.3, alpha = 1, seed = 1) {
  const { ctx, S, t } = g;
  const k = Math.floor(t * 18);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const a = hash(i * 1.7 + seed) * TAU + (hash(i + k) - 0.5) * 0.04;
    const r0 = S * (inner + hash(i * 3 + k) * 0.25);
    ctx.lineWidth = 0.8 + hash(i * 7 + seed) * 3.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * S * 2.5, cy + Math.sin(a) * S * 2.5);
    ctx.stroke();
  }
  ctx.restore();
}

function hLines(g: G, alpha: number, color = '#ffffff', dir = 1) {
  const { ctx, w, h, S, t } = g;
  const k = Math.floor(t * 24);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < 40; i++) {
    const y = hash(i * 3.1 + k) * h;
    const len = w * (0.2 + hash(i * 5 + k) * 0.8);
    const x = dir > 0 ? (hash(i * 7 + k) * w * 1.4 - w * 0.4) : w - hash(i * 7 + k) * w * 1.4;
    ctx.fillRect(x, y, len, 0.6 + hash(i) * S * 0.004);
  }
  ctx.restore();
}

function shockRing(g: G, x: number, y: number, q: number, rx: number, ry: number, color: string) {
  const { ctx } = g;
  if (q <= 0 || q >= 1) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const qq = clamp(q * 1.2 - k * 0.1);
    ctx.strokeStyle = withAlpha(color, (1 - qq) * (0.8 - k * 0.2));
    ctx.lineWidth = (1 - qq) * rx * 0.05 + 1;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * ease.out3(qq), ry * ease.out3(qq), 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function cracks(g: G, x: number, y: number, q: number, len: number, flat: number, seed: number) {
  const { ctx, t, S } = g;
  if (q <= 0) return;
  const r = rng(seed);
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU;
    const L = len * (0.5 + r() * 0.6) * ease.out3(q);
    const pts: Pt[] = [[x, y]];
    let px = x, py = y, an = a;
    for (let k = 0; k < 5; k++) {
      an += (r() - 0.5) * 0.8;
      px += Math.cos(an) * L / 5;
      py += Math.sin(an) * L / 5 * flat;
      pts.push([px, py]);
    }
    drawBolt(ctx, pts, t * 0.2, { width: S * 0.004, amp: S * 0.008, seed: seed + i, alpha: Math.min(1, q * 3), branches: 1, pal: RED });
  }
}

/** a frame of pure red on black: anime's impact frame, inverted */
function impactFrame(g: G, draw: () => void, white = false) {
  const { ctx, w, h } = g;
  ctx.save();
  ctx.fillStyle = white ? '#fbf6f7' : '#000000';
  ctx.fillRect(0, 0, w, h);
  draw();
  ctx.restore();
}

function letterTitle(g: G, text: string, x: number, y: number, px: number, alpha: number, jitter = 0) {
  const { ctx, t } = g;
  ctx.save();
  ctx.font = font(px, F.display);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = alpha;
  const j = jitter * px * 0.04;
  ctx.fillStyle = VIOLET.c;
  ctx.fillText(text, x - j + Math.sin(t * 40) * j, y);
  ctx.fillStyle = RED.c;
  ctx.fillText(text, x + j, y + j * 0.3);
  ctx.fillStyle = '#f6eef0';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** a ragged ink-edged circle; integer frequencies so the outline closes cleanly */
function inkCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, seed: number) {
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + 0.07 * Math.sin(a * 5 + t * 0.9 + seed) + 0.045 * Math.sin(a * 11 - t * 1.4 + seed * 2) + 0.03 * Math.sin(a * 23 + t * 2 + seed * 3);
    const xx = x + Math.cos(a) * r * k, yy = y + Math.sin(a) * r * k;
    if (i) ctx.lineTo(xx, yy);
    else ctx.moveTo(xx, yy);
  }
  ctx.closePath();
}

/**
 * Draw `fn` everywhere except inside a ragged ink hole of radius r, with a
 * red rim burning along the edge: how the corruption arrives and leaves.
 */
function outsideHole(g: G, x: number, y: number, r: number, seed: number, fn: () => void) {
  const { ctx, w, h, S, t } = g;
  if (r <= 0) {
    fn();
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w, -h, w * 3, h * 3);
  inkCircle(ctx, x, y, r, t, seed);
  ctx.clip('evenodd');
  fn();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [wd, col, al] of [[S * 0.03, RED.deep, 0.5], [S * 0.008, RED.c, 0.9], [S * 0.002, RED.core, 0.8]] as const) {
    ctx.strokeStyle = withAlpha(col, al);
    ctx.lineWidth = wd;
    ctx.beginPath();
    inkCircle(ctx, x, y, r, t, seed);
    ctx.stroke();
  }
  ctx.restore();
}

/** the red overexposure that marks a cut; k runs 0→1 from the cut */
function cutFlash(g: G, k: number) {
  const a = 1 - clamp(k);
  if (a <= 0) return;
  g.ctx.fillStyle = `rgba(255,40,70,${0.18 * a})`;
  g.ctx.fillRect(0, 0, g.w, g.h);
}

/* ================================================================ SHOTS */

/* 1. the night bruises: ink bleeds in from every edge and swallows the old sky */
function shotCorrupt(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const seep = ease.inOut2(seg(q, 0, 0.72));
  const diag = Math.hypot(w, h);
  // the old night survives only inside a closing hole of untouched sky
  outsideHole(g, w / 2, h * 0.42, lerp(diag * 0.78, -S * 0.05, seep), 3, () => {
    world(g, { x: 0, y: -0.05, z: lerp(1.12, 1.05, seep) });
    // the vignette that the ink brings with it
    const vg = ctx.createRadialGradient(w / 2, h / 2, S * 0.3, w / 2, h / 2, diag * 0.7);
    vg.addColorStop(0, 'rgba(10,3,20,0)');
    vg.addColorStop(1, `rgba(10,3,20,${0.85 * (1 - seg(q, 0.7, 1) * 0.6)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  });
  // the target ring: snaps in large, locks, keeps turning
  const lock = seg(q, 0.3, 0.5);
  if (lock > 0) {
    const sc = lerp(3, 1, ease.out5(lock));
    targetRing(g, w * 0.5, h * 0.32, S * 0.09 * sc, Math.min(1, lock * 2), t);
    if (hitQ(0.5)) g.f.shake(S * 0.02);
  }
  // glitch bars in red as the signal turns
  if (q > 0.55 && q < 0.78 && Math.floor(t * 20) % 3 === 0) {
    ctx.fillStyle = withAlpha(RED.c, 0.25);
    ctx.fillRect(0, hash(Math.floor(t * 20)) * h, w, S * 0.01);
  }
}

function targetRing(g: G, x: number, y: number, r: number, a: number, t: number) {
  const { ctx } = g;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow(RED.c, 128), x, y, r * 5);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#3a0010';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.42, 0, TAU);
  ctx.fill();
  ctx.fillStyle = RED.c;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.3 * (1 + Math.sin(t * 6) * 0.06), 0, TAU);
  ctx.fill();
  ctx.strokeStyle = RED.c;
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.75, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = r * 0.04;
  ctx.setLineDash([r * 0.3, r * 0.15]);
  ctx.lineDashOffset = -t * r;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/* 2. the title card */
function shotTitle(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  // the slash that opens it
  const sl = ease.out5(seg(q, 0, 0.18));
  if (sl > 0) {
    drawBolt(ctx, [[-w * 0.1, h * 0.62], [lerp(-w * 0.1, w * 1.1, sl), lerp(h * 0.62, h * 0.38, sl)]], t, { width: S * 0.01, amp: S * 0.004, seed: 2, branches: 0, pal: RED, alpha: 1 - seg(q, 0.7, 1) });
  }
  if (hitQ(0.12)) g.f.shake(S * 0.03);
  ctx.font = font(100, F.display);
  const px = Math.min((w * 0.86 / ctx.measureText('ALTER').width) * 100, S * 0.3);
  const k = ease.out3(seg(q, 0.12, 0.35));
  const glitch = q > 0.12 && q < 0.4 ? 1 : 0.25;
  letterTitle(g, 'ALTER', w / 2, h * 0.5, px * lerp(1.25, 1, k), k, glitch);
  ctx.save();
  ctx.font = font(Math.max(11, S * 0.035), F.serif, 600);
  ctx.textAlign = 'center';
  ctx.fillStyle = withAlpha(RED.hot, seg(q, 0.3, 0.5));
  ctx.fillText('III  ·  the other one', w / 2, h * 0.5 + px * 0.62);
  ctx.restore();
  // a burst of horizontal glitch bars
  if (glitch === 1) {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? withAlpha(VIOLET.c, 0.5) : withAlpha(RED.c, 0.5);
      ctx.fillRect(hash(i + Math.floor(t * 30)) * w * 0.5, h * (0.4 + hash(i * 3 + Math.floor(t * 30)) * 0.2), w * 0.4, S * 0.006);
    }
  }
}

/* 3. establishing wide: the knight alone in the ruins, the blade dragging in the water */
function shotWide(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const cam = { x: lerp(-0.05, 0.03, q), y: 0, z: lerp(1, 1.12, ease.inOut2(q)) };
  world(g, cam);
  // the figure rides the same slow push-in as the world behind it
  const s = S * (g.portrait ? 0.5 : 0.4) * lerp(1, 1.1, ease.inOut2(q));
  const gy = h * 0.84;
  const kx = w * 0.44 - cam.x * S * 0.8;
  const hy = gy - s * 0.62;
  // standing tall, the point resting in the water behind them
  const a = Math.PI - Math.asin(clamp(((gy - hy) / (s * 0.95)) * 0.97, -1, 1));
  knight(g, kx, hy, a, s, w * 1.5, gy, { lit: ease.inOut2(seg(q, 0.2, 0.9)) * 0.4, veins: 0.5 });
  // where the point touches, the water keeps rippling
  const tx = kx + Math.cos(a) * s * 0.95;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const r = (t * 0.45 + k / 3) % 1;
    ctx.strokeStyle = withAlpha(RED.hot, (1 - r) * 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(tx, gy, S * 0.22 * r, S * 0.025 * r, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/* 4. close on the feet: an armoured step into black water */
function bootPath(ctx: CanvasRenderingContext2D, B: number, top: number) {
  ctx.beginPath();
  // the greave runs up out of frame, so this is a leg stepping down, not a floating boot
  ctx.moveTo(-B * 0.2, top);
  ctx.lineTo(B * 0.14, top);
  ctx.lineTo(B * 0.15, -B * 0.42);
  // the instep: three lames stepping down to a pointed toe
  ctx.quadraticCurveTo(B * 0.2, -B * 0.3, B * 0.3, -B * 0.24);
  ctx.lineTo(B * 0.46, -B * 0.15);
  ctx.quadraticCurveTo(B * 0.66, -B * 0.06, B * 0.74, 0);
  ctx.lineTo(-B * 0.24, 0);
  // the heel, with a spur
  ctx.lineTo(-B * 0.27, -B * 0.06);
  ctx.lineTo(-B * 0.36, -B * 0.1);
  ctx.lineTo(-B * 0.26, -B * 0.14);
  ctx.quadraticCurveTo(-B * 0.24, -B * 0.32, -B * 0.2, -B * 0.42);
  ctx.closePath();
}

function boot(g: G, bx: number, by: number, B: number, reflect: boolean) {
  const { ctx, h, S } = g;
  ctx.save();
  ctx.translate(bx, by);
  if (reflect) ctx.scale(1, -1);
  const top = -h * 1.5;
  const fill = ctx.createLinearGradient(-B * 0.3, 0, B * 0.3, 0);
  fill.addColorStop(0, '#05030a');
  fill.addColorStop(0.6, '#140c1e');
  fill.addColorStop(1, '#0a0610');
  ctx.fillStyle = fill;
  bootPath(ctx, B, top);
  ctx.fill();
  // a violet rim on the back edge, red light catching the plate edges from the water
  ctx.strokeStyle = withAlpha(VIOLET.c, 0.7);
  ctx.lineWidth = Math.max(1, S * 0.003);
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = withAlpha(RED.c, 0.85);
  ctx.lineWidth = Math.max(1, S * 0.004);
  const lames: [number, number, number][] = [[-0.42, 0.15, -0.36], [-0.62, 0.15, -0.56], [-0.82, 0.15, -0.76], [-0.3, 0.32, -0.22], [-0.2, 0.48, -0.12]];
  for (const [y0, x1, y1] of lames) {
    ctx.beginPath();
    ctx.moveTo(-B * 0.24, B * y0);
    ctx.quadraticCurveTo(0, B * (y0 + 0.05), B * x1, B * y1);
    ctx.stroke();
  }
  // the ankle joint: a round cop with a hot rivet
  ctx.fillStyle = withAlpha(RED.hot, 0.9);
  ctx.beginPath();
  ctx.arc(-B * 0.03, -B * 0.36, B * 0.025, 0, TAU);
  ctx.fill();
  const under = ctx.createLinearGradient(0, -B * 0.25, 0, 0);
  under.addColorStop(0, 'rgba(255,31,61,0)');
  under.addColorStop(1, 'rgba(255,31,61,0.35)');
  ctx.fillStyle = under;
  ctx.fillRect(-B, -B * 0.25, B * 2, B * 0.25);
  ctx.restore();
  ctx.restore();
}

function shotFeet(g: G, q: number) {
  const { ctx, w, h, S } = g;
  const gy = h * 0.66;
  const sky = ctx.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, '#120a1c');
  sky.addColorStop(1, '#2a1640');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, gy);
  ctx.fillStyle = '#05030a';
  ctx.fillRect(0, gy, w, h - gy);
  // red light skimming the water
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5;
  drawSprite(ctx, glow(RED.c, 128), w * 0.5, gy + S * 0.05, w * 1.6, S * 0.3);
  ctx.restore();
  // the boot comes down hard, and its reflection rises to meet it
  const step = ease.in3(seg(q, 0, 0.35));
  const settle = Math.sin(seg(q, 0.35, 0.55) * Math.PI) * S * 0.006;
  const B = S * 0.5;
  const bx = w * 0.44, by = lerp(gy - S * 0.5, gy, step) + settle;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, gy, w, h - gy);
  ctx.clip();
  ctx.globalAlpha = 0.28;
  boot(g, bx, gy + (gy - by), B, true);
  ctx.restore();
  // dark water closes over the reflection a little
  const fog = ctx.createLinearGradient(0, gy, 0, h);
  fog.addColorStop(0, 'rgba(5,3,10,0)');
  fog.addColorStop(1, 'rgba(5,3,10,0.9)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, gy, w, h - gy);
  boot(g, bx, by, B, false);
  // splash and rings
  const hit = seg(q, 0.35, 1);
  if (hitQ(0.35)) g.f.shake(S * 0.015);
  if (hit > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const qq = clamp(hit * 1.3 - k * 0.15);
      if (qq <= 0) continue;
      ctx.strokeStyle = withAlpha(RED.hot, (1 - qq) * 0.8);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(bx + B * 0.25, gy, S * 0.6 * qq, S * 0.06 * qq, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    const r = rng(8);
    for (let i = 0; i < 24; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
      const v = S * (0.3 + r() * 0.6);
      const qq = ease.out2(clamp(hit * 1.6));
      const x = bx + B * 0.25 + Math.cos(a) * v * qq;
      const y = gy + Math.sin(a) * v * qq + S * 1.2 * qq * qq;
      if (y > gy + 2) continue;
      ctx.fillStyle = i % 4 ? '#1a1024' : RED.hot;
      ctx.beginPath();
      ctx.arc(x, y, S * (0.004 + r() * 0.006), 0, TAU);
      ctx.fill();
    }
  }
}

/* 5. down the blade: the rings light one after another as we pass them */
function shotSword(g: G, q: number) {
  const { ctx, w, h, S } = g;
  ctx.fillStyle = '#07040c';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.6;
  drawSprite(ctx, glow('#2a1640', 128), w / 2, h / 2, w * 2, h * 1.2);
  ctx.restore();
  // a huge blade on the diagonal, the camera sliding along it
  const L = Math.hypot(w, h) * 2.2;
  const a = -0.42;
  const slide = lerp(-0.14, 0.22, ease.inOut2(q));
  const hx = w * 0.5 - Math.cos(a) * L * (0.25 + slide), hy = h * 0.5 - Math.sin(a) * L * (0.25 + slide);
  blade(g, hx, hy, a, L, ease.inOut2(seg(q, 0.05, 0.85)), 1.2);
  // sparks peeling off as each ring catches
  const r = rng(11);
  for (let i = 0; i < 30; i++) {
    const at = r();
    if (at > q) continue;
    const s0 = 0.16 + Math.floor(at * 5) * 0.065;
    const px = hx + Math.cos(a) * L * s0, py = hy + Math.sin(a) * L * s0;
    const age = clamp((q - at) * 4);
    ctx.fillStyle = withAlpha(RED.hot, 1 - age);
    ctx.fillRect(px + (r() - 0.5) * S * 0.3 * age, py - S * 0.3 * age * r(), 2, 3);
  }
}

/* 6. the eyes */
function shotEyes(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  ctx.fillStyle = '#030206';
  ctx.fillRect(0, 0, w, h);
  // a strip of face between two bars, the visor
  const band = S * 0.42;
  const cy = h * 0.5;
  const face = ctx.createLinearGradient(0, cy - band / 2, 0, cy + band / 2);
  face.addColorStop(0, '#0d0914');
  face.addColorStop(0.5, '#1a1224');
  face.addColorStop(1, '#0a0710');
  ctx.fillStyle = face;
  ctx.fillRect(0, cy - band / 2, w, band);
  // hair cutting across
  ctx.strokeStyle = '#000';
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x0 = w * (0.1 + i * 0.1) + Math.sin(t * 2 + i) * S * 0.01;
    ctx.lineWidth = S * (0.01 + hash(i) * 0.015);
    ctx.beginPath();
    ctx.moveTo(x0, cy - band * 0.6);
    ctx.quadraticCurveTo(x0 + S * 0.05, cy - band * 0.2, x0 - S * 0.02 + Math.sin(t * 3 + i) * S * 0.01, cy + band * (0.05 + hash(i * 3) * 0.2));
    ctx.stroke();
  }
  // veins crawling out from the eyes
  const crawl = ease.out2(seg(q, 0.3, 0.9));
  const open = ease.out5(seg(q, 0.2, 0.32));
  if (hitQ(0.22)) g.f.shake(S * 0.012);
  for (const ex of [-1, 1]) {
    const x = w / 2 + ex * S * 0.2, y = cy;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (crawl > 0) {
      for (let k = 0; k < 3; k++) {
        const a = (ex > 0 ? 0 : Math.PI) + (k - 1) * 0.6;
        const L = S * 0.35 * crawl;
        drawBolt(ctx, [[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.3], [x + Math.cos(a) * L, y + Math.sin(a) * L * 0.6]], t * 0.4, { width: S * 0.003, amp: S * 0.015, seed: k + ex * 5, alpha: crawl, branches: 1, pal: RED });
      }
    }
    // the eye: a red slit that opens, a hot core
    ctx.globalAlpha = open;
    drawSprite(ctx, glow(RED.c, 128), x, y, S * 0.5, S * 0.22);
    ctx.globalAlpha = 1;
    ctx.fillStyle = RED.c;
    ctx.beginPath();
    ctx.ellipse(x, y, S * 0.11, S * 0.03 * open + 0.5, ex * -0.12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = RED.core;
    ctx.beginPath();
    ctx.ellipse(x + ex * S * 0.01, y, S * 0.025, S * 0.02 * open + 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // tight bars
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, cy - band / 2);
  ctx.fillRect(0, cy + band / 2, w, h);
}

/* 7. the sky ring, and what falls out of it */
function shotRing(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  // looking straight up into the sky
  const sky = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, Math.hypot(w, h) * 0.7);
  sky.addColorStop(0, '#2e1846');
  sky.addColorStop(1, '#06030c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // spire tips pointing up into frame from the edges (we're looking up)
  ctx.fillStyle = '#0a0612';
  for (let i = 0; i < 7; i++) {
    const base = i < 4 ? h : h;
    const x = w * (i / 6);
    ctx.beginPath();
    ctx.moveTo(x - S * 0.12, base);
    ctx.lineTo(x + (w / 2 - x) * 0.35, h * (0.55 + hash(i) * 0.2));
    ctx.lineTo(x + S * 0.12, base);
    ctx.fill();
  }
  const rx = w / 2, ry = h * 0.4;
  const crack = seg(q, 0.15, 0.4);
  targetRing(g, rx, ry, S * lerp(0.2, 0.32, q), 1 - seg(q, 0.7, 0.9), t);
  if (crack > 0) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + 0.3;
      drawBolt(ctx, [[rx, ry], [rx + Math.cos(a) * S * 0.5 * crack, ry + Math.sin(a) * S * 0.5 * crack]], t, { width: S * 0.004, amp: S * 0.02, seed: k, alpha: crack, branches: 1, pal: RED });
    }
  }
  // the beast falls out of the ring toward the camera
  const fall = ease.in3(seg(q, 0.35, 1));
  if (fall > 0) {
    const s = S * lerp(0.15, 3.2, fall);
    beast(g, rx, ry + s * 0.5, s, { arm: 1, roar: 0.6, boil: 0.8, face: -1 });
  }
  speedLines(g, rx, ry, withAlpha(RED.hot, 0.5), 50, 0.25, seg(q, 0.4, 0.9), 3);
}

/* 8. impact */
function shotImpact(g: G, q: number) {
  const { ctx, w, h, S } = g;
  const shake = q < 0.3 ? (Math.random() - 0.5) * S * 0.04 * (1 - q / 0.3) : 0;
  ctx.save();
  ctx.translate(shake, shake * 0.6);
  const cam = { x: 0, y: 0, z: lerp(1.15, 1.0, ease.out3(q)) };
  world(g, cam, { tint: 0.15 * (1 - q) });
  const gy = h * 0.82;
  const s = S * (g.portrait ? 0.95 : 0.8);
  const bx = w * 0.62;
  // squash on landing, then rise
  const land = ease.outBack(seg(q, 0, 0.3), 2);
  ctx.save();
  ctx.translate(bx, gy);
  ctx.scale(lerp(1.25, 1, land), lerp(0.7, 1, land));
  ctx.translate(-bx, -gy);
  beast(g, bx, gy, s, { arm: 0.3, roar: 0, boil: 0.9 - q * 0.5, face: -1 });
  ctx.restore();
  cracks(g, bx, gy, q * 1.5, S * 0.8, 0.25, 21);
  shockRing(g, bx, gy, seg(q, 0, 0.6), S * 1.4, S * 0.25, RED.c);
  shockRing(g, bx, gy, seg(q, 0.05, 0.7), S * 1.1, S * 0.18, VIOLET.c);
  debris(g, bx, gy, ease.out2(seg(q, 0, 0.8)), 40, 5, 2.4);
  // dust boiling out along the ground
  ctx.save();
  for (let i = 0; i < 10; i++) {
    const d = ease.out3(q) * S * (0.4 + hash(i) * 0.8) * (i % 2 ? 1 : -1);
    ctx.globalAlpha = 0.5 * (1 - q);
    drawSprite(ctx, glow('#3a2a50', 128), bx + d, gy - S * 0.05 * hash(i * 3), S * 0.5 * (0.5 + q), S * 0.3 * (0.5 + q));
  }
  ctx.restore();
  ctx.restore();
  // the first frames are white-hot red
  const wo = 1 - seg(q, 0, 0.12);
  if (wo > 0) {
    ctx.fillStyle = `rgba(255,200,210,${wo})`;
    ctx.fillRect(0, 0, w, h);
  }
}

/* 9. the roar: from below, the head filling the frame */
function shotRoar(g: G, q: number) {
  const { ctx, w, h, S } = g;
  world(g, { x: 0, y: 0.25, z: 1.0 }, { moon: true });
  const s = S * 2.2;
  const open = ease.out3(seg(q, 0.05, 0.25)) * (1 - seg(q, 0.85, 1) * 0.5);
  const jit = open * S * 0.01;
  // place the body so the head lands just above centre (it sits forward of x by 0.2·s)
  const bx = w * 0.5 + s * 0.2 + (Math.random() - 0.5) * jit;
  const by = h * 0.4 + s * 0.86 + (Math.random() - 0.5) * jit;
  const { mouth } = beast(g, bx, by, s, { arm: 0.6, roar: open, boil: 1, face: -1 });
  const [mx, my] = mouth;
  // the sound made visible: rings rolling out of the mouth
  if (q > 0.1) {
    for (let k = 0; k < 4; k++) {
      const qq = (q * 2.5 + k * 0.25) % 1;
      ctx.save();
      ctx.strokeStyle = withAlpha('#ffd6dc', (1 - qq) * 0.5 * open);
      ctx.lineWidth = S * 0.012 * (1 - qq);
      ctx.beginPath();
      ctx.ellipse(mx, my, S * (0.12 + qq * 1.2), S * (0.09 + qq * 0.9), 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    g.f.shake(S * 0.006);
  }
  speedLines(g, mx, my, 'rgba(255,255,255,0.18)', 40, 0.35, open, 8);
}

/* 10. the standoff: split down a diagonal of red light */
function shotStandoff(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const tilt = h * 0.18;
  const push = ease.inOut2(q) * S * 0.04;
  // left: the knight, in red
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(w * 0.5 + tilt * 0.5, 0); ctx.lineTo(w * 0.5 - tilt * 0.5, h); ctx.lineTo(0, h);
  ctx.closePath();
  ctx.clip();
  world(g, { x: -0.25, y: 0, z: 1.3 }, { tint: 0.35 });
  const s = S * (g.portrait ? 0.62 : 0.5);
  knight(g, w * 0.3 + push, h * 0.86 - s * 0.42, -0.25, s, w, h * 0.86, { lit: 1, veins: 1 });
  ctx.restore();
  // right: the beast, in violet
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w * 0.5 + tilt * 0.5, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(w * 0.5 - tilt * 0.5, h);
  ctx.closePath();
  ctx.clip();
  world(g, { x: 0.3, y: 0, z: 1.3 });
  ctx.fillStyle = 'rgba(60,20,140,0.35)';
  ctx.fillRect(0, 0, w, h);
  beast(g, w * 0.78 - push, h * 0.95, S * 0.9, { arm: 0.4, roar: 0.2, boil: 0.6, face: -1 });
  ctx.restore();
  // the seam
  drawBolt(ctx, [[w * 0.5 + tilt * 0.5, -10], [w * 0.5 - tilt * 0.5, h + 10]], t, { width: S * 0.006, amp: S * 0.01, seed: 4, branches: 4, pal: RED });
  hLines(g, 0.25, '#ffb3c0', -1);
}

/* 11. the dash: a coiled crouch, then gone across the frame in a red smear */
function shotDash(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  ctx.fillStyle = '#0a0612';
  ctx.fillRect(0, 0, w, h);
  const s = S * (g.portrait ? 0.7 : 0.55);
  const gy = h * 0.84;
  // anticipation: settle back into the crouch, then the whole frame is crossed at once
  const coil = ease.inOut2(seg(q, 0, 0.25));
  const go = (k: number) => ease.out3(seg(k, 0.25, 0.75));
  // the figure sits behind its hilt, so start far enough in to see it, and end with the trailing blade gone too
  const xAt = (k: number) => lerp(lerp(w * 0.4, w * 0.34, coil), w * 1.2 + s, go(k));
  const x = xAt(q);
  const speed = clamp((xAt(q) - xAt(q - 0.04)) / (S * 0.5));
  // the world tears past: streaks speed up with the knight
  hLines(g, 0.35 + 0.55 * speed, '#3b2a55', 1);
  hLines(g, 0.2 + 0.5 * speed, withAlpha(RED.c, 0.7), 1);
  const hy = gy - s * lerp(0.42, 0.36, coil);
  const a = Math.PI * lerp(0.86, 0.95, coil);
  // afterimages: the same figure a moment ago, red rim only
  for (let k = 5; k >= 1; k--) {
    const gx = xAt(q - k * 0.03);
    if (Math.abs(gx - x) < S * 0.02) continue;
    drawWarrior(ctx, { hilt: [gx, hy], a, foeX: w * 3, s, groundY: gy, color: k % 2 ? RED.c : VIOLET.c, t, vx: S * 8 * speed, vy: 0, seed: 7, alpha: 0.4 * (1 - k / 6) * speed });
  }
  // streaks peeling off the body
  if (speed > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const y = gy - s * (0.08 + hash(i) * 0.8);
      const len = S * (0.3 + hash(i * 3) * 1.1) * speed;
      const x0 = x - s * 0.1 - hash(i * 5) * s * 0.15;
      const gr = ctx.createLinearGradient(x0 - len, 0, x0, 0);
      gr.addColorStop(0, 'rgba(255,31,61,0)');
      gr.addColorStop(1, i % 3 ? 'rgba(255,116,134,0.8)' : 'rgba(184,146,255,0.7)');
      ctx.fillStyle = gr;
      ctx.fillRect(x0 - len, y, len, Math.max(1, S * (0.002 + hash(i * 7) * 0.006)));
    }
    ctx.restore();
  }
  knight(g, x, hy, a, s, w * 3, gy, { lit: 1, vx: S * 8 * speed });
  // the water sprays up in its wake
  if (go(q) > 0) {
    const r = rng(19);
    for (let i = 0; i < 26; i++) {
      const at = r();
      const sx = xAt(at * 0.5 + 0.25);
      if (sx > x) continue;
      const age = clamp((x - sx) / (S * 0.8));
      ctx.fillStyle = withAlpha(i % 3 ? '#2a1a3a' : RED.hot, 1 - age);
      ctx.beginPath();
      ctx.arc(sx, gy - age * S * (0.1 + r() * 0.25), S * (0.004 + r() * 0.006), 0, TAU);
      ctx.fill();
    }
  }
  if (hitQ(0.25)) g.f.shake(S * 0.02);
}

/* 12. the clash: an inverted impact frame, a white flash, then the dome */
function shotClash(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const cx = w * 0.5, cy = h * 0.5;
  const s = S * (g.portrait ? 0.6 : 0.5);
  const scene = () => {
    world(g, { x: 0, y: 0, z: 1.2 }, { tint: 0.2 });
    beast(g, cx + S * 0.38, h * 0.95, S * 0.95, { arm: 2, roar: 0.4, boil: 0.8, face: -1 });
    knight(g, cx - S * 0.18, cy + S * 0.02, -0.55, s, w, h * 0.9, { lit: 1 });
  };
  if (hitQ(0.01) || hitQ(0.2)) g.f.shake(S * 0.05);
  if (q < 0.12) {
    // the impact frame, inverted: ink silhouettes on white, red lines bursting
    // from the contact (on white the 'lighter' glows vanish, so only the
    // shapes are left)
    impactFrame(g, () => {
      speedLines(g, cx, cy, RED.c, 90, 0.18, 1, 12);
      beast(g, cx + S * 0.38, h * 0.95, S * 0.95, { arm: 2, roar: 0.4, boil: 0.8, face: -1 });
      knight(g, cx - S * 0.18, cy + S * 0.02, -0.55, s, w, h * 0.9, { lit: 0, veins: 0 });
      drawBolt(ctx, [[cx - S * 0.5, cy + S * 0.3], [cx, cy], [cx + S * 0.2, cy - S * 0.1]], t, { width: S * 0.012, amp: S * 0.01, seed: 3, ink: true });
    }, true);
    return;
  }
  if (q < 0.2) {
    // then the negative: black, one red ring tearing outward
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    shockRing(g, cx, cy, seg(q, 0.12, 0.2), S * 1.3, S * 1.3, RED.c);
    return;
  }
  const k = seg(q, 0.2, 1);
  ctx.save();
  ctx.translate((Math.random() - 0.5) * S * 0.01 * (1 - k), 0);
  scene();
  ctx.restore();
  // the dome of force where blade meets claw
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = S * (0.15 + ease.out3(k) * 0.8);
  ctx.globalAlpha = (1 - k) * 0.9;
  drawSprite(ctx, glow(RED.c, 128), cx, cy, R * 2.2);
  drawSprite(ctx, glow(VIOLET.c, 128), cx + S * 0.05, cy, R * 1.6);
  ctx.globalAlpha = 1;
  ctx.restore();
  shockRing(g, cx, cy, k, S * 1.2, S * 1.2, '#ffffff');
  cracks(g, cx, h * 0.9, k * 2, S * 0.9, 0.2, 31);
  debris(g, cx, h * 0.9, ease.out2(k) * 0.8, 30, 9, 3);
  // sparks
  const r = rng(13);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 50; i++) {
    const a = r() * TAU, v = S * (0.4 + r() * 1.2);
    const d = ease.out2(k) * v;
    ctx.strokeStyle = withAlpha(r() > 0.5 ? RED.hot : '#ffffff', 1 - k);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
    ctx.lineTo(cx + Math.cos(a) * (d + S * 0.04), cy + Math.sin(a) * (d + S * 0.04));
    ctx.stroke();
  }
  ctx.restore();
}

/* 13. the slash barrage: four cuts, four framings */
function shotSlashes(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const n = 4;
  const i = Math.min(n - 1, Math.floor(q * n));
  const k = q * n - i;
  const angles = [0.5, -0.6, 2.6, -0.1];
  const zooms = [1.6, 2.0, 1.8, 1.0];
  const offs: Pt[] = [[0.05, -0.1], [-0.1, 0.05], [0.1, 0.1], [0, 0]];
  if (hitQ(i / n + 0.02)) g.f.shake(S * 0.035);
  ctx.save();
  // each cut its own camera: tilted, close, on a different part of the beast
  ctx.translate(w / 2, h / 2);
  ctx.rotate((i % 2 ? -1 : 1) * 0.12);
  ctx.scale(zooms[i], zooms[i]);
  ctx.translate(-w / 2 + offs[i][0] * S, -h / 2 + offs[i][1] * S);
  world(g, { x: 0, y: 0, z: 1 }, { tint: 0.25 });
  beast(g, w * 0.55, h * 0.95, S * 0.95, { arm: 1.4, roar: 0.5 + 0.5 * bell(k, 0, 1), boil: 1, face: -1, wounds: (i + clamp(k * 2)) / n });
  ctx.restore();
  // the crescent of the cut, sweeping across the frame
  const sweep = ease.out5(seg(k, 0, 0.35));
  const fade = 1 - seg(k, 0.35, 1);
  if (sweep > 0) {
    const a = angles[i];
    const cx = w / 2, cy = h / 2;
    const R = Math.hypot(w, h) * 0.55;
    const a0 = a - 1.2, a1 = lerp(a - 1.2, a + 1.2, sweep);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [wd, col, al] of [[S * 0.09, RED.c, 0.35], [S * 0.035, RED.hot, 0.9], [S * 0.01, RED.core, 1]] as const) {
      ctx.strokeStyle = withAlpha(col, al * fade);
      ctx.lineWidth = wd;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx - Math.cos(a) * R * 0.6, cy - Math.sin(a) * R * 0.6, R, a0, a1);
      ctx.stroke();
    }
    ctx.restore();
  }
  // ink bursting off the wound
  const r = rng(40 + i);
  for (let j = 0; j < 22; j++) {
    const an = r() * TAU, v = S * (0.3 + r());
    const d = ease.out2(clamp(k * 1.5)) * v;
    ctx.fillStyle = j % 5 ? K.ink : RED.hot;
    ctx.beginPath();
    ctx.arc(w / 2 + Math.cos(an) * d, h / 2 + Math.sin(an) * d + d * d / S * 0.3, S * (0.006 + r() * 0.02) * (1 - k * 0.5), 0, TAU);
    ctx.fill();
  }
  speedLines(g, w / 2, h / 2, 'rgba(255,255,255,0.25)', 40, 0.4, fade, 20 + i);
  // each new framing is its own cut
  if (i > 0) cutFlash(g, k / 0.15);
  void t;
}

/* 14. regeneration, and the tendrils that come for the camera */

/** a tapering, curling tendril of ink from `from` toward `to`, drawn over [u0, u1] of its length */
function tendril(g: G, from: Pt, to: Pt, bend: number, thick: number, u0: number, u1: number, seed: number) {
  const { ctx, S, t } = g;
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const n = 18;
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = lerp(u0, u1, i / n);
    // a lazy S along the length, and a hook that curls at the tip
    const off = Math.sin(u * Math.PI) * bend * L + Math.sin(u * 7 + t * 5 + seed) * S * 0.015 * u + u ** 4 * bend * L * 0.8;
    const cx = from[0] + dx * u + nx * off, cy = from[1] + dy * u + ny * off;
    const r = thick * (1 - u * 0.92) * 0.5;
    left.push([cx + nx * r, cy + ny * r]);
    right.push([cx - nx * r, cy - ny * r]);
  }
  ctx.beginPath();
  left.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fillStyle = K.ink;
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = withAlpha(VIOLET.c, 0.6);
  ctx.lineWidth = Math.max(1, thick * 0.06);
  ctx.beginPath();
  left.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.stroke();
  ctx.restore();
  return { tip: left[n], mid: [(left[0][0] + right[0][0]) / 2, (left[0][1] + right[0][1]) / 2] as Pt };
}

function shotTendrils(g: G, q: number) {
  const { ctx, w, h, S } = g;
  world(g, { x: 0.02, y: 0, z: 1.05 });
  const bx = w * 0.55, gy = h * 0.88;
  // the wounds close
  const heal = seg(q, 0, 0.3);
  beast(g, bx, gy, S * 0.95, { arm: 0.6, roar: 0.4 + bell(q, 0.25, 0.5) * 0.6, boil: 1, face: -1, wounds: 1 - heal });
  // tendrils lashing at the viewer
  const lash = ease.in2(seg(q, 0.25, 0.62));
  const cut = seg(q, 0.62, 0.66);
  const drop = ease.in2(seg(q, 0.64, 0.95));
  const r = rng(77);
  const from: Pt = [bx, gy - S * 0.5];
  for (let i = 0; i < 9; i++) {
    const to: Pt = [w * (r() * 1.2 - 0.1), h * (r() * 1.2 - 0.1)];
    const bend = (r() - 0.5) * 0.5;
    const thick = S * (0.05 + 0.16 * lash);
    if (lash <= 0) continue;
    if (cut < 1) {
      const end = tendril(g, from, to, bend, thick, 0, lash, i);
      if (lash > 0.2) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        drawSprite(ctx, glow(RED.c, 64), end.tip[0], end.tip[1], thick * 1.6);
        ctx.restore();
      }
      continue;
    }
    // cut through: the root whips back into the body, the severed end falls away
    const at = 0.45 + hash(i) * 0.15;
    tendril(g, from, to, bend, thick, 0, at * (1 - drop * 0.9), i);
    ctx.save();
    ctx.globalAlpha = 1 - drop;
    const px = lerp(from[0], to[0], at), py = lerp(from[1], to[1], at);
    ctx.translate(px, py + drop * h * 0.5);
    ctx.rotate(drop * (hash(i * 3) - 0.5) * 2);
    ctx.translate(-px, -py);
    tendril(g, from, to, bend, thick, at, 1, i);
    // the cut face, still burning
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glow(RED.c, 64), px, py, thick * 2 * (1 - drop));
    ctx.restore();
  }
  // the parry: one ring of red, cut around the camera
  if (cut > 0) {
    if (hitQ(0.63)) g.f.shake(S * 0.04);
    const fade = 1 - seg(q, 0.66, 0.9);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [wd, col, al] of [[S * 0.1, RED.c, 0.35], [S * 0.035, RED.hot, 0.9], [S * 0.012, RED.core, 1]] as const) {
      ctx.strokeStyle = withAlpha(col, al * fade);
      ctx.lineWidth = wd;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, S * 0.42, -Math.PI / 2, -Math.PI / 2 + TAU * ease.out5(cut));
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* 15. the charge: from below, the sword raised, the sky splitting */
function shotCharge(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const rot = Math.sin(q * 2) * 0.04;
  world(g, { x: 0, y: 0.18, z: lerp(1.05, 1.25, q), rot }, { tint: 0.1 + q * 0.2 });
  // the sky cracks
  const crack = ease.out2(seg(q, 0.2, 0.7));
  if (crack > 0) {
    const pts: Pt[] = [];
    for (let i = 0; i <= 8; i++) pts.push([w * 0.5 + (hash(i * 3) - 0.5) * S * 0.25, -10 + (h * 0.55 * crack * i) / 8]);
    drawBolt(ctx, pts, t, { width: S * 0.009, amp: S * 0.025, seed: 8, branches: 8, pal: RED });
  }
  const gy = h * 0.98;
  const s = S * (g.portrait ? 0.95 : 0.75);
  const raise = ease.inOut3(seg(q, 0, 0.35));
  const a = lerp(Math.PI * 0.86, -Math.PI / 2, raise);
  const hx = w * 0.5, hy = lerp(gy - s * 0.42, gy - s * 0.78, raise);
  // dark energy spiralling into the blade
  const tipX = hx + Math.cos(a) * s * 0.95, tipY = hy + Math.sin(a) * s * 0.95;
  const pull = seg(q, 0.3, 1);
  ctx.save();
  for (let i = 0; i < 80; i++) {
    const ph = hash(i * 3.7);
    const life = (t * (0.5 + hash(i) * 0.6) + ph) % 1;
    const r0 = S * (0.3 + hash(i * 5) * 0.8) * (1 - life);
    const an = ph * TAU + life * 6;
    const x = lerp(hx, tipX, hash(i * 9)) + Math.cos(an) * r0;
    const y = lerp(hy, tipY, hash(i * 9)) + Math.sin(an) * r0 * 0.6;
    ctx.globalAlpha = pull * (1 - life) * 0.9;
    ctx.fillStyle = i % 3 ? '#000000' : i % 2 ? RED.c : VIOLET.c;
    ctx.beginPath();
    ctx.arc(x, y, S * 0.008 * (1.4 - life), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // a black-violet flame rising around the body
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6 * pull;
  drawSprite(ctx, glow(VIOLET.c, 128), hx, hy - s * 0.2, s * 1.4, s * 2);
  ctx.restore();
  // rocks lifting off the ground
  const r = rng(51);
  for (let i = 0; i < 16; i++) {
    const x = w * r(), lift = pull * S * (0.2 + r() * 0.6);
    const y = gy - lift - Math.sin(t * 1.5 + i) * S * 0.01;
    const sz = S * (0.01 + r() * 0.03);
    ctx.fillStyle = '#140d1d';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.3 * (r() - 0.5) + i);
    ctx.fillRect(-sz, -sz * 0.6, sz * 2, sz * 1.2);
    ctx.strokeStyle = withAlpha(RED.c, 0.6);
    ctx.strokeRect(-sz, -sz * 0.6, sz * 2, sz * 1.2);
    ctx.restore();
  }
  knight(g, hx, hy, a, s, w * 0.9, gy, { lit: 1, veins: 1 });
  // the blade's glow building to white
  const hot = seg(q, 0.6, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = hot;
  drawSprite(ctx, glow(RED.c, 128), tipX, tipY, S * (0.4 + hot * 0.8));
  ctx.restore();
  // violet lightning crawling down from the crack to the blade
  if (q > 0.55) {
    drawBolt(ctx, [[w * 0.5, h * 0.5 * crack], [tipX, tipY]], t, { width: S * 0.004, amp: S * 0.04, seed: 19, alpha: seg(q, 0.55, 0.75), branches: 4, pal: VIOLET });
  }
}

/* 16. the beam */
function shotBeam(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  if (hitQ(0.06)) {
    g.f.shake(S * 0.06);
    g.f.flash(0.8, RED.hot);
  }
  if (q < 0.55) {
    // the swing, and the beam crossing the frame on a diagonal into the beast
    world(g, { x: 0.05, y: 0, z: 1.05 }, { tint: 0.3 });
    const k = seg(q, 0, 0.55);
    const s = S * (g.portrait ? 0.55 : 0.45);
    const kx = w * 0.2, gy = h * 0.9, hy = gy - s * 0.5;
    const bs = S * (g.portrait ? 0.62 : 0.7), bx = w * 0.74, bgy = h * 0.7;
    const target: Pt = [bx - bs * 0.05, bgy - bs * 0.55];
    const dis = ease.in2(seg(k, 0.3, 1));
    beast(g, bx, bgy, bs, { arm: 1, roar: 1, boil: 1, face: -1, dissolve: dis });
    const aim = Math.atan2(target[1] - hy, target[0] - kx);
    const swing = ease.out5(seg(k, 0, 0.1));
    const a = lerp(-Math.PI / 2, aim, swing);
    knight(g, kx, hy, a, s, w, gy, { lit: 1 });
    const dx = Math.cos(a), dy = Math.sin(a);
    if (swing >= 1) {
      const tx = kx + dx * s * 0.95, ty = hy + dy * s * 0.95;
      // the beam stops against the beast while it stands, then runs on into the sky
      const holding = dis < 0.85;
      beam(g, tx, ty, a, k, S * 0.22, holding ? Math.hypot(target[0] - tx, target[1] - ty) : undefined);
      if (holding) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const fl = 0.85 + Math.sin(t * 50) * 0.15;
        drawSprite(ctx, glow(RED.hot, 128), target[0], target[1], S * 0.7 * fl);
        drawSprite(ctx, glow(VIOLET.c, 128), target[0], target[1], S * 1.1 * fl);
        ctx.restore();
      }
    }
    // the beast coming apart into ink, blown back along the beam
    if (dis > 0) {
      const r = rng(88);
      for (let i = 0; i < 90; i++) {
        const sx = bx + (r() - 0.5) * bs * 0.7, sy = bgy - r() * bs * 0.95;
        const d = dis * S * (0.4 + r() * 1.4);
        const wob = (r() - 0.5) * d * 0.3;
        ctx.globalAlpha = 1 - dis * 0.6;
        ctx.fillStyle = i % 4 ? K.ink : RED.c;
        ctx.fillRect(sx + dx * d - dy * wob, sy + dy * d + dx * wob, S * 0.012, S * 0.012);
      }
      ctx.globalAlpha = 1;
    }
    return;
  }
  if (q < 0.75) {
    // close: the beam hits the beast full in the face and it comes apart
    const k = seg(q, 0.55, 0.75);
    ctx.fillStyle = '#050208';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.6;
    drawSprite(ctx, glow(RED.deep, 128), w * 0.6, h * 0.46, S * 2.4, S * 1.6);
    ctx.restore();
    const s = S * 1.9;
    const hx = w * 0.66, hy = h * 0.46;
    const { head } = beast(g, hx + s * 0.2, hy + s * 0.86, s, { arm: 0.8, roar: 1, boil: 1, face: -1, dissolve: 0.1 + k * 0.6 });
    const face = head[0] - s * 0.11;
    const by = head[1] + s * 0.03;
    beam(g, -w * 0.1, by, 0, 0.5, S * 0.42, face + w * 0.1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glow(RED.hot, 128), face, by, S * (0.9 + Math.sin(t * 50) * 0.08));
    ctx.restore();
    // ink torn off the face and thrown back past the head
    const r = rng(91);
    for (let i = 0; i < 80; i++) {
      const sy = by + (r() - 0.5) * S * 0.5;
      const v = S * (0.3 + r() * 1.6);
      const d = ((k * 1.4 + r()) % 1) * v;
      ctx.globalAlpha = 1 - d / v;
      ctx.fillStyle = i % 5 ? K.ink : RED.hot;
      ctx.fillRect(face + d, sy + (r() - 0.5) * d * 0.4, S * (0.008 + r() * 0.02), S * (0.006 + r() * 0.01));
    }
    ctx.globalAlpha = 1;
    speedLines(g, face, by, 'rgba(0,0,0,0.6)', 60, 0.3, 1, 33);
    cutFlash(g, k / 0.08);
    return;
  }
  // extreme wide: the whole land, one column of dark light across the sky
  const k = seg(q, 0.75, 1);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#120612');
  sky.addColorStop(1, '#3a0a1c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // clouds lit red from underneath
  for (let i = 0; i < 8; i++) {
    ctx.globalAlpha = 0.5;
    drawSprite(ctx, glow(i % 2 ? '#7a1028' : '#2a0f3a', 128), w * (i / 7), h * (0.1 + (i % 3) * 0.08), S * 1.2, S * 0.3);
  }
  ctx.globalAlpha = 1;
  const sp = spires(w, h);
  ctx.drawImage(sp, 0, h * 0.72 - sp.height * 0.4, w, sp.height * 0.4);
  ctx.fillStyle = '#040206';
  ctx.fillRect(0, h * 0.72, w, h);
  beam(g, w * 0.32, h * 0.74, -1.25, 0.6, S * 0.12);
  shockRing(g, w * 0.32, h * 0.74, k, S * 1.4, S * 0.15, RED.c);
  cutFlash(g, k / 0.1);
}

/**
 * The beam of darkness: violet corona, red edges, a black core, spiralling
 * strands. `len` stops it short (against something it is hitting).
 */
function beam(g: G, x: number, y: number, a: number, k: number, widthOverride?: number, len?: number) {
  const { ctx, w, h, S, t } = g;
  const grow = ease.out3(seg(k, 0, 0.15));
  const fade = 1 - seg(k, 0.85, 1);
  const W = (widthOverride ?? S * 0.32) * grow * fade;
  if (W <= 0) return;
  const L = len ?? Math.hypot(w, h) * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.globalCompositeOperation = 'lighter';
  const flick = 1 + Math.sin(t * 40) * 0.05;
  // the corona stays thin so the black core reads as the beam itself
  // a beam that is stopped short ends in a rounded head, not a cut edge
  const bar = (hh: number) => {
    ctx.beginPath();
    if (len === undefined) ctx.rect(0, -hh / 2, L, hh);
    else ctx.roundRect(0, -hh / 2, L, hh, [0, hh / 2, hh / 2, 0]);
    ctx.fill();
  };
  for (const [mul, col, al] of [[2.2, VIOLET.c, 0.16], [1.45, RED.deep, 0.4], [1.18, RED.c, 0.75], [1.06, RED.hot, 0.9]] as const) {
    ctx.fillStyle = withAlpha(col, al);
    bar(W * mul * flick);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000000';
  bar(W);
  // strands twisting along it: a long pitch, so they read as a spiral, not a mesh
  const pitch = Math.max(W, S * 0.12) * 2.4;
  ctx.lineWidth = Math.max(1, W * 0.04);
  for (let s = 0; s < 3; s++) {
    ctx.strokeStyle = s % 2 ? withAlpha(RED.hot, 0.8) : withAlpha(VIOLET.hot, 0.6);
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const xx = (i / 60) * L;
      const yy = Math.sin(xx / pitch - t * 18 + s * 2.1) * W * 0.42;
      if (i) ctx.lineTo(xx, yy);
      else ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  // the source flare
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow(RED.hot, 128), x, y, Math.min(W, S * 0.3) * 3.5);
  ctx.restore();
}

/* 17. aftermath */
function shotAfter(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  world(g, { x: 0, y: 0, z: lerp(1.1, 1.0, q) });
  const s = S * (g.portrait ? 0.7 : 0.5);
  const gy = h * 0.86;
  // kneeling, sword planted; the runes go out one by one
  const kneel = ease.inOut2(seg(q, 0, 0.3));
  const hx = w * 0.42, hy = lerp(gy - s * 0.42, gy - s * 0.22, kneel);
  const lit = 1 - ease.inOut2(seg(q, 0.25, 0.8));
  knight(g, hx, hy, lerp(Math.PI * 0.8, Math.PI * 0.5, kneel), s, w * 0.9, gy, { lit, veins: lit });
  // where the beast stood: a scorch and smoke
  ctx.save();
  ctx.globalAlpha = 0.6;
  drawSprite(ctx, glow('#000000', 128), w * 0.78, gy, S * 0.8, S * 0.15);
  for (let i = 0; i < 4; i++) {
    const rise = ((t * 0.15 + i * 0.25) % 1);
    ctx.globalAlpha = 0.3 * (1 - rise);
    drawSprite(ctx, glow('#4a3a5a', 128), w * 0.78 + Math.sin(t + i) * S * 0.05, gy - rise * S * 0.8, S * 0.4, S * 0.3);
  }
  ctx.restore();
  // Blot peeks out from behind a rock, then cheers
  const rx = w * 0.84, ry = gy;
  const peek = ease.outBack(seg(q, 0.35, 0.55), 2);
  if (peek > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * peek;
    drawSprite(ctx, glow(VIOLET.c, 64), rx - S * 0.02, ry - S * 0.06, S * 0.3);
    ctx.restore();
    drawBlot(ctx, rx - S * 0.02, lerp(ry + S * 0.06, ry - S * 0.075, peek), S * 0.15, { t, pose: q > 0.62 ? 'cheer' : 'shock', look: [hx, hy], seed: 12, eye: '#fbfaf5' });
  }
  ctx.fillStyle = '#0c0814';
  ctx.beginPath();
  ctx.moveTo(rx - S * 0.12, ry + 2);
  ctx.lineTo(rx - S * 0.08, ry - S * 0.07);
  ctx.lineTo(rx + S * 0.02, ry - S * 0.09);
  ctx.lineTo(rx + S * 0.1, ry - S * 0.04);
  ctx.lineTo(rx + S * 0.13, ry + 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = withAlpha(RED.c, 0.5);
  ctx.stroke();
}

/* 18. exit: the ink draws back, the old night opens up again, and the ring
 * shrinks onto the falling star that the match is already showing */
function shotExit(g: G, q: number) {
  const { w, h, S, t } = g;
  const open = ease.inOut2(seg(q, 0.1, 0.85));
  const diag = Math.hypot(w, h);
  outsideHole(g, w / 2, h * 0.42, lerp(-S * 0.05, diag * 0.78, open), 5, () => world(g, { x: 0, y: -0.1 * q, z: 1 }));
  const star = starOnScreen(g, ALTER_AT) ?? [w * 0.48, h * 0.12];
  const fly = ease.inOut3(seg(q, 0, 0.9));
  targetRing(g, lerp(w * 0.5, star[0], fly), lerp(h * 0.35, star[1], fly), lerp(S * 0.08, S * 0.01, fly), 1 - seg(q, 0.75, 1), t);
}
