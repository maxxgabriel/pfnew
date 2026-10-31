// Small timing helpers. Everything is authored in beats (b): the scroll position, not the clock.
export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** progress of b across [a, z], clamped to 0..1 */
export const seg = (b: number, a: number, z: number) => clamp((b - a) / (z - a));
/** 1 while b is inside [a, z) */
export const inside = (b: number, a: number, z: number) => b >= a && b < z;
export const smooth = (x: number) => x * x * (3 - 2 * x);
export const outQuad = (x: number) => 1 - (1 - x) * (1 - x);
export const outCubic = (x: number) => 1 - (1 - x) ** 3;
export const outQuart = (x: number) => 1 - (1 - x) ** 4;
export const inQuart = (x: number) => x ** 4;
export const inCubic = (x: number) => x ** 3;
export const inOutQuart = (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2);
export const inOutCubic = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
export const outSine = (x: number) => Math.sin((x * Math.PI) / 2);
export const outBack = (x: number, s = 1.70158) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;
/** a decaying wobble after an impulse at x = 0 (x in beats) */
export const ring = (x: number, f = 10, d = 4) => (x < 0 ? 0 : Math.exp(-x * d) * Math.cos(x * f));
/** jumps to 1 at x = 0 and decays */
export const hit = (x: number, d = 6) => (x < 0 ? 0 : Math.exp(-x * d));
/** 0 → 1 → 0 across 0..1 */
export const arch = (x: number) => (x <= 0 || x >= 1 ? 0 : Math.sin(x * Math.PI));
/** frame of a cycle: n frames, `per` frames per beat */
export const frame = (x: number, n: number, per = 4) => ((Math.floor(x * per) % n) + n) % n;
/** quadratic bezier */
export const bez = (a: number, c: number, z: number, t: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * z;
/** cheap deterministic noise in -1..1 */
export const noise = (x: number) => {
  const i = Math.floor(x), f = x - i, h = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
  return lerp(h(i), h(i + 1), smooth(f));
};
/** the clock groove: the page keeps time while you watch, at this tempo */
export const BPM = 118;
export const beatsOf = (t: number) => (t * BPM) / 60;
