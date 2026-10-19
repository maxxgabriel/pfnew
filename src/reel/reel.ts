import { type SeamChapter, drawSeam } from '../sketch/seams';
import type { Frame } from '../core/frame';
import { setWallSources } from '../sketch/wall';
import { drawRun } from '../sketch/run';
import { drawLight } from '../sketch/light';
import { drawChase } from '../sketch/chase';
import { HM, SIGN_WINDOW, drawHome } from '../sketch/home';
import { type ActStyle, getActStyle, setActStyle, setPoseClock } from '../sketch/art';
import { drawStill } from '../sketch/still';
import { drawSea } from '../sketch/sea';

/*
 * THE SKETCH (round 18; docs/STORY.md v11).
 *
 * A little ink drawing wants to move; a red spark keeps teasing it forward,
 * and every time it chases the spark it breaks into a new kind of animation.
 *
 *   I Still · II Run · III Wave · IV Light (moon) · V Chase · VI Home
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
  { n: 'I', name: 'Still', from: 0, to: 3.8, paper: true, draw: drawStill },
  { n: 'II', name: 'Run', from: 3.8, to: 12.8, paper: true, draw: drawRun },
  { n: 'III', name: 'Wave', from: 12.8, to: 17.8, paper: false, draw: drawSea },
  { n: 'IV', name: 'Light', from: 17.8, to: 25.8, paper: false, draw: drawLight },
  { n: 'V', name: 'Chase', from: 25.8, to: 34.8, paper: false, draw: drawChase },
  { n: 'VI', name: 'Home', from: 34.8, to: 48.8, paper: true, draw: drawHome },
];

export const REEL_END = 49.2;

/**
 * Key moments that play themselves: once the playhead is inside one and the
 * reader lets go of the scroll, the page scrolls itself through it at the speed
 * it was made for (src/main.ts). [chapter, local from, local to, beats a second]
 */
const AUTO_LOCAL: [string, number, number, number][] = [
  ['Still', 0.12, 1.5, 0.9], // the one-line birth
  ['Run', 8.0, 9.0, 0.8], // the rubber-hose gag and the fall
  ['Wave', 2.0, 5.0, 1.0], // the wave stands up, the tube, the moon launch
  ['Light', 4.75, 5.95, 0.9], // the clashes (and the bullet-time hold inside them)
  ['Light', 6.9, 8.0, 0.8], // the cut and the escape
  ['Chase', 2.3, 2.4, 1.0], // (on the desk) the knock and the escape round the mug: a hold inside
  ['Chase', 5.0, 5.7, 0.8], // the catch
  ['Chase', 7.45, 9.0, 1.1], // the slide home
  ['Home', 2.15, 5.9, 1.0], // the orbit, the eyes, the fire kick
  ['Home', 12.0, 13.6, 1.0], // the storyboard wall (a hold), then into the seal: the loop
];
export const AUTO = AUTO_LOCAL.map(([n, a, b, rate]) => {
  const c = CHAPTERS.find((ch) => ch.name === n)!;
  return { from: c.from + a, to: c.from + b, rate };
});
/** the self-playing moment the playhead is in, if any */
export function autoAt(B: number) {
  return AUTO.find((s) => B >= s.from && B < s.to - 0.01) ?? null;
}

/** every act between the book-ends is drawn in its own art style (world layers share the chapter's style) */
const ACT_STYLE: Record<string, ActStyle> = { Run: 'pixel', Wave: 'water', Light: 'comic', Chase: 'hose' };

export function chapterAt(B: number) {
  let i = 0;
  while (i < CHAPTERS.length - 1 && B >= CHAPTERS[i + 1].from) i++;
  return i;
}

// the storyboard wall's panels: each chapter at its best moment (local beats)
const WALL_AT: Record<string, number> = { Still: 2.6, Run: 5.3, Wave: 3.3, Light: 4.62, Chase: 2.0, Home: 4.9 };
// (each panel in its act's own art style)
setWallSources(CHAPTERS.map((c) => ({
  draw: (f: Frame, L: number) => { const was = getActStyle(); setActStyle(ACT_STYLE[c.name] ?? null); c.draw!(f, L); setActStyle(was); },
  from: c.from, at: WALL_AT[c.name] ?? 2,
})));

export function drawReel(f: Frame) {
  setPoseClock(f.t);
  // between chapters, the seam draws both and passes from one to the other (src/sketch/seams.ts)
  if (drawSeam(f, CHAPTERS as SeamChapter[], ACT_STYLE)) return;
  const c = CHAPTERS[chapterAt(f.B)];
  setActStyle(ACT_STYLE[c.name] ?? null);
  if (c.draw) c.draw(f, f.B - c.from);
  else {
    f.ctx.fillStyle = '#0b0a09';
    f.ctx.fillRect(0, 0, f.w, f.h);
  }
  setActStyle(null);
}

/** HUD state: dark type over light chapters; the contact card at the very end */
export function reelHud(B: number) {
  const c = CHAPTERS[chapterAt(B)];
  const home = CHAPTERS[CHAPTERS.length - 1].from;
  return {
    paper: c.paper,
    hello: B > home + HM.offer && B < home + HM.loop[0] + 0.2,
    /** the page waits for your signature (a pad over the page takes the touch there) */
    sign: B > home + SIGN_WINDOW[0] && B < home + SIGN_WINDOW[1],
  };
}

