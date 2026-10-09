import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, lerp, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { drawArt, drawPose } from './art';
import { drawBg } from './bg';
import { INK, PAPER, drawPaper, drawSpark, drawSparkStreak, faceOf } from './common';
import { flash, shockRing, smear, speedWedges } from './fx';

/*
 * V · CHASE.
 *
 * He is falling through the painted sunset when the Spark streaks under
 * him — poof — and he is sitting on a broom with a wizard's hat on his
 * head. The chase: the Spark darts across the sky on two little wings and
 * he goes after it, banking through the clouds, round a loop-the-loop, into
 * a dive straight at the sea and up again at the last moment, skimming the
 * water; a last burst of speed, his hand stretched out — and the hand closes
 * round it. He leaps off the broom and flings his hat high into the sky;
 * the broom flies on without him, and he falls, the Spark in his fist, as
 * the sunset drains back into paper (chapter VI is home).
 */

export const CH = {
  catch: 0.55,
  take: [0.55, 1.2] as const,
  weave: [1.2, 2.4] as const,
  loop: [2.4, 3.3] as const,
  dive: [3.3, 4.0] as const,
  pull: [4.0, 4.35] as const,
  sprint: [4.35, 5.1] as const,
  hand: [5.1, 5.65] as const,
  close: 5.5,
  toss: [5.75, 6.45] as const,
  fall: [6.45, 8.0] as const,
  paper: [6.6, 7.6] as const,
  end: 8.0,
};

/** the clouds racing past: a few big dry-brush streaks, parallax by depth */
const CLOUDS: [number, number, number, number][] = [
  // [y fraction, length (w), speed, width (face)]
  [0.2, 0.7, 1.3, 0.14], [0.55, 1.0, 2.2, 0.2], [0.82, 0.9, 3.0, 0.26],
];

function drawClouds(ctx: CanvasRenderingContext2D, w: number, h: number, face: number, travel: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  CLOUDS.forEach(([fy, len, sp, wd], i) => {
    const span = w * (1 + len) * 1.2;
    const x = w - ((travel * sp * w * 0.35 + i * span * 0.37) % span);
    const y = fy * h;
    brush(ctx, [[x, y], [x + len * w * 0.5, y - face * 0.08], [x + len * w, y + face * 0.03]], { width: face * wd, color: 'rgba(40,16,20,0.45)', seed: 50 + i, dry: 0.8, press: 0.9, tail: 0.15, halo: 0 });
  });
  ctx.restore();
}

/** the Spark with two little wings, beating */
function drawWingedSpark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  const flap = Math.sin(t * 40) * 0.6;
  ctx.save();
  ctx.fillStyle = 'rgba(255,248,236,0.9)';
  ctx.strokeStyle = 'rgba(60,40,30,0.5)';
  ctx.lineWidth = 1;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(x + s * r * 0.8, y - r * 0.2);
    ctx.rotate(s * (0.5 + flap));
    ctx.beginPath();
    ctx.ellipse(s * r * 1.1, 0, r * 1.25, r * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  drawSpark(ctx, x, y, r);
}

/** the broom flying on alone: a handle and a twig tail */
function drawBroom(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = '#3a2618';
  ctx.lineCap = 'round';
  ctx.lineWidth = len * 0.05;
  ctx.beginPath();
  ctx.moveTo(len * 0.5, 0);
  ctx.lineTo(-len * 0.3, 0);
  ctx.stroke();
  brush(ctx, [[-len * 0.28, 0], [-len * 0.4, len * 0.02], [-len * 0.55, len * 0.03]], { width: len * 0.16, color: '#2a1c12', seed: 7, dry: 0.75, press: 0.8, tail: 1.6, halo: 0 });
  ctx.restore();
}

export function drawChase(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const face = faceOf(f);

  // ---- the sky: the painted sunset, drifting as they fly; the clouds race past
  const travel = L;
  ctx.fillStyle = '#2a0c14';
  ctx.fillRect(0, 0, w, h);
  const dive = ease.inOut2(seg(L, CH.dive[0], CH.pull[1]));
  drawBg(ctx, 'bg_sunset', w, h, lerp(0.25, 0.85, dive) - seg(L, CH.sprint[0], CH.toss[1]) * 0.2, 1, 1.18);
  drawClouds(ctx, w, h, face, travel, 1 - seg(L, CH.hand[0], CH.hand[0] + 0.2) + seg(L, CH.toss[0], CH.toss[1]) * 0.6);

  // ---- where he is and how he sits
  let x = w * 0.5, y = h * 0.4, pose = 'fall_0', rot = 0, onBroom = false;
  const path: [number, number, number][] = [
    [CH.take[0], 0.5, 0.42], [CH.take[1], 0.32, 0.5], [1.6, 0.6, 0.36], [2.0, 0.35, 0.6], [CH.weave[1], 0.5, 0.62],
  ];
  if (L < CH.catch) {
    y = lerp(h * 0.4, h * 0.46, seg(L, 0, CH.catch));
    rot = Math.sin(L * 7) * 0.15;
  } else if (L < CH.weave[1]) {
    onBroom = true;
    let i = 0;
    while (i < path.length - 2 && L > path[i + 1][0]) i++;
    const a = path[i], b = path[i + 1];
    const k = ease.inOut2(clamp((L - a[0]) / (b[0] - a[0])));
    x = lerp(a[1], b[1], k) * w;
    y = lerp(a[2], b[2], k) * h;
    const vy = (b[2] - a[2]) * Math.sin(k * Math.PI);
    pose = L < CH.take[0] + 0.25 ? 'broom_0' : Math.abs(vy) > 0.08 ? 'broom_2' : 'broom_1';
    rot = vy * 1.5;
  } else if (L < CH.loop[1]) {
    // one loop-the-loop: the broom follows the circle, nose along the tangent
    onBroom = true;
    const u = ease.inOut2(seg(L, CH.loop[0], CH.loop[1]));
    const th = Math.PI / 2 - u * TAU;
    const R = h * 0.17;
    x = w * 0.5 + Math.cos(th) * R * 0.9;
    y = h * 0.45 - Math.sin(th) * R + R;
    x = lerp(w * 0.5, x, 1) ;
    pose = 'broom_1';
    rot = -u * TAU;
  } else if (L < CH.pull[0]) {
    onBroom = true;
    const u = ease.in2(seg(L, CH.dive[0], CH.dive[1]));
    pose = 'broom_3';
    x = lerp(w * 0.5, w * 0.55, u);
    y = lerp(h * 0.62, h * 0.7, u);
  } else if (L < CH.pull[1]) {
    onBroom = true;
    const u = ease.out2(seg(L, CH.pull[0], CH.pull[1]));
    pose = 'broom_1';
    rot = lerp(0.9, -0.15, u);
    x = lerp(w * 0.55, w * 0.42, u);
    y = lerp(h * 0.72, h * 0.66, u);
    if (f.crossedFwd(f.B - L + CH.pull[0] + 0.1)) f.shake(face * 0.2);
  } else if (L < CH.hand[0]) {
    onBroom = true;
    const u = seg(L, CH.sprint[0], CH.sprint[1]);
    pose = u < 0.55 ? 'broom_1' : 'broom_5';
    x = lerp(w * 0.32, w * 0.42, u);
    y = lerp(h * 0.62, h * 0.48, ease.inOut2(u));
  }
  // the toss: off the broom, the hat flung high
  const tossU = seg(L, CH.toss[0], CH.toss[1]);
  if (L > CH.toss[0]) {
    // the frame where the hat leaves his hand (the drawing has the hat and the dropped broom in it), then he's free of both
    pose = tossU < 0.3 ? 'hat_1' : 'leap_3';
    x = w * 0.45;
    y = lerp(h * 0.58, h * 0.52, ease.out2(tossU));
  }
  if (L > CH.fall[0]) {
    const u = seg(L, CH.fall[0], CH.end);
    pose = 'leap_3';
    x = w * 0.45;
    y = lerp(h * 0.52, h * 1.35, ease.in2(u));
  }

  // speed: wedges and a smear behind the broom
  const fast = onBroom && L > CH.take[0] + 0.3 ? (L > CH.dive[0] && L < CH.pull[1] || L > CH.sprint[0] ? 1 : 0.5) : 0;
  if (fast > 0 && L < CH.hand[0]) {
    speedWedges(ctx, w, h, x, y - face * 1.2, 0.55 * fast, t, 'rgba(255,236,210,0.5)', 7);
    smear(ctx, [x - Math.cos(rot) * face * 3, y - face * 0.9 - Math.sin(rot) * face * 3], [x - face * 0.6, y - face * 0.9], face * 0.6, '#2a0c14', 0.25);
  }
  // the dive's splash: a long streak cut in the water as he pulls up
  const sk = seg(L, CH.pull[0], CH.pull[1] + 0.3);
  if (sk > 0 && sk < 1) {
    ctx.save();
    ctx.translate(w * 0.5, h * 0.74);
    ctx.scale(1, 0.18);
    shockRing(ctx, 0, 0, face * 3.5, sk, 'rgba(255,240,220,0.9)', face * 0.15);
    ctx.restore();
  }

  // the poof as the broom and hat appear under him
  const pf = seg(L, CH.catch - 0.06, CH.catch + 0.3);
  if (pf > 0 && pf < 1) {
    shockRing(ctx, x, y - face * 1.2, face * 2.6, pf, '#fff1dc', face * 0.12);
    if (pf < 0.25) flash(ctx, w, h, 0.5 * (1 - pf * 4), '#fff1dc');
  }
  if (L < CH.hand[0] + 0.05) drawPose(ctx, pose, x, y, face, { rot });
  else if (L > CH.toss[0]) drawPose(ctx, pose, x, y, face, { rot });

  // ---- the hat, flung up into the sky; the broom flying off without him
  if (tossU >= 0.3) {
    const u = seg(L, CH.toss[0] + (CH.toss[1] - CH.toss[0]) * 0.3, CH.toss[1] + 1.0);
    const hx = lerp(x + face * 1.5, w * 0.72, u), hy = lerp(y - face * 4.2, -face * 2, ease.out2(u));
    drawArt(ctx, 'hat_2', hx, hy, face * lerp(1.9, 0.9, u), { rot: u * 7 });
    const v = seg(L, CH.toss[0] + (CH.toss[1] - CH.toss[0]) * 0.3, CH.toss[1] + 0.5);
    drawBroom(ctx, lerp(x - face * 0.2, -w * 0.4, ease.in2(v)), lerp(y - face * 0.2, y + face * 1.5, v), face * 3.2, 0.35);
  }

  // ---- the Spark: darting ahead on its wings
  if (L > CH.catch - 0.4 && L < CH.hand[0]) {
    let sp: Pt = [x + face * 2.8 + Math.sin(t * 3.1) * face * 0.5, y - face * 1.8 + Math.sin(t * 4.3) * face * 0.6];
    if (L < CH.catch) sp = [lerp(w * 1.2, x + face * 0.4, seg(L, CH.catch - 0.4, CH.catch)), y + face * 0.2];
    if (L > CH.sprint[0]) {
      const u = seg(L, CH.sprint[0], CH.sprint[1]);
      sp = [lerp(sp[0], x + face * 1.9, u), lerp(sp[1], y - face * 1.9, u)];
    }
    drawSparkStreak(ctx, [sp[0] + face * 0.9, sp[1] + face * 0.1], sp, face * 0.17, 0.5);
    drawWingedSpark(ctx, sp[0], sp[1], face * 0.17, t);
  }

  // ---- the catch: his hand fills the screen and closes round it
  const hk = seg(L, CH.hand[0], CH.hand[1]);
  if (hk > 0 && hk < 1.0001 && L < CH.toss[0]) {
    const grow = ease.out3(clamp(hk * 1.6));
    const hw = lerp(w * 0.3, w * 0.95, grow);
    const closed = L > CH.close;
    if (!closed) drawWingedSpark(ctx, w * 0.5, h * 0.42, lerp(face * 0.17, face * 0.6, grow), t);
    drawArt(ctx, closed ? 'closeup_2' : 'closeup_1', w * 0.5, h * 0.48, closed ? hw * 0.72 : hw);
    if (closed) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * seg(L, CH.close, CH.close + 0.12);
      drawSprite(ctx, glow('#ff7a50', 128), w * 0.5, h * 0.44, w * 0.6);
      ctx.restore();
      if (f.crossedFwd(f.B - L + CH.close)) f.shake(face * 0.3);
    }
  }

  // ---- the sunset drains back into paper as he falls home
  const pk = ease.inOut2(seg(L, CH.paper[0], CH.paper[1]));
  if (pk > 0) {
    ctx.save();
    ctx.globalAlpha = pk;
    drawPaper(ctx, w, h);
    ctx.restore();
    if (L > CH.fall[0]) drawPose(ctx, pose, x, y, face, { rot, alpha: pk });
  }
  void INK;
  void PAPER;
}
