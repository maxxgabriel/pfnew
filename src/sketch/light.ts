import type { Frame } from '../core/frame';
import { type Pt, TAU, ease, lerp, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { bladeOf, drawFig, drawPose, figHeight, figPoint, ib, meta } from './art';
import { bgImage, drawBg, drawLayer } from './bg';
import { BLUE, RED_BLADE, bladeLight, drawBlade } from './saber';
import { drawSpark, faceOf } from './common';
import { impactFrame, letterbox } from './fx';

/* IV · LIGHT. On the moon, the Spark throws a long shadow across grey
 * dust. It copies him, waves, peels upright and draws its red blade.
 * The duel and bullet hold retain every authored beat. A low-gravity leap
 * ends in an upward slash through the ink sky and re-entry into sunset. */

export const LT = {
  click: 0.0,
  drop: [0.55, 1.2] as const,
  land: 1.2,
  copy: [1.4, 2.5] as const,
  wave: 2.55,
  jump: 2.85,
  /** the shadow draws its hilt first; its red blade rises */
  draw: 3.0,
  redOn: [3.3, 3.75] as const,
  /** then him: reach to the belt, pull the hilt, hold it out — and the blade comes up, slowly */
  reach: 3.5,
  pull: 3.7,
  hold: 3.9,
  blueOn: [4.1, 4.65] as const,
  clashes: [4.9, 5.2, 5.48, 5.72] as const,
  leap: [5.95, 6.25] as const,
  swing: [6.25, 6.95] as const,
  fly: [6.95, 7.35] as const,
  sunset: [6.95, 7.85] as const,
  /** he lets go and flies up slashing; the cut; the ink sky splits and he bursts out into the sunset */
  slash: [6.95, 7.1] as const,
  cut: [7.1, 7.6] as const,
  tumble: [7.6, 8.0] as const,
  end: 8.0,
};

let split: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;

/* ---- bullet time: the second clash freezes and the camera walks round the locked blades (the 'bullet' hold) */

// the camera's walk round him: which drawing of the lock it sees, mirrored or not
const ORBIT: [string, boolean][] = [['saberlock_0', false], ['saberlock_1', false], ['saberlock_2', false], ['saberlock_1', true], ['saberlock_0', true], ['saberlock_3', true], ['saberlock_3', false], ['saberlock_0', false]];

function drawBullet(f: Frame, L: number, p: number) {
  const { ctx, w, h } = f;
  // the frozen moment underneath (its flicker frozen too)
  // (a beat before the clash itself, so it isn't the negative impact frame)
  drawLight({ ...f, hold: null, t: 11.3 }, L - 0.09, true, false);
  const inK = ease.out3(seg(p, 0, 0.12)), outK = ease.in3(seg(p, 0.9, 1));
  const k = inK * (1 - outK);
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = k;
  // the lunar surface drops away completely: only the two of them and the blades, no second, frozen him behind
  ctx.fillStyle = '#080406';
  ctx.fillRect(0, 0, w, h);
  // the orbit: hero and shadow swing round the clash point, the near one bigger and in front
  const S = Math.min(h * 0.38, w * 0.5);
  const cx = w / 2, cy = h * 0.6;
  const th = ease.inOut2(seg(p, 0.08, 0.92)) * TAU;
  const view = ORBIT[Math.min(ORBIT.length - 1, Math.floor((th / TAU) * (ORBIT.length - 1) + 0.5))];
  const D = S * 0.5;
  const fig = (key: string, flip: boolean, side: number, dark: boolean) => {
    const depth = Math.sin(th) * side;
    const x = cx - Math.cos(th) * D * side, sc = (S / figHeight(key)) * (1 + depth * 0.12);
    // the shadow: dark, with a red rim from its own blade
    if (dark) drawFig(ctx, key, x + sc * 6, cy, sc * 1.025, { flip, tint: '#ff2e3a', alpha: 0.55 });
    drawFig(ctx, key, x, cy, sc, { flip, tint: dark ? '#2a1018' : undefined });
    const hl = meta(key) as unknown as { hilt?: [number, number] };
    return { hilt: figPoint(key, hl?.hilt ?? [0, 0], x, cy, sc, { flip }), depth };
  };
  // the shadow sees him from the other side: the same drawing, mirrored, dark
  const order = Math.sin(th) >= 0 ? [-1, 1] : [1, -1];
  const hilts: Record<number, Pt> = {};
  for (const side of order) {
    const r = fig(view[0], side === 1 ? view[1] : !view[1], side, side === -1);
    hilts[side] = r.hilt;
  }
  // the blades meet above and between them; the meeting point is white-hot, the sparks hang in the air
  const meet: Pt = [(hilts[1][0] + hilts[-1][0]) / 2, Math.min(hilts[1][1], hilts[-1][1]) - S * 0.32];
  const bw = S * 0.035;
  bladeLight(ctx, hilts[1], meet, BLUE, S * 0.9, 0.4);
  bladeLight(ctx, hilts[-1], meet, RED_BLADE, S * 0.9, 0.4);
  drawBlade(ctx, hilts[-1], [meet[0] + (meet[0] - hilts[-1][0]) * 0.15, meet[1] + (meet[1] - hilts[-1][1]) * 0.15], RED_BLADE, bw, 1, 0);
  drawBlade(ctx, hilts[1], [meet[0] + (meet[0] - hilts[1][0]) * 0.15, meet[1] + (meet[1] - hilts[1][1]) * 0.15], BLUE, bw, 1, 0);
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow('#fff4e0', 128, 0.3), meet[0], meet[1], S * 0.5);
  ctx.strokeStyle = '#ffe9c4';
  ctx.lineCap = 'round';
  ctx.lineWidth = bw * 0.5;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.55 + th * 0.15, r0 = S * 0.08, r1 = S * (0.22 + (i % 2) * 0.08);
    ctx.beginPath();
    ctx.moveTo(meet[0] + Math.cos(a) * r0, meet[1] + Math.sin(a) * r0);
    ctx.lineTo(meet[0] + Math.cos(a) * r1, meet[1] + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
  letterbox(ctx, w, h, k, '#000');
}

export function drawLight(f: Frame, L: number, withHero = true, inner = false) {
  if (f.hold?.kind === 'bullet') return drawBullet(f, L, f.hold.p);
  const { ctx, w, h, t } = f;
  const face = faceOf(f);
  // ---- the way out: the ink sky, frozen at the moment of the cut, splits along it; the sunset pours through
  if (!inner && L >= LT.cut[0]) {
    drawEscape(f, L);
    return;
  }
  // The Spark is the only practical light, low over the curved horizon.
  const source: Pt = [w * 0.5 + Math.sin(t * 1.3) * face * 0.12, h * 0.51];
  const floorY = h * 0.74;
  const on = L >= LT.click;
  if (f.crossedFwd(f.B - L + LT.click)) f.flash(0.35, '#fff1d6');

  // ---- painted ink space and lunar dust (broad forms, no star field)
  ctx.fillStyle = '#070b15';
  ctx.fillRect(0, 0, w, h);
  drawBg(ctx, 'bg_space', w, h, 0.55, 1, 1.04);
  // A curved opaque underpainting also keeps the floor present while art loads.
  ctx.fillStyle = '#777a80';
  ctx.beginPath(); ctx.moveTo(0, h * 0.78);
  ctx.quadraticCurveTo(w * 0.5, h * 0.60, w, h * 0.78);
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
  const ground = bgImage('fg_moon');
  // Full frame mapping keeps the horizon in the same place on phone and desktop.
  if (ground) ctx.drawImage(ground, 0, 0, w, h);
  const pool = ctx.createRadialGradient(source[0], floorY, face, source[0], floorY, Math.max(w, h) * 0.7);
  pool.addColorStop(0, 'rgba(246,231,207,0.22)');
  pool.addColorStop(1, 'rgba(5,8,17,0)');
  ctx.fillStyle = pool; ctx.fillRect(0, h * 0.68, w, h * 0.32);

  // ---- who is where, and in which pose
  let hx = w * 0.36, hy = floorY, pose = 'home_1', flip = false, rot = 0;
  let shPose = 'home_1', shFlip = false, shDx = 0;
  if (L < LT.land) {
    const u = ease.in2(seg(L, LT.drop[0], LT.drop[1]));
    hx = lerp(w * 0.5, w * 0.36, ease.inOut2(seg(L, LT.drop[0], LT.land)));
    hy = lerp(Math.max(h * 0.34, face * 4.5), floorY, u);
    pose = 'fall_3';
    rot = -0.3 * (1 - seg(L, LT.drop[0], LT.land));
  } else if (L < LT.land + 0.3) pose = 'hero_0';
  if (L >= LT.land && f.crossedFwd(f.B - L + LT.land)) f.shake(face * 0.35);
  if (L > LT.copy[0]) { pose = ib('curious', 'curious', L, LT.copy[0], 'ib_rise'); shPose = pose; }
  if (L > LT.copy[0] + 0.5) { pose = 'curious'; flip = true; shPose = 'curious'; shFlip = true; }
  if (L > LT.wave) { pose = 'curious'; flip = false; shPose = 'bye_0'; shFlip = false; }
  if (L > LT.jump) { pose = 'comedy_3'; hy = floorY - Math.sin(seg(L, LT.jump, LT.jump + 0.3) * Math.PI) * face * 1.4; }
  // the shadow draws first: reach, pull, hold out, and the red blade rises
  if (L > LT.draw) { pose = 'still_2'; hy = floorY; shFlip = true; shDx = face * 1.5; shPose = 'saberdraw_0'; }
  if (L > LT.draw + 0.12) shPose = 'saberdraw_1';
  if (L > LT.draw + 0.22) shPose = 'saberdraw_3';
  if (L > LT.redOn[1] + 0.15) shPose = 'saber_1';
  // then him: the same draw, and his blade comes up slowly from the hilt
  if (L > LT.reach) pose = 'saberdraw_0';
  if (L > LT.pull) pose = 'saberdraw_1';
  if (L > LT.hold) pose = 'saberdraw_2';
  if (L > LT.blueOn[0]) pose = 'saberdraw_3';
  if (L > LT.blueOn[1] + 0.1) pose = 'saber_1';
  // the duel: him on the floor, his shadow on the dust, trading blows
  const fight: [number, string, string][] = [[4.82, 'saber_2', 'saber_4'], [5.12, 'saber_4', 'saber_3'], [5.4, 'saber_3', 'saber_2'], [5.64, 'saber_5', 'saber_4']];
  for (const [b, me, it] of fight) if (L > b) { pose = me; shPose = it; }
  if (L > 5.85) { pose = 'saber_1'; shPose = 'saber_1'; }
  // Low-gravity launch, a floating hang, then blade-first ascent: same beats.
  if (L > LT.leap[0]) {
    const u = ease.out2(seg(L, LT.leap[0], LT.leap[1]));
    if (L < LT.swing[0]) {
      pose = 'leap_2';
      hx = lerp(hx, w * 0.44, u);
      hy = lerp(floorY, h * 0.48, u);
    } else if (L < LT.fly[0]) {
      const q = seg(L, LT.swing[0], LT.swing[1]);
      pose = q < 0.5 ? 'leap_2' : 'escape_0';
      hx = lerp(w * 0.44, w * 0.5, ease.inOut2(q));
      hy = h * 0.48 - Math.sin(q * Math.PI) * h * 0.1;
      rot = -Math.sin(q * Math.PI) * 0.18;
    } else {
      pose = 'escape_0'; hx = w * 0.5;
      hy = lerp(h * 0.48, h * 0.42, ease.out2(seg(L, LT.slash[0], LT.cut[0])));
    }
    shPose = L < LT.fly[0] ? 'saber_4' : 'saber_1'; shFlip = true;
  }

  // ---- the shadow on the dust: thrown from the Spark, long across the dust, then upright
  if (on && withHero) {
    const k = 1.6;
    const base: Pt = [w * 0.36, floorY];
    let sx = source[0] + (base[0] - source[0]) * 1.5 + shDx, sy = floorY - face * 0.2;
    if (L >= LT.leap[0] && L < LT.fly[1]) {
      // while he flies about, the shadow is his — it races across the dust after him
      sx = source[0] + (hx - source[0]) * 1.6;
      sy = Math.min(floorY, source[1] + (hy - source[1]) * 1.6);
    }
    const shadowCol = '#17101f';
    ctx.save();
    ctx.globalAlpha = L < LT.land ? seg(L, LT.drop[0] + 0.2, LT.land) * 0.9 : 0.9;
    const mine = L >= LT.leap[0] && L < LT.fly[1];
    const shKey = mine ? pose : shPose, shF = mine ? flip : shFlip, shR = mine ? rot : 0;
    ctx.globalAlpha *= 1 - seg(L, LT.sunset[0], LT.sunset[0] + 0.6);
    const peel = ease.inOut2(seg(L, LT.wave, LT.draw));
    ctx.save();
    ctx.translate(sx, sy);
    ctx.transform(1, 0, lerp(0.45, 0, peel), lerp(0.18, 1, peel), 0, 0);
    drawPose(ctx, shKey, 0, 0, face * k, { tint: shadowCol, flip: shF, rot: shR });
    ctx.restore();
    ctx.restore();
    // its blade, red, held by the risen shadow (it ignites first)
    const bl = !mine ? bladeOf(shKey, sx, sy, face * k, { flip: shF, rot: shR }) : null;
    if (bl && L < LT.sunset[0]) {
      const ig = shKey === 'saberdraw_3' ? ease.inOut2(seg(L, LT.redOn[0], LT.redOn[1])) : shKey.startsWith('saberdraw') ? 0 : 1;
      bladeLight(ctx, bl[0], bl[1], RED_BLADE, face * 4 * k, 0.3);
      drawBlade(ctx, bl[0], bl[1], RED_BLADE, face * 0.09 * k, ig, t, true);
    }
  }

  // The Spark casts a single soft pool over the dust.
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45;
  drawSprite(ctx, glow('#ffdfac', 128), source[0], source[1], face * 5);
  ctx.restore();

  // ---- the hero
  if (withHero && L > LT.drop[0]) {
    drawPose(ctx, pose, hx, hy, face, { flip, rot });
    const bl = bladeOf(pose, hx, hy, face, { flip, rot });
    if (bl) {
      // the blade comes up slowly from the hilt, stuttering as it catches
      const raw = seg(L, LT.blueOn[0], LT.blueOn[1]);
      const ig = pose === 'saberdraw_3' ? ease.inOut2(raw) * (raw < 0.25 ? 0.7 + 0.3 * Math.sin(t * 60) : 1) : pose.startsWith('saberdraw') ? 0 : 1;
      if (pose === 'saberdraw_3' && f.crossedFwd(f.B - L + LT.blueOn[0])) f.flash(0.15, '#bfe4ff');
      bladeLight(ctx, bl[0], bl[1], BLUE, face * 3.5, 0.35);
      drawBlade(ctx, bl[0], bl[1], BLUE, face * 0.11, ig, t + 1);
    }
  }
  const dust = seg(L, LT.land, LT.land + 0.4);
  if (dust > 0 && dust < 1) {
    ctx.save(); ctx.globalAlpha = Math.sin(dust * Math.PI) * 0.45;
    ctx.fillStyle = '#d9d4c7'; ctx.beginPath();
    ctx.ellipse(hx, floorY, face * (0.7 + dust * 1.5), face * (0.12 + dust * 0.25), 0, 0, TAU);
    ctx.fill(); ctx.restore();
  }

  // ---- the Spark: lighting the horizon, then dropping the hilt into his hand, then fleeing into the sunset
  if (on && withHero) {
    let sp: Pt = [source[0], source[1]];

    if (L > LT.fly[0]) sp = [lerp(sp[0], w * 0.5, seg(L, LT.fly[0], LT.sunset[1])), lerp(sp[1], h * 0.2, seg(L, LT.fly[0], LT.sunset[1]))];
    drawSpark(ctx, sp[0], sp[1], face * 0.17);
  }

  // ---- every clash is a frame of negative
  for (const c of LT.clashes) {
    if (f.crossedFwd(f.B - L + c)) f.shake(face * 0.25);
    if (L >= c && L < c + 0.04) impactFrame(ctx, w, h, 1, 'invert');
    else if (L >= c + 0.04 && L < c + 0.07) impactFrame(ctx, w, h, 0.9, 'spikes', hx + face * 1.2, hy - face * 1.6, Math.round(c * 10));
  }

  // The blade scratches a tapered, crooked brush tear into the black sky.
  const cutK = seg(L, LT.slash[0] + 0.05, LT.cut[0]);
  if (cutK > 0) drawTear(f, ease.in2(cutK), 0);
  void TAU;
}

/** the way out of space: the ink sky (frozen at the cut) splits along it, the sunset pours in, and he bursts out */
function drawEscape(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const face = faceOf(f);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  if (!split || split.c.width !== W || split.c.height !== H) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    split = { c, ctx: c.getContext('2d')! };
    // the ink sky as it was at the moment of the cut, without him (painted once: it is frozen)
    split.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLight({ ...f, ctx: split.ctx, crossedFwd: () => false, crossed: () => false, shake: () => {}, flash: () => {} }, LT.cut[0] - 0.001, false, true);
  }

  // behind it: the sunset
  // (the same sky, framed exactly as chapter V opens on it, so the seam is one sky: src/sketch/seams.ts)
  ctx.fillStyle = '#352330'; ctx.fillRect(0, 0, w, h);
  drawBg(ctx, 'bg_sunset', w, h, 0.25, 1, 1.18);
  const reentry = seg(L, LT.cut[0], LT.end);
  drawLayer(ctx, 'fg_sunset', w, h, 0, lerp(h * 0.5, -h * 0.7, reentry), Math.sin(reentry * Math.PI), 1.3);
  const k = ease.out3(seg(L, LT.cut[0], LT.cut[1]));
  // Keep the frozen moon outside one widening, jagged opening. There are
  // no translated rectangular halves or uniform strip of light.
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h);
  tearPath(ctx, w, h, face, 1, k);
  ctx.clip('evenodd'); ctx.drawImage(split.c, 0, 0, w, h); ctx.restore();
  drawTear(f, 1, k);
  if (f.crossedFwd(f.B - L + LT.cut[0])) { f.shake(face * 0.5); f.flash(0.5, '#fff3dc'); }

  // him: bursting up through the gap, blade high; at the top, a happy tumble; then falling (chapter V's broom)
  let pose = 'escape_1', y = h * 0.42, rot = 0;
  const up = ease.out2(seg(L, LT.cut[0], LT.tumble[0]));
  y = lerp(h * 0.42, h * 0.22, up);
  if (L > LT.cut[0] + 0.25) pose = 'escape_2';
  if (L >= LT.tumble[0]) {
    const u = seg(L, LT.tumble[0], LT.end);
    pose = u < 0.5 ? 'escape_3' : 'fall_0';
    y = lerp(h * 0.22, h * 0.4, ease.in2(u));
    rot = u < 0.5 ? -u * 1.2 : Math.sin(L * 7) * 0.15;
  }
  const x = w * 0.5 + (L >= LT.tumble[0] ? Math.sin(L * 5) * face * 0.3 : 0);
  const flightFace = face * lerp(1, 0.72, up);
  y = Math.max(y, flightFace * 4.9);
  drawPose(ctx, pose, x, y, flightFace, { rot });
  const bl = bladeOf(pose, x, y, flightFace, { rot });
  if (bl) {
    bladeLight(ctx, bl[0], bl[1], BLUE, face * 3.5, 0.35);
    drawBlade(ctx, bl[0], bl[1], BLUE, face * 0.11, 1, t + 1);
  }
  // the Spark, out ahead in the sky
  drawSpark(ctx, w * 0.5 + Math.cos(t * 2) * face * 1.6, h * 0.12 + Math.sin(t * 3) * face * 0.3, face * 0.17);
}

/** A single connected brush silhouette; its middle follows the raised blade.
 * Opening grows beyond the viewport so sunset fills it before re-entry. */
function tearPath(ctx: CanvasRenderingContext2D, w: number, h: number, face: number, length: number, open: number) {
  const top = lerp(h * 0.43, -h * 0.12, length), bottom = h * (0.52 + open);
  const width = face * 0.10 + open * Math.hypot(w, h) * 1.5;
  const points: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20, y = lerp(top, bottom, u);
    const center = w * 0.5 + Math.sin(u * 7) * face * 0.12 + (u - 0.5) * face * 0.35;
    const taper = Math.sin(Math.PI * u) ** 0.65;
    points.push([center, y]);
    const x = center - width * taper * (0.8 + 0.2 * Math.sin(i * 2.3));
    if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  for (let i = 20; i >= 0; i--) {
    const u = i / 20;
    ctx.lineTo(points[i][0] + width * Math.sin(Math.PI * u) ** 0.65 * (0.85 + 0.15 * Math.cos(i * 2.7)), points[i][1]);
  }
  ctx.closePath();
}
function drawTear(f: Frame, length: number, open: number) {
  const { ctx, w, h } = f;
  ctx.save(); ctx.beginPath(); tearPath(ctx, w, h, faceOf(f), length, open);
  ctx.shadowColor = '#76dfff'; ctx.shadowBlur = faceOf(f) * 0.3;
  ctx.strokeStyle = '#b5f1ff'; ctx.lineWidth = Math.max(1, faceOf(f) * 0.035);
  if (open === 0) { ctx.fillStyle = '#efffff'; ctx.fill(); }
  ctx.globalAlpha = 1 - ease.out2(open); ctx.stroke(); ctx.restore();
}
