import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { wordWidth } from '../core/glyphs';
import { type Pt, clamp, ease, lerp, seg } from '../core/math';
import { drawPose } from './art';
import { INK, cycle, drawGround, drawPaper, drawSpark, drawSparkStreak, drawTitle, faceOf, hop } from './common';
import { shockRing } from './fx';

/*
 * I · STILL.
 *
 * The page opens: MAX GABRIEL is brushed in, and the Spark drops onto the
 * paper like a fresh drop of seal ink. A brush draws the hero beside it —
 * and he is only a drawing. The Spark bounces in front of him; all he can
 * do is tremble (his lines boil). His eyes follow it; it lands on his nose
 * and he goes cross-eyed; he strains with everything he has, lunges, and
 * falls flat on his face. Dazed, he sits up; the Spark hops to the corner
 * of the page; he jumps, runs after it and grabs the corner — and the page
 * lifts (chapter II is the flip book).
 */

export const ST = {
  drop: [1.15, 1.85] as const,
  draw: [2.0, 3.2] as const,
  bounce: [3.3, 4.1] as const,
  look: 4.1,
  nose: [4.75, 5.15] as const,
  strain: [5.55, 6.25] as const,
  plant: 6.35,
  dazed: 6.95,
  corner: [7.55, 8.05] as const,
  jump: 7.55,
  run: [7.95, 8.55] as const,
  grab: 8.55,
  end: 9.0,
};

/** where the hero stands and the ground, for this screen */
export function stage(f: Frame) {
  const face = faceOf(f);
  return { face, gx: f.w * 0.4, gy: f.h * 0.7, r: face * 0.17 };
}

/** the page's corner curling up, k 0..1 (chapter II starts from k = 1) */
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
  drawTitle(f, w / 2, h * 0.1, (w * 0.56) / tw, 1 - seg(L, 7.6, 8.8) * 0.85);

  // ---- the ground he'll stand on, brushed under him as he is drawn
  drawGround(ctx, w * 0.12, w * 0.88, gy + face * 0.05, face * 0.07, ease.out2(seg(L, ST.draw[0] - 0.2, ST.draw[0] + 0.5)));

  // ---- the hero
  const nose: Pt = [gx + face * 0.35, gy - face * 2.45];
  let pose = 'still_0', px = gx, flip = false, boil = 0, sq = 1;
  const reveal = ease.inOut2(seg(L, ST.draw[0], ST.draw[1]));
  if (L >= ST.bounce[0]) boil = 0.012 + 0.02 * seg(L, ST.bounce[0], ST.look);
  if (L >= ST.look) pose = 'curious';
  if (L >= ST.nose[0] + 0.15) pose = 'comedy_0';
  if (L >= ST.strain[0]) {
    pose = 'still_1';
    boil = 0.03 + 0.05 * seg(L, ST.strain[0], ST.strain[1]);
    sq = 1 - 0.05 * seg(L, ST.strain[0], ST.strain[1]);
  }
  if (L >= ST.plant - 0.1) {
    // the lunge: he tips over and lands flat on his face
    pose = 'comedy_1';
    boil = 0;
    sq = 1;
    px = gx + face * 0.5;
    if (f.crossedFwd(f.B - L + ST.plant)) f.shake(face * 0.25);
  }
  if (L >= ST.dazed) pose = 'comedy_2';
  if (L >= ST.jump) { pose = 'comedy_3'; px = gx + face * 0.4; }
  if (L >= ST.run[0]) {
    const k = seg(L, ST.run[0], ST.run[1]);
    pose = cycle('run', 6, t, 14);
    px = lerp(gx + face * 0.4, w * 0.72, ease.inOut2(k));
  }
  if (L >= ST.grab) { pose = 'still_3'; px = w * 0.74; }
  // the lunge's arc: a little hop forward as he tips
  let py = gy;
  if (L >= ST.plant - 0.25 && L < ST.plant) py = gy - Math.sin(seg(L, ST.plant - 0.25, ST.plant) * Math.PI) * face * 0.6;
  if (L >= ST.jump && L < ST.run[0]) py = gy - Math.sin(seg(L, ST.jump, ST.run[0]) * Math.PI) * face * 0.9;
  drawPose(ctx, pose, px, py, face, { flip, boil, t, squash: sq, reveal: L < ST.draw[1] ? reveal : undefined });

  // the brush that draws him: its wet tip travels down the drawing
  if (L > ST.draw[0] - 0.1 && L < ST.draw[1] + 0.2) {
    const k = seg(L, ST.draw[0], ST.draw[1]);
    const a = 1 - seg(L, ST.draw[1], ST.draw[1] + 0.2);
    const tipY = lerp(gy - face * 3.6, gy, k);
    const tipX = gx + Math.sin(k * 26) * face * 0.7;
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

  // ---- the Spark
  const rest: Pt = [w * 0.66, gy - r];
  const left: Pt = [gx + face * 1.1, gy - r];
  const right: Pt = [gx + face * 2.4, gy - r];
  const far: Pt = [w * 0.8, gy - r];
  const corner: Pt = [w * 0.92, h * 0.94];
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
  } else if (L < ST.bounce[0]) {
    sp = rest;
  } else if (L < ST.look) {
    // bouncing back and forth in front of him, teasing
    const k = seg(L, ST.bounce[0], ST.look) * 3;
    const i = Math.floor(Math.min(2.999, k)), u = k - i;
    const pts = [rest, left, right, left];
    sp = hop(pts[i], pts[i + 1], face * 0.9, ease.inOut2(u));
  } else if (L < ST.nose[0]) {
    sp = hop(left, right, face * 0.4, 0.5 + 0.5 * Math.sin((L - ST.look) * 9));
    sp = left;
  } else if (L < ST.nose[1]) {
    sp = hop(left, nose, face * 1.2, ease.inOut2(seg(L, ST.nose[0], ST.nose[1])));
  } else if (L < ST.strain[0]) {
    sp = [nose[0], nose[1] + Math.sin(t * 6) * face * 0.02];
  } else if (L < ST.strain[0] + 0.35) {
    sp = hop(nose, far, face * 1.4, ease.inOut2(seg(L, ST.strain[0], ST.strain[0] + 0.35)));
  } else if (L < ST.dazed) {
    sp = far;
    if (L > ST.plant - 0.3 && L < ST.plant) sp = hop(far, [w * 0.86, gy - r], face * 1.1, seg(L, ST.plant - 0.3, ST.plant));
    if (L >= ST.plant) sp = [w * 0.86, gy - r];
  } else if (L < ST.corner[0]) {
    // circling over his dazed head
    const a = (L - ST.dazed) * 12;
    const c: Pt = [gx + face * 0.6, gy - face * 2.2];
    sp = [c[0] + Math.cos(a) * face * 0.6, c[1] + Math.sin(a) * face * 0.18];
  } else if (L < ST.corner[1]) {
    const c: Pt = [gx + face * 0.6, gy - face * 2.2];
    sp = hop(c, corner, face * 1.6, ease.inOut2(seg(L, ST.corner[0], ST.corner[1])));
    prev = hop(c, corner, face * 1.6, ease.inOut2(seg(L - 0.06, ST.corner[0], ST.corner[1])));
  } else {
    sp = [corner[0], corner[1] + Math.sin(t * 5) * face * 0.04];
  }
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

  // ---- the corner lifting under his hands
  drawCorner(ctx, w, h, clamp(seg(L, ST.grab, ST.end)));
}
