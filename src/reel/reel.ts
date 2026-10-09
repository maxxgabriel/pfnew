import type { Frame } from '../core/frame';
import { drawRun } from '../sketch/run';
import { drawRide } from '../sketch/ride';
import { drawLight } from '../sketch/light';
import { drawChase } from '../sketch/chase';
import { drawHome } from '../sketch/home';
import { setPoseClock } from '../sketch/art';
import { drawStill } from '../sketch/still';

/*
 * THE SKETCH (round 18; docs/STORY.md v11).
 *
 * A little ink drawing wants to move; a red spark keeps teasing it forward,
 * and every time it chases the spark it breaks into a new kind of animation.
 *
 *   I    Still   a drawing that can only tremble, and a spark on its nose
 *   II   Run     one unbroken shot: first steps, a walk, a run, off the edge of the page
 *   III  Fold    off the edge, a fall, a paper crane to ride
 *   IV   Light   one bulb, a shadow with a mind of its own, a light-blade duel
 *   V    Chase   a broom, a wizard's hat, the Spark on wings across the sunset
 *   VI   Home    the spark stamped down as the seal; the brush held out to you
 *
 * Each chapter owns [from, to) in film beats and draws itself from its own
 * local beat L = B - from. Its opening is responsible for the seam.
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
  { n: 'I', name: 'Still', from: 0, to: 5.6, paper: true, draw: drawStill },
  { n: 'II', name: 'Run', from: 5.6, to: 14.6, paper: true, draw: drawRun },
  { n: 'III', name: 'Fold', from: 14.6, to: 23.6, paper: false, draw: drawRide },
  { n: 'IV', name: 'Light', from: 23.6, to: 31.6, paper: false, draw: (f, L) => drawLight(f, L) },
  { n: 'V', name: 'Chase', from: 31.6, to: 39.6, paper: false, draw: drawChase },
  { n: 'VI', name: 'Home', from: 39.6, to: 50.6, paper: true, draw: drawHome },
];

export const REEL_END = 51.0;

export function chapterAt(B: number) {
  let i = 0;
  while (i < CHAPTERS.length - 1 && B >= CHAPTERS[i + 1].from) i++;
  return i;
}

export function drawReel(f: Frame) {
  setPoseClock(f.t);
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
  return { paper: c.paper, hello: B > CHAPTERS[CHAPTERS.length - 1].from + 5.9 };
}

/** a tap drops ink onto whatever is under the finger (a quiet answer, never blocks scrolling) */
export function reelTap(_x: number, _y: number) {}
