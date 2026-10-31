import * as THREE from 'three';
import manifest from '../assets/sketch/manifest.json';
import { url } from '../site/art';

// The boy's drawings (src/assets/sketch, measured in manifest.json) and the site lettering, as textures.
export type Meta = { w: number; h: number; foot: number[]; top: number; face: number };
export const META = manifest as unknown as Record<string, Meta>;
const siteArt = import.meta.glob('../site/art/*.webp', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const siteMeta = new Map<string, Meta>();
const cache = new Map<string, THREE.Texture>();
const loads = new Map<string, Promise<void>>();

/** `logo_ink`, `pill_hi`, `sticker_seal` … live in src/site/art; everything else is one of his drawings */
const srcOf = (key: string) => siteArt[`../site/art/${key}.webp`] ?? url(key);

export function tex(key: string): THREE.Texture {
  let t = cache.get(key);
  if (t) return t;
  t = new THREE.Texture();
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  if (key.startsWith('pixel-')) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  cache.set(key, t);
  const im = new Image();
  im.decoding = 'async';
  const tt = t;
  loads.set(key, new Promise((done) => {
    im.onload = () => {
      tt.image = im; tt.needsUpdate = true;
      if (!META[key]) siteMeta.set(key, { w: im.naturalWidth, h: im.naturalHeight, foot: [im.naturalWidth / 2, im.naturalHeight], top: 0, face: im.naturalHeight });
      (tt.userData as { ready?: boolean }).ready = true; done();
    };
    im.onerror = () => done();
  }));
  im.src = srcOf(key);
  return t;
}
export const ready = (t: THREE.Texture) => !!(t.userData as { ready?: boolean }).ready;
export const meta = (key: string): Meta | undefined => META[key] ?? siteMeta.get(key);

/** a texture drawn on a canvas (lettering), usable like a drawing: foot at the bottom middle, face = its height */
export function canvasArt(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void | Promise<void>) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
  cache.set(key, t);
  siteMeta.set(key, { w, h, foot: [w / 2, h], top: 0, face: h });
  loads.set(key, Promise.resolve(draw(cv.getContext('2d')!)).then(() => { t.needsUpdate = true; (t.userData as { ready?: boolean }).ready = true; }));
  return t;
}

/** start loading these and resolve when they are all in */
export function preload(keys: string[]) {
  keys.forEach(tex);
  return Promise.all(keys.map((k) => loads.get(k)));
}
/**
 * A soft height map from a drawing's silhouette (the top `crop` of it): R = a tight blur, G = a wide one.
 * Used to push a shape through the rubber skin. Blurred by hand (separable box blur, three passes):
 * canvas filters aren't everywhere yet.
 */
export function heightMap(key: string, crop = 1, size = 192): THREE.Texture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const out = new THREE.CanvasTexture(cv);
  out.colorSpace = THREE.NoColorSpace;
  void preload([key]).then(() => {
    const im = tex(key).image as HTMLImageElement | undefined;
    if (!im) return;
    const g = cv.getContext('2d', { willReadFrequently: true })!;
    const pad = size * 0.16, sw = im.naturalWidth, sh = im.naturalHeight * crop;
    const k = Math.min((size - 2 * pad) / sw, (size - 2 * pad) / sh);
    g.drawImage(im, 0, 0, sw, sh, (size - sw * k) / 2, (size - sh * k) / 2, sw * k, sh * k);
    const px = g.getImageData(0, 0, size, size), a = new Float32Array(size * size);
    for (let i = 0; i < a.length; i++) a[i] = px.data[i * 4 + 3] / 255;
    const tight = blur(a, size, 3), wide = blur(a, size, 11);
    for (let i = 0; i < a.length; i++) { px.data[i * 4] = tight[i] * 255; px.data[i * 4 + 1] = wide[i] * 255; px.data[i * 4 + 2] = 0; px.data[i * 4 + 3] = 255; }
    g.putImageData(px, 0, 0);
    out.needsUpdate = true;
  });
  return out;
}
function blur(src: Float32Array, n: number, r: number) {
  let a = src.slice(), b = new Float32Array(a.length);
  for (let pass = 0; pass < 3; pass++) {
    for (const horiz of [true, false]) {
      for (let j = 0; j < n; j++) {
        let s = 0;
        for (let i = -r; i <= r; i++) s += a[horiz ? j * n + Math.min(n - 1, Math.max(0, i)) : Math.min(n - 1, Math.max(0, i)) * n + j];
        for (let i = 0; i < n; i++) {
          b[horiz ? j * n + i : i * n + j] = s / (2 * r + 1);
          const o = Math.max(0, i - r), nx = Math.min(n - 1, i + r + 1);
          s += a[horiz ? j * n + nx : nx * n + j] - a[horiz ? j * n + o : o * n + j];
        }
      }
      [a, b] = [b, a];
    }
  }
  return a;
}

/** `name_0 … name_{n-1}` */
export const seq = (name: string, n: number) => Array.from({ length: n }, (_, i) => `${name}_${i}`);
