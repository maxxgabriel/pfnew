import { drawSeal } from '../acts/ink';
import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { wordWidth } from '../core/glyphs';
import { type Pt, TAU, clamp, ease, lerp, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { drawArt, drawPose } from './art';
import { INK, cycle, drawGround, drawPaper, drawSpark, drawTitle, faceOf } from './common';
import { flash, shockRing, smear } from './fx';

/*
 * VI · HOME.
 *
 * He falls out of the sunset onto the page he was drawn on, the Spark in
 * his fist — a superhero landing. He lets the Spark go: it's a ball now. A
 * flick of the toe sends it up; he crouches, leaps, and spins in the air
 * inside a rising tornado of fire; at the top an overhead kick drives the
 * blazing ball down into the page — it burns in as Max's seal. He lands,
 * stands, turns to you and holds out the brush — the contact card. Then a
 * wave, a turn, and he walks off up the page; after the credits he peeks
 * back in from its edge.
 */

export const HM = {
  fall: [0.15, 0.75] as const,
  land: 0.75,
  drop: 1.05,
  flick: [1.2, 1.4] as const,
  crouch: 1.45,
  leap: [1.6, 1.85] as const,
  spin: [1.85, 2.45] as const,
  kick: 2.5,
  shot: [2.5, 2.75] as const,
  hit: 2.75,
  landing: [2.8, 3.2] as const,
  stand: 3.35,
  turn: 3.7,
  offer: 4.1,
  wave: [5.6, 6.3] as const,
  walk: [6.3, 7.6] as const,
  peek: [7.9, 8.5] as const,
  end: 9.0,
};

const FIRE = ['#e8340c', '#ff7a14', '#ffc23a'];

/** a tornado of fire: a cone of flame from his feet up, bands swirling up its front, tongues licking off the rim.
 *  Painted, not added (on paper an additive glow just whitens): `front` draws the bands over him, otherwise the cone behind. */
function drawTornado(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, H: number, k: number, t: number, front: boolean) {
  if (k <= 0) return;
  const top = y - H * k, r0 = R * 0.35, r1 = R * (0.7 + 0.8 * k);
  ctx.save();
  if (!front) {
    // the heat behind, and the cone itself
    const hg = ctx.createRadialGradient(x, (y + top) / 2, 0, x, (y + top) / 2, r1 * 2.2);
    hg.addColorStop(0, `rgba(255,140,40,${0.35 * k})`);
    hg.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(x - r1 * 2.2, top - r1, r1 * 4.4, y - top + r1 * 2);
    const g = ctx.createLinearGradient(0, y, 0, top);
    g.addColorStop(0, `rgba(232,52,12,${0.7 * k})`);
    g.addColorStop(0.6, `rgba(255,122,20,${0.55 * k})`);
    g.addColorStop(1, `rgba(255,194,58,${0.4 * k})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - r0, y);
    const wob = (s: number) => Math.sin(s * 9 + t * 14) * R * 0.08;
    for (let j = 0; j <= 12; j++) { const s2 = j / 12; ctx.lineTo(x - lerp(r0, r1, s2) + wob(s2), lerp(y, top, s2)); }
    // the rim: flame tongues licking up
    for (let j = 0; j <= 10; j++) {
      const u = j / 10, px = x - r1 + u * r1 * 2;
      const tongue = (j % 2 ? 0.15 : 0.55 + 0.35 * Math.sin(t * 11 + j * 1.7)) * R;
      ctx.lineTo(px, top - tongue);
    }
    for (let j = 12; j >= 0; j--) { const s2 = j / 12; ctx.lineTo(x + lerp(r0, r1, s2) + wob(s2 + 0.5), lerp(y, top, s2)); }
    ctx.closePath();
    ctx.fill();
  }
  // the swirl: bright bands spiralling up (the halves passing in front of him drawn over him)
  for (let i = 0; i < 3; i++) {
    let pts: Pt[] = [];
    const flush = (seed: number) => {
      if (pts.length > 2) brush(ctx, pts, { width: R * (front ? 0.2 : 0.14) * k, color: front ? FIRE[2] : FIRE[0], seed, dry: 0.5, press: 0.6, tail: 0.15, halo: 0, alpha: front ? 0.75 : 0.6 });
      pts = [];
    };
    for (let j = 0; j <= 30; j++) {
      const s2 = j / 30;
      const th = s2 * TAU * 1.4 - t * 10 + (i * TAU) / 3;
      const r = lerp(r0, r1, s2) * 0.95;
      const p: Pt = [x + Math.cos(th) * r, lerp(y, top, s2) + Math.sin(th) * r * 0.22];
      if (Math.sin(th) > 0 === front) pts.push(p);
      else flush(70 + i * 7 + j);
    }
    flush(90 + i);
  }
  ctx.restore();
}

/** the ball on fire: the Spark, bigger, with a comet of flame streaming behind it (painted, so it shows on paper) */
function drawFireball(ctx: CanvasRenderingContext2D, at: Pt, from: Pt, r: number, t: number) {
  const hg = ctx.createRadialGradient(at[0], at[1], 0, at[0], at[1], r * 4);
  hg.addColorStop(0, 'rgba(255,150,40,0.55)');
  hg.addColorStop(1, 'rgba(255,150,40,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(at[0] - r * 4, at[1] - r * 4, r * 8, r * 8);
  smear(ctx, from, at, r * 2.8 * (1 + Math.sin(t * 30) * 0.05), FIRE[0], 0.85);
  smear(ctx, [lerp(from[0], at[0], 0.35), lerp(from[1], at[1], 0.35)], at, r * 2.0, FIRE[1], 0.9);
  smear(ctx, [lerp(from[0], at[0], 0.65), lerp(from[1], at[1], 0.65)], at, r * 1.2, FIRE[2], 0.95);
  drawSpark(ctx, at[0], at[1], r, 1, 0);
}

export function drawHome(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const face = faceOf(f);
  const gy = h * 0.5;
  const gx = w * 0.36;
  drawPaper(ctx, w, h);

  // the name, written back on the page as it settles
  const name = seg(L, HM.stand, HM.stand + 0.8);
  if (name > 0) {
    const tw = wordWidth('MAX', 300, 0.16);
    drawTitle({ ...f, intro: 0.2 + name * 2 }, w / 2, h * 0.07, (w * 0.42) / tw, 1);
  }
  drawGround(ctx, w * 0.1, w * 0.9, gy + face * 0.05, face * 0.07, ease.out2(seg(L, HM.land - 0.1, HM.land + 0.4)), 9);

  // ---- where the shot lands: the seal, burnt in
  const sealAt: Pt = [w * 0.74, gy - face * 0.45];
  const hit = seg(L, HM.hit, HM.hit + 0.08);
  if (hit > 0) {
    drawSeal(ctx, sealAt[0], sealAt[1], face * 0.95 * lerp(1.6, 1, ease.out3(hit)), -0.06, Math.min(1, hit * 2));
    const rk = seg(L, HM.hit, HM.hit + 0.45);
    if (rk > 0 && rk < 1) {
      shockRing(ctx, sealAt[0], sealAt[1], face * 3, rk, '#ff7a2a', face * 0.12);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.35 * (1 - rk);
      drawSprite(ctx, glow('#5a2a10', 128), sealAt[0], sealAt[1] + face * 0.3, face * 3.2);
      ctx.restore();
    }
    if (L < HM.hit + 0.05) flash(ctx, w, h, 0.8 * (1 - seg(L, HM.hit, HM.hit + 0.05)), '#fff3d6');
  }
  if (f.crossedFwd(f.B - L + HM.hit)) f.shake(face * 0.5);
  if (f.crossedFwd(f.B - L + HM.land)) f.shake(face * 0.3);

  // ---- him
  let pose = 'leap_3', y = gy, scale = 1, alpha = 1;
  const x = gx;
  if (L < HM.land) {
    const u = ease.in2(seg(L, HM.fall[0], HM.fall[1]));
    y = lerp(-face * 2, gy, u);
    if (u > 0.05) smear(ctx, [x, y - face * 5], [x, y - face * 1.5], face * 0.6, INK, 0.35);
  } else pose = 'hero_0';
  if (L > HM.drop) pose = 'home_1';
  if (L > HM.flick[0]) pose = 'firetornado_0';
  if (L > HM.crouch) pose = 'firetornado_1';
  // the leap and the spin: up, turning (back, front, back, front...), the fire rising round him
  if (L > HM.leap[0]) {
    const air = L < HM.kick ? ease.out2(seg(L, HM.leap[0], HM.spin[1])) : 1 - ease.in2(seg(L, HM.kick + 0.1, HM.landing[0] + 0.2));
    pose = 'firetornado_2';
    if (L > HM.spin[0]) pose = Math.floor((L - HM.spin[0]) * 16) % 2 ? 'firetornado_4' : 'firetornado_3';
    if (L > HM.kick - 0.05) pose = 'firetornado_5';
    if (L > HM.shot[1]) pose = 'firetornado_6';
    y = gy - air * face * 2.7;
  }
  if (L > HM.landing[0] + 0.2) { pose = 'firetornado_7'; y = gy; }
  if (L > HM.stand) pose = 'home_1';
  if (L > HM.turn) pose = 'home_2';
  if (L > HM.offer) pose = 'home_3';
  if (L > HM.wave[0]) pose = L < HM.wave[0] + 0.35 ? 'bye_0' : 'bye_1';
  if (L > HM.walk[0]) {
    const u = seg(L, HM.walk[0], HM.walk[1]);
    pose = u < 0.25 ? 'bye_2' : cycle('bye', 2, t, 4) === 'bye_0' ? 'bye_2' : 'bye_3';
    scale = lerp(1, 0.25, ease.in2(u));
    y = lerp(gy, gy - h * 0.12, ease.in2(u));
    alpha = 1 - seg(u, 0.8, 1);
  }

  // the fire tornado: it rises with him and burns out after the kick
  const fire = L > HM.crouch ? ease.out2(seg(L, HM.crouch, HM.spin[0] + 0.2)) * (1 - seg(L, HM.kick, HM.landing[1])) : 0;
  if (fire > 0) {
    drawTornado(ctx, x, gy, face * 1.4, face * 4.4, fire, t, false);
  }
  drawPose(ctx, pose, x, y, face * scale, { alpha });
  if (fire > 0) drawTornado(ctx, x, gy, face * 1.4, face * 4.4, fire, t, true);

  // ---- the Spark: glowing in his fist, let go, flicked up, hanging over the fire, kicked down on fire into the page
  const top: Pt = [x + face * 1.25, gy - face * 2.7 - face * 1.5];
  if (L > HM.fall[0] && L < HM.drop) {
    const fist: Pt = [x + face * 0.6, y - face * 0.55];
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createRadialGradient(fist[0], fist[1], 0, fist[0], fist[1], face * 0.8);
    g.addColorStop(0, 'rgba(232,67,42,0.55)');
    g.addColorStop(1, 'rgba(232,67,42,0)');
    ctx.fillStyle = g;
    ctx.fillRect(fist[0] - face, fist[1] - face, face * 2, face * 2);
    ctx.restore();
  } else if (L >= HM.drop && L < HM.kick) {
    const r = face * 0.22;
    let b: Pt;
    if (L < HM.flick[0]) {
      // dropped from his hand onto his foot
      const u = ease.in2(seg(L, HM.drop, HM.flick[0]));
      b = [x + face * 0.7, lerp(gy - face * 1.2, gy - r, u)];
    } else {
      // up off his toe, rising to hang over the fire
      const u = ease.out3(seg(L, HM.flick[0], HM.spin[0]));
      b = [lerp(x + face * 0.7, top[0], u), lerp(gy - r, top[1], u) + Math.sin(t * 6) * face * 0.06 * u];
    }
    if (fire > 0.3) drawFireball(ctx, b, [b[0], b[1] + face * 0.6], r * 1.2, t);
    else drawSpark(ctx, b[0], b[1], r);
  } else if (L >= HM.kick && L < HM.hit) {
    // the shot: a blazing line from the top of the tornado down into the page
    const u = ease.in2(seg(L, HM.shot[0], HM.hit));
    const b: Pt = [lerp(top[0], sealAt[0], u), lerp(top[1], sealAt[1], u)];
    const tail: Pt = [lerp(top[0], sealAt[0], Math.max(0, u - 0.35)), lerp(top[1], sealAt[1], Math.max(0, u - 0.35))];
    drawFireball(ctx, b, tail, face * 0.32, t);
    if (f.crossedFwd(f.B - L + HM.kick)) f.shake(face * 0.25);
  }

  // ---- after the credits: a head round the edge of the page, a grin and a wave
  const pk = seg(L, HM.peek[0], HM.peek[1]);
  if (pk > 0) {
    const inK = ease.outBack(clamp(pk * 3), 1.4);
    const pw = face * 2.0;
    drawArt(ctx, 'extra_0', w + pw * 0.5 - pw * 0.95 * inK, gy - face * 3.0, pw, { rot: Math.sin(t * 6) * 0.03 });
  }
}
