/*
 * Painted backgrounds for THE SKETCH (made with the image tool from the
 * character sheet's style, scripts/gen-sketch.sh `bg`), inlined.
 */

const files = import.meta.glob('../assets/sketchbg/*.webp', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;
const imgs = new Map<string, HTMLImageElement>();
for (const [path, url] of Object.entries(files)) {
  const im = new Image();
  im.decoding = 'async';
  im.src = url;
  imgs.set(path.split('/').pop()!.replace('.webp', ''), im);
}

/** cover the screen with background `name`; `pan` 0..1 slides a tall image from its top to its bottom */
export function drawBg(ctx: CanvasRenderingContext2D, name: string, w: number, h: number, pan = 0.5, alpha = 1, zoom = 1) {
  const im = imgs.get(name);
  if (!im || !im.complete || !im.naturalWidth || alpha <= 0) return false;
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * zoom;
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(im, (w - dw) / 2, -(dh - h) * pan, dw, dh);
  ctx.restore();
  return true;
}

/** draw a fire effect painted on black, added as light: centred at (cx, cy), `width` pixels wide, rotated by `rot` */
export function drawVfx(ctx: CanvasRenderingContext2D, name: string, cx: number, cy: number, width: number, rot = 0, alpha = 1, anchorY = 0.5) {
  const im = imgs.get(name);
  if (!im || !im.complete || !im.naturalWidth || alpha <= 0) return false;
  const s = width / im.naturalWidth;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(im, -im.naturalWidth * s / 2, -im.naturalHeight * s * anchorY, im.naturalWidth * s, im.naturalHeight * s);
  ctx.restore();
  return true;
}

/** a painted effect's height for a given width (0 if it hasn't loaded) */
export function vfxAspect(name: string) {
  const im = imgs.get(name);
  return im && im.naturalWidth ? im.naturalHeight / im.naturalWidth : 0;
}
