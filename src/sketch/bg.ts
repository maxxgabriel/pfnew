import { hurry, queue } from './load';
/*
 * Painted backgrounds for THE SKETCH (made with the image tool from the
 * character sheet's style, scripts/gen-sketch.sh `bg`), inlined.
 */

const files = import.meta.glob('../assets/sketchbg/*.webp', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
/** when each painting is first needed, on the same scale as the drawings' order (src/sketch/art.ts) */
const PRIO: Record<string, number> = {
  ink_far: 0, ink_mid: 1,
  px_sky: 12, px_far: 13, px_mid: 14,
  bg_void: 18,
  wc_sky: 20, bg_inksea: 21, wc_cloud: 21, wc_sea_far: 22, wc_sea_near: 23, fg_inksea: 23,
  cm_space: 24, bg_space: 24, cm_earth: 25, cm_moon: 26, fg_moon: 26,
  hs_sky: 30, hs_sun: 31, hs_cloud_far: 32, bg_sunset: 32, hs_cloud_near: 33, fg_sunset: 36,
  vfx_tornado: 43, vfx_fire: 43, desk_top: 50,
};
const imgs = new Map<string, HTMLImageElement>();
const urls = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const name = path.split('/').pop()!.replace('.webp', '');
  if (!(name in PRIO) && !(name.replace(/_\d+$/, '') in PRIO)) continue;
  urls.set(name, url);
  imgs.set(name, queue(url, PRIO[name] ?? PRIO[name.replace(/_\d+$/, '')] ?? 50));
}
/** the painting if it has arrived (if not, it jumps the queue) */
function ready(name: string) {
  const im = imgs.get(name);
  if (im && im.complete && im.naturalWidth) return im;
  const u = urls.get(name);
  if (u) hurry(u);
  return null;
}

/** the painting itself, once it has arrived (the desk draws its own) */
export const bgImage = (name: string) => ready(name);

/** cover the screen with background `name`; `pan` 0..1 slides a tall image from its top to its bottom */
export function drawBg(ctx: CanvasRenderingContext2D, name: string, w: number, h: number, pan = 0.5, alpha = 1, zoom = 1) {
  const im = ready(name);
  if (!im || alpha <= 0) return false;
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
  const im = ready(name);
  if (!im || alpha <= 0) return false;
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

/** like drawBg, but panning sideways too: `px` 0..1 slides a wide-enough cover from its left to its right */
export function drawBgXY(ctx: CanvasRenderingContext2D, name: string, w: number, h: number, px: number, py: number, alpha = 1, zoom = 1.3) {
  const im = ready(name);
  if (!im || alpha <= 0) return false;
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * zoom;
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(im, -(dw - w) * px, -(dh - h) * py, dw, dh);
  ctx.restore();
  return true;
}

/**
 * A painted foreground layer (fg_*), keyed to transparency at the painting's full size: drawn
 * cover-fit like its painting, then shifted by (dx, dy) screen px and scaled about the centre —
 * moved further than the painting behind it, it gives the shot depth.
 */
export function drawLayer(ctx: CanvasRenderingContext2D, name: string, w: number, h: number, dx: number, dy: number, alpha = 1, zoom = 1.2) {
  const im = ready(name);
  if (!im || alpha <= 0) return false;
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * zoom;
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(im, (w - dw) / 2 + dx, (h - dh) / 2 + dy, dw, dh);
  ctx.restore();
  return true;
}

const strips = new Map<string, { im: HTMLImageElement; height: number; c: HTMLCanvasElement }>();

/** Repeat a transparent strip at a height in viewport fractions. Offset/y are CSS px.
 * Optional displacement samples 20 horizontal bands; no per-pixel work. */
export function drawStrip(ctx: CanvasRenderingContext2D, name: string, w: number, h: number,
  height: number, offset: number, y: number, alpha = 1,
  displacement?: (v: number) => number) {
  const im = ready(name);
  if (!im || alpha <= 0) return false;
  const dh = h * height, dw = dh * im.naturalWidth / im.naturalHeight;
  if (dw <= 0 || dh <= 0) return false;
  let tile = strips.get(name);
  if (!tile || tile.im !== im || tile.height !== dh) {
    const c = document.createElement('canvas'); c.width = Math.ceil(dw); c.height = Math.ceil(dh);
    const g = c.getContext('2d')!; g.imageSmoothingEnabled = !name.startsWith('px_');
    g.drawImage(im, 0, 0, c.width, c.height);
    tile = { im, height: dh, c }; strips.set(name, tile);
  }
  const source = tile.c;
  const n = displacement ? 20 : 1;
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let b = 0; b < n; b++) {
    const dy = dh * b / n, sh = source.height / n;
    const dx = offset + (displacement?.(b / n) ?? 0);
    const start = ((dx % dw) + dw) % dw - dw;
    for (let x = start; x < w; x += dw) {
      ctx.drawImage(source, 0, b * sh, source.width, Math.min(sh + 1, source.height - b * sh),
        x, y + dy, dw + 0.5, dh / n + 0.5);
    }
  }
  ctx.restore(); return true;
}
