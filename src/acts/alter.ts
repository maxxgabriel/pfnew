import { drawBlot } from '../core/blot';
import { drawBolt } from '../core/bolt';
import { brush, ensoPath } from '../core/brush';
import type { Frame } from '../core/frame';
import { type Pt, TAU, bell, clamp, ease, hash, lerp, rng, seg } from '../core/math';
import { blot, canvas, drawSprite, glow, withAlpha } from '../core/sprites';
import { penTrail } from '../core/signature';
import { F, font } from '../core/style';
import { drawLightLine } from './ink';
import { drawWarrior, solve } from './warrior';

/*
 * III · ALTER.
 *
 * The film's set piece, cut like an episode of anime: twenty-six shots, hard
 * cuts between them, close-ups, impact frames, speed lines. The blue warrior
 * comes back corrupted, a black knight with red light running through
 * them, against their old rival reborn in violet light, who drops out of a target ring
 * in a bruised purple sky. It plays inside a hold, so its own progress (p)
 * runs 0→1 while the rest of the film waits at the edge of the night sky.
 *
 * Everything is a function of p (the scroll) and t (the clock), so scrolling
 * back plays the fight in reverse and holding still keeps the embers rising.
 */

export const RED = { deep: '#7a0014', c: '#ff1f3d', hot: '#ff7486', core: '#fff1f3' };
export const VIOLET = { deep: '#2a0a66', c: '#7b3cff', hot: '#b892ff', core: '#f1e9ff' };
/** the knight's old colour, surfacing in the stillness */
const BLUE = { deep: '#06184a', c: '#2f6bff', hot: '#8fc2ff', core: '#eef6ff' };
/** the void: cold white light */
const VOID = { deep: '#1a2a6a', c: '#7fb2ff', hot: '#d4e6ff', core: '#ffffff' };
type Pal = typeof RED;
const K = {
  sky0: '#06030c', sky1: '#1a0e2c', sky2: '#2e1a48', ink: '#050307', floor: '#07040b',
  moon: '#6a0f22', ash: '#3a3346',
};

/* ---------------------------------------------------------------- shots */

type Shot = {
  name: string;
  dur: number;
  draw: (g: G, q: number) => void;
  /** embers: rising (default), frozen in the air, or none */
  embers?: 'live' | 'frozen' | 'none';
  /** the colour of the cut's overexposed frame; null for no flash and no jolt */
  flash?: string | null;
};

interface G {
  f: Frame;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  S: number;
  t: number;
  portrait: boolean;
}

const ALL_SHOTS: Shot[] = [
  { name: 'corrupt', dur: 0.9, draw: shotCorrupt },
  { name: 'title', dur: 0.6, draw: shotTitle },
  { name: 'wide', dur: 1.0, draw: shotWide, flash: null },
  { name: 'feet', dur: 0.45, draw: shotFeet },
  { name: 'sword', dur: 0.6, draw: shotSword },
  { name: 'eyes', dur: 0.5, draw: shotEyes },
  { name: 'ring', dur: 0.65, draw: shotRing, flash: null },
  { name: 'impact', dur: 0.75, draw: shotImpact },
  { name: 'reveal', dur: 0.5, draw: shotReveal },
  { name: 'standoff', dur: 0.5, draw: shotStandoff },
  { name: 'dash', dur: 0.38, draw: shotDash },
  { name: 'clash', dur: 0.6, draw: shotClash },
  { name: 'slashes', dur: 0.7, draw: shotSlashes },
  { name: 'volley', dur: 0.55, draw: shotVolley },
  // dead calm: time stops in a circle around the knight
  { name: 'still', dur: 0.6, draw: shotStill, embers: 'frozen', flash: null },
  { name: 'calm', dur: 1.25, draw: shotCalm, embers: 'frozen', flash: null },
  { name: 'drop', dur: 0.5, draw: shotDrop, embers: 'frozen', flash: null },
  // the drop goes under, and so do we
  { name: 'beneath', dur: 1.1, draw: shotBeneath, embers: 'none', flash: null },
  { name: 'release', dur: 0.7, draw: shotRelease },
  // the domain: the world is swallowed by an endless void, and broken open again
  { name: 'sign', dur: 0.55, draw: shotSign, embers: 'none' },
  { name: 'expand', dur: 0.85, draw: shotExpand, embers: 'none', flash: '255,255,255' },
  { name: 'void', dur: 1.1, draw: shotVoid, embers: 'none', flash: '200,225,255' },
  { name: 'shatter', dur: 0.75, draw: shotShatter, embers: 'none', flash: null },
  { name: 'charge', dur: 1.0, draw: shotCharge },
  // the beam clash
  { name: 'fire', dur: 1.0, draw: shotFire },
  { name: 'driven', dur: 0.35, draw: shotDriven },
  { name: 'strain', dur: 0.35, draw: shotStrain },
  { name: 'push', dur: 0.75, draw: shotPush },
  { name: 'snap', dur: 0.4, draw: shotSnap },
  { name: 'column', dur: 0.5, draw: shotColumn },
  { name: 'after', dur: 0.75, draw: shotAfter },
  { name: 'exit', dur: 0.5, draw: shotExit },
];
/**
 * Round 10: the owner wanted the act about a third as long. Only these shots play (in this
 * order); the rest stay in ALL_SHOTS so the cut is easy to retune. It ends on the column: the
 * Spark rising out of the beam clash, which falls into the stadium as the match ball.
 */
const KEEP = ['corrupt', 'title', 'standoff', 'dash', 'clash', 'slashes', 'calm', 'charge', 'fire', 'push', 'snap', 'column'];
const SHOTS = ALL_SHOTS.filter((s) => KEEP.includes(s.name));
const TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0);

let lastShot = -1;
let lastQ = 0;

/** dev: the hold progress p at which shot `name` is at its own progress q */
export function alterShotP(name: string, q = 0.5): number {
  let acc = 0;
  for (const s of SHOTS) {
    if (s.name === name) return (acc + s.dur * clamp(q)) / TOTAL;
    acc += s.dur;
  }
  return 0;
}

export function drawAlter(f: Frame, p: number) {
  const { ctx, w, h, t } = f;
  const g: G = { f, ctx, w, h, S: Math.min(w, h), t, portrait: h > w };
  // which shot, and how far through it
  let acc = 0, i = 0;
  const at = clamp(p) * TOTAL;
  while (i < SHOTS.length - 1 && acc + SHOTS[i].dur <= at) acc += SHOTS[i++].dur;
  const q = clamp((at - acc) / SHOTS[i].dur);
  const shot = SHOTS[i];
  // a hard cut lands with a jolt (not into the stillness)
  if (i !== lastShot && lastShot >= 0 && Math.abs(i - lastShot) === 1 && !f.reduced && shot.flash !== null) f.shake(g.S * 0.008);
  const prevQ = i === lastShot ? lastQ : -1;
  lastShot = i;
  lastQ = q;
  hitQ = (x: number) => prevQ >= 0 && prevQ < x && q >= x;
  ctx.save();
  shot.draw(g, q);
  ctx.restore();
  // embers and ash in front of every shot but the black title
  const em = shot.embers ?? 'live';
  if (shot.name !== 'title' && em !== 'none') drawEmbers(g, i === 0 ? ease.inOut2(seg(q, 0.3, 1)) : shot.name === 'exit' ? 1 - q : 1, em === 'frozen');
  // the cut itself: a frame of overexposure on every new shot
  if (i > 0 && shot.name !== 'exit' && shot.flash !== null) cutFlash(g, q / 0.06, shot.flash);
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
function blade(g: G, hx: number, hy: number, a: number, L: number, lit: number, glowK = 1, pal: Pal = RED) {
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
    drawSprite(ctx, glow(pal.c, 128), 0, 0, L * 1.3, wb * 6);
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
  ctx.strokeStyle = pal.c;
  ctx.lineWidth = wb * 0.35;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(f0[0], f0[1]);
  ctx.lineTo(f1[0], f1[1]);
  ctx.stroke();
  ctx.strokeStyle = pal.core;
  ctx.lineWidth = wb * 0.1;
  ctx.stroke();
  // rings near the guard, igniting in turn
  for (let k = 0; k < 5; k++) {
    const on = clamp((lit - k * 0.12) / 0.15);
    if (on <= 0) continue;
    const c = pt(0.16 + k * 0.065, 0);
    const pulse = 1 + Math.sin(t * 6 - k) * 0.08;
    ctx.globalAlpha = on;
    ctx.strokeStyle = pal.hot;
    ctx.lineWidth = Math.max(1, wb * 0.16);
    ctx.beginPath();
    ctx.ellipse(c[0], c[1], wb * 0.55 * pulse, wb * 0.55 * pulse, a, 0, TAU);
    ctx.stroke();
    drawSprite(ctx, glow(pal.c, 64), c[0], c[1], wb * 3 * on);
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
function knight(g: G, hx: number, hy: number, a: number, s: number, foeX: number, groundY: number, o: { lit?: number; veins?: number; alpha?: number; vx?: number; pal?: Pal; back?: string } = {}) {
  const { ctx, t } = g;
  const pal = o.pal ?? RED;
  // the sash and headband stay Blue's: under the corruption it's the same warrior
  const wi = { hilt: [hx, hy] as Pt, a, foeX, s, groundY, color: pal.c, t, vx: o.vx ?? 0, vy: 0, seed: 7, alpha: o.alpha ?? 1, sash: '#2f5bff' };
  // a violet backlight so the black silhouette reads against the night
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55 * (o.alpha ?? 1);
  drawSprite(ctx, glow(o.back ?? VIOLET.c, 128), hx - Math.cos(a) * s * 0.1, hy + s * 0.05, s * 1.3, s * 1.9);
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
      drawBolt(ctx, pp, t * 0.3, { width: s * 0.004, amp: s * 0.02, seed: 40 + i, alpha: veins * pulse * (o.alpha ?? 1), branches: 2, pal });
    });
    ctx.restore();
  }
  blade(g, hx, hy, a, s * 0.95, o.lit ?? 1, 1, pal);
  // the pool of red light under them
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 * (o.alpha ?? 1);
  drawSprite(ctx, glow(pal.c, 128), k.pelvis[0], groundY, s * 1.8, s * 0.35);
  ctx.restore();
  return k;
}

/* ----------------------------------------------------- shared: the rival */

/** Green, reborn on the back of the page: the light of their blade turned violet, their eyes still green */
const RIVAL = { c: '#9b5cff', hot: '#e3d4ff', eye: '#7dffb0', rim: '#5a2bd6' };

interface RivalO { lit?: number; alpha?: number; vx?: number; dissolve?: number; eyes?: number; snap?: number; back?: number }

/**
 * The rival: the same brush body as the knight, a violet rim, green eyes,
 * and a blade of violet light. `dissolve` breaks them into ink blown along
 * +x; `snap` breaks the blade at that fraction of its length.
 */
function rival(g: G, hx: number, hy: number, a: number, s: number, foeX: number, groundY: number, o: RivalO = {}) {
  const { ctx, t, S } = g;
  const d = o.dissolve ?? 0;
  const alpha = (o.alpha ?? 1) * (1 - d);
  const lit = o.lit ?? 1;
  const L = s * 0.95;
  const dx = Math.cos(a), dy = Math.sin(a);
  const tip: Pt = [hx + dx * L, hy + dy * L];
  const k = solve({ hilt: [hx, hy], a, foeX, s, groundY, color: RIVAL.c, t, vx: o.vx ?? 0, vy: 0, seed: 3 });
  if (alpha > 0.01) {
    // violet backlight, so the black figure reads against the night
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * alpha * (o.back ?? 1);
    drawSprite(ctx, glow(RIVAL.rim, 128), k.chest[0], k.chest[1] + s * 0.1, s * 1.2, s * 1.8);
    ctx.restore();
    drawWarrior(ctx, { hilt: [hx, hy], a, foeX, s, groundY, color: RIVAL.c, t, vx: o.vx ?? 0, vy: 0, seed: 3, alpha, sash: '#a6f03a' });
    // eyes: two green slits under the headband
    const eyes = (o.eyes ?? 1) * alpha;
    if (eyes > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = eyes;
      const ex = k.head[0] + k.f * s * 0.028, ey = k.head[1] + s * 0.004;
      drawSprite(ctx, glow(RIVAL.eye, 64), ex, ey, s * 0.16, s * 0.08);
      ctx.fillStyle = '#eafff2';
      for (const off of [-0.018, 0.012]) {
        ctx.beginPath();
        ctx.ellipse(ex + k.f * s * off, ey, s * 0.011, s * 0.0035, k.f * -0.15, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  // the blade of light, lit from the hilt out; snapped, its point falls away
  const bladeA = alpha > 0.01 ? Math.max(alpha, 0) : 0;
  if (lit > 0 && bladeA > 0) {
    const snap = o.snap ?? 1;
    const len = L * lit * Math.min(1, snap);
    const flick = 0.9 + Math.sin(t * 37) * 0.1;
    ctx.save();
    ctx.globalAlpha = bladeA;
    drawLightLine(ctx, hx + dx * L * 0.04, hy + dy * L * 0.04, hx + dx * len, hy + dy * len, RIVAL.c, RIVAL.hot, Math.max(1.5, s * 0.016), flick);
    ctx.restore();
  }
  // guard and grip
  if (bladeA > 0) {
    ctx.save();
    ctx.globalAlpha = bladeA;
    ctx.strokeStyle = '#120a1e';
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.moveTo(hx - dy * s * 0.045, hy + dx * s * 0.045);
    ctx.lineTo(hx + dy * s * 0.045, hy - dx * s * 0.045);
    ctx.stroke();
    ctx.lineWidth = s * 0.022;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - dx * s * 0.15, hy - dy * s * 0.15);
    ctx.stroke();
    ctx.restore();
  }
  // breaking up: the figure goes to ink, blown away along +x
  if (d > 0) {
    const pts: Pt[] = [k.head, k.chest, k.pelvis, k.shoulder, k.elbow1, k.hand1, k.hand2, k.kneeF, k.kneeB, k.footF, k.footB];
    const r = rng(17);
    ctx.save();
    for (let i = 0; i < 120; i++) {
      const p0 = pts[i % pts.length];
      const ox = p0[0] + (r() - 0.5) * s * 0.18, oy = p0[1] + (r() - 0.5) * s * 0.18;
      const dd = ease.out2(clamp(d * 1.4 - r() * 0.4)) * S * (0.2 + r() * 1.1);
      ctx.globalAlpha = (1 - d) * 0.9;
      ctx.fillStyle = i % 5 ? '#07040b' : i % 2 ? RIVAL.c : RED.c;
      const sz = s * (0.008 + r() * 0.02) * (1 - d * 0.6);
      ctx.fillRect(ox + dd, oy - dd * (0.15 + r() * 0.3), sz * 1.6, sz);
    }
    ctx.restore();
  }
  return { k, tip, head: k.head };
}

/**
 * A flying slash: a crescent of violet light thrown off the rival's blade.
 * (x, y) is its middle, `a` the way it flies, `r` its half-span.
 */
function crescentPath(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.arc(-r * 0.55, 0, r * 1.15, -1.05, 1.05);
  ctx.arc(-r * 0.95, 0, r * 1.15 * 0.93, 0.98, -0.98, true);
  ctx.closePath();
}
function crescent(g: G, x: number, y: number, a: number, r: number, alpha: number, half = 0, cold = false) {
  const { ctx, S } = g;
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  // half: -1 keeps one horn, 1 the other (a crescent cut through the middle)
  if (half) {
    ctx.beginPath();
    ctx.rect(-r * 3, half < 0 ? -r * 3 : 0, r * 6, r * 3);
    ctx.clip();
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  const col = cold ? '#8fc2ff' : RIVAL.c;
  drawSprite(ctx, glow(col, 128), r * 0.4, 0, r * 2.2, r * 3.4);
  ctx.fillStyle = withAlpha(col, 0.85);
  crescentPath(ctx, r);
  ctx.fill();
  ctx.strokeStyle = cold ? '#eef6ff' : RIVAL.hot;
  ctx.lineWidth = Math.max(1, S * 0.003);
  ctx.stroke();
  // the hot leading edge
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();
  ctx.arc(-r * 0.55, 0, r * 1.15, -0.85, 0.85);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------ shared: effects */

interface Ember { x: number; y: number; v: number; ph: number; r: number; ash: boolean }
let embers: Ember[] = [];
let lastT = 0;
function drawEmbers(g: G, alpha: number, frozen = false) {
  const { ctx, w, h, S, t } = g;
  // frozen: time has stopped, so nothing moves; the embers hang as cold motes
  const dt = frozen ? 0 : Math.min(0.05, t - lastT || 0.016);
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
    if (frozen) {
      ctx.globalAlpha = alpha * (e.ash ? 0.35 : 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.5 + e.ph * 5)));
      ctx.fillStyle = e.ash ? '#4a5a7a' : BLUE.hot;
      ctx.fillRect(e.x, e.y, e.r, e.r);
      continue;
    }
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
function cutFlash(g: G, k: number, rgb = '255,40,70') {
  const a = 1 - clamp(k);
  if (a <= 0) return;
  g.ctx.fillStyle = `rgba(${rgb},${0.18 * a})`;
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
  // at the end it swings level and settles where the next shot's horizon will be (a match cut)
  const sl = ease.out5(seg(q, 0, 0.18));
  const flat = ease.inOut3(seg(q, 0.7, 0.95));
  if (sl > 0) {
    const y1 = lerp(lerp(h * 0.62, h * 0.38, sl), h * 0.62, flat);
    drawBolt(ctx, [[-w * 0.1, h * 0.62], [lerp(-w * 0.1, w * 1.1, sl), y1]], t, { width: S * lerp(0.01, 0.005, flat), amp: S * 0.004 * (1 - flat), seed: 2, branches: 0, pal: RED, alpha: 1 });
  }
  if (hitQ(0.12)) g.f.shake(S * 0.03);
  ctx.font = font(100, F.display);
  const px = Math.min((w * 0.86 / ctx.measureText('ALTER').width) * 100, S * 0.3);
  const k = ease.out3(seg(q, 0.12, 0.35)) * (1 - seg(q, 0.62, 0.78));
  const glitch = q > 0.12 && q < 0.4 ? 1 : 0.25;
  letterTitle(g, 'ALTER', w / 2, h * 0.5, px * lerp(1.25, 1, k), k, glitch);
  ctx.save();
  ctx.font = font(Math.max(11, S * 0.035), F.serif, 600);
  ctx.textAlign = 'center';
  ctx.fillStyle = withAlpha(RED.hot, seg(q, 0.3, 0.5) * (1 - seg(q, 0.6, 0.72)));
  ctx.fillText('III  ·  the back of the page', w / 2, h * 0.5 + px * 0.62);
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
  // the title's slash is the horizon: the world comes up out of black around it
  const up = seg(q, 0, 0.22);
  if (up < 1) {
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${1 - ease.inOut2(up)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - up;
    ctx.fillStyle = RED.c;
    ctx.fillRect(0, h * 0.62 - S * 0.0025, w, S * 0.005);
    drawSprite(ctx, glow(RED.c, 128), w / 2, h * 0.62, w * 1.6, S * 0.08);
    ctx.restore();
  }
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
  // match cut: everything goes but the right eye, which rises and rounds into the ring in the sky
  matchEye(g, q, [w / 2 + S * 0.2, cy], [w / 2, h * 0.4], S * 0.06, RED.c, RED.core);
}

/** the last part of an eyes shot: black takes the frame, the eye glides to `to` and becomes a disc of radius r */
function matchEye(g: G, q: number, from: Pt, to: Pt, r: number, col: string, core: string, end = col) {
  const { ctx, w, h, S } = g;
  const k = seg(q, 0.8, 1);
  if (k <= 0) return;
  const m = ease.inOut3(k);
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${Math.min(1, k * 3)})`;
  ctx.fillRect(0, 0, w, h);
  const x = lerp(from[0], to[0], m), y = lerp(from[1], to[1], m);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6;
  drawSprite(ctx, glow(col, 128), x, y, lerp(S * 0.5, r * 6, m), lerp(S * 0.22, r * 6, m));
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = end === col ? col : mixHex(col, end, m);
  ctx.beginPath();
  ctx.ellipse(x, y, lerp(S * 0.11, r, m), lerp(S * 0.03, r, m), 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = core;
  ctx.globalAlpha = 1 - m;
  ctx.beginPath();
  ctx.ellipse(x, y, S * 0.025 * (1 - m) + 0.5, S * 0.02 * (1 - m) + 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* 7. the sky ring, and who falls out of it */
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
    const x = w * (i / 6);
    ctx.beginPath();
    ctx.moveTo(x - S * 0.12, h);
    ctx.lineTo(x + (w / 2 - x) * 0.35, h * (0.55 + hash(i) * 0.2));
    ctx.lineTo(x + S * 0.12, h);
    ctx.fill();
  }
  const rx = w / 2, ry = h * 0.4;
  const crack = seg(q, 0.15, 0.4);
  // coming in on the eye's match cut: the sky rises out of black around the ring
  const up = seg(q, 0, 0.15);
  if (up < 1) {
    ctx.fillStyle = `rgba(0,0,0,${1 - up})`;
    ctx.fillRect(0, 0, w, h);
  }
  targetRing(g, rx, ry, S * lerp(0.2, 0.32, q), (1 - seg(q, 0.7, 0.9)) * Math.max(up, 0.0001) ** 0.3, t);
  if (up < 0.3) {
    ctx.fillStyle = RED.c;
    ctx.beginPath();
    ctx.arc(rx, ry, S * 0.06, 0, TAU);
    ctx.fill();
  }
  if (crack > 0) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + 0.3;
      drawBolt(ctx, [[rx, ry], [rx + Math.cos(a) * S * 0.5 * crack, ry + Math.sin(a) * S * 0.5 * crack]], t, { width: S * 0.004, amp: S * 0.02, seed: k, alpha: crack, branches: 1, pal: RED });
    }
  }
  // a figure drops out of the ring, feet first, the blade trailing light above them
  const fall = ease.in3(seg(q, 0.35, 1));
  if (fall > 0) {
    const s = S * lerp(0.12, 2.4, fall);
    const hx = rx + s * 0.05, hy = ry + s * 0.25;
    // the streak it leaves behind
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(rx, ry, hx, hy);
    gr.addColorStop(0, 'rgba(155,92,255,0)');
    gr.addColorStop(1, 'rgba(155,92,255,0.5)');
    ctx.strokeStyle = gr;
    ctx.lineWidth = s * 0.25;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.restore();
    rival(g, hx, hy, -Math.PI / 2 - 0.35, s, rx - s, hy + s * 3, { lit: 1, vx: 0 });
  }
  speedLines(g, rx, ry, withAlpha(RIVAL.hot, 0.5), 50, 0.25, seg(q, 0.4, 0.9), 3);
}

/* 8. the landing: one knee down in the black water, blade driven into it, then rising */
function shotImpact(g: G, q: number) {
  const { ctx, w, h, S } = g;
  const shake = q < 0.3 ? (Math.random() - 0.5) * S * 0.04 * (1 - q / 0.3) : 0;
  ctx.save();
  ctx.translate(shake, shake * 0.6);
  const cam = { x: 0, y: 0, z: lerp(1.15, 1.0, ease.out3(q)) };
  world(g, cam, { tint: 0.15 * (1 - q) });
  const gy = h * 0.8;
  const s = S * (g.portrait ? 0.78 : 0.62);
  const bx = w * 0.6;
  const rise = ease.inOut2(seg(q, 0.45, 0.95));
  // crouched low on landing, blade planted ahead; then up into a guard
  const hy = lerp(gy - s * 0.2, gy - s * 0.5, rise);
  const a = lerp(Math.PI * 0.62, -Math.PI * 0.72, rise);
  rival(g, bx - s * 0.06, hy, a, s, 0, gy, { lit: 1, eyes: seg(q, 0.55, 0.75) });
  cracks(g, bx, gy, q * 1.5, S * 0.8, 0.25, 21);
  shockRing(g, bx, gy, seg(q, 0, 0.6), S * 1.4, S * 0.25, RIVAL.c);
  shockRing(g, bx, gy, seg(q, 0.05, 0.7), S * 1.1, S * 0.18, RED.c);
  debris(g, bx, gy, ease.out2(seg(q, 0, 0.8)), 40, 5, 2.4);
  // spray boiling out along the water
  ctx.save();
  for (let i = 0; i < 10; i++) {
    const d = ease.out3(q) * S * (0.4 + hash(i) * 0.8) * (i % 2 ? 1 : -1);
    ctx.globalAlpha = 0.5 * (1 - q);
    drawSprite(ctx, glow('#3a2a50', 128), bx + d, gy - S * 0.05 * hash(i * 3), S * 0.5 * (0.5 + q), S * 0.3 * (0.5 + q));
  }
  ctx.restore();
  ctx.restore();
  // the first frames are white-hot
  const wo = 1 - seg(q, 0, 0.12);
  if (wo > 0) {
    ctx.fillStyle = `rgba(230,215,255,${wo})`;
    ctx.fillRect(0, 0, w, h);
  }
}

/* 9. the reveal: from below, the eyes open green and the blade ignites */
function shotReveal(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  world(g, { x: 0, y: 0.25, z: 1.0 }, { moon: true });
  const s = S * (g.portrait ? 1.5 : 1.2);
  const ign = ease.out3(seg(q, 0.25, 0.6));
  const eyes = ease.out5(seg(q, 0.05, 0.2));
  const hx = w * 0.52, hy = h * 0.66;
  const { head } = rival(g, hx, hy, -Math.PI / 2 - 0.12, s, 0, h * 1.3, { lit: ign, eyes, vx: -S * 2 });
  // the light coming up the blade pushes out of them in rings
  if (q > 0.25) {
    for (let k = 0; k < 4; k++) {
      const qq = (q * 2.5 + k * 0.25) % 1;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = withAlpha(RIVAL.hot, (1 - qq) * 0.45 * ign);
      ctx.lineWidth = S * 0.01 * (1 - qq);
      ctx.beginPath();
      ctx.ellipse(head[0], head[1] + s * 0.2, S * (0.12 + qq * 1.2), S * (0.09 + qq * 0.9), 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (hitQ(0.12)) g.f.shake(S * 0.015);
  if (hitQ(0.25)) g.f.flash(0.25, RIVAL.c);
  speedLines(g, head[0], head[1], 'rgba(255,255,255,0.16)', 40, 0.35, ign, 8);
  void t;
}

/* 10. the standoff: split down a diagonal of red light */
function shotStandoff(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const tilt = h * 0.18;
  const push = ease.inOut2(q) * S * 0.04;
  const s = S * (g.portrait ? 0.62 : 0.5);
  // left: the knight, in red
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(w * 0.5 + tilt * 0.5, 0); ctx.lineTo(w * 0.5 - tilt * 0.5, h); ctx.lineTo(0, h);
  ctx.closePath();
  ctx.clip();
  world(g, { x: -0.25, y: 0, z: 1.3 }, { tint: 0.35 });
  knight(g, w * 0.3 + push, h * 0.86 - s * 0.42, -0.25, s, w, h * 0.86, { lit: 1, veins: 1 });
  ctx.restore();
  // right: the rival, in violet
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w * 0.5 + tilt * 0.5, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(w * 0.5 - tilt * 0.5, h);
  ctx.closePath();
  ctx.clip();
  world(g, { x: 0.3, y: 0, z: 1.3 });
  ctx.fillStyle = 'rgba(60,20,140,0.35)';
  ctx.fillRect(0, 0, w, h);
  rival(g, w * 0.72 - push, h * 0.86 - s * 0.42, -Math.PI + 0.25, s, 0, h * 0.86, { lit: 1 });
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

/* 12. the clash: blade on blade; an inverted impact frame, a white flash, then the dome */
function shotClash(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const cx = w * 0.5, cy = h * 0.5;
  const s = S * (g.portrait ? 0.6 : 0.5);
  // the blades cross over the middle of the frame
  const kh: Pt = [cx - S * 0.2, cy + S * 0.08], rh: Pt = [cx + S * 0.2, cy + S * 0.08];
  const ka = -0.62, ra = -Math.PI + 0.62;
  const P: Pt = [cx, cy + S * 0.08 - Math.tan(0.62) * S * 0.2];
  const pair = (lit: number) => {
    rival(g, rh[0], rh[1], ra, s, 0, h * 0.9, { lit: Math.max(lit, 0.001), eyes: lit });
    knight(g, kh[0], kh[1], ka, s, w, h * 0.9, { lit, veins: lit });
  };
  if (hitQ(0.01) || hitQ(0.2)) g.f.shake(S * 0.05);
  if (q < 0.12) {
    // the impact frame, inverted: ink silhouettes on white, red lines bursting
    // from the contact (on white the 'lighter' glows vanish, so only the shapes are left)
    impactFrame(g, () => {
      speedLines(g, P[0], P[1], RED.c, 90, 0.18, 1, 12);
      pair(0);
      drawBolt(ctx, [[P[0] - S * 0.5, P[1] + S * 0.3], P, [P[0] + S * 0.4, P[1] - S * 0.25]], t, { width: S * 0.012, amp: S * 0.01, seed: 3, ink: true });
    }, true);
    return;
  }
  if (q < 0.2) {
    // then the negative: black, one red ring tearing outward
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    shockRing(g, P[0], P[1], seg(q, 0.12, 0.2), S * 1.3, S * 1.3, RED.c);
    return;
  }
  const k = seg(q, 0.2, 1);
  ctx.save();
  ctx.translate((Math.random() - 0.5) * S * 0.01 * (1 - k), 0);
  world(g, { x: 0, y: 0, z: 1.2 }, { tint: 0.2 });
  pair(1);
  ctx.restore();
  // the dome of force where the blades meet
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = S * (0.15 + ease.out3(k) * 0.8);
  ctx.globalAlpha = (1 - k) * 0.9;
  drawSprite(ctx, glow(RED.c, 128), P[0] - S * 0.04, P[1], R * 2.2);
  drawSprite(ctx, glow(VIOLET.c, 128), P[0] + S * 0.05, P[1], R * 1.6);
  ctx.globalAlpha = 1;
  drawSprite(ctx, glow('#ffffff', 64), P[0], P[1], S * 0.18 * (1 - k * 0.6));
  ctx.restore();
  shockRing(g, P[0], P[1], k, S * 1.2, S * 1.2, '#ffffff');
  // the x of the signature: two pen-lines along the crossed blades, lingering after the hit
  const L = S * 0.34;
  for (const a of [ka, ra]) {
    const d: Pt = [Math.cos(a), Math.sin(a)];
    penTrail(ctx, [[P[0] - d[0] * L, P[1] - d[1] * L], [P[0] + d[0] * L, P[1] + d[1] * L]], 0.4 * (1 - seg(k, 0.6, 1)), S, ease.out3(seg(k, 0, 0.25)));
  }
  cracks(g, cx, h * 0.9, k * 2, S * 0.9, 0.2, 31);
  debris(g, cx, h * 0.9, ease.out2(k) * 0.8, 30, 9, 3);
  // sparks off the blades
  const r = rng(13);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 50; i++) {
    const a = r() * TAU, v = S * (0.4 + r() * 1.2);
    const d = ease.out2(k) * v;
    ctx.strokeStyle = withAlpha(r() > 0.5 ? RED.hot : RIVAL.hot, 1 - k);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(P[0] + Math.cos(a) * d, P[1] + Math.sin(a) * d);
    ctx.lineTo(P[0] + Math.cos(a) * (d + S * 0.04), P[1] + Math.sin(a) * (d + S * 0.04));
    ctx.stroke();
  }
  ctx.restore();
}

/* 13. the slash barrage: four cuts, four framings, every swing smeared */

// per cut: hilt (fractions of w, h), the swing from a0 to a1, which way they face
const SLASHES: { hx: number; hy: number; a0: number; a1: number; foe: number }[] = [
  { hx: 0.26, hy: 0.66, a0: -2.3, a1: 0.75, foe: 1 },
  { hx: 0.74, hy: 0.62, a0: -0.75, a1: -3.75, foe: -1 },
  { hx: 0.4, hy: 0.8, a0: 2.4, a1: -1.1, foe: 1 },
  { hx: 0.2, hy: 0.58, a0: 3.5, a1: 0.15, foe: 1 },
];

/**
 * An anime smear: the blade stretched into one solid ribbon over the arc it
 * covered between a0 and a1, fat at the tip and thinning toward the trailing
 * edge, ink inside and red-hot along the leading edge.
 */
function smear(g: G, hx: number, hy: number, a0: number, a1: number, L: number, alpha: number) {
  const { ctx, S } = g;
  if (alpha <= 0 || Math.abs(a1 - a0) < 0.02) return;
  const n = 24;
  const outer: Pt[] = [], inner: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n; // 0 = trailing, 1 = the blade now
    const a = lerp(a0, a1, u);
    // the trailing end is a sliver near the tip; the leading end covers the whole blade
    const r0 = L * lerp(0.92, 0.12, u ** 0.6);
    const r1 = L * lerp(0.98, 1.04, u);
    outer.push([hx + Math.cos(a) * r1, hy + Math.sin(a) * r1]);
    inner.push([hx + Math.cos(a) * r0, hy + Math.sin(a) * r0]);
  }
  const path = () => {
    ctx.beginPath();
    outer.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    for (let i = n; i >= 0; i--) ctx.lineTo(inner[i][0], inner[i][1]);
    ctx.closePath();
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#07040b';
  path();
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  // the edge that leads, and a hairline of white on it
  for (const [wd, col] of [[S * 0.03, withAlpha(RED.c, 0.45)], [S * 0.01, RED.hot], [S * 0.003, '#ffffff']] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = wd;
    ctx.lineCap = 'round';
    ctx.beginPath();
    outer.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  // a few dry streaks inside the ribbon, like a brush dragged fast
  ctx.strokeStyle = withAlpha(RED.c, 0.5);
  ctx.lineWidth = 1;
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    for (let i = Math.floor(n * 0.25 * k); i <= n; i++) {
      const p = [lerp(inner[i][0], outer[i][0], 0.25 * k), lerp(inner[i][1], outer[i][1], 0.25 * k)];
      if (i === Math.floor(n * 0.25 * k)) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function shotSlashes(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const n = 4;
  const i = Math.min(n - 1, Math.floor(q * n));
  const k = q * n - i;
  const zooms = [1.6, 2.0, 1.8, 1.0];
  const offs: Pt[] = [[0.05, -0.1], [-0.1, 0.05], [0.1, 0.1], [0, 0]];
  if (hitQ(i / n + 0.02)) g.f.shake(S * 0.035);
  ctx.save();
  // each cut its own camera: tilted, close, on the rival taking the blow
  ctx.translate(w / 2, h / 2);
  ctx.rotate((i % 2 ? -1 : 1) * 0.12);
  ctx.scale(zooms[i], zooms[i]);
  ctx.translate(-w / 2 + offs[i][0] * S, -h / 2 + offs[i][1] * S);
  world(g, { x: 0, y: 0, z: 1 }, { tint: 0.25 });
  // the rival takes every cut on the blade and is driven back a step each time
  const knock = ease.out3(seg(k, 0.12, 0.6));
  const rs = S * 0.7;
  const rh: Pt = [w * 0.6 + (i + knock) * S * 0.025, h * 0.95 - rs * 0.48];
  const ra = -Math.PI * 0.62 + (i % 2 ? -1 : 1) * (0.25 - knock * 0.25) + bell(k, 0.1, 0.4) * 0.35;
  const { tip: rt } = rival(g, rh[0], rh[1], ra, rs, 0, h * 0.95, { lit: 1, vx: S * 3 * bell(k, 0.1, 0.5) });
  // sparks where the cut lands on their blade
  const hitP: Pt = [lerp(rh[0], rt[0], 0.6), lerp(rh[1], rt[1], 0.6)];
  const burst = seg(k, 0.12, 0.7);
  if (burst > 0 && burst < 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - burst;
    drawSprite(ctx, glow('#ffffff', 64), hitP[0], hitP[1], S * 0.25);
    drawSprite(ctx, glow(RED.c, 128), hitP[0], hitP[1], S * 0.9);
    const r = rng(40 + i);
    for (let j = 0; j < 30; j++) {
      const an = r() * TAU, v = S * (0.15 + r() * 0.5);
      const d = ease.out2(burst) * v;
      ctx.strokeStyle = j % 3 ? RED.hot : RIVAL.hot;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hitP[0] + Math.cos(an) * d, hitP[1] + Math.sin(an) * d + d * d / S * 0.4);
      ctx.lineTo(hitP[0] + Math.cos(an) * (d + S * 0.03), hitP[1] + Math.sin(an) * (d + S * 0.03) + d * d / S * 0.4);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
  // the knight in the foreground, caught mid-swing
  const c = SLASHES[i];
  const s = S * (g.portrait ? 0.95 : 0.8);
  const swingAt = (kk: number) => lerp(c.a0, c.a1, ease.inOut2(seg(kk, 0.03, 0.3)));
  const a = swingAt(k);
  // the body lunges with the cut and drifts on through the follow-through
  const lunge = ease.out3(seg(k, 0.03, 0.3));
  const hx = w * c.hx + c.foe * S * (lunge * 0.08 + k * 0.03), hy = h * c.hy;
  const L = s * 0.95;
  const fast = bell(k, 0.03, 0.3);
  // the cut lights the rival up behind them, so the figure reads as a silhouette
  const lit = bell(k, 0.08, 0.7);
  if (lit > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.75 * lit;
    drawSprite(ctx, glow(RED.c, 128), w * (c.foe > 0 ? 0.62 : 0.38), h * 0.45, S * 1.8);
    ctx.globalAlpha = 0.5 * lit;
    drawSprite(ctx, glow(RED.hot, 128), w * (c.foe > 0 ? 0.6 : 0.4), h * 0.45, S * 0.7);
    ctx.restore();
  }
  // multiples: the same figure a beat ago, each a different colour of rim
  if (fast > 0.05) {
    for (let j = 3; j >= 1; j--) {
      const kk = k - j * 0.035;
      const aj = swingAt(kk);
      const lj = ease.out3(seg(kk, 0.03, 0.3));
      drawWarrior(ctx, { hilt: [w * c.hx + c.foe * S * (lj * 0.08 + kk * 0.03), hy], a: aj, foeX: c.foe > 0 ? w * 3 : -w * 2, s, groundY: h * 1.4, color: j % 2 ? RED.c : VIOLET.c, t, vx: 0, vy: 0, seed: 7, alpha: 0.45 * fast * (1 - j / 4) });
    }
  }
  // the smear: two frames' worth of arc behind the blade, solid
  smear(g, hx, hy, swingAt(k - 0.09), a, L, seg(fast, 0.1, 0.4));
  knight(g, hx, hy, a, s, c.foe > 0 ? w * 3 : -w * 2, h * 1.4, { lit: 1, veins: 0.6 });
  // where the blade has been, the cut hangs in the air and burns out
  const trail = seg(k, 0.06, 0.3);
  const fade = 1 - seg(k, 0.4, 1);
  if (trail > 0 && fade > 0) {
    const a0 = c.a0 + (a - c.a0) * 0.15;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [wd, col, al] of [[S * 0.08, RED.c, 0.3], [S * 0.025, RED.hot, 0.85], [S * 0.007, RED.core, 1]] as const) {
      ctx.strokeStyle = withAlpha(col, al * fade);
      ctx.lineWidth = wd;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(hx, hy, L * 1.12, Math.min(a0, a), Math.max(a0, a));
      ctx.stroke();
    }
    ctx.restore();
  }
  speedLines(g, w / 2, h / 2, 'rgba(255,255,255,0.25)', 40, 0.4, fade, 20 + i);
  // each new framing is its own cut
  if (i > 0) cutFlash(g, k / 0.15);
}

/* 14. the volley: the rival answers with a storm of flying slashes, and the shot cuts before they land */

// when each slash leaves the blade, and how it is tilted
const VOLLEY: [number, number][] = [[0.08, -0.5], [0.2, 0.45], [0.32, -0.2], [0.44, 0.6], [0.56, -0.65], [0.68, 0.15]];

function shotVolley(g: G, q: number) {
  const { w, h, S } = g;
  world(g, { x: 0.02, y: 0, z: lerp(1.05, 1.18, ease.in2(q)) }, { tint: 0.1 });
  const gy = h * 0.8;
  const s = S * (g.portrait ? 0.6 : 0.5);
  const rx = w * 0.58;
  // the blade whips back and forth, one throw per swing
  const n = VOLLEY.filter(([at]) => q >= at).length;
  const into = n ? seg(q, VOLLEY[n - 1][0], VOLLEY[n - 1][0] + 0.06) : 0;
  const from = n % 2 ? -Math.PI * 0.85 : -Math.PI * 0.2, to = n % 2 ? -Math.PI * 0.2 : -Math.PI * 0.85;
  const ra = n ? lerp(from, to, ease.out3(into)) : -Math.PI * 0.6;
  const { tip } = rival(g, rx, gy - s * 0.48, ra, s, 0, gy, { lit: 1, vx: -S * 4 * bell(into, 0, 1) });
  if (n && into < 1) smearLight(g, rx, gy - s * 0.48, lerp(from, to, ease.out3(seg(q - 0.03, VOLLEY[n - 1][0], VOLLEY[n - 1][0] + 0.06))), ra, s * 0.95);
  // each slash flies at the camera, growing as it comes
  VOLLEY.forEach(([at, tilt], i) => {
    const u = seg(q, at, at + 0.42);
    if (u <= 0 || u >= 1) return;
    const k = ease.in2(u);
    const tx = w * (0.5 + tilt * 0.5), ty = h * (0.62 + (i % 3) * 0.08);
    const x = lerp(tip[0], tx, k), y = lerp(tip[1], ty, k);
    crescent(g, x, y, Math.PI / 2 + tilt, S * lerp(0.05, 0.7, ease.in3(u)), Math.min(1, u * 6));
    if (hitQ(at)) g.f.shake(S * 0.01);
  });
  speedLines(g, rx, gy - s * 0.5, 'rgba(0,0,0,0.45)', 50, 0.3, seg(q, 0.3, 1), 41);
  if (q > 0.6) g.f.shake(S * 0.008);
}

/** the rival's swing smeared: a fan of violet light between two blade angles */
function smearLight(g: G, hx: number, hy: number, a0: number, a1: number, L: number) {
  const { ctx } = g;
  if (Math.abs(a1 - a0) < 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createRadialGradient(hx, hy, L * 0.3, hx, hy, L);
  gr.addColorStop(0, 'rgba(155,92,255,0)');
  gr.addColorStop(1, 'rgba(227,212,255,0.55)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.arc(hx, hy, L, Math.min(a0, a1), Math.max(a0, a1));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ============================================================ DEAD CALM */

/*
 * The flying slashes are about to land, and the film goes silent. Inside a sphere
 * around the knight nothing moves: the water turns to a mirror, the embers
 * hang in the air, and the red drains out of them; the blue warrior they
 * were before surfaces for a moment. Everything that enters the sphere is cut
 * without the knight ever being seen to move. One drop falls from the blade,
 * and when it lands, time comes back all at once.
 */

/** the clock everything inside the stillness is drawn at */
const CALM_T = 4.2;

const hexRgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
function mixHex(a: string, b: string, k: number) {
  const A = hexRgb(a), Bc = hexRgb(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, Bc[i], k))).join(',')})`;
}

interface Calm { kx: number; gy: number; s: number; hy: number; cx: number; cy: number; R: number; hz: number }
function calmLayout(g: G): Calm {
  const { w, h, S, portrait } = g;
  const s = S * (portrait ? 0.5 : 0.42);
  const gy = h * 0.7, kx = w * 0.5;
  return { kx, gy, s, hy: gy - s * 0.52, cx: kx, cy: gy - s * 0.42, R: S * 0.36, hz: h * 0.48 };
}

// the flying slashes that reach the calm: the way each comes in (from the knight), when it
// was thrown, its size (some are already on their way when the calm comes down)
const CALM_ARCS: [number, number, number][] = [
  [-2.75, -0.18, 1], [0.15, -0.08, 0.9], [-1.25, 0.0, 1.1], [2.9, 0.08, 0.85],
  [-0.45, 0.17, 1], [-2.05, 0.27, 0.9], [0.75, 0.37, 1], [-1.65, 0.48, 1.05],
];
/** the knight's blade between cuts: one pose per cut, never seen in between */
const CALM_POSES = [0.12, -1.15, 2.5, -0.45, 1.95, -2.1, 0.85, -0.7, 0.12];

interface CalmA { dir: number; st: number; r: number; D0: number; uCut: number; qCut: number }
function calmArcs(g: G, L: Calm): CalmA[] {
  return CALM_ARCS.map(([dir, st, sz]) => {
    const r = g.S * 0.13 * sz;
    const D0 = g.S * 1.5;
    // it is cut the moment it touches the sphere
    const uCut = 1 - (L.R + r * 0.2) / D0;
    const qCut = st + 0.5 * (1 - Math.sqrt(1 - uCut));
    return { dir, st, r, D0, uCut, qCut };
  });
}
const arcPos = (L: Calm, A: CalmA, u: number): Pt => [L.cx + Math.cos(A.dir) * A.D0 * (1 - u), L.cy + Math.sin(A.dir) * A.D0 * (1 - u)];
const arcU = (A: CalmA, q: number) => ease.out2(seg(q, A.st, A.st + 0.5));

/** Blot, who jumped in at the wrong moment and is now stuck in the air at the edge of the calm */
function calmBlot(g: G, L: Calm, look: Pt, fall = 0, t = CALM_T) {
  const { ctx, S } = g;
  const bx = L.cx - L.R * 0.95, by0 = L.cy - L.R * 0.6;
  const by = by0 + ease.in2(fall) * (L.gy - by0 + S * 0.04);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55;
  drawSprite(ctx, glow(BLUE.c, 64), bx, by - S * 0.05, S * 0.32);
  ctx.restore();
  // drops it kicked up, hanging in the air under it
  if (fall < 0.05) {
    ctx.fillStyle = withAlpha(BLUE.hot, 0.8);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(bx + (i - 1.5) * S * 0.025, by + S * (0.03 + hash(i) * 0.05), S * 0.005, 0, TAU);
      ctx.fill();
    }
  }
  drawBlot(ctx, bx, by, S * 0.13, { t, pose: 'shock', look, seed: 12, eye: '#fbfaf5', rot: -0.35 + fall * 1.2, wind: 0.2 });
}

/** the stillness, at progress q (cuts happen as q passes each slash's qCut) */
function calmScene(g: G, q: number, o: { push?: number; blot?: boolean } = {}) {
  const { ctx, w, h, S, t } = g;
  const L = calmLayout(g);
  const gf: G = { ...g, t: CALM_T };
  const push = o.push ?? 1;
  ctx.save();
  ctx.translate(L.kx, L.cy);
  ctx.scale(push, push);
  ctx.translate(-L.kx, -L.cy);
  // sky, a cold moon, and the ruins against the horizon
  const sky = () => {
    const gr = ctx.createLinearGradient(0, 0, 0, L.hz);
    gr.addColorStop(0, '#01030a');
    gr.addColorStop(1, '#0c1d44');
    ctx.fillStyle = gr;
    ctx.fillRect(-w, -h, w * 3, L.hz + h);
    const mx = w * 0.74, my = h * 0.17, mr = S * 0.08;
    ctx.globalAlpha = 0.45;
    drawSprite(ctx, glow(BLUE.c, 128), mx, my, mr * 7);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#d7e4ff';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(mx, my);
    ctx.scale((mr * 1.08) / 100, (mr * 1.08) / 100);
    brush(ctx, MOON_ENSO, { width: 14, color: '#0c1d44', dry: 0.45, seed: 9, press: 1.4, alpha: 0.8 });
    ctx.restore();
    const sp = spires(w, h);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(sp, -w * 0.4, L.hz - sp.height * 0.92);
    ctx.globalAlpha = 1;
  };
  sky();
  // the water: a mirror of the sky
  ctx.fillStyle = '#01030a';
  ctx.fillRect(-w, L.hz, w * 3, h * 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w, L.hz, w * 3, h * 2);
  ctx.clip();
  ctx.translate(0, L.hz * 2);
  ctx.scale(1, -1);
  ctx.globalAlpha = 0.55;
  sky();
  ctx.restore();
  const deep = ctx.createLinearGradient(0, L.hz, 0, h);
  deep.addColorStop(0, 'rgba(1,3,10,0)');
  deep.addColorStop(1, 'rgba(1,3,10,0.85)');
  ctx.fillStyle = deep;
  ctx.fillRect(-w, L.hz, w * 3, h * 2);
  // outside the calm the water still shivers; inside it is glass
  const rx = L.R * 1.5, ry = L.R * 0.26;
  ctx.save();
  ctx.strokeStyle = 'rgba(143,194,255,0.18)';
  ctx.lineWidth = 1;
  const r = rng(29);
  for (let i = 0; i < 70; i++) {
    const x = r() * w * 1.4 - w * 0.2, y = L.hz + (r() ** 1.6) * (h - L.hz);
    const dx = (x - L.kx) / rx, dy = (y - L.gy) / ry;
    if (dx * dx + dy * dy < 1.1) continue;
    const len = S * (0.03 + r() * 0.08) * (0.4 + (y - L.hz) / h);
    const sh = Math.sin(t * 1.2 + i) * S * 0.01;
    ctx.beginPath();
    ctx.moveTo(x + sh, y);
    ctx.lineTo(x + sh + len, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = withAlpha(BLUE.hot, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(L.kx, L.gy, rx, ry, 0, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  drawSprite(ctx, glow(BLUE.c, 128), L.kx, L.gy, rx * 2.2, ry * 2.6);
  ctx.restore();
  // moonlight falling straight down on the knight
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const shaft = ctx.createLinearGradient(0, 0, 0, L.gy);
  shaft.addColorStop(0, 'rgba(143,194,255,0)');
  shaft.addColorStop(1, 'rgba(143,194,255,0.16)');
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(L.kx - S * 0.12, 0);
  ctx.lineTo(L.kx + S * 0.12, 0);
  ctx.lineTo(L.kx + S * 0.38, L.gy);
  ctx.lineTo(L.kx - S * 0.38, L.gy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // the rival, far back across the water, frozen in the follow-through of the last throw
  rival(gf, w * 0.88, L.hz + S * 0.04 - S * 0.28 * 0.48, -Math.PI * 0.25, S * 0.28, 0, L.hz + S * 0.04, { lit: 1 });

  // the knight: the pose snaps between cuts, never caught in motion
  const ts = calmArcs(g, L);
  const done = ts.filter((k) => q >= k.qCut).length;
  const a = CALM_POSES[Math.min(done, CALM_POSES.length - 1)];
  const kn = () => knight(gf, L.kx, L.hy, a, L.s, w * 1.5, L.gy, { lit: 1, veins: 0, pal: BLUE, back: BLUE.deep });
  // reflection first, in the glass under their feet
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w, L.gy, w * 3, h * 2);
  ctx.clip();
  ctx.translate(0, L.gy * 2);
  ctx.scale(1, -1);
  ctx.globalAlpha = 0.35;
  kn();
  ctx.restore();
  kn();
  // the sphere itself is invisible but for where it is touched
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = withAlpha(BLUE.hot, 0.07);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(L.cx, L.cy, L.R, 0, TAU);
  ctx.stroke();
  ctx.restore();

  let last: Pt = [L.cx, L.cy];
  ts.forEach((A, i) => {
    const u = arcU(A, q);
    if (u <= 0.01) return;
    if (q < A.qCut) {
      const p = arcPos(L, A, u);
      crescent(g, p[0], p[1], A.dir + Math.PI, A.r, Math.min(1, u * 8));
      return;
    }
    const since = q - A.qCut;
    // cut in two at the edge of the calm: the halves hang where they were, turning very slowly
    const at = arcPos(L, A, A.uCut);
    last = at;
    const nx = -Math.sin(A.dir), ny = Math.cos(A.dir);
    for (const side of [-1, 1]) {
      const sep = (S * 0.012 + since * S * 0.05) * side;
      ctx.save();
      ctx.translate(at[0] + nx * sep, at[1] + ny * sep + since * S * 0.02);
      ctx.rotate(since * side * (0.3 + hash(i) * 0.4));
      crescent(g, 0, 0, A.dir + Math.PI, A.r, 0.9, side, true);
      ctx.restore();
    }
    // the cut: one hairline of light along it, and a glint on the sphere
    const fl = 1 - seg(since, 0, 0.08);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (fl > 0) {
      const dx = Math.cos(A.dir), dy = Math.sin(A.dir);
      ctx.strokeStyle = withAlpha(BLUE.core, fl);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(at[0] - dx * A.r * 1.6, at[1] - dy * A.r * 1.6);
      ctx.lineTo(at[0] + dx * A.r * 1.6, at[1] + dy * A.r * 1.6);
      ctx.stroke();
      drawSprite(ctx, glow(BLUE.hot, 64), at[0], at[1], S * 0.25 * fl);
      ctx.strokeStyle = withAlpha(BLUE.hot, 0.8 * fl);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(L.cx, L.cy, L.R, A.dir - 0.5 * (1 - fl) - 0.05, A.dir + 0.5 * (1 - fl) + 0.05);
      ctx.stroke();
    }
    ctx.restore();
  });
  if (o.blot !== false) calmBlot(g, L, last);
  // the trace of the cut that was never seen: a thin arc where the blade went
  ts.forEach((k, i) => {
    const since = q - k.qCut;
    if (since < 0 || since > 0.07) return;
    const a0 = CALM_POSES[i], a1 = CALM_POSES[i + 1];
    const fl = 1 - since / 0.07;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [wd, al] of [[S * 0.025, 0.25], [S * 0.006, 0.9]] as const) {
      ctx.strokeStyle = withAlpha(BLUE.hot, al * fl);
      ctx.lineWidth = wd;
      ctx.beginPath();
      ctx.arc(L.kx, L.hy, L.s * 0.95, Math.min(a0, a1), Math.max(a0, a1));
      ctx.stroke();
    }
    ctx.restore();
  });
  ctx.restore();
  return { L, ts };
}

/* the eyes again: the red cools, the veins draw back in, and the gaze goes still */
function shotStill(g: G, q: number) {
  const { ctx, w, h, S } = g;
  const k = ease.inOut2(seg(q, 0.12, 0.72));
  ctx.fillStyle = mixHex('#030206', '#01040c', k);
  ctx.fillRect(0, 0, w, h);
  const band = S * 0.42;
  const cy = h * 0.5;
  const face = ctx.createLinearGradient(0, cy - band / 2, 0, cy + band / 2);
  face.addColorStop(0, mixHex('#0d0914', '#070c1a', k));
  face.addColorStop(0.5, mixHex('#1a1224', '#0f1830', k));
  face.addColorStop(1, mixHex('#0a0710', '#050912', k));
  ctx.fillStyle = face;
  ctx.fillRect(0, cy - band / 2, w, band);
  // the hair stops moving the moment the calm comes down
  const ht = lerp(g.t, CALM_T, Math.min(1, k * 3));
  ctx.strokeStyle = '#000';
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x0 = w * (0.1 + i * 0.1) + Math.sin(ht * 2 + i) * S * 0.01;
    ctx.lineWidth = S * (0.01 + hash(i) * 0.015);
    ctx.beginPath();
    ctx.moveTo(x0, cy - band * 0.6);
    ctx.quadraticCurveTo(x0 + S * 0.05, cy - band * 0.2, x0 - S * 0.02 + Math.sin(ht * 3 + i) * S * 0.01, cy + band * (0.05 + hash(i * 3) * 0.2));
    ctx.stroke();
  }
  const crawl = 1 - ease.inOut2(seg(q, 0.05, 0.6));
  const open = lerp(1, 0.5, k);
  for (const ex of [-1, 1]) {
    const x = w / 2 + ex * S * 0.2, y = cy;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (crawl > 0) {
      for (let j = 0; j < 3; j++) {
        const a = (ex > 0 ? 0 : Math.PI) + (j - 1) * 0.6;
        const L = S * 0.35 * crawl;
        drawBolt(ctx, [[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.3], [x + Math.cos(a) * L, y + Math.sin(a) * L * 0.6]], CALM_T * 0.4, { width: S * 0.003, amp: S * 0.015, seed: j + ex * 5, alpha: crawl, branches: 1, pal: RED });
      }
    }
    ctx.globalAlpha = 1 - k;
    drawSprite(ctx, glow(RED.c, 128), x, y, S * 0.5, S * 0.22);
    ctx.globalAlpha = k;
    drawSprite(ctx, glow(BLUE.c, 128), x, y, S * 0.55, S * 0.2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = mixHex(RED.c, BLUE.c, k);
    ctx.beginPath();
    ctx.ellipse(x, y, S * 0.11, S * 0.03 * open + 0.5, ex * -0.12 * (1 - k), 0, TAU);
    ctx.fill();
    ctx.fillStyle = mixHex(RED.core, BLUE.core, k);
    ctx.beginPath();
    ctx.ellipse(x + ex * S * 0.01, y, S * 0.025, S * 0.02 * open + 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // a single line of light passes across the stillness
  const sweep = seg(q, 0.55, 0.78);
  if (sweep > 0 && sweep < 1) {
    const x = lerp(-w * 0.2, w * 1.2, ease.inOut2(sweep));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(x - S * 0.3, 0, x + S * 0.3, 0);
    gr.addColorStop(0, 'rgba(143,194,255,0)');
    gr.addColorStop(0.5, 'rgba(238,246,255,0.5)');
    gr.addColorStop(1, 'rgba(143,194,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(x - S * 0.3, cy - 1, S * 0.6, 2);
    ctx.restore();
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, cy - band / 2);
  ctx.fillRect(0, cy + band / 2, w, h);
  // match cut: the cooled eye rises and becomes the moon over the calm
  matchEye(g, q, [w / 2 + S * 0.2, cy], [w * 0.74, h * 0.17], S * 0.08, BLUE.c, '#d7e4ff', '#d7e4ff');
}

/* the wide: a circle of glass in the black water, and nothing gets in */
function shotCalm(g: G, q: number) {
  const { ctx, w, h, S } = g;
  calmScene(g, q, { push: lerp(1, 1.1, ease.inOut2(q)) });
  // in on the eye's match cut: the calm comes up out of black around its moon
  const up = seg(q, 0, 0.1);
  if (up < 1) {
    ctx.fillStyle = `rgba(0,0,0,${1 - ease.inOut2(up)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d7e4ff';
    ctx.globalAlpha = 1 - up;
    ctx.beginPath();
    ctx.arc(w * 0.74, h * 0.17, S * 0.08, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/* one drop gathers at the point of the blade, and falls */
function shotDrop(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const wy = h * 0.64;
  const sky = ctx.createLinearGradient(0, 0, 0, wy);
  sky.addColorStop(0, '#01030a');
  sky.addColorStop(1, '#0a1838');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, wy);
  ctx.fillStyle = '#01030a';
  ctx.fillRect(0, wy, w, h - wy);
  const gf: G = { ...g, t: CALM_T };
  const L = w * 1.3, a = 0.04;
  const hx = w * 0.64 - L, hy = h * 0.3;
  const tip: Pt = [hx + Math.cos(a) * L, hy + Math.sin(a) * L];
  // the surface: the blade's reflection, perfect until the drop lands
  const land = 0.6;
  const after = seg(q, land, 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, wy, w, h - wy);
  ctx.clip();
  ctx.translate(0, wy * 2);
  ctx.scale(1, -1);
  ctx.globalAlpha = 0.35;
  if (after > 0) {
    // the ripple breaks the reflection into wobbling slices
    for (let i = 0; i < 14; i++) {
      const y0 = wy - (i + 1) * S * 0.03;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y0, w, S * 0.03);
      ctx.clip();
      ctx.translate(Math.sin(i * 1.7 + after * 18) * S * 0.03 * after * (1 - after), 0);
      blade(gf, hx, hy, a, L, 1, 1, BLUE);
      ctx.restore();
    }
  } else blade(gf, hx, hy, a, L, 1, 1, BLUE);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(143,194,255,0.25)';
  ctx.fillRect(0, wy, w, 1);
  ctx.restore();
  blade(gf, hx, hy, a, L, 1, 1, BLUE);
  // the drop: gathers, stretches, lets go
  const grow = ease.out2(seg(q, 0, 0.3));
  const fall = ease.in2(seg(q, 0.3, land));
  const dr = S * 0.045 * grow;
  if (q < land && dr > 0.5) {
    const stretch = 1 + seg(q, 0.15, 0.3) * 0.6 * (1 - fall) + fall * 0.4;
    const dx = tip[0] - S * 0.01, dy = lerp(tip[1] + dr * 1.2, wy - dr, fall);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glow(BLUE.hot, 64), dx, dy, dr * 7);
    ctx.restore();
    ctx.save();
    ctx.translate(dx, dy);
    ctx.scale(1 / Math.sqrt(stretch), stretch);
    ctx.fillStyle = '#0b1838';
    ctx.beginPath();
    ctx.moveTo(0, -dr * 1.6);
    ctx.quadraticCurveTo(dr * 1.05, -dr * 0.2, dr, dr * 0.2);
    ctx.arc(0, dr * 0.2, dr, 0, Math.PI);
    ctx.quadraticCurveTo(-dr * 1.05, -dr * 0.2, 0, -dr * 1.6);
    ctx.fill();
    ctx.strokeStyle = withAlpha(BLUE.core, 0.9);
    ctx.lineWidth = Math.max(1, dr * 0.12);
    ctx.stroke();
    // inside it, upside down, a speck of red: the corruption hasn't gone anywhere
    ctx.fillStyle = RED.c;
    ctx.beginPath();
    ctx.arc(dr * 0.25, dr * 0.45, dr * 0.18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = BLUE.core;
    ctx.beginPath();
    ctx.arc(-dr * 0.35, -dr * 0.1, dr * 0.16, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // it lands: rings, a crown, and the red coming back into the rings
  if (hitQ(land)) g.f.shake(S * 0.012);
  if (after > 0) {
    const px = tip[0] - S * 0.01;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 5; k++) {
      const qq = clamp(after * 1.25 - k * 0.12);
      if (qq <= 0) continue;
      const col = k < 2 ? BLUE.hot : mixHex(BLUE.hot, RED.c, seg(after, 0.3, 0.8));
      ctx.strokeStyle = col;
      ctx.globalAlpha = (1 - qq) * 0.9;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(px, wy, S * 1.1 * ease.out3(qq), S * 0.07 * ease.out3(qq), 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const crown = bell(after, 0, 0.45);
    const r = rng(5);
    for (let i = 0; i < 14; i++) {
      const an = -Math.PI / 2 + (r() - 0.5) * 1.6;
      const v = S * (0.05 + r() * 0.1) * crown;
      ctx.fillStyle = BLUE.core;
      ctx.beginPath();
      ctx.arc(px + Math.cos(an) * v * 1.4, wy + Math.sin(an) * v, S * 0.004, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  void t;
}

/* ===================================================== BENEATH THE SURFACE */

/*
 * The drop goes into the mirror and the camera follows it down. Underwater
 * everything moves slowly: ink blooms like ink dropped into a glass, two koi
 * made of brush strokes circle the knight's reflection — upside down, and
 * still blue — and behind the reflection, very faint, is the front of the
 * page: the moon and the mountains of the first world, seen from behind.
 * A red thread of corruption sinks past. Then the shock comes down from
 * above and time comes back.
 */

let inkBlots: HTMLCanvasElement[] = [];

/** a koi made of strokes: (x, y) its middle, `a` the way it swims, `L` its length */
function koi(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, L: number, t: number, seed: number) {
  const n = 12;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n - 0.5;
    const sway = Math.sin(t * 3 + seed - u * 5) * L * 0.08 * (u + 0.5);
    pts.push([x - Math.cos(a) * u * L - Math.sin(a) * sway, y - Math.sin(a) * u * L + Math.cos(a) * sway]);
  }
  const wd = (i: number) => L * 0.13 * Math.sin(Math.min(1, (i / n) * 1.25) * Math.PI * 0.95 + 0.15);
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n, i + 1)];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
    left.push([pts[i][0] - (dy / l) * wd(i), pts[i][1] + (dx / l) * wd(i)]);
    right.push([pts[i][0] + (dy / l) * wd(i), pts[i][1] - (dx / l) * wd(i)]);
  }
  ctx.save();
  // the tail fin: two loose strokes fanning from the tail
  const tail = pts[n - 1];
  for (const k of [-1, 1]) {
    const ta = a + Math.PI + k * 0.4 + Math.sin(t * 3 + seed) * 0.3;
    brush(ctx, [tail, [tail[0] + Math.cos(ta) * L * 0.14, tail[1] + Math.sin(ta) * L * 0.14], [tail[0] + Math.cos(ta) * L * 0.26, tail[1] + Math.sin(ta) * L * 0.26]], { width: L * 0.09, color: '#e8eef8', dry: 0.4, seed: seed + k, tail: 0.15, halo: 0, alpha: 0.9 });
  }
  ctx.fillStyle = '#eef3fb';
  ctx.beginPath();
  left.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  for (let i = n; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
  // the red patches
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ff4b2e';
  for (const [u, r] of [[0.15, 0.12], [0.45, 0.1], [0.62, 0.07]] as const) {
    const p = pts[Math.round(u * n)];
    ctx.beginPath();
    ctx.ellipse(p[0] + Math.sin(seed + u * 9) * L * 0.04, p[1], L * r, L * r * 0.7, a, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // side fins and an eye
  for (const k of [-1, 1]) {
    const p = pts[3];
    const fa = a + Math.PI * 0.75 * k + Math.sin(t * 4 + seed) * 0.2;
    brush(ctx, [p, [p[0] + Math.cos(fa) * L * 0.14, p[1] + Math.sin(fa) * L * 0.14]], { width: L * 0.05, color: '#e8eef8', dry: 0.5, seed: seed + 5 + k, tail: 0.2, halo: 0, alpha: 0.8 });
  }
  ctx.fillStyle = '#14120f';
  const e = pts[1];
  ctx.beginPath();
  ctx.arc(e[0] - Math.sin(a) * L * 0.04, e[1] + Math.cos(a) * L * 0.04, L * 0.015, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function shotBeneath(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  if (!inkBlots.length) inkBlots = [1, 2, 3, 4].map((k) => blot(k * 23 + 5, 256, '#020818'));
  // sinking: the surface rises out of the top of the frame as we go down
  const sink = ease.inOut2(seg(q, 0, 0.9));
  const sy = lerp(h * 0.3, -h * 0.35, sink);
  const water = ctx.createLinearGradient(0, sy, 0, h);
  water.addColorStop(0, '#1c3f7a');
  water.addColorStop(0.35, '#0a1a3c');
  water.addColorStop(1, '#01040c');
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, w, h);
  // above the surface: the stillness, seen through the water, pale and wobbling
  if (sy > 0) {
    ctx.fillStyle = '#04081a';
    ctx.fillRect(0, 0, w, sy);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    drawSprite(ctx, glow('#8fc2ff', 128), w * 0.5, sy, w * 1.6, S * 0.12);
    ctx.restore();
  }
  // caustics: bright bands just under the surface, moving slowly
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const y = sy + S * (0.04 + i * 0.05);
    if (y < -20 || y > h) continue;
    ctx.strokeStyle = `rgba(143,194,255,${0.22 * (1 - i / 9)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -10; x <= w + 10; x += 12) {
      const yy = y + Math.sin(x * 0.02 + t * 0.8 + i * 1.7) * S * 0.012 + Math.sin(x * 0.051 - t * 0.5 + i) * S * 0.006;
      if (x < 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  // far below and behind: the first world, seen from the back of its page
  const ghost = seg(q, 0.25, 0.7) * (1 - seg(q, 0.9, 1) * 0.5);
  if (ghost > 0) {
    ctx.save();
    ctx.globalAlpha = 0.18 * ghost;
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.fillStyle = '#9fb8e0';
    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.72, S * 0.11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6d86b5';
    ctx.beginPath();
    ctx.moveTo(-10, h);
    for (let x = 0; x <= w; x += w / 10) ctx.lineTo(x, h * (0.82 - Math.abs(Math.sin(x * 0.012 + 1)) * 0.12));
    ctx.lineTo(w + 10, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // ink, blooming slowly through the water
  for (let i = 0; i < 6; i++) {
    const k = ease.out2(seg(q, i * 0.08, 0.6 + i * 0.06));
    if (k <= 0) continue;
    const bx = w * (0.2 + hash(i) * 0.6), by = sy + S * 0.25 + hash(i * 3) * h * 0.5 + k * S * 0.2;
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - k * 0.5);
    drawSprite(ctx, inkBlots[i % inkBlots.length], bx, by, S * (0.15 + k * 0.9), undefined, hash(i * 7) * TAU + k * 0.6);
    ctx.restore();
  }
  // the knight's reflection, upside down and still blue
  const L = calmLayout(g);
  const ry = sy + (h * 0.62 - sy) * 0.4 + S * 0.55;
  ctx.save();
  ctx.translate(0, ry);
  ctx.scale(1, -1);
  ctx.translate(0, -L.gy);
  ctx.globalAlpha = 0.85;
  knight({ ...g, t: CALM_T }, L.kx, L.hy, 0.12, L.s, w * 1.5, L.gy, { lit: 1, veins: 0, pal: BLUE, back: BLUE.c, alpha: 0.85 });
  ctx.restore();
  // the koi, circling it
  for (let k = 0; k < 2; k++) {
    const a = t * 0.35 + q * 2 + k * Math.PI;
    const cx = L.kx + Math.cos(a) * S * 0.36, cy = ry - L.s * 0.45 + Math.sin(a) * S * 0.12;
    koi(ctx, cx, cy, a + Math.PI / 2, S * 0.28, t, k * 13 + 1);
  }
  // the drop, still sinking, trailing a thread of ink
  const dy = lerp(sy + S * 0.05, ry - L.s * 1.0, ease.out2(seg(q, 0, 0.8)));
  ctx.strokeStyle = 'rgba(11,24,56,0.8)';
  ctx.lineWidth = Math.max(1, S * 0.004);
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const yy = lerp(Math.max(sy, 0), dy, i / 20);
    const xx = w * 0.5 + Math.sin(i * 0.6 + t) * S * 0.01 * (i / 20);
    if (i) ctx.lineTo(xx, yy);
    else ctx.moveTo(xx, yy);
  }
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow(BLUE.hot, 64), w * 0.5, dy, S * 0.12);
  ctx.restore();
  ctx.fillStyle = BLUE.core;
  ctx.beginPath();
  ctx.arc(w * 0.5, dy, S * 0.012, 0, TAU);
  ctx.fill();
  // a red thread of corruption sinking past
  const red = seg(q, 0.35, 0.95);
  if (red > 0 && red < 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = withAlpha(RED.c, 0.8);
    ctx.lineWidth = Math.max(1.5, S * 0.005);
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const yy = lerp(-h * 0.2, h * 1.2, red) - u * S * 0.5;
      const xx = w * 0.78 + Math.sin(u * 7 + t * 1.5) * S * 0.04 * u;
      if (i) ctx.lineTo(xx, yy);
      else ctx.moveTo(xx, yy);
    }
    ctx.stroke();
    ctx.restore();
  }
  // the shock coming down from above: a red ring through the water, then it all comes back
  const shock = seg(q, 0.82, 1);
  if (shock > 0) {
    const y = lerp(-h * 0.1, h * 1.1, ease.in2(shock));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [wd, col, al] of [[S * 0.08, RED.c, 0.35], [S * 0.012, RED.hot, 0.9], [S * 0.003, '#ffffff', 1]] as const) {
      ctx.strokeStyle = withAlpha(col, al);
      ctx.lineWidth = wd;
      ctx.beginPath();
      ctx.ellipse(w / 2, y, w * 0.9, S * 0.08, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    if (hitQ(0.85)) g.f.shake(S * 0.02);
  }
}

/* time comes back: a ring runs out from the knight and the red floods in behind it */
function shotRelease(g: G, q: number) {
  const { ctx, w, h, S } = g;
  if (hitQ(0.02)) {
    g.f.shake(S * 0.04);
    g.f.flash(0.5, RED.c);
  }
  // outside the ring, the stillness as it was
  const { L, ts } = calmScene(g, 1, { push: 1.1, blot: false });
  const ring = ease.out3(seg(q, 0, 0.5)) * Math.hypot(w, h) * 1.1;
  ctx.save();
  ctx.translate(L.kx, L.cy);
  ctx.scale(1.1, 1.1);
  ctx.translate(-L.kx, -L.cy);
  // Blot is stuck in the air until the ring reaches it, then drops into the water
  const reach = Math.hypot(L.cx - L.R * 0.95 - L.kx, L.cy - L.R * 0.6 - L.gy) * 1.1;
  const freed = ring > reach;
  if (!freed) calmBlot(g, L, [L.kx, L.hy]);
  ctx.beginPath();
  ctx.arc(L.kx, L.gy, ring / 1.1, 0, TAU);
  ctx.clip();
  // inside it, the corrupted world, moving again
  world(g, { x: 0, y: 0, z: 1 }, { horizon: L.hz / h, tint: 0.15 * (1 - q) });
  const rs = S * 0.28;
  rival(g, w * 0.88 + ease.out3(q) * S * 0.05, L.hz + S * 0.04 - rs * 0.48, lerp(-Math.PI * 0.25, -Math.PI * 0.85, ease.out3(seg(q, 0.1, 0.4))), rs, 0, L.hz + S * 0.04, { lit: 1 });
  const back = ease.out3(seg(q, 0.05, 0.5));
  knight(g, L.kx, L.hy, lerp(0.12, 0.9, back), L.s, w * 1.5, L.gy, { lit: 1, veins: back });
  ts.forEach((A, i) => {
    // the cut halves drop into the water and go out
    const at = arcPos(L, A, A.uCut);
    const drop = ease.in2(seg(q, 0.02 + hash(i) * 0.15, 0.7));
    if (drop >= 1) return;
    const nx = -Math.sin(A.dir), ny = Math.cos(A.dir);
    for (const side of [-1, 1]) {
      const sep = (S * 0.012 + 0.6 * S * 0.05 + drop * S * 0.08) * side;
      ctx.save();
      ctx.translate(at[0] + nx * sep, at[1] + ny * sep + drop * (L.gy - at[1] + S * 0.05));
      ctx.rotate(side * (0.4 + drop * 2.5));
      crescent(g, 0, 0, A.dir + Math.PI, A.r, 0.9 * (1 - drop), side, drop < 0.3);
      ctx.restore();
    }
  });
  if (freed) {
    const fall = seg(ring, reach, reach + Math.hypot(w, h) * 0.25);
    calmBlot(g, L, [L.kx, L.hy], fall, g.t);
    if (fall >= 1) {
      // the plop
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = withAlpha(RED.hot, 0.6);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(L.cx - L.R * 0.95, L.gy + S * 0.04, S * 0.12 * seg(q, 0.45, 0.8), S * 0.02 * seg(q, 0.45, 0.8), 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
  // the ring's edge
  ctx.save();
  ctx.translate(L.kx, L.cy);
  ctx.scale(1.1, 1.1);
  ctx.translate(-L.kx, -L.cy);
  ctx.globalCompositeOperation = 'lighter';
  for (const [wd, col, al] of [[S * 0.06, RED.c, 0.35], [S * 0.012, RED.hot, 0.9], [S * 0.003, '#ffffff', 1]] as const) {
    ctx.strokeStyle = withAlpha(col, al * (1 - seg(q, 0.4, 0.55)));
    ctx.lineWidth = wd;
    ctx.beginPath();
    ctx.arc(L.kx, L.gy, ring / 1.1, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/* ============================================================== THE VOID */

/*
 * The knight closes a seal and the world is swallowed: a sphere of nothing
 * grows from their chest and everything inside it is an endless void —
 * stars streaming out of the dark, rings turning, information pouring past
 * faster than anything could take in. The rival hangs in the middle of it,
 * caged in a lattice of light, overloaded and unable to move. Then the
 * void cracks like glass from the point of the blade and blows apart.
 */

/** fibonacci sphere, unit radius */
const LATTICE: [number, number, number][] = Array.from({ length: 220 }, (_, i) => {
  const y = 1 - (i / 219) * 2;
  const r = Math.sqrt(1 - y * y);
  const th = i * 2.399963;
  return [Math.cos(th) * r, y, Math.sin(th) * r];
});

interface VoidO { cx: number; cy: number; k: number; rot: number; z: number }

/** the endless void around (cx, cy); k moves its streams with the scroll */
function voidSpace(g: G, o: VoidO) {
  const { ctx, w, h, S, t } = g;
  const diag = Math.hypot(w, h);
  ctx.fillStyle = '#000005';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(o.cx, o.cy);
  ctx.rotate(o.rot);
  ctx.scale(o.z, o.z);
  const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, diag * 0.75);
  bg.addColorStop(0, '#0d1a4a');
  bg.addColorStop(0.35, '#050a24');
  bg.addColorStop(1, '#000005');
  ctx.fillStyle = bg;
  ctx.fillRect(-diag, -diag, diag * 2, diag * 2);
  // nebulae, turning very slowly
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05 + t * 0.03, r = S * (0.3 + hash(i) * 0.7);
    ctx.globalAlpha = 0.3;
    ctx.save();
    ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
    ctx.rotate(a);
    drawSprite(ctx, glow(i % 2 ? '#2a1a7a' : '#0b3a8a', 128), 0, 0, S * 1.6, S * 0.7);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // stars coming out of the infinite distance
  ctx.lineCap = 'round';
  for (let i = 0; i < 240; i++) {
    const an = hash(i * 1.3) * TAU, rad = 0.06 + hash(i * 2.1);
    const z = (((hash(i * 3.7) - t * 0.05 - o.k * 0.5) % 1) + 1) % 1;
    const p0 = (rad / (0.08 + z)) * S * 0.16, p1 = (rad / (0.11 + z)) * S * 0.16;
    if (p1 > diag) continue;
    const near = (1 - z) ** 1.5;
    ctx.strokeStyle = i % 9 ? `rgba(220,235,255,${near})` : `rgba(184,146,255,${near})`;
    ctx.lineWidth = 0.6 + near * 1.8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(an) * p1, Math.sin(an) * p1);
    ctx.lineTo(Math.cos(an) * p0, Math.sin(an) * p0);
    ctx.stroke();
  }
  // information: dashes pouring outward, too fast and too many
  for (let i = 0; i < 150; i++) {
    const an = hash(i * 5.1) * TAU;
    const dd = (hash(i * 7.3) + t * 0.35 + o.k * 1.5) % 1;
    const r0 = S * 0.4 + dd * diag * 0.8, len = S * (0.01 + dd * 0.14);
    ctx.strokeStyle = withAlpha(i % 7 ? VOID.hot : VIOLET.hot, (1 - dd) * 0.8);
    ctx.lineWidth = i % 3 ? 1 : 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(an) * r0, Math.sin(an) * r0);
    ctx.lineTo(Math.cos(an) * (r0 + len), Math.sin(an) * (r0 + len));
    ctx.stroke();
  }
  // orbits, tilted every way
  for (let i = 0; i < 6; i++) {
    const rx = S * (0.48 + i * 0.17), ry = rx * (0.12 + hash(i) * 0.3);
    const dir = i % 2 ? 1 : -1;
    ctx.save();
    ctx.rotate(hash(i * 9) * Math.PI + t * 0.02 * dir + o.k * 0.4 * dir);
    ctx.strokeStyle = withAlpha(i % 3 ? VOID.c : VIOLET.hot, 0.25 + hash(i * 4) * 0.25);
    ctx.lineWidth = 1;
    ctx.setLineDash([rx * 0.5, rx * 0.12, rx * 0.05, rx * 0.12]);
    ctx.lineDashOffset = -(t * 0.3 + o.k * 2) * rx * dir;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  ctx.setLineDash([]);
  // the horizon of it all: a ring of white light
  drawSprite(ctx, glow(VOID.c, 128), 0, 0, S * 1.9);
  for (const [wd, col, al] of [[S * 0.07, VOID.c, 0.3], [S * 0.018, VOID.hot, 0.8], [S * 0.004, '#ffffff', 1]] as const) {
    ctx.strokeStyle = withAlpha(col, al);
    ctx.lineWidth = wd;
    ctx.beginPath();
    ctx.arc(0, 0, S * 0.44, 0, TAU);
    ctx.stroke();
  }
  // the cage: a sphere of points, turning
  const ry = t * 0.25 + o.k * 1.4, rx = 0.45;
  const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
  const R = S * 0.36;
  for (const [x, y, z] of LATTICE) {
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
    const a = 0.25 + 0.75 * (z2 * 0.5 + 0.5);
    ctx.fillStyle = withAlpha(VOID.hot, a);
    const sz = 0.8 + a * 1.6;
    ctx.fillRect(x1 * R - sz / 2, y2 * R - sz / 2, sz, sz);
  }
  ctx.restore();
  ctx.restore();
}

/** the rival caught in the void: frozen mid-swing, floating, stuttering as it overloads */
function voidRival(g: G, x: number, y: number, s: number, stutter: number) {
  const { ctx, S, t } = g;
  const gb: G = { ...g, t: 7.7 };
  const step = Math.floor(t * 14);
  const jx = (hash(step) - 0.5) * S * 0.012 * stutter, jy = (hash(step + 3) - 0.5) * S * 0.012 * stutter;
  const pose = (dx: number, dy: number, alpha: number) =>
    rival(gb, x + dx, y - s * 0.55 + dy, -Math.PI * 0.82, s, 0, y + s * 2, { lit: 1, alpha });
  if (stutter > 0.2 && step % 3 === 0) pose((hash(step * 7) - 0.5) * S * 0.08, 0, 0.35);
  pose(jx, jy, 1);
  // light running straight through them
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) {
    if (hash(i * 13 + Math.floor(t * 10)) < 0.45) continue;
    const an = hash(i * 3.3) * Math.PI;
    const L = S * 1.6;
    const ox = x - s * 0.05, oy = y - s * 0.5;
    ctx.strokeStyle = withAlpha(VOID.core, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox - Math.cos(an) * L, oy - Math.sin(an) * L);
    ctx.lineTo(ox + Math.cos(an) * L, oy + Math.sin(an) * L);
    ctx.stroke();
  }
  ctx.restore();
}

/** Blot, swallowed too, tumbling helplessly through the void */
function voidBlot(g: G, q: number, alpha = 1) {
  const { ctx, w, h, S, t } = g;
  const x = lerp(w * 0.82, w * 0.62, q), y = lerp(h * 0.16, h * 0.24, q) + Math.sin(t * 1.3) * S * 0.01;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow(VOID.c, 64), x, y - S * 0.04, S * 0.25);
  ctx.globalCompositeOperation = 'source-over';
  drawBlot(ctx, x, y, S * 0.1, { t, pose: 'fall', seed: 12, eye: '#fbfaf5', rot: t * 0.9 + q * 4, wind: Math.sin(t * 2) });
  ctx.restore();
  return [x, y - S * 0.05] as Pt;
}

/** the void as the void shot ends it; the shatter starts from exactly this */
function voidParams(g: G, q: number): VoidO {
  return { cx: g.w / 2, cy: g.h * 0.44, k: 0.4 + q, rot: lerp(-0.08, 0.2, q), z: lerp(1, 1.3, ease.inOut2(q)) };
}

/** everything inside the void shot, at progress q */
function voidFrame(g: G, q: number, blot = true) {
  const { w, h, S } = g;
  const o = voidParams(g, q);
  voidSpace(g, o);
  const s = S * (g.portrait ? 0.62 : 0.5) * o.z;
  voidRival(g, o.cx + s * 0.04, o.cy + s * 0.5, s * 0.8, 0.4 + 0.6 * bell(q, 0.1, 0.9));
  if (blot) voidBlot(g, q);
  // the knight, unhurried, in the foreground
  const ks = S * (g.portrait ? 0.62 : 0.5);
  const gy = h * 0.92;
  knight(g, w * 0.16, gy - ks * 0.6, Math.PI * 0.36, ks, o.cx, gy, { lit: 0.6, veins: 0, pal: VOID, back: VOID.deep });
}

/* a seal: the hand comes up, two fingers cross, and a point of light opens behind it */
function hand(g: G, x: number, y: number, H: number, cross: number) {
  const { ctx } = g;
  const cap = (x0: number, y0: number, x1: number, y1: number, r: number) => {
    ctx.lineWidth = r * 2 * H;
    ctx.beginPath();
    ctx.moveTo(x + x0 * H, y + y0 * H);
    ctx.lineTo(x + x1 * H, y + y1 * H);
    ctx.stroke();
  };
  const finger = (bx: number, by: number, an: number, len: number) => [bx, by, bx + Math.cos(an) * len, by + Math.sin(an) * len] as const;
  const index = finger(-0.085, -0.4, -Math.PI / 2 + 0.2 * cross, 0.56);
  const middle = finger(0.06, -0.42, -Math.PI / 2 - 0.26 * cross, 0.62);
  const parts: [number, number, number, number, number][] = [
    [0, 0.9, 0, 0.05, 0.17], [-0.02, 0, 0, -0.3, 0.2],
    [0.09, -0.3, 0.17, -0.37, 0.07], [0.11, -0.21, 0.19, -0.27, 0.065],
    [-0.2, -0.06, -0.05, -0.3, 0.062],
    [index[0], index[1], index[2], index[3], 0.056],
    [middle[0], middle[1], middle[2], middle[3], 0.056],
  ];
  ctx.save();
  ctx.lineCap = 'round';
  // rims: cold light from the point above, red from the world below
  ctx.globalCompositeOperation = 'lighter';
  for (const [dx, dy, col] of [[0, -2.5, withAlpha(VOID.hot, 0.9)], [0, 2.5, withAlpha(RED.c, 0.7)]] as const) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.strokeStyle = col;
    parts.forEach((p) => cap(p[0], p[1], p[2], p[3], p[4] + 0.004));
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#07050b';
  parts.forEach((p) => cap(p[0], p[1], p[2], p[3], p[4]));
  // gauntlet plates, catching the red
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = withAlpha(RED.c, 0.55);
  ctx.lineWidth = Math.max(1, H * 0.006);
  for (const f of [index, middle]) {
    for (const u of [0.35, 0.68]) {
      const px = f[0] + (f[2] - f[0]) * u, py = f[1] + (f[3] - f[1]) * u;
      ctx.beginPath();
      ctx.arc(x + px * H, y + py * H, H * 0.05, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }
  for (const yy of [0.25, 0.45, 0.65]) {
    ctx.beginPath();
    ctx.moveTo(x - H * 0.16, y + yy * H);
    ctx.quadraticCurveTo(x, y + (yy + 0.05) * H, x + H * 0.16, y + yy * H);
    ctx.stroke();
  }
  ctx.restore();
}

function shotSign(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const px = w * 0.5, py = h * 0.36;
  const bg = ctx.createRadialGradient(px, py, 0, px, py, Math.hypot(w, h) * 0.7);
  bg.addColorStop(0, '#2a0a1a');
  bg.addColorStop(1, '#050207');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // the point of light: it opens, everything drifts into it
  const open = ease.out3(seg(q, 0.3, 0.7));
  const pull = seg(q, 0.25, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const life = (hash(i * 3.1) + q * 1.6 + t * 0.15) % 1;
    const an = hash(i * 1.7) * TAU + life * 2.5;
    const r = S * (0.1 + hash(i * 5.3) * 0.9) * (1 - life);
    ctx.globalAlpha = pull * life * 0.8;
    ctx.fillStyle = i % 4 ? VOID.hot : RED.hot;
    ctx.fillRect(px + Math.cos(an) * r, py + Math.sin(an) * r * 0.7, 2, 2);
  }
  ctx.globalAlpha = open;
  drawSprite(ctx, glow(VOID.c, 128), px, py, S * (0.2 + open * 1.2));
  drawSprite(ctx, glow('#ffffff', 64), px, py, S * 0.12 * open);
  // a lens streak across it
  const gr = ctx.createLinearGradient(px - w * 0.6, 0, px + w * 0.6, 0);
  gr.addColorStop(0, 'rgba(127,178,255,0)');
  gr.addColorStop(0.5, `rgba(212,230,255,${0.7 * open})`);
  gr.addColorStop(1, 'rgba(127,178,255,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(px - w * 0.6, py - 1, w * 1.2, 2);
  ctx.globalAlpha = 1;
  ctx.restore();
  // the click: a ring snaps out of the point
  if (hitQ(0.72)) g.f.shake(S * 0.02);
  const click = seg(q, 0.72, 1);
  if (click > 0) shockRing(g, px, py, click, S * 1.3, S * 1.3, VOID.hot);
  // the hand rises into frame and the fingers cross
  const rise = ease.out3(seg(q, 0, 0.35));
  const H = S * (g.portrait ? 0.8 : 0.7);
  hand(g, w * 0.5, lerp(h * 1.3, h * 0.84, rise), H, ease.inOut3(seg(q, 0.25, 0.55)));
}

/* the expansion: a sphere of nothing grows out of the knight and takes everything */
function shotExpand(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const s = S * (g.portrait ? 0.5 : 0.42);
  const kx = w * 0.26, gy = h * 0.86, bx = w * 0.74;
  const O: Pt = [kx + s * 0.05, gy - s * 0.78];
  const far = Math.max(...[[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => Math.hypot(x - O[0], y - O[1]))) * 1.08;
  const R = ease.inOut3(seg(q, 0.16, 0.86)) * far;
  const gather = seg(q, 0, 0.14);
  const outside = () => {
    world(g, { x: 0, y: 0, z: lerp(1.05, 1.12, q) }, { tint: 0.15 });
    rival(g, bx, gy - s * 0.48, -Math.PI + 0.3, s, 0, gy, { lit: 1 });
    knight(g, kx, gy - s * 0.6, Math.PI * 0.36, s, bx, gy, { lit: 1, veins: 1 });
    // the world darkens and everything leans toward the point
    ctx.fillStyle = `rgba(0,0,0,${0.45 * gather})`;
    ctx.fillRect(0, 0, w, h);
  };
  outside();
  // implosion first: lines rushing in, a point of white
  if (q < 0.2) {
    const k = 1 - gather;
    ctx.save();
    ctx.strokeStyle = withAlpha(VOID.hot, 0.5 * gather);
    for (let i = 0; i < 50; i++) {
      const an = hash(i * 2.3) * TAU, r0 = S * (0.2 + k * 1.5 + hash(i) * 0.4);
      ctx.lineWidth = 1 + hash(i * 3) * 2;
      ctx.beginPath();
      ctx.moveTo(O[0] + Math.cos(an) * r0, O[1] + Math.sin(an) * r0);
      ctx.lineTo(O[0] + Math.cos(an) * (r0 + S * 0.3), O[1] + Math.sin(an) * (r0 + S * 0.3));
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glow('#ffffff', 64), O[0], O[1], S * 0.3 * gather);
    ctx.restore();
  }
  if (hitQ(0.15)) {
    g.f.shake(S * 0.05);
    g.f.flash(0.6, '#ffffff');
  }
  // the inverted frame as it goes
  if (q >= 0.14 && q < 0.18) {
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (R <= 0) return;
  // things just outside the edge are blown outward ahead of it
  ctx.save();
  for (let i = 0; i < 60; i++) {
    const an = hash(i * 4.1) * TAU;
    const d = R + S * (0.02 + hash(i * 2.7) * 0.25) * (1 + q);
    ctx.fillStyle = i % 3 ? '#1a1024' : RED.hot;
    ctx.globalAlpha = 1 - seg(q, 0.7, 0.9);
    ctx.fillRect(O[0] + Math.cos(an) * d, O[1] + Math.sin(an) * d, S * 0.012, S * 0.006);
  }
  ctx.restore();
  // inside: the void
  ctx.save();
  ctx.beginPath();
  ctx.arc(O[0], O[1], R, 0, TAU);
  ctx.clip();
  voidSpace(g, { cx: lerp(O[0], w / 2, seg(q, 0.6, 1)), cy: lerp(O[1], h * 0.44, seg(q, 0.6, 1)), k: q * 0.4, rot: -0.06, z: 1 });
  voidRival(g, bx, gy, s, seg(q, 0.4, 0.8));
  knight(g, kx, gy - s * 0.6, Math.PI * 0.36, s, bx, gy, { lit: 0.6, veins: 0, pal: VOID, back: VOID.deep });
  ctx.restore();
  // the edge: a hard white rim split into colour, and the shock rolling ahead
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [dr, col, wd] of [[3, 'rgba(80,220,255,0.7)', 2], [-3, 'rgba(255,60,200,0.6)', 2], [0, 'rgba(255,255,255,1)', 2.5]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = wd;
    ctx.beginPath();
    ctx.arc(O[0], O[1], Math.max(0, R + dr), 0, TAU);
    ctx.stroke();
  }
  ctx.strokeStyle = withAlpha(VOID.c, 0.35);
  ctx.lineWidth = S * 0.04;
  ctx.beginPath();
  ctx.arc(O[0], O[1], R, 0, TAU);
  ctx.stroke();
  for (const m of [1.08, 1.2]) {
    ctx.strokeStyle = withAlpha(VOID.hot, 0.35 * (1 - seg(q, 0.7, 0.86)));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(O[0], O[1], R * m, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  if (q > 0.16 && q < 0.86) g.f.shake(S * 0.006);
  void t;
}

/* inside: endless, and the rival can't move */
function shotVoid(g: G, q: number) {
  const { ctx, w, h, S } = g;
  voidFrame(g, q);
  // overload: a frame or two of negative each time it all floods in
  for (const at of [0.32, 0.58, 0.8]) {
    if (hitQ(at)) g.f.shake(S * 0.02);
    const k = seg(q, at, at + 0.035);
    if (k > 0 && k < 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    const ring = seg(q, at, at + 0.2);
    if (ring > 0 && ring < 1) shockRing(g, w / 2, h * 0.44, ring, S * 1.4, S * 1.4, VOID.hot);
  }
}

/* the blade's point catches red, the void cracks like glass, and blows apart */
let voidBuf: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D; key: string; ready: boolean } | null = null;
let shardCache: { key: string; tris: Pt[][] } | null = null;
function shards(w: number, h: number) {
  const key = `${w}x${h}`;
  if (shardCache?.key === key) return shardCache.tris;
  const cols = 6, rows = Math.round(cols * (h / w));
  const r = rng(404);
  const V: Pt[][] = [];
  for (let i = 0; i <= cols; i++) {
    V.push([]);
    for (let j = 0; j <= rows; j++) {
      const edgeX = i === 0 || i === cols, edgeY = j === 0 || j === rows;
      V[i].push([(i / cols) * w + (edgeX ? 0 : (r() - 0.5) * (w / cols) * 0.8), (j / rows) * h + (edgeY ? 0 : (r() - 0.5) * (h / rows) * 0.8)]);
    }
  }
  const tris: Pt[][] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const a = V[i][j], b = V[i + 1][j], c = V[i + 1][j + 1], d = V[i][j + 1];
      if (r() < 0.5) tris.push([a, b, c], [a, c, d]);
      else tris.push([a, b, d], [b, c, d]);
    }
  }
  shardCache = { key, tris };
  return tris;
}

function shotShatter(g: G, q: number) {
  const { ctx, w, h, S } = g;
  const brk = 0.32;
  const ks = S * (g.portrait ? 0.62 : 0.5);
  // the blade's point, where the void gives first
  const ka = Math.PI * 0.36;
  const P: Pt = [w * 0.16 + Math.cos(ka) * ks * 0.95, h * 0.92 - ks * 0.6 + Math.sin(ka) * ks * 0.95];
  // behind the void: the corrupted world, and the rival on one knee
  const behind = () => {
    world(g, { x: 0, y: 0, z: 1.1 }, { tint: 0.25 });
    // the rival down on one knee, blade planted, the light in it guttering
    const rs = ks * 0.85;
    rival(g, w * 0.68, h * 0.86 - rs * 0.24, Math.PI * 0.56, rs, 0, h * 0.86, { lit: 0.85 + Math.sin(g.t * 23) * 0.1 });
    knight(g, w * 0.2, h * 0.86 - ks * 0.55, ka, ks * 0.8, w, h * 0.86, { lit: 1, veins: 1 });
  };
  // the void as a picture, so it can break
  const dpr = ctx.getTransform().a;
  const key = `${w}x${h}x${dpr}`;
  if (voidBuf?.key !== key) {
    const c = canvas(w * dpr, h * dpr);
    voidBuf = { ...c, key, ready: false };
  }
  const vb = voidBuf!;
  // live until it breaks; after that the pieces hold the last picture (or, landing
  // here mid-break, the picture the void shot ends on)
  if (q < brk + 0.02 || !vb.ready) {
    vb.ready = true;
    vb.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    voidFrame({ ...g, ctx: vb.ctx }, 1, false);
  }
  const tris = shards(w, h);
  const diag = Math.hypot(w, h);
  const crack = ease.out3(seg(q, 0.08, brk)) * diag;
  if (q < brk) {
    ctx.drawImage(vb.c, 0, 0, w, h);
    voidBlot(g, 1);
    // the point ignites
    const ig = ease.out3(seg(q, 0, 0.2));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glow(RED.c, 128), P[0], P[1], S * (0.1 + ig * 0.5));
    drawSprite(ctx, glow('#ffffff', 64), P[0], P[1], S * 0.08 * ig);
    // cracks run along the shard edges outward from it
    ctx.strokeStyle = 'rgba(240,246,255,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const tr of tris) {
      for (let e = 0; e < 3; e++) {
        const a = tr[e], b = tr[(e + 1) % 3];
        const m = Math.hypot((a[0] + b[0]) / 2 - P[0], (a[1] + b[1]) / 2 - P[1]);
        if (m > crack) continue;
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
    }
    ctx.stroke();
    ctx.restore();
    g.f.shake(S * 0.01 * seg(q, 0.1, brk));
    return;
  }
  if (hitQ(brk)) {
    g.f.shake(S * 0.07);
    g.f.flash(0.6, RED.hot);
  }
  behind();
  // the shards fly at and past the camera, the nearest first
  for (const tr of tris) {
    const c: Pt = [(tr[0][0] + tr[1][0] + tr[2][0]) / 3, (tr[0][1] + tr[1][1] + tr[2][1]) / 3];
    const dx = c[0] - P[0], dy = c[1] - P[1];
    const dist = Math.hypot(dx, dy) || 1;
    const delay = (dist / diag) * 0.25;
    const d = ease.in2(seg(q, brk + delay * 0.6, 1));
    if (d >= 1) continue;
    const sd = hash(c[0] * 0.13 + c[1] * 0.07);
    ctx.save();
    ctx.globalAlpha = 1 - seg(d, 0.55, 1);
    ctx.translate(c[0] + (dx / dist) * d * diag * 0.8, c[1] + (dy / dist) * d * diag * 0.8 + d * d * S * 0.4);
    ctx.rotate((sd - 0.5) * d * 4);
    const sc = 1 + d * (0.5 + sd);
    ctx.scale(sc, sc);
    ctx.translate(-c[0], -c[1]);
    ctx.beginPath();
    ctx.moveTo(tr[0][0], tr[0][1]);
    ctx.lineTo(tr[1][0], tr[1][1]);
    ctx.lineTo(tr[2][0], tr[2][1]);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    const x0 = Math.min(tr[0][0], tr[1][0], tr[2][0]), y0 = Math.min(tr[0][1], tr[1][1], tr[2][1]);
    const x1 = Math.max(tr[0][0], tr[1][0], tr[2][0]), y1 = Math.max(tr[0][1], tr[1][1], tr[2][1]);
    const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
    ctx.drawImage(vb.c, x0 * dpr, y0 * dpr, bw * dpr, bh * dpr, x0, y0, bw, bh);
    // glass: a sheen that turns with the shard
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(212,230,255,${0.03 + 0.14 * Math.abs(Math.sin(sd * 9 + d * 6)) ** 4})`;
    ctx.fillRect(x0, y0, bw, bh);
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(240,246,255,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  // red light pours through where the glass was
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1 - seg(q, brk, 0.8);
  drawSprite(ctx, glow(RED.c, 128), P[0], P[1], S * 2.2);
  ctx.restore();
  // Blot drops out of the broken void; one big shard spins past, a hair away
  const fall = ease.in2(seg(q, brk, 1));
  const bx = lerp(w * 0.62, w * 0.5, fall), by = lerp(h * 0.24, h * 1.2, fall);
  const pass = seg(q, brk, brk + 0.3);
  const close = bell(pass, 0, 1);
  drawBlot(ctx, bx, by, S * 0.1, { t: g.t, pose: close > 0.3 ? 'cover' : 'fall', seed: 12, eye: '#fbfaf5', rot: g.t * 0.9 + 4 + fall * 6, wind: 1 });
  if (pass > 0 && pass < 1) {
    const sx = lerp(-w * 0.2, w * 1.3, ease.inOut2(pass)), sy = lerp(h * 0.42, h * 0.08, pass) + (by - h * 0.24) * 0.3;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(pass * 5);
    const R = S * 0.32;
    ctx.beginPath();
    ctx.moveTo(-R, -R * 0.3);
    ctx.lineTo(R * 0.9, -R * 0.5);
    ctx.lineTo(R * 0.2, R * 0.7);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.drawImage(vb.c, (w * 0.5 - R) * dpr, (h * 0.4 - R) * dpr, R * 2 * dpr, R * 2 * dpr, -R, -R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(212,230,255,0.15)';
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(240,246,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

/* 15. the charge: the camera circles the knight as the sword goes up and the sky splits */

/**
 * The world seen from a camera orbiting a subject at the centre: things far
 * behind the subject slide the most, things at its depth stay put, things in
 * front slide the other way. `th` is the orbit angle in radians.
 */
function orbitWorld(g: G, th: number, hz: number, tint: number) {
  const { ctx, w, h, S, t } = g;
  const slide = (z: number) => -th * w * 1.25 * (1 - 1 / z);
  const wrap = (x: number, span: number) => ((((x + span * 0.5) % span) + span) % span) - span * 0.5;
  const sky = ctx.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, K.sky0);
  sky.addColorStop(0.6, K.sky1);
  sky.addColorStop(1, K.sky2);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // the moon: the farthest thing there is, so it moves the most
  const mx = w * 0.5 + wrap(w * 0.22 + slide(40), w * 3.2), my = h * 0.16, mr = S * 0.1;
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
  // clouds
  for (let i = 0; i < 7; i++) {
    const x = w * 0.5 + wrap(i * w * 0.55 + slide(12) + t * S * 0.02, w * 3.8);
    ctx.globalAlpha = 0.55;
    drawSprite(ctx, glow('#1d1230', 128), x, h * (0.08 + (i % 3) * 0.1), S * (1.2 + (i % 2) * 0.5), S * 0.35);
  }
  ctx.globalAlpha = 1;
  // two rings of ruins at different distances, tiled all the way round
  const sp = spires(w, h);
  for (const [z, sc, al] of [[6, 0.75, 0.7], [2.2, 1.15, 1]] as const) {
    const W = sp.width * sc, H = sp.height * sc;
    const x0 = wrap(slide(z) * (z > 3 ? 1 : 1), W);
    ctx.globalAlpha = al;
    for (let k = -2; k <= 1; k++) ctx.drawImage(sp, x0 + k * W, hz - H * 0.92, W, H);
  }
  ctx.globalAlpha = 1;
  // mist lying on the horizon
  for (let i = 0; i < 5; i++) {
    const x = w * 0.5 + wrap(i * w * 0.5 + slide(1.6), w * 2.5);
    ctx.globalAlpha = 0.35;
    drawSprite(ctx, glow('#4a2e72', 128), x, hz - S * 0.02, S * 1.4, S * 0.22);
  }
  ctx.globalAlpha = 1;
  // black water
  const fl = ctx.createLinearGradient(0, hz, 0, h);
  fl.addColorStop(0, '#120a1c');
  fl.addColorStop(0.2, K.floor);
  fl.addColorStop(1, '#020103');
  ctx.fillStyle = fl;
  ctx.fillRect(0, hz, w, h - hz);
  ctx.globalAlpha = 0.25;
  drawSprite(ctx, glow(RED.c, 64), mx, hz + S * 0.12, S * 0.12, S * 0.5);
  ctx.globalAlpha = 1;
  if (tint) {
    ctx.fillStyle = `rgba(120,0,30,${tint})`;
    ctx.fillRect(0, 0, w, h);
  }
}

/** a circle of runes burnt into the water around (x, y), seen from the orbiting camera */
function runeCircle(g: G, x: number, y: number, R: number, th: number, a: number) {
  const { ctx, S, t } = g;
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.22);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  for (const [rr, wd, col] of [[1, S * 0.006, RED.c], [0.82, S * 0.003, RED.hot], [1.12, S * 0.002, VIOLET.hot]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = wd;
    ctx.beginPath();
    ctx.arc(0, 0, R * rr, 0, TAU);
    ctx.stroke();
  }
  // the marks between the rings turn with the orbit, so the circle reads as lying flat
  ctx.strokeStyle = RED.hot;
  ctx.lineWidth = S * 0.004;
  for (let i = 0; i < 24; i++) {
    const an = (i / 24) * TAU + th + t * 0.2;
    const r0 = R * 0.86, r1 = R * (i % 3 ? 0.95 : 1.0);
    ctx.beginPath();
    ctx.moveTo(Math.cos(an) * r0, Math.sin(an) * r0);
    ctx.lineTo(Math.cos(an + 0.08) * r1, Math.sin(an + 0.08) * r1);
    ctx.stroke();
  }
  ctx.globalAlpha = a * 0.5;
  drawSprite(ctx, glow(RED.c, 128), 0, 0, R * 2.6);
  ctx.restore();
}

function shotCharge(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  // a quarter turn and more around the knight, slow in and out
  const th = lerp(-0.9, 1.1, ease.inOut2(q));
  const hz = h * 0.6;
  orbitWorld(g, th, hz, 0.1 + q * 0.2);
  // the sky cracks
  const crack = ease.out2(seg(q, 0.2, 0.7));
  if (crack > 0) {
    const pts: Pt[] = [];
    for (let i = 0; i <= 8; i++) pts.push([w * 0.5 + (hash(i * 3) - 0.5) * S * 0.25, -10 + (h * 0.42 * crack * i) / 8]);
    drawBolt(ctx, pts, t, { width: S * 0.009, amp: S * 0.025, seed: 8, branches: 8, pal: RED });
  }
  const gy = h * 0.86;
  const s = S * (g.portrait ? 0.78 : 0.62);
  const raise = ease.inOut3(seg(q, 0.05, 0.4));
  const a = lerp(Math.PI * 0.86, -Math.PI / 2, raise);
  const hx = w * 0.5, hy = lerp(gy - s * 0.42, gy - s * 0.78, raise);
  const tipX = hx + Math.cos(a) * s * 0.95, tipY = hy + Math.sin(a) * s * 0.95;
  const pull = seg(q, 0.3, 1);
  // rocks lifting off the ground behind them, sliding with the ruins
  const r = rng(51);
  const rock = (x: number, y: number, sz: number, i: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.3 * (hash(i * 5) - 0.5) + i);
    ctx.fillStyle = '#140d1d';
    ctx.fillRect(-sz, -sz * 0.6, sz * 2, sz * 1.2);
    ctx.strokeStyle = withAlpha(RED.c, 0.6);
    ctx.lineWidth = 1;
    ctx.strokeRect(-sz, -sz * 0.6, sz * 2, sz * 1.2);
    ctx.restore();
  };
  const rocks = Array.from({ length: 22 }, (_, i) => {
    // depth: < 1 is in front of the knight, > 1 behind
    const z = 0.45 + r() * 1.6;
    return { i, z, x0: r() * 2.4 - 1.2, lift: r(), sz: r() };
  });
  const rockAt = (k: (typeof rocks)[number]) => {
    const x = hx + (k.x0 * w * 0.8 - th * w * 1.25 * (1 - 1 / k.z) * 0.6) / k.z;
    const y = lerp(gy, hz, 1 - 1 / (1 + (k.z - 0.45))) - pull * S * (0.15 + k.lift * 0.6) / k.z - Math.sin(t * 1.5 + k.i) * S * 0.01;
    return [x, y, (S * (0.012 + k.sz * 0.03)) / k.z] as const;
  };
  for (const k of rocks) if (k.z >= 1) rock(...rockAt(k), k.i);
  runeCircle(g, hx, gy, S * 0.55, th, ease.out3(seg(q, 0.1, 0.45)));
  // dark energy spiralling into the blade
  ctx.save();
  for (let i = 0; i < 80; i++) {
    const ph = hash(i * 3.7);
    const life = (t * (0.5 + hash(i) * 0.6) + ph) % 1;
    const r0 = S * (0.3 + hash(i * 5) * 0.8) * (1 - life);
    const an = ph * TAU + life * 6 + th;
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
  knight(g, hx, hy, a, s, hx + Math.cos(th) * w, gy, { lit: 1, veins: 1 });
  // the blade's glow building to white
  const hot = seg(q, 0.6, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = hot;
  drawSprite(ctx, glow(RED.c, 128), tipX, tipY, S * (0.4 + hot * 0.8));
  ctx.restore();
  // violet lightning crawling down from the crack to the blade
  if (q > 0.55) {
    drawBolt(ctx, [[w * 0.5, h * 0.42 * crack], [tipX, tipY]], t, { width: S * 0.004, amp: S * 0.04, seed: 19, alpha: seg(q, 0.55, 0.75), branches: 4, pal: VIOLET });
  }
  // rocks between us and them, sweeping the other way, big and soft
  for (const k of rocks) if (k.z < 1) rock(...rockAt(k), k.i);
}

/* 16. the beams: the knight fires, the rival fires back, and the two meet */

type BeamPal = { corona: string; deep: string; c: string; hot: string; strands: [string, string] };
const BEAM_RED: BeamPal = { corona: VIOLET.c, deep: RED.deep, c: RED.c, hot: RED.hot, strands: [RED.hot, VIOLET.hot] };
const BEAM_VIOLET: BeamPal = { corona: '#b892ff', deep: VIOLET.deep, c: VIOLET.c, hot: VIOLET.hot, strands: [VIOLET.hot, '#ffffff'] };
/** the last push: Blue's colour comes up through the red */
const BEAM_BLUE: BeamPal = { corona: VIOLET.c, deep: RED.deep, c: RED.c, hot: RED.hot, strands: [BLUE.hot, '#ffffff'] };

interface Duel { kx: number; gy: number; s: number; hy: number; bx: number; bgy: number; bs: number; bhy: number }
function duelLayout(g: G, step = 0): Duel {
  const { w, h, S, portrait } = g;
  // the knight low on the left in the water, the rival high on a broken pillar:
  // far enough apart that the beams have room to meet between the blade tips
  const s = S * (portrait ? 0.46 : 0.4);
  const gy = h * 0.86;
  const bs = s * 0.78, bgy = h * (portrait ? 0.42 : 0.5);
  return { kx: w * 0.2 + step * S * 0.05, gy, s, hy: gy - s * 0.5, bx: w * (portrait ? 0.8 : 0.76), bgy, bs, bhy: bgy - bs * 0.5 };
}

/** where the two beams meet, as a fraction from the knight's blade point (0) to the rival's (1) */
function contactAt(q: number) {
  // they meet halfway, the red is driven back, holds, gives again
  const keys: [number, number][] = [[0.2, 0.5], [0.34, 0.42], [0.46, 0.55], [0.62, 0.3], [0.78, 0.36], [1, 0.27]];
  let prev: [number, number] = [0, 0.5];
  for (const k of keys) {
    if (q <= k[0]) return lerp(prev[1], k[1], ease.inOut2(seg(q, prev[0], k[0])));
    prev = k;
  }
  return prev[1];
}

/** the meeting point: a ball of light that can't decide whose it is */
function contact(g: G, x: number, y: number, a: number, k: number, seed: number) {
  const { ctx, S, t } = g;
  const fl = 0.85 + Math.sin(t * 47) * 0.1 + Math.sin(t * 31) * 0.05;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = k;
  drawSprite(ctx, glow(VIOLET.c, 128), x + Math.cos(a) * S * 0.08, y + Math.sin(a) * S * 0.08, S * 1.3 * fl);
  drawSprite(ctx, glow(RED.c, 128), x - Math.cos(a) * S * 0.08, y - Math.sin(a) * S * 0.08, S * 1.2 * fl);
  drawSprite(ctx, glow('#ffffff', 64), x, y, S * 0.32 * fl);
  // sparks thrown out sideways from the seam
  const nx = -Math.sin(a), ny = Math.cos(a);
  const r = rng(seed);
  for (let i = 0; i < 46; i++) {
    const life = (r() + t * (1.2 + r())) % 1;
    const side = i % 2 ? 1 : -1;
    const sp = (r() - 0.5) * 1.6;
    const dx = nx * side + Math.cos(a) * sp, dy = ny * side + Math.sin(a) * sp;
    const d = S * (0.05 + life * (0.3 + r() * 0.5));
    ctx.strokeStyle = i % 3 ? withAlpha(RED.hot, 1 - life) : withAlpha(VIOLET.hot, 1 - life);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + dx * d, y + dy * d + life * life * S * 0.2);
    ctx.lineTo(x + dx * (d + S * 0.05), y + dy * (d + S * 0.05) + life * life * S * 0.2);
    ctx.stroke();
  }
  ctx.restore();
  // lightning crawling off the ball, both colours
  for (let i = 0; i < 4; i++) {
    const an = a + Math.PI / 2 + (i - 1.5) * 0.9 + Math.sin(t * 3 + i) * 0.3;
    const L = S * (0.18 + hash(i + Math.floor(t * 12)) * 0.2);
    drawBolt(ctx, [[x, y], [x + Math.cos(an) * L * 0.5, y + Math.sin(an) * L * 0.5], [x + Math.cos(an) * L, y + Math.sin(an) * L]], t, { width: S * 0.003, amp: S * 0.02, seed: seed + i, alpha: k, branches: 1, pal: i % 2 ? VIOLET : RED });
  }
}

/** the ground under the struggle tearing up and lifting toward it */
function tearGround(g: G, x: number, gy: number, cy: number, k: number, seed: number) {
  const { ctx, S, t } = g;
  if (k <= 0) return;
  cracks(g, x, gy, k, S * 0.6, 0.2, seed);
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const life = (r() + t * (0.25 + r() * 0.3)) % 1;
    const ox = x + (r() - 0.5) * S * 0.9;
    const yy = lerp(gy, lerp(gy, cy, 0.85), ease.out2(life));
    const sz = S * (0.008 + r() * 0.024) * (1 - life * 0.5);
    ctx.save();
    ctx.globalAlpha = k * (1 - life ** 3);
    ctx.translate(lerp(ox, x, life * 0.4), yy);
    ctx.rotate(life * (r() - 0.5) * 9);
    ctx.fillStyle = '#140d1d';
    ctx.fillRect(-sz, -sz * 0.6, sz * 2, sz * 1.2);
    ctx.strokeStyle = withAlpha(RED.c, 0.7);
    ctx.lineWidth = 1;
    ctx.strokeRect(-sz, -sz * 0.6, sz * 2, sz * 1.2);
    ctx.restore();
  }
  // water thrown up in sheets
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 * k;
  drawSprite(ctx, glow(RED.c, 128), x, gy, S * 1.2, S * 0.18);
  ctx.restore();
}

/** the wide on the struggle; `c` is where they meet, `blue` the colour in the last shove */
function duelWide(g: G, q: number, c: number, o: { fireR: number; fireV: number; step: number; blue: number; dis: number; meet: number }) {
  const { ctx, w, S } = g;
  world(g, { x: 0.05, y: 0, z: 1.05 }, { tint: 0.3 });
  const D = duelLayout(g, o.step);
  // the two blades aimed straight at each other along the line between the hilts
  const a = Math.atan2(D.bhy - D.hy, D.bx - D.kx);
  const tip: Pt = [D.kx + Math.cos(a) * D.s * 0.95, D.hy + Math.sin(a) * D.s * 0.95];
  const mouth: Pt = [D.bx - Math.cos(a) * D.bs * 0.95, D.bhy - Math.sin(a) * D.bs * 0.95];
  const P: Pt = [lerp(tip[0], mouth[0], c), lerp(tip[1], mouth[1], c)];
  const span = Math.hypot(mouth[0] - tip[0], mouth[1] - tip[1]);
  // the pillar the rival stands on
  ctx.save();
  ctx.fillStyle = '#0b0614';
  ctx.beginPath();
  ctx.moveTo(D.bx - D.bs * 0.42, D.bgy - D.bs * 0.02);
  ctx.lineTo(D.bx - D.bs * 0.18, D.bgy - D.bs * 0.06);
  ctx.lineTo(D.bx + D.bs * 0.05, D.bgy + D.bs * 0.01);
  ctx.lineTo(D.bx + D.bs * 0.35, D.bgy - D.bs * 0.04);
  ctx.lineTo(D.bx + D.bs * 0.5, D.bgy + D.bs * 0.05);
  ctx.lineTo(D.bx + D.bs * 0.62, g.h);
  ctx.lineTo(D.bx - D.bs * 0.55, g.h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = withAlpha(RED.c, 0.45);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  tearGround(g, P[0], D.gy, P[1], o.meet, 61);
  rival(g, D.bx, D.bhy, a + Math.PI, D.bs, 0, D.bgy, { lit: 1, dissolve: o.dis, vx: o.meet ? S * 2 : 0 });
  knight(g, D.kx, D.hy, a, D.s, w, D.gy, { lit: 1, veins: 1 });
  // the knight's eyes, a cold blue for the last push
  if (o.blue > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = o.blue;
    drawSprite(ctx, glow(BLUE.c, 128), D.kx - D.s * 0.12, D.hy - D.s * 0.42, D.s * 0.5);
    ctx.restore();
  }
  // each beam runs from its blade to wherever the other one stops it
  const W = S * 0.085;
  const lenR = o.fireR * (o.meet > 0 ? span * c : span * 1.6);
  const through = o.dis > 0 && o.fireR >= 1;
  const lenV = o.fireV * (o.meet > 0 ? span * (1 - c) : span * 1.6);
  if (o.fireV > 0 && o.dis < 0.5) beam(g, mouth[0], mouth[1], a + Math.PI, 0.5, W * 0.9 * (1 - o.dis * 2), lenV, BEAM_VIOLET);
  if (o.fireR > 0) beam(g, tip[0], tip[1], a, 0.5, W, through ? undefined : lenR, o.blue > 0.5 ? BEAM_BLUE : BEAM_RED);
  if (o.meet > 0) {
    contact(g, P[0], P[1], a, o.meet, 7);
    g.f.shake(S * 0.004);
  }
  void q;
  return { D, a, tip, mouth, P };
}

/* the knight fires; the rival answers from their own blade; they meet and the red is driven back */
function shotFire(g: G, q: number) {
  const { ctx, w, h, S } = g;
  const fireR = ease.out3(seg(q, 0.04, 0.16));
  const fireV = ease.out3(seg(q, 0.08, 0.2));
  const meet = q >= 0.2 ? 1 : 0;
  if (hitQ(0.04)) {
    g.f.shake(S * 0.06);
    g.f.flash(0.8, RED.hot);
  }
  const c = contactAt(q);
  // before they meet, each front races out from its own side
  const cc = meet ? c : clamp(fireR * 0.5 / Math.max(0.01, fireR * 0.5 + fireV * 0.5)) ;
  const { P } = duelWide(g, q, meet ? c : cc, { fireR: meet ? 1 : fireR * 0.5 * 2, fireV: meet ? 1 : fireV * 0.5 * 2, step: 0, blue: 0, dis: 0, meet: meet * (1 - 0.0) });
  // the instant they meet: white, then a ring tearing out of it
  if (hitQ(0.2)) {
    g.f.shake(S * 0.08);
    g.f.flash(0.9, '#ffffff');
  }
  for (const at of [0.2, 0.46, 0.78]) {
    const k = seg(q, at, at + 0.22);
    if (k > 0 && k < 1) shockRing(g, P[0], P[1], k, S * 1.6, S * 1.6, at === 0.2 ? '#ffffff' : RED.hot);
    if (at > 0.2 && hitQ(at)) g.f.shake(S * 0.03);
  }
  if (q >= 0.2 && q < 0.235) {
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/* low on the water: the knight driven back, heels ploughing two furrows, the blade still up */
function shotDriven(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const gy = h * 0.74;
  world(g, { x: -0.1, y: 0.1, z: 1.15 }, { horizon: 0.74, tint: 0.25 });
  // the struggle, off frame to the right, lighting everything
  const fl = 0.85 + Math.sin(t * 40) * 0.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.8 * fl;
  drawSprite(ctx, glow(VIOLET.c, 128), w * 1.1, h * 0.3, S * 1.8, S * 1.4);
  drawSprite(ctx, glow(RED.c, 128), w * 0.9, h * 0.38, S * 1.4, S * 1.0);
  ctx.restore();
  hLines(g, 0.25, '#ffb3c0', -1);
  const s = S * (g.portrait ? 0.62 : 0.55);
  const slide = ease.inOut2(q);
  const hx = w * lerp(0.5, 0.36, slide) + Math.sin(t * 60) * S * 0.002;
  const hy = gy - s * 0.44;
  const a = -0.42;
  // the furrows behind the heels, and the water thrown off them
  const feetX = hx - s * 0.2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [dy, al] of [[0, 0.55], [S * 0.02, 0.35]] as const) {
    const gr = ctx.createLinearGradient(feetX, 0, w * 1.1, 0);
    gr.addColorStop(0, `rgba(255,116,134,${al})`);
    gr.addColorStop(1, 'rgba(255,116,134,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(feetX, gy + dy, w, S * 0.006);
  }
  ctx.restore();
  const r = rng(70);
  for (let i = 0; i < 50; i++) {
    const life = (r() + t * (1 + r())) % 1;
    const x = feetX + (r() - 0.3) * s * 0.4 + life * S * (0.2 + r() * 0.5);
    const y = gy - Math.sin(life * Math.PI) * S * (0.04 + r() * 0.2);
    ctx.globalAlpha = 1 - life;
    ctx.fillStyle = i % 4 ? '#2a1a3a' : RED.hot;
    ctx.beginPath();
    ctx.arc(x, y, S * (0.003 + r() * 0.007), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // reflection, then the knight
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, gy, w, h - gy);
  ctx.clip();
  ctx.translate(0, gy * 2);
  ctx.scale(1, -1);
  ctx.globalAlpha = 0.3;
  knight(g, hx, hy, a, s, w * 2, gy, { lit: 1, veins: 1, vx: S * 3 });
  ctx.restore();
  knight(g, hx, hy, a, s, w * 2, gy, { lit: 1, veins: 1, vx: S * 3 });
  // the beam leaving the blade, out of frame toward the rival
  const tip: Pt = [hx + Math.cos(a) * s * 0.95, hy + Math.sin(a) * s * 0.95];
  beam(g, tip[0], tip[1], a, 0.5, S * 0.12, w * 1.2, BEAM_RED);
  g.f.shake(S * 0.006);
}

/* close on the rival: braced, the beam pouring off their blade, the red light coming for them */
function shotStrain(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  ctx.fillStyle = '#07030c';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.7;
  drawSprite(ctx, glow(VIOLET.deep, 128), w * 0.6, h * 0.5, S * 2.6, S * 1.8);
  ctx.restore();
  // the red pressing in from the left, closer every frame
  const press = ease.in2(q);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5 + press * 0.4;
  drawSprite(ctx, glow(RED.c, 128), lerp(-w * 0.2, w * 0.15, press), h * 0.48, S * 1.6, S * 1.2);
  ctx.restore();
  const s = S * (g.portrait ? 1.05 : 0.9);
  const jit = S * 0.006;
  const jx = (hash(Math.floor(t * 30)) - 0.5) * jit, jy = (hash(Math.floor(t * 30) + 5) - 0.5) * jit;
  // heels dug in, driven back a little
  const hx = w * 0.4 + press * S * 0.06 + jx, hy = h * 0.5 + jy;
  const a = Math.PI - 0.08;
  const { tip, head } = rival(g, hx, hy, a, s, 0, h * 0.5 + s * 0.52, { lit: 1, vx: S * 6 });
  beam(g, tip[0], tip[1], a, 0.5, S * 0.2, tip[0] + w * 0.2, BEAM_VIOLET);
  // the eyes flare as it gets too much
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.4 + press * 0.6;
  drawSprite(ctx, glow(RIVAL.eye, 128), head[0] - s * 0.03, head[1], S * (0.15 + press * 0.25));
  ctx.restore();
  speedLines(g, tip[0], tip[1], 'rgba(0,0,0,0.55)', 60, 0.3, 1, 52);
  hLines(g, 0.2, '#d9c4ff', 1);
  g.f.shake(S * 0.008);
}

/* the last push: Blue's colour comes up through the red, the contact runs all the way home */
function shotPush(g: G, q: number) {
  const { S } = g;
  const shove = ease.in3(seg(q, 0.12, 0.5));
  const c = lerp(0.27, 1, shove);
  const dis = ease.in2(seg(q, 0.5, 1));
  if (hitQ(0.12)) {
    g.f.shake(S * 0.05);
    g.f.flash(0.5, BLUE.hot);
  }
  if (hitQ(0.5)) {
    g.f.shake(S * 0.08);
    g.f.flash(0.8, '#ffffff');
  }
  const home = q >= 0.5;
  const { D, a, tip, mouth } = duelWide(g, q, c, { fireR: 1, fireV: home ? 0 : 1, step: ease.out3(seg(q, 0.1, 0.5)), blue: seg(q, 0.05, 0.15), dis, meet: home ? 0 : 1 });
  // once it's through, the rival comes apart into ink, blown back along the beam
  if (dis > 0) shockRing(g, mouth[0], mouth[1], seg(q, 0.5, 0.8), S * 1.8, S * 1.8, BLUE.hot);
  void D;
  void a;
  void tip;
}

/* close: the red takes them; the violet blade snaps in two, like Green's once did, and they go to ink */
function shotSnap(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  ctx.fillStyle = '#050208';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.6;
  drawSprite(ctx, glow(RED.deep, 128), w * 0.6, h * 0.46, S * 2.4, S * 1.6);
  ctx.restore();
  const s = S * (g.portrait ? 1.0 : 0.85);
  const hx = w * 0.4, hy = h * 0.52;
  const a = Math.PI + 0.35;
  const snapAt = 0.3;
  const snapped = q >= snapAt;
  const dis = ease.in2(seg(q, 0.35, 1));
  const { tip } = rival(g, hx, hy, a, s, 0, hy + s * 0.52, { lit: 1, snap: snapped ? 0.45 : 1, dissolve: dis, vx: S * 8 });
  // the broken half of the blade, spinning away
  if (snapped) {
    const k = seg(q, snapAt, 1);
    const L = s * 0.95;
    const bx = hx + Math.cos(a) * L * 0.45, by = hy + Math.sin(a) * L * 0.45;
    const fx = bx + k * S * 0.5, fy = by - k * S * 0.6 + k * k * S * 1.2;
    const ra = a + k * 7;
    drawLightLine(ctx, fx, fy, fx + Math.cos(ra) * L * 0.55, fy + Math.sin(ra) * L * 0.55, RIVAL.c, RIVAL.hot, Math.max(1.5, s * 0.016), 1 - k * 0.7);
    if (hitQ(snapAt)) {
      g.f.shake(S * 0.05);
      g.f.flash(0.6, '#ffffff');
    }
  }
  // the red beam coming in from the left over everything
  const by = hy - s * 0.1;
  // (from far off the left edge, so what's on screen is the beam and its tapered head, never a stub)
  beam(g, -w * 0.7, by, 0, 0.5, S * 0.2, lerp(w * 1.15, w * 1.95, ease.in2(q)), BEAM_BLUE);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow(RED.hot, 128), lerp(w * 0.4, w * 0.75, ease.in2(q)), by, S * (0.9 + Math.sin(t * 50) * 0.08));
  ctx.restore();
  speedLines(g, hx, by, 'rgba(0,0,0,0.6)', 60, 0.3, 1, 33);
  void tip;
}

/**
 * The Spark: the thing everyone is fighting over, here a point of white
 * light with a ring around it. It shrinks into a star.
 */
export function drawSpark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, t: number) {
  if (a <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  drawSprite(ctx, glow('#ffd27a', 128), x, y, r * 9);
  drawSprite(ctx, glow('#ffffff', 64), x, y, r * 3);
  // four long rays and four short, turning slowly
  ctx.translate(x, y);
  ctx.rotate(t * 0.15);
  ctx.fillStyle = '#fff6dc';
  for (let i = 0; i < 8; i++) {
    const L = r * (i % 2 ? 2.2 : 5.5), W = r * (i % 2 ? 0.14 : 0.2);
    ctx.save();
    ctx.rotate((i / 8) * TAU);
    ctx.beginPath();
    ctx.moveTo(0, -W);
    ctx.lineTo(L, 0);
    ctx.lineTo(0, W);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = withAlpha('#ffe9b0', 0.6);
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.7, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function spark(g: G, x: number, y: number, r: number, a: number) {
  drawSpark(g.ctx, x, y, r, a, g.t);
}

/* extreme wide: one column of dark light across the sky; where the rival stood, the Spark rises */
function shotColumn(g: G, q: number) {
  const { ctx, w, h, S } = g;
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
  beam(g, w * 0.32, h * 0.74, -1.25, lerp(0.3, 1, q), S * 0.12);
  shockRing(g, w * 0.32, h * 0.74, seg(q, 0, 0.6), S * 1.4, S * 0.15, RED.c);
  // the Spark, let go: up out of the smoke, shrinking to a point
  const up = ease.inOut2(seg(q, 0.25, 1));
  const x = lerp(w * 0.66, w * 0.56, up), y = lerp(h * 0.7, h * 0.22, up);
  spark(g, x, y, S * lerp(0.05, 0.014, up), seg(q, 0.2, 0.35));
  if (hitQ(0.25)) g.f.flash(0.35, '#ffe9b0');
}

/**
 * The beam of darkness: a coloured corona and edges, a black core, spiralling
 * strands. `len` stops it short (against something it is hitting).
 */
function beam(g: G, x: number, y: number, a: number, k: number, widthOverride?: number, len?: number, pal: BeamPal = BEAM_RED) {
  const { ctx, w, h, S, t } = g;
  const grow = ease.out3(seg(k, 0, 0.15));
  const fade = 1 - seg(k, 0.85, 1);
  const W = (widthOverride ?? S * 0.32) * grow * fade;
  if (W <= 0) return;
  const L = len ?? Math.hypot(w, h) * 2;
  if (L <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.globalCompositeOperation = 'lighter';
  const flick = 1 + Math.sin(t * 40) * 0.05;
  // the glow: soft across its width (no hard edges), a soft head where it is stopped
  const soft = (hh: number, col: string, al: number) => {
    const gr = ctx.createLinearGradient(0, -hh / 2, 0, hh / 2);
    gr.addColorStop(0, withAlpha(col, 0));
    gr.addColorStop(0.5, withAlpha(col, al));
    gr.addColorStop(1, withAlpha(col, 0));
    ctx.fillStyle = gr;
    if (len === undefined) ctx.fillRect(0, -hh / 2, L, hh);
    else {
      // fade out lengthwise into the head, so the glow has no square end
      const fl = Math.min(L * 0.5, hh * 0.6), x1 = L - fl;
      ctx.fillRect(0, -hh / 2, x1, hh);
      for (let i = 0; i < 10; i++) {
        ctx.globalAlpha = 1 - (i + 0.5) / 10;
        ctx.fillRect(x1 + (fl * i) / 10, -hh / 2, fl / 10 + 0.5, hh);
      }
      ctx.globalAlpha = al;
      drawSprite(ctx, glow(col, 128), L, 0, hh * 1.1);
      ctx.globalAlpha = 1;
    }
  };
  soft(W * 3.2 * flick, pal.corona, 0.35);
  soft(W * 1.9 * flick, pal.c, 0.7);
  // the edge light and the black core: flaring out of the source, tapering into
  // whatever stops it, so it never reads as a capsule
  const stopped = len !== undefined;
  const prof = (u: number) => {
    const x = u * L;
    const inn = Math.min(1, x / Math.max(1, Math.min(W * 1.4, L * 0.25)));
    const out = stopped ? Math.min(1, (L - x) / Math.max(1, Math.min(W * 1.8, L * 0.25))) : 1;
    // eased so the taper meets the straight body without a corner
    return 1 - (1 - Math.max(0, Math.min(inn, out))) ** 2.4;
  };
  const body = (wd: number) => {
    const n = 120;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) ctx.lineTo((i / n) * L, -prof(i / n) * wd / 2);
    for (let i = n; i >= 0; i--) ctx.lineTo((i / n) * L, prof(i / n) * wd / 2);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = withAlpha(pal.hot, 0.95);
  body(W * 1.14 * flick);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000000';
  body(W * 0.9);
  // strands twisting along it: a long pitch, so they read as a spiral, not a mesh
  const pitch = Math.max(W, S * 0.12) * 2.4;
  ctx.lineWidth = Math.max(1, W * 0.04);
  for (let s = 0; s < 3; s++) {
    ctx.strokeStyle = s % 2 ? withAlpha(pal.strands[0], 0.8) : withAlpha(pal.strands[1], 0.6);
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const xx = (i / 60) * Math.max(0, L - (len !== undefined ? W * 0.5 : 0));
      const yy = Math.sin(xx / pitch - t * 18 + s * 2.1) * W * 0.34 * prof(xx / Math.max(1, L));
      if (i) ctx.lineTo(xx, yy);
      else ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  // the source flare
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow(pal.hot, 128), x, y, Math.min(W, S * 0.3) * 3.5);
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
  // where the rival stood: the broken hilt, stuck in the water, its light going out; and smoke
  ctx.save();
  ctx.globalAlpha = 0.6;
  drawSprite(ctx, glow('#000000', 128), w * 0.72, gy, S * 0.7, S * 0.12);
  for (let i = 0; i < 4; i++) {
    const rise = ((t * 0.15 + i * 0.25) % 1);
    ctx.globalAlpha = 0.3 * (1 - rise);
    drawSprite(ctx, glow('#4a3a5a', 128), w * 0.72 + Math.sin(t + i) * S * 0.05, gy - rise * S * 0.8, S * 0.4, S * 0.3);
  }
  ctx.restore();
  const ha = -Math.PI / 2 + 0.25, hl = S * 0.12;
  const hbx = w * 0.72, hby = gy - S * 0.01;
  ctx.strokeStyle = '#120a1e';
  ctx.lineCap = 'round';
  ctx.lineWidth = S * 0.012;
  ctx.beginPath();
  ctx.moveTo(hbx, hby);
  ctx.lineTo(hbx - Math.cos(ha) * hl * 0.6, hby - Math.sin(ha) * hl * 0.6);
  ctx.stroke();
  const stub = 1 - ease.inOut2(seg(q, 0.1, 0.7));
  if (stub > 0) drawLightLine(ctx, hbx, hby, hbx + Math.cos(ha) * hl * stub, hby + Math.sin(ha) * hl * stub, RIVAL.c, RIVAL.hot, S * 0.006, 0.5 + 0.5 * stub);
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

/* 18. exit: the blade goes into the black water, and the ripple runs out to
 * become the ripple of a tyre through a neon puddle (Night Ride's first shot) */
function shotExit(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const wy = h * 0.62;
  world(g, { x: 0, y: 0.05, z: 1.15 }, { horizon: 0.62 });
  // the blade, straight down into the water
  const drive = ease.in3(seg(q, 0, 0.18));
  const L = h * 0.9;
  const hy = lerp(wy - L * 0.92, wy - L * 0.86, drive);
  blade(g, w / 2, hy, Math.PI / 2, L, 1 - seg(q, 0.3, 0.8), 1);
  if (hitQ(0.18)) g.f.shake(S * 0.025);
  // the frame goes dark around the water; only the rings are left
  const dark = ease.inOut2(seg(q, 0.25, 0.85));
  ctx.fillStyle = `rgba(4,3,10,${dark})`;
  ctx.fillRect(0, 0, w, h);
  // the ripple: the same rings, at the same size, that open Night Ride
  const prx = w * 0.62, pry = h * 0.14;
  const grow = seg(q, 0.18, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    const qq = clamp(grow * (0.35 - k * 0.15));
    if (qq <= 0 || qq >= 1) continue;
    const col = mixHex(RED.c, k ? '#22e6ff' : '#ff2bd6', seg(q, 0.5, 1));
    ctx.strokeStyle = col;
    ctx.globalAlpha = (1 - qq) * 0.8;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(w / 2, wy, prx * ease.out2(qq), pry * ease.out2(qq), 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  void t;
}
