/*
 * Where things are in the film right now, in screen (= sheet) pixels, for the
 * desk's story moments to pick up from (src/desk/story.ts). The chapters
 * write it as they draw; the desk reads it after them in the same frame.
 */
export interface Spot { x: number; y: number; size: number }
export const live: {
  /** the hero's feet in Run, and his face width there */
  runHero: Spot | null;
  /** the Eraser's foot in Run, and its height */
  runEraser: Spot | null;
  /** the hero's feet on the broom in Chase, and his face width */
  chaseHero: Spot | null;
  /** (PC) the mouse on the sheet, in the film's pixels, while it is being moved; written by src/desk/desk.ts */
  pointer: [number, number] | null;
} = { runHero: null, runEraser: null, chaseHero: null, pointer: null };
