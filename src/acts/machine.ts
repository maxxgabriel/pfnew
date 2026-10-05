import { ACT, type Frame } from '../core/frame';
import { type Pt, TAU, bell, clamp, ease, hash, lerp, seg, spline } from '../core/math';
import { CONFETTI, Particles } from '../core/particles';
import { marbleTwist } from '../core/marble';
import { halftone } from '../core/sprites';
import { C, F, font } from '../core/style';
import { drawBlot } from '../core/blot';
import { GOLD, drawBolt, drawCrackle } from '../core/bolt';

/*
 * ACT II — THE MACHINE.
 *
 * The ball drops out of the paper into a poster-coloured chain reaction that
 * spells one sentence as the ball runs through it: MAKE (jelly letters it
 * rolls across), THINGS (letters that fall like dominoes), THAT (a seesaw
 * that throws a little character into the air) and MOVE (a countdown on a
 * spring cannon that fires the ball out of the act). Charged gold on the way
 * up, the ball becomes lightning and tears up the screen: the cut to Alter.
 *
 * Every line "boils" — redrawn with fresh jitter twelve times a second — the
 * way hand-drawn animation does, so the frame is never still.
 */

const R = 4.2; // ball radius, in layout units

/* ----------------------------------------------------------- ball path */

interface Seg { b0: number; b1: number; at: (s: number) => Pt }

const FUN = { x: 50, top: 2, bot: 25, rTop: 30, rBot: 5 };
const MAKE = { y: 78, h: 20, x0: 8, w: 21 };
const THINGS = { y: 122, h: 22, x0: 6, w: 11, gap: 3.6 };
const SAW = { x: 34, y: 152, len: 56, tilt: 0.24 };
const CANNON = { x: 78, y: 214 };

const ramp: [Pt, Pt] = [[57, 40], [7, 52]];
const chute = spline([[7, 153], [6, 166], [12, 178], [28, 185], [50, 187], [CANNON.x - 6, 188]], 1);

function onRamp(s: number): Pt {
  const [a, b] = ramp;
  const x = lerp(a[0], b[0], s), y = lerp(a[1], b[1], s);
  // sit on top of the ramp surface: offset along the upward normal
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  return [x - (dy / l) * R, y + (dx / l) * R];
}

function makeTop(x: number, B: number): number {
  // the ball rides the letter tops, which squash under it
  return MAKE.y - MAKE.h - R + squashAt(x, B) * 5;
}

function squashAt(x: number, B: number) {
  const bx = ballX(B);
  const d = Math.abs(x - bx);
  return B > 9.0 && B < 9.8 ? Math.max(0, 1 - d / 9) : 0;
}

const SEGS: Seg[] = [
  // dropping out of the torn paper into the funnel's mouth
  { b0: 7.3, b1: 7.72, at: (s) => [50, lerp(-20, FUN.top + 3 + (FUN.rTop - R - 1) * 0.2, ease.in2(s))] },
  // round and round the funnel, faster as it narrows
  {
    b0: 7.72, b1: 8.45, at: (s) => {
      const k = ease.in2(s);
      const r = lerp(FUN.rTop - R - 1, 0, k);
      const th = k * TAU * 3.25 + Math.PI * 0.5;
      return [FUN.x + Math.cos(th) * r, lerp(FUN.top + 3, FUN.bot - 2, k) + Math.sin(th) * r * 0.2];
    },
  },
  { b0: 8.45, b1: 8.6, at: (s) => { const e = onRamp(0); return [lerp(50, e[0], s), lerp(FUN.bot - 2, e[1], ease.in2(s))]; } },
  { b0: 8.6, b1: 8.9, at: (s) => onRamp(ease.in2(s)) },
  {
    b0: 8.9, b1: 9.04, at: (s) => {
      const e = onRamp(1);
      return [lerp(e[0], MAKE.x0 + 3, s), lerp(e[1], MAKE.y - MAKE.h - R, ease.in2(s))];
    },
  },
  { b0: 9.04, b1: 9.72, at: (s) => [lerp(MAKE.x0 + 3, 94, ease.inOut2(s)), 0] },
  {
    b0: 9.72, b1: 9.92, at: (s) => [lerp(94, 95.5, s), lerp(MAKE.y - MAKE.h - R, THINGS.y - R, ease.in2(s))],
  },
  { b0: 9.92, b1: 10.6, at: (s) => [lerp(95.5, 5, ease.inOut2(s)), 0] },
  { b0: 10.6, b1: 10.72, at: (s) => { const e = onPlank(10.72); return [lerp(5, e[0], s), lerp(THINGS.y - R - 12, e[1], ease.in2(s))]; } },
  { b0: 10.72, b1: 10.92, at: (s) => onPlank(lerp(10.72, 10.92, s)) },
  { b0: 10.92, b1: 11.3, at: (s) => chute[Math.min(chute.length - 1, Math.floor(ease.in2(s) * (chute.length - 1)))].slice() as Pt },
  { b0: 11.3, b1: 11.42, at: (s) => [lerp(CANNON.x - 6, CANNON.x, s), lerp(188, cupY(11.42) - R - 1, ease.in2(s))] },
  { b0: 11.42, b1: 12.05, at: (s) => [CANNON.x, cupY(lerp(11.42, 12.05, s)) - R - 1] },
  { b0: 12.05, b1: 12.7, at: (s) => [CANNON.x - s * 30, cupY(12.05) - R - 1 - ease.out2(s) * 330] },
];

function cupY(B: number) {
  // compresses during the countdown, then fires
  const load = ease.inOut2(seg(B, 11.45, 12.0));
  const fire = ease.out5(seg(B, 12.0, 12.08));
  return CANNON.y - 16 + load * 9 - fire * 12;
}

function sawAngle(B: number) {
  const hit = seg(B, 10.72, 10.8);
  return lerp(SAW.tilt, -SAW.tilt, ease.outBack(hit, 2.4));
}
function sawEnd(side: -1 | 1, B: number): Pt {
  const a = sawAngle(B);
  return [SAW.x + Math.cos(a) * SAW.len * 0.5 * side, SAW.y + Math.sin(a) * SAW.len * 0.5 * side - 2.2];
}

function onPlank(B: number): Pt {
  const a = sawAngle(B);
  const d = SAW.len * 0.5 - 4;
  return [SAW.x - Math.cos(a) * d + Math.sin(a) * (R + 2.2), SAW.y - Math.sin(a) * d - Math.cos(a) * (R + 2.2)];
}

function ballRaw(B: number): Pt {
  let s = SEGS[0];
  for (const q of SEGS) if (B >= q.b0) s = q;
  const p = s.at(clamp((B - s.b0) / (s.b1 - s.b0)));
  if (s === SEGS[5]) p[1] = makeTop(p[0], B);
  if (s === SEGS[7]) p[1] = thingsTop(p[0], B);
  return p;
}
function ballX(B: number) {
  let s = SEGS[0];
  for (const q of SEGS) if (B >= q.b0) s = q;
  return s.at(clamp((B - s.b0) / (s.b1 - s.b0)))[0];
}

function thingsTop(x: number, B: number) {
  // climbs onto the fallen letters and rides along their leaning tops
  void B;
  const climb = seg(x, 93, 85) * (1 - seg(x, 6, 2));
  return THINGS.y - R - ease.inOut2(climb) * (THINGS.h - 1);
}

function dominoFall(i: number, B: number) {
  if (i < 0 || i > 5) return 0;
  const j = 5 - i; // S goes first
  return ease.in2(seg(B, 9.93 + j * 0.075, 9.93 + j * 0.075 + 0.11));
}

/* ------------------------------------------------------------- drawing */

let lastT = 0;
const confetti = new Particles(260, 160, 0.9);
let dots: CanvasPattern[] | null = null;

function boilIx(t: number) {
  return Math.floor(t * 12);
}

/** a polygon with hand-drawn jitter that changes twelve times a second */
function wob(ctx: CanvasRenderingContext2D, pts: Pt[], amp: number, seed: number, t: number, closed = true) {
  const k = boilIx(t);
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const jx = (hash(i * 3.1 + seed + k * 7.7) - 0.5) * amp;
    const jy = (hash(i * 5.7 + seed + k * 3.3) - 0.5) * amp;
    if (i) ctx.lineTo(x + jx, y + jy);
    else ctx.moveTo(x + jx, y + jy);
  });
  if (closed) ctx.closePath();
}

function circlePts(x: number, y: number, r: number, n = 22, sy = 1): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    out.push([x + Math.cos(a) * r, y + Math.sin(a) * r * sy]);
  }
  return out;
}

/** fill + ink outline + hard drop shadow: the machine's one way of drawing anything */
function shape(ctx: CanvasRenderingContext2D, pts: Pt[], fill: string, u: number, t: number, seed: number, shadow = true) {
  if (shadow) {
    ctx.save();
    ctx.translate(u * 0.9, u * 0.9);
    wob(ctx, pts, u * 0.35, seed, t);
    ctx.fillStyle = C.ink;
    ctx.fill();
    ctx.restore();
  }
  wob(ctx, pts, u * 0.35, seed, t);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = u * 0.6;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.ink;
  ctx.stroke();
}

export function drawMachine(f: Frame) {
  drawWorld(f, true);
}

/** During the tear the ball is drawn above the paper, so it can fall through it. */
export function drawMachineBall(f: Frame) {
  if (f.B < 6.85) return;
  const { ctx } = f;
  const v = view(f);
  // condenses out of the white-out with an overshoot, then hangs, then drops
  const pop = ease.outBack(seg(f.B, 6.85, 7.1), 2.6);
  ctx.save();
  ctx.translate(v.ox, -v.camY * f.u);
  ctx.scale(f.u, f.u);
  const [bx, by] = ballRaw(Math.max(7.3, f.B));
  const hang = f.B < 7.3 ? Math.sin(f.t * 2) * 0.8 : 0;
  ctx.translate(bx, by + hang);
  ctx.scale(pop, pop);
  drawBall(ctx, 0, 0, R, bx / R + by * 0.08 + f.t * (f.B < 7.3 ? 0.3 : 0), f.t, 1);
  ctx.restore();
}

/** where the ball is on screen at beat B: [x, y, radius] */
export function machineBall(f: Frame, B: number): [number, number, number] {
  const { ox, camY } = view({ ...f, B });
  const [bx, by] = ballRaw(B);
  return [ox + bx * f.u, (by - camY) * f.u, R * f.u];
}

function view(f: Frame) {
  const { w, h, u, B } = f;
  const ox = (w - 100 * u) / 2;
  const screenH = h / u;
  // the camera trails the ball by a few frames of scroll, like a handheld follow
  let cy = 0;
  const N = 6;
  for (let k = 0; k < N; k++) cy += ballRaw(Math.max(7.3, B - k * 0.03))[1];
  cy /= N;
  let camY = cy - screenH * 0.44;
  // hold on the paper for the drop
  camY = lerp(-screenH * 0.42 - 20, camY, ease.inOut2(seg(B, 7.3, 7.7)));
  return { ox, camY, screenH };
}

function drawWorld(f: Frame, withBall: boolean) {
  const { ctx, w, h, u, B, t } = f;
  const dt = Math.min(0.05, t - lastT || 0.016);
  lastT = t;
  const { ox, camY, screenH } = view(f);
  if (!dots) dots = [halftone(48, 3.2, 'rgba(0,0,0,0.13)'), halftone(48, 3.2, 'rgba(255,255,255,0.12)')].map((c) => ctx.createPattern(c, 'repeat')!);

  // ---- background bands, each with its own drifting pattern
  const bands: [number, string, number][] = [
    [-400, C.blue, 0],
    [62, C.red, 1],
    [128, '#ffd23e', 0],
    [176, C.blue, 0],
  ];
  for (let i = 0; i < bands.length; i++) {
    const [y0, col, pat] = bands[i];
    const y1 = bands[i + 1]?.[0] ?? 2000;
    const sy0 = (y0 - camY * 0.9) * u, sy1 = (y1 - camY * 0.9) * u;
    if (sy1 < -20 || sy0 > h + 20) continue;
    ctx.fillStyle = col;
    ctx.beginPath();
    // zigzag edges between bands
    const zz = (yy: number, dir: number) => {
      const n = Math.ceil(w / (6 * u)) + 2;
      for (let k = 0; k <= n; k++) {
        const x = dir > 0 ? k * 6 * u - 3 * u : w + 3 * u - k * 6 * u;
        ctx.lineTo(x, yy + ((k % 2) * 2 - 1) * 1.6 * u);
      }
    };
    ctx.moveTo(-3 * u, sy0);
    zz(sy0, 1);
    zz(sy1, -1);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.translate((t * 10) % 48, ((-camY * 0.6 * u) % 48) + ((t * 6) % 48));
    ctx.fillStyle = dots[pat];
    ctx.fillRect(-60, -60, w + 120, h + 120);
    ctx.restore();
  }

  // ---- floating confetti shapes (parallax layer)
  drawFloaters(ctx, w, h, u, camY, t);

  // ---- the machine
  ctx.save();
  ctx.translate(ox, -camY * u);
  ctx.scale(u, u);
  const U = 1; // inside here, one unit is one layout unit
  const vis = (y0: number, y1: number) => y1 > camY - 10 && y0 < camY + screenH + 10;

  if (vis(-10, 40)) drawFunnel(ctx, U, t);
  if (vis(20, 60)) drawRamp(ctx, U, t);
  if (vis(40, 90)) drawMAKE(ctx, B, t);
  if (vis(85, 135)) drawTHINGS(ctx, B, t);
  if (vis(125, 165)) drawSeesaw(ctx, B, t);
  if (vis(150, 205)) drawChute(ctx, t);
  if (vis(150, 260)) drawCannon(ctx, B, t);
  drawGears(ctx, t, camY, screenH);
  drawBlobs(ctx, B, t, camY, screenH);

  // launch: the MOVE countdown fires confetti
  if (f.crossedFwd(12.0)) {
    const cols = [C.paper, C.green, C.red, C.blue, '#ffd23e'];
    for (const c of cols) confetti.burst(CANNON.x, cupY(12.0) - 6, 18, 120, { color: c, kind: CONFETTI, size: 1.2, max: 2.6, dir: -Math.PI / 2, spread: 1.6 });
    f.shake(f.u * 3);
  }
  if (f.crossedFwd(10.74)) f.shake(f.u * 1.2);
  confetti.gravity = 60;
  confetti.update(dt);
  confetti.draw(ctx);

  if (withBall && B >= 7.9) {
    const [bx, by] = ballRaw(B);
    const fly = seg(B, 12.05, 12.2);
    drawBall(ctx, bx, by, R, bx / R + by * 0.08 + fly * 20, t, 1 + fly * 0.25);
    if (fly > 0) speedLines(ctx, bx, by, t);
    // as it climbs it charges up, crackling gold, about to become lightning
    const charge = seg(B, 12.12, 12.3);
    if (charge > 0) drawCrackle(ctx, bx, by, R * (2 + charge * 2), t, charge, 6);
  }
  ctx.restore();
  void U;
}

/* --------------------------------------------------------------- pieces */


export function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, t: number, stretch = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.save();
  ctx.translate(r * 0.22, r * 0.22);
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.scale(1 / Math.sqrt(stretch), stretch);
  // the marble, poster-printed: pale glass, the red and blue twist, an ink rim
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = '#d9f1fb';
  ctx.fill();
  ctx.save();
  ctx.clip();
  marbleTwist(ctx, r, rot, [C.red, C.blue]);
  ctx.restore();
  // shade + rim
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(20,18,15,0.28)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  // the glass window
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -r * 0.42, r * 0.24, r * 0.13, -0.6, 0, TAU);
  ctx.fill();
  wob(ctx, circlePts(0, 0, r, 20), r * 0.08, 7, t);
  ctx.lineWidth = r * 0.16;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.restore();
}

function speedLines(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.strokeStyle = C.paper;
  ctx.lineCap = 'round';
  const k = boilIx(t);
  for (let i = 0; i < 14; i++) {
    const ox = (hash(i + k * 13) - 0.5) * 40;
    const len = 12 + hash(i * 7 + k) * 30;
    ctx.lineWidth = 0.6 + hash(i * 3) * 1.2;
    ctx.beginPath();
    ctx.moveTo(x + ox, y + 8 + hash(i * 11 + k) * 20);
    ctx.lineTo(x + ox, y + 8 + len + hash(i * 11 + k) * 20);
    ctx.stroke();
  }
}

function drawFunnel(ctx: CanvasRenderingContext2D, u: number, t: number) {
  const { x, top, bot, rTop, rBot } = FUN;
  // back wall
  const back: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI;
    back.push([x + Math.cos(a) * rTop, top + Math.sin(a) * rTop * 0.2]);
  }
  const body: Pt[] = [
    [x - rTop, top], [x - rBot, bot], [x - rBot, bot + 8], [x + rBot, bot + 8], [x + rBot, bot], [x + rTop, top],
  ];
  shape(ctx, body, C.green, u, t, 11);
  // the inside, with stripes that spin
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - rTop + 1, top);
  ctx.lineTo(x - rBot + 0.6, bot);
  ctx.lineTo(x + rBot - 0.6, bot);
  ctx.lineTo(x + rTop - 1, top);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#5c8f1a';
  ctx.fillRect(x - rTop, top - 10, rTop * 2, bot - top + 10);
  ctx.strokeStyle = 'rgba(20,18,15,0.35)';
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 9; k++) {
    const ph = ((k / 9 + t * 0.35) % 1) * Math.PI;
    const tx = x + Math.cos(ph) * rTop, bx = x + Math.cos(ph) * rBot;
    ctx.beginPath();
    ctx.moveTo(tx, top);
    ctx.lineTo(bx, bot);
    ctx.stroke();
  }
  ctx.restore();
  // rim ellipse
  wob(ctx, circlePts(x, top, rTop, 30, 0.2), u * 0.3, 12, t);
  ctx.lineWidth = u * 0.6;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  void back;
  // label on the funnel
  ctx.save();
  ctx.font = font(4.2, F.display);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.ink;
  ctx.fillText('IN', x, bot + 6.2);
  ctx.restore();
}

function drawRamp(ctx: CanvasRenderingContext2D, u: number, t: number) {
  const [a, b] = ramp;
  const th = 2.6;
  shape(ctx, [[a[0] + 2, a[1] - 0.5], [b[0] - 3, b[1] - 0.5], [b[0] - 3, b[1] + th], [a[0] + 2, a[1] + th]], C.paper, u, t, 21);
  // little legs
  for (const k of [0.25, 0.75]) {
    const x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k);
    shape(ctx, [[x - 0.8, y + th], [x + 0.8, y + th], [x + 0.8, y + th + 6], [x - 0.8, y + th + 6]], C.ink, u, t, 22 + k, false);
  }
}

function letter(
  ctx: CanvasRenderingContext2D, ch: string, cx: number, base: number, hgt: number,
  face: string, sy: number, rot: number, t: number, seed: number,
) {
  ctx.save();
  ctx.translate(cx, base);
  ctx.rotate(rot);
  ctx.scale(1 + (1 - sy) * 0.6, sy);
  const px = hgt * 1.32;
  ctx.font = font(px, F.display);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const k = boilIx(t);
  const jx = (hash(seed + k) - 0.5) * 0.35, jy = (hash(seed * 3 + k) - 0.5) * 0.35;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.4;
  // extrusion
  for (let d = 2.2; d > 0; d -= 0.45) {
    ctx.fillStyle = C.ink;
    ctx.fillText(ch, d + jx, d * 0.6 + jy - hgt * 0.02);
  }
  ctx.strokeText(ch, jx, jy - hgt * 0.02);
  ctx.fillStyle = face;
  ctx.fillText(ch, jx, jy - hgt * 0.02);
  ctx.restore();
}

function drawMAKE(ctx: CanvasRenderingContext2D, B: number, t: number) {
  const cols = [C.paper, C.green, C.blue, C.paper];
  // shelf
  shape(ctx, [[MAKE.x0 - 4, MAKE.y], [MAKE.x0 + 4 * MAKE.w + 4, MAKE.y], [MAKE.x0 + 4 * MAKE.w + 4, MAKE.y + 3], [MAKE.x0 - 4, MAKE.y + 3]], C.ink, 1, t, 31, false);
  'MAKE'.split('').forEach((ch, i) => {
    const cx = MAKE.x0 + MAKE.w * (i + 0.5);
    const sq = squashAt(cx, B);
    // jelly: squash under the ball, then wobble back with a decaying spring
    const after = B > 9.04 && ballX(B) > cx + 8 ? Math.exp(-(B - 9.04) * 2) : 0;
    const jig = Math.sin(t * 9 + i) * 0.03 * (0.4 + after) + Math.sin(t * 2.2 + i * 1.3) * 0.015;
    const sy = 1 - sq * 0.24 + jig;
    letter(ctx, ch, cx, MAKE.y, MAKE.h, cols[i], sy, 0, t, i + 3);
  });
}

function drawTHINGS(ctx: CanvasRenderingContext2D, B: number, t: number) {
  const { x0, y, w, gap, h } = THINGS;
  shape(ctx, [[x0 - 4, y], [97, y], [97, y + 3], [x0 - 4, y + 3]], C.ink, 1, t, 41, false);
  const cols = [C.red, C.paper, C.green, C.red, C.paper, C.blue];
  'THINGS'.split('').forEach((ch, i) => {
    const fall = dominoFall(i, B);
    const left = x0 + i * (w + gap);
    // dominoes pivot on their bottom-left corner; the last one lies flat
    const ang = -fall * (i === 0 ? Math.PI / 2 : 0.74);
    ctx.save();
    ctx.translate(left, y);
    ctx.rotate(ang);
    // idle shiver before the fall
    const shiver = fall === 0 ? Math.sin(t * 7 + i * 2) * 0.012 : 0;
    ctx.rotate(shiver);
    // the domino slab
    shape(ctx, [[0, 0], [w, 0], [w, -h], [0, -h]], cols[i], 1, t, 50 + i);
    ctx.restore();
    ctx.save();
    ctx.translate(left, y);
    ctx.rotate(ang + shiver);
    ctx.font = font(h * 0.62, F.display);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cols[i] === C.paper ? C.ink : C.paper;
    ctx.fillText(ch, w / 2, -h / 2 + 0.6);
    ctx.restore();
  });
}

function drawSeesaw(ctx: CanvasRenderingContext2D, B: number, t: number) {
  const a = sawAngle(B);
  // pivot
  shape(ctx, [[SAW.x - 6, SAW.y + 12], [SAW.x, SAW.y], [SAW.x + 6, SAW.y + 12]], C.red, 1, t, 61);
  ctx.save();
  ctx.translate(SAW.x, SAW.y);
  ctx.rotate(a);
  const L = SAW.len / 2;
  shape(ctx, [[-L, -2.2], [L, -2.2], [L, 1.4], [-L, 1.4]], C.paper, 1, t, 62);
  ctx.font = font(3, F.display);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.ink;
  ctx.fillText('T  H  A  T', 0, -0.3);
  ctx.restore();
  // shelf the character lands on
  shape(ctx, [[80, 128], [99, 128], [99, 131], [80, 131]], C.ink, 1, t, 63, false);
}

function drawChute(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = (off: number) => {
    ctx.beginPath();
    chute.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + off) : ctx.moveTo(x, y + off)));
  };
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3.4;
  path(R + 1.8);
  ctx.stroke();
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 1.8;
  path(R + 1.8);
  ctx.stroke();
  // sleepers
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < chute.length; i += 6) {
    const [x, y] = chute[i];
    ctx.beginPath();
    ctx.moveTo(x, y + R + 1);
    ctx.lineTo(x, y + R + 5);
    ctx.stroke();
  }
  ctx.restore();
  void t;
}

function drawCannon(ctx: CanvasRenderingContext2D, B: number, t: number) {
  const { x, y } = CANNON;
  const cy = cupY(B);
  // MOVE, lit one letter per count
  const word = 'MOVE';
  const lit = [11.5, 11.65, 11.8, 11.95];
  const fire = seg(B, 12.0, 12.4);
  word.split('').forEach((ch, i) => {
    const on = seg(B, lit[i], lit[i] + 0.06);
    const pop = on > 0 && on < 1 ? 1 + Math.sin(on * Math.PI) * 0.35 : 1;
    const burst = 1 + ease.outBack(fire) * 0.35;
    const lx = 13.5 + i * 15 + (i - 1.5) * fire * 6;
    const ly = y + 14 + Math.sin(t * 3 + i) * 0.4;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.scale(pop * burst, pop * burst);
    ctx.rotate((i - 1.5) * 0.06 + (fire > 0 ? Math.sin(t * 30 + i) * 0.05 * (1 - fire) : 0));
    letter(ctx, ch, 0, 0, 15, on > 0 ? [C.red, C.green, C.blue, C.paper][i] : '#2d2a26', 1, 0, t, 70 + i);
    ctx.restore();
  });
  // countdown pip
  const n = lit.filter((b) => B >= b).length;
  if (B > 11.4 && B < 12.05) {
    ctx.font = font(5, F.display);
    ctx.fillStyle = C.paper;
    ctx.textAlign = 'center';
    ctx.fillText(['3', '2', '1', 'GO!', 'GO!'][n] ?? '', x + 15, cy - 10);
  }
  // base
  shape(ctx, [[x - 12, y], [x + 12, y], [x + 10, y + 14], [x - 10, y + 14]], C.red, 1, t, 81);
  // spring coil
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  const turns = 7;
  for (let i = 0; i <= turns * 2; i++) {
    const yy = lerp(y, cy + 2, i / (turns * 2));
    ctx.lineTo(x + (i % 2 ? 5 : -5), yy);
  }
  ctx.stroke();
  // cup
  shape(ctx, [[x - 7, cy - 1], [x + 7, cy - 1], [x + 5, cy + 3], [x - 5, cy + 3]], C.paper, 1, t, 82);
}

function drawGears(ctx: CanvasRenderingContext2D, t: number, camY: number, screenH: number) {
  const gears: [number, number, number, number, string][] = [
    [-4, 30, 9, 1, C.red], [5, 44, 6, -1.5, C.paper], [104, 96, 10, -0.8, C.green], [96, 110, 6, 1.33, C.paper],
    [-2, 140, 8, 1.1, C.blue], [102, 170, 9, -1, C.red], [92, 182, 5, 1.8, C.paper],
  ];
  for (const [x, y, r, sp, col] of gears) {
    if (y + r < camY - 5 || y - r > camY + screenH + 5) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * sp * 0.8);
    const pts: Pt[] = [];
    const teeth = Math.round(r * 1.4);
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * TAU;
      const rr = i % 2 ? r : r * 0.8;
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    shape(ctx, pts, col, 1, t, x + y);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

/* ---------------------------------------------------------------- blobs */

interface Blob { x: number; y: number; r: number; col: string; seed: number }
const BLOBS: Blob[] = [
  { x: 91, y: 44 - 5 * 1.15, r: 5, col: C.red, seed: 1 },
  { x: 8, y: 101 - 4.5 * 1.15, r: 4.5, col: C.green, seed: 2 },
  { x: 90, y: 128 - 4.2 * 1.15, r: 4.2, col: C.paper, seed: 3 }, // lands here after the seesaw
  { x: 13.5, y: 213 - 5 * 1.15, r: 5, col: C.green, seed: 4 },
  { x: 58.5, y: 213 - 4 * 1.15, r: 4, col: C.red, seed: 5 },
];
const LEDGES: [number, number, number][] = [[91, 44, 8], [8, 101, 8]];

function drawBlobs(ctx: CanvasRenderingContext2D, B: number, t: number, camY: number, screenH: number) {
  const [bx, by] = ballRaw(B);
  for (const [lx, ly, lw] of LEDGES) {
    if (ly < camY - 5 || ly > camY + screenH + 5) continue;
    shape(ctx, [[lx - lw / 2, ly], [lx + lw / 2, ly], [lx + lw / 2, ly + 2.4], [lx - lw / 2, ly + 2.4]], C.ink, 1, t, lx, false);
  }
  BLOBS.forEach((b, i) => {
    let x = b.x, y = b.y, rot = 0, sq = 1;
    if (i === 2) {
      // rides the seesaw, gets thrown, flips, lands on the shelf
      const end = sawEnd(1, Math.min(B, 10.74));
      const fly = seg(B, 10.75, 11.15);
      if (fly <= 0) {
        x = end[0] - 2;
        y = end[1] - b.r * 1.15 + 1;
      } else {
        x = lerp(end[0] - 2, b.x, fly);
        y = lerp(end[1] - b.r * 1.15 + 1, b.y, fly) - Math.sin(fly * Math.PI) * 34;
        rot = ease.inOut2(fly) * TAU;
        sq = fly > 0.95 ? 0.75 : 1 + Math.sin(fly * Math.PI) * 0.15;
      }
    }
    if (y + 12 < camY || y - 12 > camY + screenH) return;
    // excitement when the ball goes by
    const near = Math.max(0, 1 - Math.hypot(bx - x, by - y) / 40);
    const hop = Math.abs(Math.sin(t * (4 + near * 6) + b.seed)) * (0.8 + near * 4);
    const breathe = 1 + Math.sin(t * 2.4 + b.seed) * 0.04;
    if (i === 2) {
      // the see-saw passenger is Blot
      const flying = B > 10.75 && B < 11.15;
      const landed = B >= 11.15;
      drawBlot(ctx, x, y + b.r * 1.15 - (rot ? 0 : hop * 0.6), b.r * 2.7, {
        t, pose: flying ? 'fall' : landed ? 'cheer' : near > 0.4 ? 'shock' : 'idle',
        look: [bx, by], rot, seed: 2, squash: sq < 1 ? (1 - sq) * 1.2 : 0, wind: flying ? -1 : 0.5,
      });
      return;
    }
    drawBlob(ctx, x, y - (rot ? 0 : hop), b.r, b.col, rot, sq * breathe, bx, by, t, b.seed, near);
  });
}

function drawBlob(
  ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, rot: number, sq: number,
  lx: number, ly: number, t: number, seed: number, near: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1 / Math.sqrt(sq), sq);
  // feet
  ctx.fillStyle = C.ink;
  ctx.fillRect(-r * 0.5, r * 0.7, r * 0.3, r * 0.45);
  ctx.fillRect(r * 0.2, r * 0.7, r * 0.3, r * 0.45);
  shape(ctx, circlePts(0, 0, r, 18), col, 1, t, seed * 9);
  // eyes follow the ball
  const a = Math.atan2(ly - y, lx - x) - rot;
  const blink = (t + seed * 1.7) % 4 < 0.12;
  for (const ex of [-0.36, 0.36]) {
    const cx = ex * r, cy = -r * 0.15;
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.27, blink ? r * 0.04 : r * 0.32, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 0.4;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    if (!blink) {
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 0.12, cy + Math.sin(a) * r * 0.15, r * 0.14, 0, TAU);
      ctx.fill();
    }
  }
  // mouth: a smile that opens into an "o" when the ball is close
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  if (near > 0.5) {
    ctx.fillStyle = C.ink;
    ctx.ellipse(0, r * 0.38, r * 0.14, r * 0.18 * near, 0, 0, TAU);
    ctx.fill();
  } else {
    ctx.arc(0, r * 0.22, r * 0.22, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFloaters(ctx: CanvasRenderingContext2D, w: number, h: number, u: number, camY: number, t: number) {
  const kinds = 4;
  for (let i = 0; i < 26; i++) {
    const px = hash(i * 3.3) * w;
    const wy = -60 + hash(i * 7.1) * 320;
    const py = (wy - camY * 0.55) * u + Math.sin(t * 0.8 + i) * u * 1.5;
    if (py < -40 || py > h + 40) continue;
    const s = u * (1.6 + hash(i * 1.9) * 2.4);
    const rot = t * (hash(i) - 0.5) * 2 + i;
    const col = [C.paper, C.ink, C.green, C.red][i % 4];
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = u * 0.6;
    ctx.lineCap = 'round';
    const kind = i % kinds;
    ctx.beginPath();
    if (kind === 0) {
      ctx.arc(0, 0, s * 0.5, 0, TAU);
      ctx.fill();
    }
    else if (kind === 1) {
      ctx.moveTo(0, -s * 0.6); ctx.lineTo(s * 0.55, s * 0.4); ctx.lineTo(-s * 0.55, s * 0.4); ctx.closePath(); ctx.fill();
    } else if (kind === 2) {
      for (let k = 0; k <= 12; k++) ctx.lineTo(-s + (k / 12) * s * 2, Math.sin(k * 1.2 + t * 4) * s * 0.3);
      ctx.stroke();
    } else {
      ctx.moveTo(-s * 0.5, 0); ctx.lineTo(s * 0.5, 0); ctx.moveTo(0, -s * 0.5); ctx.lineTo(0, s * 0.5); ctx.stroke();
    }
    ctx.restore();
  }
  void bell;
}

/* ------------------------------------------------------------- the cut */

/**
 * The cut out of the machine: the charged ball becomes a gold bolt that
 * tears up the screen and bleaches the frame, then its afterimage stays
 * burned on the eye over the night sky for a moment.
 */
export function drawMachineCut(f: Frame) {
  const { B } = f;
  const [b0, b1] = ACT.cut;
  if (B < b1) cutBolt(f, seg(B, b0, b1), 1);
  else cutBolt(f, 1, 1 - seg(B, b1, b1 + 0.1));
}

function cutBolt(f: Frame, q: number, alpha: number) {
  const { ctx, w, h, t } = f;
  const S = Math.min(w, h);
  if (q <= 0 || alpha <= 0) return;
  // a jagged column from the bottom of the screen to the top
  const path: Pt[] = [[w * 0.55, h * 1.05], [w * 0.38, h * 0.75], [w * 0.62, h * 0.5], [w * 0.4, h * 0.28], [w * 0.58, -h * 0.05]];
  const head = ease.out3(seg(q, 0, 0.7));
  const shown: Pt[] = [];
  const n = path.length - 1;
  for (let i = 0; i <= n; i++) {
    if (i / n <= head) shown.push(path[i]);
    else {
      const k = (head - (i - 1) / n) * n;
      shown.push([lerp(path[i - 1][0], path[i][0], k), lerp(path[i - 1][1], path[i][1], k)]);
      break;
    }
  }
  if (q > 0.5 && alpha === 1) {
    // the whole frame bleaches as it connects
    const k = seg(q, 0.5, 1);
    ctx.fillStyle = `rgba(255,246,214,${k * 0.85})`;
    ctx.fillRect(0, 0, w, h);
  }
  drawBolt(ctx, shown, t, { width: S * 0.012 * alpha, amp: S * 0.05, seed: 17, alpha, branches: 12 });
  if (f.crossedFwd(ACT.cut[0] + 0.05)) {
    f.shake(S * 0.05);
    f.flash(0.5, GOLD.hot);
  }
}
