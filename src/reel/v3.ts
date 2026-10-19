/*
 * A very small 3D kit for the chapters that need real geometry: vectors, a
 * look-at camera with perspective, rotation about any line, and a painter's
 * list of flat-shaded triangles.
 */

export type V3 = [number, number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** rotate p by θ about the line through `a` with direction `d` (unit) — Rodrigues */
export function rotAbout(p: V3, a: V3, d: V3, th: number): V3 {
  const v = sub(p, a);
  const c = Math.cos(th), s = Math.sin(th);
  const kxv = cross(d, v);
  const kdv = dot(d, v);
  return add(a, [
    v[0] * c + kxv[0] * s + d[0] * kdv * (1 - c),
    v[1] * c + kxv[1] * s + d[1] * kdv * (1 - c),
    v[2] * c + kxv[2] * s + d[2] * kdv * (1 - c),
  ]);
}

/** rotations about the world axes */
export const rotX = (p: V3, a: number): V3 => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
export const rotY = (p: V3, a: number): V3 => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
export const rotZ = (p: V3, a: number): V3 => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];

export interface Cam3 {
  pos: V3;
  /** camera basis: right, up, forward */
  r: V3;
  u: V3;
  fw: V3;
  f: number;
  cx: number;
  cy: number;
}

/** a camera at `pos` looking at `at` (y is up), focal length f px, centred on (cx, cy) */
export function lookAt(pos: V3, at: V3, f: number, cx: number, cy: number, roll = 0): Cam3 {
  const fw = norm(sub(at, pos));
  let r = norm(cross(fw, [0, 1, 0]));
  let u = cross(r, fw);
  if (roll) {
    const c = Math.cos(roll), s = Math.sin(roll);
    const r2: V3 = [r[0] * c + u[0] * s, r[1] * c + u[1] * s, r[2] * c + u[2] * s];
    u = cross(r2, fw);
    r = r2;
  }
  return { pos, r, u, fw, f, cx, cy };
}

/** screen x, y and depth (null behind the camera) */
export function project(c: Cam3, p: V3): [number, number, number] | null {
  const v = sub(p, c.pos);
  const z = dot(v, c.fw);
  if (z < 1) return null;
  return [c.cx + (dot(v, c.r) * c.f) / z, c.cy - (dot(v, c.u) * c.f) / z, z];
}

export interface Tri {
  p: [V3, V3, V3];
  /** colour of the side facing the light's way, and of the back */
  front: string;
  back?: string;
  /** an extra multiplier on the shading (0..1) */
  dim?: number;
  /** stroke the edges (paper's crisp edge) */
  edge?: string;
}

const LIGHT = norm([-0.45, 0.8, 0.5]);

const rgbOf = (hex: string): V3 => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as V3;
const cache = new Map<string, V3>();
function rgb(hex: string) {
  let v = cache.get(hex);
  if (!v) cache.set(hex, (v = rgbOf(hex)));
  return v;
}

/** draw triangles far to near, flat shaded, both sides lit */
export function drawTris(ctx: CanvasRenderingContext2D, cam: Cam3, tris: Tri[], ambient = 0.58, tint?: { color: string; k: number }) {
  const list: { s: [number, number][]; d: number; col: string; edge?: string }[] = [];
  const tc = tint ? rgb(tint.color) : null;
  for (const t of tris) {
    const a = project(cam, t.p[0]), b = project(cam, t.p[1]), c = project(cam, t.p[2]);
    if (!a || !b || !c) continue;
    const n = norm(cross(sub(t.p[1], t.p[0]), sub(t.p[2], t.p[0])));
    const toCam = sub(cam.pos, t.p[0]);
    const facing = dot(n, toCam) > 0;
    const nn = facing ? n : mul(n, -1);
    const lit = ambient + (1 - ambient) * Math.max(0, dot(nn, LIGHT));
    const base = rgb(facing ? t.front : t.back ?? t.front);
    const k = lit * (t.dim ?? 1);
    let r = base[0] * k, g = base[1] * k, bl = base[2] * k;
    if (tc && tint) {
      r = r + (tc[0] - r) * tint.k;
      g = g + (tc[1] - g) * tint.k;
      bl = bl + (tc[2] - bl) * tint.k;
    }
    list.push({ s: [[a[0], a[1]], [b[0], b[1]], [c[0], c[1]]], d: (a[2] + b[2] + c[2]) / 3, col: `rgb(${r | 0},${g | 0},${bl | 0})`, edge: t.edge });
  }
  list.sort((p, q) => q.d - p.d);
  ctx.save();
  ctx.lineJoin = 'round';
  for (const t of list) {
    ctx.beginPath();
    ctx.moveTo(t.s[0][0], t.s[0][1]);
    ctx.lineTo(t.s[1][0], t.s[1][1]);
    ctx.lineTo(t.s[2][0], t.s[2][1]);
    ctx.closePath();
    ctx.fillStyle = t.col;
    ctx.fill();
    // a hairline of the same colour hides the seams between facets
    ctx.strokeStyle = t.edge ?? t.col;
    ctx.lineWidth = t.edge ? 1 : 0.8;
    ctx.stroke();
  }
  ctx.restore();
}
