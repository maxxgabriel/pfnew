import type { Frame } from '../core/frame';
import { TAU, ease, lerp, seg } from '../core/math';
import { C } from '../core/style';
import { alterShotP, drawAlter } from './alter';
import { drawDive } from './dive';
import { drawInk } from './ink';
import { drawMachine } from './machine';
import { drawMatch } from './match';
import { drawTitan, titanShotP } from './titan';

/*
 * THE FILM STRIP (after the signature).
 *
 * The signed page pulls back and turns out to be the last frame on a strip
 * of film: the key frames of every act sit to its left, sprocket holes top
 * and bottom. Swipe sideways to slide back through the film (vertical
 * scrolling is left alone, so the gesture never fights the scroll); keep
 * scrolling down and the strip springs back and the page fills the screen
 * again for the contact card.
 *
 * The other frames are rendered once into small offscreen canvases (one per
 * animation frame, so there's no hitch) and reused; the last frame, the
 * signed page, is drawn live so it keeps breathing.
 */

export const STRIP = { out: [18.76, 19.05] as const, back: [20.2, 20.55] as const };

const noop = () => {};
const no = () => false;
function sub(f: Frame, B: number, hold: Frame['hold'] = null): Frame {
  return { ...f, B, hold, vB: 0, dt: 0, crossed: no, crossedFwd: no, shake: noop, flash: noop };
}

/** the key frames, in film order (the signed page is drawn live after them) */
const SHOTS: ((f: Frame) => void)[] = [
  (f) => drawInk(sub(f, 2.35)),
  (f) => drawInk(sub(f, 3.6)),
  (f) => drawInk(sub(f, 4.86, { kind: 'thunder', p: 0.46 })),
  (f) => drawMachine(sub(f, 9.3)),
  (f) => drawTitan(sub(f, 11.98, { kind: 'titan', p: titanShotP('hero', 0.6) }), titanShotP('hero', 0.6)),
  (f) => drawAlter(sub(f, 12.63, { kind: 'alter', p: alterShotP('clash', 0.6) }), alterShotP('clash', 0.6)),
  (f) => drawAlter(sub(f, 12.63, { kind: 'alter', p: alterShotP('push', 0.5) }), alterShotP('push', 0.5)),
  (f) => drawDive(sub(f, 12.636, { kind: 'dive', p: 0.42 }), 0.42),
  (f) => drawMatch(sub(f, 16.9)),
];

let cache: { key: string; tiles: (HTMLCanvasElement | null)[] } | null = null;
const SCALE = 0.5;

function tile(f: Frame, i: number): HTMLCanvasElement | null {
  const key = `${f.w}x${f.h}`;
  if (cache?.key !== key) cache = { key, tiles: SHOTS.map(() => null) };
  return cache.tiles[i];
}

/** render at most one missing tile per frame */
function fillOne(f: Frame) {
  if (!cache) return;
  const i = cache.tiles.indexOf(null);
  if (i < 0) return;
  const c = document.createElement('canvas');
  c.width = Math.ceil(f.w * SCALE);
  c.height = Math.ceil(f.h * SCALE);
  const g = c.getContext('2d')!;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  g.fillStyle = '#000';
  g.fillRect(0, 0, f.w, f.h);
  try {
    SHOTS[i]({ ...f, ctx: g });
  } catch {
    /* a frame that can't draw out of context just stays black */
  }
  cache.tiles[i] = c;
}

/** warm the cache ahead of time (call while the reader is near the end) */
export function warmStrip(f: Frame) {
  tile(f, 0);
  fillOne(f);
}

// the sideways drag: an offset in frames, with a little inertia
let pan = 0, vel = 0, dragging = false, lastX = 0, lastT = 0;
export function stripPointer(type: 'down' | 'move' | 'up', x: number, t: number, active: boolean, w: number) {
  if (!active) {
    dragging = false;
    return;
  }
  const pitch = w * 0.62;
  if (type === 'down') {
    dragging = true;
    lastX = x;
    lastT = t;
    vel = 0;
  } else if (type === 'move' && dragging) {
    const dx = (x - lastX) / pitch;
    pan += dx;
    vel = dx / Math.max(0.008, t - lastT);
    lastX = x;
    lastT = t;
  } else if (type === 'up') dragging = false;
}

/** k 0..1: how far out from the page we are (1 = the whole strip) */
export function stripK(B: number): number {
  return ease.inOut2(seg(B, STRIP.out[0], STRIP.out[1])) * (1 - ease.inOut2(seg(B, STRIP.back[0], STRIP.back[1])));
}

export function drawStrip(f: Frame, drawPage: (f: Frame) => void) {
  const { ctx, w, h, dt } = f;
  const k = stripK(f.B);
  warmStrip(f);
  // inertia when let go, and a spring home as the strip closes
  if (!dragging) {
    pan += vel * dt;
    vel *= Math.exp(-4 * dt);
  }
  const n = SHOTS.length;
  pan = Math.min(n, Math.max(0, pan));
  if (k < 0.999) pan = lerp(pan, 0, Math.min(1, dt * 6 * (1 - k)));
  // the camera: frame size and spacing
  const s = lerp(1, 0.56, k);
  const fw = w * s, fh = h * s;
  const pitch = fw + w * 0.06 * k;
  const cx = w / 2, cy = h * lerp(0.5, 0.46, k);
  // the strip itself: black film with sprocket holes
  if (k > 0.001) {
    ctx.fillStyle = '#0d0c0b';
    ctx.fillRect(0, 0, w, h);
    const band = fh * 0.14;
    ctx.fillStyle = '#1b1916';
    ctx.fillRect(0, cy - fh / 2 - band, w, fh + band * 2);
    const hole = band * 0.42;
    ctx.fillStyle = '#0d0c0b';
    const step = hole * 2.2;
    const off = ((pan * pitch) % step + step) % step;
    for (let x = -step + off; x < w + step; x += step) {
      for (const y of [cy - fh / 2 - band / 2, cy + fh / 2 + band / 2]) {
        ctx.beginPath();
        ctx.roundRect(x - hole / 2, y - hole * 0.6, hole, hole * 1.2, hole * 0.25);
        ctx.fill();
      }
    }
  }
  // the frames: the page is last (index n); earlier frames to its left
  for (let i = 0; i <= n; i++) {
    const x = cx + (i - n + pan) * pitch;
    if (x + fw / 2 < 0 || x - fw / 2 > w) continue;
    ctx.save();
    ctx.translate(x - fw / 2, cy - fh / 2);
    ctx.beginPath();
    ctx.rect(0, 0, fw, fh);
    ctx.clip();
    if (i === n) {
      ctx.scale(s, s);
      drawPage(f);
    } else {
      const c = tile(f, i);
      if (c) ctx.drawImage(c, 0, 0, fw, fh);
      else {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, fw, fh);
      }
    }
    ctx.restore();
  }
  // a nudge the first time it opens: the strip wants to be swiped
  if (k > 0.98 && Math.abs(pan) < 0.02 && !dragging) {
    const a = 0.5 + 0.5 * Math.sin(f.t * 3);
    ctx.save();
    ctx.globalAlpha = 0.6 * a;
    ctx.fillStyle = C.paper;
    const y = cy + fh / 2 + fh * 0.14 + h * 0.035;
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + d * w * 0.06, y);
      ctx.lineTo(w / 2 + d * w * 0.03, y - h * 0.01);
      ctx.lineTo(w / 2 + d * w * 0.03, y + h * 0.01);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(w / 2, y, h * 0.006, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
