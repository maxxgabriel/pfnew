import { drawBlot } from '../core/blot';
import { drawBolt, drawCrackle, GOLD, jag } from '../core/bolt';
import type { Frame } from '../core/frame';
import { type Pt, TAU, bell, clamp, ease, hash, lerp, rng, seg } from '../core/math';
import { drawSprite, glow, halftone, withAlpha } from '../core/sprites';
import { C, extruded } from '../core/style';
import { drawBall, drawMachine } from './machine';
import { drawMatch } from './match';

/*
 * TITAN.
 *
 * Green lost the duel and fell into a poster. Green's answer is a machine:
 * the letters of MAKE THINGS THAT MOVE unbolt and assemble into a giant
 * robot, Green at the controls behind the visor, the O of MOVE its reactor.
 * A transformation sequence — rivets popping, plates locking, steam, the eyes
 * lighting up — then a low-angle hero shot, and TITAN punches the ball into
 * the sky. It goes up so hard it turns into a gold bolt, and the bolt splits
 * the picture in two: the halves slide apart and behind them is the back of
 * the page, where ALTER begins.
 *
 * Plays inside a hold (`titan`) as the machine reaches its cannon.
 */

const Y = '#ffd23e';
type Sh = { name: string; dur: number; draw: (g: G, q: number) => void; flash?: string | null };
interface G { f: Frame; ctx: CanvasRenderingContext2D; w: number; h: number; S: number; t: number; portrait: boolean }

const SHOTS: Sh[] = [
  { name: 'wake', dur: 0.7, draw: shotWake, flash: null },
  { name: 'assemble', dur: 1.3, draw: shotAssemble },
  { name: 'ignite', dur: 0.6, draw: shotIgnite },
  { name: 'hero', dur: 0.7, draw: shotHero },
  { name: 'punch', dur: 0.9, draw: shotPunch },
  { name: 'split', dur: 0.9, draw: shotSplit, flash: null },
];
const TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0);
let lastShot = -1, lastQ = 0;
let hitQ: (x: number) => boolean = () => false;

export function titanShotP(name: string, q = 0.5) {
  let acc = 0;
  for (const s of SHOTS) {
    if (s.name === name) return (acc + s.dur * clamp(q)) / TOTAL;
    acc += s.dur;
  }
  return 0;
}

export function drawTitan(f: Frame, p: number) {
  const { ctx, w, h, t } = f;
  const g: G = { f, ctx, w, h, S: Math.min(w, h), t, portrait: h > w };
  let acc = 0, i = 0;
  const at = clamp(p) * TOTAL;
  while (i < SHOTS.length - 1 && acc + SHOTS[i].dur <= at) acc += SHOTS[i++].dur;
  const q = clamp((at - acc) / SHOTS[i].dur);
  const shot = SHOTS[i];
  if (i !== lastShot && lastShot >= 0 && Math.abs(i - lastShot) === 1 && !f.reduced && shot.flash !== null) f.shake(g.S * 0.01);
  const prevQ = i === lastShot ? lastQ : -1;
  lastShot = i;
  lastQ = q;
  hitQ = (x: number) => prevQ >= 0 && prevQ < x && q >= x;
  ctx.save();
  shot.draw(g, q);
  ctx.restore();
  if (i > 0 && shot.flash !== null) {
    const a = 1 - clamp(q / 0.05);
    if (a > 0) {
      ctx.fillStyle = `rgba(255,251,230,${0.5 * a})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

/* ---------------------------------------------------------- the poster */

let dots: CanvasPattern | null = null;
function poster(g: G, o: { burst?: number; ground?: number } = {}) {
  const { ctx, w, h, S, t } = g;
  ctx.fillStyle = C.blue;
  ctx.fillRect(0, 0, w, h);
  // the sunburst behind a hero
  const burst = o.burst ?? 0;
  if (burst > 0) {
    const cx = w / 2, cy = h * 0.42;
    ctx.save();
    ctx.globalAlpha = burst;
    ctx.fillStyle = '#4a72ff';
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU + t * 0.05;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * h * 2, cy + Math.sin(a) * h * 2);
      ctx.lineTo(cx + Math.cos(a + TAU / 36) * h * 2, cy + Math.sin(a + TAU / 36) * h * 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  if (!dots) dots = ctx.createPattern(halftone(48, 3.2, 'rgba(0,0,0,0.13)'), 'repeat');
  ctx.save();
  ctx.translate((t * 10) % 48, (t * 6) % 48);
  ctx.fillStyle = dots!;
  ctx.fillRect(-60, -60, w + 120, h + 120);
  ctx.restore();
  // the ground: a red band with a zigzag edge
  const gy = o.ground ?? h * 0.86;
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.moveTo(-10, h + 10);
  const n = Math.ceil(w / (S * 0.04)) + 2;
  for (let k = 0; k <= n; k++) ctx.lineTo(k * S * 0.04 - S * 0.02, gy + (k % 2 ? -1 : 1) * S * 0.008);
  ctx.lineTo(w + 10, h + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(2, S * 0.006);
  ctx.stroke();
}

/* ------------------------------------------------------------- the robot */

/** one part: a block in poster colours with a letter extruded on it */
interface Part { id: string; ch: string; col: string; w: number; h: number }
const PARTS: Record<string, Part> = {
  footL: { id: 'footL', ch: '', col: C.paper, w: 0.26, h: 0.06 },
  footR: { id: 'footR', ch: '', col: C.paper, w: 0.26, h: 0.06 },
  shinL: { id: 'shinL', ch: 'A', col: Y, w: 0.15, h: 0.2 },
  shinR: { id: 'shinR', ch: 'E', col: C.green, w: 0.15, h: 0.2 },
  thighL: { id: 'thighL', ch: 'M', col: C.red, w: 0.17, h: 0.2 },
  thighR: { id: 'thighR', ch: 'K', col: C.blue, w: 0.17, h: 0.2 },
  pelvis: { id: 'pelvis', ch: 'THAT', col: C.paper, w: 0.44, h: 0.09 },
  torso: { id: 'torso', ch: '', col: Y, w: 0.56, h: 0.34 },
  upperL: { id: 'upperL', ch: 'T', col: C.blue, w: 0.13, h: 0.2 },
  lowerL: { id: 'lowerL', ch: 'H', col: C.paper, w: 0.12, h: 0.18 },
  fistL: { id: 'fistL', ch: 'I', col: C.red, w: 0.15, h: 0.13 },
  upperR: { id: 'upperR', ch: 'N', col: C.green, w: 0.13, h: 0.2 },
  lowerR: { id: 'lowerR', ch: 'G', col: C.red, w: 0.12, h: 0.18 },
  fistR: { id: 'fistR', ch: 'S', col: Y, w: 0.17, h: 0.15 },
  head: { id: 'head', ch: '', col: C.paper, w: 0.24, h: 0.18 },
};

interface Pose { armL: [number, number]; armR: [number, number]; crouch: number; eyes: number; core: number; steam: number }

/** the frame of the robot: every part's centre and angle, H tall, feet at (x, y) */
function rig(x: number, y: number, H: number, P: Pose) {
  const out: Record<string, { x: number; y: number; a: number }> = {};
  const c = P.crouch * 0.05;
  const put = (id: string, px: number, py: number, a = 0) => (out[id] = { x: x + px * H, y: y + py * H, a });
  put('footL', -0.2, -0.03);
  put('footR', 0.2, -0.03);
  put('shinL', -0.19, -0.16, -0.03);
  put('shinR', 0.19, -0.16, 0.03);
  put('thighL', -0.17, -0.36 + c, 0.06 + P.crouch * 0.2);
  put('thighR', 0.17, -0.36 + c, -0.06 - P.crouch * 0.2);
  put('pelvis', 0, -0.5 + c * 1.6);
  put('torso', 0, -0.71 + c * 1.6);
  put('head', 0, -0.98 + c * 1.6);
  // arms hang from the shoulders: [upper arm angle, forearm angle] from straight down
  const arm = (side: 'L' | 'R', [a1, a2]: [number, number]) => {
    const sx = x + (side === 'L' ? -0.36 : 0.36) * H, sy = y + (-0.82 + c * 1.6) * H;
    const s = side === 'L' ? -1 : 1;
    const u1 = a1 * s, u2 = (a1 + a2) * s;
    const e: Pt = [sx + Math.sin(u1) * 0.2 * H, sy + Math.cos(u1) * 0.2 * H];
    const fx = e[0] + Math.sin(u2) * 0.19 * H, fy = e[1] + Math.cos(u2) * 0.19 * H;
    out['upper' + side] = { x: (sx + e[0]) / 2, y: (sy + e[1]) / 2, a: -u1 };
    out['lower' + side] = { x: (e[0] + fx) / 2, y: (e[1] + fy) / 2, a: -u2 };
    out['fist' + side] = { x: fx + Math.sin(u2) * 0.06 * H, y: fy + Math.cos(u2) * 0.06 * H, a: -u2 };
  };
  arm('L', P.armL);
  arm('R', P.armR);
  return out;
}

function block(ctx: CanvasRenderingContext2D, P: Part, x: number, y: number, a: number, H: number, t: number) {
  const bw = P.w * H, bh = P.h * H;
  const line = Math.max(2, H * 0.008);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  // the extruded side first, down and to the right
  const d = H * 0.025;
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.roundRect(-bw / 2 + d, -bh / 2 + d, bw, bh, H * 0.012);
  ctx.fill();
  ctx.fillStyle = P.col;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, H * 0.012);
  ctx.fill();
  ctx.stroke();
  // shade on the right
  ctx.fillStyle = 'rgba(20,18,15,0.14)';
  ctx.fillRect(bw * 0.18, -bh / 2 + line / 2, bw * 0.32 - line / 2, bh - line);
  // rivets in the corners
  ctx.fillStyle = C.ink;
  for (const [rx, ry] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.beginPath();
    ctx.arc(rx * (bw / 2 - H * 0.016), ry * (bh / 2 - H * 0.016), H * 0.006, 0, TAU);
    ctx.fill();
  }
  if (P.ch) {
    const px = Math.min(bh * 0.72, (bw * 0.82) / (P.ch.length * 0.75));
    extruded(ctx, P.ch, 0, bh * 0.02, px, { face: P.col === C.paper ? C.red : C.paper, side: C.ink, depth: px * 0.1, line: Math.max(1, px * 0.04) });
  }
  void t;
  ctx.restore();
}

/** the whole robot. `built` 0..1 brings the parts in from off frame; `held` is the pose */
function titan(g: G, x: number, y: number, H: number, P: Pose, built = 1, seed = 1) {
  const { ctx, t, w, h } = g;
  const R = rig(x, y, H, P);
  const order = ['footL', 'footR', 'shinL', 'shinR', 'thighL', 'thighR', 'pelvis', 'torso', 'upperL', 'upperR', 'lowerL', 'lowerR', 'fistL', 'fistR', 'head'];
  const r = rng(seed);
  // steam venting from the joints
  if (P.steam > 0) {
    for (let i = 0; i < 8; i++) {
      const life = (hash(i * 3.3) + t * 0.7) % 1;
      const j = R[['pelvis', 'torso', 'upperL', 'upperR'][i % 4]];
      ctx.save();
      ctx.globalAlpha = 0.5 * (1 - life) * P.steam;
      drawSprite(ctx, glow('#ffffff', 64), j.x + (i % 2 ? 1 : -1) * H * (0.15 + life * 0.25), j.y - life * H * 0.2, H * (0.12 + life * 0.25));
      ctx.restore();
    }
  }
  order.forEach((id, i) => {
    const T = R[id];
    // each part lands in turn, bottom up
    const a0 = i / order.length * 0.85;
    const k = ease.outBack(seg(built, a0, a0 + 0.18), 1.4);
    if (k <= 0) return;
    const from: Pt = [w * (r() * 1.6 - 0.3), r() < 0.5 ? -h * 0.3 : h * 1.3];
    const spin = (r() - 0.5) * 6;
    const px = lerp(from[0], T.x, k), py = lerp(from[1], T.y, k);
    block(ctx, PARTS[id], px, py, T.a + spin * (1 - Math.min(1, k)), H, t);
    if (id === 'torso' && k > 0.98) chest(g, T.x, T.y, H, P.core);
    if (id === 'head' && k > 0.98) visor(g, T.x, T.y, H, P.eyes);
  });
}

/** the chest: MOVE across the top, its O the reactor */
function chest(g: G, x: number, y: number, H: number, core: number) {
  const { ctx, t } = g;
  const px = H * 0.09;
  extruded(ctx, 'M', x - H * 0.17, y - H * 0.1, px, { face: C.red, side: C.ink, depth: px * 0.1 });
  extruded(ctx, 'V', x + H * 0.11, y - H * 0.1, px, { face: C.red, side: C.ink, depth: px * 0.1 });
  extruded(ctx, 'E', x + H * 0.2, y - H * 0.1, px, { face: C.red, side: C.ink, depth: px * 0.1 });
  const cx = x - H * 0.03, cy = y + H * 0.02, r = H * 0.075;
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.25, 0, TAU);
  ctx.fill();
  if (core > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = core;
    drawSprite(ctx, glow(C.green, 128), cx, cy, r * 6);
    ctx.restore();
  }
  ctx.fillStyle = core > 0 ? C.green : '#3a3a3a';
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = Math.max(1.5, r * 0.15);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // turbine blades in the core, spinning up
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 12 * core);
  ctx.strokeStyle = withAlpha(C.ink, 0.7);
  ctx.lineWidth = Math.max(1, r * 0.12);
  for (let i = 0; i < 3; i++) {
    ctx.rotate(TAU / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.85, 0);
    ctx.stroke();
  }
  ctx.restore();
}

/** the head: a visor with Green behind it, two eyes that light up */
function visor(g: G, x: number, y: number, H: number, eyes: number) {
  const { ctx, t } = g;
  const vw = H * 0.18, vh = H * 0.075;
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.roundRect(x - vw / 2, y - vh / 2 - H * 0.01, vw, vh, vh * 0.4);
  ctx.fill();
  // Green, small, at the controls
  const gx = x + Math.sin(t * 2) * H * 0.01, gy = y - H * 0.005;
  const gr = vh * 0.38;
  ctx.fillStyle = C.green;
  ctx.beginPath();
  ctx.arc(gx, gy, gr, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.white;
  for (const e of [-0.35, 0.35]) {
    ctx.beginPath();
    ctx.arc(gx + e * gr, gy - gr * 0.15, gr * 0.28, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = C.ink;
  for (const e of [-0.35, 0.35]) {
    ctx.beginPath();
    ctx.arc(gx + e * gr + gr * 0.06, gy - gr * 0.12, gr * 0.13, 0, TAU);
    ctx.fill();
  }
  // the eyes, either side of the window
  if (eyes > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = eyes;
    for (const e of [-1, 1]) drawSprite(ctx, glow(C.green, 64), x + e * vw * 0.4, y - H * 0.01, H * 0.12);
    ctx.restore();
  }
  ctx.fillStyle = eyes > 0.5 ? '#eaffc0' : '#222';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + e * vw * 0.4, y - H * 0.01, H * 0.016, 0, TAU);
    ctx.fill();
  }
  // antenna
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(2, H * 0.008);
  ctx.beginPath();
  ctx.moveTo(x + H * 0.06, y - H * 0.09);
  ctx.lineTo(x + H * 0.08, y - H * 0.16);
  ctx.stroke();
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.arc(x + H * 0.08, y - H * 0.165, H * 0.014, 0, TAU);
  ctx.fill();
}

const REST: Pose = { armL: [0.15, 0.1], armR: [0.15, 0.1], crouch: 0, eyes: 0, core: 0, steam: 0 };

/* ================================================================ SHOTS */

/* the machine shudders; rivets pop; the letters tear loose */
function shotWake(g: G, q: number) {
  const { ctx, w, h, S, t, f } = g;
  const shake = seg(q, 0.1, 1) * S * 0.01;
  ctx.save();
  ctx.translate((hash(Math.floor(t * 30)) - 0.5) * shake, (hash(Math.floor(t * 30) + 3) - 0.5) * shake);
  drawMachine({ ...f, B: f.B, hold: null, crossed: () => false, crossedFwd: () => false });
  ctx.restore();
  // rivets pinging off
  const r = rng(5);
  for (let i = 0; i < 30; i++) {
    const at = 0.15 + r() * 0.7;
    const k = seg(q, at, at + 0.25);
    if (k <= 0 || k >= 1) { r(); r(); continue; }
    const x0 = r() * w, y0 = h * (0.25 + r() * 0.6);
    const x = x0 + (r() - 0.5) * S * 0.6 * k, y = y0 - S * 0.4 * k + S * 0.9 * k * k;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(x, y, S * 0.008, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glow(Y, 64), x0, y0, S * 0.08 * (1 - k));
    ctx.restore();
  }
  // a hard white zigzag: "it's waking up"
  if (q > 0.75) {
    ctx.save();
    ctx.globalAlpha = seg(q, 0.75, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (hitQ(0.2) || hitQ(0.5)) f.shake(S * 0.015);
}

/* the letters fly together into a body, bottom up, each one landing with a clunk */
function shotAssemble(g: G, q: number) {
  const { w, h, S, f } = g;
  poster(g, { ground: h * 0.88 });
  const H = S * (g.portrait ? 1.0 : 0.8);
  titan(g, w / 2, h * 0.88, H, { ...REST, steam: seg(q, 0.6, 1) }, seg(q, -0.1, 0.92), 3);
  speedLines(g, w / 2, h * 0.5, 0.35 * (1 - seg(q, 0.85, 1)));
  for (let i = 0; i < 15; i++) if (hitQ(((i / 15) * 0.85 + 0.18) * 1.02 - 0.1)) f.shake(S * 0.008);
}

/* close on the head: the visor, Green inside, the eyes lighting up; the core spins up */
function shotIgnite(g: G, q: number) {
  const { ctx, w, h, S } = g;
  poster(g, { burst: 0.4, ground: h * 2 });
  const H = S * 3.2;
  const eyes = ease.out3(seg(q, 0.3, 0.55));
  // framed on the head and chest
  titan(g, w / 2, h * 0.5 + H * 0.84, H, { ...REST, eyes, core: seg(q, 0.5, 1), steam: 1 }, 1, 3);
  if (hitQ(0.32)) g.f.shake(S * 0.02);
  // two lines of light across the visor as it powers up
  if (eyes > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = bell(q, 0.3, 0.7);
    const gr = ctx.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(166,240,58,0)');
    gr.addColorStop(0.5, 'rgba(234,255,192,0.8)');
    gr.addColorStop(1, 'rgba(166,240,58,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, h * 0.5 + H * 0.84 - H * 0.99, w, 2);
    ctx.restore();
  }
}

/* the hero shot: low, against a sunburst, steam pouring off it, Blot on its shoulder */
function shotHero(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  poster(g, { burst: 1, ground: h * 0.92 });
  const H = S * (g.portrait ? 1.05 : 0.85);
  const push = ease.out3(q);
  ctx.save();
  ctx.translate(w / 2, h * 0.92);
  ctx.scale(1 + push * 0.06, 1 + push * 0.06);
  ctx.translate(-w / 2, -h * 0.92);
  titan(g, w / 2, h * 0.92, H, { ...REST, armL: [0.5, 0.6], armR: [0.5, 0.6], eyes: 1, core: 1, steam: 1 }, 1, 3);
  const R = rig(w / 2, h * 0.92, H, { ...REST, armL: [0.5, 0.6], armR: [0.5, 0.6] });
  // Blot rode the poster all the way here, and now rides on top
  const hd = R['head'];
  drawBlot(ctx, hd.x - H * 0.05, hd.y - H * 0.09, S * 0.09, { t, pose: 'cheer', seed: 5, eye: C.white });
  ctx.restore();
  speedLines(g, w / 2, h * 0.4, 0.25);
}

/* the punch: the ball drops in, the fist comes up, impact, and it's gone up the frame turning gold */
function shotPunch(g: G, q: number) {
  const { ctx, w, h, S, t, f } = g;
  const hit = 0.42;
  if (q >= hit && q < hit + 0.05) {
    // the impact frame: black poster, white shapes
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, w, h);
    speedLines(g, w * 0.55, h * 0.36, 1, '#ffffff');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w * 0.55, h * 0.36, S * 0.06, 0, TAU);
    ctx.fill();
    if (hitQ(hit)) {
      f.shake(S * 0.06);
      f.flash(0.6, '#ffffff');
    }
    return;
  }
  poster(g, { burst: 0.6, ground: h * 0.95 });
  const H = S * (g.portrait ? 1.0 : 0.8);
  // wind up, then an uppercut
  const wind = ease.inOut2(seg(q, 0, hit - 0.05));
  const go = ease.out5(seg(q, hit - 0.05, hit));
  const armR: [number, number] = q < hit - 0.05 ? [lerp(0.2, -0.6, wind), lerp(0.2, 1.8, wind)] : [lerp(-0.6, 3.0, go), lerp(1.8, 0.05, go)];
  const crouch = q < hit ? wind : 1 - seg(q, hit, 1);
  const X = w * 0.42;
  titan(g, X, h * 0.95, H, { ...REST, armL: [0.4, 0.8], armR, crouch, eyes: 1, core: 1, steam: 1 }, 1, 3);
  // the ball: drops into reach, then rockets up the frame
  const R = rig(X, h * 0.95, H, { ...REST, armL: [0.4, 0.8], armR, crouch });
  const fist = R['fistR'];
  let bx: number, by: number;
  if (q < hit) {
    const drop = ease.in2(seg(q, 0.05, hit));
    bx = w * 0.55;
    by = lerp(-S * 0.1, h * 0.36, drop);
  } else {
    const up = ease.in3(seg(q, hit, 0.85));
    bx = w * 0.55;
    by = lerp(h * 0.36, -h * 0.3, up);
    // the streak it leaves, gold
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(bx, by, bx, h * 0.36);
    gr.addColorStop(0, 'rgba(255,226,122,0.9)');
    gr.addColorStop(1, 'rgba(255,226,122,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(bx - S * 0.03, by, S * 0.06, h * 0.36 - by);
    ctx.restore();
  }
  const charge = seg(q, hit, 0.8);
  drawBall(ctx, bx, by, S * 0.045, t * 3 + q * 20, t, 1 + seg(q, hit, hit + 0.2) * 0.4);
  if (charge > 0) drawCrackle(ctx, bx, by, S * 0.05 * (2 + charge * 2), t, charge, 6);
  if (q > hit) {
    // the shock where it was hit
    const k = seg(q, hit, hit + 0.3);
    ctx.save();
    ctx.strokeStyle = withAlpha('#ffffff', 1 - k);
    ctx.lineWidth = S * 0.012 * (1 - k);
    ctx.beginPath();
    ctx.ellipse(w * 0.55, h * 0.36, S * 0.5 * k, S * 0.16 * k, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    speedLines(g, w * 0.55, h * 0.1, 0.6 * (1 - seg(q, 0.7, 1)));
  }
  void fist;
}

/* the ball, now lightning, comes back down the frame and splits it; the halves slide apart */
let buf: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D; key: string } | null = null;
function shotSplit(g: G, q: number) {
  const { ctx, w, h, S, t, f } = g;
  // the line it tears down
  const path: Pt[] = [];
  const r = rng(77);
  for (let i = 0; i <= 10; i++) path.push([w * (0.5 + (r() - 0.5) * 0.3), (h * i) / 10]);
  path[0][1] = -10;
  path[10][1] = h + 10;
  const strike = ease.out3(seg(q, 0, 0.18));
  const apart = ease.inOut3(seg(q, 0.3, 1));
  // the picture being torn: the hero still standing there, ball gone
  const dpr = ctx.getTransform().a;
  const key = `${w}x${h}x${dpr}`;
  if (buf?.key !== key) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * dpr);
    c.height = Math.ceil(h * dpr);
    buf = { c, ctx: c.getContext('2d')!, key };
  }
  const b = buf!;
  b.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const gb: G = { ...g, ctx: b.ctx };
  poster(gb, { burst: 0.6, ground: h * 0.95 });
  const H = S * (g.portrait ? 1.0 : 0.8);
  titan(gb, w * 0.42, h * 0.95, H, { ...REST, armL: [0.4, 0.8], armR: [3.0, 0.05], eyes: 1, core: 1, steam: 1 }, 1, 3);
  // behind the page: the night, as it was before the poster
  if (apart > 0) drawMatch({ ...f, B: 12.4, hold: null, crossed: () => false, crossedFwd: () => false });
  else ctx.clearRect(0, 0, w, h);
  // the two halves, each clipped along the tear, sliding and tipping away
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * apart * w * 0.7, apart * h * 0.12);
    ctx.translate(w / 2, h / 2);
    ctx.rotate(side * apart * 0.18);
    ctx.translate(-w / 2, -h / 2);
    ctx.beginPath();
    ctx.moveTo(side < 0 ? -w : w * 2, -h);
    for (const p of path) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(side < 0 ? -w : w * 2, h * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(b.c, 0, 0, w, h);
    // the torn edge, white
    ctx.strokeStyle = '#fffaf0';
    ctx.lineWidth = Math.max(2, S * 0.006);
    ctx.beginPath();
    path.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.restore();
  }
  // the bolt itself, down the seam
  if (strike > 0) {
    const n = Math.max(2, Math.ceil(strike * path.length));
    const pts = path.slice(0, n);
    drawBolt(ctx, pts, t, { width: S * 0.01, amp: S * 0.02, seed: 5, alpha: 1 - seg(q, 0.3, 0.6), branches: 6, pal: GOLD });
    if (hitQ(0.05)) {
      f.shake(S * 0.05);
      f.flash(0.7, GOLD.hot);
    }
  }
  void jag;
}

function speedLines(g: G, cx: number, cy: number, alpha: number, color = 'rgba(255,255,255,0.6)') {
  const { ctx, S, t } = g;
  if (alpha <= 0) return;
  const k = Math.floor(t * 18);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  for (let i = 0; i < 60; i++) {
    const a = hash(i * 1.7) * TAU + (hash(i + k) - 0.5) * 0.04;
    const r0 = S * (0.35 + hash(i * 3 + k) * 0.25);
    ctx.lineWidth = 0.8 + hash(i * 7) * 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * S * 2.5, cy + Math.sin(a) * S * 2.5);
    ctx.stroke();
  }
  ctx.restore();
}
