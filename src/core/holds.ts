import { ACT, CHAPTERS } from './frame';
import { deskOn } from '../desk/layout';

/**
 * HOLDS.
 *
 * The thunder moments need time the film doesn't have, so the film holds:
 * while the reader scrolls through a hold, film time stays at `at` and the
 * hold's own progress runs 0→1. Everything authored in film beats keeps its
 * timing; the scroll track just gets longer.
 */
export type HoldKind = 'play' | 'thunder' | 'titan' | 'dash' | 'alter' | 'dive' | 'meteor' | 'powers' | 'sign' | 'bullet' | 'wall' | 'tumble' | 'escape';
export interface Hold { at: number; len: number; kind: HoldKind }

/** film beat where the machine's letters become TITAN (the ball is in the cannon) */
export const TITAN_AT = 11.98;

/** film beat where the Alter act plays */
export const ALTER_AT = 12.63;
/** film beat of the dive through MATCH, straight after ALTER */
export const DIVE_AT = 12.636;


/** film beat where the pull-back (Powers of Ten) starts: the ball is in the net */
export const POWERS_AT = 18.7;
/** film beat of the signature, straight after the pull-back lands on the page */
export const SIGN_AT = 18.72;

const at = (name: string, local: number) => CHAPTERS.find((c) => c.name === name)!.at + local + 0.002;
/** the duel freezes on its second clash and the camera walks round the locked blades (src/sketch/light.ts) */
export const BULLET_AT = at('Light', 5.2);
/** after the peek, the camera pulls back from the page onto the storyboard wall (src/sketch/home.ts) */
export const WALL_AT = at('Home', 12.05);

/** on the desk (PC): he runs off the drawing, tumbles across the desk and into the paint (src/desk/story.ts) */
export const TUMBLE_AT = at('Run', 8.78);
/** on the desk: at the wink he notices the desk, knocks on the page and flies out round the mug */
export const ESCAPE_AT = at('Chase', 2.32);

/** the desk's two set pieces exist only where the desk does (decided once, at load) */
const desk = typeof window === 'object' && deskOn(window.innerWidth, window.innerHeight);
export const HOLDS: Hold[] = [
  ...(desk ? [{ at: TUMBLE_AT, len: 2.8, kind: 'tumble' as const }] : []),
  ...(desk ? [{ at: ESCAPE_AT, len: 3.6, kind: 'escape' as const }] : []),
  { at: BULLET_AT, len: 2.6, kind: 'bullet' as const },
  { at: WALL_AT, len: 3.4, kind: 'wall' as const },
].sort((a, b) => a.at - b.at); // (toFilm walks them in film order)
/** whether the desk's holds are in the film (fixed at load) */
export const DESK_HOLDS = desk;
/** (INK v5: the holds below belonged to the worlds that were cut; kept for reference) */
export const OLD_HOLDS: Hold[] = [
  // the letters assemble into Green's robot, which punches the ball out of the page
  { at: TITAN_AT, len: 4.8, kind: 'titan' },
  // the Alter act plays in the night sky between the machine and the match
  { at: ALTER_AT, len: 5.6, kind: 'alter' },
  // MATCH slams into the night sky and the camera dives through the A
  { at: DIVE_AT, len: 1.2, kind: 'dive' },
  { at: 15.0, len: 0.95, kind: 'dash' },
  // #10's shooting star: the ball up into space, the leap, the volley, the blade of light
  { at: 15.55, len: 4.4, kind: 'meteor' },
  // out of the net and out of every world, back to the page
  { at: POWERS_AT, len: 6.4, kind: 'powers' },
  // on the page: the moves rise out of the first circle and are inked as one signature
  { at: SIGN_AT, len: 3.6, kind: 'sign' },
];

export const RAW_END = ACT.END + HOLDS.reduce((a, h) => a + h.len, 0);

export function toFilm(raw: number): { film: number; hold: { kind: HoldKind; p: number } | null } {
  let shift = 0;
  for (const h of HOLDS) {
    const start = h.at + shift;
    if (raw < start) return { film: raw - shift, hold: null };
    if (raw < start + h.len) return { film: h.at, hold: { kind: h.kind, p: (raw - start) / h.len } };
    shift += h.len;
  }
  return { film: raw - shift, hold: null };
}

export function toRaw(film: number): number {
  let shift = 0;
  for (const h of HOLDS) if (h.at < film) shift += h.len;
  return film + shift;
}
