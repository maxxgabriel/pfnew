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
