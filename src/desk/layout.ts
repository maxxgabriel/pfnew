/*
 * The desk (round 29): on a wide screen with a mouse, the film is a sheet of
 * paper lying on the animator's desk, and a camera moves over it — it opens
 * on the desk and pushes into the sheet, eases back to show the desk when the
 * reader stops, and pulls back at the end to reveal the finished drawing.
 * Between those moments the film fills the screen as it always did.
 */
/** desktop only: wide and not touch (a tablet in landscape keeps the plain film) */
const fine = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function deskOn(w: number, h: number) {
  return fine && !reduced && w >= 1000 && w / h >= 1.3;
}
