import { drawBolt } from '../core/bolt';
import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, hash, lerp, rng, seg } from '../core/math';
import { drawSprite, glow, withAlpha } from '../core/sprites';
import { C, F, font } from '../core/style';
import { drawBall } from './machine';

/*
 * THE SHOOTING STAR (#10's special move, in the `meteor` hold).
 *
 * Staged after the classic anime meteor shot. #10 is the match's green
 * light-pin, seen close: he rolls the ball under him until it ignites blue, flicks it straight up, and the ball stops dead
 * high above the stadium as a huge blue sphere hung in deep space, with a
 * constellation opening around it. He leaps, spins, and volleys it with the
 * right foot: everything freezes for a beat, the whole constellation is
 * sucked into the ball, it goes off like the start of a universe, and what
 * comes out is a blade of yellow light with a long blue wake, lightning and
 * white orbs, falling out of space toward the goal. The broadcast camera
 * (match.ts) picks it up coming over the stadium and into the net, where its
 * tail turns into one huge stroke of ink.
 *
 * Timing is deliberately uneven: slow, FAST, stop, slow, FAST, FREEZE, then
 * violent acceleration. The pin moves on twos; light, particles and the
 * camera run on ones.
 */

type G = { f: Frame; ctx: CanvasRenderingContext2D; w: number; h: number; S: number; t: number };
type Shot = { name: string; dur: number; draw: (g: G, q: number) => void };

const SHOTS: Shot[] = [
  { name: 'control', dur: 1.1, draw: shotControl },
  { name: 'ignite', dur: 0.75, draw: shotIgnite },
  { name: 'launch', dur: 0.7, draw: shotLaunch },
  { name: 'sphere', dur: 1.25, draw: shotSphere },
  { name: 'leap', dur: 1.1, draw: shotLeap },
  { name: 'contact', dur: 0.6, draw: shotContact },
  { name: 'collapse', dur: 0.6, draw: shotCollapse },
  { name: 'bang', dur: 0.35, draw: shotBang },
  { name: 'blade', dur: 1.15, draw: shotBlade },
];
const TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0);

/** dev: the hold progress at which shot `name` is at its own progress q */
export function meteorShotP(name: string, q = 0.5): number {
  let acc = 0;
  for (const s of SHOTS) {
    if (s.name === name) return (acc + s.dur * clamp(q)) / TOTAL;
    acc += s.dur;
  }
  return 0;
}

let lastShot = -1, lastQ = 0;
let hitQ: (x: number) => boolean = () => false;

export function drawMeteor(f: Frame, p: number) {
  const { ctx, w, h, t } = f;
  const g: G = { f, ctx, w, h, S: Math.min(w, h), t };
  let acc = 0, i = 0;
  const at = clamp(p) * TOTAL;
  while (i < SHOTS.length - 1 && acc + SHOTS[i].dur <= at) acc += SHOTS[i++].dur;
  const q = clamp((at - acc) / SHOTS[i].dur);
  const prevQ = i === lastShot ? lastQ : -1;
  if (i !== lastShot && lastShot >= 0 && Math.abs(i - lastShot) === 1 && !f.reduced) f.shake(g.S * 0.008);
  lastShot = i;
  lastQ = q;
  hitQ = (x: number) => prevQ >= 0 && prevQ < x && q >= x;
  ctx.save();
  SHOTS[i].draw(g, q);
  ctx.restore();
  // a frame of overexposure on every hard cut
  if (i > 0 && q < 0.05) {
    ctx.fillStyle = `rgba(220,240,255,${0.5 * (1 - q / 0.05)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

/* ============================================================= palette */

const K = {
  white: '#ffffff',
  cyan: '#bdf4ff',
  blue: '#35c8ff',
  deep: '#1658e8',
  yellow: '#ffe641',
  yellowHot: '#fff8a6',
};
const BOLT_PAL = { core: '#ffffff', hot: K.cyan, c: K.blue, deep: K.deep };

/* ============================================================== #10 */

/*
 * #10 is the same player the match shows from the broadcast camera: a pin of
 * green light with a glowing head. Up close he stays that: a capsule of light
 * with a white-hot core. His "leg" is the whole pin, swung from the head like
 * a pendulum, which is what makes the kicks read at a glance.
 */
const GREEN = C.green, GREEN_HOT = C.greenHot;

/** the foot of a pin hung from `head`, length H, swung by `ang` (0 = straight down, + = forward/right) */
function footOf(head: Pt, H: number, ang: number): Pt {
  return [head[0] + Math.sin(ang) * H, head[1] + Math.cos(ang) * H];
}

/** the pin: head at `head`, foot at `foot`; ink = a dark silhouette for white frames */
function drawPin(ctx: CanvasRenderingContext2D, head: Pt, foot: Pt, H: number, t: number, ink = false, number = true, width = 0) {
  const wd = width || H * 0.2, hr = H * 0.15;
  const dx = foot[0] - head[0], dy = foot[1] - head[1], L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  // the body stops a little short of the head, so the head reads as its own orb
  const neck: Pt = [head[0] + ux * hr * 1.35, head[1] + uy * hr * 1.35];
  const cap = (w2: number, col: string) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(neck[0], neck[1]);
    ctx.lineTo(foot[0], foot[1]);
    ctx.stroke();
  };
  ctx.save();
  if (ink) {
    cap(wd * 1.18, GREEN);
    cap(wd, '#07140a');
    ctx.fillStyle = '#07140a';
    ctx.beginPath();
    ctx.arc(head[0], head[1], hr, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }
  const A = ctx.globalAlpha;
  const fl = 0.9 + 0.1 * Math.sin(t * 31) * Math.sin(t * 17);
  // a soft halo along the body
  const mid: Pt = [(neck[0] + foot[0]) / 2, (neck[1] + foot[1]) / 2];
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = A * 0.3 * fl;
  drawSprite(ctx, glow(GREEN, 128), mid[0], mid[1], L * 1.05, L * 1.05);
  ctx.globalAlpha = A;
  cap(wd * 1.6, withAlpha(GREEN, 0.16));
  // the solid body, then a hot core down its middle
  ctx.globalCompositeOperation = 'source-over';
  cap(wd, '#4fc23a');
  cap(wd * 0.62, GREEN);
  ctx.globalCompositeOperation = 'lighter';
  cap(wd * 0.22, withAlpha(GREEN_HOT, 0.9));
  // the head
  ctx.globalAlpha = A * 0.7 * fl;
  drawSprite(ctx, glow(GREEN, 128), head[0], head[1], hr * 4.5);
  ctx.globalAlpha = A;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(head[0], head[1], hr, 0, TAU);
  ctx.fill();
  ctx.fillStyle = GREEN_HOT;
  ctx.beginPath();
  ctx.arc(head[0] - hr * 0.2, head[1] - hr * 0.2, hr * 0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (number) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = font(Math.max(9, hr * 0.95), F.display);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('10', head[0], head[1] - hr * 1.45);
    ctx.restore();
  }
}

/** the ring of light the pin stands in, on the grass */
function pinRing(ctx: CanvasRenderingContext2D, x: number, y: number, H: number, a = 1) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y, H * 0.36, H * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow(GREEN, 128), x, y, H * 1.2, H * 0.32);
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = Math.max(1.5, H * 0.03);
  ctx.beginPath();
  ctx.ellipse(x, y, H * 0.3, H * 0.085, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/** a swing smear: a fan of light between two angles of a pin hung from `head` */
function smear(ctx: CanvasRenderingContext2D, head: Pt, H: number, a0: number, a1: number, col = GREEN, a = 1) {
  if (Math.abs(a1 - a0) < 0.02 || a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const n = 14;
  for (let i = 0; i < n; i++) {
    const k0 = i / n, k1 = (i + 1) / n;
    const b0 = lerp(a0, a1, k0), b1 = lerp(a0, a1, k1);
    ctx.globalAlpha = a * 0.55 * k1 * k1;
    ctx.fillStyle = col;
    ctx.beginPath();
    const p0 = footOf(head, H * 0.35, b0), p1 = footOf(head, H * 1.08, b0);
    const p2 = footOf(head, H * 1.08, b1), p3 = footOf(head, H * 0.35, b1);
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.fill();
  }
  ctx.restore();
}

/** a soft tapered tail behind a moving light, from (x, y) back along `ang` */
function tail(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, wd: number, len: number, col: string, a = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  for (const [s, al] of [[1, 0.45], [0.5, 0.8], [0.18, 1]] as const) {
    const gr = ctx.createLinearGradient(0, 0, -len, 0);
    gr.addColorStop(0, withAlpha(s < 0.3 ? '#ffffff' : col, al));
    gr.addColorStop(1, withAlpha(col, 0));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(0, -wd * s / 2);
    ctx.quadraticCurveTo(-len * 0.3, -wd * s * 0.4, -len, 0);
    ctx.quadraticCurveTo(-len * 0.3, wd * s * 0.4, 0, wd * s / 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ========================================================== backdrops */

function stadium(g: G, horizon: number, tilt = 0) {
  const { ctx, w, h, S, t } = g;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#02040e');
  sky.addColorStop(1, '#0d1838');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // the stands: a dark band full of tiny lights, some of them camera flashes
  const sTop = horizon - S * 0.18;
  ctx.fillStyle = '#080a14';
  ctx.fillRect(0, sTop, w, horizon - sTop);
  const r = rng(31);
  for (let i = 0; i < 140; i++) {
    const x = r() * w, y = sTop + r() * (horizon - sTop);
    const fl = hash(i * 3.7 + Math.floor(t * 8)) > 0.97;
    ctx.fillStyle = fl ? '#ffffff' : withAlpha(['#2f5bff', '#a6f03a', '#d8e0ff'][i % 3], 0.35 + r() * 0.3);
    ctx.fillRect(x, y, fl ? 2.5 : 1.5, fl ? 2.5 : 1.5);
  }
  // floodlights
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const fx of [0.12, 0.88]) {
    drawSprite(ctx, glow('#dfe9ff', 128), w * fx, sTop - S * 0.25 - tilt, S * 0.7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w * fx - S * 0.03, sTop - S * 0.26 - tilt, S * 0.06, S * 0.02);
  }
  ctx.restore();
  // the pitch, mown in stripes running away from us
  const gr = ctx.createLinearGradient(0, horizon, 0, h);
  gr.addColorStop(0, '#123d22');
  gr.addColorStop(1, '#1c6136');
  ctx.fillStyle = gr;
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 8; i++) {
    const y0 = horizon + (h - horizon) * (i / 8) ** 1.6, y1 = horizon + (h - horizon) * ((i + 0.5) / 8) ** 1.6;
    ctx.fillRect(0, y0, w, y1 - y0);
  }
}

let starCache: { key: string; pts: [number, number, number, number][] } | null = null;
function space(g: G, ox = 0, oy = 0, a = 1) {
  const { ctx, w, h, S, t } = g;
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  const gr = ctx.createLinearGradient(0, 0, w * 0.3, h);
  gr.addColorStop(0, '#01020a');
  gr.addColorStop(0.6, '#050b2a');
  gr.addColorStop(1, '#0a1240');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, w, h);
  // nebula
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.32 * a;
  drawSprite(ctx, glow(K.deep, 256), w * 0.3 + ox * 0.2, h * 0.35 + oy * 0.2, S * 1.6, S * 1.1);
  ctx.globalAlpha = 0.22 * a;
  drawSprite(ctx, glow('#7a28ff', 256), w * 0.75 + ox * 0.25, h * 0.6 + oy * 0.25, S * 1.3, S * 0.9);
  ctx.globalAlpha = 0.12 * a;
  drawSprite(ctx, glow('#ff4fd8', 256), w * 0.55 + ox * 0.3, h * 0.2 + oy * 0.3, S * 0.9);
  // stars in three depths
  const key = `${w}x${h}`;
  if (starCache?.key !== key) {
    const r = rng(77);
    starCache = { key, pts: Array.from({ length: 220 }, () => [r() * 1.4 - 0.2, r() * 1.4 - 0.2, r(), r()] as [number, number, number, number]) };
  }
  for (const [sx, sy, depth, ph] of starCache.pts) {
    const x = ((sx * w + ox * depth) % (w * 1.4) + w * 1.4) % (w * 1.4) - w * 0.2;
    const y = ((sy * h + oy * depth) % (h * 1.4) + h * 1.4) % (h * 1.4) - h * 0.2;
    const tw = 0.55 + 0.45 * Math.sin(t * (1 + ph * 3) + ph * 20);
    ctx.globalAlpha = a * (0.3 + 0.7 * depth) * tw;
    ctx.fillStyle = depth > 0.85 ? K.cyan : '#ffffff';
    const s = 0.6 + depth * 1.8;
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

/** the energy around the ball: soft glows plus a ring of flickering flame-spikes */
function aura(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, k: number, inner = K.cyan, outer = K.blue) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = k;
  drawSprite(ctx, glow(K.deep, 128), x, y, r * 7);
  drawSprite(ctx, glow(outer, 128), x, y, r * 4);
  drawSprite(ctx, glow(inner, 64), x, y, r * 2.4);
  // flame spikes
  const n = 18;
  ctx.fillStyle = withAlpha(outer, 0.55);
  ctx.beginPath();
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * TAU + t * 0.8;
    const sp = i % 2 ? 1.25 : 1.75 + 0.55 * Math.sin(t * 13 + i * 2.1) * Math.sin(t * 7 + i);
    const rr = r * sp * (0.85 + 0.15 * k);
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** a four-point star glint */
function glint(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col = '#ffffff') {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** the constellation around the sphere: stars on rings, joined into a figure; k scales it in/out */
function constellation(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, k: number, t: number, a: number) {
  if (a <= 0) return;
  const r = rng(12);
  const pts: Pt[] = [];
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * TAU + r() * 0.3 + t * 0.05;
    const rr = R * (1.35 + r() * 1.4) * k;
    pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.8]);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a * 0.55;
  ctx.strokeStyle = K.cyan;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length], s = pts[(i + 5) % pts.length];
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    if (i % 3 === 0) {
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(s[0], s[1]);
    }
  });
  ctx.stroke();
  ctx.globalAlpha = a;
  pts.forEach((p, i) => {
    const tw = 0.7 + 0.3 * Math.sin(t * 5 + i);
    drawSprite(ctx, glow(K.blue, 64), p[0], p[1], R * 0.35 * tw);
    glint(ctx, p[0], p[1], R * 0.09 * tw);
  });
  ctx.restore();
}

/* =============================================================== shots */

/* 1. low three-quarter: #10 rocks the ball back and forth under him; blue sparks begin */
function shotControl(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const hz = h * 0.5;
  const push = 1 + ease.inOut2(q) * 0.08;
  ctx.translate(w / 2, h * 0.8);
  ctx.scale(push, push);
  ctx.translate(-w / 2, -h * 0.8);
  stadium(g, hz);
  const H = Math.min(h * 0.3, w * 0.7);
  const gy = h * 0.82;
  // on twos: the swing steps every other frame
  const tw = Math.floor(t * 12) / 12;
  const sw = Math.sin(tw * 4.2);
  const ang = sw * 0.22;
  const head: Pt = [w * 0.46 - sw * S * 0.01, gy - H * 0.97];
  const foot = footOf(head, H, ang);
  pinRing(ctx, w * 0.46, gy, H);
  // the ball, dragged under the foot, turning
  const br = H * 0.09;
  const bx = foot[0] + br * 0.9, by = gy - br;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(bx, gy, br * 1.3, br * 0.3, 0, 0, TAU);
  ctx.fill();
  const spark = seg(q, 0.35, 1);
  aura(ctx, bx, by, br, t, spark * 0.7);
  drawPin(ctx, head, foot, H, t);
  drawBall(ctx, bx, by, br, bx / br, t, 1);
  // sparks crackling up off the ball
  if (spark > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const life = (hash(i * 3.1) + t * 1.6) % 1;
      const a = -Math.PI / 2 + (hash(i) - 0.5) * 2.4;
      const d = br * (1.2 + life * 4 * spark);
      ctx.globalAlpha = (1 - life) * spark;
      glint(ctx, bx + Math.cos(a) * d, by + Math.sin(a) * d, S * 0.012 * (1 - life), i % 3 ? K.cyan : '#ffffff');
    }
    ctx.restore();
  }
}

/* 2. close on the ball under his foot: it ignites blue, the grass lit around it */
function shotIgnite(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const gy = h * 0.7;
  ctx.fillStyle = '#02040c';
  ctx.fillRect(0, 0, w, h);
  const gr = ctx.createLinearGradient(0, gy - h * 0.1, 0, h);
  gr.addColorStop(0, '#0b2a17');
  gr.addColorStop(1, '#174f2c');
  ctx.fillStyle = gr;
  ctx.fillRect(0, gy - h * 0.02, w, h);
  const br = S * 0.17;
  const bx = w * 0.5, by = gy - br;
  const k = ease.out3(seg(q, 0, 0.6));
  // the ground lights up
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6 * k;
  drawSprite(ctx, glow(K.blue, 128), bx, gy, S * 1.6 * (0.6 + k * 0.4), S * 0.35);
  ctx.globalAlpha = 0.5 * (1 - k * 0.5);
  drawSprite(ctx, glow(GREEN, 128), bx - br * 0.3, gy, S * 1.2, S * 0.25);
  ctx.restore();
  // grass blades in silhouette, bending away from the heat
  ctx.strokeStyle = '#03140a';
  ctx.lineWidth = 2;
  const r = rng(5);
  for (let i = 0; i < 70; i++) {
    const x = r() * w, len = S * (0.02 + r() * 0.04);
    const lean = (x - bx) / w * 0.6 * k + Math.sin(t * 3 + i) * 0.05;
    ctx.beginPath();
    ctx.moveTo(x, gy + r() * S * 0.05);
    ctx.lineTo(x + lean * len * 2, gy - len);
    ctx.stroke();
  }
  aura(ctx, bx, by, br, t, k);
  drawBall(ctx, bx, by, br, t * (2 + k * 9), t, 1);
  // the end of the pin rests on top of the ball, rolling it, and lifts away at the end
  const lift = ease.in2(seg(q, 0.78, 1)) * h * 0.5;
  const H = br * 7;
  const foot: Pt = [bx - br * 0.35 + Math.sin(t * 6) * br * 0.12, by - br * 1.05 - lift];
  drawPin(ctx, [foot[0] - H * 0.25, foot[1] - H], foot, H, t, false, false, br * 0.9);
  // a ring of sparks pumping out
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 30; i++) {
    const life = (hash(i * 7.7) + t * 2.2) % 1;
    const a = hash(i * 1.3) * TAU;
    const d = br * (1.2 + life * 3);
    ctx.globalAlpha = (1 - life) * k;
    glint(ctx, bx + Math.cos(a) * d, by + Math.sin(a) * d * 0.7, S * 0.012 * (1 - life), i % 4 ? K.cyan : '#ffffff');
  }
  ctx.restore();
  if (hitQ(0.3)) g.f.shake(S * 0.01);
}

/* 3. the pin swings back and flicks the ball straight up; the camera tilts after it */
function shotLaunch(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const kick = 0.42;
  // the tilt: after the kick the whole stadium drops out of frame as we chase the ball up
  const tilt = ease.in3(seg(q, kick, 1)) * h * 1.2;
  ctx.save();
  ctx.translate(0, tilt);
  stadium(g, h * 0.55, 0);
  const H = Math.min(h * 0.3, w * 0.7);
  const gy = h * 0.84;
  const head: Pt = [w * 0.4, gy - H * 0.97];
  // windup (slow), then the flick (fast), swinging through and up
  const angAt = (x: number) => (x < kick ? lerp(0.1, -0.95, ease.inOut2(seg(x, 0, kick))) : lerp(-0.95, 1.05, ease.out5(seg(x, kick, kick + 0.14))));
  const ang = angAt(q);
  pinRing(ctx, w * 0.4, gy, H);
  if (q >= kick && q < kick + 0.3) smear(ctx, head, H, angAt(Math.max(kick, q - 0.08)), ang, GREEN, 1 - seg(q, kick + 0.1, kick + 0.3));
  drawPin(ctx, head, footOf(head, H, ang), H, t);
  const br = H * 0.09;
  const ball0 = footOf(head, H, 0.3);
  const bx0 = ball0[0] + br * 0.3, by0 = gy - br;
  const up = ease.in2(seg(q, kick, 1));
  const bx = bx0 - up * w * 0.05, by = lerp(by0, -h * 1.6, up);
  if (q < kick) {
    aura(ctx, bx0, by0, br, t, 0.8);
    drawBall(ctx, bx0, by0, br, t * 4, t, 1);
  }
  ctx.restore();
  // the ball, out ahead of the camera, with a soft tail
  const sy = by + tilt;
  if (q >= kick) {
    tail(ctx, bx, sy, Math.PI / 2 - 0.08, br * 2.6, h * 0.55, K.blue);
    aura(ctx, bx, sy, br, t, 1);
    drawBall(ctx, bx, sy, br, t * 20, t, 1 + up * 0.5);
    // speed lines down the frame
    ctx.save();
    ctx.globalAlpha = 0.5 * up;
    ctx.strokeStyle = '#dbe9ff';
    for (let i = 0; i < 26; i++) {
      const x = hash(i * 2.3) * w, y = ((hash(i * 5.1) + t * 3) % 1) * h;
      ctx.lineWidth = 1 + hash(i) * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + S * 0.25);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (hitQ(kick)) {
    g.f.shake(S * 0.03);
    g.f.flash(0.35, K.cyan);
  }
}

/* 4. extreme wide: high above the stadium the ball stops dead, and is a huge blue sphere in space */
function shotSphere(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  space(g, -q * S * 0.06, q * S * 0.03, 1);
  // the stadium, tiny and far below, a bowl of light
  const sx = w * 0.5, sy = h * 1.02;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6;
  drawSprite(ctx, glow('#9fc4ff', 128), sx, sy, S * 1.2, S * 0.35);
  ctx.restore();
  ctx.fillStyle = '#04060f';
  ctx.beginPath();
  ctx.ellipse(sx, sy + S * 0.05, S * 0.6, S * 0.14, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = '#1c6136';
  ctx.beginPath();
  ctx.ellipse(sx, sy + S * 0.02, S * 0.4, S * 0.07, 0, Math.PI, TAU);
  ctx.fill();
  // #10, a speck of green light on the pitch, looking up
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow(GREEN, 64), sx, sy - S * 0.03, S * 0.08);
  ctx.fillStyle = GREEN_HOT;
  ctx.fillRect(sx - 1.5, sy - S * 0.045, 3, S * 0.03);
  ctx.restore();
  // the ball arrives from below and stops dead, then the sphere opens around it
  const cx = w * 0.5, cy = h * 0.36;
  const arrive = ease.out5(seg(q, 0, 0.18));
  const by = lerp(h * 1.1, cy, arrive);
  if (arrive < 1) tail(ctx, cx, by, Math.PI / 2 * -1 + Math.PI, S * 0.07, S * 0.5 * (1 - arrive), K.blue);
  const open = ease.out3(seg(q, 0.15, 0.55));
  const R = S * 0.3 * open;
  if (R > 1) {
    const breathe = 1 + Math.sin(t * 2.2) * 0.015;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glow(K.deep, 256), cx, cy, R * 4.2);
    drawSprite(ctx, glow(K.blue, 256), cx, cy, R * 2.6 * breathe);
    const sph = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.05, cx, cy, R * breathe);
    sph.addColorStop(0, 'rgba(235,252,255,0.95)');
    sph.addColorStop(0.3, 'rgba(120,215,255,0.8)');
    sph.addColorStop(0.75, 'rgba(30,110,240,0.5)');
    sph.addColorStop(0.95, 'rgba(60,160,255,0.55)');
    sph.addColorStop(1, 'rgba(20,80,230,0)');
    ctx.fillStyle = sph;
    ctx.beginPath();
    ctx.arc(cx, cy, R * breathe, 0, TAU);
    ctx.fill();
    // a crisp rim of light along the top-left edge
    ctx.strokeStyle = withAlpha(K.cyan, 0.7);
    ctx.lineWidth = Math.max(1.5, R * 0.025);
    ctx.beginPath();
    ctx.arc(cx, cy, R * breathe * 0.97, Math.PI * 0.95, Math.PI * 1.7);
    ctx.stroke();
    ctx.restore();
  }
  constellation(ctx, cx, cy, S * 0.3, ease.out3(seg(q, 0.3, 0.9)), t, seg(q, 0.3, 0.6));
  const br = S * 0.035;
  aura(ctx, cx, by, br, t, 1);
  drawBall(ctx, cx, by, br, t * 2, t, 1);
  if (hitQ(0.18)) g.f.shake(S * 0.02);
}

/* 5. he leaps after it, spinning end over end, a wheel of green light among the stars */
function shotLeap(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const orbit = ease.inOut2(q);
  space(g, orbit * S * 0.9, -orbit * S * 0.5, 1);
  // the sphere, huge, upper right
  const scx = w * 0.82, scy = h * 0.12;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow(K.blue, 256), scx, scy, S * 1.6);
  ctx.restore();
  constellation(ctx, scx, scy, S * 0.3, 1, t, 0.8);
  // the climb: diagonally up toward the ball, two full turns on the way
  const k = ease.out2(q);
  const H = Math.min(h * 0.3, w * 0.7);
  const x = lerp(w * 0.12, w * 0.5, k), y = lerp(h * 1.0, h * 0.44, k);
  const tail0 = [lerp(w * 0.12, w * 0.5, ease.out2(Math.max(0, q - 0.25))), lerp(h * 1.0, h * 0.44, ease.out2(Math.max(0, q - 0.25)))];
  tail(ctx, x, y, Math.atan2(y - tail0[1], x - tail0[0]), H * 0.5, Math.hypot(x - tail0[0], y - tail0[1]) + H * 0.3, GREEN, 0.7);
  // on twos for the pin, ones for the light
  const stepQ = Math.floor(q * 24) / 24;
  const spinAt = (s: number) => ease.inOut2(seg(s, 0.05, 0.85)) * TAU * 2 + Math.PI * 0.75;
  const spin = spinAt(stepQ);
  const ends = (a: number, ox = 0, oy = 0): [Pt, Pt] => [
    [x + ox - Math.sin(a) * H * 0.5, y + oy - Math.cos(a) * H * 0.5],
    [x + ox + Math.sin(a) * H * 0.5, y + oy + Math.cos(a) * H * 0.5],
  ];
  // the wheel: a disc of light swept by the spin
  const sweeping = stepQ > 0.08 && stepQ < 0.85;
  if (sweeping) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    drawSprite(ctx, glow(GREEN, 128), x, y, H * 1.6);
    ctx.strokeStyle = withAlpha(GREEN_HOT, 0.8);
    ctx.lineWidth = S * 0.01;
    ctx.beginPath();
    ctx.arc(x, y, H * 0.52, -spin - Math.PI / 2 - 1.6, -spin - Math.PI / 2);
    ctx.stroke();
    ctx.restore();
    // ghosts of the last few angles
    for (let i = 3; i >= 1; i--) {
      const [hd, ft] = ends(spinAt(stepQ - i * 0.02));
      ctx.save();
      ctx.globalAlpha = 0.22 * (1 - i / 4);
      drawPin(ctx, hd, ft, H, t, false, false);
      ctx.restore();
    }
  }
  const [hd, ft] = ends(spin);
  drawPin(ctx, hd, ft, H, t, false, false);
  // the ball, waiting above
  const br = S * 0.04;
  aura(ctx, w * 0.72, h * 0.18, br, t, 1);
  drawBall(ctx, w * 0.72, h * 0.18, br, t * 2, t, 1);
}

/* 6. contact: the pin swings through the ball, near-white frame; everything holds, then lets go */
function shotContact(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const hold = 0.7;
  const release = ease.out3(seg(q, hold, 1));
  const cx = w * 0.52, cy = h * 0.44;
  ctx.fillStyle = '#eef8ff';
  ctx.fillRect(0, 0, w, h);
  // the energy at the contact, growing through the hold: a soft blue bloom, not a disc
  const grow = seg(q, 0, hold);
  const br = S * 0.12;
  const bR = br * (2.2 + grow * 2.4 + release * 3);
  const bl = ctx.createRadialGradient(cx, cy, br * 0.8, cx, cy, bR);
  bl.addColorStop(0, 'rgba(22,88,232,0.95)');
  bl.addColorStop(0.35, 'rgba(53,200,255,0.6)');
  bl.addColorStop(1, 'rgba(189,244,255,0)');
  ctx.fillStyle = bl;
  ctx.fillRect(0, 0, w, h);
  // radial lines from the contact, ink on white, clear of the ball
  ctx.strokeStyle = 'rgba(10,20,50,0.85)';
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * TAU + hash(i) * 0.08;
    const r0 = S * (0.4 + hash(i * 3) * 0.25) + release * S * 0.3;
    ctx.lineWidth = 1 + hash(i * 7) * 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * S * 2, cy + Math.sin(a) * S * 2);
    ctx.stroke();
  }
  // during the hold only the light grows; the frame jitters by a pixel or two
  const jit = q < hold ? 1.5 : 0;
  ctx.save();
  ctx.translate((hash(Math.floor(t * 30)) - 0.5) * jit * 2, (hash(Math.floor(t * 30) + 4) - 0.5) * jit * 2);
  // the pin comes in from the lower left, a dark silhouette against the white, and follows through
  const H = S * 1.1;
  const dir = lerp(-2.35, -2.75, release); // angle from the foot back to the head
  const foot: Pt = [cx - br * 0.85 + release * br * 0.6, cy + br * 0.55 - release * br * 0.5];
  const hd: Pt = [foot[0] + Math.cos(dir) * H, foot[1] + Math.sin(dir) * -H];
  drawPin(ctx, hd, foot, H, t, true, false);
  // shock rings pumping out of the contact while time holds
  if (q < hold) {
    ctx.strokeStyle = 'rgba(22,88,232,0.55)';
    for (let i = 0; i < 2; i++) {
      const life = (q * 3.5 + i * 0.5) % 1;
      ctx.lineWidth = S * 0.012 * (1 - life);
      ctx.beginPath();
      ctx.arc(cx, cy, br * (1.1 + life * 2.6), 0, TAU);
      ctx.stroke();
    }
  }
  // the ball, flattened against the foot, then springing off
  const sq = q < hold ? 0.82 : lerp(0.82, 1.15, release);
  ctx.save();
  ctx.translate(cx + release * S * 0.25, cy - release * S * 0.15);
  ctx.rotate(-0.6);
  ctx.scale(1 / sq, sq);
  drawBall(ctx, 0, 0, br, 0.4 + release * 3, t, 1);
  ctx.restore();
  ctx.restore();
  if (hitQ(0.02)) g.f.shake(S * 0.05);
  if (hitQ(hold)) {
    g.f.shake(S * 0.06);
    g.f.flash(0.5, '#ffffff');
  }
}

/* 7. the constellation and the sphere are pulled into the ball: radial streaks, everything rushing in */
function shotCollapse(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  space(g, 0, 0, 1);
  const cx = w * 0.55, cy = h * 0.42;
  const k = ease.in3(q);
  // the sphere shrinking into the point
  const R = S * 0.45 * (1 - k);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (R > 1) {
    ctx.globalAlpha = 0.8;
    drawSprite(ctx, glow(K.blue, 256), cx, cy, R * 3.2);
  }
  // streaks pointing in, moving in
  for (let i = 0; i < 90; i++) {
    const a = hash(i * 1.7) * TAU;
    const life = (hash(i * 3.3) + q * 2.2) % 1;
    const d0 = S * (0.15 + (1 - life) * 1.1) * (1 - k * 0.5);
    const d1 = d0 + S * (0.12 + hash(i) * 0.25);
    ctx.globalAlpha = 0.25 + 0.6 * life;
    ctx.strokeStyle = i % 4 === 0 ? K.yellowHot : i % 2 ? K.cyan : '#ffffff';
    ctx.lineWidth = 1 + hash(i * 9) * 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0);
    ctx.lineTo(cx + Math.cos(a) * d1, cy + Math.sin(a) * d1);
    ctx.stroke();
  }
  ctx.restore();
  constellation(ctx, cx, cy, S * 0.3, 1 - k * 0.95, t, 1 - seg(q, 0.7, 1));
  // the ball at the centre, getting brighter than anything
  const br = S * 0.035;
  aura(ctx, cx, cy, br * (1 + k * 1.5), t, 1, '#ffffff', K.cyan);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow('#ffffff', 128), cx, cy, br * (4 + k * 14));
  ctx.restore();
  if (hitQ(0.5)) g.f.shake(S * 0.015);
}

/* 8. it goes off: a white-yellow explosion like the first instant of a universe */
function shotBang(g: G, q: number) {
  const { ctx, w, h, S } = g;
  const cx = w * 0.55, cy = h * 0.42;
  const k = ease.out3(q);
  ctx.fillStyle = q < 0.25 ? '#ffffff' : '#fffbe0';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  // rays, then a ring blowing outward
  const rr = S * (0.2 + k * 2.2);
  ctx.globalAlpha = 1 - seg(q, 0.4, 1);
  ctx.fillStyle = '#ffd43a';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU + (i % 2) * 0.05;
    const sp = 0.035 + (i % 3) * 0.02;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - sp) * rr * 1.5, cy + Math.sin(a - sp) * rr * 1.5);
    ctx.lineTo(cx + Math.cos(a + sp) * rr * 1.5, cy + Math.sin(a + sp) * rr * 1.5);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = withAlpha('#ffb300', 1 - q);
  ctx.lineWidth = S * 0.03 * (1 - q);
  ctx.beginPath();
  ctx.arc(cx, cy, rr * 0.6, 0, TAU);
  ctx.stroke();
  ctx.restore();
  if (hitQ(0.01)) {
    g.f.shake(S * 0.08);
    g.f.flash(0.8, '#ffffff');
  }
}

/** the finished shot: a tiny white core, a big blade of yellow light, a long tapering blue wake */
export function drawBlade(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, W: number, len: number, t: number, a = 1) {
  if (a <= 0 || W <= 0.5) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  // the wake: three layers, wide and blue to thin and white
  const wake = (wd: number, c0: string, c1: string) => {
    const gr = ctx.createLinearGradient(0, 0, -len, 0);
    gr.addColorStop(0, c0);
    gr.addColorStop(1, c1);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(0, -wd / 2);
    ctx.quadraticCurveTo(-len * 0.4, -wd * 0.45, -len, 0);
    ctx.quadraticCurveTo(-len * 0.4, wd * 0.45, 0, wd / 2);
    ctx.closePath();
    ctx.fill();
  };
  wake(W * 3.2, withAlpha(K.deep, 0.5), withAlpha(K.deep, 0));
  wake(W * 1.9, withAlpha(K.blue, 0.75), withAlpha(K.blue, 0));
  wake(W * 0.9, withAlpha(K.yellow, 0.9), withAlpha(K.yellow, 0));
  wake(W * 0.3, 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
  // lightning crawling along the wake
  for (let i = 0; i < 3; i++) {
    const off = (i - 1) * W * 0.5;
    drawBolt(ctx, [[0, off * 0.3], [-len * 0.3, off], [-len * 0.6, off * 1.4], [-len * 0.85, off * 0.6]], t, { width: Math.max(1, W * 0.05), amp: W * 0.35, seed: i * 7 + 3, alpha: 0.8, branches: 2, pal: BOLT_PAL });
  }
  // white orbs sliding back along it
  for (let i = 0; i < 9; i++) {
    const life = (hash(i * 4.1) + t * 1.8) % 1;
    const ox = -len * (0.05 + life * 0.8), oy = (hash(i * 2.7) - 0.5) * W * 2.2 * (0.4 + life);
    const r = W * (0.14 + hash(i) * 0.12) * (1 - life * 0.6);
    drawSprite(ctx, glow('#ffffff', 64), ox, oy, r * 5);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, TAU);
    ctx.fill();
  }
  // the head: a pointed blade of yellow with a white-hot inside
  drawSprite(ctx, glow(K.yellow, 128), W * 0.2, 0, W * 5);
  const head = (sc: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(W * 1.7 * sc, 0);
    ctx.quadraticCurveTo(W * 0.3 * sc, -W * 0.8 * sc, -W * 1.3 * sc, -W * 0.25 * sc);
    ctx.lineTo(-W * 0.9 * sc, 0);
    ctx.lineTo(-W * 1.3 * sc, W * 0.25 * sc);
    ctx.quadraticCurveTo(W * 0.3 * sc, W * 0.8 * sc, W * 1.7 * sc, 0);
    ctx.fill();
  };
  head(1, withAlpha(K.yellow, 0.9));
  head(0.62, K.yellowHot);
  head(0.3, '#ffffff');
  // the tiny white core: the ball itself
  drawSprite(ctx, glow('#ffffff', 64), W * 0.25, 0, W * 1.6);
  ctx.restore();
}

/* 9. the meteor falls out of space toward the stadium, tail filling the sky */
function shotBlade(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  space(g, q * S * 0.4, -q * S * 0.6, 1);
  // the stadium glow rising into view below as we fall toward it
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = seg(q, 0.3, 1) * 0.9;
  drawSprite(ctx, glow('#cfe0ff', 256), w * 0.8, h * lerp(1.4, 0.95, q), S * lerp(0.6, 1.6, q), S * lerp(0.2, 0.6, q));
  ctx.restore();
  // perspective: from small and far upper-left to filling the lower right
  const k = ease.in2(q);
  const x = lerp(w * 0.2, w * 0.78, k), y = lerp(h * 0.12, h * 0.78, k);
  const ang = Math.atan2(h * 0.66, w * 0.58);
  const W = S * lerp(0.05, 0.16, k);
  drawBlade(ctx, x, y, ang, W, S * lerp(0.9, 2.2, k), t);
  // speed lines along the direction of travel
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.35 * k;
  ctx.strokeStyle = '#e8f6ff';
  const dx = Math.cos(ang), dy = Math.sin(ang);
  for (let i = 0; i < 30; i++) {
    const lx = hash(i * 1.9) * w * 1.4 - w * 0.2, ly = ((hash(i * 4.3) + t * 2.5) % 1) * h * 1.4 - h * 0.2;
    const L = S * (0.15 + hash(i) * 0.35);
    ctx.lineWidth = 1 + hash(i * 3) * 2;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + dx * L, ly + dy * L);
    ctx.stroke();
  }
  ctx.restore();
  if (q > 0.9) {
    ctx.fillStyle = `rgba(255,255,255,${seg(q, 0.9, 1) * 0.8})`;
    ctx.fillRect(0, 0, w, h);
  }
}

export { K as METEOR };
