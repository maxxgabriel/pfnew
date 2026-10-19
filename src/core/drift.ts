import { TAU, hash } from './math';
import { drawSprite, glow } from './sprites';
import { C } from './style';
import type { World } from './texture';

/*
 * PARTICLES THAT TRAVEL.
 *
 * One sparse field of specks drifts in front of the whole film with the same
 * positions and the same drift from start to end. Only its costume changes
 * at each cut: blossom petals in the ink, poster confetti in the machine,
 * embers in ALTER, floodlit sparkle at the match, drops of ink on the page.
 * Follow one petal across a cut and it's still there, in its new clothes.
 */

const N = 18;
const CONFETTI = [C.red, C.blue, '#ffd23e', C.green];

export function drawDrift(ctx: CanvasRenderingContext2D, wld: World | 'page', w: number, h: number, t: number, B: number) {
  if (!wld) return;
  const S = Math.min(w, h);
  ctx.save();
  for (let i = 0; i < N; i++) {
    const depth = 0.4 + hash(i * 11) * 0.9; // nearer ones are bigger and faster
    const fall = (hash(i * 3) + t * 0.025 * depth + B * 0.06 * depth) % 1;
    const y = (fall * 1.2 - 0.1) * h;
    const x = (hash(i) * 1.1 - 0.05) * w + Math.sin(t * 0.6 * depth + i * 1.7) * S * 0.04 * depth;
    const spin = t * (1 + hash(i * 5) * 2) + i;
    const sz = S * 0.02 * depth;
    if (wld === 'ink') {
      // a blossom petal, tumbling
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#f4c4cc';
      ctx.beginPath();
      ctx.ellipse(x, y, sz, sz * 0.45 * Math.abs(Math.cos(spin)) + sz * 0.1, spin * 0.5, 0, TAU);
      ctx.fill();
    } else if (wld === 'machine') {
      // a scrap of poster confetti, flipping
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = CONFETTI[i % CONFETTI.length];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.scale(1, Math.cos(spin * 1.3));
      ctx.fillRect(-sz, -sz * 0.6, sz * 2, sz * 1.2);
      ctx.restore();
    } else if (wld === 'alter') {
      // an ember
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 7 + i);
      drawSprite(ctx, glow('#ff4a3d', 64), x, y, sz * 5);
      ctx.fillStyle = '#ffd0a0';
      ctx.fillRect(x - sz * 0.25, y - sz * 0.25, sz * 0.5, sz * 0.5);
      ctx.globalCompositeOperation = 'source-over';
    } else if (wld === 'match') {
      // a speck of floodlit dust
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      drawSprite(ctx, glow('#dfe9ff', 64), x, y, sz * 3.5);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // a drop of ink (kept to the top of the page, clear of the card)
      if (y > h * 0.55) continue;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.ellipse(x, y, sz * 0.45, sz * 0.6, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}
