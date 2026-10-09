import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { wordWidth } from '../core/glyphs';
import { type Pt, ease, lerp, seg } from '../core/math';
import { drawPose, poseHeight } from './art';
import { ONE_HEIGHT, ONE_START, drawOneLine } from './oneline';
import { INK, drawGround, drawPaper, drawSpark, drawSparkStreak, drawTitle, faceOf, hop, idlePose } from './common';
import { shockRing } from './fx';

/*
 * I · STILL.
 *
 * The page opens: MAX GABRIEL is brushed in, and the Spark drops onto the
 * paper like a fresh drop of seal ink. A brush draws the hero beside it —
 * and he is only a drawing, his lines still trembling wet. They settle; he
 * notices the Spark. It hops away along the line, and he lifts one foot,
 * arms out: his very first step (chapter II carries straight on in the
 * same shot).
 */

export const ST = {
  drop: [1.15, 1.85] as const,
  /** the Spark's ink leaps to the top of his head; one line loops him into being; the ink floods in */
  leap: [1.95, 2.15] as const,
  line: [2.1, 2.95] as const,
  fill: [2.85, 3.25] as const,
  /** his ink settles, then he notices the Spark */
  wake: [3.2, 3.7] as const,
  look: 3.7,
  /** the Spark hops away along the line; he lifts one foot — his very first step (chapter II carries on in the same shot) */
  away: [4.05, 4.55] as const,
  step: 4.75,
  end: 5.6,
};

/** where the hero stands and the ground, for this screen */
export function stage(f: Frame) {
  const face = faceOf(f);
  return { face, gx: f.w * 0.4, gy: f.h * 0.7, r: face * 0.17 };
}

/** where the Spark waits ahead of him at the end of chapter I (chapter II starts from exactly this) */
export const stageAhead = (f: Frame) => f.w * 0.78;
export function sparkWaiting(f: Frame, t: number): Pt {
  const { face, gy, r } = stage(f);
  return [stageAhead(f), gy - r - Math.abs(Math.sin(t * 4)) * face * 0.35];
}

/** the page's corner curling up, k 0..1 (no longer used) */
export function drawCorner(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  if (k <= 0) return;
  const s = Math.min(w, h) * (0.12 + 0.2 * k);
  ctx.save();
  // the shadow under the lifted corner
  ctx.fillStyle = 'rgba(40,30,20,0.18)';
  ctx.beginPath();
  ctx.moveTo(w, h - s * 1.08);
  ctx.quadraticCurveTo(w - s * 0.5, h - s * 0.5, w - s * 1.08, h);
  ctx.lineTo(w, h);
  ctx.fill();
  // the back of the page, turned up
  ctx.fillStyle = '#f7f3ea';
  ctx.beginPath();
  ctx.moveTo(w, h - s);
  ctx.quadraticCurveTo(w - s * 0.3, h - s * 0.3, w - s, h);
  ctx.lineTo(w - s * 0.62, h - s * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(27,23,20,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function drawStill(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const { face, gx, gy, r } = stage(f);
  drawPaper(ctx, w, h);

  // ---- the title, high on the page, fading as the page is about to turn
  const tw = wordWidth('MAX', 300, 0.16);
  drawTitle(f, w / 2, h * 0.1, (w * 0.56) / tw, 1 - seg(L, 4.4, 5.6));

  // ---- the ground he'll stand on, brushed under him as he is drawn
  drawGround(ctx, w * 0.12, w * 0.88, gy + face * 0.05, face * 0.07, ease.out2(seg(L, ST.line[0] - 0.2, ST.line[0] + 0.5)));

  // ---- the hero: the Spark's ink leaps to the page and one unbroken line loops him into being;
  // then the ink floods into the line, trembles wet and settles; a look at the Spark, a first step
  let pose = 'still_0', rot = 0;
  const lineK = ease.inOut2(seg(L, ST.line[0], ST.line[1]));
  const fill = ease.inOut2(seg(L, ST.fill[0], ST.fill[1]));
  const boil = L < ST.wake[1] ? 0.03 * (1 - seg(L, ST.wake[0], ST.wake[1])) + 0.006 : 0.006;
  if (L >= ST.look) pose = 'curious';
  if (L >= ST.step) { pose = 'firststep_0'; rot = Math.sin(t * 5) * 0.04; }
  // stop scrolling and he passes the time
  const idle = L > ST.look ? idlePose(f) : null;
  if (idle) { pose = idle; rot = 0; }
  const sc = poseHeight('still_0', face) / ONE_HEIGHT;
  if (fill > 0) drawPose(ctx, pose, gx, gy, face, { boil, t, rot, reveal: fill < 1 ? fill : undefined });
  let pen: Pt | null = null;
  const lineA = 1 - seg(L, ST.fill[0] + 0.15, ST.fill[1]);
  if (lineK > 0 && lineA > 0) {
    ctx.save();
    ctx.globalAlpha = lineA;
    // a little tremble while the line is wet
    const jx = Math.sin(t * 31) * face * 0.006, jy = Math.cos(t * 27) * face * 0.006;
    pen = drawOneLine(ctx, gx + jx, gy + jy, sc, lineK, Math.max(1.2, face * 0.032), INK);
    ctx.restore();
  }

  // the Spark's ink leaping from where it landed to the top of his head: the line starts there
  const start: Pt = [gx + ONE_START[0] * sc, gy + ONE_START[1] * sc];
  const restAt: Pt = [w * 0.66, gy - r];
  const leap = seg(L, ST.leap[0], ST.leap[1]);
  if (leap > 0 && lineA > 0) {
    const ctl: Pt = [(restAt[0] + start[0]) / 2, Math.min(restAt[1], start[1]) - face * 1.6];
    const q = (u: number): Pt => [
      (1 - u) * (1 - u) * restAt[0] + 2 * u * (1 - u) * ctl[0] + u * u * start[0],
      (1 - u) * (1 - u) * restAt[1] + 2 * u * (1 - u) * ctl[1] + u * u * start[1],
    ];
    const u1 = ease.out2(leap), u0 = Math.max(0, u1 - 0.6);
    ctx.save();
    ctx.globalAlpha = (1 - seg(L, ST.line[0] + 0.3, ST.line[0] + 0.6)) * lineA;
    ctx.strokeStyle = '#e8432a';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, face * 0.06);
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const p = q(lerp(u0, u1, i / 16));
      if (i) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
    ctx.restore();
    if (leap < 1) pen = q(u1);
  }

  // the brush, riding the line's tip
  if (pen && L < ST.fill[0] + 0.1) {
    const a = 1 - seg(L, ST.line[1], ST.fill[0] + 0.1);
    const [tipX, tipY] = pen;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#8a6a44';
    ctx.lineCap = 'round';
    ctx.lineWidth = face * 0.09;
    ctx.beginPath();
    ctx.moveTo(tipX + face * 0.9, tipY - face * 1.6);
    ctx.lineTo(tipX + face * 0.12, tipY - face * 0.22);
    ctx.stroke();
    brush(ctx, [[tipX + face * 0.12, tipY - face * 0.22], [tipX + face * 0.04, tipY - face * 0.08], [tipX, tipY]], { width: face * 0.14, color: INK, seed: 4, dry: 0.2, press: 1.1, tail: 0.05, halo: 0 });
    ctx.restore();
  }

  // ---- the Spark: drops, rests, bobs in front of him; hops away along the line and waits
  const rest: Pt = restAt;
  const ahead: Pt = [stageAhead(f), gy - r];
  let sp: Pt = rest, sq2 = 1, prev: Pt | null = null;
  if (L < ST.drop[1]) {
    const k = ease.in2(seg(L, ST.drop[0], ST.drop[1]));
    sp = [rest[0], lerp(-r * 4, rest[1], k)];
    prev = [rest[0], lerp(-r * 4, rest[1], ease.in2(seg(L - 0.08, ST.drop[0], ST.drop[1])))];
    sq2 = 1 + k * 0.4;
  } else if (L < ST.drop[1] + 0.25) {
    const k = seg(L, ST.drop[1], ST.drop[1] + 0.25);
    sq2 = 1 - Math.sin(k * Math.PI) * 0.45;
    sp = [rest[0], rest[1] + Math.sin(k * Math.PI) * r * 0.3];
  } else if (L < ST.away[0]) {
    sp = [rest[0], rest[1] - Math.abs(Math.sin(t * 3)) * face * 0.25 * seg(L, ST.wake[1], ST.look)];
  } else if (L < ST.away[1]) {
    sp = hop(rest, ahead, face * 1.2, ease.inOut2(seg(L, ST.away[0], ST.away[1])));
    prev = hop(rest, ahead, face * 1.2, ease.inOut2(seg(L - 0.06, ST.away[0], ST.away[1])));
  } else sp = sparkWaiting(f, t);
  if (L >= ST.drop[0]) {
    if (prev) drawSparkStreak(ctx, prev, sp, r);
    drawSpark(ctx, sp[0], sp[1], r, sq2);
  }
  // the splash ring where it lands
  const ring = seg(L, ST.drop[1], ST.drop[1] + 0.5);
  if (ring > 0 && ring < 1) {
    // flat on the paper: a ring seen at a low angle
    ctx.save();
    ctx.translate(rest[0], rest[1] + r);
    ctx.scale(1, 0.28);
    shockRing(ctx, 0, 0, face * 1.1, ring, INK, face * 0.06);
    ctx.restore();
  }

  // ---- a wordless nudge to scroll, once the page has opened (only before anyone has scrolled)
  const hint = seg(f.intro, 3.0, 3.6) * (1 - seg(L, 0.05, 0.4));
  if (hint > 0) {
    ctx.save();
    ctx.globalAlpha = hint * (0.5 + 0.5 * Math.sin(t * 2.6));
    const y0 = h * 0.8 + Math.sin(t * 2.6) * face * 0.08;
    brush(ctx, [[w / 2, y0], [w / 2, y0 + face * 0.6]], { width: face * 0.06, color: INK, seed: 2, dry: 0.3, press: 1.2, tail: 0.4, halo: 0 });
    brush(ctx, [[w / 2 - face * 0.22, y0 + face * 0.38], [w / 2, y0 + face * 0.62], [w / 2 + face * 0.22, y0 + face * 0.38]], { width: face * 0.05, color: INK, seed: 3, dry: 0.3, press: 1.1, tail: 0.5, halo: 0 });
    ctx.restore();
  }

}
