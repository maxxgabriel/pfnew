import type { Frame } from '../core/frame';
import { type Pt, clamp, ease, lerp, seg } from '../core/math';
import { glow, drawSprite } from '../core/sprites';
import { FD, drawFolding, foldAnchor, sheetRect } from '../reel/fold';
import { drawPose } from './art';
import { drawBg } from './bg';
import { INK, PAPER, drawPaper, drawSpark, drawSparkStreak, faceOf } from './common';
import { shockRing, speedWedges } from './fx';

/*
 * III · FOLD.
 *
 * He runs off the edge of the page and falls — through empty space,
 * tumbling, flailing, then diving like an arrow after the Spark. His page
 * falls after him, fluttering, and swoops underneath him as the evening
 * opens: he crash-lands on it in a superhero crouch — the page has caught
 * him. It folds under his feet (he balances,
 * wobbling), snaps into a bird base and tosses him into the air — and he
 * lands on the back of the paper crane rising out of it. Then the ride:
 * crouched and holding on, a whoop with a fist in the air, surfing upright
 * with his arms out, pointing after the Spark — over the paper countryside
 * that folds up as they pass, into the night, until the two of them are one
 * warm point in the dark (chapter IV's bulb).
 */

export const RD = {
  fall: [0, 2.0] as const,
  open: [1.7, 2.45] as const,
  land: 2.45,
  /** chapter beats over which the fold plays FD 0 → FD.fly */
  fold: [2.45, 5.4] as const,
  /** the ride: FD.fly → FD.away[0] */
  ride: [5.4, 8.2] as const,
  end: 9.0,
};

/** chapter beat → the fold's own beat */
function fdOf(L: number) {
  if (L < RD.fold[0]) return 0;
  if (L < RD.fold[1]) return lerp(0, FD.fly, seg(L, RD.fold[0], RD.fold[1]));
  if (L < RD.ride[1]) return lerp(FD.fly, FD.away[0], seg(L, RD.ride[0], RD.ride[1]));
  return lerp(FD.away[0], FD.end, seg(L, RD.ride[1], RD.end));
}

/** the fall's backdrop: empty paper with a few huge strokes rushing up past him */
function drawVoid(f: Frame, L: number, alpha: number) {
  const { ctx, w, h } = f;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (!drawBg(ctx, 'bg_void', w, h, clamp(L / 2.2), 1, 1.15)) drawPaper(ctx, w, h, PAPER);
  ctx.restore();
}

export function drawRide(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const face = faceOf(f);
  const fd = fdOf(L);

  // ---- the world below: the fold chapter's sky, sheet, crane and countryside
  if (L >= RD.open[0]) drawFolding(f, fd);
  // ---- the void he falls through, giving way to the evening
  const voidA = 1 - ease.inOut2(seg(L, RD.open[0], RD.open[1]));
  drawVoid(f, L, voidA);

  // ---- his page, falling after him: it tumbles down and swoops underneath to catch him
  if (L < RD.land) {
    const k = ease.inOut2(seg(L, 0.2, RD.land));
    const sr = sheetRect(w, h);
    const c: Pt = [lerp(w * 0.1, foldAnchor.x || sr.cx, k), lerp(-h * 0.25, (foldAnchor.y || sr.cy), ease.inOut3(k))];
    const side = lerp(w * 1.3, sr.side, ease.out2(k));
    const spin = (1 - k) * 5.5;
    ctx.save();
    ctx.translate(c[0], c[1]);
    ctx.rotate((1 - k) * 0.9);
    ctx.scale(Math.max(0.08, Math.abs(Math.cos(spin))), 1);
    ctx.fillStyle = 'rgba(10,6,4,0.18)';
    ctx.fillRect(-side / 2 + side * 0.03, -side / 2 + side * 0.04, side, side);
    ctx.fillStyle = Math.cos(spin) > 0 ? PAPER : '#e2d9c6';
    ctx.fillRect(-side / 2, -side / 2, side, side);
    ctx.restore();
  }

  // ---- the fall
  if (L < RD.land) {
    const k = seg(L, RD.fall[0], RD.open[1]);
    let pose = 'fall_0', rot = 0;
    if (L > 0.5) { pose = 'fall_1'; rot = Math.sin(L * 7) * 0.3; }
    if (L > 0.9) { pose = 'fall_2'; rot = Math.sin(L * 3) * 0.12; }
    if (L > 1.45) { pose = 'fall_3'; rot = 0; }
    // he holds the middle of the screen while the world rushes up; then drops onto the sheet
    let x = w * 0.5 + Math.sin(L * 2.3) * w * 0.06, y = h * 0.38;
    let fc = face;
    if (L > RD.open[0]) {
      const u = ease.in2(seg(L, RD.open[0], RD.land));
      x = lerp(x, foldAnchor.x, u);
      y = lerp(y, foldAnchor.y, u);
      fc = lerp(face, face * 0.9, u);
      if (u > 0.5) { pose = 'fall_3'; rot = 0; }
    }
    speedWedges(ctx, w, h, x, y - fc * 1.2, 0.9 * (1 - seg(L, 1.9, RD.land)) * Math.min(1, k * 4), t, INK, 7);
    // the Spark, diving ahead of him
    const sp: Pt = [x + Math.sin(L * 3) * fc * 0.6, y + fc * 2.8 + Math.sin(t * 6) * fc * 0.1];
    drawSparkStreak(ctx, [sp[0], sp[1] - fc * 2], sp, fc * 0.17);
    drawSpark(ctx, sp[0], sp[1], fc * 0.17, 1.3);
    drawPose(ctx, pose, x, y, fc, { rot });
    return;
  }

  // ---- on the paper and on the crane
  if (f.crossedFwd(f.B - L + RD.land)) f.shake(face * 0.3);
  const k = foldAnchor.k;
  const onSheet = fd < FD.snap[1];
  const fc = onSheet ? face * 0.9 : Math.max(2, k * 24);
  let pose = 'hero_0', x = foldAnchor.x, y = foldAnchor.y, rot = 0, flip = false;
  if (fd > 0.6) pose = 'home_1';
  if (fd > FD.fold1[0] - 0.1) {
    // balancing as the paper folds away under his boots
    pose = 'acro_3';
    rot = Math.sin(fd * 6) * 0.12;
  }
  if (fd > FD.snap[0] - 0.05 && fd < FD.rise[1]) {
    // tossed up by the snap, flailing, and down onto the crane's back
    const u = seg(fd, FD.snap[0] - 0.05, FD.rise[1]);
    pose = u < 0.75 ? 'fall_0' : 'ride_0';
    y -= Math.sin(u * Math.PI) * face * 3.2;
    rot = u < 0.75 ? (u - 0.35) * 1.2 : 0;
  } else if (fd >= FD.rise[1]) pose = 'ride_0';
  if (L > RD.ride[0] + 0.5) pose = 'ride_1';
  if (L > RD.ride[0] + 1.3) pose = 'ride_2';
  if (L > RD.ride[0] + 2.1) pose = 'ride_3';
  // landing ring on the sheet
  const ring = seg(L, RD.land, RD.land + 0.4);
  if (ring > 0 && ring < 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.3);
    shockRing(ctx, 0, 0, face * 1.6, ring, INK, face * 0.06);
    ctx.restore();
  }
  const dark = ease.inOut2(seg(fd, FD.dark[0], FD.dark[1]));
  // he leaps off the crane after the Spark, diving into the light ahead
  const jump = seg(L, 8.15, 8.75);
  if (jump > 0) {
    const u = ease.in2(jump);
    pose = 'fall_3';
    x = lerp(x, w * 0.5, u);
    y = lerp(y, h * 0.36, u);
    rot = lerp(0, -Math.PI / 2, ease.inOut2(jump));
  }
  drawPose(ctx, pose, x, y, jump > 0 ? lerp(fc, face * 0.25, ease.in2(jump)) : fc, { rot, flip, alpha: jump > 0 ? 1 - seg(jump, 0.8, 1) : 1 - dark });
  // the light he dives into swells into chapter IV's bulb
  const swell = ease.in2(seg(L, 8.3, RD.end));
  if (swell > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + swell * 0.6;
    drawSprite(ctx, glow('#ffcf7a', 128), w * 0.5, h * 0.35, lerp(face * 0.8, face * 6, swell));
    ctx.globalAlpha = swell;
    drawSprite(ctx, glow('#fff6e0', 64, 0.35), w * 0.5, h * 0.35, lerp(4, face * 0.9, swell));
    ctx.restore();
  }

  // ---- the Spark, ahead in the sky; at the end it shoots off toward the dark
  if (!onSheet) {
    const lead = seg(L, RD.ride[1] - 0.6, RD.ride[1] + 0.4);
    const base: Pt = [x + fc * 3.2 + Math.sin(t * 1.7) * fc * 0.3, y - fc * 2.6 + Math.sin(t * 2.3) * fc * 0.25];
    const far: Pt = [w / 2, h * 0.45];
    const sp: Pt = [lerp(base[0], far[0], ease.in2(lead)), lerp(base[1], far[1], ease.in2(lead))];
    const r = lerp(Math.max(3, fc * 0.2), 2, lead);
    if (lead < 1) drawSpark(ctx, sp[0], sp[1], r, 1, 1 - dark * 0.5);
  } else if (L < RD.land + 0.6) {
    const sp: Pt = [x + face * 2.4, y - face * 2.2 - Math.sin(t * 3) * face * 0.2];
    drawSpark(ctx, sp[0], sp[1], face * 0.17);
  }
}
