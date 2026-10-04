import { ACT } from './frame';

/**
 * HOLDS.
 *
 * The thunder moments need time the film doesn't have, so the film holds:
 * while the reader scrolls through a hold, film time stays at `at` and the
 * hold's own progress runs 0→1. Everything authored in film beats keeps its
 * timing; the scroll track just gets longer.
 */
export type HoldKind = 'thunder' | 'dash' | 'alter' | 'powers';
export interface Hold { at: number; len: number; kind: HoldKind }

/** film beat where the Alter act plays */
export const ALTER_AT = 12.63;

/** film beat where the pull-back (Powers of Ten) starts: the ball is in the net */
export const POWERS_AT = 18.7;

export const HOLDS: Hold[] = [
  { at: 4.86, len: 1.25, kind: 'thunder' },
  // the Alter act plays in the night sky between the machine and the match
  { at: ALTER_AT, len: 14.7, kind: 'alter' },
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
