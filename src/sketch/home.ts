import { drawSeal } from '../acts/ink';
import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { wordWidth } from '../core/glyphs';
import { type Pt, TAU, clamp, ease, lerp, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { artSize, drawArt, drawArtFoot, drawPose } from './art';
import { INK, RED, cycle, drawGround, drawPaper, drawSpark, drawTitle, faceOf, idlePose } from './common';
import { flash, shockRing, smear } from './fx';
import { drawStill } from './still';

/*
 * VIII · HOME.
 *
 * He rides the stroke he painted down onto the page he was drawn on and
 * lands like a superhero, the Spark in his fist. Then the Eraser comes back
 * for the page — it slams down and scrubs toward him, rubbing the ground
 * out. He doesn't run this time. The camera walks all the way round him as
 * he powers up, hair and scarf blown straight up; we push into his eyes.
 * A flick of the toe, a leap, a spinning tornado of fire, an overhead kick:
 * the blazing Spark smashes the Eraser to pieces and burns into the page as
 * Max's seal. He turns to you and holds out the brush (the contact card) —
 * sign the page with one swipe and he cheers. A wave, a walk off, a peek
 * back in after the credits; then the camera falls into the seal, and the
 * red becomes the Spark landing on a fresh page: the film's first frame.
 */

export const HM = {
  ride: [0, 0.75] as const,
  land: 0.75,
  drop: 1.05,
  /** the Eraser's return */
  eraserIn: [1.15, 1.45] as const,
  slam: 1.45,
  scrub: [1.5, 2.15] as const,
  brace: 1.55,
  /** the camera walks all the way round him as he powers up; then into his eyes */
  orbit: [2.2, 3.35] as const,
  eye: [3.35, 3.75] as const,
  flick: [3.8, 4.0] as const,
  crouch: 4.05,
  leap: [4.2, 4.45] as const,
  spin: [4.45, 5.05] as const,
  kick: 5.1,
  shot: [5.1, 5.35] as const,
  hit: 5.35,
  landing: [5.4, 5.8] as const,
  stand: 5.95,
  turn: 6.3,
  offer: 6.7,
  wave: [9.2, 9.9] as const,
  walk: [9.9, 11.2] as const,
  peek: [11.4, 12.0] as const,
  loop: [12.2, 13.6] as const,
  end: 14.0,
};

const TURN = ['turnA_0', 'turnA_1', 'turnA_2', 'turnA_3', 'turnB_0', 'turnB_1', 'turnB_2', 'turnB_3'];

/* ------------------------------------------------------------ your signature */

/** the strokes you sign with, in screen fractions; and when you lifted the brush (wall clock) */
const sig: Pt[][] = [];
let signedAt = -1;
let clockNow = 0;
export function signStart(x: number, y: number, w: number, h: number) {
  sig.push([[x / w, y / h]]);
}
export function signMove(x: number, y: number, w: number, h: number) {
  const s = sig[sig.length - 1];
  if (!s) return;
  const p: Pt = [x / w, y / h];
  const q = s[s.length - 1];
  if (Math.hypot((p[0] - q[0]) * w, (p[1] - q[1]) * h) > 3) s.push(p);
}
export function signEnd() {
  if (sig.length && sig[sig.length - 1].length > 2) signedAt = clockNow;
}
/** the page is waiting for your signature between these beats (of this chapter) */
export const SIGN_WINDOW = [HM.offer, HM.wave[0]] as const;

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


/** the stroke he rides in on (the end of the one he painted in the sky) */
let rideKey = '';
let ridePts: Pt[] = [];
function rideIn(w: number, h: number, gx: number, gy: number): Pt[] {
  const k = `${w}|${h}`;
  if (k !== rideKey) {
    rideKey = k;
    ridePts = [[w * 0.66, -h * 0.08], [w * 0.62, h * 0.12], [w * 0.42, h * 0.3], [gx - w * 0.12, gy - h * 0.02], [gx + w * 0.02, gy + 2]];
  }
  return ridePts;
}

export function drawHome(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  clockNow = t;
  const face = faceOf(f);
  const gy = h * 0.5;
  const gx = w * 0.36;

  // ---- the fall into the seal: everything grows round it until it is the screen, then it is the first frame
  const lk = seg(L, HM.loop[0], HM.loop[1]);
  const sealAt: Pt = [w * 0.74, gy - face * 0.45];
  if (lk >= 0.5) {
    // the first page again (before the Spark drops): the red shrinks into the Spark, hanging over it, about to fall
    drawStill({ ...f, intro: Math.max(6, f.intro) }, 1.0);
    const u = ease.out3(seg(lk, 0.5, 1));
    const hang: Pt = [w * 0.66, h * 0.3 + Math.sin(t * 2.4) * face * 0.06 * u];
    const R = lerp(Math.hypot(w, h), face * 0.17, u);
    ctx.save();
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(lerp(w / 2, hang[0], u), lerp(h / 2, hang[1], u), R, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (u > 0.9) drawSpark(ctx, hang[0], hang[1], face * 0.17);
    return;
  }
  ctx.save();
  if (lk > 0) {
    const z = Math.exp(ease.in3(seg(lk, 0, 0.5)) * Math.log(60));
    ctx.translate(sealAt[0], sealAt[1]);
    ctx.scale(z, z);
    ctx.translate(-sealAt[0], -sealAt[1]);
  }

  // ---- the orbit: the camera walks round him (a zoom toward him, the world swinging round)
  const ok = ease.inOut2(seg(L, HM.orbit[0], HM.orbit[1]));
  const orb = ok > 0 && ok < 1;
  const th = ok * TAU;
  if (orb) {
    const z = 1 + Math.sin(ok * Math.PI) * 0.35;
    ctx.translate(gx, gy);
    ctx.scale(z, z);
    ctx.translate(-gx, -gy);
  }

  drawPaper(ctx, w, h);
  // the power in the air round him: an icy glow behind him while he powers up
  const pow = Math.sin(clamp(seg(L, HM.orbit[0] - 0.2, HM.eye[1])) * Math.PI);
  if (pow > 0) {
    ctx.save();
    ctx.globalAlpha = pow * 0.55;
    drawSprite(ctx, glow('#9fd2ff', 128), gx, gy - face * 1.2, face * 7);
    ctx.restore();
  }

  // the name, written back on the page as it settles
  const name = seg(L, HM.stand, HM.stand + 0.8);
  if (name > 0) {
    const tw = wordWidth('MAX', 300, 0.16);
    drawTitle({ ...f, intro: 0.2 + name * 2 }, w / 2, h * 0.07, (w * 0.42) / tw, 1);
  }

  // ---- the Eraser: where it is, and what it has rubbed out (the ground behind it)
  const eIn = seg(L, HM.eraserIn[0], HM.eraserIn[1]);
  const hit = seg(L, HM.hit, HM.hit + 0.08);
  const ex = lerp(w * 0.86, w * 0.74, ease.inOut2(seg(L, HM.scrub[0], HM.scrub[1])));
  const eraserOn = eIn > 0 && L < HM.hit + 0.6;
  const rubbedFrom = eraserOn && L >= HM.slam ? ex + face * 0.5 : w;
  // the ground, rubbed out from the Eraser to the edge (it comes back after the kick, with the seal)
  const groundBack = seg(L, HM.hit, HM.hit + 0.5);
  if (!orb) {
    ctx.save();
    if (L < HM.hit + 0.5) {
      ctx.beginPath();
      ctx.rect(0, 0, Math.max(rubbedFrom, lerp(rubbedFrom, w, groundBack)), h);
      ctx.clip();
    }
    drawGround(ctx, w * 0.1, w * 0.9, gy + face * 0.05, face * 0.07, ease.out2(seg(L, HM.land - 0.1, HM.land + 0.4)), 9);
    ctx.restore();
    // the ink stroke he rode in on, staying on the page
    brush(ctx, rideIn(w, h, gx, gy), { width: face * 0.3, color: INK, progress: 1, seed: 77, dry: 0.45, press: 1.2, tail: 0.3, halo: 0, alpha: 1 - seg(L, HM.orbit[0] - 0.3, HM.orbit[0]) * 0.75 });
  } else {
    // round him, the ground is a ring of ink that the camera's walk swings round
    ctx.save();
    ctx.translate(gx, gy + face * 0.05);
    ctx.scale(1, 0.22);
    for (let i = 0; i < 3; i++) {
      const a0 = th + (i / 3) * TAU, R = face * 3.2;
      brush(ctx, [[Math.cos(a0) * R, Math.sin(a0) * R], [Math.cos(a0 + 0.5) * R, Math.sin(a0 + 0.5) * R], [Math.cos(a0 + 1.0) * R, Math.sin(a0 + 1.0) * R]], { width: face * 0.3, color: INK, seed: 120 + i, dry: 0.6, press: 1.1, tail: 0.3, halo: 0 });
    }
    ctx.restore();
  }

  // ---- where the shot lands: the seal, burnt in where the Eraser stood
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
  if (f.crossedFwd(f.B - L + HM.hit)) f.shake(face * 0.6);
  if (f.crossedFwd(f.B - L + HM.land)) f.shake(face * 0.3);
  if (f.crossedFwd(f.B - L + HM.slam)) f.shake(face * 0.45);

  // ---- your signature, in ink on the page (under him)
  for (const sg of sig) {
    if (sg.length < 2) continue;
    brush(ctx, sg.map((p) => [p[0] * w, p[1] * h] as Pt), { width: face * 0.08, color: INK, seed: 33, dry: 0.4, press: 1.3, tail: 0.3, halo: 0 });
  }

  // the Eraser (behind him while the camera walks round to its far side)
  const drawEraser = () => {
    if (!eraserOn) return;
    let k = 'eraser_0', ey = gy + face * 0.06, er = 0, sq = 1, x = ex, sc = 1;
    if (L < HM.slam) { ey = lerp(-h * 0.2, ey, ease.in3(eIn)); sq = 1.15; }
    else if (L < HM.slam + 0.15) k = 'eraser_1';
    else if (L < HM.scrub[1]) { const st = Math.floor(t * 8); k = st % 2 ? 'eraser_3' : 'eraser_0'; er = st % 2 ? -0.08 : 0.04; }
    if (orb) {
      // it stands to his right; the camera walking round swings it round him
      const D = ex - gx;
      x = gx + Math.cos(th) * D;
      sc = 1 + Math.sin(th) * 0.25;
    }
    if (L > HM.hit) {
      // smashed: it bursts apart and is flung away
      const u = seg(L, HM.hit, HM.hit + 0.6);
      k = 'eraser_4';
      ey -= Math.sin(u * Math.PI) * face * 2.5;
      x += u * face * 4;
      er = u * 3;
    }
    const [aw, ah] = artSize(k);
    const EH = face * 3.4 * sc;
    ctx.save();
    ctx.globalAlpha = L > HM.hit ? 1 - seg(L, HM.hit + 0.3, HM.hit + 0.6) : 1;
    ctx.translate(x, ey);
    ctx.rotate(er);
    ctx.scale(1 / Math.sqrt(sq), sq);
    drawArtFoot(ctx, k, 0, 0, EH * (aw / ah) * (k === 'eraser_1' ? 1.25 : 1));
    ctx.restore();
  };
  if (!orb || Math.sin(th) < 0) drawEraser();

  // ---- him
  let pose = 'ride_2', y = gy, x = gx, scale = 1, alpha = 1, rot = 0, flip = false;
  if (L < HM.land) {
    // riding the end of the stroke down onto the page
    const pts = rideIn(w, h, gx, gy);
    const u = ease.inOut2(seg(L, 0, HM.land));
    const i = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)));
    const kk = u * (pts.length - 1) - i;
    x = lerp(pts[i][0], pts[i + 1][0], kk);
    y = lerp(pts[i][1], pts[i + 1][1], kk) - face * 0.15;
    flip = true;
    rot = 0.25;
  } else pose = 'hero_0';
  if (L > HM.drop) pose = 'home_1';
  // the Eraser is back: he turns to face it and braces
  if (L > HM.brace) { pose = 'chase_2'; flip = true; }
  if (orb) {
    // the camera walks round him: his drawing turns through all eight sides
    pose = TURN[Math.round((th / TAU) * 8) % 8];
    flip = false;
  }
  if (L > HM.orbit[1]) pose = 'powerup_1';
  if (L > HM.flick[0]) pose = 'firetornado_0';
  if (L > HM.crouch) pose = 'firetornado_1';
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
  // you sign: he leans in to watch, cheers when you lift the brush, then a thumbs-up
  const drawing = sig.length > 0 && signedAt < 0;
  if (L > HM.offer && L < HM.wave[0]) {
    if (drawing) pose = 'sign_0';
    else if (signedAt >= 0) pose = t - signedAt < 1.4 ? (Math.floor(t * 6) % 2 ? 'sign_1' : 'home_2') : 'sign_3';
  }
  if (L > HM.offer + 0.5 && L < HM.wave[0] && sig.length === 0) pose = idlePose(f, 4) ?? pose;
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
  if (fire > 0) drawTornado(ctx, x, gy, face * 1.4, face * 4.4, fire, t, false);
  if (orb) {
    // the wind of the power-up: a few long strokes rushing up past him
    for (let i = 0; i < 4; i++) {
      const sx = gx + Math.cos(th * 1.3 + i * 1.6) * face * 1.8;
      const y0 = gy - ((t * 3 + i * 0.27) % 1) * face * 5;
      smear(ctx, [sx, y0 + face * 1.6], [sx, y0], face * 0.18, '#7fb4e0', 0.35);
    }
  }
  drawPose(ctx, pose, x, y, face * scale, { alpha, rot, flip });
  if (fire > 0) drawTornado(ctx, x, gy, face * 1.4, face * 4.4, fire, t, true);
  if (orb && Math.sin(th) >= 0) drawEraser();

  // ---- the Spark: glowing in his fist, let go, flicked up, hanging over the fire, kicked down on fire into the Eraser
  const top: Pt = [x + face * 1.25, gy - face * 2.7 - face * 1.5];
  if (L > 0.3 && L < HM.drop) {
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
      // dropped at his feet; it waits there, glowing, while he faces the Eraser down
      const u = ease.in2(seg(L, HM.drop, HM.drop + 0.2));
      b = [x + face * 0.7, lerp(gy - face * 1.2, gy - r, u) - Math.abs(Math.sin(t * 3)) * face * 0.15 * seg(L, HM.drop + 0.2, HM.drop + 0.5)];
      if (orb) b = [gx + Math.cos(th + 0.3) * face * 0.9, gy - r];
    } else {
      const u = ease.out3(seg(L, HM.flick[0], HM.spin[0]));
      b = [lerp(x + face * 0.7, top[0], u), lerp(gy - r, top[1], u) + Math.sin(t * 6) * face * 0.06 * u];
    }
    if (fire > 0.3) drawFireball(ctx, b, [b[0], b[1] + face * 0.6], r * 1.2, t);
    else drawSpark(ctx, b[0], b[1], r);
  } else if (L >= HM.kick && L < HM.hit) {
    const u = ease.in2(seg(L, HM.shot[0], HM.hit));
    const b: Pt = [lerp(top[0], sealAt[0], u), lerp(top[1], sealAt[1], u)];
    const tail: Pt = [lerp(top[0], sealAt[0], Math.max(0, u - 0.35)), lerp(top[1], sealAt[1], Math.max(0, u - 0.35))];
    drawFireball(ctx, b, tail, face * 0.32, t);
    if (f.crossedFwd(f.B - L + HM.kick)) f.shake(face * 0.25);
  }

  // the brush he holds out glows a little while the page waits for you
  if (L > HM.offer + 0.3 && L < HM.wave[0] && sig.length === 0) {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 3);
    drawSprite(ctx, glow('#ffd59a', 64), x + face * 0.9, y - face * 1.2, face * 1.6);
    ctx.restore();
  }

  // ---- after the credits: a head round the edge of the page, a grin and a wave
  const pk = seg(L, HM.peek[0], HM.peek[1]);
  if (pk > 0) {
    const inK = ease.outBack(clamp(pk * 3), 1.4);
    const pw = face * 2.0;
    drawArt(ctx, 'extra_0', w + pw * 0.5 - pw * 0.95 * inK, gy - face * 3.0, pw, { rot: Math.sin(t * 6) * 0.03 });
  }
  ctx.restore();

  // ---- into his eyes (a cut-in over everything)
  const ek = seg(L, HM.eye[0], HM.eye[1]);
  if (ek > 0 && ek < 1) {
    ctx.save();
    ctx.fillStyle = '#f4efe4';
    ctx.globalAlpha = Math.min(1, ek * 6) * (1 - seg(ek, 0.85, 1));
    ctx.fillRect(0, 0, w, h);
    const ew = lerp(w * 0.9, w * 2.4, ease.in2(ek));
    drawArt(ctx, 'closeup_0', w / 2, h * 0.45, ew);
    // the Spark caught in his eye
    ctx.globalAlpha *= 0.9;
    drawSpark(ctx, w / 2 + ew * 0.11, h * 0.45 - ew * 0.02, ew * 0.012, 1, 0.6);
    ctx.restore();
    if (ek > 0.9) flash(ctx, w, h, (ek - 0.9) * 10 * 0.6, '#ffffff');
  }
}
