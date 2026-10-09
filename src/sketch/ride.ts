import type { Frame } from '../core/frame';
import { type Pt, clamp, ease, lerp, seg } from '../core/math';
import { FD, drawFolding, foldAnchor, setSketchSea, sheetRect } from '../reel/fold';
setSketchSea(true);
import { artSize, drawArtFoot, drawPose, figHeight } from './art';
import { drawBg, drawBgXY } from './bg';
import { INK, PAPER, drawPaper, drawSpark, drawSparkStreak, faceOf } from './common';
import { speedWedges } from './fx';

/*
 * III · FOLD.
 *
 * He runs off the edge of the page and falls — through empty space,
 * tumbling, flailing, then diving like an arrow after the Spark. Out of
 * nowhere a street-artist hero — the Slinger, an original homage — swings
 * in on a line of ink, scoops him up under one arm and swings him down onto
 * his page as it swoops underneath. A pause (the 'cameo' hold): the Slinger
 * lands beside him; he bows and waves a thank-you; a thumbs-up, a salute, a
 * line of ink shot up, and the Slinger swings out of the frame. It folds under his feet (he balances,
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

/** the Slinger: drawn by height (his sheets have no face to measure), feet at (x, y) */
function drawSlinger(ctx: CanvasRenderingContext2D, k: string, x: number, y: number, height: number, rot = 0, flip = false) {
  const [aw] = artSize(k);
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  drawArtFoot(ctx, k, 0, 0, aw * (height / figHeight(k)), flip ? -rot : rot);
  ctx.restore();
}

/** a line of ink from a point up out of the frame (the Slinger's swing line) */
function inkLine(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, width: number, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.quadraticCurveTo((from[0] + to[0]) / 2 + width * 2, (from[1] + to[1]) / 2, to[0], to[1]);
  ctx.stroke();
  ctx.restore();
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
    // ---- the Slinger swings in on a line of ink, scoops him up and carries him down onto the page
    const SH = fc * 3.6;
    const grab = 1.3;
    if (L > 0.85) {
      const anchor: Pt = [w * 0.62, -h * 0.35];
      let sx: number, sy: number, sk: string, srot: number;
      if (L < grab) {
        // swinging in from the upper left, along an arc round the anchor
        const u = ease.inOut2(seg(L, 0.85, grab));
        const a = lerp(-1.25, -0.25, u), R = Math.hypot(w * 0.5, h * 0.8);
        sx = anchor[0] + Math.sin(a) * R; sy = anchor[1] + Math.cos(a) * R;
        sk = u < 0.65 ? 'slinger_swing_0' : 'slinger_swing_1';
        srot = a * 0.4;
      } else {
        // carrying him: the swing continues down onto the sheet
        const u = ease.inOut2(seg(L, grab, RD.land));
        const target: Pt = [foldAnchor.x || w * 0.5, foldAnchor.y || h * 0.45];
        // the Slinger's feet ride above and behind him; he hangs from the hooked arm, feet ending on the sheet
        sx = lerp(x - fc * 0.35, target[0] - fc * 0.35, u);
        sy = lerp(y - fc * 1.2, target[1] - fc * 1.2, u) - Math.sin(u * Math.PI) * fc * 1.2;
        sk = 'slinger_swing_2';
        srot = lerp(0.1, -0.1, u);
        pose = 'hero_thanks_0'; rot = 0;
        x = sx + fc * 0.35; y = sy + fc * 1.2;
      }
      inkLine(ctx, [sx + fc * 0.5, sy - SH * 0.85], [anchor[0] + (sx - w * 0.5) * 0.15, -fc], Math.max(1.5, fc * 0.05), 1 - seg(L, RD.land - 0.2, RD.land));
      drawSlinger(ctx, sk, sx, sy, SH, srot);
      if (L >= grab) drawPose(ctx, pose, x, y, fc, { rot });
      if (L < grab) {
        speedWedges(ctx, w, h, x, y - fc * 1.2, 0.9 * Math.min(1, k * 4), t, INK, 7);
        drawPose(ctx, pose, x, y, fc, { rot });
      }
      if (f.crossedFwd(f.B - L + grab)) f.shake(fc * 0.25);
      return;
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
  let pose = 'home_1', x = foldAnchor.x, y = foldAnchor.y, rot = 0, flip = false;
  // ---- the cameo: the Slinger beside him on the page; a thank-you; the Slinger swings away
  const cameo = f.hold?.kind === 'cameo' ? f.hold.p : -1;
  if (cameo >= 0) {
    const SH = fc * 3.6;
    // beside him on the page, but always on screen (a phone is narrow)
    const sxBase = x + Math.min(fc * 2.2, w - x - fc * 1.1), sy = y;
    let sk = 'slinger_ground_0', sx = sxBase, syy = sy, srot = 0;
    pose = 'home_1';
    if (cameo > 0.12) { pose = 'hero_thanks_1'; sk = 'slinger_ground_1'; }
    if (cameo > 0.42) { pose = 'hero_thanks_2'; sk = 'slinger_ground_2'; }
    if (cameo > 0.62) { sk = 'slinger_ground_3'; }
    if (cameo > 0.72) {
      // up and away on a line of ink, out of the top right of the frame
      const u = ease.in2(seg(cameo, 0.72, 1));
      sk = u < 0.5 ? 'slinger_swing_3' : 'slinger_swing_0';
      sx = lerp(sxBase, w * 1.25, u);
      syy = lerp(sy, -SH * 0.6, u) - Math.sin(u * Math.PI) * fc;
      srot = -0.4 * u;
      pose = 'hero_thanks_3';
    }
    if (cameo > 0.62) inkLine(ctx, [sx + SH * 0.12, syy - SH * 0.9], [sxBase + w * 0.25, -fc], Math.max(1.5, fc * 0.05), 1 - seg(cameo, 0.9, 1));
    drawSlinger(ctx, sk, sx, syy, SH, srot);
  }
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
  const dark = 0; // (over the painted sea the night never goes black: he leaps off into it)
  // he leaps up off the crane after the Spark, out of the top of the frame (chapter IV: he comes down on the sea)
  const jump = seg(L, 8.15, 8.75);
  if (jump > 0) {
    const u = ease.in2(jump);
    pose = 'leap_2';
    x = lerp(x, w * 0.5, ease.out2(jump));
    y = lerp(y, -face * 2.5, u);
    rot = 0;
  }
  drawPose(ctx, pose, x, y, fc, { rot, flip, alpha: jump > 0 ? 1 : 1 - dark });
  // the night gives way to the sea of ink he is about to fall into
  const sea = ease.inOut2(seg(L, 8.35, RD.end));
  if (sea > 0) drawBgXY(ctx, 'bg_inksea', w, h, 0.05, 0, sea, 1.35);

  // ---- the Spark, ahead in the sky; at the end it shoots off toward the dark
  if (!onSheet) {
    const lead = seg(L, RD.ride[1] - 0.6, RD.ride[1] + 0.4);
    const base: Pt = [x + fc * 3.2 + Math.sin(t * 1.7) * fc * 0.3, y - fc * 2.6 + Math.sin(t * 2.3) * fc * 0.25];
    const far: Pt = [w / 2, -h * 0.1];
    const sp: Pt = [lerp(base[0], far[0], ease.in2(lead)), lerp(base[1], far[1], ease.in2(lead))];
    const r = lerp(Math.max(3, fc * 0.2), 2, lead);
    if (lead < 1) drawSpark(ctx, sp[0], sp[1], r, 1, 1 - dark * 0.5);
  } else if (L < RD.land + 0.6) {
    const sp: Pt = [x + face * 2.4, y - face * 2.2 - Math.sin(t * 3) * face * 0.2];
    drawSpark(ctx, sp[0], sp[1], face * 0.17);
  }
}
