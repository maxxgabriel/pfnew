import { ACT } from './frame';

/**
 * HOLDS.
 *
 * The thunder moments need time the film doesn't have, so the film holds:
 * while the reader scrolls through a hold, film time stays at `at` and the
 * hold's own progress runs 0→1. Everything authored in film beats keeps its
 * timing; the scroll track just gets longer.
 */
export type HoldKind = 'dragon' | 'thunder' | 'swallow' | 'titan' | 'dash' | 'alter' | 'ride' | 'powers';
export interface Hold { at: number; len: number; kind: HoldKind }

/** film beat where the ink dragon rises (the flood has just taken the sky) */
export const DRAGON_AT = 2.25;
/** film beat where the dragon swallows the pearl at the meeting of the beams */
export const SWALLOW_AT = 5.95;

/** film beat where the machine's letters become TITAN (the ball is in the cannon) */
export const TITAN_AT = 11.98;

/** film beat where the Alter act plays */
export const ALTER_AT = 12.63;

/** film beat where the night ride plays: straight after ALTER, as the star falls */
export const RIDE_AT = 12.64;

/** film beat where the pull-back (Powers of Ten) starts: the ball is in the net */
export const POWERS_AT = 18.7;

export const HOLDS: Hold[] = [
  // the dragon comes up out of the flood, rounds the moon and brings the pearl down
  { at: DRAGON_AT, len: 3.0, kind: 'dragon' },
  { at: 4.86, len: 1.25, kind: 'thunder' },
  { at: SWALLOW_AT, len: 2.0, kind: 'swallow' },
  // the letters assemble into Green's robot, which punches the ball out of the page
  { at: TITAN_AT, len: 4.8, kind: 'titan' },
  // the Alter act plays in the night sky between the machine and the match
  { at: ALTER_AT, len: 14.7, kind: 'alter' },
  // Blot chases the falling star through the city to the stadium
  { at: RIDE_AT, len: 5.2, kind: 'ride' },
  { at: 15.0, len: 0.95, kind: 'dash' },
  // out of the net and out of every world, back to the page
  { at: POWERS_AT, len: 5.5, kind: 'powers' },
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
