/*
 * THE PAINTINGS: every image in src/assets/day, inlined, decoded once, and drawn
 * as cover-fit layers. All layers of a scene share one 1024x1536 frame, so they
 * stack exactly; each slides by its depth for parallax (tilt, drift, push-in).
 * On a wide screen the frame is fitted by height and the layers are mirrored
 * out to the sides so the ground keeps going.
 */

const SRC = import.meta.glob('../assets/day/*.webp', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;
const imgs = new Map<string, HTMLImageElement>();

export function preloadDay() {
  for (const [path, url] of Object.entries(SRC)) {
    const name = path.split('/').pop()!.replace('.webp', '');
    if (imgs.has(name)) continue;
    const im = new Image();
    im.decoding = 'async';
    im.src = url;
    imgs.set(name, im);
  }
}
export function img(name: string): HTMLImageElement | null {
  preloadDay();
  const im = imgs.get(name);
  return im && im.complete && im.naturalWidth > 0 ? im : null;
}
export function hasArt(name: string) {
  preloadDay();
  return imgs.has(name);
}

export interface Cam { x: number; y: number; push: number }

export interface LayerOpts {
  depth: number;
  alpha?: number;
  /** extra offset as a fraction of the screen */
  dx?: number;
  dy?: number;
  /** extra scale (1 = none) about (ox, oy) as fractions of the screen */
  zoom?: number;
  ox?: number;
  oy?: number;
}

/** where a frame-fraction point (u, v) of a scene's images lands on screen, for a layer at `depth` */
export function placeOf(w: number, h: number, cam: Cam, o: LayerOpts) {
  const portrait = h > w * 1.2;
  const iw = 1024, ih = 1536;
  const over = 1.08 + cam.push * o.depth * 0.18;
  const z = o.zoom ?? 1;
  const sc0 = (portrait ? Math.max(w / iw, h / ih) : h / ih) * over;
  const x0 = (w - iw * sc0) / 2, y0 = (h - ih * sc0) / 2;
  const ox = (o.ox ?? 0.5) * w, oy = (o.oy ?? 0.5) * h;
  const dw = iw * sc0 * z, dh = ih * sc0 * z;
  const x = ox + (x0 - ox) * z + cam.x * o.depth * w * 0.05 + (o.dx ?? 0) * w;
  const y = oy + (y0 - oy) * z + cam.y * o.depth * h * 0.03 + (o.dy ?? 0) * h;
  return { x, y, dw, dh, at: (u: number, v: number): [number, number] => [x + u * dw, y + v * dh] };
}

/** draw a layer of a scene */
export function layer(ctx: CanvasRenderingContext2D, w: number, h: number, name: string, cam: Cam, o: LayerOpts) {
  const im = img(name);
  const pl = placeOf(w, h, cam, o);
  if (!im || (o.alpha ?? 1) <= 0.003) return pl;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.drawImage(im, pl.x, pl.y, pl.dw, pl.dh);
  // wide screens: mirror the painting out to the sides
  if (pl.x > 0) {
    ctx.save();
    ctx.translate(pl.x, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(im, 0, pl.y, pl.dw, pl.dh);
    ctx.restore();
  }
  if (pl.x + pl.dw < w) {
    ctx.save();
    ctx.translate(pl.x + pl.dw * 2, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(im, 0, pl.y, pl.dw, pl.dh);
    ctx.restore();
  }
  ctx.restore();
  return pl;
}
