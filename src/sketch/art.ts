import manifest from '../assets/sketch/manifest.json';
import { canvas } from '../core/sprites';
import { hurry, queue } from './load';

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

const files = import.meta.glob('../assets/sketch/*.webp', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
/** the order the film first needs each sheet (scripts: grep the chapters in reel order); others load last */
const FIRST_USE = ['still', 'ib_wake', 'curious', 'firststep', 'idle', 'walk8', 'run8', 'sprint8', 'moonwalk6', 'chase', 'eraser', 'popup', 'roto', 'rubberhose', 'runoff', 'style_chalk', 'style_clay', 'style_comic', 'style_pixel', 'style_water', 'acro', 'fall', 'hero', 'ib_rise', 'home', 'leap', 'ride', 'brushprop', 'surf', 'wave', 'swim', 'whale', 'bye', 'comedy', 'escape', 'saber', 'saberdraw', 'saberlock', 'swing', 'broom', 'broom_wink', 'closeup', 'hat', 'paint', 'extra', 'firetornado', 'ftkick', 'powerup', 'ib_stand', 'ib_turn', 'ib_offer', 'sign', 'turnA', 'turnB'];
// a restyled twin (style-key) loads just after its ink drawing
const prioOf = (k: string) => { const tw = /^[a-z]+-/.test(k); const i = FIRST_USE.indexOf(k.replace(/^[a-z]+-/, '').replace(/_\d+$/, '')); return (i < 0 ? 100 : i) + (tw ? 0.5 : 0); };
const SRC: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) SRC[path.split('/').pop()!.replace('.webp', '')] = url;

interface Meta { w: number; h: number; foot: [number, number]; face: number; top: number }
const M = manifest as unknown as Record<string, Meta>;

// one face width per sheet (the median), so a cycle doesn't pulse in size
const sheetFace = new Map<string, number>();
{
  const by = new Map<string, number[]>();
  for (const [k, m] of Object.entries(M)) {
    const s = k.replace(/_\d+$/, '');
    if (!by.has(s)) by.set(s, []);
    by.get(s)!.push(m.face);
  }
  for (const [s, v] of by) sheetFace.set(s, v.sort((a, b) => a - b)[Math.floor(v.length / 2)]);
}
const faceOf = (k: string) => sheetFace.get(k.replace(/_\d+$/, '')) ?? M[k].face;

export type PoseKey = string;
/** the film's clock, so every drawing can boil a little by default (set once a frame) */
let clock = 0;
export const setPoseClock = (t: number) => { clock = t; };
const imgs = new Map<string, HTMLImageElement>();
/** the desk's drawings (wide screens only: src/desk) are queued by the desk itself, never on a phone */
const DESK = /^(scrap|stick|pencil|prop)\d_/;
export function preloadPoses() {
  for (const k of Object.keys(SRC)) if (!imgs.has(k) && !DESK.test(k)) imgs.set(k, queue(SRC[k], prioOf(k)));
}
/** queue one drawing at a given priority (lower loads sooner) */
export function queueArt(k: string, prio: number) {
  if (k in SRC && !imgs.has(k)) imgs.set(k, queue(SRC[k], prio));
}
export function hasPose(k: string) {
  return k in SRC && k in M;
}
function img(k: string) {
  if (!imgs.has(k)) { preloadPoses(); queueArt(k, 100); }
  const im = imgs.get(k);
  if (im && im.complete && im.naturalWidth) return im;
  if (k in SRC) hurry(SRC[k]);
  return null;
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

/**
 * Per-sheet size corrections, so his head is the same size in every drawing
 * (the face-width measure is fooled by hair across the face, profiles and
 * the small figures on the reference sheet). Tuned on scripts/pose-lineup.html.
 */
const SIZE: Record<string, number> = {
  curious: 1.25, calm: 1.25, wink: 1.25, confident: 1.25, serious: 1.25,
  stand: 1.15, reach: 1.15, rest: 1.15,
  walk8: 0.95, run8: 0.87, sprint8: 0.76, moonwalk6: 0.9,
  idle: 1.1, saberdraw: 1.12, saber: 0.9, firetornado: 0.86, powerup: 0.95,
};
const sizeOf = (k: string) => SIZE[k.replace(/_\d+$/, '')] ?? 1;

/** the scale that makes this pose's face `face` pixels wide */
export const poseScale = (k: string, face: number) => (face / faceOf(k)) * sizeOf(k);

/** how tall the pose stands above its foot point, in screen pixels at this face width */
export function poseHeight(k: string, face: number) {
  const m = M[k];
  return m ? (m.foot[1] - m.top) * poseScale(k, face) : 0;
}

/** draw pose `k` with its foot point at (x, y), its face `face` pixels wide */
export function drawPose(ctx: CanvasRenderingContext2D, k: string, x: number, y: number, face: number, o: PoseOpts = {}) {
  // in a styled act, his restyled twin of this drawing (if there is one), at the ink drawing's height
  const st = styledTwin(k);
  if (st) return drawPose(ctx, st, x, y, twinFace(k, st, face), { ...o, boil: o.boil ?? 0.004 });
  const m = M[k];
  const im = m && img(k);
  if (!m || !im) return;
  const s = poseScale(k, face);
  ctx.save();
  let bx = 0, by = 0, br = 0;
  const boil = o.boil ?? 0.006;
  if (boil) {
    const step = Math.floor((o.t ?? clock) * 8);
    const h1 = Math.sin(step * 12.9898) * 43758.5453, h2 = Math.sin(step * 78.233) * 12543.123;
    bx = ((h1 - Math.floor(h1)) - 0.5) * boil * face;
    by = ((h2 - Math.floor(h2)) - 0.5) * boil * face * 0.6;
    br = ((h1 * 3 - Math.floor(h1 * 3)) - 0.5) * boil * 0.12;
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

/** a drawing's image once it has loaded (null until then; asking moves it up the queue) */
export const artImage = (k: string) => (M[k] ? img(k) : null);

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

/** where pose `k`'s light-blade runs (hilt end first), on screen, drawn like drawPose(ctx, k, x, y, face, o) */
export function bladeOf(k: string, x: number, y: number, face: number, o: PoseOpts = {}): [[number, number], [number, number]] | null {
  const st = styledTwin(k);
  if (st) return bladeOf(st, x, y, twinFace(k, st, face), o);
  const m = M[k] as Meta & { blade?: [number, number, number, number] };
  if (!m?.blade) return null;
  const s = poseScale(k, face), sq = o.squash ?? 1;
  const sx = (o.flip ? -1 : 1) * s / Math.sqrt(sq), sy = s * sq;
  const c = Math.cos(o.rot ?? 0), sn = Math.sin(o.rot ?? 0);
  const at = (px: number, py: number): [number, number] => {
    const lx = (px - m.foot[0]) * sx, ly = (py - m.foot[1]) * sy;
    return [x + lx * c - ly * sn, y + lx * sn + ly * c];
  };
  // every blade is the same length (the drawings' cyan can be clipped where a sheet was split): run it from the hilt along its line
  const dx = m.blade[2] - m.blade[0], dy = m.blade[3] - m.blade[1], l = Math.hypot(dx, dy) || 1;
  const BL = 1.6 * faceOf(k);
  return [at(m.blade[0], m.blade[1]), at(m.blade[0] + (dx / l) * BL, m.blade[1] + (dy / l) * BL)];
}

/** draw a drawing (a prop like the hat) with its foot point at (x, y), `width` pixels wide */
export function drawArtFoot(ctx: CanvasRenderingContext2D, k: string, x: number, y: number, width: number, rot = 0) {
  const m = M[k];
  const im = m && img(k);
  if (!m || !im) return;
  const s = width / m.w;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.drawImage(im, -m.foot[0], -m.foot[1]);
  ctx.restore();
}

/** the top of a pose's drawing above its foot point, in screen pixels (for putting things on his head) */
export function poseTop(k: string, face: number) {
  const m = M[k];
  return m ? (m.foot[1] - m.top) * poseScale(k, face) : 0;
}

/** a drawing's size in its own pixels (for props that have no face to scale by) */
export function artSize(k: string): [number, number] {
  const m = M[k];
  return m ? [m.w, m.h] : [1, 1];
}

/** a drawing's figure height (from its foot point up to its top ink), in its own pixels */
export function figHeight(k: string) {
  const m = M[k];
  return m ? Math.max(1, m.foot[1] - m.top) : 1;
}

/** draw drawing `k` at a fixed pixel scale, its local point `anchor` (default: the foot) at (x, y) */
export function drawFig(ctx: CanvasRenderingContext2D, k: string, x: number, y: number, scale: number, o: { anchor?: [number, number]; flip?: boolean; rot?: number; tint?: string; alpha?: number } = {}) {
  // in a styled act, its twin, scaled to the same height and sharing its anchor point proportionally
  const st = styledTwin(k);
  if (st) {
    const a = M[k], b = M[st];
    const r = (a.foot[1] - a.top) / Math.max(1, b.foot[1] - b.top);
    const anchor: [number, number] | undefined = o.anchor ? [b.foot[0] + (o.anchor[0] - a.foot[0]) / r, b.foot[1] + (o.anchor[1] - a.foot[1]) / r] : undefined;
    return drawFig(ctx, st, x, y, scale * r, { ...o, anchor });
  }
  const m = M[k];
  const im = m && img(k);
  if (!m || !im) return;
  const [ax, ay] = o.anchor ?? m.foot;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.flip ? -scale : scale, scale);
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.drawImage(o.tint ? tinted(k, o.tint, im) : im, -ax, -ay);
  ctx.restore();
}

/** where drawing `k`'s local point p lands on screen when drawn with drawFig(.., x, y, scale, o) */
export function figPoint(k: string, p: [number, number], x: number, y: number, scale: number, o: { anchor?: [number, number]; flip?: boolean; rot?: number } = {}): [number, number] {
  const m = M[k];
  if (!m) return [x, y];
  const [ax, ay] = o.anchor ?? m.foot;
  const lx = (p[0] - ax) * scale * (o.flip ? -1 : 1), ly = (p[1] - ay) * scale;
  const c = Math.cos(o.rot ?? 0), s = Math.sin(o.rot ?? 0);
  return [x + lx * c - ly * s, y + lx * s + ly * c];
}

/** a drawing's raw manifest entry (for the extra points some sheets carry: blade) */
export const meta = (k: string) => M[k] as (Meta & { blade?: [number, number, number, number] }) | undefined;

/**
 * In-betweens: where a scene cuts from one key drawing straight to another at beat `at`,
 * `ib(pose, to, L, at, key)` swaps in the two drawn in-betweens (key_0, key_1) for the first
 * `span` beats after the switch, so he moves through the change instead of popping.
 */
export function ib(pose: string, to: string, L: number, at: number, key: string, span = 0.16): string {
  if (pose !== to || L < at || L >= at + span) return pose;
  const k = `${key}_${L < at + span / 2 ? 0 : 1}`;
  return hasPose(k) ? k : pose;
}

/* ------------------------------------------------------------ the other art styles */

/** the five other styles he can break into, and a flash colour for each */
export const STYLES = ['pixel', 'water', 'clay', 'chalk', 'comic'] as const;
export type Style = (typeof STYLES)[number];
const STYLE_FLASH: Record<Style, string> = { pixel: '#2bff88', water: '#2bd4ff', clay: '#ffd23a', chalk: '#f4f1e6', comic: '#ff2e63' };

/**
 * A style moment: for beats [from, to) he is drawn as `styleKey` (a drawing in another art style)
 * instead of the ink drawing `inkPose`, matched to the ink drawing's height so he doesn't change size.
 * He glitches in and out: sliced into three bands that jump sideways, with a flash of the style's
 * colour. Returns true when it drew him (the caller skips the ink drawing then).
 */
export function styleMoment(
  ctx: CanvasRenderingContext2D, w: number, h: number, L: number, from: number, to: number,
  style: Style, styleKey: string, inkPose: string, x: number, y: number, face: number,
  o: { flip?: boolean; rot?: number; t?: number } = {},
): boolean {
  if (L < from || L >= to || !hasPose(styleKey) || !img(styleKey)) return false;
  const t = o.t ?? clock;
  const span = Math.min(0.12, (to - from) * 0.25);
  const edge = Math.min(L - from, to - L);
  const glitch = edge < span ? 1 - edge / span : 0;
  const sc = (poseHeight(inkPose, face) || face * 2.5) / figHeight(styleKey);
  const fh = figHeight(styleKey) * sc;
  const top = y - fh * 1.08, bandH = (y - top) / 3;
  for (let b = 0; b < 3; b++) {
    const jx = glitch * face * 0.5 * Math.sin(b * 2.7 + Math.floor(t * 24));
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - face * 5, top + b * bandH, face * 10, bandH + 1);
    ctx.clip();
    drawFig(ctx, styleKey, x + jx, y, sc, { flip: o.flip, rot: o.rot });
    ctx.restore();
  }
  if (glitch > 0.6) {
    ctx.save();
    ctx.globalAlpha = (glitch - 0.6) * 0.45;
    ctx.fillStyle = STYLE_FLASH[style];
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  return true;
}

/* ------------------------------------------------------------ an art style per act */

/** the acts' art styles: every drawing of him in a styled act is swapped for its twin `${style}-${key}` */
export type ActStyle = 'pixel' | 'water' | 'clay' | 'chalk' | 'comic' | 'hose';
let actStyle: ActStyle | null = null;
/** set by the conductor for each act (null: his own ink) */
export const setActStyle = (s: ActStyle | null) => { actStyle = s; };
export const getActStyle = () => actStyle;
function styledTwin(k: string): string | null {
  if (!actStyle || k.includes('-')) return null;
  const tw = `${actStyle}-${k}`;
  return tw in M && tw in SRC ? tw : null;
}
/** the face width that draws the twin exactly as tall as the ink drawing would be */
function twinFace(k: string, tw: string, face: number) {
  const want = poseHeight(k, face);
  const s = want / Math.max(1, M[tw].foot[1] - M[tw].top);
  return (s * faceOf(tw)) / sizeOf(tw);
}
