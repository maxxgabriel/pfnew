import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, lerp, seg } from '../core/math';
import { artImage, artSize, heroSeen, setActStyle, setPosesHidden, type ActStyle } from './art';
import { PAPER } from './common';

/*
 * THE SEAMS (round 32: "the transitions of each act look really bad… make
 * them the main part"). Between chapters both are drawn at once — the one
 * ending and the one beginning, each in its own art style — and each seam
 * has its own way of passing from one to the other, carrying him through it:
 *
 *   II  → III  the cartoon iris closes on him; the last circle is a hole in
 *              the page and he drops through it into the fall
 *   III → IV   the giant brush he'll surf on sweeps across the screen, a wet
 *              watercolour stroke in its wake with the sea in it
 *   IV  → V    the wave closes over him and we go under with him: the
 *              waterline sweeps up the screen, the deep below it
 *   V   → VI   in the black, the Spark's light spreads like an opening iris
 *              and shows the belly of the whale
 *   VI  → VII  he bursts out of the whale into the sky: a ring of air blasts
 *              out from him and the sky is behind it (both skies framed alike)
 *   VII → VIII one long pan down his painted stroke onto the new page (the
 *              two strokes meet: Chase's crosses (0.66w, 0.92h) where Home's
 *              begins one screen lower)
 * (I → II is one shot: the title drips into the road, src/sketch/still.ts,
 * and he turns pixel from his feet up, src/sketch/run.ts.)
 *
 * Everything is a pure function of the playhead, so it runs backwards too.
 */

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
}
/** where he was in each of the two renders */
interface SeamInfo { outHero: Hero; inHero: Hero }
interface Hero { x: number; y: number; top: number; face: number }

const SEAMS: Seam[] = [
  { into: 'Fold', a: 0.42, b: 0.5, draw: irisHole },
  { into: 'Wave', a: 0.62, b: 0.55, draw: brushWipe },
  { into: 'Deep', a: 0.95, b: 0.35, outL: (L) => Math.min(L, 3.85), inL: (L) => Math.max(L, -1), draw: waterline },
  { into: 'Light', a: 0.5, b: 0.6, draw: lightIris },
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
      setPosesHidden(hide);
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

/* ------------------------------------------------------------ II → III: the iris is a hole */

function irisHole(f: Frame, p: number, A: HTMLCanvasElement, Bc: HTMLCanvasElement, s: SeamInfo) {
  const g = f.ctx, d = dpr();
  const W = A.width, H = A.height;
  const cut = 0.47;
  const R0 = full(f) * 0.6;
  const o = s.outHero, n = s.inHero;
  const oc: Pt = [o.x * d, lerp(o.y, o.top, 0.55) * d];
  const small = Math.max(o.face, 30) * 1.7 * d;
  if (p < cut) {
    // the old cartoon's iris closes on him
    const r = lerp(R0, small, ease.inOut3(seg(p, 0, cut)));
    g.drawImage(A, 0, 0);
    g.fillStyle = '#060504';
    g.beginPath();
    g.rect(0, 0, W, H);
    g.arc(oc[0], oc[1], r, 0, TAU, true);
    g.fill('evenodd');
    return;
  }
  // the circle left is a hole in the page: through it, the fall — lined up on him, then the iris opens on it
  const u = seg(p, cut, 1);
  const open = ease.in3(seg(u, 0.15, 1));
  const r = lerp(small, R0, open);
  const nc: Pt = [n.x * d, lerp(n.y, n.top, 0.55) * d];
  const sc = lerp(clamp(o.face / Math.max(1, n.face), 0.4, 2.5), 1, ease.inOut2(seg(u, 0.1, 0.9)));
  const c: Pt = [lerp(oc[0], nc[0], ease.inOut2(seg(u, 0.1, 0.9))), lerp(oc[1], nc[1], ease.inOut2(seg(u, 0.1, 0.9)))];
  g.fillStyle = '#060504';
  g.fillRect(0, 0, W, H);
  g.save();
  g.beginPath();
  g.arc(c[0], c[1], r, 0, TAU);
  g.clip();
  g.translate(c[0], c[1]);
  g.scale(sc, sc);
  g.translate(-nc[0], -nc[1]);
  g.drawImage(Bc, 0, 0);
  g.restore();
  // its torn paper edge, while it is still a hole
  const tear = 1 - seg(u, 0.25, 0.6);
  if (tear > 0) {
    g.save();
    g.globalAlpha = tear;
    g.strokeStyle = '#efe8d8';
    g.lineWidth = Math.max(3, r * 0.08);
    blob(g, c[0], c[1], r * 1.02, 3.3, 0.06);
    g.stroke();
    g.strokeStyle = 'rgba(20,16,12,0.55)';
    g.lineWidth = Math.max(1.5, r * 0.025);
    blob(g, c[0], c[1], r * 1.08, 3.3, 0.07);
    g.stroke();
    g.restore();
  }
}

/* ------------------------------------------------------------ III → IV: the brush sweeps the sea in */

function brushWipe(f: Frame, p: number, A: HTMLCanvasElement, Bc: HTMLCanvasElement, _s: SeamInfo) {
  const g = f.ctx;
  const W = A.width, H = A.height;
  // the leading edge: a slanted line sweeping left to right; behind it, the new chapter under a wet wash
  const k = ease.inOut2(seg(p, 0.1, 0.9));
  const slant = H * 0.35;
  const ex = lerp(-W * 0.25 - slant, W * 1.25, k);
  const edgeX = (y: number) => ex + (y / H - 0.5) * slant + Math.sin(y / H * 11 + 1.3) * W * 0.012;
  g.drawImage(A, 0, 0);
  g.save();
  g.beginPath();
  g.moveTo(-10, -10);
  for (let i = 0; i <= 30; i++) { const y = (i / 30) * H; g.lineTo(edgeX(y), y); }
  g.lineTo(-10, H + 10);
  g.closePath();
  g.clip();
  g.drawImage(Bc, 0, 0);
  // the wash still wet just behind the brush: a band of translucent indigo, fading back to clear
  const band = W * 0.22;
  const gr = g.createLinearGradient(ex - band, 0, ex, 0);
  gr.addColorStop(0, 'rgba(48,70,128,0)');
  gr.addColorStop(0.75, 'rgba(48,70,128,0.28)');
  gr.addColorStop(1, 'rgba(30,45,95,0.5)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.restore();
  // the brush itself on the edge, its wet tip down the line, handle trailing up and back
  const im = artImage('brushprop_0');
  if (im && k > 0 && k < 1) {
    const [aw, ah] = artSize('brushprop_0');
    const len = H * 0.95, th = len * (ah / aw);
    g.save();
    g.translate(edgeX(H * 0.55), H * 0.55);
    g.rotate(Math.atan2(H, slant) + Math.PI);
    g.drawImage(im, -len * 0.62, -th / 2, len, th);
    g.restore();
  }
}

/* ------------------------------------------------------------ IV → V: under the waterline */

function waterline(f: Frame, p: number, A: HTMLCanvasElement, Bc: HTMLCanvasElement, s: SeamInfo) {
  const g = f.ctx, d = dpr();
  const W = A.width, H = A.height;
  const y0 = lerp(H * 1.08, -H * 0.1, ease.inOut2(seg(p, 0.3, 0.92)));
  const amp = H * 0.018, t = f.t;
  const edge = (x: number) => y0 + Math.sin(x / W * 9 + t * 3) * amp + Math.sin(x / W * 23 - t * 5) * amp * 0.35;
  g.drawImage(A, 0, 0);
  // below the line, the deep
  g.save();
  g.beginPath();
  g.moveTo(0, H);
  for (let i = 0; i <= 40; i++) { const x = (i / 40) * W; g.lineTo(x, edge(x)); }
  g.lineTo(W, H);
  g.closePath();
  g.clip();
  g.drawImage(Bc, 0, 0);
  // a few big bubbles rising past the line where he went in
  const n = s.inHero;
  for (let i = 0; i < 4; i++) {
    const q = (p * 1.6 + i * 0.27) % 1;
    const bx = (n.x + Math.sin(i * 2.3) * n.face * 1.4) * d, by = lerp(H * 1.05, y0, q);
    const br = n.face * d * (0.16 + (i % 2) * 0.1);
    g.strokeStyle = 'rgba(235,240,245,0.7)';
    g.lineWidth = Math.max(1.5, br * 0.14);
    g.beginPath();
    g.arc(bx + Math.sin(q * 9 + i) * br, by, br, 0, TAU);
    g.stroke();
  }
  g.restore();
  // the surface itself: a bright skin with a dark line under it
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(245,248,252,0.95)';
  g.lineWidth = Math.max(2, H * 0.006);
  g.beginPath();
  for (let i = 0; i <= 60; i++) { const x = (i / 60) * W; if (i) g.lineTo(x, edge(x)); else g.moveTo(x, edge(x)); }
  g.stroke();
  g.strokeStyle = 'rgba(10,12,16,0.45)';
  g.lineWidth = Math.max(3, H * 0.012);
  g.translate(0, H * 0.012);
  g.stroke();
  g.restore();
}

/* ------------------------------------------------------------ V → VI: the Spark lights the belly */

function lightIris(f: Frame, p: number, A: HTMLCanvasElement, Bc: HTMLCanvasElement, _s: SeamInfo) {
  const g = f.ctx, d = dpr();
  const W = A.width, H = A.height;
  const c: Pt = [f.w * 0.5 * d, f.h * 0.35 * d];
  g.drawImage(A, 0, 0);
  const k = seg(p, 0.32, 1);
  if (k <= 0) return;
  const R = lerp(f.h * 0.04 * d, full(f) * 0.62, ease.in2(k));
  // what the light reaches, with a soft falloff at its edge
  g.save();
  g.beginPath();
  g.arc(c[0], c[1], R, 0, TAU);
  g.clip();
  g.drawImage(Bc, 0, 0);
  const fall = g.createRadialGradient(c[0], c[1], R * 0.55, c[0], c[1], R);
  fall.addColorStop(0, 'rgba(0,0,0,0)');
  fall.addColorStop(1, 'rgba(0,0,0,0.95)');
  g.fillStyle = fall;
  g.fillRect(0, 0, W, H);
  g.restore();
  // the flare as it catches
  const fl = Math.sin(seg(p, 0.3, 0.6) * Math.PI);
  if (fl > 0) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], f.h * 0.35 * d);
    gl.addColorStop(0, `rgba(255,236,190,${0.55 * fl})`);
    gl.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, W, H);
    g.restore();
  }
}

/* ------------------------------------------------------------ VI → VII: he bursts out into the sky */

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

/* ------------------------------------------------------------ VII → VIII: down the stroke to the new page */

function panDown(f: Frame, p: number, A: HTMLCanvasElement, Bc: HTMLCanvasElement, _s: SeamInfo) {
  const g = f.ctx;
  const H = A.height;
  const u = ease.inOut2(p);
  // one long page: chapter VIII's stroke is his slide carried on (src/sketch/home.ts rideIn), so the two meet exactly
  g.fillStyle = PAPER;
  g.fillRect(0, 0, A.width, H);
  g.drawImage(A, 0, -u * H);
  g.drawImage(Bc, 0, (1 - u) * H);
}
