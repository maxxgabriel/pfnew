import { drawSeal } from '../acts/ink';
import type { Frame } from '../core/frame';
import { wordWidth } from '../core/glyphs';
import { type Pt, clamp, ease, lerp, seg } from '../core/math';
import { drawPose } from './art';
import { INK, RED, cycle, drawGround, drawPaper, drawTitle, faceOf } from './common';
import { shockRing, smear } from './fx';

/*
 * VI · HOME.
 *
 * The white is the page again. He drops out of it with the Spark in his
 * fist — a superhero landing on the paper he was drawn on. Victory jump;
 * then he slams the Spark down with both hands and it stamps the page as
 * Max's seal. He stands up proud beside it, turns to face you, and holds
 * out the brush — the contact card. Then a wave, a turn, and he walks off
 * up the page, smaller and smaller, until only the seal and the name are
 * left on the paper.
 */

export const HM = {
  fall: [0.15, 0.75] as const,
  land: 0.75,
  cheer: [1.15, 1.6] as const,
  slam: 1.95,
  stand: 2.5,
  turn: 2.9,
  offer: 3.3,
  wave: [4.6, 5.3] as const,
  walk: [5.3, 6.6] as const,
  end: 7.0,
};

export function drawHome(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const face = faceOf(f);
  const gy = h * 0.5;
  const gx = w * 0.42;
  drawPaper(ctx, w, h);

  // the name, written back on the page as it settles
  const name = seg(L, HM.stand, HM.stand + 0.8);
  if (name > 0) {
    const tw = wordWidth('MAX', 300, 0.16);
    drawTitle({ ...f, intro: 0.2 + name * 2 }, w / 2, h * 0.07, (w * 0.42) / tw, 1);
  }
  drawGround(ctx, w * 0.14, w * 0.86, gy + face * 0.05, face * 0.07, ease.out2(seg(L, HM.land - 0.1, HM.land + 0.4)), 9);

  // ---- the seal, stamped where his hands come down
  const sealAt: Pt = [gx + face * 1.7, gy - face * 0.45];
  const st = seg(L, HM.slam - 0.05, HM.slam + 0.05);
  if (st > 0) {
    const s = face * 0.95 * lerp(1.5, 1, ease.in3(st));
    drawSeal(ctx, sealAt[0], sealAt[1], s, -0.06, Math.min(1, st * 3));
    const rk = seg(L, HM.slam, HM.slam + 0.4);
    if (rk > 0 && rk < 1) shockRing(ctx, sealAt[0], sealAt[1], face * 2.2, rk, RED, face * 0.06);
  }
  if (f.crossedFwd(f.B - L + HM.slam)) f.shake(face * 0.4);
  if (f.crossedFwd(f.B - L + HM.land)) f.shake(face * 0.3);

  // ---- him
  let pose = 'leap_3', x = gx, y = gy, scale = 1, alpha = 1, flip = false;
  if (L < HM.land) {
    const u = ease.in2(seg(L, HM.fall[0], HM.fall[1]));
    y = lerp(-face * 2, gy, u);
    if (u > 0.05) smear(ctx, [x, y - face * 5], [x, y - face * 1.5], face * 0.6, INK, 0.35);
  } else pose = 'hero_0';
  if (L > HM.cheer[0]) {
    pose = 'hero_2';
    y = gy - Math.sin(seg(L, HM.cheer[0], HM.cheer[1]) * Math.PI) * face * 1.2;
  }
  if (L > HM.cheer[1]) { pose = 'hero_1'; x = gx + face * 0.3; y = gy; }
  if (L > HM.stand) { pose = 'home_1'; x = gx - face * 0.4; }
  if (L > HM.turn) pose = 'home_2';
  if (L > HM.offer) pose = 'home_3';
  if (L > HM.wave[0]) pose = L < HM.wave[0] + 0.35 ? 'bye_0' : 'bye_1';
  if (L > HM.walk[0]) {
    // walking off up the page, into the distance
    const u = seg(L, HM.walk[0], HM.walk[1]);
    pose = u < 0.25 ? 'bye_2' : cycle('bye', 2, t, 4) === 'bye_0' ? 'bye_2' : 'bye_3';
    scale = lerp(1, 0.25, ease.in2(u));
    y = lerp(gy, gy - h * 0.12, ease.in2(u));
    alpha = 1 - seg(u, 0.8, 1);
  }
  drawPose(ctx, pose, x, y, face * scale, { alpha, flip });

  // the Spark's red glow in his fist as he lands and cheers
  if (L < HM.slam && L > HM.fall[0]) {
    const fist: Pt = L > HM.cheer[0] && L < HM.cheer[1] ? [x + face * 0.55, y - face * 3.1] : [x + face * 0.6, y - face * 0.55];
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createRadialGradient(fist[0], fist[1], 0, fist[0], fist[1], face * 0.8);
    g.addColorStop(0, 'rgba(232,67,42,0.55)');
    g.addColorStop(1, 'rgba(232,67,42,0)');
    ctx.fillStyle = g;
    ctx.fillRect(fist[0] - face, fist[1] - face, face * 2, face * 2);
    ctx.restore();
  }

  // ---- the white of the catch, fading back to paper
  const wk = 1 - ease.out2(seg(L, 0, 0.5));
  if (wk > 0) {
    ctx.save();
    ctx.globalAlpha = wk;
    ctx.fillStyle = '#fbf6ec';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  void clamp;
}
