import type { Frame } from '../core/frame';
import { type Pt, TAU, ease, lerp, seg } from '../core/math';
import { drawPose, heroSeen, setActStyle, setPosesHidden, type ActStyle } from './art';
import { PAPER, faceOf } from './common';
import { bgImage } from './bg';
import { seaCamera } from './sea';

/* Six-chapter seams: continuous page-edge fall, sea-to-moon launch,
 * re-entry burst, and the painted stroke home. Pure playhead functions. */

export interface SeamChapter { name: string; from: number; draw: (f: Frame, L: number) => void }

interface Seam {
  /** the incoming chapter's name; its start is the seam's beat */
  into: string;
  /** beats before and after the seam that the transition takes */
  a: number;
  b: number;
  /** the outgoing chapter's local beat to draw (default: live until the seam, then held) */
  outL?: (L: number) => number;
  /** the incoming chapter's local beat to draw (default: held at its start until the seam, then live) */
  inL?: (L: number) => number;
  draw: (f: Frame, p: number, A: HTMLCanvasElement, Bc: HTMLCanvasElement, s: SeamInfo) => void;
  /** he is only in the live page: hidden in the outgoing one after the seam, in the incoming one before it */
  handOff?: boolean;
  carrier?: boolean;
}
/** where he was in each of the two renders */
interface SeamInfo { outHero: Hero; inHero: Hero }
interface Hero { x: number; y: number; top: number; face: number }

const SEAMS: Seam[] = [
  { into: 'Wave', a: 0.2, b: 0.8, draw: fallToSea, carrier: true },
  { into: 'Light', a: 0.85, b: 1.2, draw: moonLaunch, carrier: true },
  { into: 'Chase', a: 0.3, b: 0.5, draw: burst },
  { into: 'Home', a: 0.85, b: 0.6, draw: panDown, handOff: true },
];

let A: HTMLCanvasElement | null = null, Bc: HTMLCanvasElement | null = null;
const cv = (c: HTMLCanvasElement | null, W: number, H: number) => {
  const o = c ?? document.createElement('canvas');
  if (o.width !== W || o.height !== H) { o.width = W; o.height = H; }
  return o;
};

/** draw the film at this beat if a seam has it; returns false when no seam does */
export function drawSeam(f: Frame, chapters: SeamChapter[], styles: Record<string, ActStyle>): boolean {
  const { B, ctx } = f;
  for (const s of SEAMS) {
    const ci = chapters.findIndex((c) => c.name === s.into);
    if (ci <= 0) continue;
    const inn = chapters[ci], out = chapters[ci - 1];
    const at = inn.from;
    if (B < at - s.a || B >= at + s.b) continue;
    const p = seg(B, at - s.a, at + s.b);
    const W = ctx.canvas.width, H = ctx.canvas.height;
    A = cv(A, W, H);
    Bc = cv(Bc, W, H);
    const tm = ctx.getTransform();
    const render = (c: SeamChapter, L: number, target: HTMLCanvasElement, hide = false): Hero => {
      const g = target.getContext('2d')!;
      g.setTransform(tm);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      heroSeen.at = -1;
      setActStyle(styles[c.name] ?? null);
      setPosesHidden(hide || !!s.carrier);
      c.draw({ ...f, ctx: g }, L);
      setPosesHidden(false);
      setActStyle(null);
      return { x: heroSeen.x, y: heroSeen.y, top: heroSeen.top, face: heroSeen.face || f.h * 0.08 };
    };
    const Lo = B - out.from, Li = B - at;
    const outHero = render(out, s.outL ? s.outL(Lo) : Math.min(Lo, at - out.from - 0.001), A, !!s.handOff && B >= at);
    const inHero = render(inn, s.inL ? s.inL(Li) : Math.max(Li, 0.001), Bc, !!s.handOff && B < at);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    s.draw(f, p, A, Bc, { outHero, inHero });
    ctx.restore();
    return true;
  }
  return false;
}

/* ------------------------------------------------------------ helpers (all in device pixels) */

const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
const full = (f: Frame) => Math.hypot(f.w, f.h) * dpr();
/** a closed, softly wobbling curve round (cx, cy): radius r (smooth: quadratic curves through the points) */
function blob(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number, rough = 0.12) {
  const N = 28;
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const rr = r * (1 + rough * Math.sin(a * 3 + seed) + rough * 0.5 * Math.sin(a * 7 - seed * 1.7));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  g.beginPath();
  const mid = (i: number): Pt => { const p = pts[i % N], q = pts[(i + 1) % N]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
  const m0 = mid(N - 1);
  g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < N; i++) { const m = mid(i); g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  g.closePath();
}

/** A single falling drawing bridges the departing page and the sea's dive.
 * The page slides upward; the incoming sea always fills the canvas beneath it. */
function fallToSea(f: Frame, p: number, A: HTMLCanvasElement, Bc: HTMLCanvasElement) {
  const g = f.ctx, d = dpr(), W = A.width, H = A.height;
  g.drawImage(Bc, 0, 0);
  const page = ease.in3(seg(p, 0, 0.68));
  g.drawImage(A, 0, -H * page, W, H);
  g.save(); g.scale(d, d);
  const face = faceOf(f);
  const y = p < 0.2 ? lerp(f.h * 0.38, f.h * 0.43, p / 0.2)
    : lerp(f.h * 0.43, f.h * 0.72, ease.in2(seg(p, 0.2, 1)));
  setActStyle(p < 0.2 ? 'pixel' : 'water');
  drawPose(g, p < 0.2 ? 'runoff_3' : 'fall_3', lerp(f.w * 0.5, f.w * 0.42, ease.inOut2(p)), y, face);
  setActStyle(null); g.restore();
}

/** The sea's own painted moon grows around the upward flight. At closest
 * approach the circular painting yields to the curved lunar surface. */
function moonLaunch(f: Frame, p: number, A: HTMLCanvasElement, Bc: HTMLCanvasElement) {
  const g = f.ctx, d = dpr(), W = A.width, H = A.height;
  g.drawImage(A, 0, 0);
  const approach = ease.in3(seg(p, 0, 0.63));
  const camera = seaCamera(f.w, f.h, Math.min(5 + lerp(-0.85, 1.2, p), 4.999));
  const cx = lerp(camera.x * d, W * 0.5, approach), cy = lerp(camera.y * d, H * 0.28, approach);
  const r = lerp(camera.r * d, full(f) * 1.1, approach);
  const moon = bgImage('bg_inksea');
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
  g.fillStyle = '#d4d0c5'; g.fillRect(0, 0, W, H);
  // crop the existing sea painting's full moon: no new stylistic disc.
  if (moon) g.drawImage(moon, moon.naturalWidth * 0.36, moon.naturalHeight * 0.255,
    moon.naturalWidth * 0.285, moon.naturalHeight * 0.19, cx-r, cy-r, r*2, r*2);
  g.restore();
  g.save(); g.globalAlpha = ease.inOut2(seg(p, 0.58, 0.76)); g.drawImage(Bc, 0, 0); g.restore();
  g.save(); g.scale(d, d);
  const face = faceOf(f);
  const local = lerp(-0.85, 1.2, p);
  const launch = seg(local, -0.85, 0.55), landing = seg(local, 0.55, 1.2);
  const ejected = ((4.15 - 3.95) / (5 - 3.95)) ** 2;
  const startX = lerp(f.w * 0.42 + Math.sin(4.15 * 1.3) * face * 0.3, f.w * 0.5, ejected);
  const x = local < 0.55 ? lerp(startX, f.w * 0.5, ease.out2(launch))
    : lerp(f.w * 0.5, f.w * 0.36, ease.inOut2(landing));
  const y = local < 0.55 ? lerp(lerp(f.h * 0.72, -f.h * 0.2, ejected), -face * 3, ease.out2(launch))
    : lerp(-face * 3, f.h * 0.74, ease.in2(landing));
  setActStyle(local < 0 ? 'water' : 'comic');
  drawPose(g, local < 0.55 ? 'leap_2' : 'fall_3', x, y, face, { rot: local < 0.55 ? -launch * 0.3 : Math.PI * (1 - ease.inOut2(landing)) });
  setActStyle(null); g.restore();
}

/* ------------------------------------------------------------ IV → V: he bursts out into the sky */

function burst(f: Frame, p: number, A: HTMLCanvasElement, Bc: HTMLCanvasElement, s: SeamInfo) {
  const g = f.ctx, d = dpr();
  const W = A.width;
  const o = s.outHero;
  const c: Pt = [o.x * d, lerp(o.y, o.top, 0.5) * d];
  g.drawImage(A, 0, 0);
  const k = ease.out3(seg(p, 0.3, 0.85));
  if (k <= 0) return;
  // a ring of air blasting out from him: inside it, the open sky (and him, as he is in it)
  const R = k * full(f) * 0.75;
  g.save();
  blob(g, c[0], c[1], R, 4.4, 0.05);
  g.clip();
  g.drawImage(Bc, 0, 0);
  g.restore();
  const edge = 1 - seg(p, 0.7, 1);
  if (edge > 0) {
    // long rays of the blast (a few, long)
    g.save();
    g.globalAlpha = 0.35 * edge;
    g.strokeStyle = '#fff4e2';
    g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.4, r0 = R * 0.35, r1 = R * 0.95;
      g.lineWidth = Math.max(2, W * 0.005);
      g.beginPath();
      g.moveTo(c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0);
      g.lineTo(c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1);
      g.stroke();
    }
    g.restore();
    g.save();
    g.globalAlpha = edge;
    g.strokeStyle = '#fff4e2';
    g.lineWidth = Math.max(3, W * 0.012 * (1 - k * 0.6));
    blob(g, c[0], c[1], R, 4.4, 0.05);
    g.stroke();
    g.globalAlpha = edge * 0.5;
    g.lineWidth = Math.max(2, W * 0.004);
    blob(g, c[0], c[1], R * 0.86, 4.4, 0.05);
    g.stroke();
    g.restore();
  }
}

/* ------------------------------------------------------------ V → VI: down the stroke to the new page */

function panDown(f: Frame, p: number, A: HTMLCanvasElement, Bc: HTMLCanvasElement, _s: SeamInfo) {
  const g = f.ctx;
  const H = A.height;
  const u = ease.inOut2(p);
  // one long page: chapter VI's stroke is his slide carried on (src/sketch/home.ts rideIn), so the two meet exactly
  g.fillStyle = PAPER;
  g.fillRect(0, 0, A.width, H);
  g.drawImage(A, 0, -u * H);
  g.drawImage(Bc, 0, (1 - u) * H);
}
