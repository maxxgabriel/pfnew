import { deskOn } from '../desk/layout';
import { DOODLE, drawDoodle, wideSheet } from './margins';
import { drawSeal } from '../acts/ink';
import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, lerp, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { artSize, drawArt, drawArtFoot, drawFig, drawPose, ib, poseHeight, setActStyle } from './art';
import { drawVfx, vfxAspect } from './bg';
import { INK, RED, cycle, drawGround, drawPaper, drawSpark, drawTitle, faceOf, titleFit } from './common';
import { dryStreak, flash, impactFrame, letterbox, shockRing } from './fx';
import { HANDOFF, slideBelow } from './chase';
import { drawStill } from './still';
import { drawWall } from './wall';

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

/** the 'finale' hold (src/core/holds.ts FINALE_AT): its local beat, and his poses through it */
const FIN_L = 5.802;
const FIN_POSE: [number, string][] = [[0.06, 'firetornado_7'], [0.24, 'fine_0'], [0.36, 'fine_1'], [0.5, 'fine_2'], [0.79, 'snap_0']];

/**
 * The Eraser in the finale: smashed to pieces and smoking while he has his tea; it pulls itself together
 * and hops back at him; it stares him down; he snaps, and it crumbles away to dust, from its top down.
 */
function finaleEraser(ctx: CanvasRenderingContext2D, p: number, ex: number, gx: number, gy: number, face: number, t: number) {
  const EH = face * 3.4;
  const lie: Pt = [ex + face * 3, gy + face * 0.06], front: Pt = [gx + face * 3.0, gy + face * 0.06];
  let k = 'eraser_4', x = lie[0], y = lie[1], r = 0.1, dust = 0;
  if (p < 0.08) { y = lerp(gy - face * 1.8, lie[1], ease.in2(p / 0.08)); r = lerp(2.2, 0.1, p / 0.08); }
  else if (p < 0.38) r = 0.1 + Math.sin(t * 2) * 0.02;
  else if (p < 0.52) {
    // back together, and three angry hops toward him
    const u = seg(p, 0.38, 0.52);
    k = u < 0.2 ? 'eraser_4' : 'eraser_3';
    x = lerp(lie[0], front[0], ease.inOut2(u));
    y = front[1] - Math.abs(Math.sin(u * Math.PI * 3)) * face * 1.2;
    r = -0.25 + Math.sin(u * 20) * 0.08;
  } else { k = 'eraser_0'; x = front[0]; r = Math.sin(t * 4) * 0.04; dust = seg(p, 0.82, 0.98); }
  const [aw, ah] = artSize(k);
  const ew = EH * (aw / ah);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r);
  if (dust > 0) {
    // the snap: it crumbles away from the top, a few big crumbs drifting off on the air
    ctx.beginPath();
    const edge = -EH * (1 - dust);
    ctx.moveTo(-ew, 0);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-ew + (i / 8) * ew * 2, edge + Math.sin(i * 2.1 + dust * 6) * EH * 0.05);
    ctx.lineTo(ew, 0);
    ctx.closePath();
    ctx.clip();
  }
  drawArtFoot(ctx, k, 0, 0, ew);
  // scorched: its own silhouette, darkened, over it
  drawFig(ctx, k, 0, 0, ew / aw, { tint: '#2a180e', alpha: 0.42 });
  ctx.restore();
  if (dust > 0) {
    ctx.save();
    for (let i = 0; i < 14; i++) {
      const born = (i % 7) / 7, u = seg(dust, born * 0.8, born * 0.8 + 0.45);
      if (u <= 0 || u >= 1) continue;
      const sx = x + (((i * 37) % 11) / 11 - 0.5) * ew * 0.9, sy = y - EH * (1 - born);
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = i % 3 ? '#e2a59c' : '#7d7470';
      ctx.beginPath();
      ctx.ellipse(sx + u * face * (2.5 + (i % 4)), sy - u * face * (1.5 + (i % 3)), face * 0.12, face * 0.08, i, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

const TURN = ['turnA_0', 'turnA_1', 'turnA_2', 'turnA_3', 'turnB_0', 'turnB_1', 'turnB_2', 'turnB_3'];

/* ------------------------------------------------------------ your signature */

/** the strokes you sign with, in screen pixels; and when you lifted the brush (wall clock) */
const sig: Pt[][] = [];
let signedAt = -1;
let clockNow = 0;
export function signStart(x: number, y: number) {
  sig.push([[x, y]]);
}
export function signMove(x: number, y: number) {
  const s = sig[sig.length - 1];
  if (!s) return;
  const q = s[s.length - 1];
  if (Math.hypot(x - q[0], y - q[1]) > 3) s.push([x, y]);
}
export function signEnd() {
  if (sig.length && sig[sig.length - 1].length > 2) signedAt = clockNow;
}
/** the page is waiting for your signature between these beats (of this chapter) */
export const SIGN_WINDOW = [HM.offer, HM.wave[0]] as const;


/** the special-move backdrop: deep brown to maroon, a lighter heart behind him, long streaks rising */
function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, t: number, k: number) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = k;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.9);
  g.addColorStop(0, '#651e18');
  g.addColorStop(0.45, '#3a1510');
  g.addColorStop(1, '#120806');
  ctx.fillStyle = g;
  ctx.fillRect(-w, -h, w * 3, h * 3);
  ctx.fillStyle = 'rgba(255,140,60,0.16)';
  for (let i = 0; i < 7; i++) {
    const x = ((i / 7) * 1.6 - 0.3) * w;
    const y = h * (1.2 - ((t * 0.9 + i * 0.37) % 1.4));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + h * 0.45, y - h * 0.55);
    ctx.lineTo(x + h * 0.45 + 6, y - h * 0.55 + 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** the painted fire tornado (four frames on black, added as light), anchored at its base */
function drawTornado(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, t: number, alpha: number) {
  if (alpha <= 0 || width <= 1) return;
  drawVfx(ctx, `vfx_tornado_${Math.floor(t * 14) % 4}`, x, y, width, 0, alpha, 1);
}

/** the painted meteor: its head at `at`, its tail streaming back along -dir */
function drawMeteor(ctx: CanvasRenderingContext2D, at: Pt, dir: number, width: number, alpha = 1) {
  const back = width * 0.44;
  drawVfx(ctx, 'vfx_fire_0', at[0] - Math.cos(dir) * back, at[1] - Math.sin(dir) * back, width, dir, alpha);
}

let rideKey = '';
let ridePts: Pt[] = [];
function rideIn(w: number, h: number, gx: number, gy: number): Pt[] {
  const k = `${w}|${h}`;
  if (k !== rideKey) {
    rideKey = k;
    // the top of it IS his slide from chapter VII, carried on one screen down (the seam pans straight from one onto the other)
    ridePts = [slideBelow(w, h, 0.55), slideBelow(w, h, 0.7), slideBelow(w, h, HANDOFF), [gx - w * 0.12, gy - h * 0.02], [gx + w * 0.02, gy + 2]];
  }
  return ridePts;
}

/** on a wide screen, how far the scene has slid into the left of the screen to make room for the contact card (0..1) */
/** where the fire kick lands and the seal is burnt in (no card column), for the desk's burn (src/desk/story.ts) */
export function homeSeal(f: Frame): [number, number, number] {
  const face = faceOf(f);
  return [f.w * 0.74, f.h * 0.5 - face * 0.45, face];
}

export function homeSide(f: Frame, L: number) {
  // on the desk the camera pulls back instead, and the card lies beside the sheet
  if (f.w < f.h * 1.25 || f.w < 700 || deskOn(f.w, f.h)) return 0;
  return ease.inOut2(seg(L, HM.stand - 0.2, HM.offer)) * (1 - ease.inOut2(seg(L, HM.loop[0] - 0.08, HM.loop[0] + 0.25)));
}

export function drawHome(f0: Frame, L: number) {
  // the storyboard wall: the page pulls back to be one panel among every chapter of the film (the 'wall' hold)
  if (f0.hold?.kind === 'wall') {
    const side = homeSide(f0, L);
    const sw = f0.w * lerp(1, 0.58, side);
    if (side > 0) drawPaper(f0.ctx, f0.w, f0.h);
    f0.ctx.save();
    f0.ctx.beginPath();
    f0.ctx.rect(0, 0, sw, f0.h);
    f0.ctx.clip();
    drawWall({ ...f0, w: sw }, f0.hold.p, (g) => drawHome({ ...f0, ctx: g, hold: null }, L), side === 0);
    f0.ctx.restore();
    return;
  }
  // on a wide screen the scene lays itself out in the left part of the screen once the card arrives
  const side = homeSide(f0, L);
  if (side > 0) drawPaper(f0.ctx, f0.w, f0.h);
  const f: Frame = side > 0 ? { ...f0, w: f0.w * lerp(1, 0.58, side) } : f0;
  const { ctx, w, h, t } = f;
  // (the 'finale' hold's progress, or -1)
  const fin = f0.hold?.kind === 'finale' ? f0.hold.p : -1;
  clockNow = t;
  const face = faceOf(f);
  // with the card beside him (wide screens) he has the whole height: the page settles lower, the name gets room
  const gy = h * lerp(0.5, 0.64, side);
  const gx = w * 0.36;

  // ---- the fall into the seal: everything grows round it until it is the screen, then it is the first frame
  const lk = seg(L, HM.loop[0], HM.loop[1]);
  const sealAt: Pt = [w * 0.74, gy - face * 0.45];
  if (lk >= 0.5) {
    // the first page again (before the Spark drops): the red shrinks into the Spark, hanging over it, about to fall
    drawStill({ ...f, intro: 2.28 }, 0);
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
  // the special move: a hard cut to a dark backdrop at the crouch; it lifts back to paper after the hit
  const dark = L < HM.crouch ? 0 : L < HM.hit ? 1 : 1 - ease.inOut2(seg(L, HM.hit + 0.05, HM.landing[1]));
  if (dark > 0) drawBackdrop(ctx, w, h, gx, gy - face * 3, t, dark);
  if (f.crossedFwd(f.B - L + HM.crouch)) f.flash(0.6, '#ffb070');
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
    drawTitle({ ...f, intro: 0.2 + name * 2 }, w / 2, h * 0.07, titleFit(w * 0.42, gy - face * 3.6 - h * 0.07 - face * 0.3), 1);
  }
  // a wide sheet with no card beside it: a crane and the sea he crossed brush themselves into the margin
  if (side === 0 && wideSheet(f) && L > HM.stand) {
    const k = seg(L, HM.stand, HM.offer + 0.4), gone = 1 - seg(L, HM.loop[0] - 0.1, HM.loop[0] + 0.2);
    drawDoodle(ctx, DOODLE.crane, w * 0.83, h * 0.36 + Math.sin(t * 1.3) * h * 0.008, h * 0.26, k, 0.8 * gone);
    drawDoodle(ctx, DOODLE.wave, w * 0.87, h * 1.01, h * 0.34, seg(L, HM.stand + 0.3, HM.offer + 0.7), 0.8 * gone);
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
    brush(ctx, rideIn(w, h, gx, gy), { width: face * 0.34, color: INK, progress: 1, seed: 77, dry: 0.45, press: 1.6, tail: 0.3, halo: 0, alpha: 1 - seg(L, HM.brace, HM.orbit[0]) });
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
      shockRing(ctx, sealAt[0], sealAt[1], face * 2.2, rk, INK, face * 0.07, 5);
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
    brush(ctx, sg, { width: face * 0.08, color: INK, seed: 33, dry: 0.4, press: 1.3, tail: 0.3, halo: 0 });
  }

  // the Eraser (behind him while the camera walks round to its far side)
  const drawEraser = () => {
    if (fin >= 0) { finaleEraser(ctx, fin, ex, gx, gy, face, t); return; }
    if (L > FIN_L) return; // (dust: it was snapped away)
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
    // (from the hand-off point on his slide, where chapter VII left him, down to the page)
    const pts = rideIn(w, h, gx, gy).slice(2);
    const u = ease.out2(seg(L, 0, HM.land));
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
    if (L > HM.spin[0]) {
      // two full turns, clockwise: front, side, back, side (mirrored)
      const q = Math.floor(((seg(L, HM.spin[0], HM.spin[1]) * 2) % 1) * 4);
      pose = ['firetornado_4', 'firetornado_2', 'firetornado_3', 'firetornado_2'][q];
      flip = q === 3;
    }
    // the horizontal wind-up, the strike, the follow-through
    if (L > HM.spin[1]) { pose = 'ftkick_0'; flip = false; }
    if (L > HM.kick) pose = 'ftkick_1';
    if (L > HM.kick + 0.08) pose = 'ftkick_2';
    if (L > HM.shot[1]) pose = 'firetornado_6';
    y = gy - air * face * 2.7;
  }
  if (L > HM.landing[0] + 0.2) { pose = 'firetornado_7'; y = gy; }
  // (the 'finale' hold) this is fine; up and dusted off; the hand raised; the snap
  if (fin >= 0) { pose = FIN_POSE.find(([a]) => fin < a)?.[1] ?? 'snap_1'; y = gy; flip = false; }
  if (L > HM.stand) pose = 'home_1';
  if (L > HM.turn) pose = 'home_2';
  if (L > HM.offer) pose = 'home_3';
  // the in-betweens: rising from the landing, standing up from the kick, turning to you, lifting the brush
  pose = ib(pose, 'home_1', L, HM.drop, 'ib_rise');
  pose = ib(pose, 'home_1', L, HM.stand, 'ib_stand');
  pose = ib(pose, 'home_2', L, HM.turn, 'ib_turn');
  pose = ib(pose, 'home_3', L, HM.offer, 'ib_offer');
  // you sign: he leans in to watch, cheers when you lift the brush, then a thumbs-up
  const drawing = sig.length > 0 && signedAt < 0;
  if (L > HM.offer && L < HM.wave[0]) {
    if (drawing) pose = 'sign_0';
    else if (signedAt >= 0) pose = t - signedAt < 1.4 ? (Math.floor(t * 6) % 2 ? 'sign_1' : 'home_2') : 'sign_3';
  }
  // the last screen: while he stands holding out the brush, his art style changes every 2 seconds
  const cycling = L > HM.offer + 0.4 && L < HM.wave[0] && !drawing && pose === 'home_3';
  const CYC = [null, 'pixel', 'water', 'clay', 'chalk', 'comic', 'hose'] as const;
  const cyc = cycling ? CYC[Math.floor(t / 2) % CYC.length] : null;
  const switchGlitch = cycling ? Math.max(0, 1 - (t % 2) / 0.14) : 0;
  // ight, imma head out: down on the page for a second, then up, hands in pockets, and off
  if (L > HM.wave[0]) pose = L < HM.wave[0] + 0.22 ? 'headout_0' : L < HM.wave[0] + 0.44 ? 'headout_1' : 'headout_2';
  if (L > HM.walk[0]) {
    const u = seg(L, HM.walk[0], HM.walk[1]);
    pose = u < 0.25 ? 'bye_2' : cycle('bye', 2, t, 4) === 'bye_0' ? 'bye_2' : 'bye_3';
    scale = lerp(1, 0.25, ease.in2(u));
    y = lerp(gy, gy - h * 0.12, ease.in2(u));
    alpha = 1 - seg(u, 0.8, 1);
  }

  // the fire tornado: it rises with him and burns out after the kick
  const fire = L > HM.leap[0] ? ease.out2(seg(L, HM.leap[0], HM.spin[0] + 0.25)) * (1 - ease.in2(seg(L, HM.spin[1] - 0.05, HM.kick))) : 0;
  const torW = face * 3.1 * (0.35 + 0.65 * fire);
  // a ring of fire opens at his feet as he gathers to jump
  const ring = L > HM.crouch ? ease.out2(seg(L, HM.crouch, HM.leap[0])) * (1 - seg(L, HM.spin[0], HM.spin[0] + 0.35)) : 0;
  if (ring > 0) drawVfx(ctx, 'vfx_fire_2', x, gy - face * 0.05, face * lerp(1.2, 3.4, ring), 0, ring);
  // this is fine: the page burning round him while he has his tea
  const burn = fin >= 0 ? 1 - seg(fin, 0.36, 0.5) : 0;
  if (burn > 0) {
    const fl = 0.85 + 0.15 * Math.sin(t * 13);
    drawVfx(ctx, 'vfx_fire_2', x, gy + face * 0.1, face * 7.5 * fl, 0, burn);
    drawVfx(ctx, 'vfx_fire_2', ex + face * 1.5, gy + face * 0.1, face * 5 * (1.7 - fl), 0, burn * 0.9);
    drawVfx(ctx, 'vfx_fire_1', x - face * 3.2, gy - face * 0.6, face * 3.2 * fl, 0, burn * 0.7);
  }
  drawTornado(ctx, x, gy + face * 0.2, torW, t, fire);
  // the fire lights him: a warm rim while it roars and while the foot charges
  const lit = Math.max(fire, L > HM.spin[1] && L < HM.shot[1] ? 1 : 0);
  if (lit > 0.15) drawPose(ctx, pose, x, y + face * 0.03, face * scale * 1.05, { tint: '#ff9a3c', flip, alpha: 0.6 * lit, boil: 0.025, t });
  if (orb) {
    // the wind of the power-up: a few long strokes rushing up past him
    for (let i = 0; i < 4; i++) {
      const sx = gx + Math.cos(th * 1.3 + i * 1.6) * face * 1.8;
      const y0 = gy - ((t * 3 + i * 0.27) % 1) * face * 5;
      dryStreak(ctx, [sx, y0], [sx, y0 + face * 1.8], face * 0.16, '#6aa6d6', 0.3, 40 + i);
    }
  }
  if (cycling) {
    // each change glitches through: the figure sliced into bands that jump sideways, a flash of the new style
    setActStyle(cyc);
    const top = y - poseHeight(pose, face) * 1.1, bandH = (y - top) / 3;
    for (let b = 0; b < 3; b++) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - face * 5, top + b * bandH, face * 10, bandH + 1);
      ctx.clip();
      // white chalk on cream paper: he stands on a little slate of blackboard (his own silhouette, grown)
      if (cyc === 'chalk') { setActStyle(null); drawPose(ctx, pose, x, y + face * 0.04, face * scale * 1.12, { tint: '#26332e', flip }); setActStyle(cyc); }
      drawPose(ctx, pose, x + switchGlitch * face * 0.5 * Math.sin(b * 2.7 + Math.floor(t * 24)), y, face * scale, { alpha, rot, flip });
      ctx.restore();
    }
    setActStyle(null);
    if (switchGlitch > 0.5) {
      ctx.save();
      ctx.globalAlpha = (switchGlitch - 0.5) * 0.3;
      ctx.fillStyle = ['#f4efe4', '#2bff88', '#2bd4ff', '#ffd23a', '#e9ecf2', '#ff2e63', '#1b1714'][Math.floor(t / 2) % 7];
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  } else drawPose(ctx, pose, x, y, face * scale, { alpha, rot, flip });
  drawTornado(ctx, x, gy + face * 0.2, torW, t + 0.13, fire * 0.22);
  // the wind-up: the fire collapses into his striking foot, a white-hot charge
  const foot: Pt = [x + face * 1.25, y - face * 0.55];
  const charge = L > HM.spin[1] - 0.1 && L < HM.kick + 0.1 ? ease.out2(seg(L, HM.spin[1] - 0.1, HM.kick)) : 0;
  if (charge > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = charge;
    drawSprite(ctx, glow('#ff7a20', 128), foot[0] - face * 0.4, foot[1], face * (2.4 + Math.sin(t * 40) * 0.15));
    drawSprite(ctx, glow('#fff3c4', 64, 0.3), foot[0] - face * 0.4, foot[1], face * 0.9);
    ctx.restore();
  }
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
    } else if (L < HM.spin[1]) {
      const u = ease.out3(seg(L, HM.flick[0], HM.spin[1]));
      b = [lerp(x + face * 0.7, top[0], u), lerp(gy - r, top[1], u)];
    } else {
      // over the top it drifts down to meet his foot
      const u = ease.inOut2(seg(L, HM.spin[1], HM.kick));
      b = [lerp(top[0], foot[0] + face * 0.15, u), lerp(top[1], foot[1], u)];
    }
    drawSpark(ctx, b[0], b[1], r, 1, dark > 0 ? 1.4 : 1);
  } else if (L >= HM.kick && L < HM.hit) {
    // the ball ignites on his foot and goes down as a meteor
    const from: Pt = [foot[0] + face * 0.15, foot[1]];
    const u = ease.in2(seg(L, HM.shot[0], HM.hit));
    const b: Pt = [lerp(from[0], sealAt[0], u), lerp(from[1], sealAt[1], u)];
    drawMeteor(ctx, b, Math.atan2(sealAt[1] - from[1], sealAt[0] - from[0]), face * lerp(2.2, 4.2, u));
    if (f.crossedFwd(f.B - L + HM.kick)) f.shake(face * 0.25);
  }

  // ---- the meteor lands: an explosion and a ring of flame across the page
  const exk = seg(L, HM.hit, HM.hit + 0.45);
  if (exk > 0 && exk < 1) {
    const aspect = vfxAspect('vfx_fire_1') || 1;
    drawVfx(ctx, 'vfx_fire_1', sealAt[0], sealAt[1] - face * 0.2 * aspect, face * lerp(2, 7, ease.out3(exk)), 0, 1 - ease.in2(exk));
    drawVfx(ctx, 'vfx_fire_2', sealAt[0], sealAt[1] + face * 0.3, face * lerp(1.5, 8, ease.out2(exk)), 0, 1 - exk);
  }
  if (L >= HM.kick && L < HM.kick + 0.03) impactFrame(ctx, w, h, 1, 'invert');
  else if (L >= HM.kick + 0.03 && L < HM.kick + 0.07) impactFrame(ctx, w, h, 1, 'spikes', foot[0], foot[1], 7);
  letterbox(ctx, w, h, ease.inOut2(seg(L, HM.crouch, HM.crouch + 0.2)) * (1 - seg(L, HM.hit, HM.landing[1])), '#000');

  // the brush he holds out glows a little while the page waits for you
  if (L > HM.offer + 0.3 && L < HM.wave[0] && sig.length === 0) {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 3);
    drawSprite(ctx, glow('#ffd59a', 64), x + face * 0.9, y - face * 1.2, face * 1.6);
    ctx.restore();
  }

  // ---- "and i am maxx." — written in as he raises his hand; the snap
  if (fin >= 0) {
    const k = seg(fin, 0.54, 0.74), gone = 1 - seg(fin, 0.93, 1);
    if (k > 0 && gone > 0) {
      const text = 'and i am maxx.';
      ctx.save();
      // (as big as fits: a phone is narrow)
      ctx.font = `700 ${Math.round(face * 1.05)}px "Caveat", "Segoe Print", cursive`;
      const fit = Math.min(1, (w * 0.86) / ctx.measureText(text).width);
      ctx.font = `700 ${Math.round(face * 1.05 * fit)}px "Caveat", "Segoe Print", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const tw = ctx.measureText(text).width, tx = clamp((x + ex) / 2, w * 0.07 + tw / 2, w * 0.93 - tw / 2), ty = gy - face * 4.3;
      ctx.beginPath();
      ctx.rect(tx - tw / 2 - face, ty - face * 1.6, (tw + face * 2) * k, face * 2.4);
      ctx.clip();
      ctx.globalAlpha = gone;
      ctx.fillStyle = INK;
      ctx.fillText(text, tx, ty);
      ctx.restore();
    }
    const sn = seg(fin, 0.79, 0.86);
    if (sn > 0 && sn < 1) shockRing(ctx, x + face * 0.95, gy - face * 2.55, face * 1.6, sn, INK, face * 0.06, 6);
    if (fin > 0.79 && fin < 0.81) f0.shake(face * 0.12);
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
    const span = Math.min(w, h * 0.9);
    const ew = lerp(span * 0.9, span * 2.4, ease.in2(ek));
    drawArt(ctx, 'closeup_0', w / 2, h * 0.45, ew);
    // the Spark caught in his eye
    ctx.globalAlpha *= 0.9;
    drawSpark(ctx, w / 2 + ew * 0.11, h * 0.45 - ew * 0.02, ew * 0.012, 1, 0.6);
    ctx.restore();
    if (ek > 0.9) flash(ctx, w, h, (ek - 0.9) * 10 * 0.6, '#ffffff');
  }
}
