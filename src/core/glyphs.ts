import type { Pt } from './math';

/**
 * Brush capitals for the name, written stroke by stroke in the order a hand
 * would write them. Each glyph lives in a box `w` wide and 1 tall (y down).
 */
export interface Glyph {
  w: number;
  strokes: Pt[][];
}

export const GLYPHS: Record<string, Glyph> = {
  M: {
    w: 0.92,
    strokes: [
      [[0.08, 0.97], [0.1, 0.5], [0.14, 0.05]],
      [[0.15, 0.04], [0.3, 0.42], [0.46, 0.74]],
      [[0.47, 0.74], [0.62, 0.4], [0.79, 0.03]],
      [[0.8, 0.05], [0.83, 0.52], [0.87, 0.98]],
    ],
  },
  A: {
    w: 0.82,
    strokes: [
      [[0.4, 0.02], [0.24, 0.48], [0.05, 0.98]],
      [[0.42, 0.04], [0.6, 0.5], [0.78, 0.97]],
      [[0.16, 0.66], [0.42, 0.62], [0.66, 0.6]],
    ],
  },
  X: {
    w: 0.82,
    strokes: [
      [[0.08, 0.03], [0.42, 0.5], [0.78, 0.98]],
      [[0.76, 0.04], [0.42, 0.48], [0.04, 0.97]],
    ],
  },
  G: {
    w: 0.88,
    strokes: [
      [[0.8, 0.2], [0.62, 0.05], [0.38, 0.04], [0.15, 0.19], [0.06, 0.5], [0.15, 0.82], [0.4, 0.97], [0.64, 0.93], [0.8, 0.74], [0.81, 0.55]],
      [[0.46, 0.56], [0.66, 0.55], [0.86, 0.55]],
    ],
  },
  B: {
    w: 0.78,
    strokes: [
      [[0.12, 0.03], [0.11, 0.5], [0.12, 0.97]],
      [[0.12, 0.04], [0.48, 0.03], [0.66, 0.14], [0.64, 0.34], [0.46, 0.47], [0.16, 0.49]],
      [[0.2, 0.49], [0.58, 0.5], [0.74, 0.64], [0.72, 0.86], [0.5, 0.97], [0.14, 0.96]],
    ],
  },
  R: {
    w: 0.78,
    strokes: [
      [[0.12, 0.03], [0.11, 0.5], [0.12, 0.97]],
      [[0.12, 0.04], [0.5, 0.03], [0.68, 0.15], [0.66, 0.36], [0.48, 0.48], [0.14, 0.5]],
      [[0.38, 0.5], [0.56, 0.72], [0.76, 0.98]],
    ],
  },
  I: { w: 0.32, strokes: [[[0.16, 0.03], [0.15, 0.5], [0.16, 0.97]]] },
  E: {
    w: 0.7,
    strokes: [
      [[0.13, 0.04], [0.12, 0.5], [0.13, 0.96]],
      [[0.13, 0.04], [0.4, 0.04], [0.66, 0.05]],
      [[0.15, 0.5], [0.36, 0.5], [0.56, 0.49]],
      [[0.14, 0.96], [0.42, 0.96], [0.7, 0.95]],
    ],
  },
  L: {
    w: 0.66,
    strokes: [
      [[0.13, 0.03], [0.12, 0.5], [0.13, 0.95]],
      [[0.13, 0.95], [0.4, 0.96], [0.66, 0.94]],
    ],
  },
};

/** Lay a word out as absolute strokes, each tagged with its writing order. */
export function layoutWord(word: string, x: number, y: number, size: number, track = 0.12) {
  const out: { pts: Pt[]; order: number; letter: number }[] = [];
  let cx = x;
  let order = 0;
  [...word].forEach((ch, li) => {
    const g = GLYPHS[ch];
    if (!g) {
      cx += size * 0.4;
      return;
    }
    for (const s of g.strokes) {
      out.push({ pts: s.map(([px, py]) => [cx + px * size, y + py * size] as Pt), order: order++, letter: li });
    }
    cx += (g.w + track) * size;
  });
  return { strokes: out, width: cx - x - track * size };
}

export function wordWidth(word: string, size: number, track = 0.12) {
  let w = 0;
  for (const ch of word) w += ((GLYPHS[ch]?.w ?? 0.4) + track) * size;
  return w - track * size;
}
