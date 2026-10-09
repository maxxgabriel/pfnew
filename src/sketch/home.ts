import { drawSeal } from '../acts/ink';
import type { Frame } from '../core/frame';
import { wordWidth } from '../core/glyphs';
import { type Pt, clamp, ease, lerp, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { drawArt, drawPose } from './art';
import { drawVfx, vfxAspect } from './bg';
import { INK, cycle, drawGround, drawPaper, drawSpark, drawTitle, faceOf } from './common';
import { flash, impactFrame, letterbox, shockRing, smear, speedWedges } from './fx';

/*
 * VI · HOME — and the FIRE TORNADO.
 *
 * He falls out of the sunset onto the page he was drawn on, the Spark in
 * his fist. He lets it go: it's a ball now. The finale is a fire-tornado
 * shot, staged after the research in docs/research/fire-tornado.md (the
 * documented anchors: a clockwise spinning leap, flame spiralling up from
 * the legs, a horizontal wind-up, the fire collapsing into the striking
 * foot, the ball driven down as a fireball). Eight shots:
 *
 *   1  lift        a toe flick sends the ball up
 *   2  launch      crouch; hard cut to the special-move backdrop; a ring of fire at his feet
 *   3  ascent      two full turns (front, side, back drawings) inside a spinning painted tornado,
 *                  the camera tracking up with him, flame behind and in front of him
 *   4  eyes        an insert: his eyes find the ball
 *   5  wind-up     horizontal in the air; the tornado collapses into his left foot; a slow push-in
 *   6  contact     impact frames; the ball ignites
 *   7  meteor      the fireball streaks down at the page
 *   8  impact      an explosion; the dark lifts back to paper; the seal is burnt in; he lands
 *
 * Then: he stands, turns to you and holds out the brush (the contact card), waves, walks off;
 * after the credits he peeks back in from the edge of the page. The fire is painted on black
 * and added as light, so it glows against the dark backdrop.
 */

export const HM = {
  fall: [0.15, 0.75] as const,
  land: 0.75,
  drop: 1.0,
  flick: [1.2, 1.5] as const,
  crouch: 1.5,
  /** the hard cut to the special-move backdrop */
  cut: 1.6,
  leap: [1.9, 2.1] as const,
  spin: [2.1, 3.0] as const,
  eyes: [3.0, 3.35] as const,
  wind: [3.35, 3.9] as const,
  contact: 3.9,
  follow: [3.95, 4.1] as const,
  meteor: [4.1, 4.5] as const,
  hit: 4.5,
  lift: [4.55, 5.0] as const,
  landing: 4.75,
  stand: 5.2,
  turn: 5.55,
  offer: 5.95,
  wave: [7.4, 8.1] as const,
  walk: [8.1, 9.4] as const,
  peek: [9.7, 10.3] as const,
  end: 11.0,
};

/** the special-move backdrop: deep brown to maroon, a lighter heart behind him, streaks rising */
function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, t: number, k: number) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = k;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.9);
  g.addColorStop(0, '#651e18');
  g.addColorStop(0.45, '#3a1510');
  g.addColorStop(1, '#120806');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // rising diagonal streaks: long thin wedges sweeping up-right
  ctx.fillStyle = 'rgba(255,140,60,0.16)';
  for (let i = 0; i < 6; i++) {
    const x = ((i / 6) * 1.6 - 0.3) * w;
    const y = h * (1.2 - ((t * 0.9 + i * 0.37) % 1.4));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * 0.5, y - h * 0.55);
    ctx.lineTo(x + w * 0.5 + 6, y - h * 0.55 + 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** the painted fire tornado, cycling its four frames; anchored at its base (x, y) */
function drawTornado(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, t: number, alpha: number) {
  if (alpha <= 0 || width <= 1) return;
  drawVfx(ctx, `vfx_tornado_${Math.floor(t * 14) % 4}`, x, y, width, 0, alpha, 1);
}

/** the meteor: the painted fireball, its head at `at`, its tail streaming back along -dir */
function drawMeteor(ctx: CanvasRenderingContext2D, at: Pt, dir: number, width: number, alpha = 1) {
  const back = width * 0.44;
  drawVfx(ctx, 'vfx_fire_0', at[0] - Math.cos(dir) * back, at[1] - Math.sin(dir) * back, width, dir, alpha);
}

export function drawHome(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const face = faceOf(f);
  const gy = h * 0.58;
  const gx = w * 0.34;
  const sealAt: Pt = [w * 0.74, gy - face * 0.45];

  // ---- how dark: the hard cut in, and the lift back to paper after the explosion
  const dark = L < HM.cut ? 0 : L < HM.hit ? 1 : 1 - ease.inOut2(seg(L, HM.lift[0], HM.lift[1]));

  // ---- the camera: it tracks up with the ascent, pushes in on the wind-up, and comes back down with the meteor
  const air = L < HM.leap[0] ? 0 : L < HM.contact ? ease.out2(seg(L, HM.leap[0], HM.spin[1] - 0.2)) : 1 - ease.in2(seg(L, HM.follow[1], HM.landing));
  const H = face * 3.4;
  const heroY = gy - air * H;
  const track = L < HM.contact ? air * H * 0.75 : air * H * 0.75 * (1 - ease.inOut2(seg(L, HM.follow[0], HM.hit)));
  const push = 1 + 0.12 * ease.inOut2(seg(L, HM.wind[0], HM.contact)) * (1 - seg(L, HM.contact, HM.meteor[1]));

  drawPaper(ctx, w, h);
  drawBackdrop(ctx, w, h, gx, heroY - face * 2 + track, t, dark);

  ctx.save();
  ctx.translate(gx, gy);
  ctx.scale(push, push);
  ctx.translate(-gx, -gy + track);

  // the name, written back on the page as it settles
  const name = seg(L, HM.stand, HM.stand + 0.8);
  if (name > 0) {
    const tw = wordWidth('MAX', 300, 0.16);
    drawTitle({ ...f, intro: 0.2 + name * 2 }, w / 2, h * 0.07, (w * 0.42) / tw, 1);
  }
  ctx.save();
  ctx.globalAlpha = 1 - dark * 0.7;
  drawGround(ctx, w * 0.1, w * 0.9, gy + face * 0.05, face * 0.07, ease.out2(seg(L, HM.land - 0.1, HM.land + 0.4)), 9);
  ctx.restore();

  // ---- the seal, burnt in where the meteor lands
  const hit = seg(L, HM.hit, HM.hit + 0.1);
  if (hit > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    drawSprite(ctx, glow('#3a1a0a', 128), sealAt[0], sealAt[1] + face * 0.35, face * 3.2 * ease.out2(hit));
    ctx.restore();
    drawSeal(ctx, sealAt[0], sealAt[1], face * 0.95 * lerp(1.6, 1, ease.out3(hit)), -0.06, Math.min(1, hit * 2));
  }

  // ---- the ring of fire at his feet as he gathers to jump
  const ring = L > HM.cut ? ease.out2(seg(L, HM.cut, HM.leap[0])) * (1 - seg(L, HM.spin[0], HM.spin[0] + 0.4)) : 0;
  if (ring > 0) drawVfx(ctx, 'vfx_fire_2', gx, gy - face * 0.05, face * lerp(1.2, 3.4, ring), 0, ring);

  // ---- the tornado: up from his feet as he leaps, roaring through the ascent, collapsing into his foot on the wind-up
  const tor = L < HM.leap[0] ? 0 : L < HM.wind[0] ? ease.out2(seg(L, HM.leap[0], HM.spin[0] + 0.3)) : 1 - ease.in2(seg(L, HM.wind[0], HM.wind[0] + 0.3));
  const torW = face * 3.1 * (0.35 + 0.65 * tor);
  drawTornado(ctx, gx, gy + face * 0.2, torW, t, tor);

  // ---- him
  let pose = 'leap_3', y = gy, scale = 1, alpha = 1, flip = false;
  const x = gx;
  if (L < HM.land) {
    const u = ease.in2(seg(L, HM.fall[0], HM.fall[1]));
    y = lerp(-face * 2, gy, u);
    if (u > 0.05) smear(ctx, [x, y - face * 5], [x, y - face * 1.5], face * 0.6, INK, 0.35);
  } else pose = 'hero_0';
  if (L > HM.drop) pose = 'home_1';
  if (L > HM.flick[0]) pose = 'firetornado_0';
  if (L > HM.crouch) pose = 'firetornado_1';
  if (L > HM.leap[0]) { pose = 'firetornado_2'; y = heroY; }
  if (L > HM.spin[0] && L < HM.wind[0]) {
    // two full turns, clockwise: front, side, back, side (mirrored)
    const turn = seg(L, HM.spin[0], HM.spin[1]) * 2;
    const q = Math.floor((turn % 1) * 4);
    pose = ['firetornado_4', 'firetornado_2', 'firetornado_3', 'firetornado_2'][q];
    flip = q === 3;
    if (L > HM.spin[1]) { pose = 'firetornado_4'; flip = false; }
  }
  if (L > HM.wind[0]) { pose = 'ftkick_0'; y = heroY; flip = false; }
  if (L > HM.contact) pose = 'ftkick_1';
  if (L > HM.follow[0]) pose = 'ftkick_2';
  if (L > HM.follow[1]) { pose = 'firetornado_6'; y = heroY; }
  if (L > HM.landing) { pose = 'firetornado_7'; y = gy; }
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
  // the fire lights him: a warm rim while the tornado roars and the foot charges
  const lit = Math.max(tor, L > HM.wind[0] && L < HM.follow[1] ? 1 : 0);
  if (lit > 0.15) drawPose(ctx, pose, x, y + face * 0.03, face * scale * 1.05, { tint: '#ff9a3c', flip, alpha: 0.6 * lit, boil: 0.025, t });
  drawPose(ctx, pose, x, y, face * scale, { alpha, flip });
  // the front of the tornado passes over him (flame in front of the body, him still visible inside)
  drawTornado(ctx, gx, gy + face * 0.2, torW, t + 0.13, tor * 0.22);

  // ---- the wind-up: the fire collapses into his left foot, a white-hot charge
  const foot: Pt = [x + face * 1.25, y - face * 0.55];
  const charge = L > HM.wind[0] && L < HM.follow[1] ? ease.out2(seg(L, HM.wind[0] + 0.1, HM.contact)) : 0;
  if (charge > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = charge;
    drawSprite(ctx, glow('#ff7a20', 128), foot[0] - face * 0.4, foot[1], face * (2.4 + Math.sin(t * 40) * 0.15));
    drawSprite(ctx, glow('#fff3c4', 64, 0.3), foot[0] - face * 0.4, foot[1], face * 0.9);
    ctx.restore();
  }

  // ---- the ball: dropped from his fist, flicked up, hanging over the fire; struck; a meteor down into the page
  const apex: Pt = [gx + face * 1.35, gy - H - face * 0.75];
  const r = face * 0.22;
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
  } else if (L >= HM.drop && L < HM.contact) {
    let b: Pt;
    if (L < HM.flick[0]) b = [gx + face * 0.7, lerp(gy - face * 1.2, gy - r, ease.in2(seg(L, HM.drop, HM.flick[0])))];
    else if (L < HM.spin[1]) {
      const u = ease.out3(seg(L, HM.flick[0], HM.spin[1]));
      b = [lerp(gx + face * 0.7, apex[0], u), lerp(gy - r, apex[1], u)];
    } else {
      // over the top it drifts down to meet his foot
      const u = ease.inOut2(seg(L, HM.spin[1], HM.contact));
      b = [lerp(apex[0], foot[0] + face * 0.15, u), lerp(apex[1], foot[1], u)];
    }
    drawSpark(ctx, b[0], b[1], r, 1, dark > 0 ? 1.4 : 1);
  } else if (L >= HM.contact && L < HM.hit) {
    // ignition, then the meteor down into the page
    const from: Pt = [foot[0] + face * 0.15, foot[1]];
    const u = ease.in2(seg(L, HM.follow[0], HM.hit));
    const b: Pt = [lerp(from[0], sealAt[0], u), lerp(from[1], sealAt[1], u)];
    const dir = Math.atan2(sealAt[1] - from[1], sealAt[0] - from[0]);
    drawMeteor(ctx, b, dir, face * lerp(2.2, 4.2, u));
  }

  // ---- the explosion where it lands, and a ring of fire across the page
  const ex = seg(L, HM.hit, HM.hit + 0.45);
  if (ex > 0 && ex < 1) {
    const aspect = vfxAspect('vfx_fire_1') || 1;
    drawVfx(ctx, 'vfx_fire_1', sealAt[0], sealAt[1] - face * 0.2 * aspect, face * lerp(2, 7, ease.out3(ex)), 0, 1 - ease.in2(ex));
    drawVfx(ctx, 'vfx_fire_2', sealAt[0], sealAt[1] + face * 0.3, face * lerp(1.5, 8, ease.out2(ex)), 0, 1 - ex);
    shockRing(ctx, sealAt[0], sealAt[1], face * 5, ex, '#ffb060', face * 0.14);
  }
  ctx.restore();

  // radial streaks converging on the contact point during the charge (screen space)
  if (charge > 0) speedWedges(ctx, w, h, gx + (foot[0] - gx) * push, gy + (foot[1] - gy + track) * push, 0.7 * charge, t, 'rgba(255,180,90,0.5)', 7);

  // ---- the eyes insert: a strip of his eyes across the dark
  const ek = seg(L, HM.eyes[0], HM.eyes[1]);
  if (ek > 0 && ek < 1) {
    const inK = ease.out3(clamp(ek * 4)), outK = ease.in3(seg(ek, 0.78, 1));
    const ch = h * 0.18, cy = h * 0.4;
    const xx = lerp(w, 0, inK) - lerp(0, w, outK);
    ctx.save();
    ctx.fillStyle = '#1a0a08';
    ctx.fillRect(xx, cy - ch / 2 - 5, w, ch + 10);
    ctx.beginPath();
    ctx.rect(xx, cy - ch / 2, w, ch);
    ctx.clip();
    drawArt(ctx, 'closeup_0', xx + w / 2 - ek * face * 0.4, cy, w * 1.1);
    // the fire reflected across the strip
    const fg = ctx.createLinearGradient(0, cy + ch / 2, 0, cy - ch / 2);
    fg.addColorStop(0, 'rgba(255,110,30,0.45)');
    fg.addColorStop(0.5, 'rgba(255,110,30,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(xx, cy - ch / 2, w, ch);
    ctx.restore();
  }

  // ---- impacts: the cut in, the contact, and the meteor hitting the page
  if (f.crossedFwd(f.B - L + HM.cut)) f.flash(0.6, '#ffb070');
  if (f.crossedFwd(f.B - L + HM.contact)) f.shake(face * 0.4);
  if (f.crossedFwd(f.B - L + HM.hit)) f.shake(face * 0.6);
  if (L >= HM.contact && L < HM.contact + 0.03) impactFrame(ctx, w, h, 1, 'invert');
  else if (L >= HM.contact + 0.03 && L < HM.contact + 0.07) impactFrame(ctx, w, h, 1, 'spikes', gx + (foot[0] - gx) * push, gy + (foot[1] - gy + track) * push, 7);
  if (L >= HM.hit && L < HM.hit + 0.06) flash(ctx, w, h, 0.9 * (1 - seg(L, HM.hit, HM.hit + 0.06)), '#fff1d0');

  // ---- cinema bars for the move
  letterbox(ctx, w, h, ease.inOut2(seg(L, HM.cut, HM.cut + 0.2)) * (1 - seg(L, HM.hit, HM.lift[1])), '#000');

  // ---- after the credits: a head round the edge of the page, a grin and a wave
  const pk = seg(L, HM.peek[0], HM.peek[1]);
  if (pk > 0) {
    const inK = ease.outBack(clamp(pk * 3), 1.4);
    const pw = face * 2.0;
    drawArt(ctx, 'extra_0', w + pw * 0.5 - pw * 0.95 * inK, gy - face * 3.0, pw, { rot: Math.sin(t * 6) * 0.03 });
  }
}
