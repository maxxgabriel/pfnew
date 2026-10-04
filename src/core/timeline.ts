import { ACT } from './frame';

/**
 * INTERLUDES.
 *
 * The film is authored in "film beats". Interludes are spliced in on top:
 * while one plays, the film holds its frame at `at` and the interlude runs
 * on its own 0→1 progress. Scrolling moves a "raw" playhead; this maps raw
 * to film and back, so nothing authored in film beats needs re-timing.
 */
export type InsertKind = 'manifesto' | 'scroll' | 'mural';
export interface Insert { at: number; len: number; kind: InsertKind; act: number }

export const INSERTS: Insert[] = [
  { at: 6.8, len: 1.7, kind: 'manifesto', act: 0 },
  { at: 7.95, len: 1.0, kind: 'scroll', act: 1 },
  { at: 12.7, len: 1.0, kind: 'scroll', act: 2 },
  { at: 17.36, len: 1.0, kind: 'scroll', act: 3 },
  { at: 25.58, len: 1.0, kind: 'scroll', act: 4 },
  { at: 30.62, len: 1.3, kind: 'mural', act: 5 },
];

export const RAW_END = ACT.END + INSERTS.reduce((a, i) => a + i.len, 0);

export interface Mapped { film: number; ins: Insert | null; p: number }

export function toFilm(raw: number): Mapped {
  let shift = 0;
  for (const ins of INSERTS) {
    const start = ins.at + shift;
    if (raw < start) return { film: raw - shift, ins: null, p: 0 };
    if (raw < start + ins.len) return { film: ins.at, ins, p: (raw - start) / ins.len };
    shift += ins.len;
  }
  return { film: raw - shift, ins: null, p: 0 };
}

export function toRaw(film: number): number {
  let shift = 0;
  for (const ins of INSERTS) if (ins.at < film) shift += ins.len;
  return film + shift;
}
