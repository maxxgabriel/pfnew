/**
 * Playhead maths.
 *
 * Every spread past the third has several beats inside one page — he walks,
 * *then* trips, *then* collapses — so the recurring job is not easing but
 * carving a sub-range out of the page's 0–1 playhead and re-normalising it.
 * That is `track`, and it is the only thing in here that matters.
 */

export const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

/**
 * A beat inside a spread: re-maps `t` so that `from`→0 and `to`→1, clamped
 * outside. Beats are written as absolute positions on the page rather than
 * durations, because when a shot is retimed what you actually want to say is
 * "the trip happens a bit later", not "the walk lasts 0.04 longer" — and
 * durations force you to fix up every beat after the one you touched.
 */
export const track = (t: number, from: number, to: number) =>
  clamp01((t - from) / Math.max(to - from, 1e-6));

/** Smoothstep. Ease in and out — the default for anything moving in space. */
export const smooth = (n: number) => {
  const x = clamp01(n);
  return x * x * (3 - 2 * x);
};

/** Accelerates. For falling, and for pushing into something. */
export const easeIn = (n: number) => {
  const x = clamp01(n);
  return x * x;
};

/** Decelerates. For arriving, settling, coming to rest. */
export const easeOut = (n: number) => {
  const x = clamp01(n);
  return 1 - (1 - x) * (1 - x);
};

/** Linear interpolation. */
export const mix = (a: number, b: number, n: number) => a + (b - a) * n;

/**
 * Rises to 1 at the midpoint and falls back to 0 — one there-and-back pass.
 * For anything that happens and then undoes itself: a wince, an impact
 * shudder, the pen dipping in and out of frame.
 */
export const pulse = (n: number) => {
  const x = clamp01(n);
  return 1 - Math.abs(x * 2 - 1);
};
