/*
 * THE CAMERA over the desk (round 29).
 *
 * The desk is a plane; the film is a sheet lying on it at [0, w] × [0, h]
 * (desk units are the screen's CSS pixels, so at rest the sheet fills the
 * screen exactly). A shot is where the camera looks on that plane, how far
 * back it is, and how it is tilted and rolled. One perspective matrix per
 * frame places both canvases (CSS matrix3d, so the GPU does the moving), and
 * the same matrix maps the mouse back onto the desk.
 */

export interface Shot {
  /** the point on the desk at the middle of the screen */
  cx: number;
  cy: number;
  /** how far back: 1 = the sheet fills the screen, 2 = half as big */
  s: number;
  /** degrees: tilt toward the horizon (the camera lowers), roll about the lens */
  tilt: number;
  roll: number;
}

export const rest = (w: number, h: number): Shot => ({ cx: w / 2, cy: h / 2, s: 1, tilt: 0, roll: 0 });

export function mix(a: Shot, b: Shot, k: number): Shot {
  const l = (x: number, y: number) => x + (y - x) * k;
  // distance mixes in log space, so a dolly feels even
  return { cx: l(a.cx, b.cx), cy: l(a.cy, b.cy), s: Math.exp(l(Math.log(a.s), Math.log(b.s))), tilt: l(a.tilt, b.tilt), roll: l(a.roll, b.roll) };
}

export const isRest = (c: Shot, w: number, h: number) =>
  Math.abs(c.s - 1) < 1e-3 && Math.abs(c.tilt) < 0.02 && Math.abs(c.roll) < 0.02 && Math.abs(c.cx - w / 2) < 0.3 && Math.abs(c.cy - h / 2) < 0.3;

/** the lens: the perspective distance, in CSS pixels (shorter = wider, more dramatic) */
export const lens = (w: number, h: number) => Math.max(w, h) * 1.15;

/** desk point → screen, for this shot */
export function matrix(c: Shot, w: number, h: number): DOMMatrix {
  const P = lens(w, h);
  const pm = new DOMMatrix();
  pm.m34 = -1 / P;
  // dolly back along the lens so that the sheet's scale at the look point is 1/s
  const dz = P * (c.s - 1);
  const cam = new DOMMatrix()
    .translate(w / 2, h / 2)
    .multiply(pm)
    .translate(0, 0, -dz)
    .rotate(c.tilt, 0, 0)
    .rotate(0, 0, c.roll)
    .translate(-c.cx, -c.cy);
  return cam;
}

/** screen point → desk point (the mouse on the desk), for a matrix from `matrix` */
export function unproject(m: DOMMatrix, sx: number, sy: number): [number, number] {
  // a plane z = 0 maps to the screen by a homography: invert its 3×3
  const a = m.m11, b = m.m21, c = m.m41;
  const d = m.m12, e = m.m22, f = m.m42;
  const g = m.m14, h = m.m24, i = m.m44;
  const A = e * i - f * h, B = c * h - b * i, C = b * f - c * e;
  const D = f * g - d * i, E = a * i - c * g, F = c * d - a * f;
  const G = d * h - e * g, H = b * g - a * h, I = a * e - b * d;
  const W = G * sx + H * sy + I;
  return [(A * sx + B * sy + C) / W, (D * sx + E * sy + F) / W];
}
