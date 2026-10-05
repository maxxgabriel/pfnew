import { ACT, type Frame } from '../core/frame';
import { ease, seg } from '../core/math';
import { paperTile } from '../core/sprites';
import { C, F, font } from '../core/style';
import { drawSeal } from './ink';

/*
 * THE LOOP (INK v5, beats 5-7 of docs/STORY.md).
 *
 * Step 1 placeholder: after Green's blade breaks, the night goes back to the
 * paper and Max's seal is stamped, with the number of the loop beside it.
 * Steps to come: the broken blade flies into the past and the last frame
 * becomes the first; the site remembers the loops; the last loop tears the sky.
 */

const KEY = 'ink-loops';

/** how many loops this visitor has seen (remembered in their browser; 1 if storage is unavailable) */
export function loopCount(): number {
  try {
    return Math.max(1, Number(localStorage.getItem(KEY)) || 1);
  } catch {
    return 1;
  }
}

let pattern: CanvasPattern | null = null;

export function drawLoopEnd(f: Frame) {
  const { ctx, w, h, B, t } = f;
  const k = ease.inOut2(seg(B, ACT.loopStart + 0.35, ACT.loopStart + 0.9));
  if (k <= 0) return;
  const S = Math.min(w, h);
  if (!pattern) pattern = ctx.createPattern(paperTile(512, C.paper), 'repeat');
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = pattern!;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // the seal comes down like a stamp
  const st = ease.outBack(seg(B, ACT.loopStart + 0.8, ACT.loopStart + 1.05), 2.2);
  if (st > 0) {
    const s = S * 0.2 * (1.6 - 0.6 * st);
    drawSeal(ctx, w / 2, h * 0.42, s, -0.06 + Math.sin(t * 0.8) * 0.01, Math.min(1, st));
    // the loop number, small, in ink beside it
    ctx.save();
    ctx.globalAlpha = Math.min(1, st);
    ctx.fillStyle = C.ink;
    ctx.font = font(Math.round(S * 0.05), F.serif, 600);
    ctx.textAlign = 'center';
    ctx.fillText(String(loopCount()), w / 2 + s * 0.85, h * 0.42 + s * 0.55);
    ctx.restore();
  }
}
