import { brush } from '../core/brush';
import { drawMarble } from '../core/marble';
import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, lerp, seg } from '../core/math';
import { drawSprite, glow, withAlpha } from '../core/sprites';

/*
 * THE INK DRAGON.
 *
 * The guardian of the Spark, painted in moonlight on the night sky: one long
 * dry-brush body, plates of scales, a ridge of spines, whiskers that never
 * stop moving. It rises out of the flood, coils round the moon, and chases
 * the pearl (the Spark, small) down to where the two warriors will fight over
 * it. At the end of the duel it dives through the meeting of the beams,
 * swallows the pearl, and coils into a perfect circle: the ensō the camera
 * dives through onto the page.
 *
 * The body follows its head along a path: each point of the spine is where
 * the head was a little earlier, so the whole animal moves like one stroke.
 */

const PALE = '#ddd6c4';
const INKY = '#2a2621';
const EYE = '#ffcf5a';

/** the ink act's layout, so the dragon lives in the same space as the duel */
export function inkSpace(f: { w: number; h: number }) {
  const SW = Math.min(f.w, f.h * 0.9);
  const ox = (f.w - SW) / 2;
  return { X: (sx: number) => ox + sx * SW, Y: (sy: number) => sy * f.h, S: Math.min(f.w, f.h) };
}

/* ------------------------------------------------------------------ path */

interface Path { pts: Pt[]; len: number[]; total: number }

/** a Catmull-Rom path, sampled densely with its running length */
function makePath(way: Pt[]): Path {
  const pts: Pt[] = [];
  for (let k = 0; k < way.length - 1; k++) {
    const p0 = way[Math.max(0, k - 1)], p1 = way[k], p2 = way[k + 1], p3 = way[Math.min(way.length - 1, k + 2)];
    for (let i = 0; i < 24; i++) {
      const f = i / 24;
      const cr = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
      pts.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(way[way.length - 1]);
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, len, total: len[len.length - 1] };
}

/** the point at running length d; before the start, carry straight on back */
function at(P: Path, d: number): Pt {
  if (d <= 0) {
    const a = P.pts[0], b = P.pts[1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [a[0] + ((a[0] - b[0]) / l) * -d, a[1] + ((a[1] - b[1]) / l) * -d];
  }
  if (d >= P.total) {
    const a = P.pts[P.pts.length - 2], b = P.pts[P.pts.length - 1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [b[0] + ((b[0] - a[0]) / l) * (d - P.total), b[1] + ((b[1] - a[1]) / l) * (d - P.total)];
  }
  let lo = 0, hi = P.len.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (P.len[mid] < d) lo = mid;
    else hi = mid;
  }
  const f = (d - P.len[lo]) / (P.len[hi] - P.len[lo] || 1);
  return [lerp(P.pts[lo][0], P.pts[hi][0], f), lerp(P.pts[lo][1], P.pts[hi][1], f)];
}

/** the spine when the head is at running length `head` */
function spine(P: Path, head: number, body: number, n = 64): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) out.push(at(P, head - (body * i) / n));
  return out;
}

/* ------------------------------------------------------------------ body */

/**
 * The dragon along a spine (head first). `s` is the body's thickness scale,
 * `jaw` how far the mouth is open, `alpha` its presence.
 */
export function drawDragon(ctx: CanvasRenderingContext2D, sp: Pt[], s: number, t: number, o: { jaw?: number; alpha?: number; glow?: number; ridge?: 1 | -1 } = {}) {
  const alpha = o.alpha ?? 1;
  if (alpha <= 0 || sp.length < 4) return;
  const n = sp.length - 1;
  const tang = (i: number): Pt => {
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n, i + 1)];
    const l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
    return [(a[0] - b[0]) / l, (a[1] - b[1]) / l];
  };
  const width = (i: number) => s * (0.85 + Math.sin((i / n) * Math.PI * 0.9 + 0.3) * 0.35) * (1 - (i / n) ** 2.2 * 0.92);
  ctx.save();
  ctx.globalAlpha = alpha;
  // moonlight around it, so a pale animal on a dark sky still has an edge
  if ((o.glow ?? 1) > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.12 * alpha * (o.glow ?? 1);
    for (let i = 0; i <= n; i += 6) drawSprite(ctx, glow('#c9d6ff', 64), sp[i][0], sp[i][1], width(i) * 5);
    ctx.restore();
  }
  // which side the back is on (the fins grow there)
  const rs = o.ridge ?? 1;
  const side = (i: number) => {
    const [dx, dy] = tang(i);
    return { dx, dy, nx: -dy * rs, ny: dx * rs };
  };
  // legs first, so the body overlaps where they join: two pairs, each with three claws
  for (const fi of [0.17, 0.52]) {
    const i = Math.round(n * fi);
    const { dx, dy, nx, ny } = side(i);
    const b = sp[i];
    const wd = width(i);
    for (const sd of [-1, 1]) {
      const sw = Math.sin(t * 2.4 + fi * 9 + sd) * 0.3;
      const root: Pt = [b[0] - nx * wd * 0.3, b[1] - ny * wd * 0.3];
      const knee: Pt = [root[0] - nx * wd * 1.3 + dx * wd * (0.5 + sw) * sd, root[1] - ny * wd * 1.3 + dy * wd * (0.5 + sw) * sd];
      const foot: Pt = [knee[0] - nx * wd * 0.4 + dx * wd * 1.1, knee[1] - ny * wd * 0.4 + dy * wd * 1.1];
      brush(ctx, [root, knee, foot], { width: wd * 0.8, color: sd > 0 ? PALE : '#b3ab9b', dry: 0.25, seed: 70 + i + sd, press: 1.1, tail: 0.6, halo: 0 });
      ctx.strokeStyle = INKY;
      ctx.lineWidth = Math.max(1, wd * 0.14);
      ctx.lineCap = 'round';
      for (let c = -1; c <= 1; c++) {
        ctx.beginPath();
        ctx.moveTo(foot[0], foot[1]);
        ctx.quadraticCurveTo(foot[0] + dx * wd * 0.5 - nx * wd * 0.25 * c, foot[1] + dy * wd * 0.5 - ny * wd * 0.25 * c, foot[0] + dx * wd * 0.55 - nx * wd * (0.15 + 0.3 * c), foot[1] + dy * wd * 0.55 - ny * wd * (0.15 + 0.3 * c));
        ctx.stroke();
      }
    }
  }
  // the body: one long stroke, dry at the edges, thinning to the tail
  brush(ctx, sp, { width: s * 2.1, color: PALE, dry: 0.55, seed: 41, press: 1.0, tail: 0.04, halo: 0 });
  // shade along the back, so it has a round body and not a flat ribbon
  const back: Pt[] = sp.map((p0, i) => {
    const { nx, ny } = side(i);
    return [p0[0] + nx * width(i) * 0.45, p0[1] + ny * width(i) * 0.45];
  });
  brush(ctx, back, { width: s * 0.7, color: '#a9a191', dry: 0.7, seed: 42, press: 1.0, tail: 0.05, halo: 0, alpha: 0.7 });
  // the belly: one ink line along the underside with plates ticked across it
  ctx.strokeStyle = withAlpha(INKY, 0.6);
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  for (let i = 2; i < n * 0.9; i++) {
    const { nx, ny } = side(i);
    const q: Pt = [sp[i][0] - nx * width(i) * 0.62, sp[i][1] - ny * width(i) * 0.62];
    if (i === 2) ctx.moveTo(q[0], q[1]);
    else ctx.lineTo(q[0], q[1]);
  }
  ctx.stroke();
  ctx.beginPath();
  for (let i = 3; i < n * 0.88; i += 2) {
    const { nx, ny } = side(i);
    const wd = width(i);
    ctx.moveTo(sp[i][0] - nx * wd * 0.62, sp[i][1] - ny * wd * 0.62);
    ctx.lineTo(sp[i][0] - nx * wd * 0.95, sp[i][1] - ny * wd * 0.95);
  }
  ctx.stroke();
  // scales on the flank: faint brush hooks
  ctx.strokeStyle = withAlpha(INKY, 0.22);
  ctx.lineWidth = Math.max(0.8, s * 0.04);
  for (let i = 5; i < n * 0.8; i += 3) {
    const { dx, dy, nx, ny } = side(i);
    const wd = width(i);
    for (const off of [0.0, 0.3]) {
      ctx.beginPath();
      ctx.arc(sp[i][0] + nx * wd * off, sp[i][1] + ny * wd * off, wd * 0.26, Math.atan2(dy, dx) + 0.8, Math.atan2(dy, dx) + 2.4);
      ctx.stroke();
    }
  }
  // the ridge: fins along the back, swept toward the tail, drawn over the body
  ctx.fillStyle = PALE;
  ctx.strokeStyle = INKY;
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.lineJoin = 'round';
  for (let i = 4; i < n * 0.88; i += 2) {
    const { dx, dy, nx, ny } = side(i);
    const wd = width(i);
    const b = sp[i];
    const tall = wd * (1.0 + 0.3 * Math.sin(i * 0.9));
    const tip: Pt = [b[0] + nx * (wd * 0.55 + tall) - dx * tall * 0.75, b[1] + ny * (wd * 0.55 + tall) - dy * tall * 0.75];
    ctx.beginPath();
    ctx.moveTo(b[0] + nx * wd * 0.45 + dx * wd * 0.4, b[1] + ny * wd * 0.45 + dy * wd * 0.4);
    ctx.quadraticCurveTo(b[0] + nx * (wd * 0.6 + tall * 0.6), b[1] + ny * (wd * 0.6 + tall * 0.6), tip[0], tip[1]);
    ctx.lineTo(b[0] + nx * wd * 0.45 - dx * wd * 0.5, b[1] + ny * wd * 0.45 - dy * wd * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // the tail ends in a flame of loose strokes
  {
    const i = n;
    const [dx, dy] = tang(i - 1);
    const b = sp[i];
    for (let k = -2; k <= 2; k++) {
      const a = Math.atan2(-dy, -dx) + k * 0.28 + Math.sin(t * 3 + k) * 0.1;
      const L = s * (3.4 - Math.abs(k) * 0.6);
      brush(ctx, [b, [b[0] + Math.cos(a) * L * 0.5, b[1] + Math.sin(a) * L * 0.5], [b[0] + Math.cos(a) * L, b[1] + Math.sin(a) * L]], { width: s * 0.45, color: PALE, dry: 0.7, seed: 90 + k, tail: 0.1, halo: 0 });
    }
  }
  head(ctx, sp, s * 2.3, t, o.jaw ?? 0.15);
  ctx.restore();
}

function head(ctx: CanvasRenderingContext2D, sp: Pt[], s: number, t: number, jaw: number) {
  const a = sp[0], b = sp[3];
  const l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
  const d: Pt = [(a[0] - b[0]) / l, (a[1] - b[1]) / l];
  const n: Pt = [-d[1], d[0]];
  // a local frame: u along the snout, v across (v < 0 is the top of the head)
  const flip = n[1] > 0 ? -1 : 1; // keep the top of the head facing up the screen
  const P = (u: number, v: number): Pt => [a[0] + d[0] * u * s + n[0] * v * s * flip, a[1] + d[1] * u * s + n[1] * v * s * flip];
  // closed shapes are drawn smooth: curves through the midpoints of the corners
  const poly = (pts: Pt[], fill: string, stroke = true) => {
    ctx.beginPath();
    const m = (i: number): Pt => {
      const a0 = pts[i % pts.length], b0 = pts[(i + 1) % pts.length];
      return [(a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2];
    };
    ctx.moveTo(...m(0));
    for (let i = 1; i <= pts.length; i++) ctx.quadraticCurveTo(pts[i % pts.length][0], pts[i % pts.length][1], ...m(i));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) ctx.stroke();
  };
  ctx.strokeStyle = INKY;
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.lineJoin = 'round';
  // mane: strokes streaming back off the skull
  for (let k = 0; k < 5; k++) {
    const sway = Math.sin(t * 2.2 + k) * 0.4;
    const r0 = P(-0.6, -0.6 + k * 0.3);
    brush(ctx, [r0, P(-1.6 - k * 0.15, -1.1 + k * 0.45 + sway), P(-2.6 - k * 0.2, -1.4 + k * 0.6 + sway * 1.6)], { width: s * 0.45, color: PALE, dry: 0.75, seed: 120 + k, tail: 0.15, halo: 0 });
  }
  // lower jaw, hinged at the back of the mouth
  const op = clamp(jaw) * 0.9;
  ctx.save();
  const hinge = P(-0.4, 0.25);
  ctx.translate(hinge[0], hinge[1]);
  ctx.rotate(op * (flip > 0 ? 1 : -1) * Math.sign(n[0] * d[1] - n[1] * d[0] || 1) * 0.9);
  ctx.translate(-hinge[0], -hinge[1]);
  poly([P(-0.5, 0.2), P(1.5, 0.45), P(1.7, 0.6), P(-0.2, 0.75)], PALE);
  ctx.restore();
  // upper head: skull, brow and the long snout
  poly([P(-0.8, -0.5), P(-0.1, -0.85), P(0.6, -0.55), P(1.7, -0.45), P(2.05, -0.1), P(1.9, 0.35), P(0.2, 0.35), P(-0.6, 0.45)], PALE);
  // nostril, brow line
  ctx.beginPath();
  ctx.arc(...P(1.75, -0.2), s * 0.09, 0, TAU);
  ctx.fillStyle = INKY;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(...P(-0.35, -0.55));
  ctx.quadraticCurveTo(...P(0.1, -0.85), ...P(0.6, -0.45));
  ctx.stroke();
  // horns, swept back
  for (const k of [0, 1]) {
    const o = k * 0.25;
    brush(ctx, [P(-0.3 + o, -0.7), P(-1.0 + o, -1.5 - o), P(-2.0 + o, -1.9 - o * 0.5)], { width: s * 0.3, color: PALE, dry: 0.3, seed: 140 + k, tail: 0.1, halo: 0 });
    // the antler's branch
    brush(ctx, [P(-1.0 + o, -1.5 - o), P(-1.1 + o, -2.2 - o), P(-0.8 + o, -2.6 - o)], { width: s * 0.2, color: PALE, dry: 0.3, seed: 150 + k, tail: 0.1, halo: 0 });
  }
  // teeth along the open mouth
  if (jaw > 0.2) {
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 4; k++) {
      const u = 0.4 + k * 0.32;
      const tp = P(u, 0.35), tb = P(u + 0.1, 0.35), tt = P(u + 0.05, 0.6);
      ctx.beginPath();
      ctx.moveTo(...tp);
      ctx.lineTo(...tb);
      ctx.lineTo(...tt);
      ctx.fill();
    }
  }
  // the eye: one gold point
  const e = P(0.05, -0.35);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow(EYE, 64), e[0], e[1], s * 1.4);
  ctx.restore();
  ctx.fillStyle = EYE;
  ctx.beginPath();
  ctx.ellipse(e[0], e[1], s * 0.16, s * 0.09, Math.atan2(d[1], d[0]), 0, TAU);
  ctx.fill();
  // whiskers: two long ribbons trailing from the snout
  for (const k of [-1, 1]) {
    const pts: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const q = i / 8;
      pts.push(P(1.7 - q * 7.5, k * 0.3 + Math.sin(q * 4.5 - t * 3.2 + k) * q * 1.6 + q * k * 1.1));
    }
    brush(ctx, pts, { width: s * 0.16, color: PALE, dry: 0.4, seed: 160 + k, tail: 0.04, halo: 0 });
  }
}

/* ----------------------------------------------------------------- pearl */

/** the pearl: the Spark, small; a soft white light with a faint ring */
export function drawPearl(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.7;
  drawSprite(ctx, glow('#fff3cc', 128), x, y, r * 9);
  ctx.globalAlpha = alpha;
  drawSprite(ctx, glow('#ffffff', 64), x, y, r * 3);
  ctx.strokeStyle = `rgba(255,243,204,${0.5 * alpha})`;
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.arc(x, y, r * (1.7 + Math.sin(t * 2) * 0.1), 0, TAU);
  ctx.stroke();
  ctx.restore();
  // the pearl is the marble: glass, with the twist inside
  drawMarble(ctx, x, y, r * 1.45, { spin: t * 0.5, alpha });
}

/** where the pearl hovers over the duel */
export function pearlHome(f: { w: number; h: number }, t: number): Pt {
  const { X, Y } = inkSpace(f);
  return [X(0.5) + Math.sin(t * 0.7) * 3, Y(0.3) + Math.sin(t * 1.3) * 4];
}

/* ------------------------------------------------------------ the rise */

/** the moon, as the ink act places it once the title has pulled back */
const moonAt = (f: { w: number; h: number }) => {
  const { X, Y, S } = inkSpace(f);
  return { x: X(0.7), y: Y(0.2), r: S * 0.12 };
};

let risePath: { key: string; P: Path; body: number } | null = null;
function rise(f: { w: number; h: number }) {
  const key = `${f.w}x${f.h}`;
  if (risePath?.key === key) return risePath;
  const { X, Y, S } = inkSpace(f);
  const M = moonAt(f);
  const R = M.r * 1.9;
  const way: Pt[] = [
    [X(0.05), Y(1.35)], [X(0.12), Y(1.0)], [X(0.4), Y(0.78)], [X(0.75), Y(0.8)], [X(0.95), Y(0.6)], [X(0.6), Y(0.45)],
    // round the moon, once
    [M.x + R, M.y + R * 0.5], [M.x + R * 0.6, M.y - R], [M.x - R * 0.7, M.y - R * 0.8], [M.x - R, M.y + R * 0.2], [M.x - R * 0.2, M.y + R * 1.05],
    // down after the pearl, then away over the far range
    [X(0.45), Y(0.38)], [X(0.25), Y(0.48)], [X(0.0), Y(0.42)], [X(-0.4), Y(0.35)], [X(-1.0), Y(0.35)],
  ];
  risePath = { key, P: makePath(way), body: S * 2.3 };
  return risePath;
}

/** the hold starts with the dragon already a shadow under the mist (the climb from off-screen was dead air) */
const riseP = (hp: number) => 0.27 + 0.73 * hp;

/**
 * The rise, at progress p (0..1): out of the flood, round the moon, after the
 * pearl. Drawn between the mountain layers by the ink act, so it comes up
 * from behind the near range.
 */
export function drawDragonRise(f: Frame, hp: number) {
  const { ctx, t } = f;
  const p = riseP(hp);
  const { S } = inkSpace(f);
  const R = rise(f);
  const head = lerp(-R.body * 0.1, R.P.total + R.body * 0.15, ease.inOut2(p));
  const sp = spine(R.P, head, R.body);
  drawDragon(ctx, sp, S * 0.04, t, { jaw: 0.15 + 0.35 * seg(p, 0.55, 0.75) * (1 - seg(p, 0.75, 0.9)) });
}

/** the pearl during the rise: it leaves the moon as the dragon rounds it, and settles over the duel */
export function risePearl(f: Frame, hp: number): { at: Pt; a: number } | null {
  const p = riseP(hp);
  const M = moonAt(f);
  const home = pearlHome(f, f.t);
  const go = ease.inOut2(seg(p, 0.42, 0.8));
  const a = seg(p, 0.36, 0.44);
  if (a <= 0) return null;
  return { at: [lerp(M.x, home[0], go), lerp(M.y, home[1], go) - Math.sin(go * Math.PI) * f.h * 0.04], a };
}

/* --------------------------------------------------------- the swallow */

let swallowPath: { key: string; P: Path; body: number; R: number } | null = null;
function swallow(f: { w: number; h: number }, J: Pt) {
  const key = `${f.w}x${f.h}x${Math.round(J[0])}x${Math.round(J[1])}`;
  if (swallowPath?.key === key) return swallowPath;
  const { X, Y, S } = inkSpace(f);
  const body = S * 1.9;
  // the coil: a circle whose circumference is the body, so head meets tail
  const R = (body / TAU) * 0.97;
  const way: Pt[] = [[X(-0.4), Y(-0.25)], [X(0.05), Y(0.05)], [X(0.32), Y(0.32)], J, [J[0] + R * 0.7, J[1] + R * 0.7]];
  for (let k = 0; k <= 16; k++) {
    const a = Math.PI * 0.25 + (k / 16) * TAU * 1.02;
    way.push([J[0] + Math.cos(a) * R, J[1] + Math.sin(a) * R]);
  }
  swallowPath = { key, P: makePath(way), body, R };
  return swallowPath;
}

/** the pearl falls into the meeting of the beams; the dragon dives through it and coils */
export function drawSwallow(f: Frame, p: number, J: Pt) {
  const { ctx, t } = f;
  const { S } = inkSpace(f);
  const W = swallow(f, J);
  // how far along the path the head has to be to reach J
  let dJ = 0;
  for (let i = 0; i < W.P.pts.length; i++) {
    if (Math.hypot(W.P.pts[i][0] - J[0], W.P.pts[i][1] - J[1]) < 1) { dJ = W.P.len[i]; break; }
  }
  const dive = ease.in2(seg(p, 0.1, 0.45));
  const coil = ease.out3(seg(p, 0.45, 0.95));
  const head = p < 0.45 ? lerp(-W.body * 0.2, dJ, dive) : lerp(dJ, W.P.total, coil);
  const sp = spine(W.P, head, W.body);
  drawDragon(ctx, sp, S * 0.036, t, { jaw: 0.8 * seg(p, 0.25, 0.42) * (1 - seg(p, 0.45, 0.5)), ridge: -1 });
  return { swallowed: p >= 0.45 };
}

/** the coil after the swallow: a dragon curled into an ensō around J */
export function drawCoil(f: Frame, J: Pt, alpha = 1) {
  const { ctx, t } = f;
  const { S } = inkSpace(f);
  const W = swallow(f, J);
  drawDragon(ctx, spine(W.P, W.P.total, W.body), S * 0.036, t, { jaw: 0, alpha, ridge: -1 });
}
