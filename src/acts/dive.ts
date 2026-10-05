import type { Frame } from '../core/frame';
import { ease, lerp, seg } from '../core/math';
import { C, F, font } from '../core/style';

/*
 * THE DIVE (ALTER → the Match, in the `dive` hold).
 *
 * MATCH slams into the night sky one letter at a time, bigger than the
 * screen, white with a green drop like the broadcast's graphics. Then the
 * camera dives straight through the counter of the A: the letters become a
 * wall, the hole becomes a window, and the stadium is on the other side.
 * The counter is measured from the real glyph, so the dive always lands in
 * the hole whatever font is showing.
 */

const WORD = 'MATCH';
const THROUGH = 1; // the A
const PX = 300;

interface Hole { x: number; y: number; r: number; key: string }
let hole: Hole | null = null;

/** the centre and size of the letter's enclosed counter, relative to its centre/baseline middle, at PX */
function counterOf(ch: string, fam: string): Hole {
  const key = `${ch}|${fam}|${document.fonts?.check?.(`${PX}px ${fam}`) ?? ''}`;
  if (hole?.key === key) return hole;
  const W = PX * 1.4, H = PX * 1.4;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.font = font(PX, fam);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#000';
  g.fillText(ch, W / 2, H / 2);
  const d = g.getImageData(0, 0, W, H).data;
  // flood the outside from the border; transparent pixels it can't reach are counters
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
  for (let i = 0; i < W * H; i++) {
    if (!seen[i] && empty(i)) {
      sx += i % W;
      sy += (i / W) | 0;
      n++;
    }
  }
  hole = n > 20
    ? { x: sx / n - W / 2, y: sy / n - H / 2, r: Math.sqrt(n / Math.PI), key }
    : { x: 0, y: -PX * 0.1, r: PX * 0.06, key };
  return hole;
}

let lastP = -1;

export function drawDive(f: Frame, p: number) {
  const { ctx, w, h, t } = f;
  const S = Math.min(w, h);
  const prev = lastP;
  lastP = p;
  const hit = (q: number) => prev >= 0 && prev < q && p >= q && p - prev < 0.2;

  ctx.save();
  ctx.font = font(PX, F.display);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const widths = [...WORD].map((ch) => ctx.measureText(ch).width * 0.98);
  const total = widths.reduce((a, b) => a + b, 0);
  // the word fills the width
  const base = (w * 0.94) / total;
  const H = counterOf(WORD[THROUGH], F.display);
  // where the A sits in the word (word space: origin at the word's centre)
  let ax = -total / 2;
  for (let i = 0; i < THROUGH; i++) ax += widths[i];
  ax += widths[THROUGH] / 2;
  const target = { x: ax + H.x, y: H.y };
  // the dive: exponential, so it reads at a constant speed, into the counter
  const dk = ease.in3(seg(p, 0.5, 1));
  const need = (Math.hypot(w, h) * 1.15) / (H.r * base);
  const s = base * Math.exp(Math.log(need) * dk);
  // the word's centre on screen: at rest a touch above the middle; while diving, the counter is pulled to the centre
  const rest = { x: w / 2, y: h * 0.42 };
  const cx = lerp(rest.x + target.x * base, w / 2, ease.inOut2(seg(p, 0.45, 0.7)));
  const cy = lerp(rest.y + target.y * base, h * 0.42, ease.inOut2(seg(p, 0.45, 0.7)));
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.rotate(-0.04 * (1 - dk));
  ctx.translate(-target.x, -target.y);
  // the letters slam in, each from huge to its place
  let x = -total / 2;
  [...WORD].forEach((ch, i) => {
    const lx = x + widths[i] / 2;
    x += widths[i];
    const a0 = 0.04 + i * 0.075;
    const k = seg(p, a0, a0 + 0.1);
    if (k <= 0) return;
    if (hit(a0 + 0.1)) f.shake(S * 0.025);
    const sc = lerp(3.2, 1, ease.outBack(k, 1.8));
    ctx.save();
    ctx.translate(lx, 0);
    ctx.scale(sc, sc);
    ctx.globalAlpha = Math.min(1, k * 2.5);
    // the broadcast look: a green drop, a white face, an ink keyline
    ctx.lineJoin = 'round';
    // (the drop fades as we dive, so it never fills the hole)
    ctx.save();
    ctx.globalAlpha *= 1 - seg(dk, 0, 0.25);
    ctx.fillStyle = C.green;
    ctx.fillText(ch, PX * 0.05, PX * 0.05);
    ctx.restore();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = PX * 0.03;
    ctx.strokeText(ch, 0, 0);
    ctx.fillStyle = C.white;
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  // a red bar slashes under the word as the last letter lands
  const bar = ease.out3(seg(p, 0.38, 0.48));
  if (bar > 0) {
    ctx.fillStyle = C.red;
    ctx.fillRect(-total / 2 - PX * 0.1, PX * 0.42, (total + PX * 0.2) * bar, PX * 0.07);
  }
  ctx.restore();
  // a hint of speed as the dive accelerates
  if (dk > 0.2 && dk < 1) {
    ctx.save();
    ctx.globalAlpha = 0.35 * Math.sin(dk * Math.PI);
    ctx.strokeStyle = '#ffffff';
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + i * 0.37;
      const r0 = S * (0.5 + ((i * 0.618 + t) % 1) * 0.4);
      ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.cos(a) * r0, h * 0.42 + Math.sin(a) * r0);
      ctx.lineTo(w / 2 + Math.cos(a) * (r0 + S * 0.25), h * 0.42 + Math.sin(a) * (r0 + S * 0.25));
      ctx.stroke();
    }
    ctx.restore();
  }
}
