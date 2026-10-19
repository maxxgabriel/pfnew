import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { layoutWord, wordWidth } from '../core/glyphs';
import { ease, lerp, rubber, seg } from '../core/math';
import { paperTile } from '../core/sprites';
import { C, F, font } from '../core/style';

/*
 * THE OPENING (the window takeover).
 *
 * The title plays full screen as it always has. The moment you scroll, the
 * whole picture shrinks into a tilted card on a sheet of paper, and the name
 * leaves the card: MAX and GABRIEL paint themselves across the paper around
 * it, so big they run off the edges. Then the card grows and straightens
 * while the film plays on inside it (the moon, the mountains, the flood),
 * until the night fills the screen just as the duel begins.
 *
 * The film inside is the real ink act drawn live under the card's
 * transform, so nothing is duplicated and the hand-off at the end is exact.
 */

export const OPEN_END = 2.3;
const SHRINK = 0.3; // film beat by which the card is smallest

export interface OpenCard { s: number; rot: number; cx: number; cy: number }

/** the card's scale/rotation at beat B, or null when the film is full screen */
export function openCard(f: Frame): OpenCard | null {
  const { B, w, h } = f;
  if (f.hold || B <= 0.001 || B >= OPEN_END) return null;
  const small = f.portrait ? 0.44 : 0.4;
  const inK = ease.inOut2(seg(B, 0, SHRINK));
  const outK = ease.inOut3(seg(B, SHRINK + 0.1, OPEN_END));
  const s = B < SHRINK + 0.1 ? lerp(1, small, inK) : lerp(small, 1, outK);
  const tilt = -0.1;
  const rot = B < SHRINK + 0.1 ? tilt * inK : tilt * (1 - outK);
  return { s, rot, cx: w / 2, cy: h * (f.portrait ? 0.5 : 0.52) };
}

let pattern: CanvasPattern | null = null;
let cache: { key: string; max: ReturnType<typeof layoutWord>; gab: ReturnType<typeof layoutWord>; ms: number; gs: number } | null = null;

/** the paper behind the card, with the giant name */
export function drawOpenBack(f: Frame, card: OpenCard) {
  const { ctx, w, h, B, t } = f;
  const S = Math.min(w, h);
  if (!pattern) pattern = ctx.createPattern(paperTile(512, C.paper), 'repeat');
  ctx.fillStyle = pattern!;
  ctx.fillRect(-20, -20, w + 40, h + 40);
  const key = `${w}x${h}`;
  if (cache?.key !== key) {
    // big enough to run off the edges: MAX across the top, GABRIEL across the bottom
    const ms = f.portrait ? w * 0.42 : Math.min(w * 0.3, h * 0.36);
    const gs = f.portrait ? w * 0.19 : Math.min(w * 0.16, h * 0.2);
    const mw = wordWidth('MAX', ms, 0.1), gw = wordWidth('GABRIEL', gs, 0.12);
    const top = f.portrait ? h * 0.04 : h * 0.05;
    // (just past the edges: MAX off the left, GABRIEL off the right, every letter still readable)
    const max = layoutWord('MAX', f.portrait ? w * 1.04 - mw : w * 0.04, top, ms, 0.1);
    const gab = layoutWord('GABRIEL', f.portrait ? w * 1.03 - gw : w * 0.96 - gw, h * (f.portrait ? 0.8 : 0.74), gs, 0.12);
    cache = { key, max, gab, ms, gs };
    void mw;
  }
  const { max, gab, ms, gs } = cache;
  // the card pushes the name outward as it grows
  const grow = seg(card.s, 0.5, 1);
  const push = ease.in2(grow);
  // rubber: scroll speed stretches the letters, they wobble back when you stop
  const rub = (i: number) => rubber(f.vB, i, t)[1] + Math.sin(t * 2.4 + i) * 0.008;
  ctx.save();
  ctx.translate(-push * w * 0.25, -push * h * 0.2);
  max.strokes.forEach((st, i) => {
    const p = ease.inOut2(seg(B, 0.03 + i * 0.03, 0.16 + i * 0.03));
    if (p <= 0) return;
    const L = st.letter;
    const lx = max.strokes.filter((q) => q.letter === L)[0].pts[0][0];
    ctx.save();
    ctx.translate(lx, top(max, L));
    ctx.scale(1 / rub(L), rub(L));
    ctx.translate(-lx, -top(max, L));
    brush(ctx, st.pts, { width: ms * 0.13, color: C.ink, progress: p, dry: 0.45, seed: 400 + i, press: 1.4, tail: 0.22 });
    ctx.restore();
  });
  ctx.restore();
  ctx.save();
  ctx.translate(push * w * 0.25, push * h * 0.2);
  gab.strokes.forEach((st, i) => {
    const p = ease.out2(seg(B, 0.12 + i * 0.012, 0.2 + i * 0.012));
    if (p <= 0) return;
    const L = st.letter;
    const lx = gab.strokes.filter((q) => q.letter === L)[0].pts[0][0];
    ctx.save();
    ctx.translate(lx, top(gab, L));
    ctx.scale(1 / rub(L + 3), rub(L + 3));
    ctx.translate(-lx, -top(gab, L));
    brush(ctx, st.pts, { width: gs * 0.13, color: C.ink, progress: p, dry: 0.4, seed: 480 + i, press: 1.3, tail: 0.3 });
    ctx.restore();
  });
  ctx.restore();
  // tiny type, set against the giant name
  const small = seg(B, 0.2, 0.3) * (1 - seg(card.s, 0.6, 0.8));
  if (small > 0) {
    ctx.save();
    ctx.globalAlpha = small * 0.8;
    ctx.fillStyle = C.ink;
    ctx.font = font(Math.max(10, Math.round(S * 0.026)), F.serif, 600);
    ctx.textAlign = 'left';
    ctx.fillText('designs and builds', w * 0.06, h * (f.portrait ? 0.27 : 0.5));
    ctx.fillText('things that move.', w * 0.06, h * (f.portrait ? 0.27 : 0.5) + S * 0.034);
    ctx.textAlign = 'right';
    ctx.fillText('keep scrolling ↓', w * 0.94, h * (f.portrait ? 0.755 : 0.66));
    ctx.restore();
  }
}

function top(word: ReturnType<typeof layoutWord>, letter: number) {
  // the foot of the letter: the lowest point of its strokes
  let y = -Infinity;
  for (const st of word.strokes) if (st.letter === letter) for (const p of st.pts) y = Math.max(y, p[1]);
  return y;
}

/** move the context into the card: the film draws its full frame into it */
export function enterCard(f: Frame, card: OpenCard) {
  const { ctx, w, h } = f;
  ctx.translate(card.cx, card.cy);
  ctx.rotate(card.rot);
  ctx.scale(card.s, card.s);
  ctx.translate(-w / 2, -h / 2);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
}

/** the card's edge: a soft shadow under it, and a brushed ink border */
export function drawCardEdge(f: Frame, card: OpenCard, under: boolean) {
  const { ctx, w, h } = f;
  const S = Math.min(w, h);
  const a = 1 - seg(card.s, 0.9, 0.99);
  if (a <= 0) return;
  ctx.save();
  ctx.translate(card.cx, card.cy);
  ctx.rotate(card.rot);
  ctx.scale(card.s, card.s);
  ctx.translate(-w / 2, -h / 2);
  if (under) {
    ctx.globalAlpha = 0.35 * a;
    ctx.fillStyle = C.ink;
    ctx.fillRect(S * 0.04, S * 0.05, w, h);
  } else {
    // a clean keyline, like a frame on a contact sheet
    ctx.globalAlpha = a;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = (S * 0.007) / card.s;
    ctx.strokeRect(0, 0, w, h);
  }
  ctx.restore();
}
