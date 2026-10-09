import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, hash, lerp, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { bladeOf, drawPose } from './art';
import { drawBg } from './bg';
import { BLUE, RED_BLADE, bladeLight, drawBlade } from './saber';
import { INK, drawSpark, faceOf } from './common';
import { impactFrame, shockRing, smear } from './fx';

/*
 * IV · LIGHT.
 *
 * The warm point in the dark is a bulb. It stutters and clicks on, and he
 * drops out of the night into its light — a superhero landing on a bare
 * floor in front of a paper wall. His shadow lands with him, huge on the
 * wall. He looks round; the shadow copies. Then it doesn't: it waves at
 * him. He jumps out of his skin. The shadow draws a hilt and a red blade
 * rises from it; he draws his own from his belt and the blue blade comes up
 * slowly in his hands; they duel —
 * him on the floor, his shadow twice his size on the wall, the blades
 * lighting the paper — every clash a frame of negative. He leaps for the
 * bulb's cord and swings; the light swings with him and the shadows sweep
 * the whole wall. He lets go and flies; the bulb sinks, the room melts into
 * a painted sunset sky, and he falls back through it (chapter V catches him
 * on a broom).
 */

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
  end: 8.0,
};

const mixC = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], clamp(k)))).join(',')})`;
};

/** the swing of the bulb, radians: a nudge at each clash, the big swing while he hangs on the cord */
function swingOf(L: number) {
  let a = 0;
  for (const c of LT.clashes) if (L > c) a += 0.06 * Math.exp(-(L - c) * 3) * Math.sin((L - c) * 14);
  if (L > LT.swing[0]) {
    const u = L - LT.swing[0];
    a += 0.55 * Math.sin(u * 5.2) * Math.min(1, u * 3) * (1 - seg(L, LT.fly[1], LT.sunset[1]));
  }
  return a;
}

export function drawLight(f: Frame, L: number, withHero = true) {
  const { ctx, w, h, t } = f;
  const face = faceOf(f);
  const pivot: Pt = [w * 0.5, -h * 0.05];
  const rope = h * 0.4;
  const sw = swingOf(L);
  const sink = ease.inOut2(seg(L, LT.sunset[0], LT.sunset[1]));
  const bulb: Pt = [pivot[0] + Math.sin(sw) * rope, lerp(pivot[1] + Math.cos(sw) * rope, h * 0.6, sink)];
  const floorY = h * 0.74;
  const on = L >= LT.click;
  if (f.crossedFwd(f.B - L + LT.click)) f.flash(0.35, '#fff1d6');

  // ---- the room: a paper wall lit from the bulb, a dark floor
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  if (on) {
    // the room comes up around the bulb he dived into
    ctx.save();
    ctx.globalAlpha = ease.out2(seg(L, 0, 0.45));
    const R = Math.max(w, h) * lerp(0.75, 1.1, sink);
    const g = ctx.createRadialGradient(bulb[0], bulb[1], 0, bulb[0], bulb[1], R);
    g.addColorStop(0, mixC('#f6e9cc', '#ffe2a8', sink));
    g.addColorStop(0.3, mixC('#cdb48c', '#f08a45', sink));
    g.addColorStop(0.7, mixC('#4a3a2a', '#a0303a', sink));
    g.addColorStop(1, mixC('#000000', '#2a0c26', sink));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, floorY);
    const fg = ctx.createLinearGradient(0, floorY, 0, h);
    fg.addColorStop(0, mixC('#2a2018', '#3a1418', sink));
    fg.addColorStop(1, '#050303');
    ctx.fillStyle = fg;
    ctx.fillRect(0, floorY, w, h - floorY);
    ctx.restore();
  }

  // ---- who is where, and in which pose
  let hx = w * 0.36, hy = floorY, pose = 'home_1', flip = false, rot = 0;
  let shPose = 'home_1', shFlip = false, shDx = 0;
  if (L < LT.land) {
    const u = ease.in2(seg(L, LT.drop[0], LT.drop[1]));
    hy = lerp(-face * 3, floorY, u);
    pose = 'fall_3';
    rot = Math.PI;
  } else if (L < LT.land + 0.3) pose = 'hero_0';
  if (L >= LT.land && f.crossedFwd(f.B - L + LT.land)) f.shake(face * 0.35);
  if (L > LT.copy[0]) { pose = 'curious'; shPose = 'curious'; }
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
  // the duel: him on the floor, his shadow on the wall, trading blows
  const fight: [number, string, string][] = [[4.82, 'saber_2', 'saber_4'], [5.12, 'saber_4', 'saber_3'], [5.4, 'saber_3', 'saber_2'], [5.64, 'saber_5', 'saber_4']];
  for (const [b, me, it] of fight) if (L > b) { pose = me; shPose = it; }
  if (L > 5.85) { pose = 'saber_1'; shPose = 'saber_1'; }
  // the leap for the cord, the swing, the let-go
  if (L > LT.leap[0]) {
    const u = ease.out2(seg(L, LT.leap[0], LT.leap[1]));
    const hang: Pt = [bulb[0], bulb[1] - h * 0.02];
    if (L < LT.swing[0]) {
      pose = 'leap_2';
      hx = lerp(hx, hang[0] - face * 0.6, u);
      hy = lerp(floorY, hang[1] + face * 2.4, u);
    } else if (L < LT.fly[0]) {
      const ph = Math.sin((L - LT.swing[0]) * 5.2);
      pose = ph > 0.3 ? 'swing_1' : ph < -0.3 ? 'swing_2' : 'swing_0';
      // he hangs below the bulb, on the cord just above it
      const cordAt: Pt = [pivot[0] + Math.sin(sw) * rope * 0.9, pivot[1] + Math.cos(sw) * rope * 0.9];
      hx = cordAt[0];
      hy = cordAt[1] + face * 3.0;
      rot = sw * 0.8;
    } else {
      const u2 = seg(L, LT.fly[0], LT.fly[1]);
      pose = 'swing_3';
      hx = lerp(bulb[0], -w * 0.25, ease.in2(u2));
      hy = lerp(bulb[1] + face * 2.6, -face * 1.5, ease.in2(u2)) + Math.sin(u2 * Math.PI) * -face * 1.2;
    }
    shPose = L < LT.fly[0] ? 'saber_4' : 'saber_1';
    shFlip = true;
  }

  // ---- the shadow on the wall: thrown from the bulb, three times his size, cast up the paper
  if (on && withHero) {
    const k = 1.6 - sink * 0.3;
    const base: Pt = [w * 0.36, floorY];
    let sx = bulb[0] + (base[0] - bulb[0]) * 1.5 + shDx, sy = floorY - face * 0.2;
    if (L >= LT.leap[0] && L < LT.fly[1]) {
      // while he flies about, the shadow is his — it races along the wall after him
      sx = bulb[0] + (hx - bulb[0]) * 1.6;
      sy = Math.min(floorY, bulb[1] + (hy - bulb[1]) * 1.6);
    }
    const shadowCol = mixC('#2a1c12', '#2a0a18', sink);
    ctx.save();
    ctx.globalAlpha = L < LT.land ? seg(L, LT.drop[0] + 0.2, LT.land) * 0.8 : 0.8;
    const mine = L >= LT.leap[0] && L < LT.fly[1];
    const shKey = mine ? pose : shPose, shF = mine ? flip : shFlip, shR = mine ? rot : 0;
    ctx.globalAlpha *= 1 - seg(L, LT.sunset[0], LT.sunset[0] + 0.6);
    drawPose(ctx, shKey, sx, sy, face * k, { tint: shadowCol, flip: shF, rot: shR });
    ctx.restore();
    // its blade, red, thrown big on the wall (it ignites first)
    const bl = !mine ? bladeOf(shKey, sx, sy, face * k, { flip: shF, rot: shR }) : null;
    if (bl && L < LT.sunset[0]) {
      const ig = shKey === 'saberdraw_3' ? ease.inOut2(seg(L, LT.redOn[0], LT.redOn[1])) : shKey.startsWith('saberdraw') ? 0 : 1;
      bladeLight(ctx, bl[0], bl[1], RED_BLADE, face * 4 * k, 0.3);
      drawBlade(ctx, bl[0], bl[1], RED_BLADE, face * 0.09 * k, ig, t, true);
    }
  }

  // ---- the cord and the bulb (the bulb becomes the sun)
  if (on) {
    ctx.save();
    ctx.globalAlpha = 1 - sink;
    ctx.strokeStyle = '#1a140e';
    ctx.lineWidth = Math.max(1, face * 0.04);
    ctx.beginPath();
    ctx.moveTo(pivot[0], pivot[1]);
    ctx.lineTo(bulb[0], bulb[1] - face * 0.25);
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (!on) {
    const st = hash(Math.floor(t * 14)) < 0.25 + L * 1.5 ? 0.45 : 0.15;
    ctx.globalAlpha = 0.7 * st + 0.1;
    drawSprite(ctx, glow('#ffcf7a', 64), w / 2, h * 0.45, 70);
  } else {
    ctx.globalAlpha = 0.55;
    drawSprite(ctx, glow(sink > 0.5 ? '#ff9a4a' : '#ffcf7a', 128), bulb[0], bulb[1], face * lerp(6, 10, sink));
    ctx.globalAlpha = 1;
    drawSprite(ctx, glow('#fff6e0', 64, 0.35), bulb[0], bulb[1], face * lerp(0.9, 2.2, sink));
  }
  ctx.restore();

  // ---- the hero
  if (withHero && L > LT.drop[0]) {
    if (L < LT.land) smear(ctx, [hx, hy - face * 4], [hx, hy - face * 1.2], face * 0.5, INK, 0.5);
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
  const ring = seg(L, LT.land, LT.land + 0.4);
  if (ring > 0 && ring < 1) {
    ctx.save();
    ctx.translate(hx, floorY);
    ctx.scale(1, 0.25);
    shockRing(ctx, 0, 0, face * 2, ring, '#f6e9cc', face * 0.08);
    ctx.restore();
  }

  // ---- the Spark: circling the bulb, then dropping the hilt into his hand, then fleeing into the sunset
  if (on && withHero) {
    let sp: Pt = [bulb[0] + Math.cos(t * 2.2) * face * 1.1, bulb[1] + Math.sin(t * 2.2) * face * 0.5];

    if (L > LT.fly[0]) sp = [lerp(sp[0], w * 0.5, seg(L, LT.fly[0], LT.sunset[1])), lerp(sp[1], h * 0.2, seg(L, LT.fly[0], LT.sunset[1]))];
    drawSpark(ctx, sp[0], sp[1], face * 0.17);
  }

  // ---- every clash is a frame of negative
  for (const c of LT.clashes) {
    if (f.crossedFwd(f.B - L + c)) f.shake(face * 0.25);
    if (L >= c && L < c + 0.04) impactFrame(ctx, w, h, 1, 'invert');
    else if (L >= c + 0.04 && L < c + 0.07) impactFrame(ctx, w, h, 0.9, 'spikes', hx + face * 1.2, hy - face * 1.6, Math.round(c * 10));
  }

  // ---- the room melts into the painted sunset sky, and he falls back down through it (chapter V's broom catches him)
  const sky = ease.inOut2(seg(L, LT.sunset[0] + 0.3, LT.sunset[1] + 0.1));
  if (sky > 0) drawBg(ctx, 'bg_sunset', w, h, 0.25, sky, 1.12);
  if (withHero && L > LT.fly[1] + 0.2) {
    const u = seg(L, LT.fly[1] + 0.2, LT.end);
    const fy = lerp(-face * 3, h * 0.4, ease.out2(u));
    drawPose(ctx, 'fall_0', w * 0.5 + Math.sin(L * 5) * face * 0.3, fy, face, { rot: Math.sin(L * 7) * 0.15 });
  }
  void TAU;
}
