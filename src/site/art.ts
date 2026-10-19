import manifest from '../assets/sketch/manifest.json';
const files = import.meta.glob('../assets/sketch/*.webp', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const worlds = import.meta.glob('../assets/sketchbg/*.webp', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const images = new Map<string, HTMLImageElement>();
export const url = (name: string) => files[`../assets/sketch/${name}.webp`] ?? worlds[`../assets/sketchbg/${name}.webp`];
export function image(name: string) {
  if (!images.has(name)) {
    const im = new Image(); im.decoding = 'async'; im.src = url(name); images.set(name, im);
  }
  return images.get(name)!;
}
export function load(name: string) {
  const im = image(name);
  return im.decode().catch(() => undefined);
}
const meta = manifest as Record<string, { w: number; h: number; foot: number[]; top: number; face: number }>;
export function pose(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, height: number, flip = false) {
  const im = image(name), m = meta[name];
  if (!m || !im.complete || !im.naturalWidth) return;
  const scale = height / (m.foot[1] - m.top);
  ctx.save(); ctx.translate(x,y); ctx.scale(flip ? -scale : scale,scale);
  ctx.drawImage(im,-m.foot[0],-m.foot[1]); ctx.restore();
}
export function background(ctx: CanvasRenderingContext2D, name: string, w: number, h: number, drift = 0) {
  const im = image(name);
  if (!im.complete || !im.naturalWidth) return;
  const scale = Math.max(w / im.naturalWidth,h / im.naturalHeight) * 1.07;
  const iw = im.naturalWidth * scale, ih = im.naturalHeight * scale;
  ctx.drawImage(im,(w-iw)/2+drift,(h-ih)/2,iw,ih);
}
