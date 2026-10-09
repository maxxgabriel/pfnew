import type { Frame } from '../core/frame';
import { type Pt, clamp, ease, lerp, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { artSize, drawArt, drawPose } from './art';
import { drawBg } from './bg';
import { drawSpark, faceOf } from './common';
import { shockRing } from './fx';

/*
 * V · DEEP.
 *
 * The negative of the sea: white ink on black water, light falling in dark
 * shafts. Only he keeps his colours — and the Spark, the one red thing,
 * which swims on ahead. Below him a whale glides past, the size of the
 * world. He floats, looking down at it. Then it turns: its mouth opens and
 * comes at him, and the screen goes into it (chapter VI is the bulb inside
 * the whale: the Spark rises in the dark and becomes it).
 */

export const DP = {
  /** negative beats: the plunge in, drawn under the last of chapter IV */
  arrive: [-1, 0.6] as const,
  swim: [0.6, 2.2] as const,
  pass: [0.9, 2.7] as const,
  awe: [2.1, 2.6] as const,
  turn: [2.6, 3.05] as const,
  swallow: [3.0, 3.8] as const,
  bulb: [3.9, 5.0] as const,
  end: 5.0,
};

/** the whale's mouth, as a fraction of its drawing (the open-mouthed frame) */
const MOUTH: Pt = [0.9, 0.36];

/** `pre` < 1: drawn by chapter IV while he is still plunging in (L is then ignored) */
export function drawDeep(f: Frame, L: number, pre = 1) {
  const { ctx, w, h, t } = f;
  const face = faceOf(f);
  if (pre < 1) L = lerp(DP.arrive[0], 0, pre);
  const swallow = ease.in3(seg(L, DP.swallow[0], DP.swallow[1]));

  // ---- the deep, in negative (the painting and the whale are inverted; he and the Spark are not)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  drawBg(ctx, 'bg_deep', w, h, clamp(0.3 + L * 0.06), 1, 1.15);

  // the whale gliding past below him, then turning, mouth open, coming at the screen
  const passK = seg(L, DP.pass[0], DP.pass[1]);
  if (passK > 0 && L < DP.turn[0]) {
    const W = w * 2.6;
    drawArt(ctx, 'whale_0', lerp(-W * 0.6, w + W * 0.6, passK), h * 0.86, W);
  }
  const tk = seg(L, DP.turn[0], DP.swallow[1]);
  if (tk > 0) {
    const [aw, ah] = artSize('whale_1');
    const W = lerp(w * 0.5, w * 22, ease.in3(tk));
    // flipped so it faces us from the right; its mouth comes to the middle of the screen
    const m: Pt = [w * 0.5, h * 0.45];
    const cx = m[0] + (MOUTH[0] - 0.5) * W, cy = m[1] - (MOUTH[1] - 0.5) * W * (ah / aw);
    drawArt(ctx, 'whale_1', lerp(w * 0.9, cx, ease.out2(clamp(tk * 2))), lerp(h * 0.75, cy, ease.out2(clamp(tk * 2))), W, { flip: true });
  }
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  // one ink, no colour cast; the water darkening the deeper it goes
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#c4c4c4');
  g.addColorStop(0.55, '#909090');
  g.addColorStop(1, '#4a4a4a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // ---- him: plunging in, swimming after the Spark, awed, alarmed
  let x = w * 0.42, y = h * 0.42, pose = 'swim_0', rot = 0;
  if (L < DP.arrive[1]) {
    const u = seg(L, DP.arrive[0], DP.arrive[1]);
    pose = u < 0.6 ? 'swim_1' : 'swim_0';
    y = lerp(-face * 2, h * 0.42, ease.out2(u));
    rot = lerp(0.4, 0, u);
  } else if (L < DP.awe[0]) {
    x = w * 0.42 + Math.sin(L * 2) * face * 0.3;
    y = h * 0.42 + Math.sin(t * 1.6) * face * 0.15;
  } else if (L < DP.turn[0]) {
    pose = 'swim_2';
    y = h * 0.4 + Math.sin(t * 1.4) * face * 0.1;
  } else {
    pose = 'swim_3';
    x = lerp(w * 0.42, w * 0.3, seg(L, DP.turn[0], DP.swallow[0]));
  }
  const sink = seg(L, DP.arrive[0], 0);
  if (sink > 0 && sink < 1) shockRing(ctx, w * 0.42, face * 0.6, face * 3, sink, 'rgba(255,255,255,0.7)', face * 0.08);
  if (swallow < 1) drawPose(ctx, pose, x, y, face * lerp(1, 0.4, swallow), { rot, alpha: 1 - swallow });

  // ---- inside: dark, and the Spark rising in it and swelling warm — the bulb (chapter VI)
  if (swallow > 0) {
    ctx.save();
    ctx.globalAlpha = swallow;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ---- the Spark: ahead of him in the water, then hanging in the dark, then the bulb
  let sp: Pt = [x + face * 3.2 + Math.sin(t * 2.4) * face * 0.3, y - face * 1.0 + Math.sin(t * 3.1) * face * 0.25];
  const bk = ease.inOut2(seg(L, DP.bulb[0], DP.bulb[1]));
  if (L > DP.swallow[0]) sp = [lerp(sp[0], w * 0.5, seg(L, DP.swallow[0], DP.bulb[0])), lerp(sp[1], h * 0.35, seg(L, DP.swallow[0], DP.bulb[0]))];
  if (bk > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = bk * 0.7;
    drawSprite(ctx, glow('#ffcf7a', 128), sp[0], sp[1], face * lerp(1, 6, bk));
    ctx.globalAlpha = bk;
    drawSprite(ctx, glow('#fff6e0', 64, 0.35), sp[0], sp[1], face * lerp(0.3, 0.9, bk));
    ctx.restore();
  }
  if (bk < 1) drawSpark(ctx, sp[0], sp[1], face * 0.17 * (1 - bk * 0.5), 1, 1);
}
