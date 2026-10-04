import { TAU, noise1, noise2, rng } from './math';

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}

/** Soft radial glow, pre-rendered so blooms never need shadowBlur. */
const glowCache = new Map<string, HTMLCanvasElement>();
export function glow(color: string, size = 128, core = 0.0): HTMLCanvasElement {
  const key = color + size + core;
  const hit = glowCache.get(key);
  if (hit) return hit;
  const { c, ctx } = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  if (core > 0) g.addColorStop(core, color);
  g.addColorStop(Math.max(core, 0.25), withAlpha(color, 0.45));
  g.addColorStop(0.6, withAlpha(color, 0.12));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowCache.set(key, c);
  return c;
}

export function withAlpha(hex: string, a: number) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h = w,
  rot = 0,
) {
  if (rot === 0) {
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/**
 * Ink blot: an irregular wash with a darker, feathered rim — the shape ink
 * makes when it lands on damp paper and keeps spreading.
 */
export function blot(seed: number, size = 384, color = '#121010'): HTMLCanvasElement {
  const { c, ctx } = canvas(size, size);
  const r = rng(seed);
  const cx = size / 2, cy = size / 2;
  for (let layer = 0; layer < 7; layer++) {
    const R = size * (0.24 + layer * 0.03);
    ctx.beginPath();
    const s = seed * 10 + layer;
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * TAU;
      const k = 1 + 0.22 * noise1(Math.cos(a) * 2 + s, s) + 0.1 * noise1(a * 6 + s, s + 1);
      const x = cx + Math.cos(a) * R * k, y = cy + Math.sin(a) * R * k;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = withAlpha(color, layer === 0 ? 0.9 : 0.16 + r() * 0.08);
    ctx.fill();
  }
  // a few satellite droplets
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU, d = size * (0.36 + r() * 0.1);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, size * (0.006 + r() * 0.014), 0, TAU);
    ctx.fillStyle = withAlpha(color, 0.7);
    ctx.fill();
  }
  return c;
}

/** Film grain tiles; cycling through them reads as live grain. */
export function grainTiles(n = 4, size = 160): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let k = 0; k < n; k++) {
    const { c, ctx } = canvas(size, size);
    const img = ctx.createImageData(size, size);
    const r = rng(99 + k);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    out.push(c);
  }
  return out;
}

/** Washi: fibres and mottling, tiled under everything that is paper. */
export function paperTile(size = 512, base = '#ece6d6'): HTMLCanvasElement {
  const { c, ctx } = canvas(size, size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // tileable-ish mottling: sample on a torus
      const m = noise2(x / 60, y / 60, 3) * 5 + noise2(x / 9, y / 9, 7) * 2.5 + (Math.random() - 0.5) * 6;
      img.data[i] += m;
      img.data[i + 1] += m;
      img.data[i + 2] += m * 0.9;
    }
  }
  ctx.putImageData(img, 0, 0);
  const r = rng(5);
  ctx.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = r() * size, y = r() * size, a = r() * TAU, l = 4 + r() * 18;
    ctx.strokeStyle = r() > 0.5 ? 'rgba(120,100,70,0.10)' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.5 + r() * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  return c;
}

/** Halftone dots for the machine's poster backgrounds. */
export function halftone(size: number, dot: number, color: string): HTMLCanvasElement {
  const { c, ctx } = canvas(size, size);
  ctx.fillStyle = color;
  const step = size / 4;
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      ctx.beginPath();
      ctx.arc(x * step + step / 2 + (y % 2) * (step / 2), y * step + step / 2, dot, 0, TAU);
      ctx.fill();
    }
  return c;
}
