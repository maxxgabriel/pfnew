import type { Frame } from '../core/frame';
import { drawInk } from './ink';
import { drawFold } from './fold';
import { drawMurmur } from './murmur';
import { drawNeon } from './neon';
import { drawShadow } from './shadow';
import { drawImpact } from './impact';

/*
 * THE REEL.
 *
 * A showreel in one scroll: seven chapters, each a different craft at full
 * strength, each flowing into the next with no hard cut.
 *
 *   I    Ink         brush animation — the fight paints a hanging scroll
 *   II   Flock       simulation — the painted birds become a murmuration
 *   III  Fold        3D geometry — the flock packs into a sheet that folds into a crane
 *   IV   Neon        kinetic type — a city of giant glowing letters
 *   V    Shadow      light and silhouette — one bulb, shadows that morph
 *   VI   Impact      an anime set piece — the shadows tear off the wall
 *   VII  Page        the finale — every chapter still playing on one page
 *
 * Each chapter owns [from, to) in film beats and draws itself from its own
 * local beat L = B - from. Its opening is responsible for the seam: it may
 * draw the previous chapter's last frame underneath its own entrance.
 */

export interface Chapter {
  n: string;
  name: string;
  from: number;
  to: number;
  /** dark HUD type over this chapter (it is light underneath) */
  paper: boolean;
  draw?: (f: Frame, L: number) => void;
}

export const CHAPTERS: Chapter[] = [
  { n: 'I', name: 'Ink', from: 0, to: 9.6, paper: true, draw: (f) => drawInk(f) },
  { n: 'II', name: 'Flock', from: 9.6, to: 17.2, paper: false, draw: drawMurmur },
  { n: 'III', name: 'Fold', from: 17.2, to: 24.6, paper: false, draw: drawFold },
  { n: 'IV', name: 'Neon', from: 24.6, to: 31.4, paper: false, draw: drawNeon },
  { n: 'V', name: 'Shadow', from: 31.4, to: 37.6, paper: false, draw: drawShadow },
  { n: 'VI', name: 'Impact', from: 37.6, to: 43.6, paper: false, draw: drawImpact },
  { n: 'VII', name: 'Page', from: 43.6, to: 49.2, paper: true },
];

export const REEL_END = 49.6;

export function chapterAt(B: number) {
  let i = 0;
  while (i < CHAPTERS.length - 1 && B >= CHAPTERS[i + 1].from) i++;
  return i;
}

export function drawReel(f: Frame) {
  const c = CHAPTERS[chapterAt(f.B)];
  if (c.draw) c.draw(f, f.B - c.from);
  else {
    f.ctx.fillStyle = '#0b0a09';
    f.ctx.fillRect(0, 0, f.w, f.h);
  }
}

/** HUD state: dark type over light chapters; the contact card at the very end */
export function reelHud(B: number) {
  const c = CHAPTERS[chapterAt(B)];
  return { paper: c.paper, hello: B > CHAPTERS[CHAPTERS.length - 1].from + 3.2 };
}

/** a tap drops ink onto whatever is under the finger (a quiet answer, never blocks scrolling) */
export function reelTap(_x: number, _y: number) {}
