import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, hash, lerp, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { bladeOf, drawFig, drawPose, figHeight, figPoint, ib, meta } from './art';
import { drawBg, drawLayer } from './bg';
import { BLUE, RED_BLADE, bladeLight, drawBlade } from './saber';
import { drawSpark, faceOf } from './common';
import { impactFrame, letterbox, shockRing } from './fx';

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
  /** he lets go and flies up slashing; the cut; the belly splits and he bursts out into the sunset */
  slash: [6.95, 7.1] as const,
  cut: [7.1, 7.6] as const,
  tumble: [7.6, 8.0] as const,
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
  ctx.fillStyle = 'rgba(8,4,6,0.86)';
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
  // ---- the way out: the belly, frozen at the moment of the cut, splits along it; the sunset pours through
  if (!inner && L >= LT.cut[0]) {
    drawEscape(f, L);
    return;
  }
  const pivot: Pt = [w * 0.5, -h * 0.05];
  const rope = h * 0.4;
  const sw = swingOf(L);
  // (the bulb no longer sinks into a sunset: he cuts his way out of the whale)
  const sink = 0;
  const bulb: Pt = [pivot[0] + Math.sin(sw) * rope, lerp(pivot[1] + Math.cos(sw) * rope, h * 0.6, sink)];
  const floorY = h * 0.74;
  const on = L >= LT.click;
  if (f.crossedFwd(f.B - L + LT.click)) f.flash(0.35, '#fff1d6');

  // ---- the room: the inside of the whale, lit only by the bulb; its dark pool for a floor
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  if (on) {
    ctx.save();
    ctx.globalAlpha = ease.out2(seg(L, 0, 0.45));
    drawBg(ctx, 'bg_belly', w, h, 0.5, 1, 1.12);
    // only what the bulb reaches is seen
    ctx.globalCompositeOperation = 'multiply';
    const R = Math.max(w, h) * 0.9;
    const g = ctx.createRadialGradient(bulb[0], bulb[1], 0, bulb[0], bulb[1], R);
    g.addColorStop(0, '#fff3dc');
    g.addColorStop(0.3, '#d9b98c');
    g.addColorStop(0.65, '#4a3624');
    g.addColorStop(1, '#000000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // the bulb's warm light on the belly wall, so a shadow can fall on it
    ctx.globalCompositeOperation = 'screen';
    const g2 = ctx.createRadialGradient(bulb[0], bulb[1] + h * 0.15, 0, bulb[0], bulb[1] + h * 0.15, Math.max(w, h) * 0.55);
    g2.addColorStop(0, 'rgba(255,226,170,0.55)');
    g2.addColorStop(0.6, 'rgba(200,150,90,0.18)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, floorY);
    ctx.globalCompositeOperation = 'source-over';
    const fg = ctx.createLinearGradient(0, floorY, 0, h);
    fg.addColorStop(0, 'rgba(20,14,10,0.45)');
    fg.addColorStop(1, 'rgba(4,3,2,0.9)');
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
      // he lets go and flies straight up, blade first: the cut
      const u2 = ease.out2(seg(L, LT.slash[0], LT.cut[0]));
      pose = 'escape_0';
      hx = w * 0.5;
      hy = lerp(bulb[1] + face * 2.6, h * 0.42, u2);
      rot = 0;
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
    const shadowCol = mixC('#120a05', '#2a0a18', sink);
    ctx.save();
    ctx.globalAlpha = L < LT.land ? seg(L, LT.drop[0] + 0.2, LT.land) * 0.9 : 0.9;
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

  // ---- the whale's near ribs, in front of everything: they sway against the bulb's swing (depth)
  if (on) {
    const lit = ease.out2(seg(L, 0, 0.45));
    drawLayer(ctx, 'fg_belly', w, h, -Math.sin(sw) * w * 0.07, Math.cos(sw) * h * 0.01, lit * 0.96, 1.18);
  }

  // ---- every clash is a frame of negative
  for (const c of LT.clashes) {
    if (f.crossedFwd(f.B - L + c)) f.shake(face * 0.25);
    if (L >= c && L < c + 0.04) impactFrame(ctx, w, h, 1, 'invert');
    else if (L >= c + 0.04 && L < c + 0.07) impactFrame(ctx, w, h, 0.9, 'spikes', hx + face * 1.2, hy - face * 1.6, Math.round(c * 10));
  }

  // ---- the cut: a white line ripping up the whole height of the frame along his blade
  const cutK = seg(L, LT.slash[0] + 0.05, LT.cut[0]);
  if (cutK > 0) {
    ctx.save();
    ctx.fillStyle = '#fff8ec';
    const top = lerp(h, -h * 0.05, ease.in2(cutK));
    ctx.fillRect(w * 0.5 - face * 0.04, top, face * 0.08, h - top);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    drawSprite(ctx, glow('#bfe4ff', 64), w * 0.5, top, face * 1.6);
    ctx.restore();
  }
  void TAU;
}

/** the way out of the whale: the belly (frozen at the cut) splits along it, the sunset pours in, and he bursts out */
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
    // the belly as it was at the moment of the cut, without him (painted once: it is frozen)
    split.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLight({ ...f, ctx: split.ctx, crossedFwd: () => false, crossed: () => false, shake: () => {}, flash: () => {} }, LT.cut[0] - 0.001, false, true);
  }

  // behind it: the sunset
  drawBg(ctx, 'bg_sunset', w, h, 0.3, 1, 1.12);
  const k = ease.out3(seg(L, LT.cut[0], LT.cut[1]));
  const gap = k * w * 0.62;
  // the two halves of the whale, torn apart and falling away
  ctx.save();
  ctx.translate(-gap, k * h * 0.08);
  ctx.rotate(-k * 0.08);
  ctx.drawImage(split.c, 0, 0, W / 2, H, 0, 0, w / 2, h);
  ctx.restore();
  ctx.save();
  ctx.translate(gap, k * h * 0.08);
  ctx.rotate(k * 0.08);
  ctx.drawImage(split.c, W / 2, 0, W / 2, H, w / 2, 0, w / 2, h);
  ctx.restore();
  // the light pouring through the rip
  const pour = 1 - seg(L, LT.cut[0], LT.cut[0] + 0.3);
  if (pour > 0) {
    ctx.save();
    ctx.globalAlpha = pour;
    ctx.fillStyle = '#fff3dc';
    ctx.fillRect(w * 0.5 - gap - face * 0.1, 0, gap * 2 + face * 0.2, h);
    ctx.restore();
  }
  if (f.crossedFwd(f.B - L + LT.cut[0])) { f.shake(face * 0.5); f.flash(0.5, '#fff3dc'); }

  // him: bursting up through the gap, blade high; at the top, a happy tumble; then falling (chapter VII's broom)
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
  drawPose(ctx, pose, x, y, face, { rot });
  const bl = bladeOf(pose, x, y, face, { rot });
  if (bl) {
    bladeLight(ctx, bl[0], bl[1], BLUE, face * 3.5, 0.35);
    drawBlade(ctx, bl[0], bl[1], BLUE, face * 0.11, 1, t + 1);
  }
  // the Spark, out ahead in the sky
  drawSpark(ctx, w * 0.5 + Math.cos(t * 2) * face * 1.6, h * 0.12 + Math.sin(t * 3) * face * 0.3, face * 0.17);
}
