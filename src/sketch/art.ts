import manifest from '../assets/sketch/manifest.json';
import { canvas } from '../core/sprites';

/*
 * THE SKETCH'S DRAWINGS.
 *
 * Every pose is a cut-out drawing made with the image tool from the owner's
 * character sheet (scripts/gen-sketch.sh → scripts/cutout-sheet.py), inlined
 * into the page. The manifest gives each one its size, the ground point under
 * the middle of the head (`foot`) and the width of the face, which is the one
 * measure that stays the same in every pose — so `drawPose` takes a face
 * width in screen pixels and the character is the same size whatever he does.
 *
 * Effects are made from the drawing itself: a shadow is a tinted copy, a
 * boil is the drawing nudged on a 8 fps step, the brush drawing him in is
 * the drawing revealed under a ragged moving edge.
 */

const files = import.meta.glob('../assets/sketch/*.webp', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;
const SRC: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) SRC[path.split('/').pop()!.replace('.webp', '')] = url;

interface Meta { w: number; h: number; foot: [number, number]; face: number; top: number }
const M = manifest as unknown as Record<string, Meta>;

// one face width per sheet (the median), so a cycle doesn't pulse in size
const sheetFace = new Map<string, number>();
{
  const by = new Map<string, number[]>();
  for (const [k, m] of Object.entries(M)) {
    const s = k.includes('_') ? k.split('_')[0] : k;
    if (!by.has(s)) by.set(s, []);
    by.get(s)!.push(m.face);
  }
  for (const [s, v] of by) sheetFace.set(s, v.sort((a, b) => a - b)[Math.floor(v.length / 2)]);
}
const faceOf = (k: string) => sheetFace.get(k.includes('_') ? k.split('_')[0] : k) ?? M[k].face;

export type PoseKey = string;
const imgs = new Map<string, HTMLImageElement>();
export function preloadPoses() {
  for (const k of Object.keys(SRC)) {
    if (imgs.has(k)) continue;
    const im = new Image();
    im.decoding = 'async';
    im.src = SRC[k];
    imgs.set(k, im);
  }
}
export function hasPose(k: string) {
  return k in SRC && k in M;
}
function img(k: string) {
  if (!imgs.has(k)) preloadPoses();
  const im = imgs.get(k);
  return im && im.complete && im.naturalWidth ? im : null;
}

export interface PoseOpts {
  /** face toward the left */
  flip?: boolean;
  alpha?: number;
  /** rotation about the foot point, radians */
  rot?: number;
  /** squash and stretch about the foot point: >1 taller */
  squash?: number;
  /** a flat colour silhouette instead of the drawing */
  tint?: string;
  /** reveal 0..1, top to bottom under a ragged brush edge (the brush drawing him in) */
  reveal?: number;
  /** ink boil: the drawing trembles on an 8 fps step, amount in face widths */
  boil?: number;
  t?: number;
}

const tints = new Map<string, HTMLCanvasElement>();
function tinted(k: string, col: string, im: HTMLImageElement) {
  const key = `${k}|${col}`;
  let c = tints.get(key);
  if (!c) {
    const o = canvas(im.naturalWidth, im.naturalHeight);
    o.ctx.drawImage(im, 0, 0);
    o.ctx.globalCompositeOperation = 'source-in';
    o.ctx.fillStyle = col;
    o.ctx.fillRect(0, 0, o.c.width, o.c.height);
    c = o.c;
    tints.set(key, c);
  }
  return c;
}

let revealC: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;

/** the scale that makes this pose's face `face` pixels wide */
export const poseScale = (k: string, face: number) => face / faceOf(k);

/** how tall the pose stands above its foot point, in screen pixels at this face width */
export function poseHeight(k: string, face: number) {
  const m = M[k];
  return m ? (m.foot[1] - m.top) * poseScale(k, face) : 0;
}

/** draw pose `k` with its foot point at (x, y), its face `face` pixels wide */
export function drawPose(ctx: CanvasRenderingContext2D, k: string, x: number, y: number, face: number, o: PoseOpts = {}) {
  const m = M[k];
  const im = m && img(k);
  if (!m || !im) return;
  const s = poseScale(k, face);
  ctx.save();
  let bx = 0, by = 0, br = 0;
  if (o.boil) {
    const step = Math.floor((o.t ?? 0) * 8);
    const h1 = Math.sin(step * 12.9898) * 43758.5453, h2 = Math.sin(step * 78.233) * 12543.123;
    bx = ((h1 - Math.floor(h1)) - 0.5) * o.boil * face;
    by = ((h2 - Math.floor(h2)) - 0.5) * o.boil * face * 0.6;
    br = ((h1 * 3 - Math.floor(h1 * 3)) - 0.5) * o.boil * 0.12;
  }
  ctx.translate(x + bx, y + by);
  if (o.rot || br) ctx.rotate((o.rot ?? 0) + br);
  const sq = o.squash ?? 1;
  ctx.scale((o.flip ? -1 : 1) * s / Math.sqrt(sq), s * sq);
  ctx.globalAlpha *= o.alpha ?? 1;
  const src: CanvasImageSource = o.tint ? tinted(k, o.tint, im) : im;
  const dx = -m.foot[0], dy = -m.foot[1];
  if (o.reveal !== undefined && o.reveal < 1) {
    if (o.reveal <= 0) { ctx.restore(); return; }
    // the drawing under a ragged edge travelling down it
    if (!revealC || revealC.c.width < m.w || revealC.c.height < m.h) revealC = canvas(Math.max(m.w, revealC?.c.width ?? 0), Math.max(m.h, revealC?.c.height ?? 0));
    const r = revealC.ctx;
    r.setTransform(1, 0, 0, 1, 0, 0);
    r.clearRect(0, 0, revealC.c.width, revealC.c.height);
    r.drawImage(src, 0, 0);
    r.globalCompositeOperation = 'destination-in';
    const edge = m.top + (m.h - m.top) * o.reveal;
    r.beginPath();
    r.moveTo(0, 0);
    r.lineTo(m.w, 0);
    for (let i = 12; i >= 0; i--) {
      const xx = (i / 12) * m.w;
      r.lineTo(xx, edge + Math.sin(i * 2.7 + o.reveal * 9) * m.h * 0.03);
    }
    r.closePath();
    r.fill();
    r.globalCompositeOperation = 'source-over';
    ctx.drawImage(revealC.c, 0, 0, m.w, m.h, dx, dy, m.w, m.h);
  } else ctx.drawImage(src, dx, dy);
  ctx.restore();
}

/** a pose's head centre relative to its foot point, in screen pixels (for aiming things at his face) */
export function headOf(k: string, face: number): [number, number] {
  const m = M[k];
  if (!m) return [0, -face * 2];
  const s = poseScale(k, face);
  return [0, -(m.foot[1] - m.top) * s * 0.78];
}

/** draw a drawing by its own box (close-ups): centred at (cx, cy), `width` pixels wide */
export function drawArt(ctx: CanvasRenderingContext2D, k: string, cx: number, cy: number, width: number, o: { alpha?: number; rot?: number; flip?: boolean } = {}) {
  const m = M[k];
  const im = m && img(k);
  if (!m || !im) return;
  const s = width / m.w;
  ctx.save();
  ctx.translate(cx, cy);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.flip ? -s : s, s);
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.drawImage(im, -m.w / 2, -m.h / 2);
  ctx.restore();
}
