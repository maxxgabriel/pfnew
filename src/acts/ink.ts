import { brush, ensoPath } from '../core/brush';
import type { Frame } from '../core/frame';
import { layoutWord, wordWidth } from '../core/glyphs';
import { type Pt, TAU, bell, clamp, ease, fbm1, lerp, noise1, rng, seg } from '../core/math';
import { Particles, DOT, SPARK } from '../core/particles';
import { blot, canvas, drawSprite, glow, paperTile, withAlpha } from '../core/sprites';
import { C, F, font } from '../core/style';
import { drawBlot } from '../core/blot';
import { drawWarrior } from './warrior';
import { SIDE, winDir } from '../core/side';

/*
 * ACT I — INK.
 *
 * Opens on a single brush circle, an ensō: one stroke, no going back over it.
 * Pulling back turns the circle into the moon over a mountain range; ink
 * floods the sky; two blades of light wake up in the dark and fight. The
 * blades break off, fire their light at each other, and the camera falls into
 * the point where the beams meet. What comes out the other side is a ball.
 */

// beats
const PULL = [0, 1.4] as const;
const FLOOD = [1.25, 2.35] as const;
const CLASHES = [3.55, 4.12, 4.45, 4.75];
const BEAMS = 5.3;
const ZOOM = [6.0, 6.75] as const;

let paper: HTMLCanvasElement;
let paperPattern: CanvasPattern | null = null;
let blots: HTMLCanvasElement[] = [];
const sparks = new Particles(420, 700, 1.6);
const embers = new Particles(140, -30, 0.4);

interface Layer {
  day: HTMLCanvasElement;
  night: HTMLCanvasElement;
  x: number;
  top: number;
  depth: number;
  ridge: Float32Array;
}
let layers: Layer[] = [];
let pine: HTMLCanvasElement;
let builtFor = '';

function build(f: Frame) {
  const key = `${f.w}x${f.h}`;
  if (key === builtFor) return;
  builtFor = key;
  if (!paper) {
    paper = paperTile(512, C.paper);
    blots = [1, 2, 3, 4].map((s) => blot(s * 17, 420));
  }
  paperPattern = f.ctx.createPattern(paper, 'repeat');
  layers = buildLayers(f.w, f.h);
  pine = buildPine(Math.min(f.w, f.h) * 0.46);
}

/* ------------------------------------------------------------ mountains */

function buildLayers(w: number, h: number): Layer[] {
  const specs = [
    { y: 0.52, amp: 0.24, peaks: 4, ink: 0.3, depth: 0.2, seed: 11, night: '#2a2824' },
    { y: 0.62, amp: 0.21, peaks: 5, ink: 0.48, depth: 0.42, seed: 23, night: '#1d1b18' },
    { y: 0.73, amp: 0.17, peaks: 4, ink: 0.68, depth: 0.68, seed: 37, night: '#121110' },
    { y: 0.88, amp: 0.19, peaks: 3, ink: 0.9, depth: 1, seed: 52, night: '#080706' },
  ];
  return specs.map((s) => {
    const W = Math.ceil(w * 1.36);
    const top = Math.floor((s.y - s.amp - 0.04) * h);
    const H = Math.ceil(h * 1.25 - top);
    const r = rng(s.seed);
    // karst towers: tall, round-shouldered, leaning slightly, some in front of others
    const peaks = Array.from({ length: s.peaks }, (_, i) => ({
      x: ((i + 0.2 + r() * 0.6) / s.peaks) * W,
      hgt: 0.45 + r() * 0.55,
      wid: W * (0.035 + r() * 0.05),
      lean: (r() - 0.5) * 0.6,
    }));
    for (let k = 0; k < s.peaks; k++) {
      peaks.push({ x: r() * W, hgt: 0.2 + r() * 0.25, wid: W * (0.05 + r() * 0.06), lean: (r() - 0.5) * 0.4 });
    }
    if (s.seed === 52) {
      // the near crag the pine grows out of, and one on the far right
      peaks[0] = { x: W * 0.14, hgt: 1, wid: W * 0.06, lean: 0.25 };
      peaks[1] = { x: W * 0.9, hgt: 0.75, wid: W * 0.055, lean: -0.3 };
      peaks[2] = { x: W * 0.55, hgt: 0.25, wid: W * 0.12, lean: 0 };
    }
    const ridge = new Float32Array(Math.ceil(W / 2) + 1);
    for (let i = 0; i < ridge.length; i++) {
      const x = i * 2;
      let m = 0;
      for (const p of peaks) {
        const d = (x - p.x) / p.wid;
        // flat-ish shoulders, steep flanks: a karst profile, skewed by lean
        const dd = d * (1 + p.lean * Math.sign(d));
        const v = p.hgt * Math.exp(-(Math.abs(dd) ** 2.6));
        m = Math.max(m, v);
      }
      const crag = (1 - Math.abs(noise1(x / 23, s.seed))) * 0.05 + fbm1(x / 90, s.seed) * 0.04;
      ridge[i] = s.y * h - s.amp * h * (m + crag * (0.4 + m)) - top;
    }

    const mk = (night: boolean) => {
      const { c, ctx } = canvas(W, H);
      const outline = () => {
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let i = 0; i < ridge.length; i++) ctx.lineTo(i * 2, ridge[i]);
        ctx.lineTo(W, H);
        ctx.closePath();
      };
      if (!night) {
        // every column is darkest at its own crest and fades down into mist
        const fadeLen = s.amp * h * 0.9;
        for (let i = 0; i < ridge.length; i++) {
          const y0 = ridge[i];
          const g = ctx.createLinearGradient(0, y0, 0, y0 + fadeLen);
          const a = s.ink * (0.75 + 0.25 * noise1(i * 0.05, s.seed + 2));
          g.addColorStop(0, withAlpha(C.ink, a));
          g.addColorStop(0.25, withAlpha(C.ink, a * 0.55));
          g.addColorStop(1, withAlpha(C.ink, 0));
          ctx.fillStyle = g;
          ctx.fillRect(i * 2, y0, 2.4, fadeLen);
        }
        // the crest line in dry brush
        const rp: Pt[] = [];
        for (let i = 0; i < ridge.length; i += 5) rp.push([i * 2, ridge[i] + 1]);
        brush(ctx, rp, { width: 2 + s.depth * 3.5, color: C.ink, dry: 0.95, alpha: 0.45 + s.ink * 0.45, seed: s.seed, tail: 0.7, press: 1 });
        // texture strokes that follow each face down and out
        for (const p of peaks) {
          if (p.hgt < 0.4) continue;
          for (let k = 0; k < 7; k++) {
            const side = k % 2 ? 1 : -1;
            const sx = p.x + side * p.wid * (0.15 + r() * 0.5);
            const i0 = Math.max(0, Math.min(ridge.length - 1, Math.round(sx / 2)));
            const y0 = ridge[i0] + 3;
            const len = s.amp * h * (0.18 + r() * 0.3) * p.hgt;
            const out = side * p.wid * (0.25 + r() * 0.3);
            brush(ctx, [[sx, y0], [sx + out * 0.35, y0 + len * 0.55], [sx + out, y0 + len]], {
              width: 1.6 + s.depth * 3, color: C.ink, dry: 0.85, alpha: 0.18 + s.ink * 0.3, seed: s.seed * 7 + k + p.x, tail: 0.1,
            });
          }
          // moss dots along the shoulders
          for (let k = 0; k < 9; k++) {
            const sx = p.x + (r() - 0.5) * p.wid * 1.6;
            const i0 = Math.max(0, Math.min(ridge.length - 1, Math.round(sx / 2)));
            ctx.fillStyle = withAlpha(C.ink, 0.5 + s.ink * 0.4);
            ctx.beginPath();
            ctx.ellipse(sx, ridge[i0] + 1 + r() * 3, 1 + s.depth * 3 * (0.6 + r() * 0.6), 0.7 + s.depth * 1.6, 0, 0, TAU);
            ctx.fill();
          }
        }
      } else {
        outline();
        ctx.fillStyle = s.night;
        ctx.fill();
        // moonlit mist pooling in the valleys
        const minR = Math.min(...ridge);
        const g = ctx.createLinearGradient(0, minR + s.amp * h * 0.5, 0, minR + s.amp * h * 1.5);
        g.addColorStop(0, 'rgba(120,118,128,0)');
        g.addColorStop(1, 'rgba(120,118,128,0.38)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(236,230,214,0.2)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < ridge.length; i++) ctx.lineTo(i * 2, ridge[i] + 0.5);
        ctx.stroke();
      }
      return c;
    };
    return { day: mk(false), night: mk(true), x: -(W - w) / 2, top, depth: s.depth, ridge };
  });
}

function buildPine(size: number) {
  const { c, ctx } = canvas(size, size);
  const S = (x: number, y: number): Pt => [x * size, y * size];
  brush(ctx, [S(0.1, 0.99), S(0.16, 0.8), S(0.13, 0.62), S(0.24, 0.46), S(0.42, 0.36), S(0.62, 0.33), S(0.86, 0.36)], {
    width: size * 0.045, color: C.ink, dry: 0.5, seed: 4, tail: 0.25,
  });
  brush(ctx, [S(0.18, 0.56), S(0.3, 0.6), S(0.46, 0.58)], { width: size * 0.02, color: C.ink, dry: 0.6, seed: 5 });
  brush(ctx, [S(0.3, 0.42), S(0.36, 0.26), S(0.48, 0.16)], { width: size * 0.018, color: C.ink, dry: 0.6, seed: 6 });
  const r = rng(77);
  const clusters: [number, number, number][] = [
    [0.86, 0.33, 1], [0.66, 0.29, 0.9], [0.48, 0.14, 0.8], [0.46, 0.55, 0.85], [0.3, 0.38, 0.7], [0.74, 0.4, 0.6],
  ];
  for (const [cx, cy, k] of clusters) {
    const R = size * 0.09 * k;
    for (let i = 0; i < 26; i++) {
      const a = Math.PI + (i / 25) * Math.PI + (r() - 0.5) * 0.15;
      const l = R * (0.7 + r() * 0.4);
      const x0 = cx * size + (r() - 0.5) * R * 0.3, y0 = cy * size + R * 0.15;
      brush(ctx, [[x0, y0], [x0 + Math.cos(a) * l, y0 + Math.sin(a) * l * 0.55]], {
        width: size * 0.007, color: C.ink, dry: 0.3, alpha: 0.85, seed: i + cx * 100, press: 1.1,
      });
    }
    ctx.fillStyle = withAlpha(C.ink, 0.5);
    ctx.beginPath();
    ctx.ellipse(cx * size, cy * size + R * 0.12, R * 0.7, R * 0.16, 0, 0, TAU);
    ctx.fill();
  }
  return c;
}

/* --------------------------------------------------------------- blades */

interface Key { b: number; bh: Pt; ba: Pt; gh: Pt; ga: Pt; len: number }
const P1: Pt = [0.5, 0.42], P2: Pt = [0.52, 0.5], P3: Pt = [0.48, 0.46], P4: Pt = [0.5, 0.5];
const KEYS: Key[] = [
  { b: 2.35, bh: [0.14, 0.86], ba: [0.1, 0.3], gh: [0.86, 0.86], ga: [0.9, 0.3], len: 0 },
  { b: 2.95, bh: [0.18, 0.66], ba: [0.13, 0.2], gh: [0.82, 0.66], ga: [0.87, 0.2], len: 1 },
  { b: 3.28, bh: [0.24, 0.64], ba: [0.02, 0.55], gh: [0.76, 0.62], ga: [0.98, 0.5], len: 1 },
  { b: 3.55, bh: [0.34, 0.63], ba: P1, gh: [0.66, 0.63], ga: P1, len: 1 },
  { b: 3.8, bh: [0.37, 0.61], ba: [0.5, 0.44], gh: [0.63, 0.61], ga: [0.5, 0.44], len: 1 },
  { b: 3.98, bh: [0.27, 0.56], ba: [0.36, 0.18], gh: [0.71, 0.68], ga: [0.97, 0.82], len: 1 },
  { b: 4.12, bh: [0.36, 0.47], ba: P2, gh: [0.67, 0.66], ga: P2, len: 1 },
  { b: 4.28, bh: [0.29, 0.6], ba: [0.08, 0.72], gh: [0.73, 0.5], ga: [0.84, 0.1], len: 1 },
  { b: 4.45, bh: [0.33, 0.66], ba: P3, gh: [0.6, 0.35], ga: P3, len: 1 },
  { b: 4.6, bh: [0.4, 0.6], ba: [0.72, 0.64], gh: [0.62, 0.42], ga: [0.28, 0.28], len: 1 },
  { b: 4.75, bh: [0.31, 0.63], ba: P4, gh: [0.69, 0.37], ga: P4, len: 1 },
  { b: 5.05, bh: [0.12, 0.6], ba: [0.42, 0.55], gh: [0.88, 0.6], ga: [0.58, 0.55], len: 1 },
  { b: 6.4, bh: [0.14, 0.6], ba: [0.44, 0.56], gh: [0.86, 0.6], ga: [0.56, 0.56], len: 1 },
];

interface Blade { x: number; y: number; a: number; len: number }

function angleOf(h: Pt, a: Pt, sw: number, sh: number) {
  return Math.atan2((a[1] - h[1]) * sh, (a[0] - h[0]) * sw);
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return a + d * t;
}

function bladesAt(B: number, sw: number, sh: number): [Blade, Blade] {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].b <= B) i++;
  const k0 = KEYS[i], k1 = KEYS[i + 1];
  const raw = clamp((B - k0.b) / (k1.b - k0.b));
  // strikes snap in and settle; everything else eases
  const strike = CLASHES.includes(k1.b);
  const t = strike ? ease.in3(raw) * 0.4 + ease.out5(raw) * 0.6 : ease.inOut3(raw);
  const one = (h0: Pt, a0: Pt, h1: Pt, a1: Pt): Blade => ({
    x: lerp(h0[0], h1[0], t),
    y: lerp(h0[1], h1[1], t),
    a: lerpAngle(angleOf(h0, a0, sw, sh), angleOf(h1, a1, sw, sh), t),
    len: lerp(k0.len, k1.len, ease.out3(raw)),
  });
  return [one(k0.bh, k0.ba, k1.bh, k1.ba), one(k0.gh, k0.ga, k1.gh, k1.ga)];
}

let beamSprite: HTMLCanvasElement | null = null;
function beamGlow() {
  if (beamSprite) return beamSprite;
  const { c, ctx } = canvas(256, 64);
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 64);
  // soft ends
  ctx.globalCompositeOperation = 'destination-in';
  const e = ctx.createLinearGradient(0, 0, 256, 0);
  e.addColorStop(0, 'rgba(0,0,0,0)');
  e.addColorStop(0.12, 'rgba(0,0,0,1)');
  e.addColorStop(0.88, 'rgba(0,0,0,1)');
  e.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = e;
  ctx.fillRect(0, 0, 256, 64);
  beamSprite = c;
  return c;
}

/** a tinted copy of the beam glow, cached per colour */
const tinted = new Map<string, HTMLCanvasElement>();
function beamTint(color: string) {
  const hit = tinted.get(color);
  if (hit) return hit;
  const src = beamGlow();
  const { c, ctx } = canvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  tinted.set(color, c);
  return c;
}

export function drawLightLine(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  color: string, hot: string, thick: number, flick: number,
) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x0, y0);
  ctx.rotate(a);
  const pad = thick * 2.2;
  ctx.globalAlpha = 0.55 * flick;
  ctx.drawImage(beamTint(color), -pad, -thick * 4, len + pad * 2, thick * 8);
  ctx.globalAlpha = 0.9;
  ctx.drawImage(beamTint(color), -pad * 0.5, -thick * 1.6, len + pad, thick * 3.2);
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  ctx.strokeStyle = hot;
  ctx.lineWidth = thick * 0.9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len, 0);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = thick * 0.45;
  ctx.stroke();
  ctx.restore();
}

/* -------------------------------------------------------------- petals */

interface Petal { x: number; y: number; vx: number; vy: number; r: number; ph: number }
const petals: Petal[] = [];

/** Blossom drifting across the duel; every clash blows it outward. */
function drawPetals(f: Frame, dt: number, X: (n: number) => number, Y: (n: number) => number) {
  const { ctx, w, h, B, t } = f;
  const S = Math.min(w, h);
  const vis = seg(B, 2.35, 2.8) * (1 - seg(B, 6.0, 6.4));
  if (vis <= 0) return;
  if (petals.length === 0) {
    for (let i = 0; i < 46; i++) {
      petals.push({ x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0, r: S * (0.006 + Math.random() * 0.006), ph: Math.random() * TAU });
    }
  }
  const P = [P1, P2, P3, P4];
  CLASHES.forEach((cb, ci) => {
    if (!f.crossedFwd(cb)) return;
    const cx = X(P[ci][0]), cy = Y(P[ci][1]);
    for (const p of petals) {
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.max(0, 1 - d / (S * 0.9)) * S * 3.2;
      p.vx += (dx / d) * k;
      p.vy += (dy / d) * k;
    }
  });
  ctx.save();
  for (const p of petals) {
    // wind from the right, a slow fall, a flutter
    p.vx += (-S * 0.12 - p.vx) * Math.min(1, dt * 1.5);
    p.vy += (S * 0.05 - p.vy) * Math.min(1, dt * 1.5);
    p.x += (p.vx + Math.sin(t * 2 + p.ph) * S * 0.04) * dt;
    p.y += (p.vy + Math.cos(t * 1.7 + p.ph) * S * 0.03) * dt;
    if (p.x < -20) { p.x = w + 20; p.y = Math.random() * h * 0.8; }
    if (p.x > w + 40) p.x = -10;
    if (p.y > h + 20) { p.y = -10; p.x = Math.random() * w; }
    if (p.y < -40) p.y = h;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(t * 1.5 + p.ph);
    ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(t * 3 + p.ph)));
    ctx.globalAlpha = vis * 0.85;
    ctx.fillStyle = p.ph > 3 ? '#f3c9cf' : '#f8e2df';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r * 1.3, p.r * 0.8, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* ------------------------------------------------------------- tassels */

/** Each hilt trails a vermilion cord, simulated as a short pendulum chain. */
class Cord {
  pts: { x: number; y: number; px: number; py: number }[] = [];
  n: number;
  constructor(n = 7) {
    this.n = n;
  }
  step(ax: number, ay: number, seg: number, dt: number) {
    if (this.pts.length === 0) {
      for (let i = 0; i < this.n; i++) this.pts.push({ x: ax, y: ay + i * seg, px: ax, py: ay + i * seg });
    }
    const g = 1400 * dt * dt;
    for (let i = 1; i < this.n; i++) {
      const p = this.pts[i];
      const vx = (p.x - p.px) * 0.96, vy = (p.y - p.py) * 0.96;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + g;
    }
    this.pts[0].x = ax; this.pts[0].y = ay;
    for (let it = 0; it < 4; it++) {
      for (let i = 1; i < this.n; i++) {
        const a = this.pts[i - 1], b = this.pts[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const k = (d - seg) / d;
        if (i === 1) { b.x -= dx * k; b.y -= dy * k; }
        else { a.x += dx * k * 0.5; a.y += dy * k * 0.5; b.x -= dx * k * 0.5; b.y -= dy * k * 0.5; }
      }
    }
  }
}
const cords = [new Cord(), new Cord()];
const vel = [{ px: 0, py: 0, vx: 0, vy: 0 }, { px: 0, py: 0, vx: 0, vy: 0 }];

/* -------------------------------------------------------------- drawing */

interface Ring { t0: number; x: number; y: number; color: string }
const rings: Ring[] = [];

let lastT = 0;
let crackleSeed = 0;

export function drawInk(f: Frame) {
  build(f);
  const { ctx, w, h, B, t } = f;
  const S = Math.min(w, h);
  const SW = Math.min(w, h * 0.9);
  const ox = (w - SW) / 2;
  const X = (sx: number) => ox + sx * SW;
  const Y = (sy: number) => sy * h;
  const dt = Math.min(0.05, t - lastT || 0.016);
  lastT = t;

  // intro clock: the opening title paints itself on load
  const I = f.intro;

  // pull back: the title circle becomes the moon
  const pull = ease.inOut3(seg(B, PULL[0], PULL[1]));
  const night = ease.inOut2(seg(B, FLOOD[0] + 0.45, FLOOD[1]));
  const zoomT = ease.in3(seg(B, ZOOM[0], ZOOM[1]));
  const zoom = Math.exp(Math.log(16) * zoomT);

  // where the beams meet; the camera dives into it
  // your side's beam overpowers the other and drives the meeting point back
  const over = ease.inOut2(seg(B, 5.55, 6.1));
  const jx = X(0.5 + (0.07 * Math.sin(t * 1.15) + 0.03 * Math.sin(t * 2.9)) * (1 - over * 0.6) - winDir() * 0.14 * over);
  const jy = Y(0.555 + 0.008 * Math.sin(t * 1.7));

  ctx.save();
  if (zoom > 1.001) {
    ctx.translate(jx, jy);
    ctx.scale(zoom, zoom);
    ctx.translate(-jx, -jy);
  }

  // ---- sky
  if (paperPattern) {
    ctx.fillStyle = paperPattern;
    ctx.fillRect(-w, -h, w * 3, h * 3);
  }
  if (night > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0d0c0b');
    g.addColorStop(0.55, '#1e1c19');
    g.addColorStop(1, '#2d2a26');
    ctx.globalAlpha = night;
    ctx.fillStyle = g;
    ctx.fillRect(-w, -h, w * 3, h * 3);
    ctx.globalAlpha = 1;
  }

  // camera drift during the duel: layers slide at their own depth
  const duel = seg(B, 2.2, 3.2);
  const camX = (Math.sin(t * 0.21) * 0.018 + (B > 2 ? Math.sin(B * 1.3) * 0.03 : 0)) * w * duel;
  const camY = Math.sin(t * 0.33) * 0.006 * h;

  // ---- the flood: ink blooms up from behind the range and takes the sky,
  // stopping at the edge of the circle
  const flood = seg(B, FLOOD[0], FLOOD[1]);
  if (flood > 0 && night < 1) {
    const r = rng(9);
    for (let i = 0; i < 16; i++) {
      const delay = r() * 0.55;
      const k = ease.out2(seg(flood, delay, delay + 0.5));
      if (k <= 0) continue;
      const bx = r() * w, by = h * (0.5 + r() * 0.25) - k * h * 0.3;
      ctx.globalAlpha = Math.min(1, k * 1.6) * (1 - night);
      drawSprite(ctx, blots[i % blots.length], bx, by, S * (0.15 + k * (0.9 + r() * 0.8)), undefined, r() * TAU);
    }
    ctx.globalAlpha = 1;
  }

  // ---- moon / ensō
  const enCx = lerp(w * 0.5, X(0.7), pull);
  const enCy = lerp(h * 0.38, Y(0.2), pull);
  const enR = lerp(Math.min(w * 0.38, h * 0.25), S * 0.12, pull);
  const mx = enCx - camX * 0.05, my = enCy - camY * 0.05;
  const lum = Math.max(night, ease.inOut2(seg(B, FLOOD[0] + 0.15, FLOOD[0] + 0.6)));
  if (lum > 0) {
    ctx.globalAlpha = lum * 0.5;
    drawSprite(ctx, glow(C.paper, 256), mx, my, enR * 7);
    ctx.globalAlpha = lum;
    ctx.fillStyle = C.paper;
    ctx.beginPath();
    ctx.arc(mx, my, enR * 0.96, 0, TAU);
    ctx.fill();
    // a little ink wash on the moon's face
    ctx.fillStyle = 'rgba(160,150,130,0.25)';
    ctx.beginPath();
    ctx.arc(mx + enR * 0.25, my - enR * 0.15, enR * 0.35, 0, TAU);
    ctx.arc(mx - enR * 0.35, my + enR * 0.3, enR * 0.2, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  const ensoP = ease.inOut2(seg(I, 0.55, 1.5));
  if (ensoP > 0) {
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(t * 0.02);
    ctx.scale(enR / 100, enR / 100);
    brush(ctx, ENSO, { width: 17, color: C.ink, progress: ensoP, dry: 0.42, seed: 3, press: 1.5, tail: 0.12, alpha: 1 - night * 0.5 });
    ctx.restore();
  }

  // the drop that starts it all
  if (I < 0.65) {
    const st = ENSO_START(mx, my, enR);
    const fall = ease.in2(seg(I, 0.05, 0.55));
    const dy = lerp(-h * 0.5, 0, fall);
    if (I < 0.55) {
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      const r0 = S * 0.012;
      ctx.ellipse(st[0], st[1] + dy, r0, r0 * (1 + fall * 1.6), 0, 0, TAU);
      ctx.fill();
    }
  }
  if (f.crossedFwd(0) && I > 0.5 && I < 0.7) {
    /* noop: the intro splash is drawn below from the clock */
  }
  if (I > 0.5 && I < 1.4) {
    const st = ENSO_START(mx, my, enR);
    const k = ease.out3(seg(I, 0.52, 1.0));
    ctx.globalAlpha = 1 - seg(I, 1.0, 1.4) * 0.6;
    drawSprite(ctx, blots[0], st[0], st[1], S * (0.02 + k * 0.1));
    ctx.globalAlpha = 1;
  }

  // ---- Blot: the first drop climbs out of its own splash and sits on the circle
  const pop = ease.outBack(seg(I, 1.05, 1.45), 2.2);
  if (pop > 0) {
    const st = ENSO_START(mx, my, enR);
    const bs = Math.max(S * 0.045, enR * 0.3) * pop;
    const near = (b: number, r = 0.12) => Math.abs(B - b) < r;
    const pose = CLASHES.some((c) => near(c)) ? 'cover' : B > 5.2 && B < 6.2 ? 'shock' : I < 3.6 && B < 0.2 ? 'idle' : 'idle';
    const lookAt: [number, number] | undefined = f.idle > 3 ? undefined : B > 2.4 ? [jx, jy] : I < 3.4 ? [w * 0.5, h * 0.4] : [w * 0.5, h];
    drawBlot(ctx, st[0] + enR * 0.04, st[1] - enR * 0.02, bs, {
      t, pose: f.idle > 6 && B < 0.35 ? 'wave' : pose, look: lookAt, seed: 1, rot: -0.35 * (1 - pull) - 0.2 * pull, eye: C.white, wind: 0.5 + Math.sin(t) * 0.3,
    });
  }

  // ---- birds over the range
  drawBirds(f, night, camX);

  // ---- mountains rise into place
  // vertigo: while the blades are locked the range swells behind them
  const vert = bell(B, 3.42, 3.98);
  layers.forEach((L, i) => {
    ctx.save();
    if (vert > 0) {
      const k = 1 + vert * (0.32 - i * 0.06);
      ctx.translate(w / 2, h * 0.5);
      ctx.scale(k, k);
      ctx.translate(-w / 2, -h * 0.5);
    }
    const rise = (1 - pull) * h * (0.48 + i * 0.2);
    const px = L.x - camX * L.depth;
    const py = L.top + rise - camY * L.depth;
    if (night < 1) {
      ctx.globalAlpha = 1 - night;
      ctx.drawImage(L.day, px, py, L.day.width, L.day.height);
    }
    if (night > 0) {
      ctx.globalAlpha = night;
      ctx.drawImage(L.night, px, py, L.night.width, L.night.height);
    }
    ctx.globalAlpha = 1;
    // drifting mist between layers
    if (i < 3) drawMist(ctx, w, py + (L.ridge[0] ?? 0) + h * 0.05, t, i, night, S, seg(B, 1.3, 1.75));
    if (i === 3) {
      // the pine on the near crag, swaying
      const cragX = px + L.day.width * 0.15;
      const ri = Math.max(0, Math.min(L.ridge.length - 1, Math.round((cragX - px) / 2)));
      const ry = L.ridge[ri] + py;
      ctx.save();
      ctx.translate(cragX, ry + S * 0.015);
      ctx.rotate(Math.sin(t * 0.7) * 0.012 + Math.sin(t * 1.9) * 0.004);
      const ps = pine.width;
      ctx.drawImage(pine, -ps * 0.1, -ps * 0.99, ps, ps);
      ctx.restore();
    }
    ctx.restore();
  });

  // ---- title
  drawTitle(f, pull, I);

  // ---- the duel
  // on a tall screen the fight closes in so the fighters stay in frame
  const squeeze = f.portrait ? 0.8 : 1;
  const XD = (sx: number) => ox + (0.5 + (sx - 0.5) * squeeze) * SW;
  if (B > 2.2 && B < 7) {
    drawPetals(f, dt, XD, Y);
    drawDuel(f, XD, Y, SW, dt, camX, jx, jy);
  }

  ctx.restore();

  // ---- into the light
  const white = seg(B, 6.4, 6.75);
  if (white > 0) {
    ctx.fillStyle = `rgba(255,253,246,${ease.in2(white)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

const ENSO = ensoPath(0, 0, 100, 3, 0.93, -2.3);
const ENSO_START = (cx: number, cy: number, r: number): Pt => [cx + Math.cos(-2.3) * r * 1.0, cy + Math.sin(-2.3) * r * 1.0];

function drawMist(ctx: CanvasRenderingContext2D, w: number, y: number, t: number, i: number, night: number, S: number, dusk: number) {
  const img = glow(night > 0.5 ? '#96929a' : C.paper, 128);
  ctx.globalAlpha = night > 0.5 ? 0.16 * night : 0.7 * (1 - dusk);
  for (let k = 0; k < 3; k++) {
    const x = ((t * (8 + i * 5) + k * w * 0.45 + i * 131) % (w * 1.6)) - w * 0.3;
    drawSprite(ctx, img, x, y + Math.sin(t * 0.4 + k) * 6, S * (0.9 + k * 0.2), S * 0.16);
  }
  ctx.globalAlpha = 1;
}

function drawBirds(f: Frame, night: number, camX: number) {
  const { ctx, w, h, t } = f;
  const S = Math.min(w, h);
  // a loop: the flock crosses every 14 s, and once more as the camera pulls back
  const cycle = (t % 14) / 14;
  const runs = [cycle, seg(f.B, 0.3, 1.8)];
  ctx.strokeStyle = night > 0.5 ? 'rgba(236,230,214,0.6)' : C.ink;
  ctx.lineCap = 'round';
  for (const [ri, p] of runs.entries()) {
    if (p <= 0 || p >= 1) continue;
    for (let i = 0; i < 6; i++) {
      const lag = i * 0.025;
      const q = p - lag;
      if (q <= 0) continue;
      const x = lerp(w * 1.1, -w * 0.1, q) + (i % 2) * S * 0.04 - camX * 0.3;
      const y = h * (ri === 0 ? 0.16 : 0.3) + i * S * 0.022 + Math.sin(q * 9 + i) * S * 0.01;
      const s = S * (0.016 - i * 0.0012);
      const flap = Math.sin(t * 9 + i * 1.3);
      ctx.lineWidth = Math.max(1, s * 0.18);
      ctx.beginPath();
      ctx.moveTo(x - s, y - flap * s * 0.6);
      ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.2, x, y);
      ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.2, x + s, y - flap * s * 0.6);
      ctx.stroke();
    }
  }
}

/* -------------------------------------------------------------- title */

let titleCache: { key: string; max: ReturnType<typeof layoutWord>; gab: ReturnType<typeof layoutWord>; maxSize: number; gabSize: number } | null = null;

function drawTitle(f: Frame, pull: number, I: number) {
  const { ctx, w, h, B, t } = f;
  if (B > 1.2) return;
  const fade = 1 - seg(B, 0.45, 0.75);
  if (fade <= 0) return;
  const S = Math.min(w, h);
  const key = `${w}x${h}`;
  if (!titleCache || titleCache.key !== key) {
    const maxSize = Math.min(w * 0.2, h * 0.14);
    const gabSize = maxSize * 0.34;
    const mw = wordWidth('MAX', maxSize, 0.16);
    const gw = wordWidth('GABRIEL', gabSize, 0.3);
    const cy = h * 0.38;
    titleCache = {
      key,
      maxSize,
      gabSize,
      max: layoutWord('MAX', w / 2 - mw / 2, cy - maxSize * 0.5, maxSize, 0.16),
      gab: layoutWord('GABRIEL', w / 2 - gw / 2, cy + Math.min(w * 0.38, h * 0.25) + S * 0.08, gabSize, 0.3),
    };
  }
  const { max, gab, maxSize, gabSize } = titleCache;
  const lift = -pull * h * 0.12;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(0, lift);
  // MAX is written with a fat brush, stroke after stroke
  // MAX is written with a fat brush, stroke after stroke — and scrolling on
  // lifts the brush back off in the same order
  max.strokes.forEach((s, i) => {
    const on = ease.inOut2(seg(I, 1.35 + i * 0.13, 1.35 + i * 0.13 + 0.2));
    const off = 1 - ease.inOut2(seg(B, 0.04 + i * 0.035, 0.3 + i * 0.035));
    const wob = Math.sin(t * 0.8 + i) * 0.4;
    ctx.save();
    ctx.translate(wob, 0);
    brush(ctx, s.pts, { width: maxSize * 0.14, color: C.ink, progress: Math.min(on, off), dry: 0.45, seed: 40 + i, press: 1.35, tail: 0.25 });
    ctx.restore();
  });
  gab.strokes.forEach((s, i) => {
    const on = ease.out2(seg(I, 2.55 + i * 0.05, 2.55 + i * 0.05 + 0.12));
    const off = 1 - ease.inOut2(seg(B, 0.02 + i * 0.012, 0.22 + i * 0.012));
    brush(ctx, s.pts, { width: gabSize * 0.13, color: C.ink, progress: Math.min(on, off), dry: 0.4, seed: 80 + i, press: 1.3, tail: 0.3 });
  });
  // the seal stamps down last
  const st = seg(I, 3.25, 3.6);
  if (st > 0) {
    const gl = gab.strokes[gab.strokes.length - 1].pts;
    const sx = gl[gl.length - 1][0] + gabSize * 0.55;
    const sy = gab.strokes[0].pts[0][1] + gabSize * 0.5;
    const sc = st < 1 ? lerp(2.2, 1, ease.outBack(st, 2.2)) : 1;
    drawSeal(ctx, sx, sy, gabSize * 1.05 * sc, -0.06 + (1 - st) * 0.4, Math.min(1, st * 3));
  }
  // one line, set in mincho
  const sub = seg(I, 3.5, 4.3);
  if (sub > 0) {
    const y = gab.strokes[0].pts[0][1] + gabSize * 1.75;
    ctx.font = font(Math.max(12, S * 0.034), F.serif, 600);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = withAlpha(C.ink, ease.out2(sub) * 0.85);
    const msg = 'designs and builds things that move.';
    const n = Math.floor(msg.length * ease.out2(sub));
    ctx.fillText(msg.slice(0, n), w / 2, y + (1 - ease.out3(sub)) * 8);
  }
  ctx.restore();

  // the hint: a stroke that keeps drawing itself downward
  const hint = seg(I, 4.4, 5.0) * (1 - seg(B, 0.02, 0.25));
  if (hint > 0) {
    const cycle = (t * 0.6) % 1;
    const x = w / 2, y0 = h * 0.88, len = S * 0.07;
    ctx.save();
    ctx.globalAlpha = hint;
    brush(ctx, HINT.map(([a, b]) => [x + a * len, y0 + b * len] as Pt), {
      width: S * 0.008, color: C.ink, progress: ease.inOut2(Math.min(1, cycle * 1.4)), dry: 0.7, seed: 9, alpha: 1 - seg(cycle, 0.75, 1),
    });
    ctx.font = font(Math.max(10, S * 0.024), F.serif, 600);
    ctx.textAlign = 'center';
    ctx.fillStyle = withAlpha(C.ink, 0.7);
    ctx.fillText('scroll, slowly', x, y0 - S * 0.03);
    ctx.restore();
  }
}
const HINT: Pt[] = [[0, 0], [0.04, 0.5], [0, 1]];

export function drawSeal(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, alpha: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = C.red;
  const r = s * 0.08;
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s, r);
  ctx.fill();
  ctx.font = font(s * 0.42, F.display);
  ctx.fillStyle = C.paper;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', 0, -s * 0.2);
  ctx.fillText('G', 0, s * 0.22);
  // worn stamp: knock pale flecks out of the red
  ctx.globalCompositeOperation = 'destination-out';
  const rr = rng(12);
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.5 + rr() * 0.5;
    ctx.beginPath();
    ctx.arc((rr() - 0.5) * s, (rr() - 0.5) * s, s * (0.008 + rr() * 0.02), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- duel */

function drawDuel(
  f: Frame,
  X: (n: number) => number,
  Y: (n: number) => number,
  SW: number,
  dt: number,
  camX: number,
  jx: number,
  jy: number,
) {
  const { ctx, w, h, B, t } = f;
  const S = Math.min(w, h);
  const L = Math.min(SW * 0.5, h * 0.3);
  const thick = Math.max(3, S * 0.016);

  const blades = bladesAt(B, SW, h);
  const lock = bell(B, 3.5, 3.86);
  const colors = [
    { c: C.blue, hot: C.blueHot },
    { c: C.green, hot: C.greenHot },
  ];
  const tips: Pt[] = [];
  const hilts: Pt[] = [];

  blades.forEach((bl, i) => {
    const side = i === 0 ? -1 : 1;
    // the hands are never quite still
    const bob = Math.sin(t * 1.6 + i * 2) * S * 0.008;
    const tremble = lock * Math.sin(t * 47 + i) * S * 0.004;
    // the losing fighter is driven back by the beam
    const loserIx = SIDE.pick === 'green' ? 0 : 1;
    const push = i === loserIx ? (i === 0 ? -1 : 1) * S * 0.07 * ease.inOut2(seg(B, 5.6, 6.1)) + Math.sin(t * 40) * S * 0.003 * seg(B, 5.6, 5.8) : 0;
    const hx = X(bl.x) + bob * 0.5 + tremble - camX * 0.9 + push;
    const hy = Y(bl.y) + bob + tremble * side;
    const a = bl.a + Math.sin(t * 1.3 + i * 4) * 0.035 * (1 - lock);
    hilts.push([hx, hy]);
    tips.push([hx + Math.cos(a) * L * bl.len, hy + Math.sin(a) * L * bl.len]);
    bl.a = a;
  });

  // the fighters, painted around the blades they hold
  const appear = ease.out2(seg(B, 2.3, 2.75));
  const s = L * 1.3;
  blades.forEach((bl, i) => {
    const v = vel[i];
    const [hx, hy] = hilts[i];
    if (v.px !== 0 && dt > 0) {
      v.vx = lerp(v.vx, (hx - v.px) / dt, 0.15);
      v.vy = lerp(v.vy, (hy - v.py) / dt, 0.15);
    }
    v.px = hx;
    v.py = hy;
    const k = drawWarrior(ctx, {
      hilt: [hx, hy], a: bl.a, foeX: hilts[1 - i][0], s, groundY: h * 0.83,
      color: i ? C.green : C.blue, t, vx: v.vx, vy: v.vy, seed: i + 1, alpha: appear,
    });
    // left alone long enough, both fighters turn their eyes on the viewer
    const stare = seg(f.idle, 3, 3.8) * appear;
    if (stare > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const ex of [-1, 1]) {
        const x = k.head[0] + ex * s * 0.022, y = k.head[1] - s * 0.004;
        ctx.globalAlpha = stare * 0.6;
        drawSprite(ctx, glow(i ? C.green : C.blue, 64), x, y, s * 0.07);
        ctx.globalAlpha = stare;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x, y, s * 0.011, s * 0.006 * (Math.sin(t * 0.8 + i) > 0.97 ? 0.2 : 1), 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  });

  // swing trails: where the blades were a moment of scroll ago
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 1; k <= 5; k++) {
    const pb = bladesAt(B - k * 0.022 * Math.sign(f.vB || 1), SW, h);
    blades.forEach((bl, i) => {
      const prev = pb[i];
      const da = Math.abs(lerpAngle(prev.a, bl.a, 1) - prev.a);
      const dd = Math.abs(lerpAngle(bl.a, prev.a, 1) - bl.a);
      if (Math.min(da, dd) < 0.03 && Math.abs(prev.x - bl.x) < 0.01) return;
      const [hx, hy] = hilts[i];
      const phx = X(prev.x) - camX * 0.9, phy = Y(prev.y);
      ctx.fillStyle = withAlpha(colors[i].c, 0.16 * (1 - k / 6));
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(tips[i][0], tips[i][1]);
      ctx.lineTo(phx + Math.cos(prev.a) * L * prev.len, phy + Math.sin(prev.a) * L * prev.len);
      ctx.lineTo(phx, phy);
      ctx.closePath();
      ctx.fill();
    });
  }
  ctx.restore();

  // the blades
  const beams = seg(B, BEAMS, BEAMS + 0.3);
  blades.forEach((bl, i) => {
    const [hx, hy] = hilts[i];
    const [tx, ty] = tips[i];
    if (bl.len > 0.01) {
      const flick = 0.85 + 0.15 * Math.sin(t * 61 + i * 3) * Math.sin(t * 23);
      // igniting blades sputter
      const ign = seg(B, 2.4, 2.95);
      const sput = ign < 1 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 40 + i)) : 1;
      drawLightLine(ctx, hx, hy, tx, ty, colors[i].c, colors[i].hot, thick * sput, flick);
    }
    // hilt
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(bl.a);
    const hl = S * 0.06, hw = S * 0.016;
    ctx.fillStyle = '#3a3733';
    ctx.fillRect(-hl, -hw / 2, hl, hw);
    ctx.fillStyle = 'rgba(236,230,214,0.55)';
    for (let k = 1; k < 5; k++) ctx.fillRect(-hl + k * hl * 0.2, -hw / 2, hl * 0.05, hw);
    ctx.fillStyle = '#6d675e';
    ctx.fillRect(-hw * 0.3, -hw * 0.8, hw * 0.6, hw * 1.6);
    ctx.restore();
    // cord from the pommel
    const px = hx - Math.cos(bl.a) * S * 0.06, py = hy - Math.sin(bl.a) * S * 0.06;
    const cord = cords[i];
    cord.step(px, py, S * 0.012, dt);
    ctx.strokeStyle = C.red;
    ctx.lineWidth = Math.max(1.5, S * 0.005);
    ctx.lineCap = 'round';
    ctx.beginPath();
    cord.pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    const end = cord.pts[cord.pts.length - 1];
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.ellipse(end.x, end.y + S * 0.008, S * 0.006, S * 0.014, 0, 0, TAU);
    ctx.fill();
  });

  // clashes: a burst, a ring, a jolt
  CLASHES.forEach((cb, ci) => {
    if (f.crossedFwd(cb)) {
      const P = [P1, P2, P3, P4][ci];
      const x = X(P[0]) - camX * 0.9, y = Y(P[1]);
      for (const col of [C.blueHot, C.greenHot, '#ffffff']) {
        sparks.burst(x, y, 26, S * 2.4, { color: col, kind: SPARK, size: S * 0.005, max: 0.7 });
      }
      rings.push({ t0: t, x, y, color: '#ffffff' });
      f.shake(S * 0.025);
      f.flash(0.35, '#ffffff');
    }
  });
  // while locked, the crossing point grinds
  if (lock > 0.2 && B < 3.86) {
    const x = (tips[0][0] + tips[1][0]) / 2, y = Y(0.44) + Math.sin(t * 30) * 2;
    const [ix, iy] = intersect(hilts[0], tips[0], hilts[1], tips[1]) ?? [x, y];
    for (let k = 0; k < 3; k++) {
      sparks.spawn({
        x: ix, y: iy,
        vx: (Math.random() - 0.5) * S * 2.2, vy: -Math.random() * S * 1.6,
        max: 0.3 + Math.random() * 0.4, size: S * 0.004,
        color: Math.random() > 0.5 ? C.blueHot : C.greenHot, kind: SPARK,
      });
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glow('#ffffff', 128), ix, iy, S * (0.18 + 0.04 * Math.sin(t * 40)));
    ctx.restore();
  }

  // ---- beams: the blades give up their light and throw it
  if (beams > 0) {
    const grow = ease.out3(beams);
    const orb = ease.in2(seg(B, 5.7, 6.4));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    tips.forEach((tp, i) => {
      const ex = lerp(tp[0], jx, grow), ey = lerp(tp[1], jy, grow);
      // the beam wavers like a held breath
      const n = 14;
      const pts: Pt[] = [];
      for (let k = 0; k <= n; k++) {
        const q = k / n;
        const x = lerp(tp[0], ex, q), y = lerp(tp[1], ey, q);
        const wv = Math.sin(q * 9 - t * 18 + i * 2) * S * 0.006 * Math.sin(q * Math.PI);
        pts.push([x, y + wv]);
      }
      for (let k = 0; k < n; k++) {
        drawLightLine(ctx, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], colors[i].c, colors[i].hot, thick * (1.1 + orb * 0.8), 1);
      }
    });
    if (grow > 0.95) {
      // the meeting point
      const R = S * (0.07 + 0.03 * Math.sin(t * 9) + orb * 0.25);
      const ov = ease.inOut2(seg(B, 5.55, 6.1));
      const gb = SIDE.pick === 'blue' ? 1 + ov : 1 - ov * 0.5, gg = SIDE.pick === 'green' ? 1 + ov : 1 - ov * 0.5;
      drawSprite(ctx, glow(C.blue, 128), jx - R * 0.3, jy, R * 4 * gb);
      drawSprite(ctx, glow(C.green, 128), jx + R * 0.3, jy, R * 4 * gg);
      drawSprite(ctx, glow('#ffffff', 128, 0.2), jx, jy, R * 2.4);
      // crackle
      if (Math.floor(t * 20) !== crackleSeed) crackleSeed = Math.floor(t * 20);
      const r = rng(crackleSeed);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(1, S * 0.0025);
      for (let k = 0; k < 5; k++) {
        let a = r() * TAU;
        let x = jx, y = jy;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const len = R * (1.2 + r() * 1.6);
        for (let s = 0; s < 6; s++) {
          a += (r() - 0.5) * 1.2;
          x += Math.cos(a) * len / 6;
          y += Math.sin(a) * len / 6;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // pulses running out from the orb
      for (let k = 0; k < 3; k++) {
        const q = (t * 0.9 + k / 3) % 1;
        ctx.strokeStyle = `rgba(255,255,255,${(1 - q) * 0.35})`;
        ctx.lineWidth = S * 0.004 * (1 - q);
        ctx.beginPath();
        ctx.arc(jx, jy, R * (1 + q * 3), 0, TAU);
        ctx.stroke();
      }
      if (Math.random() < 0.6) {
        embers.spawn({
          x: jx + (Math.random() - 0.5) * R, y: jy + (Math.random() - 0.5) * R,
          vx: (Math.random() - 0.5) * S * 0.6, vy: -S * (0.1 + Math.random() * 0.3),
          max: 1.2, size: S * 0.004, color: Math.random() > 0.5 ? C.blueHot : C.greenHot, kind: DOT,
        });
      }
    }
    ctx.restore();
  }

  // shockwave rings
  for (let i = rings.length - 1; i >= 0; i--) {
    const rg = rings[i];
    const q = (t - rg.t0) / 0.55;
    if (q > 1 || q < 0) { rings.splice(i, 1); continue; }
    ctx.strokeStyle = `rgba(255,255,255,${(1 - q) * 0.8})`;
    ctx.lineWidth = S * 0.01 * (1 - q);
    ctx.beginPath();
    ctx.ellipse(rg.x, rg.y, S * 0.3 * ease.out3(q), S * 0.12 * ease.out3(q), -0.3, 0, TAU);
    ctx.stroke();
  }

  sparks.update(dt);
  embers.update(dt);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  sparks.draw(ctx);
  embers.draw(ctx);
  ctx.restore();
  void w;
}

function intersect(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
  if (Math.abs(den) < 1e-6) return null;
  const tt = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den;
  const uu = -((a[0] - b[0]) * (a[1] - c[1]) - (a[1] - b[1]) * (a[0] - c[0])) / den;
  if (tt < 0 || tt > 1 || uu < 0 || uu > 1) return null;
  return [a[0] + tt * (b[0] - a[0]), a[1] + tt * (b[1] - a[1])];
}

/* ------------------------------------------------- the cooled paper + tear */

/**
 * After the white-out the light cools to paper with the ball sitting on it,
 * then the paper tears and the ball drops through into the machine.
 * Drawn on top of the machine act; returns the tear opening (0..1).
 */
export function drawPaperOver(f: Frame) {
  build(f);
  const { ctx, w, h, B } = f;
  const cool = seg(B, 6.75, 7.05);
  const open = ease.inOut3(seg(B, 7.2, 7.85));
  if (B < 6.75 || open >= 1) return;
  const S = Math.min(w, h);
  const tearY = h * 0.6;
  const gap = open * h * 0.9;

  const pass = (top: boolean) => {
    const edge = tearEdge(w, tearY, S, 1);
    const dy = top ? -gap * 0.42 : gap * 0.85;
    const rot = top ? -open * 0.05 : open * 0.12;
    ctx.save();
    ctx.translate(w / 2, tearY);
    ctx.rotate(rot);
    ctx.translate(-w / 2, -tearY + dy);
    ctx.beginPath();
    ctx.moveTo(-w, top ? -h : h * 2);
    ctx.lineTo(w * 2, top ? -h : h * 2);
    ctx.lineTo(w + 10, edge[edge.length - 1][1]);
    for (let i = edge.length - 1; i >= 0; i--) ctx.lineTo(edge[i][0], edge[i][1]);
    ctx.lineTo(-w, edge[0][1]);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    if (paperPattern) ctx.fillStyle = paperPattern;
    ctx.fillRect(-w, -h, w * 3, h * 3);
    // the white heat fading into the paper
    ctx.fillStyle = `rgba(255,253,246,${1 - ease.out2(cool)})`;
    ctx.fillRect(-w, -h, w * 3, h * 3);
    // a shadow under the lifting edge
    if (open > 0) {
      const g = ctx.createLinearGradient(0, tearY + (top ? -S * 0.12 : S * 0.12), 0, tearY);
      g.addColorStop(0, 'rgba(20,18,15,0)');
      g.addColorStop(1, `rgba(20,18,15,${0.25 * Math.min(1, open * 4)})`);
      ctx.fillStyle = g;
      ctx.fillRect(-w, tearY - S * 0.2, w * 3, S * 0.4);
    }
    ctx.restore();
    // torn fibre edge
    if (open > 0) {
      ctx.lineWidth = S * 0.014;
      ctx.strokeStyle = '#faf7ef';
      ctx.beginPath();
      edge.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(120,100,70,0.4)';
      ctx.stroke();
    }
    ctx.restore();
  };
  pass(true);
  pass(false);
}

const edges = new Map<string, Pt[]>();
function tearEdge(w: number, y: number, S: number, seed: number) {
  const key = `${w}|${y}|${seed}`;
  const hit = edges.get(key);
  if (hit) return hit;
  const pts: Pt[] = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const x = -10 + ((w + 20) * i) / n;
    // the two halves share one tear, with slightly different fibres
    const base = fbm1(i * 0.21, 4) * S * 0.08 + noise1(i * 1.7, 9) * S * 0.012;
    const fib = noise1(i * 3.3, seed) * S * 0.006;
    pts.push([x, y + base + fib + Math.sin(i * 0.4) * S * 0.02]);
  }
  edges.set(key, pts);
  return pts;
}
