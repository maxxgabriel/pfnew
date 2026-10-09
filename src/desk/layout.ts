/** The desk (round 28): on a wide screen the picture's sides are a desk. Null on a phone or a narrow window. */
export interface Desk {
  /** width of each margin beside the picture's composition column */
  mw: number;
  colL: number;
  colR: number;
}
/** desktop only: wide and not touch (a tablet in landscape keeps the plain film) */
const fine = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
export function deskOf(w: number, h: number): Desk | null {
  if (!fine || w < 1000 || w / h < 1.3) return null;
  const col = h * 0.7;
  const mw = (w - col) / 2;
  return { mw, colL: mw, colR: w - mw };
}
