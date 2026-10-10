import type { Frame } from '../core/frame';
import { ease, lerp, seg } from '../core/math';
import { canvas, paperTile } from '../core/sprites';
import { RED } from './common';

/*
 * THE STORYBOARD WALL (round 24).
 *
 * After the peek, the camera pulls back from the page: it was one panel on
 * a wall of panels, and round it every chapter of the film is pinned up as a
 * storyboard frame — the whole film, made by one hand. The pins are the
 * Spark's red. Then the camera pushes back into the page and the film loops.
 * It plays during the 'wall' hold (src/core/holds.ts); the chapters are
 * painted into their panels once, one a frame, from the conductor's table.
 */

export interface WallSource { draw: (f: Frame, L: number) => void; from: number; at: number }
let sources: WallSource[] = [];
export const setWallSources = (s: WallSource[]) => { sources = s; };

const thumbs: (HTMLCanvasElement | null)[] = [];
let thumbKey = '';
let live: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
let tile: HTMLCanvasElement | null = null;

function miniFrame(f: Frame, ctx: CanvasRenderingContext2D, w: number, h: number, B: number): Frame {
  return { ...f, ctx, w, h, u: Math.min(w, h * 0.62) / 100, portrait: h > w, B, vB: 0, hold: null, intro: 8, idle: 0, crossed: () => false, crossedFwd: () => false, shake: () => {}, flash: () => {} };
}

/** paint one missing panel a frame (each is a full chapter render, so they're spread out) */
function fillThumbs(f: Frame, pw: number, ph: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const key = `${Math.round(pw)}x${Math.round(ph)}`;
  if (key !== thumbKey) { thumbs.length = 0; thumbKey = key; }
  const i = sources.findIndex((_, k) => !thumbs[k]);
  if (i < 0) return;
  const s = sources[i];
  const o = canvas(Math.max(8, Math.round(pw * dpr)), Math.max(8, Math.round(ph * dpr)));
  o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  try { s.draw(miniFrame(f, o.ctx, pw, ph, s.from + s.at), s.at); } catch { /* a chapter that can't draw this small leaves its panel blank */ }
  thumbs[i] = o.c;
}

/** the wall: `drawPage` paints the live page (the panel in the middle) into a context of the scene's size */
export function drawWall(f: Frame, p: number, drawPage: (g: CanvasRenderingContext2D) => void, roomBelow: boolean) {
  const { ctx, w, h } = f;
  // where the wall may sit: on a phone the contact card has the bottom of the screen
  const ah = roomBelow ? h * 0.6 : h;
  const g = 0.07;
  const k = Math.min((w * 0.94) / (3 + 2 * g) / w, (ah * (roomBelow ? 0.9 : 0.82)) / (3 + 2 * g) / h);
  const pw = w * k, ph = h * k;
  // the camera: from inside the page out to the wall, a hold, and back in
  const out = ease.inOut3(seg(p, 0, 0.32)) * (1 - ease.inOut3(seg(p, 0.8, 1)));
  const z = lerp(1 / k, 1, out);
  const cx = w / 2, cy = lerp(h / 2, roomBelow ? ah / 2 : ah * 0.47, out);
  fillThumbs(f, pw, ph);

  // the live page, painted at full size
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (!live || live.c.width !== Math.round(w * dpr) || live.c.height !== Math.round(h * dpr)) live = canvas(Math.round(w * dpr), Math.round(h * dpr));
  live.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawPage(live.ctx);

  // the wall itself: dark warm board with a paper grain
  ctx.fillStyle = '#2f2923';
  ctx.fillRect(0, 0, w, h);
  if (!tile) tile = paperTile(512, '#2f2923');
  const pat = ctx.createPattern(tile, 'repeat');
  if (pat) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h); ctx.restore(); }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(z, z);
  // the grid, centred on the live page: the eight chapters round it, in reading order
  let n = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = (c - 1) * pw * (1 + g), y = (r - 1) * ph * (1 + g);
      const centre = r === 1 && c === 1;
      const img = centre ? live.c : thumbs[n];
      const rot = centre ? 0 : Math.sin(n * 2.3 + 1) * 0.025 * out;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      // the card: a shadow, a paper border, the frame
      const b = pw * 0.035;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-pw / 2 - b + pw * 0.02, -ph / 2 - b + pw * 0.03, pw + b * 2, ph + b * 2);
      ctx.fillStyle = '#f4efe4';
      ctx.fillRect(-pw / 2 - b, -ph / 2 - b, pw + b * 2, ph + b * 2);
      if (img) ctx.drawImage(img, -pw / 2, -ph / 2, pw, ph);
      else { ctx.fillStyle = '#e6dfcf'; ctx.fillRect(-pw / 2, -ph / 2, pw, ph); }
      // the pin, the Spark's red
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.arc(0, -ph / 2 - b * 0.2, pw * 0.045, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,220,0.8)';
      ctx.beginPath();
      ctx.arc(-pw * 0.014, -ph / 2 - b * 0.2 - pw * 0.014, pw * 0.012, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (!centre) n++;
    }
  }
  ctx.restore();
}
