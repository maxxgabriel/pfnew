import type { Frame } from '../core/frame';
import { clamp } from '../core/math';
import { artImage, artSize, queueArt } from './art';

/*
 * LIVING MARGINS (round 29). On a wide screen the paper chapters leave a lot
 * of empty sheet beside him, so the sheet's margins fill with big ink
 * doodles (scripts/gen-cine.sh doodles: a pine, a far ridge, a crane, a wave)
 * that draw themselves in, left to right under a ragged wet edge, as the
 * scene reaches them. One strong shape each, in ink only (the film's one red
 * circle stays the Spark's).
 */

export const DOODLE = { pine: 'doodle_0', ridge: 'doodle_1', crane: 'doodle_2', wave: 'doodle_3' } as const;

/** wide enough for margins (any wide screen, mouse or touch) */
export const wideSheet = (f: Frame) => f.w >= 1000 && f.w / f.h >= 1.3;

let queued = false;
let cut: { c: HTMLCanvasElement; g: CanvasRenderingContext2D } | null = null;

/** draw doodle `k` with its foot (bottom middle) at (x, y), `height` pixels tall, drawn in up to `reveal` (0..1) */
export function drawDoodle(ctx: CanvasRenderingContext2D, k: string, x: number, y: number, height: number, reveal: number, alpha = 0.9, flip = false) {
  if (!queued) { queued = true; Object.values(DOODLE).forEach((d, i) => queueArt(d, 12 + i)); }
  reveal = clamp(reveal);
  if (reveal <= 0 || alpha <= 0) return;
  const im = artImage(k);
  if (!im) return;
  const [aw, ah] = artSize(k);
  const width = height * (aw / ah);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  if (reveal >= 1) {
    ctx.drawImage(im, -width / 2, -height, width, height);
  } else {
    // the brush still going: everything left of a ragged edge (an offscreen cut, so the edge is soft ink, not a hard clip)
    const W = Math.max(8, Math.ceil(width)), H = Math.max(8, Math.ceil(height));
    if (!cut || cut.c.width < W || cut.c.height < H) {
      const c = document.createElement('canvas');
      c.width = Math.max(W, cut?.c.width ?? 0);
      c.height = Math.max(H, cut?.c.height ?? 0);
      cut = { c, g: c.getContext('2d')! };
    }
    const g = cut.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, cut.c.width, cut.c.height);
    g.drawImage(im, 0, 0, W, H);
    g.globalCompositeOperation = 'destination-in';
    const edge = reveal * W * 1.08;
    const grad = g.createLinearGradient(edge - W * 0.08, 0, edge, 0);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 0);
    for (let i = 0; i <= 10; i++) g.lineTo(edge + Math.sin(i * 2.3 + reveal * 7) * W * 0.03, (i / 10) * H);
    g.lineTo(0, H);
    g.closePath();
    g.fill();
    ctx.drawImage(cut.c, 0, 0, W, H, -width / 2, -height, width, height);
  }
  ctx.restore();
}
