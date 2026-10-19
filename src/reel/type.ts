import { font } from '../core/style';

/*
 * TYPE helpers shared by the chapters that dive through letters.
 * Counters are measured from the real glyph, so a dive lands in the hole
 * whatever font is showing.
 */

export const PX = 300;
export interface Hole { x: number; y: number; r: number }

const holes = new Map<string, Hole>();
/** the centre and radius of a letter's enclosed counter (relative to its centre), at PX */
export function counterOf(ch: string, fam: string): Hole {
  const key = `${ch}|${fam}|${document.fonts?.check?.(`${PX}px ${fam}`) ?? ''}`;
  const got = holes.get(key);
  if (got) return got;
  const W = PX * 1.4, H = PX * 1.4;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.font = font(PX, fam);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(ch, W / 2, H / 2);
  const d = g.getImageData(0, 0, W, H).data;
  const seen = new Uint8Array(W * H);
  const stack: number[] = [];
  const empty = (i: number) => d[i * 4 + 3] < 128;
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i] || !empty(i)) continue;
    seen[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < W * H; i++) if (!seen[i] && empty(i)) { sx += i % W; sy += (i / W) | 0; n++; }
  const hole = n > 20 ? { x: sx / n - W / 2, y: sy / n - H / 2, r: Math.sqrt(n / Math.PI) } : { x: 0, y: -PX * 0.1, r: PX * 0.06 };
  holes.set(key, hole);
  return hole;
}

