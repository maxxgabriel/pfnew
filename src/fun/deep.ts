/*
 * The point deepest inside a glyph's ink: the centre of the biggest circle that fits in its strokes.
 * A camera that flies into a letter aims here, so the letter's colour fills the screen with the
 * least zoom and no paper peeks round the edges. Measured once per glyph on a canvas: draw it, run
 * a two-pass distance transform over the ink, take the maximum.
 * Units are em, from the glyph's origin (the left end of its advance, on the baseline).
 */
export type Deep = { x: number; y: number; r: number; adv: number };
const cache = new Map<string, Deep>();

/** minY: ignore the top part of the ink (0..1 of its height), e.g. where someone is standing on it */
export function deepPoint(ch: string, family: string, weight = '400', stretch = 'normal', minY = 0): Deep {
  const key = [ch, family, weight, stretch, minY].join('|');
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 160, pad = 4;
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  const font = () => {
    g.font = `${weight} ${S}px ${family}`;
    if ('fontStretch' in g) (g as unknown as { fontStretch: string }).fontStretch = stretch;
  };
  font();
  const m = g.measureText(ch);
  const L = Math.ceil(m.actualBoundingBoxLeft) + pad, A = Math.ceil(m.actualBoundingBoxAscent) + pad;
  const w = Math.max(1, L + Math.ceil(m.actualBoundingBoxRight) + pad), h = Math.max(1, A + Math.ceil(m.actualBoundingBoxDescent) + pad);
  cv.width = w; cv.height = h;
  font(); // resizing resets the context
  g.fillStyle = '#000';
  g.fillText(ch, L, A);
  const px = g.getImageData(0, 0, w, h).data;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = px[i * 4 + 3] > 127 ? 1e9 : 0;
  const D = Math.SQRT2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x) v = Math.min(v, d[i - 1] + 1);
    if (y) { v = Math.min(v, d[i - w] + 1); if (x) v = Math.min(v, d[i - w - 1] + D); if (x < w - 1) v = Math.min(v, d[i - w + 1] + D); }
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
    if (y < h - 1) { v = Math.min(v, d[i + w] + 1); if (x < w - 1) v = Math.min(v, d[i + w + 1] + D); if (x) v = Math.min(v, d[i + w - 1] + D); }
    d[i] = v;
  }
  let best = 0, bx = L, by = A;
  const y0 = Math.floor(pad + (h - 2 * pad) * minY);
  for (let y = y0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = d[y * w + x];
    if (v > best && v < 1e8) { best = v; bx = x; by = y; }
  }
  const out = { x: (bx - L) / S, y: (by - A) / S, r: best / S, adv: m.width / S };
  cache.set(key, out);
  return out;
}

/**
 * The camera move that flies into a point: at v = 0 nothing moves; at v = 1 the point sits in the
 * middle of the screen, zoomed by z. The zoom is exponential (it feels like constant speed) and eased
 * in, so the dive starts gently and rushes at the end. Returns a CSS transform (origin 0 0).
 */
export function flyInto(px: number, py: number, z: number, v: number, W: number, H: number) {
  const e = v * v * (1.6 - 0.6 * v);
  const s = Math.pow(z, e), q = z > 1 ? (s - 1) / (z - 1) : 0;
  const x = px + (W / 2 - px) * q, y = py + (H / 2 - py) * q;
  return `translate(${x - s * px}px, ${y - s * py}px) scale(${s})`;
}
