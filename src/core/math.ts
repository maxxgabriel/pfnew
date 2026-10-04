export const TAU = Math.PI * 2;

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0→1 as x travels a→b, clamped. The basic unit of every scrubbed animation. */
export const seg = (x: number, a: number, b: number) => clamp((x - a) / (b - a));
/** 0→1→0 over a→b, peaking in the middle. */
export const bell = (x: number, a: number, b: number) => Math.sin(seg(x, a, b) * Math.PI);
export const mix = (a: number, b: number, t: number) => a * (1 - t) + b * t;

export const ease = {
  in2: (t: number) => t * t,
  in3: (t: number) => t * t * t,
  out2: (t: number) => 1 - (1 - t) * (1 - t),
  out3: (t: number) => 1 - (1 - t) ** 3,
  out5: (t: number) => 1 - (1 - t) ** 5,
  inOut2: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inOut3: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  inBack: (t: number, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  outElastic: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  outBounce: (t: number) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

/** Deterministic PRNG so every reload paints the same brushwork. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Smooth 1D value noise in [-1, 1]. */
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1;
}

export function fbm1(x: number, seed = 0, oct = 4) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * noise1(x * f, seed + i * 13);
    f *= 2;
    a *= 0.5;
  }
  return v;
}

/** Smooth 2D value noise in [-1, 1]. */
export function noise2(x: number, y: number, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => hash(a * 157.31 + b * 311.7 + seed * 71.9);
  return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy) * 2 - 1;
}

export type Pt = [number, number];

/** Catmull-Rom through points, then resampled to roughly even spacing. */
export function spline(points: Pt[], spacing: number): Pt[] {
  if (points.length < 2) return points.slice();
  const dense: Pt[] = [];
  const P = [points[0], ...points, points[points.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(d / (spacing * 0.5)));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      dense.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  dense.push(points[points.length - 1]);
  // resample evenly
  const out: Pt[] = [dense[0]];
  let acc = 0;
  for (let i = 1; i < dense.length; i++) {
    const a = dense[i - 1], b = dense[i];
    let d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let ax = a[0], ay = a[1];
    while (acc + d >= spacing) {
      const r = (spacing - acc) / d;
      ax = ax + (b[0] - ax) * r;
      ay = ay + (b[1] - ay) * r;
      out.push([ax, ay]);
      d -= spacing - acc;
      acc = 0;
    }
    acc += d;
  }
  const last = dense[dense.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > spacing * 0.2) out.push(last);
  return out;
}

/** Critically-damped follow, frame-rate independent. */
export const damp = (cur: number, target: number, lambda: number, dt: number) =>
  lerp(cur, target, 1 - Math.exp(-lambda * dt));
