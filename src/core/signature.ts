import { type Pt } from './math';

/*
 * THE SIGNATURE.
 *
 * Every big movement in the film is secretly a pen stroke: the thunder's
 * zig-zag is the M, the machine ball's loop is the a, TITAN's punch is the
 * joining stroke, the crossing blades in ALTER are the x, #10's run and shot
 * are the flourish and the ball in the net is the full stop. Each of those
 * moves leaves a faint pen-line that lingers a beat too long (the clue); the
 * reveal draws the whole signature from the same strokes.
 *
 * Strokes are in a normalised box: x 0..1 across the whole signature, y 0..1
 * from the top of the tallest letter to the bottom of the flourish.
 */

export const STROKES: Record<'m' | 'a' | 'up' | 'x1' | 'x2' | 'flourish', Pt[]> = {
  // M: up, down to the middle, up, and down through the opponent
  m: [[0.02, 0.62], [0.1, 0.04], [0.17, 0.46], [0.26, 0.04], [0.29, 0.62]],
  // a: up to the top of the bowl, round it anticlockwise, back up and down the stem
  a: [[0.29, 0.62], [0.35, 0.5], [0.43, 0.42], [0.38, 0.4], [0.335, 0.47], [0.33, 0.57], [0.37, 0.625], [0.415, 0.58], [0.44, 0.43], [0.44, 0.55], [0.455, 0.62], [0.49, 0.6]],
  // the joining stroke: punched up, into the top of the x
  up: [[0.49, 0.6], [0.535, 0.38]],
  // x: the two blades, crossing
  x1: [[0.535, 0.38], [0.665, 0.63]],
  x2: [[0.665, 0.38], [0.535, 0.63]],
  // the flourish: out of the x, a long sweep back under the name, and out to the right
  flourish: [[0.535, 0.63], [0.47, 0.73], [0.33, 0.8], [0.15, 0.83], [0.06, 0.79], [0.16, 0.75], [0.42, 0.75], [0.68, 0.77], [0.86, 0.72]],
};
/** the full stop: the ball in the net */
export const DOT: Pt = [0.93, 0.68];

/** the pen-line's colour: warm white, the same in every world */
export const PEN = '#fff1cf';

/** map normalised stroke points into a box on screen */
export function inBox(pts: Pt[], x: number, y: number, w: number, h: number): Pt[] {
  return pts.map(([u, v]) => [x + u * w, y + v * h]);
}

/**
 * map the points of one stroke so its first point lands on `a` and its last on `b`; a stroke
 * whose ends are level (the M) keeps its proportions, times `tall`
 */
export function between(pts: Pt[], a: Pt, b: Pt, tall = 1): Pt[] {
  const p0 = pts[0], p1 = pts[pts.length - 1];
  const sx = (b[0] - a[0]) / (p1[0] - p0[0] || 1e-6);
  const sy = (b[1] - a[1]) / (p1[1] - p0[1] || 1e-6);
  // keep the stroke's proportions when its ends are level (the M): scale y by x
  const ky = Math.abs(p1[1] - p0[1]) < 0.02 ? Math.abs(sx) * tall : sy;
  return pts.map(([u, v]) => [a[0] + (u - p0[0]) * sx, a[1] + (v - p0[1]) * ky]);
}

/**
 * The lingering pen-line: a soft glow and a thin bright core along `pts`, drawn up to `upto`
 * (0..1 of its length) at opacity `a`.
 */
export function penTrail(ctx: CanvasRenderingContext2D, pts: Pt[], a: number, S: number, upto = 1) {
  if (a <= 0 || pts.length < 2 || upto <= 0) return;
  const shown = slice(pts, upto);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [wd, al] of [[S * 0.016, 0.12], [S * 0.007, 0.25], [Math.max(1, S * 0.0028), 0.85]] as const) {
    ctx.globalAlpha = a * al;
    ctx.strokeStyle = PEN;
    ctx.lineWidth = wd;
    ctx.beginPath();
    shown.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  ctx.restore();
}

/** the first `k` (0..1) of a polyline, by length */
export function slice(pts: Pt[], k: number): Pt[] {
  if (k >= 1) return pts;
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let left = total * Math.max(0, k);
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d >= left) {
      const f = d ? left / d : 0;
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]);
      return out;
    }
    left -= d;
    out.push(pts[i]);
  }
  return out;
}
