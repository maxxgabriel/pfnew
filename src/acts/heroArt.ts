import bicycle from '../assets/hero/bicycle.webp?inline';
import boot from '../assets/hero/boot.webp?inline';
import control from '../assets/hero/control.webp?inline';
import crouch from '../assets/hero/crouch.webp?inline';
import face from '../assets/hero/face.webp?inline';
import flick from '../assets/hero/flick.webp?inline';
import follow from '../assets/hero/follow.webp?inline';
import kneel from '../assets/hero/kneel.webp?inline';
import manifest from '../assets/hero/manifest.json';
import rise from '../assets/hero/rise.webp?inline';
import tuck from '../assets/hero/tuck.webp?inline';
import windup from '../assets/hero/windup.webp?inline';
import type { Pt } from '../core/math';

/*
 * THE HERO, DRAWN: #10 as hand-drawn anime key poses.
 *
 * Each pose is a cut-out drawing (scripts/cutout.py turns the magenta-backed
 * originals into WebP, inlined into the page). Every drawing has named
 * anchors measured in its ORIGINAL 1024x1536 pixels (where the foot meets the
 * ground, where the boot meets the ball, the eye...), so a shot can say "put
 * his planted foot here, this tall" and props line up with the drawing.
 *
 * Effects are drawn around the art, never into it: a rim of coloured light is
 * a tinted copy of the cut-out nudged toward the light and drawn underneath;
 * a silhouette is the tinted copy alone; a wash of light is the tinted copy
 * added on top.
 */

const SRC = { bicycle, boot, control, crouch, face, flick, follow, kneel, rise, tuck, windup };
export type Art = keyof typeof SRC;

/** his standing height, head to sole, in original pixels (from the turnaround) */
const REF = 1320;

/** anchors, in original pixels */
const A: Record<Art, Record<string, Pt>> = {
  control: { plant: [410, 1350], sole: [790, 1052], head: [440, 120], hip: [300, 640] },
  windup: { plant: [860, 1290], back: [110, 590], head: [860, 130], hip: [700, 700] },
  flick: { plant: [440, 1345], toe: [975, 330], head: [235, 160], hip: [470, 640] },
  crouch: { plant: [600, 1368], head: [700, 140], hip: [580, 760] },
  rise: { plant: [380, 1370], head: [425, 360], hands: [650, 40], hip: [520, 700] },
  tuck: { centre: [482, 660], head: [640, 300] },
  bicycle: { toe: [958, 110], hip: [595, 677], head: [205, 553], centre: [560, 640] },
  follow: { centre: [520, 640], toe: [960, 640], head: [190, 420] },
  kneel: { plant: [537, 1234], eye: [647, 418], head: [600, 300] },
  boot: { sole: [640, 1205], toe: [940, 1150], heel: [320, 1150] },
  face: { eye: [627, 736], eye2: [836, 746], chin: [760, 1080] },
};

type Man = Record<string, { x0: number; y0: number; scale: number; w: number; h: number }>;
const M = manifest as Man;

const imgs = new Map<Art, HTMLImageElement>();
/** start decoding every drawing (call early: the first frames of the shot need them) */
export function preloadArt() {
  for (const k of Object.keys(SRC) as Art[]) {
    if (imgs.has(k)) continue;
    const im = new Image();
    im.decoding = 'async';
    im.src = SRC[k];
    imgs.set(k, im);
  }
}
function ready(k: Art): HTMLImageElement | null {
  preloadArt();
  const im = imgs.get(k)!;
  return im.complete && im.naturalWidth > 0 ? im : null;
}
export function artReady() {
  return (Object.keys(SRC) as Art[]).every((k) => ready(k));
}

const tints = new Map<string, HTMLCanvasElement>();
/** the cut-out filled flat with one colour (cached) */
function tint(k: Art, im: HTMLImageElement, col: string) {
  const key = `${k}|${col}`;
  let c = tints.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const g = c.getContext('2d')!;
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = col;
    g.fillRect(0, 0, c.width, c.height);
    tints.set(key, c);
  }
  return c;
}

export interface ArtOpts {
  /** rotation about the anchor, radians */
  rot?: number;
  /** mirror (face left) */
  flip?: boolean;
  /** rim light: colour, strength, and where the light comes from (screen direction) */
  rim?: string;
  rimA?: number;
  rimDir?: Pt;
  /** rim thickness in px (default from size) */
  rimW?: number;
  /** a flat silhouette in this colour instead of the drawing (the rim still shows) */
  silhouette?: string;
  /** a wash of coloured light added over him */
  wash?: string;
  washA?: number;
  /** squash/stretch along his height */
  stretch?: number;
}

/** where his anchors land if `anchor` is put at (x, y) with standing height `height` px */
export function artPoints(k: Art, x: number, y: number, height: number, anchor: string, o: ArtOpts = {}): Record<string, Pt> {
  const s = height / REF;
  const a = A[k][anchor];
  const c = Math.cos(o.rot ?? 0), sn = Math.sin(o.rot ?? 0);
  const fx = o.flip ? -1 : 1;
  const out: Record<string, Pt> = {};
  for (const [n, p] of Object.entries(A[k])) {
    const dx = (p[0] - a[0]) * s * fx, dy = (p[1] - a[1]) * s * (o.stretch ?? 1);
    out[n] = [x + dx * c - dy * sn, y + dx * sn + dy * c];
  }
  return out;
}

/** draw pose `k` with its `anchor` at (x, y), `height` px tall standing. Returns its anchors, or null if not loaded yet */
export function drawArt(ctx: CanvasRenderingContext2D, k: Art, x: number, y: number, height: number, anchor: string, o: ArtOpts = {}) {
  const im = ready(k);
  if (!im) return null;
  const m = M[k];
  const s = height / REF;
  const a = A[k][anchor];
  // the image's rectangle, in original pixels relative to the anchor
  const rx = m.x0 - a[0], ry = m.y0 - a[1], rw = m.w / m.scale, rh = m.h / m.scale;
  const place = (dx = 0, dy = 0) => {
    ctx.translate(x + dx, y + dy);
    ctx.rotate(o.rot ?? 0);
    ctx.scale(s * (o.flip ? -1 : 1), s * (o.stretch ?? 1));
  };
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (o.rim && (o.rimA ?? 1) > 0) {
    const d = o.rimDir ?? [-0.7, -0.7];
    const l = Math.hypot(d[0], d[1]) || 1;
    const w = o.rimW ?? Math.max(1.5, height * 0.006);
    const t = tint(k, im, o.rim);
    ctx.save();
    ctx.globalAlpha *= o.rimA ?? 1;
    place((d[0] / l) * w, (d[1] / l) * w);
    ctx.drawImage(t, rx, ry, rw, rh);
    ctx.restore();
  }
  ctx.save();
  place();
  ctx.drawImage(o.silhouette ? tint(k, im, o.silhouette) : im, rx, ry, rw, rh);
  if (o.wash && (o.washA ?? 0) > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= o.washA!;
    ctx.drawImage(tint(k, im, o.wash), rx, ry, rw, rh);
  }
  ctx.restore();
  ctx.restore();
  return artPoints(k, x, y, height, anchor, o);
}
