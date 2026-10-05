import { drawBlot } from '../core/blot';
import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, hash, lerp, seg } from '../core/math';
import { DOT, STROKES, inBox, slice } from '../core/signature';
import { drawSprite, glow, paperTile, withAlpha } from '../core/sprites';
import { C, F, font } from '../core/style';
import { drawSeal } from './ink';
import { PAGE_ENSO, blotSpot, drawHand, handRest, pageEnso } from './powers';

/*
 * THE SIGNATURE (the payoff, in the `sign` hold straight after the pull-back).
 *
 * The pull-back has landed on the page. Out of the first circle, one by one,
 * rise the moves the film was made of, glowing in the colours of their
 * worlds: the thunder's zig-zag (gold), the machine's loop (poster green),
 * TITAN's punch (gold), the crossed blades (red and violet), the ball's run
 * (white). Each flies to its place, and the Hand inks over them in one go:
 * they were a signature all along. Full stop. Then the letters of the name
 * drop onto the page with lives of their own.
 *
 * `drawSignedPage(f, 1)` is the finished page: the finale draws it after the
 * hold, so the two always match.
 */

type Key = 'm' | 'a' | 'up' | 'x1' | 'x2' | 'flourish';
/** the order they rise in, with the colour of the world each came from */
const RISE: { key: Key; col: string }[] = [
  { key: 'm', col: '#ffd23e' },
  { key: 'a', col: C.green },
  { key: 'up', col: '#ffe27a' },
  { key: 'x1', col: '#ff3a52' },
  { key: 'x2', col: '#9b6bff' },
  { key: 'flourish', col: '#f4f7ff' },
];
/** the three strokes the pen actually draws (it lifts between them) */
const INK: Key[][] = [['m', 'a', 'up'], ['x1'], ['x2', 'flourish']];
const INK_AT: [number, number][] = [[0.34, 0.53], [0.555, 0.59], [0.615, 0.73]];
const DOT_AT = 0.76;

interface Layout {
  key: string;
  box: { x: number; y: number; w: number; h: number };
  strokes: Record<Key, Pt[]>;
  ink: Pt[][];
  dot: Pt;
  S: number;
}
let L: Layout | null = null;

/** straight segments split finely, so the brush's spline keeps the corners (the M) */
function densify(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  return out;
}

function layout(f: Frame): Layout {
  const key = `${f.w}x${f.h}`;
  if (L?.key === key) return L;
  const E = pageEnso(f);
  const S = Math.min(f.w, f.h);
  // across the circle, like a signature over a seal; the flourish swings out under it
  const bw = Math.min(f.w * 0.94, E.r * 2.7), bh = bw * 0.6;
  const box = { x: E.x - bw * 0.48, y: E.y - bh * 0.42, w: bw, h: bh };
  const strokes = {} as Record<Key, Pt[]>;
  // a signature leans forward
  const lean = (pts: Pt[]): Pt[] => pts.map(([u, v]) => [u + (0.62 - v) * 0.16, v]);
  for (const k of Object.keys(STROKES) as Key[]) {
    const p = inBox(lean(STROKES[k]), box.x, box.y, box.w, box.h);
    strokes[k] = k === 'm' || k === 'up' || k === 'x1' || k === 'x2' ? densify(p, S * 0.01) : p;
  }
  const ink = INK.map((ks) => ks.flatMap((k, i) => (i ? strokes[k].slice(1) : strokes[k])));
  const dot = inBox(lean([DOT]), box.x, box.y, box.w, box.h)[0];
  L = { key, box, strokes, ink, dot, S };
  return L;
}

/** the hold: p runs 0→1 */
export function drawSign(f: Frame, p: number) {
  drawSignedPage(f, p);
}

let pattern: CanvasPattern | null = null;

export function drawSignedPage(f: Frame, p: number) {
  const { ctx, w, h, t } = f;
  const S = Math.min(w, h);
  if (!pattern) pattern = ctx.createPattern(paperTile(512, C.paper), 'repeat');
  ctx.fillStyle = pattern!;
  ctx.fillRect(0, 0, w, h);
  const E = pageEnso(f);
  const Lo = layout(f);

  // ---- the first circle, exactly where the pull-back left it; it greys back as the name goes over it
  ctx.save();
  ctx.translate(E.x, E.y);
  ctx.rotate(t * 0.03);
  ctx.scale(E.r / 100, E.r / 100);
  brush(ctx, PAGE_ENSO, { width: 15, color: C.ink, dry: 0.42, seed: 8, press: 1.5, tail: 0.12, alpha: 1 - 0.78 * ease.inOut2(seg(p, 0.02, 0.3)) });
  ctx.restore();

  // ---- the page goes dark, like the worlds they came from, while the moves fly out; it lights up as they're inked
  const dim = ease.inOut2(seg(p, 0.0, 0.1)) * (1 - ease.inOut2(seg(p, 0.36, 0.6)));
  if (dim > 0) {
    ctx.fillStyle = `rgba(12,11,16,${0.82 * dim})`;
    ctx.fillRect(0, 0, w, h);
  }

  // ---- out of the circle: the moves, glowing in their worlds' colours, flying to their places
  const inkK = INK_AT.map(([a, b]) => ease.inOut2(seg(p, a, b)));
  RISE.forEach(({ key, col }, i) => {
    const a0 = 0.04 + i * 0.045;
    const k = ease.inOut3(seg(p, a0, a0 + 0.16));
    if (k <= 0) return;
    // the glow goes out once the ink has passed over it
    const gi = INK.findIndex((ks) => ks.includes(key));
    const gone = seg(inkK[gi], 0.15, 1);
    const a = Math.min(1, seg(p, a0, a0 + 0.03) * 1.5) * (1 - gone);
    if (a <= 0) return;
    const pts = Lo.strokes[key];
    // flies from the centre of the circle, small, on a curve, to full size in place
    const c = centroid(pts);
    const sc = lerp(0.12, 1, k);
    const fx = lerp(E.x, c[0], k) + Math.sin(k * Math.PI) * S * 0.12 * (i % 2 ? 1 : -1);
    const fy = lerp(E.y, c[1], k) - Math.sin(k * Math.PI) * S * 0.1;
    const moved = pts.map(([x, y]) => [fx + (x - c[0]) * sc, fy + (y - c[1]) * sc] as Pt);
    glowLine(ctx, moved, col, a, S, ease.out3(seg(p, a0, a0 + 0.09)));
  });

  // ---- the Hand inks over them: one signature, a flourish, a full stop
  const lw = S * 0.021;
  Lo.ink.forEach((pts, i) => {
    if (inkK[i] <= 0) return;
    brush(ctx, pts, { width: lw * (i === 2 ? 0.85 : 1), color: C.ink, progress: inkK[i], dry: i === 1 ? 0.1 : 0.3, seed: 300 + i, press: 1.5, tail: i === 1 ? 0.6 : 0.15 });
  });
  const dk = seg(p, DOT_AT, DOT_AT + 0.02);
  if (dk > 0) dotMark(ctx, Lo.dot, S, dk, p);

  const tip = penTip(f, p, Lo);
  if (tip) drawHand(ctx, tip.at, S, t, 1, tip.lift);

  // ---- the name, as letters with lives of their own
  livingName(f, p, Lo);

  // ---- Blot, watching from beside the circle; as the flourish comes for it, it leaps onto the full stop
  // (the first drop of ink, sitting on the last one)
  const home = blotSpot(f);
  const seat: Pt = [Lo.dot[0] - S * 0.004, Lo.dot[1] - S * 0.034];
  const leap = seg(p, 0.66, DOT_AT + 0.02);
  const bx = lerp(home[0], seat[0], ease.inOut2(leap));
  const by = lerp(home[1], seat[1], leap) - Math.sin(leap * Math.PI) * S * 0.22;
  const pose = leap > 0 && leap < 1 ? 'fall' : p > DOT_AT + 0.02 ? 'cheer' : 'idle';
  drawBlot(ctx, bx, by, S * (leap >= 1 ? 0.075 : 0.09), { t, pose, look: tip ? tip.at : [E.x, E.y], seed: 4, eye: C.white, rot: -0.06 + Math.sin(leap * Math.PI) * 0.5 });
}

function centroid(pts: Pt[]): Pt {
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [x / pts.length, y / pts.length];
}

/** a stroke of light: soft halo, coloured body, white-hot core */
function glowLine(ctx: CanvasRenderingContext2D, pts: Pt[], col: string, a: number, S: number, upto: number) {
  const shown = slice(pts, upto);
  if (shown.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    shown.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  };
  for (const [wd, c, al] of [[S * 0.03, col, 0.18], [S * 0.012, col, 0.75], [S * 0.004, '#ffffff', 0.95]] as const) {
    ctx.globalAlpha = a * al;
    ctx.strokeStyle = c;
    ctx.lineWidth = wd;
    path();
    ctx.stroke();
  }
  ctx.restore();
}

/** the full stop: pressed in, a little splash; like the ball hitting the net */
function dotMark(ctx: CanvasRenderingContext2D, at: Pt, S: number, k: number, p: number) {
  const r = S * 0.016 * (k < 1 ? ease.outBack(k, 3) : 1);
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(at[0], at[1], r, 0, TAU);
  ctx.fill();
  const sp = seg(p, DOT_AT, DOT_AT + 0.08);
  if (sp > 0 && sp < 1) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + hash(i) * 0.6;
      const d = S * (0.025 + hash(i * 3) * 0.03) * ease.out3(sp);
      ctx.globalAlpha = 1 - sp;
      ctx.beginPath();
      ctx.arc(at[0] + Math.cos(a) * d, at[1] + Math.sin(a) * d * 0.7, S * 0.004 * (1 - sp * 0.5), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** where the brush is: coming in, along whichever stroke is being inked, gliding between, then away */
function penTip(f: Frame, p: number, Lo: Layout): { at: Pt; lift: number } | null {
  const S = Lo.S;
  const rest = handRest(f);
  const offTop: Pt = [rest[0] + S * 0.45, -S * 0.15];
  const ends = (i: number) => [Lo.ink[i][0], Lo.ink[i][Lo.ink[i].length - 1]];
  // writing
  for (let i = 0; i < INK.length; i++) {
    const [a, b] = INK_AT[i];
    if (p >= a && p <= b) {
      const pts = slice(Lo.ink[i], ease.inOut2(seg(p, a, b)));
      return { at: pts[pts.length - 1], lift: 0 };
    }
  }
  // the moves between
  const keys: [number, Pt][] = [[0.24, offTop]];
  INK_AT.forEach(([a, b], i) => keys.push([a, ends(i)[0]], [b, ends(i)[1]]));
  keys.push([DOT_AT, Lo.dot], [DOT_AT + 0.03, [Lo.dot[0] - S * 0.01, Lo.dot[1] - S * 0.04]], [DOT_AT + 0.12, offTop]);
  if (p <= keys[0][0] || p >= keys[keys.length - 1][0]) return null;
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) {
      const k = ease.inOut2(seg(p, keys[i - 1][0], keys[i][0]));
      const a = keys[i - 1][1], b = keys[i][1];
      return { at: [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * S * 0.03], lift: 0.012 };
    }
  }
  return null;
}

/* --------------------------------------------------------- living letters */

const NAME = 'MAX GABRIEL';
/** how each letter arrives: its own little personality */
type Entry = 'stomp' | 'hop' | 'spin' | 'roll' | 'rise' | 'bounce' | 'slide' | 'pin' | 'flip' | 'topple';
const ENTRY: Entry[] = ['stomp', 'hop', 'spin', 'stomp', 'roll', 'rise', 'bounce', 'slide', 'pin', 'flip', 'topple'];

function livingName(f: Frame, p: number, Lo: Layout) {
  const { ctx, w, t } = f;
  const S = Lo.S;
  const E = pageEnso(f);
  const size = Math.round(Math.min(w * 0.078, S * 0.075));
  ctx.save();
  ctx.font = font(size, F.display);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  const ws = [...NAME].map((ch) => (ch === ' ' ? size * 0.45 : ctx.measureText(ch).width + size * 0.06));
  const total = ws.reduce((a, b) => a + b, 0);
  const base = Math.max(E.y + E.r + S * 0.12, Lo.box.y + Lo.box.h + S * 0.07);
  let x = w / 2 - total / 2;
  let li = 0;
  [...NAME].forEach((ch, i) => {
    const cx = x + ws[i] / 2;
    x += ws[i];
    if (ch === ' ') return;
    const a0 = 0.785 + li * 0.012;
    const k = clamp((p - a0) / 0.09);
    const kind = ENTRY[li];
    li++;
    if (k <= 0) return;
    letter(ctx, ch, cx, base, size, kind, k, t, li);
  });
  // the seal, stamped at the end of the name once every letter has landed
  const st = seg(p, 0.96, 0.99);
  if (st > 0) {
    const sc = st < 1 ? lerp(2.2, 1, ease.outBack(st, 2.2)) : 1;
    drawSeal(ctx, w / 2 + total / 2 + size * 0.55, base - size * 0.35, size * 0.8 * sc, -0.06 + (1 - st) * 0.4, Math.min(1, st * 3));
  }
  ctx.restore();
}

/** one letter: k 0→1 is its entrance; after it, a small breathing loop of its own */
function letter(ctx: CanvasRenderingContext2D, ch: string, x: number, base: number, size: number, kind: Entry, k: number, t: number, seed: number) {
  let dx = 0, dy = 0, rot = 0, sx = 1, sy = 1, a = 1;
  const land = (e: number) => 1 - e;
  switch (kind) {
    case 'stomp': {
      // drops hard, squashes flat, springs back
      const fall = ease.in3(seg(k, 0, 0.45));
      dy = -size * 2.2 * land(fall);
      const sq = seg(k, 0.45, 1);
      sy = 1 - Math.sin(sq * Math.PI) * 0.35 * (1 - sq);
      sx = 1 / sy;
      break;
    }
    case 'hop': {
      const e = k;
      dy = -Math.abs(Math.sin(e * Math.PI * 2)) * size * 0.9 * (1 - e);
      dx = -size * 1.2 * (1 - e);
      break;
    }
    case 'spin': {
      // flung in spinning like a star, slowing to a stop
      dx = size * 2 * (1 - ease.out3(k));
      dy = -size * 0.8 * Math.sin(k * Math.PI) * (1 - k);
      rot = (1 - ease.out3(k)) * TAU * 2;
      break;
    }
    case 'roll': {
      // rolls in like a wheel
      const e = ease.out3(k);
      dx = size * 3 * (1 - e);
      rot = -(size * 3 * (1 - e)) / (size * 0.5);
      break;
    }
    case 'rise': {
      // comes up out of the page with an overshoot
      dy = size * 1.2 * (1 - ease.outBack(k, 2));
      a = Math.min(1, k * 3);
      break;
    }
    case 'bounce': {
      const b = Math.abs(Math.cos(k * Math.PI * 2.5)) * (1 - k);
      dy = -size * 1.6 * b;
      const near = 1 - Math.min(1, b * 6);
      sy = 1 - near * 0.25 * (1 - k);
      sx = 1 / sy;
      break;
    }
    case 'slide': {
      dx = -size * 2.5 * (1 - ease.out3(k));
      rot = -0.4 * (1 - ease.outBack(k, 2.5));
      break;
    }
    case 'pin': {
      // drops like a skittle and wobbles
      dy = -size * 2 * (1 - ease.in2(seg(k, 0, 0.35)));
      rot = Math.sin(seg(k, 0.35, 1) * Math.PI * 5) * 0.3 * (1 - seg(k, 0.35, 1));
      break;
    }
    case 'flip': {
      sx = Math.cos((1 - ease.out3(k)) * Math.PI * 2);
      dy = -size * 0.5 * Math.sin(k * Math.PI);
      break;
    }
    case 'topple': {
      // falls over, gets back up
      rot = -Math.PI / 2 * (1 - ease.outBack(k, 1.8));
      break;
    }
  }
  // the loop once it has landed: each letter breathes on its own beat
  const idle = seg(k, 0.95, 1);
  const br = Math.sin(t * 2.2 + seed * 1.7) * 0.03 * idle;
  sy *= 1 + br;
  sx *= 1 - br * 0.6;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x + dx, base + dy);
  // turn about the letter's middle; squash from its feet, so it stays on the line
  ctx.translate(0, -size * 0.36);
  ctx.rotate(rot);
  ctx.translate(0, size * 0.36);
  ctx.scale(sx, sy);
  ctx.fillStyle = withAlpha(C.red, 0.85);
  ctx.fillText(ch, size * 0.045, size * 0.045);
  ctx.fillStyle = C.ink;
  ctx.fillText(ch, 0, 0);
  ctx.restore();
  // a puff of dust where the hard landings hit the page
  if (kind === 'stomp' || kind === 'pin' || kind === 'bounce') {
    const pk = seg(k, 0.45, 0.8);
    if (pk > 0 && pk < 1) {
      ctx.save();
      ctx.globalAlpha = 0.35 * (1 - pk);
      drawSprite(ctx, glow(C.inkSoft, 64), x - size * 0.4 * pk, base, size * 0.5, size * 0.2);
      drawSprite(ctx, glow(C.inkSoft, 64), x + size * 0.4 * pk, base, size * 0.5, size * 0.2);
      ctx.restore();
    }
  }
}
