import { TAU, ease, hash, seg } from './math';
import { drawSprite, glow } from './sprites';
import { C } from './style';
import type { World } from './texture';

/*
 * TAP TO PLAY.
 *
 * A tap anywhere on the film (never needed, never hover) gets an answer in
 * the language of the world you're in: an ink splash, a comic burst with
 * confetti, a spray of sparks, camera flashes popping in the stands, a drop
 * of ink on the page. Taps are clicks, so a scroll flick never fires one.
 */

interface Tap { x: number; y: number; t0: number; wld: World | 'page'; seed: number }
const taps: Tap[] = [];
const LIFE = 0.9;

export function addTap(x: number, y: number, t: number, wld: World | 'page') {
  if (!wld) return;
  taps.push({ x, y, t0: t, wld, seed: Math.floor(t * 1000) % 997 });
  if (taps.length > 12) taps.shift();
}

export function drawTaps(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const S = Math.min(w, h);
  for (let i = taps.length - 1; i >= 0; i--) {
    const tp = taps[i];
    const k = (t - tp.t0) / LIFE;
    if (k >= 1 || k < 0) {
      taps.splice(i, 1);
      continue;
    }
    ctx.save();
    if (tp.wld === 'ink' || tp.wld === 'page') inkSplash(ctx, tp, k, S * (tp.wld === 'page' ? 0.6 : 1), tp.wld === 'ink' ? C.paper : C.ink);
    else if (tp.wld === 'machine') comicBurst(ctx, tp, k, S);
    else if (tp.wld === 'alter') sparks(ctx, tp, k, S);
    else flashes(ctx, tp, k, S, w, h);
    ctx.restore();
  }
}

function inkSplash(ctx: CanvasRenderingContext2D, tp: Tap, k: number, S: number, col: string) {
  const grow = ease.out3(seg(k, 0, 0.25));
  const fade = 1 - seg(k, 0.55, 1);
  ctx.globalAlpha = fade;
  // (pale on the ink world's night, black on paper)
  ctx.fillStyle = col;
  // the blot: a ragged circle
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * TAU;
    const r = S * 0.035 * grow * (0.8 + hash(tp.seed + i) * 0.45);
    if (i) ctx.lineTo(tp.x + Math.cos(a) * r, tp.y + Math.sin(a) * r);
    else ctx.moveTo(tp.x + Math.cos(a) * r, tp.y + Math.sin(a) * r);
  }
  ctx.fill();
  // flung droplets
  for (let i = 0; i < 9; i++) {
    const a = hash(tp.seed * 3 + i) * TAU;
    const d = S * (0.05 + hash(tp.seed + i * 7) * 0.08) * ease.out3(seg(k, 0, 0.4));
    ctx.beginPath();
    ctx.arc(tp.x + Math.cos(a) * d, tp.y + Math.sin(a) * d + k * k * S * 0.04, S * 0.006 * (1 - k * 0.5), 0, TAU);
    ctx.fill();
  }
}

function comicBurst(ctx: CanvasRenderingContext2D, tp: Tap, k: number, S: number) {
  const pop = ease.outBack(seg(k, 0, 0.22), 2.4);
  const fade = 1 - seg(k, 0.5, 0.85);
  if (fade > 0) {
    ctx.globalAlpha = fade;
    ctx.translate(tp.x, tp.y);
    ctx.rotate(hash(tp.seed) * 0.6);
    ctx.scale(pop, pop);
    // a starburst, yellow with a red keyline
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const r = S * (i % 2 ? 0.035 : 0.07) * (0.85 + hash(tp.seed + i) * 0.3);
      const a = (i / 24) * TAU;
      if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffd23e';
    ctx.fill();
    ctx.lineWidth = S * 0.006;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.arc(0, 0, S * 0.016, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  // confetti thrown up and falling
  const cols = [C.red, C.blue, C.green, '#ffd23e'];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (hash(tp.seed + i * 5) - 0.5) * 2.2;
    const v = S * (0.15 + hash(tp.seed * 7 + i) * 0.2);
    const x = tp.x + Math.cos(a) * v * k, y = tp.y + Math.sin(a) * v * k + S * 0.5 * k * k;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = cols[i % 4];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(k * 12 + i);
    ctx.fillRect(-S * 0.008, -S * 0.004, S * 0.016, S * 0.008);
    ctx.restore();
  }
}

function sparks(ctx: CanvasRenderingContext2D, tp: Tap, k: number, S: number) {
  ctx.globalCompositeOperation = 'lighter';
  const fade = 1 - k;
  ctx.globalAlpha = fade * 0.8;
  drawSprite(ctx, glow('#ff3a52', 64), tp.x, tp.y, S * 0.25 * (1 - k * 0.5));
  ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + hash(tp.seed + i) * 0.4;
    const d0 = S * 0.12 * ease.out3(k), d1 = d0 + S * 0.05 * (1 - k);
    ctx.strokeStyle = i % 3 ? '#ffb0c0' : '#ffffff';
    ctx.lineWidth = S * 0.004 * (1 - k * 0.6);
    ctx.globalAlpha = fade;
    ctx.beginPath();
    ctx.moveTo(tp.x + Math.cos(a) * d0, tp.y + Math.sin(a) * d0);
    ctx.lineTo(tp.x + Math.cos(a) * d1, tp.y + Math.sin(a) * d1);
    ctx.stroke();
  }
  ctx.globalAlpha = fade * 0.6;
  ctx.strokeStyle = '#ff3a52';
  ctx.lineWidth = S * 0.004;
  ctx.beginPath();
  ctx.arc(tp.x, tp.y, S * 0.16 * ease.out3(k), 0, TAU);
  ctx.stroke();
}

function flashes(ctx: CanvasRenderingContext2D, tp: Tap, k: number, S: number, w: number, h: number) {
  // camera flashes going off around the tap, one after another
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const at = hash(tp.seed + i * 3) * 0.6;
    const q = seg(k, at, at + 0.18);
    if (q <= 0 || q >= 1) continue;
    const x = Math.min(w, Math.max(0, tp.x + (hash(tp.seed * 5 + i) - 0.5) * S * 0.5));
    const y = Math.min(h, Math.max(0, tp.y + (hash(tp.seed * 9 + i) - 0.5) * S * 0.3));
    ctx.globalAlpha = Math.sin(q * Math.PI);
    drawSprite(ctx, glow('#ffffff', 64), x, y, S * 0.09);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y - S * 0.02, 2, S * 0.04);
    ctx.fillRect(x - S * 0.02, y - 1, S * 0.04, 2);
  }
}
