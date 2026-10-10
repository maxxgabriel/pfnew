import { TAU, hash } from './math';
import { C } from './style';
import type { World } from './texture';

/*
 * FINGER TRAIL.
 *
 * Wherever a finger (or a mouse) travels over the film it leaves a short
 * trail of tiny drawn things in the language of the world on screen: petals
 * and ink dots in the ink, nuts, bolts and poster stars in the machine,
 * sparks in ALTER, little footballs and confetti at the match, ink dots on
 * the page. Each pops in, drifts, spins and fades in under a second. It
 * never blocks the scroll: it only listens.
 */

interface Bit { x: number; y: number; vx: number; vy: number; t0: number; rot: number; wld: Exclude<World, null> | 'page'; seed: number }
const bits: Bit[] = [];
const LIFE = 1.1;
let last: { x: number; y: number } | null = null;

export function trailMove(x: number, y: number, t: number, wld: World | 'page') {
  if (!wld) return;
  if (last && Math.hypot(x - last.x, y - last.y) < 16) return;
  const dx = last ? x - last.x : 0, dy = last ? y - last.y : 0;
  last = { x, y };
  const seed = (bits.length * 7.31 + t * 13) % 1000;
  bits.push({ x, y, vx: -dx * 0.6 + (hash(seed) - 0.5) * 60, vy: -dy * 0.6 + (hash(seed + 1) - 0.5) * 60 - 20, t0: t, rot: hash(seed + 2) * TAU, wld, seed });
  if (bits.length > 60) bits.shift();
}

export function trailEnd() {
  last = null;
}

export function drawTrail(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const S = Math.min(w, h);
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i];
    const age = t - b.t0;
    const k = age / LIFE;
    if (k >= 1 || k < 0) {
      bits.splice(i, 1);
      continue;
    }
    const x = b.x + b.vx * age, y = b.y + b.vy * age + (b.wld === 'machine' || b.wld === 'match' ? 160 * age * age : 0);
    const pop = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.5) / 0.5);
    const sz = S * 0.045 * (0.7 + hash(b.seed + 3) * 0.6) * (0.6 + 0.4 * Math.min(1, k / 0.15));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(b.rot + age * 4 * (hash(b.seed + 4) - 0.5));
    ctx.globalAlpha = pop;
    const v = Math.floor(hash(b.seed + 5) * 3);
    if (b.wld === 'ink') {
      // pale brush flicks and splashes of white ink, distinct from the falling petals
      if (v === 0) dot(ctx, sz * 0.35, C.paper);
      else flick(ctx, sz, C.paper);
    } else if (b.wld === 'machine') {
      if (v === 0) nut(ctx, sz * 0.6);
      else if (v === 1) bolt(ctx, sz);
      else star(ctx, sz * 0.7, ['#ffd23e', C.red, C.blue][Math.floor(hash(b.seed + 6) * 3)]);
    } else if (b.wld === 'alter') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,60,90,0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, sz * 0.6, 0, TAU);
      ctx.fill();
      spark(ctx, sz * 1.3, v === 0 ? '#ffffff' : '#ffb0c0');
    } else if (b.wld === 'match') {
      if (v === 0) ball(ctx, sz * 0.5);
      else {
        ctx.fillStyle = [C.green, C.blue, '#ffffff'][v];
        ctx.fillRect(-sz * 0.5, -sz * 0.25, sz, sz * 0.5);
      }
    } else dot(ctx, sz * 0.35, C.ink);
    ctx.restore();
  }
}

function dot(ctx: CanvasRenderingContext2D, r: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
}

function flick(ctx: CanvasRenderingContext2D, s: number, col: string) {
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.16;
  ctx.beginPath();
  ctx.moveTo(-s * 0.45, s * 0.1);
  ctx.quadraticCurveTo(0, -s * 0.25, s * 0.45, 0);
  ctx.stroke();
}

export function petal(ctx: CanvasRenderingContext2D, s: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.quadraticCurveTo(s * 0.45, 0, 0, s * 0.5);
  ctx.quadraticCurveTo(-s * 0.45, 0, 0, -s * 0.5);
  ctx.fill();
}

function nut(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = '#ffd23e';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(1, r * 0.25);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos((i / 6) * TAU) * r, Math.sin((i / 6) * TAU) * r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, TAU);
  ctx.fill();
}

function bolt(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = C.paper;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(1, s * 0.12);
  ctx.beginPath();
  ctx.rect(-s * 0.12, -s * 0.2, s * 0.24, s * 0.7);
  ctx.rect(-s * 0.3, -s * 0.38, s * 0.6, s * 0.2);
  ctx.fill();
  ctx.stroke();
}

function star(ctx: CanvasRenderingContext2D, r: number, col: string) {
  ctx.fillStyle = col;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos((i / 10) * TAU - Math.PI / 2) * rr, Math.sin((i / 10) * TAU - Math.PI / 2) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function spark(ctx: CanvasRenderingContext2D, s: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.6);
  ctx.lineTo(s * 0.12, 0);
  ctx.lineTo(0, s * 0.6);
  ctx.lineTo(-s * 0.12, 0);
  ctx.closePath();
  ctx.fill();
}

function ball(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) ctx.lineTo(Math.cos((i / 5) * TAU) * r * 0.4, Math.sin((i / 5) * TAU) * r * 0.4);
  ctx.closePath();
  ctx.fill();
}
