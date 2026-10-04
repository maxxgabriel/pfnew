import { drawBlot } from '../core/blot';
import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { POWERS_AT } from '../core/holds';
import { layoutWord, wordWidth } from '../core/glyphs';
import { type Pt, TAU, ease, hash, lerp, seg } from '../core/math';
import { drawSprite, glow, paperTile, withAlpha } from '../core/sprites';
import { C } from '../core/style';
import { drawSeal } from './ink';
import { PAGE_ENSO, blotSpot, drawHand, handRest, pageEnso } from './powers';

/*
 * FINALE — the page, signed.
 *
 * The pull-back (powers.ts) lands on the sheet of paper everything was drawn
 * on: the first circle, Blot beside it, and the Hand still holding the brush.
 * The Hand signs it — MAX, then GABRIEL, then the seal — and the two rivals
 * stay, small now, circling the ensō for as long as anyone is watching.
 */

let pattern: CanvasPattern | null = null;
let titleKey = '';
let max: ReturnType<typeof layoutWord>;
let gab: ReturnType<typeof layoutWord>;
let maxSize = 0, gabSize = 0;

interface Trail { pts: Pt[] }
const trails: Trail[] = [{ pts: [] }, { pts: [] }];

/** the name is written right after the pull-back lands on the page */
const MAX_AT = 18.85, GAB_AT = 19.62, SEAL_AT = 20.32;
const strokeSpan = (word: 'max' | 'gab', i: number): [number, number] =>
  word === 'max' ? [MAX_AT + i * 0.085, MAX_AT + i * 0.085 + 0.12] : [GAB_AT + i * 0.032, GAB_AT + i * 0.032 + 0.07];

export function drawFinale(f: Frame) {
  const { ctx, w, h, B, t } = f;
  if (B <= POWERS_AT || f.hold) return;
  if (!pattern) pattern = ctx.createPattern(paperTile(512, C.paper), 'repeat');
  const S = Math.min(w, h);
  ctx.fillStyle = pattern!;
  ctx.fillRect(0, 0, w, h);

  // ---- the first circle, exactly where the pull-back left it
  const E = pageEnso(f);
  const ex = E.x, ey = E.y, er = E.r;
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(t * 0.03);
  ctx.scale(er / 100, er / 100);
  brush(ctx, PAGE_ENSO, { width: 15, color: C.ink, dry: 0.42, seed: 8, press: 1.5, tail: 0.12 });
  ctx.restore();

  // ---- the name, written by the Hand that drew everything
  const key = `${w}x${h}`;
  if (key !== titleKey) {
    titleKey = key;
    maxSize = er * 0.62;
    gabSize = maxSize * 0.36;
    const mw = wordWidth('MAX', maxSize, 0.16);
    const gw = wordWidth('GABRIEL', gabSize, 0.3);
    max = layoutWord('MAX', ex - mw / 2, ey - maxSize * 0.5, maxSize, 0.16);
    gab = layoutWord('GABRIEL', ex - gw / 2, ey + er + S * 0.05, gabSize, 0.3);
  }
  // where the brush is: along the stroke being written, or travelling between strokes
  const keys: [number, Pt][] = [];
  const rest = handRest(f);
  keys.push([MAX_AT - 0.12, rest]);
  max.strokes.forEach((st, i) => {
    const [a, b] = strokeSpan('max', i);
    const p = ease.inOut2(seg(B, a, b));
    brush(ctx, st.pts, { width: maxSize * 0.14, color: C.ink, progress: p, dry: 0.45, seed: 140 + i, press: 1.35, tail: 0.25 });
    keys.push([a, st.pts[0]], [b, st.pts[st.pts.length - 1]]);
  });
  gab.strokes.forEach((st, i) => {
    const [a, b] = strokeSpan('gab', i);
    const p = ease.out2(seg(B, a, b));
    brush(ctx, st.pts, { width: gabSize * 0.13, color: C.ink, progress: p, dry: 0.4, seed: 180 + i, press: 1.3, tail: 0.3 });
    keys.push([a, st.pts[0]], [b, st.pts[st.pts.length - 1]]);
  });
  const st = seg(B, SEAL_AT, SEAL_AT + 0.15);
  const gl = gab.strokes[gab.strokes.length - 1].pts;
  const sealAt: Pt = [gl[gl.length - 1][0] + gabSize * 0.55, gab.strokes[0].pts[0][1] + gabSize * 0.5];
  if (st > 0) {
    const sc = st < 1 ? lerp(2.2, 1, ease.outBack(st, 2.2)) : 1;
    drawSeal(ctx, sealAt[0], sealAt[1], gabSize * 1.05 * sc, -0.06 + (1 - st) * 0.4, Math.min(1, st * 3));
  }
  // then it lifts away up out of the frame, so the card has the page to itself
  keys.push([SEAL_AT + 0.22, rest], [SEAL_AT + 0.62, [rest[0] + S * 0.45, -S * 0.12]]);
  const tip = handAlong(keys, B, max.strokes, gab.strokes);
  // the hand lifts a little whenever it isn't touching the page
  const writing = [...max.strokes.map((_, i) => strokeSpan('max', i)), ...gab.strokes.map((_, i) => strokeSpan('gab', i))].some(([a, b]) => B >= a && B <= b);
  if (tip[1] > -S * 0.1) drawHand(ctx, tip, S, t, 1, writing ? 0 : 0.012);

  // ---- Blot, beside the circle, watching it be signed
  drawBlot(ctx, ...blotSpot(f), S * 0.09, { t, pose: B > SEAL_AT + 0.1 ? 'cheer' : 'idle', look: tip, seed: 4, eye: C.white, rot: -0.06 });

  // ---- the rivals, at peace: two lights circling the ensō forever
  const calm = seg(B, 20.1, 20.5);
  if (calm > 0) {
    for (let i = 0; i < 2; i++) {
      const ph = t * 0.9 + i * Math.PI;
      // a lemniscate around the ring: they cross in the middle every lap
      const a = ph;
      const x = ex + Math.cos(a) * er * 1.25;
      const y = ey + Math.sin(a * 2) * er * 0.45;
      const tr = trails[i].pts;
      tr.push([x, y]);
      if (tr.length > 26) tr.shift();
      const col = i ? C.green : C.blue;
      ctx.lineCap = 'round';
      for (let k = 1; k < tr.length; k++) {
        ctx.strokeStyle = withAlpha(col, (k / tr.length) * 0.7 * calm);
        ctx.lineWidth = S * 0.008 * (k / tr.length);
        ctx.beginPath();
        ctx.moveTo(tr[k - 1][0], tr[k - 1][1]);
        ctx.lineTo(tr[k][0], tr[k][1]);
        ctx.stroke();
      }
      ctx.globalAlpha = calm * 0.5;
      drawSprite(ctx, glow(col, 64), x, y, S * 0.06);
      ctx.globalAlpha = calm;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, S * 0.008, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ---- ink keeps dripping somewhere on the page
  if (calm > 0) {
    for (let k = 0; k < 3; k++) {
      const cyc = (t * 0.25 + k / 3) % 1;
      const id = Math.floor(t * 0.25 + k / 3) * 3 + k;
      const x = w * (0.1 + hash(id) * 0.8);
      const y = h * (0.05 + hash(id * 7) * 0.25);
      ctx.strokeStyle = withAlpha(C.ink, (1 - cyc) * 0.18 * calm);
      ctx.lineWidth = 1;
      for (let r = 0; r < 3; r++) {
        const q = cyc - r * 0.12;
        if (q <= 0) continue;
        ctx.beginPath();
        ctx.ellipse(x, y, S * 0.08 * q, S * 0.025 * q, 0, 0, TAU);
        ctx.stroke();
      }
    }
  }
}

/** the brush tip at beat B: along a stroke while it's being written, gliding between them otherwise */
function handAlong(keys: [number, Pt][], B: number, ...words: { pts: Pt[] }[][]): Pt {
  // inside a stroke: follow the stroke itself
  const all = words.flat();
  for (let i = 0; i < all.length; i++) {
    const word = i < words[0].length ? 'max' : 'gab';
    const j = word === 'max' ? i : i - words[0].length;
    const [a, b] = strokeSpan(word, j);
    if (B >= a && B <= b) {
      const p = word === 'max' ? ease.inOut2(seg(B, a, b)) : ease.out2(seg(B, a, b));
      const pts = all[i].pts;
      const x = p * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(x));
      return [lerp(pts[k][0], pts[k + 1][0], x - k), lerp(pts[k][1], pts[k + 1][1], x - k)];
    }
  }
  const ks = [...keys].sort((p, q) => p[0] - q[0]);
  if (B <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (B <= ks[i][0]) {
      const k = ease.inOut2(seg(B, ks[i - 1][0], ks[i][0]));
      return [lerp(ks[i - 1][1][0], ks[i][1][0], k), lerp(ks[i - 1][1][1], ks[i][1][1], k)];
    }
  }
  return ks[ks.length - 1][1];
}
