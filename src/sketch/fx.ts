/** Bold, deterministic ink effects for a scroll-driven film on cream paper. */
import { TAU, clamp, lerp, ease, hash, noise1, type Pt } from '../core/math';

export function speedWedges(ctx: CanvasRenderingContext2D, w: number, h: number, fx: number, fy: number, k: number, t: number, color = '#1b1714', n = 7): void {
  ctx.save();
  const strength = clamp(k), count = Math.floor(clamp(n, 0, 9));
  if (strength > 0 && w > 0 && h > 0) {
    ctx.fillStyle = color;
    const alpha = ctx.globalAlpha, step = Math.floor(t * 12);
    const hole = Math.min(w, h) * 0.18;
    for (let i = 0; i < count; i++) {
      const angle = TAU * (i + 0.35) / count + (hash(i * 19 + step * 7) - 0.5) * 0.09;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const ex = dx > 0 ? (w - fx) / dx : dx < 0 ? -fx / dx : Infinity;
      const ey = dy > 0 ? (h - fy) / dy : dy < 0 ? -fy / dy : Infinity;
      const edge = Math.min(ex, ey);
      if (edge <= hole) continue;
      const tail = edge + Math.min(w, h) * 0.04;
      const tip = Math.max(hole, edge - (edge - hole) * strength * lerp(0.7, 1, hash(i + 31)));
      const half = Math.min(w, h) * lerp(0.025, 0.055, hash(i + 71));
      ctx.globalAlpha = alpha * strength * lerp(0.65, 1, hash(i * 11 + step));
      ctx.beginPath();
      ctx.moveTo(fx + dx * tip, fy + dy * tip);
      ctx.lineTo(fx + dx * tail - dy * half, fy + dy * tail + dx * half);
      ctx.lineTo(fx + dx * tail + dy * half, fy + dy * tail - dx * half);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

export function impactFrame(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, mode: 'invert' | 'spikes', fx = w / 2, fy = h / 2, seed = 1): void {
  ctx.save();
  const strength = clamp(k);
  if (strength > 0 && w > 0 && h > 0) {
    ctx.globalAlpha *= strength;
    ctx.globalCompositeOperation = mode === 'invert' ? 'difference' : 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    if (mode === 'spikes') {
      ctx.fillStyle = '#1b1714';
      const count = 7 + Math.floor(hash(seed) * 3);
      const reach = Math.hypot(w, h) + Math.hypot(fx - w / 2, fy - h / 2);
      for (let i = 0; i < count; i++) {
        const angle = TAU * (i + hash(seed + 9)) / count;
        const spread = lerp(0.1, 0.22, hash(seed + i * 13));
        const inner = Math.min(w, h) * lerp(0.035, 0.13, hash(seed + i * 17));
        ctx.beginPath();
        ctx.moveTo(fx + Math.cos(angle) * inner, fy + Math.sin(angle) * inner);
        ctx.lineTo(fx + Math.cos(angle - spread) * reach, fy + Math.sin(angle - spread) * reach);
        ctx.lineTo(fx + Math.cos(angle + spread) * reach, fy + Math.sin(angle + spread) * reach);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

export function smear(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, width: number, color: string, alpha = 1): void {
  ctx.save();
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (width > 0 && alpha > 0) {
    ctx.translate(from[0], from[1]);
    ctx.rotate(Math.atan2(to[1] - from[1], to[0] - from[0]));
    ctx.globalAlpha *= clamp(alpha);
    ctx.fillStyle = color;
    const radius = width / 2, tail = width * 0.045;
    ctx.beginPath();
    ctx.moveTo(0, -tail);
    ctx.lineTo(length, -radius);
    ctx.arc(length, 0, radius, -TAU / 4, TAU / 4);
    ctx.lineTo(0, tail);
    ctx.closePath();
    ctx.fill();
    // Keep the three erased brush gaps inside the painted silhouette.
    ctx.clip();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = width * 0.035;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * width * 0.19;
      ctx.beginPath();
      ctx.moveTo(length * (0.22 + i * 0.1), offset * 0.35);
      ctx.lineTo(length * (0.82 + i * 0.04), offset);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function inkSplash(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, k: number, seed: number, color = '#1b1714'): void {
  ctx.save();
  const radius = Math.max(0, r) * ease.out3(clamp(k));
  if (radius > 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 48; i++) {
      const angle = TAU * i / 48;
      const wobble = 1 + 0.22 * noise1(Math.cos(angle) * 3 + seed, seed) + 0.13 * noise1(Math.sin(angle) * 4, seed + 11);
      const px = x + Math.cos(angle) * radius * wobble;
      const py = y + Math.sin(angle) * radius * wobble;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const count = 3 + Math.floor(hash(seed + 3) * 3);
    for (let i = 0; i < count; i++) {
      const angle = TAU * (i + hash(seed + i * 7) * 0.5) / count;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const reach = radius * lerp(1.8, 3, hash(seed + i * 19));
      const bend = radius * (hash(seed + i * 23) - 0.5) * 0.8;
      ctx.moveTo(x + dx * radius * 0.55 - dy * radius * 0.25, y + dy * radius * 0.55 + dx * radius * 0.25);
      ctx.quadraticCurveTo(x + dx * radius * 1.5 - dy * bend, y + dy * radius * 1.5 + dx * bend, x + dx * reach, y + dy * reach);
      ctx.quadraticCurveTo(x + dx * radius * 1.3 - dy * (bend - radius * 0.18), y + dy * radius * 1.3 + dx * (bend - radius * 0.18), x + dx * radius * 0.55 + dy * radius * 0.25, y + dy * radius * 0.55 - dx * radius * 0.25);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.restore();
}

export function shockRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, k: number, color: string, width: number): void {
  ctx.save();
  const progress = clamp(k);
  if (r > 0 && width > 0 && progress < 1) {
    ctx.globalAlpha *= 1 - progress;
    ctx.strokeStyle = color;
    ctx.lineWidth = width * (1 - progress);
    ctx.beginPath();
    ctx.arc(x, y, r * lerp(0.2, 1, progress), 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

export function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number, color = '#000'): void {
  ctx.save();
  if (strength > 0 && w > 0 && h > 0) {
    ctx.globalAlpha *= clamp(strength);
    // Normalize to an ellipse so portrait edges darken evenly.
    ctx.translate(w / 2, h / 2);
    ctx.scale(w / 2, h / 2);
    const gradient = ctx.createRadialGradient(0, 0, 0.35, 0, 0, Math.SQRT2);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, color);
    ctx.fillStyle = gradient;
    ctx.fillRect(-1, -1, 2, 2);
  }
  ctx.restore();
}

export function shake(t: number, amp: number, seed = 1): Pt {
  const step = Math.floor(t * 24);
  return [noise1(step, seed) * amp, noise1(step, seed + 37) * amp];
}

export function flash(ctx: CanvasRenderingContext2D, w: number, h: number, a: number, color = '#ffffff'): void {
  ctx.save();
  if (a > 0) {
    ctx.globalAlpha *= clamp(a);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

export function letterbox(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, color = '#000'): void {
  ctx.save();
  const height = h * 0.12 * clamp(k);
  if (height > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, height);
    ctx.fillRect(0, h - height, w, height);
  }
  ctx.restore();
}
