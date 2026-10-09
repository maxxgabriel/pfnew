import type { Frame } from '../core/frame';
import { type Pt, clamp, ease, lerp, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { drawArt, drawPose } from './art';
import { drawBg } from './bg';
import { INK, RED, drawSpark, drawSparkStreak, faceOf } from './common';
import { LT, drawLight } from './light';
import { flash, impactFrame, inkSplash, letterbox, shockRing, smear, speedWedges } from './fx';

/*
 * V · BURST.
 *
 * The anime set piece, on the painted sunset. Letterbox. He and his shadow
 * face off; a cut-in of his eyes slams across the screen. They dash — speed
 * wedges, smears — and the brushes meet: impact frame. They trade blows
 * across the sun: a spin, a flip over each other, a thrust and a block; they
 * skid apart on one knee. Stillness. One last charge, the biggest clash, and
 * the shadow bursts into a single great splash of ink. The Spark shoots
 * straight up; he crouches and leaps — the camera rides up with him — his
 * open hand fills the screen, the Spark in front of it, and the hand closes
 * round it. White (chapter VI is home).
 */

export const BU = {
  bars: [0, 0.5] as const,
  eyes: [0.75, 1.35] as const,
  dash: [1.35, 1.8] as const,
  clash1: 1.8,
  trade: [1.95, 3.5] as const,
  hits: [2.35, 2.85, 3.3] as const,
  skid: [3.5, 4.0] as const,
  /** stillness, then the power-up: crouch, the icy aura, the roar */
  power: [4.05, 4.8] as const,
  charge: [4.85, 5.25] as const,
  final: 5.3,
  burst: [5.3, 5.9] as const,
  crouch: [5.95, 6.25] as const,
  leap: [6.25, 6.9] as const,
  hand: [6.9, 7.45] as const,
  close: 7.3,
  white: [7.4, 7.9] as const,
  end: 8.0,
};

export function drawBurst(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const face = faceOf(f);
  const gy = h * 0.74;

  // ---- the sky: the painted sunset, panning up as he leaps
  const up = ease.inOut2(seg(L, BU.leap[0], BU.hand[1]));
  ctx.fillStyle = '#2a0c14';
  ctx.fillRect(0, 0, w, h);
  // the seam: the last chapter's sunset gives way to the painted one
  const seam = ease.inOut2(seg(L, 0, 0.6));
  if (seam < 1) drawLight({ ...f, crossed: () => false, crossedFwd: () => false }, LT.end - 0.001, false);
  drawBg(ctx, 'bg_sunset', w, h, lerp(0.75, 0.0, up), seam, 1.12);
  // the ground he stands on (the paper floor of the last chapter, now a ridge against the sun)
  ctx.save();
  ctx.translate(0, up * h * 0.6);
  ctx.fillStyle = '#1a0c0e';
  ctx.fillRect(0, gy, w, h);
  ctx.restore();

  // ---- the two of them
  let mx = w * 0.28, my = gy, mp = 'dash_0', mr = 0;
  let sx = w * 0.72, sy = gy, spose = 'dash_0', sr = 0, shadow = 1;
  if (L > BU.dash[0]) {
    const u = ease.in2(seg(L, BU.dash[0], BU.dash[1]));
    mp = 'dash_1'; spose = 'dash_1';
    mx = lerp(w * 0.28, w * 0.44, u);
    sx = lerp(w * 0.72, w * 0.56, u);
  }
  if (L > BU.clash1 - 0.02) { mp = 'sword_1'; spose = 'sword_4'; mx = w * 0.4; sx = w * 0.62; }
  // the exchange: they swap sides, flip, thrust and block
  const ex: [number, string, number, number, string, number, number][] = [
    // [beat, my pose, my x, my lift, its pose, its x, its lift]
    [2.05, 'sword_2', 0.38, 0, 'sword_3', 0.66, 0],
    [2.35, 'dash_2', 0.52, 1.4, 'sword_4', 0.5, 0],
    [2.6, 'sword_3', 0.66, 0, 'sword_2', 0.36, 0],
    [2.85, 'sword_4', 0.62, 0, 'sword_1', 0.42, 0],
    [3.1, 'dash_2', 0.5, 1.6, 'dash_2', 0.5, 1.0],
    [3.3, 'sword_1', 0.36, 0, 'sword_4', 0.6, 0],
  ];
  let flipMe = false, flipIt = true;
  for (const [b, p1, x1, l1, p2, x2, l2] of ex) {
    if (L > b) {
      mp = p1; mx = x1 * w; my = gy - l1 * face; spose = p2; sx = x2 * w; sy = gy - l2 * face;
      flipMe = x1 > x2; flipIt = !flipMe;
      if (p1 === 'dash_2') mr = (L - b) * 8;
      else mr = 0;
      if (p2 === 'dash_2') sr = -(L - b) * 8;
      else sr = 0;
    }
  }
  if (L > BU.skid[0]) {
    const u = ease.out3(seg(L, BU.skid[0], BU.skid[1]));
    mp = 'dash_3'; spose = 'dash_3'; flipMe = false; flipIt = true; mr = 0; sr = 0; my = gy; sy = gy;
    mx = lerp(w * 0.42, w * 0.2, u);
    sx = lerp(w * 0.58, w * 0.8, u);
  }
  // the power-up: he gathers it, the wind blasts his hair up, he roars
  let aura = 0;
  if (L > BU.power[0] && L < BU.charge[0]) {
    const u = seg(L, BU.power[0], BU.power[1]);
    mp = u < 0.35 ? 'powerup_0' : u < 0.7 ? 'powerup_1' : 'powerup_2';
    aura = ease.out2(seg(u, 0.25, 0.7)) * (1 - seg(L, BU.power[1], BU.charge[0]) * 0.5);
    if (f.crossedFwd(f.B - L + BU.power[0] + (BU.power[1] - BU.power[0]) * 0.7)) f.shake(face * 0.3);
  }
  if (L > BU.charge[0]) {
    const u = ease.in3(seg(L, BU.charge[0], BU.charge[1]));
    mp = 'dash_1'; spose = 'dash_1';
    mx = lerp(w * 0.2, w * 0.43, u);
    sx = lerp(w * 0.8, w * 0.57, u);
  }
  if (L > BU.final) { mp = 'sword_3'; mx = w * 0.42; shadow = 1 - seg(L, BU.final, BU.final + 0.08); }
  if (L > BU.burst[1] - 0.2) mp = 'home_1';
  if (L > BU.crouch[0]) mp = 'leap_0';
  if (L > BU.leap[0]) {
    const u = ease.out2(seg(L, BU.leap[0], BU.leap[1]));
    mp = u < 0.4 ? 'leap_1' : 'leap_2';
    mx = lerp(w * 0.42, w * 0.5, u);
    my = lerp(gy, h * 0.62, u) ;
  }

  // the dash smears and the speed wedges
  const dashing = L > BU.dash[0] && L < BU.clash1 || L > BU.charge[0] && L < BU.final;
  if (dashing) {
    speedWedges(ctx, w, h, w / 2, gy - face * 1.6, 0.8, t, 'rgba(20,6,8,0.85)', 7);
    smear(ctx, [mx - face * 3, my - face * 1.2], [mx, my - face * 1.2], face * 0.9, '#1b1714', 0.5);
    smear(ctx, [sx + face * 3, sy - face * 1.2], [sx, sy - face * 1.2], face * 0.9, '#0a0406', 0.5);
  }
  if (L > BU.leap[0] && L < BU.hand[0]) speedWedges(ctx, w, h, mx, my - face * 1.5, 0.9, t, 'rgba(255,236,210,0.55)', 7);

  if (aura > 0) {
    // the world dims, and he burns cold: an icy rim (a pale copy of the drawing just behind him)
    ctx.save();
    ctx.fillStyle = `rgba(6,10,24,${0.5 * aura})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    for (const [d, a] of [[0.07, 0.5], [0.035, 0.9]] as const) {
      drawPose(ctx, mp, mx, my + face * d * 0.5, face * (1 + d), { tint: '#cdeeff', alpha: aura * a, boil: 0.03, t });
    }
    // the icy aura: a cold glow behind him and a ring of wind
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = aura * 0.85;
    drawSprite(ctx, glow('#9fdcff', 128), mx, my - face * 1.6, face * (6 + Math.sin(t * 18) * 0.4));
    ctx.restore();
    const rk = (L * 3) % 1;
    shockRing(ctx, mx, my - face * 1.4, face * 3, rk, 'rgba(190,235,255,0.8)', face * 0.08);
    speedWedges(ctx, w, h, mx, my - face * 1.6, aura * 0.6, t, 'rgba(190,235,255,0.5)', 6);
  }
  if (shadow > 0) drawPose(ctx, spose, sx, sy, face, { tint: '#0e0608', flip: flipIt, rot: sr, alpha: shadow });
  if (L < BU.hand[0] + 0.1) drawPose(ctx, mp, mx, my, face, { flip: flipMe, rot: mr });

  // ---- the shadow bursts into one great splash of ink
  const bk = seg(L, BU.burst[0], BU.burst[1]);
  if (bk > 0 && bk < 1) inkSplash(ctx, w * 0.6, gy - face * 1.3, face * 3.2, ease.out3(bk), 11, `rgba(14,6,8,${1 - ease.in2(bk)})`);

  // ---- the Spark: watching from above the duel, then shooting up into the sky
  let sp: Pt = [w * 0.5 + Math.sin(t * 1.3) * face * 0.4, h * 0.32 + Math.sin(t * 2.1) * face * 0.2];
  let prev: Pt | null = null;
  if (L > BU.burst[0] + 0.2) {
    const u = ease.in2(seg(L, BU.burst[0] + 0.2, BU.leap[1]));
    sp = [w * 0.5, lerp(h * 0.32, h * 0.18, u)];
    prev = [w * 0.5, lerp(h * 0.32, h * 0.18, ease.in2(seg(L - 0.1, BU.burst[0] + 0.2, BU.leap[1]))) + face * 0.6];
  }
  if (L < BU.hand[0]) {
    if (prev) drawSparkStreak(ctx, prev, sp, face * 0.17);
    drawSpark(ctx, sp[0], sp[1], face * 0.17);
  }

  // ---- the hand: open, the Spark in front of it; then the fist closes round it
  const hk = seg(L, BU.hand[0], BU.hand[1]);
  if (hk > 0) {
    const grow = ease.out3(clamp(hk * 1.6));
    const hw = lerp(w * 0.3, w * 0.95, grow);
    const closed = L > BU.close;
    if (!closed) drawSpark(ctx, w * 0.5, h * 0.42, lerp(face * 0.17, face * 0.6, grow));
    drawArt(ctx, closed ? 'closeup_2' : 'closeup_1', w * 0.5, h * 0.48, closed ? hw * 0.72 : hw);
    if (closed) {
      // the Spark's light leaking between the fingers
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(w * 0.5, h * 0.44, 0, w * 0.5, h * 0.44, w * 0.32);
      g.addColorStop(0, `rgba(255,120,80,${0.35 * seg(L, BU.close, BU.close + 0.15)})`);
      g.addColorStop(1, 'rgba(232,67,42,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  // ---- the eyes cut-in: a strip of his eyes slams across the frame
  const ek = seg(L, BU.eyes[0], BU.eyes[1]);
  if (ek > 0 && ek < 1) {
    const inK = ease.out3(clamp(ek * 4)), outK = ease.in3(seg(ek, 0.75, 1));
    const ch = h * 0.17, cy = h * 0.42;
    const x = lerp(-w, 0, inK) + lerp(0, w, outK);
    ctx.save();
    ctx.fillStyle = '#efe9dc';
    ctx.fillRect(x, cy - ch / 2 - 4, w, ch + 8);
    ctx.beginPath();
    ctx.rect(x, cy - ch / 2, w, ch);
    ctx.clip();
    drawArt(ctx, 'closeup_0', x + w / 2 + ek * face * 0.5, cy, w * 1.05);
    ctx.restore();
    ctx.fillStyle = INK;
    ctx.fillRect(x, cy - ch / 2 - 6, w, 3);
    ctx.fillRect(x, cy + ch / 2 + 3, w, 3);
  }

  // ---- the impacts
  const clashes = [BU.clash1, ...BU.hits, BU.final];
  for (const c of clashes) {
    const big = c === BU.final ? 2 : 1;
    if (f.crossedFwd(f.B - L + c)) f.shake(face * 0.3 * big);
    const at: Pt = [(mx + sx) / 2, gy - face * 1.8];
    if (L >= c && L < c + 0.035) impactFrame(ctx, w, h, 1, 'invert');
    else if (L >= c + 0.035 && L < c + 0.07 * big) impactFrame(ctx, w, h, 1, 'spikes', at[0], at[1], Math.round(c * 7));
    const rk = seg(L, c, c + 0.35 * big);
    if (rk > 0 && rk < 1) shockRing(ctx, at[0], at[1], face * 3 * big, rk, '#fff1dc', face * 0.12);
  }

  // ---- cinema bars, and the white the catch burns to
  letterbox(ctx, w, h, ease.inOut2(seg(L, BU.bars[0], BU.bars[1])) * (1 - seg(L, BU.leap[0], BU.hand[0])), '#000');
  const wk = ease.in2(seg(L, BU.white[0], BU.white[1]));
  if (wk > 0) flash(ctx, w, h, wk, '#fbf6ec');
  void RED;
}
