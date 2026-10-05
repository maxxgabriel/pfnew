import type { Frame } from './frame';
import { TAU, ease, hash, lerp, seg } from './math';
import { halftone } from './sprites';
import { C } from './style';

/*
 * CUTS BETWEEN WORLDS.
 *
 * The whip-pan: at the end of ALTER the Spark shoots up the column and the
 * camera whips up after it, a few frames of streaked blur, and lands in the
 * night sky over the stadium with a small overshoot (the dive starts there).
 *
 * The repaint: as the ink duel's beams meet, the frame is reprinted as a
 * poster from left to right, halftone dots and flat colour behind a ragged
 * edge, just before the white-out drops us into the machine.
 */

/** the whip, 0..1 across the cut (the world changes at 0.5), or 0 when there's none */
export function whipK(f: Frame): number {
  const hd = f.hold;
  if (hd?.kind === 'alter' && hd.p > 0.965) return seg(hd.p, 0.965, 1) * 0.5;
  if (hd?.kind === 'dive' && hd.p < 0.07) return 0.5 + seg(hd.p, 0, 0.07) * 0.5;
  return 0;
}

/** the vertical shift of the whole frame: out goes down (we pan up), in drops from above and settles */
export function whipShift(k: number, h: number): number {
  if (k <= 0) return 0;
  if (k < 0.5) return ease.in2(k * 2) * h * 0.85;
  return -(1 - ease.outBack((k - 0.5) * 2, 1.6)) * h * 0.85;
}

let buf: { c: HTMLCanvasElement; g: CanvasRenderingContext2D } | null = null;

/** motion blur along the pan: the frame smeared over itself, strongest at the cut */
export function whipSmear(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, k: number, w: number, h: number) {
  const amt = Math.sin(Math.min(1, k) * Math.PI);
  if (amt < 0.05) return;
  if (!buf || buf.c.width !== src.width || buf.c.height !== src.height) {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    buf = { c, g: c.getContext('2d')! };
  }
  buf.g.drawImage(src, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const span = (h * 0.12 * amt * src.height) / h;
  for (let i = 1; i <= 6; i++) {
    ctx.globalAlpha = 0.2 * amt;
    ctx.drawImage(buf.c, 0, (i / 6) * span);
    ctx.drawImage(buf.c, 0, (-i / 6) * span * 0.5);
  }
  ctx.restore();
  // a few hard streaks in the direction of travel
  ctx.save();
  ctx.globalAlpha = 0.5 * amt;
  ctx.strokeStyle = '#ffffff';
  for (let i = 0; i < 18; i++) {
    const x = hash(i * 3.1) * w;
    ctx.lineWidth = 1 + hash(i) * 2;
    ctx.beginPath();
    ctx.moveTo(x, hash(i * 7) * h);
    ctx.lineTo(x, hash(i * 7) * h + h * (0.2 + hash(i * 5) * 0.4) * amt);
    ctx.stroke();
  }
  ctx.restore();
}

let dots: CanvasPattern | null = null;

/** the ink frame reprinted as a poster, behind a ragged edge sweeping left to right */
export function posterRepaint(f: Frame) {
  const { ctx, w, h, B, t } = f;
  const k = ease.inOut2(seg(B, 6.0, 6.45));
  if (k <= 0 || B >= 6.8) return;
  const S = Math.min(w, h);
  if (!dots) dots = ctx.createPattern(halftone(56, 7, 'rgba(20,18,15,0.22)'), 'repeat');
  // the ragged edge: a torn-poster line, boiling twelve times a second
  const edge: [number, number][] = [];
  const bx = lerp(-w * 0.2, w * 1.25, k);
  const boil = Math.floor(t * 12);
  for (let i = 0; i <= 14; i++) {
    const y = (h * i) / 14;
    edge.push([bx - (y / h) * w * 0.25 + (hash(i * 5 + boil) - 0.5) * S * 0.05, y]);
  }
  const region = () => {
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    for (const [x, y] of edge) ctx.lineTo(x, y);
    ctx.lineTo(-10, h + 10);
    ctx.closePath();
  };
  ctx.save();
  region();
  ctx.clip();
  // a screen-print duotone: the shadows lift to poster blue, the highlights drop to poster yellow
  // (each channel of the dark ink sits under the light one, so it maps cleanly)
  ctx.globalCompositeOperation = 'lighten';
  ctx.fillStyle = '#2443d6';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'darken';
  ctx.fillStyle = '#fff1e6';
  ctx.fillRect(0, 0, w, h);
  // and printed: halftone dots over it
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = dots!;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // the edge itself: a thick ink keyline
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = S * 0.012;
  ctx.beginPath();
  edge.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  // little print marks flying off the edge
  ctx.fillStyle = C.red;
  for (let i = 0; i < 8; i++) {
    const [x, y] = edge[(i * 2 + boil) % edge.length];
    ctx.beginPath();
    ctx.arc(x + S * 0.03 * (1 + hash(i + boil)), y, S * 0.006, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
