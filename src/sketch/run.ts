import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, hash, lerp, seg } from '../core/math';
import { paperTile } from '../core/sprites';
import { artSize, drawArtFoot, drawFig, figHeight, hasPose, meta, poseHeight, poseScale, drawPose } from './art';
import { drawBg } from './bg';
import { INK, PAPER, drawSpark, drawSparkStreak, idlePose } from './common';
import { dryStreak } from './fx';
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
  back: [8.05, 8.6] as const,
  end: 9.0,
  /** the Eraser: slams down behind him, chases, lunges, hops the gap, skids at the edge */
  eraser: 3.35,
  spot: [3.45, 3.75] as const,
  glance: [4.75, 5.0] as const,
  lunge: [5.5, 5.8] as const,
  hopGap: [6.45, 7.05] as const,
  skid: [7.95, 8.2] as const,
  /** mid-sprint he runs through five other art styles and snaps back to ink */
  styles: [4.0, 4.7] as const,
  /** the runoff gag in 1930s rubber hose, then an iris closes on him as he drops */
  hose: [8.0, 8.9] as const,
  iris: [8.6, 8.95] as const,
};

/** the pop-up cut-outs along the page: [distance from the start in faces, drawing, height in faces] */
const POPS: [number, string, number][] = [
  [7.2, 'popup_0', 3.4], [9.6, 'popup_2', 2.4], [12.2, 'popup_1', 3.8], [14.4, 'popup_4', 3.0], [21.0, 'popup_3', 2.2], [23.0, 'popup_5', 3.2],
];

/** the Eraser's distance behind him, in faces (it closes in, lunges, falls back at the gap, catches up, stops at the edge) */
function eraserGap(L: number) {
  const keys: [number, number][] = [[RN.eraser, 2.5], [RN.spot[1], 2.7], [4.6, 3.1], [5.4, 1.9], [5.65, 1.0], [6.0, 2.6], [6.45, 3.4], [7.05, 3.2], [7.9, 2.8]];
  if (L <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (L <= keys[i + 1][0]) return lerp(keys[i][1], keys[i + 1][1], ease.inOut2(seg(L, keys[i][0], keys[i + 1][0])));
  }
  return keys[keys.length - 1][1];
}

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

/** the 1930s look for the rubber-hose gag: black and white, warm, flickering, one scratch, a dark edge */
function oldFilm(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, t: number) {
  if (k <= 0) return;
  const fr = Math.floor(t * 12);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#e9e1cf';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  // the projector's flicker
  ctx.globalAlpha = k * (0.03 + hash(fr) * 0.07);
  ctx.fillStyle = hash(fr + 3) > 0.5 ? '#fff' : '#000';
  ctx.fillRect(0, 0, w, h);
  // one scratch down the film
  ctx.globalAlpha = k * 0.35;
  ctx.strokeStyle = hash(fr + 9) > 0.5 ? '#f4efe4' : '#1b1714';
  ctx.lineWidth = 1;
  const sx = hash(fr * 7) * w;
  ctx.beginPath();
  ctx.moveTo(sx, 0);
  ctx.lineTo(sx + (hash(fr * 3) - 0.5) * 12, h);
  ctx.stroke();
  // a dark edge, like an old lens
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.globalAlpha = k;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** the iris of an old cartoon closing on a point: black everywhere but a circle */
function iris(ctx: CanvasRenderingContext2D, w: number, h: number, c: Pt, r: number) {
  ctx.save();
  ctx.fillStyle = '#0b0908';
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(c[0], c[1], Math.max(0.5, r), 0, TAU, true);
  ctx.fill('evenodd');
  ctx.restore();
}

export function drawRun(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const { face, gx, gy, r } = stage(f);
  const X = xAt(L, f);
  const edgeX = xAt(RN.edge, f) + face * 0.25;
  const gap: [number, number] = [xAt(RN.flip[0], f) + face * 0.9, xAt(RN.flip[1], f) - face * 0.6];
  const hoseK = L >= RN.hose[0] && L < RN.hose[1] ? 1 : 0;
  if (f.crossedFwd(f.B - L + RN.hose[0])) f.shake(face * 0.15);

  // ---- the Eraser: where it is, how it moves
  const eraserOn = L >= RN.eraser - 0.15;
  const drop = ease.in3(seg(L, RN.eraser - 0.15, RN.eraser));
  let EX = Math.min(X - eraserGap(L) * face, edgeX - face * 1.1);
  const EH = face * 3.4;
  if (f.crossedFwd(f.B - L + RN.eraser)) f.shake(face * 0.35);

  // ---- the camera: follow him (further forward on the screen while he's chased); pull back; push in as he drops
  const kB = ease.inOut2(seg(L, RN.pull[0], RN.pull[1]));
  const kC = ease.inOut2(seg(L, RN.back[0], RN.back[1]));
  const chaseK = ease.inOut2(seg(L, RN.eraser - 0.25, RN.eraser + 0.05)) * (1 - kB);
  let fy = gy;
  if (L > RN.drop) fy = gy + ease.in2(seg(L, RN.drop, RN.end)) * face * 3;
  const A = { w: [X, gy] as Pt, s: [lerp(Math.min(X, gx), w * 0.68, chaseK), gy] as Pt, z: 1 };
  const Bc = { w: [X, gy - face * 1.4] as Pt, s: [w * 0.42, h * 0.56] as Pt, z: 0.5 };
  const C = { w: [X, fy] as Pt, s: [w * 0.5, h * 0.38] as Pt, z: 1 };
  const mixP = (a: Pt, b: Pt, k: number): Pt => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  let fw = mixP(A.w, Bc.w, kB), fs = mixP(A.s, Bc.s, kB), z = lerp(A.z, Bc.z, kB);
  fw = mixP(fw, C.w, kC); fs = mixP(fs, C.s, kC); z = lerp(z, C.z, kC);
  const toS = (p: Pt): Pt => [fs[0] + (p[0] - fw[0]) * z, fs[1] + (p[1] - fw[1]) * z];

  // the old film judders
  ctx.save();
  if (hoseK) ctx.translate((hash(Math.floor(t * 12)) - 0.5) * 3, (hash(Math.floor(t * 12) + 5) - 0.5) * 3);

  // ---- the void beyond the page, then the page itself
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  if (kB > 0 || kC > 0) {
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

  // ---- what the Eraser has rubbed out: everything behind it (a grey smudge where the line was)
  const rubbed = eraserOn ? EX - face * 0.2 : left;
  if (eraserOn) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    brush(ctx, [[rubbed - face * 7, gy + face * 0.06], [rubbed - face * 3, gy + face * 0.02], [rubbed, gy + face * 0.05]], { width: face * 0.5, color: '#8a8378', seed: 61, dry: 0.85, press: 0.6, tail: 1.4, halo: 0 });
    ctx.restore();
  }

  // ---- the line he runs on: laid by the brush just ahead of his feet (and broken over the gap)
  const lead = L < 7.0 ? X + face * 1.9 : lerp(X + face * 1.9, edgeX, ease.inOut2(seg(L, 7.0, 7.7)));
  const reach = Math.min(edgeX, lead);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rubbed, top, reach - rubbed, bot - top);
  ctx.clip();
  const segW = face * 6;
  const s0 = Math.floor((Math.max(rubbed, X - w * 1.5 / z)) / segW), s1 = Math.ceil(reach / segW);
  for (let i = s0; i <= s1; i++) {
    const x0 = i * segW, x1 = x0 + segW + face * 0.2;
    if (x1 < gap[0] || x0 > gap[1]) brush(ctx, [[x0, gy + face * 0.05 + 1], [x0 + segW * 0.5, gy + face * 0.05 + ((i * 7) % 3) - 1], [x1, gy + face * 0.05]], { width: face * 0.07, color: INK, seed: 30 + (i & 7), dry: 0.5, press: 1.1, tail: 0.6, halo: 0 });
    else {
      if (x0 < gap[0]) brush(ctx, [[x0, gy + face * 0.05], [gap[0], gy + face * 0.06]], { width: face * 0.07, color: INK, seed: 40, dry: 0.5, press: 1.1, tail: 0.2, halo: 0 });
      if (x1 > gap[1]) brush(ctx, [[gap[1], gy + face * 0.06], [x1, gy + face * 0.05]], { width: face * 0.07, color: INK, seed: 41, dry: 0.5, press: 1.4, tail: 0.6, halo: 0 });
    }
  }
  ctx.restore();

  // ---- the pop-up page: cut-outs spring up ahead of him and get rubbed out behind
  for (const [d, k, ht] of POPS) {
    const px = gx + d * face;
    if (px < rubbed - face || px > X + face * 7) continue;
    const up = ease.outBack(clamp((X + face * 5 - px) / (face * 2.2)), 2.2);
    if (up <= 0) continue;
    const [aw, ah] = artSize(k);
    const pw = (ht * face) * (aw / ah);
    // behind the Eraser it is being scrubbed flat
    const gone = clamp((rubbed - (px - pw * 0.5)) / pw);
    if (gone >= 1) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rubbed, top, edgeX - rubbed, bot - top);
    ctx.clip();
    ctx.translate(px, gy + face * 0.06);
    ctx.scale(1, up * (1 - gone * 0.3));
    // its fold tab's shadow on the page
    ctx.fillStyle = 'rgba(40,30,20,0.12)';
    ctx.fillRect(-pw * 0.5, 0, pw, face * 0.08);
    drawArtFoot(ctx, k, 0, 0, pw);
    ctx.restore();
  }

  // ---- him: the cycle follows the distance he covers; how fast you scroll is how fast he goes
  const vB = f.vB;
  const back = vB < -0.25;
  const fast = vB > 2.2;
  const runCycle = (from: number, len: number) => {
    const d = X - xAt(from, f);
    if (back) return `moonwalk6_${(((Math.floor(-d / (face * 2.0) * 6)) % 6) + 6) % 6}`;
    if (fast) return `sprint8_${((Math.floor(d / (face * 4.6) * 8) % 8) + 8) % 8}`;
    return `run8_${((Math.floor(d / (face * len) * 8) % 8) + 8) % 8}`;
  };
  let pose = 'firststep_1', y = gy, rot = 0;
  if (L < RN.steps[1]) {
    const u = L / RN.steps[1];
    pose = u < 0.3 ? 'firststep_1' : u < 0.62 ? 'firststep_2' : 'firststep_3';
    if (pose === 'firststep_2') rot = Math.sin(t * 9) * 0.06;
  } else if (L < RN.run[0]) {
    const d = X - xAt(RN.steps[1], f);
    pose = back ? runCycle(RN.steps[1], 2.6) : `walk8_${((Math.floor(d / (face * 2.6) * 8) % 8) + 8) % 8}`;
    if (L > RN.walk[1] && !back) pose = runCycle(RN.steps[1], 3.4);
    // the Eraser slams down behind him: he looks back, wide-eyed
    if (L > RN.spot[0]) pose = 'chase_0';
  } else if (L < RN.flip[0]) {
    pose = runCycle(RN.run[0], 4.2);
    if (L > RN.glance[0] && L < RN.glance[1] && !back) pose = 'chase_0';
    // it lunges; he dives
    if (L > RN.lunge[0] && L < RN.lunge[1]) {
      const u = seg(L, RN.lunge[0], RN.lunge[1]);
      pose = 'chase_1';
      y = gy - Math.sin(u * Math.PI) * face * 0.5;
    }
  } else if (L < RN.flip[1]) {
    // the rotoscope beat: a butterfly twist over the gap in eight fluid, film-traced drawings
    const u = seg(L, RN.flip[0], RN.flip[1]);
    pose = `roto_${Math.min(7, Math.floor(u * 8))}`;
    y = gy - Math.sin(u * Math.PI) * face * 1.3;
  } else if (L < RN.land[1]) {
    pose = 'roto_7';
  } else if (L < RN.edge) {
    pose = runCycle(RN.land[1], 4.2);
  } else if (L < RN.look) pose = 'rubberhose_0';
  else if (L < RN.gulp) pose = 'rubberhose_1';
  else if (L < RN.drop) pose = 'rubberhose_2';
  else { pose = 'rubberhose_3'; y = fy; }
  if (L >= RN.hose[1] && L > RN.drop) pose = 'runoff_3';
  // stop scrolling on the open page (before the Eraser comes) and he passes the time
  const idle = L > 0.3 && L < RN.eraser - 0.3 ? idlePose(f) : null;
  if (idle) { pose = idle; rot = 0; y = gy; }
  if (!back && (L > RN.run[0] && L < RN.flip[0] || L > RN.land[1] && L < RN.edge)) dryStreak(ctx, [X - face * 0.6, gy - face * 1.25], [X - face * (fast ? 3.8 : 2.8), gy - face * 1.2], face * 0.3, INK, fast ? 0.35 : 0.22, 5);
  // ---- the style shift: for a moment he runs as pixel art, watercolour, clay, chalk, a comic — then snaps back to ink
  const STY = ['style_pixel', 'style_water', 'style_clay', 'style_chalk', 'style_comic'].filter((k) => hasPose(`${k}_0`));
  const sk = seg(L, RN.styles[0], RN.styles[1]);
  if (sk > 0 && sk < 1 && STY.length && !back) {
    const n = STY.length;
    const i = Math.min(n - 1, Math.floor(sk * n));
    const d = X - xAt(RN.run[0], f);
    const k = `${STY[i]}_${((Math.floor(d / (face * 4.2) * 6) % 6) + 6) % 6}`;
    const sc = poseHeight(pose, face) / figHeight(k);
    // chalk is white: for its moment the whole page is a blackboard
    if (STY[i] === 'style_chalk') {
      ctx.save();
      ctx.fillStyle = '#23302b';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(235,240,232,0.55)';
      ctx.lineWidth = Math.max(1.5, face * 0.04);
      ctx.beginPath();
      ctx.moveTo(0, y + face * 0.06);
      ctx.lineTo(w, y + face * 0.04);
      ctx.stroke();
      ctx.restore();
    }
    // a glitch where one style hands over to the next: the figure sliced into bands that jump sideways
    const edge = Math.abs(sk * n - Math.round(sk * n));
    const glitch = edge < 0.12 ? 1 - edge / 0.12 : 0;
    const top = y - figHeight(k) * sc * 1.05, bandH = (y - top) / 3;
    for (let b = 0; b < 3; b++) {
      const jx = glitch * face * 0.5 * Math.sin(b * 2.7 + Math.floor(t * 24));
      ctx.save();
      ctx.beginPath();
      ctx.rect(X - face * 4, top + b * bandH, face * 8, bandH + 1);
      ctx.clip();
      drawFig(ctx, k, X + jx, y, sc);
      ctx.restore();
    }
    if (glitch > 0.6) {
      ctx.save();
      ctx.globalAlpha = (glitch - 0.6) * 0.5;
      ctx.fillStyle = ['#ff2e63', '#2bd4ff', '#ffd23a', '#7a5cff', '#2bff88'][i % 5];
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  } else if (pose.startsWith('roto_')) {
    // the traced frames carry their own rise and fall: anchor them all on the sheet's shared ground line
    drawFig(ctx, pose, X, y, poseScale('roto_0', face), { anchor: [meta(pose)?.foot[0] ?? 0, 208] });
  } else drawPose(ctx, pose, X, y, face, { rot });

  // ---- the Eraser
  if (eraserOn) {
    let k = 'eraser_0', ey = gy + face * 0.06, er = 0, sq = 1;
    // it scrubs along: a rocking, rubbing gait
    const step = Math.floor(t * 8);
    if (L > RN.spot[1]) { k = step % 2 ? 'eraser_3' : 'eraser_0'; er = (step % 2 ? 0.08 : -0.04); }
    // down out of the sky
    if (L < RN.eraser) { ey = lerp(gy - h * 0.9, ey, drop); sq = 1.15; }
    else if (L < RN.eraser + 0.15) { k = 'eraser_1'; }
    // the lunge, the hop over the gap, the skid at the edge
    if (L > RN.lunge[0] - 0.12 && L < RN.lunge[0]) k = 'eraser_1';
    if (L >= RN.lunge[0] && L < RN.lunge[1]) { k = 'eraser_2'; er = 0.25; }
    if (L > RN.hopGap[0] && L < RN.hopGap[1]) {
      const u = seg(L, RN.hopGap[0], RN.hopGap[1]);
      k = u < 0.15 || u > 0.9 ? 'eraser_1' : 'eraser_2';
      ey -= Math.sin(u * Math.PI) * face * 3;
      er = lerp(0.3, -0.2, u);
    }
    if (L > RN.skid[0]) {
      // stopped dead at the edge: tilted back, teetering
      k = 'eraser_3';
      er = -0.35 + Math.sin(t * 7) * 0.08 * (1 - seg(L, RN.skid[1], RN.end));
      EX = edgeX - face * 1.1;
    }
    const [aw, ah] = artSize(k);
    const ew = EH * (aw / ah) * (k === 'eraser_1' ? 1.25 : 1);
    ctx.save();
    ctx.translate(EX, ey);
    ctx.rotate(er);
    ctx.scale(1 / Math.sqrt(sq), sq);
    drawArtFoot(ctx, k, 0, 0, ew);
    ctx.restore();
  }

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

  // ---- the gag plays as an old cartoon, and an iris closes on him as he drops (it opens again on the void)
  oldFilm(ctx, w, h, hoseK, t);
  const ik = seg(L, RN.iris[0], RN.iris[1]);
  if (ik > 0 && L < RN.end) {
    const c = toS([X, y - face * 1.1]);
    const R0 = Math.hypot(w, h);
    const close = ease.inOut3(seg(ik, 0, 0.55)), open = ease.in3(seg(ik, 0.75, 1));
    iris(ctx, w, h, c, lerp(lerp(R0, face * 1.5, close), R0, open));
  }
  ctx.restore();
}
