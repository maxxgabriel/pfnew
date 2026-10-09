import type { Frame } from '../core/frame';
import { type Pt, clamp, ease, lerp, seg } from '../core/math';
import { FD, drawFolding, foldAnchor, setSketchSea, sheetRect } from '../reel/fold';
setSketchSea(true);
import { drawPose, figPoint } from './art';
import { CARRY, drawSpidey, handOf, swingAt, webLine, webShot } from './spidey';
import { drawBg, drawBgXY } from './bg';
import { INK, PAPER, drawPaper, drawSpark, drawSparkStreak, faceOf } from './common';
import { speedWedges } from './fx';

/*
 * III · FOLD.
 *
 * He runs off the edge of the page and falls — through empty space,
 * tumbling, flailing, then diving like an arrow after the Spark. Out of
 * nowhere a web-swinger (a Spider-Verse-style homage, src/sketch/spidey.ts)
 * swings in on a web, scoops him up under one arm and swings him down onto
 * his page as it swoops underneath. A pause (the 'cameo' hold): the swinger
 * lands beside him, drops into a crouch; he bows and waves a thank-you; a
 * salute, a web shot up, and the swinger swings out of the frame. It folds under his feet (he balances,
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

/** the swinger's size: his standing drawing (sil_pose_2) is this many of the hero's face widths tall */
const SP_TALL = 4.4;
const spScale = (fc: number) => (fc * SP_TALL) / 690;

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
    // ---- the web-swinger swings in, scoops him up and swings him down onto the page (real pendulum arcs)
    const grab = 1.3;
    if (L > 0.85) {
      const sc = spScale(fc);
      const heroH = fc * 3.3;
      const target: Pt = [foldAnchor.x || w * 0.5, foldAnchor.y || h * 0.45];
      // where his hand (on the rope) must be for the hooked arm to hold the hero, hero's feet at `foot`
      const handFor = (foot: Pt): Pt => {
        const hk = handOf('sil_swing_2');
        return [foot[0] - fc * 0.35 + (hk[0] - CARRY[0]) * sc, foot[1] - heroH * 0.92 + (hk[1] - CARRY[1]) * sc];
      };
      const G = handFor([w * 0.5 + Math.sin(grab * 2.3) * w * 0.06, h * 0.38]);
      const T = handFor(target);
      let sk: string, hand: Pt, th: number, anchor: Pt;
      if (L < grab) {
        // in from the upper left: a swing round an anchor high above, ending at the grab
        const R = Math.max(h * 0.75, w * 0.45);
        anchor = [G[0] - Math.sin(0.15) * R, G[1] - Math.cos(0.15) * R];
        th = lerp(-1.15, 0.15, ease.inOut2(seg(L, 0.85, grab)));
        hand = swingAt(anchor, R, th);
        sk = th < -0.35 ? 'sil_swing_0' : 'sil_swing_1';
      } else {
        // carrying him: a swing round one anchor high above, the web reeling in so the arc ends over the sheet
        anchor = [lerp(G[0], T[0], 0.5), Math.min(G[1], T[1]) - h * 0.85];
        const u = ease.inOut2(seg(L, grab, RD.land));
        const R0 = Math.hypot(G[0] - anchor[0], G[1] - anchor[1]), R1 = Math.hypot(T[0] - anchor[0], T[1] - anchor[1]);
        const a0 = Math.atan2(G[0] - anchor[0], G[1] - anchor[1]), a1 = Math.atan2(T[0] - anchor[0], T[1] - anchor[1]);
        th = lerp(a0, a1, u);
        hand = swingAt(anchor, lerp(R0, R1, u) - Math.sin(u * Math.PI) * h * 0.05, th);
        sk = 'sil_swing_2';
      }
      const so = { anchor: handOf(sk), rot: -th, t };
      const ropeTop: Pt = [hand[0] + (anchor[0] - hand[0]) * 3, hand[1] + (anchor[1] - hand[1]) * 3];
      webLine(ctx, hand, ropeTop, Math.max(1.5, fc * 0.045));
      if (L < grab) {
        speedWedges(ctx, w, h, x, y - fc * 1.2, 0.9 * Math.min(1, k * 4), t, INK, 7);
        drawPose(ctx, pose, x, y, fc, { rot });
        drawSpidey(ctx, sk, hand[0], hand[1], sc, so);
      } else {
        // he hangs from the hooked arm
        const c = figPoint(sk, CARRY, hand[0], hand[1], sc, so);
        drawSpidey(ctx, sk, hand[0], hand[1], sc, so);
        drawPose(ctx, 'hero_thanks_0', c[0] + fc * 0.35, c[1] + heroH * 0.92, fc);
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
  // ---- the cameo: the swinger beside him on the page; a thank-you; he swings away
  const cameo = f.hold?.kind === 'cameo' ? f.hold.p : -1;
  if (cameo >= 0) {
    const sc = spScale(fc);
    // beside him on the page, but always on screen (a phone is narrow)
    const sxBase = x + Math.min(fc * 2.4, w - x - fc * 1.3), sy = y;
    pose = 'home_1';
    let sk = 'sil_pose_0';
    if (cameo > 0.1) { pose = 'hero_thanks_1'; sk = 'sil_pose_1'; }
    if (cameo > 0.38) { pose = 'hero_thanks_2'; sk = 'sil_pose_2'; }
    if (cameo > 0.58) sk = 'sil_pose_3';
    if (cameo > 0.72) pose = 'hero_thanks_3';
    if (cameo <= 0.72) {
      drawSpidey(ctx, sk, sxBase, sy, sc, { t });
      // the 'thwip': a web shot straight up and away to the upper right
      if (cameo > 0.6) {
        const hp = figPoint(sk, handOf(sk), sxBase, sy, sc);
        webShot(ctx, hp, [hp[0] + w * 0.35, -h * 0.4], Math.max(1.5, fc * 0.045), Math.min(1, (cameo - 0.6) / 0.08));
      }
    } else {
      // away: a swing round the anchor up there and out of the frame
      const hp0 = figPoint('sil_pose_3', handOf('sil_pose_3'), sxBase, sy, sc);
      const anchor: Pt = [hp0[0] + w * 0.35, -h * 0.4];
      const R = Math.hypot(anchor[0] - hp0[0], anchor[1] - hp0[1]);
      const th0 = Math.atan2(hp0[0] - anchor[0], hp0[1] - anchor[1]);
      const u = seg(cameo, 0.72, 1);
      const th = lerp(th0, th0 + 1.9, ease.in2(u));
      const hand = swingAt(anchor, R, th);
      const k2 = u < 0.35 ? 'sil_swing_0' : u < 0.7 ? 'sil_swing_1' : 'sil_swing_4';
      webLine(ctx, hand, anchor, Math.max(1.5, fc * 0.045), 1 - seg(u, 0.85, 1));
      drawSpidey(ctx, k2, hand[0], hand[1], sc, { anchor: handOf(k2), rot: -th, t });
    }
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
