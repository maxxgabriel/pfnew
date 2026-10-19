import type { Frame } from '../core/frame';
import { type Pt, clamp, ease, lerp, seg } from '../core/math';
import { artSize, drawArtFoot, drawPose, drawWaterWave } from './art';
import { bgImage } from './bg';
import { drawWorld } from './worlds';
import { drawSpark, drawSparkStreak, faceOf } from './common';
import { shockRing } from './fx';

/* III · WAVE. The page-edge fall lands on a brush in the sea.
 * The curling lip launches him toward its huge painted moon. */

export const SE = {
  dive: [0, 0.8] as const,
  land: 0.8,
  surf: [0.8, 2.6] as const,
  rise: [1.9, 3.2] as const,
  tube: [3.2, 4.15] as const,
  close: [3.95, 4.45] as const,
  flip: 4.5,
  end: 5.5,
};

/** where the sea's surface is on screen */
const seaY = (h: number) => h * 0.72;

/** Shared source coordinates for the painted moon and the launch seam.
 * New landscape plates: upper-centre; legacy portrait plate: authored round 33 crop. */
export function seaMoon() {
  const fresh = bgImage('wc_sky');
  const im = fresh ?? bgImage('bg_inksea');
  const iw = im?.naturalWidth || 1024, ih = im?.naturalHeight || 1536;
  return { im, iw, ih, mx: iw * (fresh ? 0.502 : 0.5025),
    my: ih * (fresh ? 0.206 : 0.35), radius: iw * (fresh ? 0.0775 : 0.1425) };
}

/** Keep the full moon in frame on wide screens too; the launch seam uses
 * this exact projection, so its growing moon begins on the painted one. */
export function seaCamera(w: number, h: number, L: number) {
  const { iw, ih, mx, my, radius } = seaMoon();
  const scale = Math.max(w / iw, h / ih) * 1.35;
  const dw = iw * scale, dh = ih * scale;
  const drift = lerp(0.42, 0.58, seg(L, SE.dive[0], SE.close[1]));
  const margin = Math.min(w * 0.48, radius * scale * 1.05);
  const desiredX = clamp(mx * scale - (dw - w) * drift, margin, w - margin);
  const px = clamp((mx * scale - desiredX) / Math.max(1, dw - w));
  const targetPan = clamp((my * scale - h * 0.28) / Math.max(1, dh - h));
  const py = targetPan * ease.out2(seg(L, 0, SE.land + 0.4));
  return { px, py, x: mx * scale - (dw - w) * px,
    y: my * scale - (dh - h) * py, r: radius * scale };
}

export function drawSea(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const face = faceOf(f);
  const sy = seaY(h);
  const tube = ease.inOut2(seg(L, SE.tube[0], SE.tube[1]));

  // ---- the sea under the moon, sliding past as he rides
  ctx.fillStyle = '#0b0a0c';
  ctx.fillRect(0, 0, w, h);
  const camera = seaCamera(w, h, L);
  drawWorld(f, 'Wave', L, { panX: camera.px, panY: camera.py, impacts: [SE.land], impactX: w * 0.42 });

  // ---- the wave: it stands up behind him and throws its lip over him (flipped so it breaks to the right, his way)
  const rk = seg(L, SE.rise[0], SE.rise[1]);
  if (rk > 0) {
    const key = tube > 0 ? 'wave_2' : rk < 0.55 ? 'wave_0' : 'wave_1';
    const [aw, ah] = artSize(key);
    const H = lerp(h * 0.35, h * 1.15, ease.inOut2(rk)) * lerp(1, 1.9, tube);
    const W = H * (aw / ah);
    // its base on the sea, sliding in from the left behind him; in the tube its hollow sits over him
    const bx = lerp(-W * 0.2, w * 0.18, ease.out2(rk)) + tube * (w * 0.38 - W * 0.12);
    const lean = tube * 0.12 + ease.in3(seg(L, SE.close[0], SE.close[1])) * 0.35;
    ctx.save();
    ctx.translate(bx, sy + face * 0.4 + tube * h * 0.25);
    ctx.rotate(lean);
    ctx.scale(-1, 1);
    drawWaterWave(ctx, key, W);
    ctx.restore();
  }

  // ---- him: diving, landing on the brush, surfing, crouched in the tube
  let x = w * 0.42, y = sy, pose = 'surf_0', rot = 0;
  if (L < SE.land) {
    const u = ease.in2(seg(L, SE.dive[0], SE.land));
    pose = 'fall_3';
    x = lerp(w * 0.5, w * 0.42, u);
    y = lerp(-face * 2, sy, u);
    // the brush tumbling down beside him, landing flat on the water
    const bw = face * 3.4;
    const by = lerp(-face * 4, sy + face * 0.15, ease.in2(seg(L, 0.1, SE.land)));
    ctx.save();
    ctx.translate(lerp(w * 0.75, x, u), by);
    ctx.rotate(lerp(2.4, 0, ease.out2(u)));
    drawArtFoot(ctx, 'brushprop_0', 0, 0, bw);
    ctx.restore();
  } else {
    const ph = (L - SE.land) * 3.2;
    const slope = Math.cos(ph) * 0.12;
    y = sy + Math.sin(ph) * face * 0.25;
    rot = -slope;
    pose = Math.sin(ph * 0.5) > 0 ? 'surf_1' : 'surf_0';
    if (L > SE.rise[0] + 0.4) pose = 'surf_0';
    if (tube > 0) { pose = 'surf_2'; rot = 0; y = sy; }
    x = w * 0.42 + Math.sin(L * 1.3) * face * 0.3;
  }
  if (f.crossedFwd(f.B - L + SE.land)) f.shake(face * 0.3);
  const splash = seg(L, SE.land, SE.land + 0.45);
  if (splash > 0 && splash < 1) {
    ctx.save();
    ctx.translate(x, sy + face * 0.1);
    ctx.scale(1, 0.25);
    shockRing(ctx, 0, 0, face * 2.6, splash, 'rgba(240,236,226,0.9)', face * 0.1);
    ctx.restore();
  }
  if (L > SE.close[0]) {
    const launch = ease.in2(seg(L, SE.close[0], 5.0));
    x = lerp(x, w * 0.5, launch);
    y = lerp(y, -h * 0.2, launch);
    pose = 'leap_2'; rot = -launch * 0.3;
  }
  drawPose(ctx, pose, x, y, face, { rot });
  // ---- the Spark: skimming the water ahead of him, then out through the end of the tube
  let sp: Pt = [x + face * 3, y - face * 1.6 + Math.sin(t * 5) * face * 0.2];
  if (L < SE.land) sp = [lerp(w * 0.5, x + face * 3, seg(L, 0, SE.land)), lerp(h * 0.3, sy - face * 1.4, ease.in2(seg(L, 0, SE.land)))];
  const out = seg(L, SE.tube[0] + 0.3, SE.close[1]);
  if (out > 0) sp = [lerp(sp[0], w * 1.05, ease.in2(out)), lerp(sp[1], sy - face * 0.6, out)];
  drawSparkStreak(ctx, [sp[0] - face * 0.8, sp[1] + face * 0.05], sp, face * 0.17, 0.5);
  drawSpark(ctx, sp[0], sp[1], face * 0.17);

  // The curl releases him upward; seams.ts carries this launch onto the moon.
}
