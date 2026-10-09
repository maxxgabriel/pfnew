import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { type Pt, clamp, ease, lerp, seg } from '../core/math';
import { paperTile } from '../core/sprites';
import { drawPose } from './art';
import { drawBg } from './bg';
import { INK, PAPER, drawSpark, drawSparkStreak } from './common';
import { smear } from './fx';
import { stage, stageAhead } from './still';

/*
 * II · RUN.
 *
 * One unbroken shot from the end of chapter I. He has never walked: one foot
 * up, a wobble, arms windmilling, his balance — a proud first step. Then a
 * walk, then a run, faster and faster after the Spark, and the brush lays
 * the line under him just ahead of his feet, so the ground only exists
 * where he is about to step. The line breaks over a gap: a cartwheel into a
 * backflip carries him across. Then the camera pulls back and the page is
 * a page — a sheet floating in empty space — and the Spark dives off its
 * edge. He runs straight off after it: legs still going over nothing, a
 * look down, a look at you, a gulp — and he falls (chapter III).
 *
 * The cycles are driven by the distance he covers, so his feet never slide.
 */

export const RN = {
  steps: [0, 1.6] as const,
  walk: [1.6, 3.4] as const,
  run: [3.75, 6.0] as const,
  flip: [6.0, 6.75] as const,
  land: [6.75, 7.0] as const,
  pull: [7.2, 8.0] as const,
  edge: 8.0,
  look: 8.3,
  gulp: 8.55,
  drop: 8.8,
  back: [8.4, 9.0] as const,
  end: 9.0,
};

/** where he is along the page at local beat L (world px; he starts where chapter I left him) */
function xAt(L: number, f: Frame) {
  const { face, gx } = stage(f);
  const keys: [number, number][] = [
    [0, 0], [1.6, 1.4], [3.4, 4.6], [3.75, 5.6], [6.0, 15.8], [6.75, 18.6], [7.0, 19.4], [8.0, 24.4], [8.3, 25.2], [9.0, 25.4],
  ];
  let v = keys[keys.length - 1][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, x0] = keys[i], [b, x1] = keys[i + 1];
    if (L <= b) {
      let k = clamp((L - a) / (b - a));
      if (i === 0) k = ease.inOut2(k);
      if (i === keys.length - 2) k = ease.out3(k);
      v = lerp(x0, x1, k);
      break;
    }
  }
  return gx + v * face;
}

let tile: HTMLCanvasElement | null = null;

export function drawRun(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const { face, gx, gy, r } = stage(f);
  const X = xAt(L, f);
  const edgeX = xAt(RN.edge, f) + face * 0.25;
  const gap: [number, number] = [xAt(RN.flip[0], f) + face * 0.9, xAt(RN.flip[1], f) - face * 0.6];

  // ---- the camera: follow him; pull back to show the page; push in again as he drops
  const kB = ease.inOut2(seg(L, RN.pull[0], RN.pull[1]));
  const kC = ease.inOut2(seg(L, RN.back[0], RN.back[1]));
  let fy = gy;
  if (L > RN.drop) fy = gy + ease.in2(seg(L, RN.drop, RN.end)) * face * 3;
  const A = { w: [X, gy] as Pt, s: [Math.min(X, gx), gy] as Pt, z: 1 };
  const Bc = { w: [X, gy - face * 1.4] as Pt, s: [w * 0.42, h * 0.56] as Pt, z: 0.5 };
  const C = { w: [X, fy] as Pt, s: [w * 0.5, h * 0.38] as Pt, z: 1 };
  const mixP = (a: Pt, b: Pt, k: number): Pt => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  let fw = mixP(A.w, Bc.w, kB), fs = mixP(A.s, Bc.s, kB), z = lerp(A.z, Bc.z, kB);
  fw = mixP(fw, C.w, kC); fs = mixP(fs, C.s, kC); z = lerp(z, C.z, kC);
  const toS = (p: Pt): Pt => [fs[0] + (p[0] - fw[0]) * z, fs[1] + (p[1] - fw[1]) * z];

  // ---- the void beyond the page, then the page itself
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  if (kB > 0 || kC > 0) {
    // the void: the ink-streaked painting, dimmed so the page reads as a bright sheet in it
    const k = Math.max(kB, kC);
    drawBg(ctx, 'bg_void', w, h, 0.2 + kC * 0.1, k, 1.1);
    ctx.fillStyle = `rgba(28,22,18,${0.55 * k * (1 - kC * 0.6)})`;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.save();
  ctx.translate(fs[0], fs[1]);
  ctx.scale(z, z);
  ctx.translate(-fw[0], -fw[1]);
  const top = gy - h * 0.74, bot = gy + h * 0.42, left = -w * 3;
  // the page's shadow on the void, and the page
  ctx.fillStyle = 'rgba(8,5,3,0.35)';
  ctx.fillRect(left + face * 0.5, top + face * 0.5, edgeX - left, bot - top);
  if (!tile) tile = paperTile(512, PAPER);
  ctx.fillStyle = PAPER;
  ctx.fillRect(left, top, edgeX - left, bot - top);
  const pat = ctx.createPattern(tile, 'repeat');
  if (pat) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = pat;
    ctx.fillRect(left, top, edgeX - left, bot - top);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = 'rgba(27,23,20,0.25)';
  ctx.lineWidth = 1.5 / z;
  ctx.strokeRect(left, top, edgeX - left, bot - top);

  // ---- the line he runs on: laid by the brush just ahead of his feet (and broken over the gap)
  const lead = L < 7.0 ? X + face * 1.9 : lerp(X + face * 1.9, edgeX, ease.inOut2(seg(L, 7.0, 7.7)));
  const reach = Math.min(edgeX, lead);
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, reach - left, bot - top);
  ctx.clip();
  const segW = face * 6;
  const s0 = Math.floor((X - w * 1.5 / z) / segW), s1 = Math.ceil(reach / segW);
  for (let i = s0; i <= s1; i++) {
    const x0 = i * segW, x1 = x0 + segW + face * 0.2;
    if (x1 < gap[0] || x0 > gap[1]) brush(ctx, [[x0, gy + face * 0.05 + 1], [x0 + segW * 0.5, gy + face * 0.05 + ((i * 7) % 3) - 1], [x1, gy + face * 0.05]], { width: face * 0.07, color: INK, seed: 30 + (i & 7), dry: 0.5, press: 1.1, tail: 0.6, halo: 0 });
    else {
      // the two lips of the gap
      if (x0 < gap[0]) brush(ctx, [[x0, gy + face * 0.05], [gap[0], gy + face * 0.06]], { width: face * 0.07, color: INK, seed: 40, dry: 0.5, press: 1.1, tail: 0.2, halo: 0 });
      if (x1 > gap[1]) brush(ctx, [[gap[1], gy + face * 0.06], [x1, gy + face * 0.05]], { width: face * 0.07, color: INK, seed: 41, dry: 0.5, press: 1.4, tail: 0.6, halo: 0 });
    }
  }
  ctx.restore();
  // the brush laying it
  if (reach < edgeX - 1 && L > RN.walk[0] - 0.3) {
    const bx = reach, by = gy + face * 0.05;
    ctx.save();
    ctx.strokeStyle = '#8a6a44';
    ctx.lineCap = 'round';
    ctx.lineWidth = face * 0.09;
    ctx.beginPath();
    ctx.moveTo(bx + face * 0.7, by - face * 1.5);
    ctx.lineTo(bx + face * 0.1, by - face * 0.2);
    ctx.stroke();
    brush(ctx, [[bx + face * 0.1, by - face * 0.2], [bx + face * 0.03, by - face * 0.08], [bx, by]], { width: face * 0.14, color: INK, seed: 4, dry: 0.2, press: 1.1, tail: 0.05, halo: 0 });
    ctx.restore();
  }

  // ---- him
  let pose = 'firststep_1', y = gy, rot = 0;
  if (L < RN.steps[1]) {
    const u = L / RN.steps[1];
    pose = u < 0.3 ? 'firststep_1' : u < 0.62 ? 'firststep_2' : 'firststep_3';
    if (pose === 'firststep_2') rot = Math.sin(t * 9) * 0.06;
  } else if (L < RN.run[0]) {
    // a walk, its feet locked to the ground it covers
    const d = X - xAt(RN.steps[1], f);
    pose = `walk8_${Math.floor(d / (face * 2.6) * 8) % 8}`;
    if (L > RN.walk[1]) pose = `run8_${Math.floor(d / (face * 3.4) * 8) % 8}`;
  } else if (L < RN.flip[0]) {
    const d = X - xAt(RN.run[0], f);
    pose = `run8_${Math.floor(d / (face * 4.2) * 8) % 8}`;
  } else if (L < RN.flip[1]) {
    // a cartwheel into a tucked backflip, one continuous turn over the gap
    const u = seg(L, RN.flip[0], RN.flip[1]);
    pose = u < 0.45 ? 'acro_1' : 'acro_2';
    rot = ease.inOut2(u) * Math.PI * 2 - (u < 0.45 ? 0 : Math.PI);
    y = gy - Math.sin(u * Math.PI) * face * 2.2;
  } else if (L < RN.land[1]) {
    pose = 'acro_3';
  } else if (L < RN.edge) {
    const d = X - xAt(RN.land[1], f);
    pose = `run8_${Math.floor(d / (face * 4.2) * 8) % 8}`;
  } else if (L < RN.look) {
    // over the edge and still running on nothing
    pose = 'runoff_0';
    rot = Math.sin(t * 30) * 0.03;
  } else if (L < RN.gulp) pose = 'runoff_1';
  else if (L < RN.drop) pose = 'runoff_2';
  else { pose = 'runoff_3'; y = fy; }
  if (L > RN.run[0] && L < RN.flip[0] || L > RN.land[1] && L < RN.edge) smear(ctx, [X - face * 2.4, gy - face * 1.3], [X - face * 0.4, gy - face * 1.3], face * 0.5, INK, 0.12);
  drawPose(ctx, pose, X, y, face, { rot });

  // ---- the Spark: hopping ahead along the line, then diving off the edge of the page
  const ahead0 = stageAhead(f);
  let sx = Math.max(ahead0, X + face * 2.6);
  const hopPh = (sx - ahead0) / (face * 2.2);
  let sy = gy - r - Math.abs(Math.sin(hopPh * Math.PI + (L < 0.3 ? t * 4 : 0))) * face * 0.6;
  let prev: Pt | null = null;
  const dive = seg(L, 7.5, 8.3);
  if (dive > 0) {
    sx = lerp(sx, edgeX + face * 2.5, ease.inOut2(dive));
    sy = lerp(sy, gy + face * 9, ease.in3(dive));
    prev = [sx - face * 0.6, sy - face * 1.4 * dive];
  }
  if (prev) drawSparkStreak(ctx, prev, [sx, sy], r);
  if (dive < 1) drawSpark(ctx, sx, sy, r);
  ctx.restore();
  void toS;
}
