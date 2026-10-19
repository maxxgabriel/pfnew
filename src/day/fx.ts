import { TAU, clamp, hash, lerp } from '../core/math';
import { drawSprite, glow } from '../core/sprites';

/*
 * LIGHT AND WEATHER, drawn in code over the paintings.
 *
 * The anime-film look is half painting, half light: a star flare with long
 * rainbow streaks where the sun is, beams through the clouds, bloom on
 * anything bright, dust and petals catching the light. All of it additive,
 * all of it cheap (cached glow sprites, gradients, no canvas readback).
 */

/** a sun flare: hot core, a star of thin spikes, a long horizontal streak, ghosts along the axis */
export function flare(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, a: number, w: number, h: number, t: number) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  const breathe = 1 + Math.sin(t * 1.7) * 0.04;
  drawSprite(ctx, glow('#fff3c4', 256), x, y, s * 6 * breathe);
  drawSprite(ctx, glow('#ffffff', 128), x, y, s * 1.6);
  // the star: thin spikes at fixed angles, slowly turning
  const spikes = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4, 0.4, -1.2];
  spikes.forEach((ang, i) => {
    const L = s * (i < 2 ? 9 : i < 4 ? 5 : 3.5) * breathe;
    const r = ang + t * 0.02;
    const gr = ctx.createLinearGradient(x - Math.cos(r) * L, y - Math.sin(r) * L, x + Math.cos(r) * L, y + Math.sin(r) * L);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, 'rgba(255,250,235,0.85)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = gr;
    ctx.lineWidth = Math.max(1, s * (i < 2 ? 0.06 : 0.035));
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(r) * L, y - Math.sin(r) * L);
    ctx.lineTo(x + Math.cos(r) * L, y + Math.sin(r) * L);
    ctx.stroke();
  });
  // the long anamorphic streak with a rainbow edge
  const sw = w * 1.4;
  const band = (dy: number, col: string, al: number, th: number) => {
    const g2 = ctx.createLinearGradient(x - sw, 0, x + sw, 0);
    g2.addColorStop(0, 'rgba(0,0,0,0)');
    g2.addColorStop(0.5, col);
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a * al;
    ctx.fillStyle = g2;
    ctx.fillRect(x - sw, y + dy - th / 2, sw * 2, th);
  };
  band(-s * 0.12, 'rgba(255,90,140,0.9)', 0.35, s * 0.05);
  band(0, 'rgba(255,250,230,1)', 0.7, s * 0.06);
  band(s * 0.12, 'rgba(120,180,255,0.9)', 0.35, s * 0.05);
  // ghosts: soft discs along the line from the flare through the centre of the frame
  const cx = w / 2, cy = h / 2;
  const ghosts: [number, number, string][] = [[0.6, 0.5, '#9fd4ff'], [1.2, 0.9, '#ffb38a'], [1.6, 0.35, '#c7a4ff'], [2.1, 1.3, '#a6f0c8']];
  for (const [k, r, col] of ghosts) {
    const gx = x + (cx - x) * k, gy = y + (cy - y) * k;
    ctx.globalAlpha = a * 0.12;
    drawSprite(ctx, glow(col, 64), gx, gy, s * r * 2.2);
  }
  ctx.restore();
}

/** beams of light fanning down from a point (through clouds, a window) */
export function rays(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, dir: number, spread: number, a: number, t: number, col = '255,240,200') {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const ang = dir + (hash(i * 3.3) - 0.5) * spread + Math.sin(t * 0.15 + i) * 0.02;
    const wd = (0.02 + hash(i * 7.1) * 0.06) * (0.7 + 0.3 * Math.sin(t * 0.4 + i * 2));
    const L = len * (0.6 + hash(i) * 0.5);
    const gr = ctx.createLinearGradient(x, y, x + Math.cos(ang) * L, y + Math.sin(ang) * L);
    gr.addColorStop(0, `rgba(${col},${0.22 * a})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang - wd) * L, y + Math.sin(ang - wd) * L);
    ctx.lineTo(x + Math.cos(ang + wd) * L, y + Math.sin(ang + wd) * L);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** dust motes floating in a sunbeam */
export function motes(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, a: number, col = '#fff3d6', n = 40) {
  if (a <= 0.01) return;
  const S = Math.min(w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = ((hash(i * 1.3) + t * 0.006 * (0.5 + hash(i * 2))) % 1) * w;
    const y = ((hash(i * 4.7) + Math.sin(t * 0.3 + i) * 0.02 + 1) % 1) * h;
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash(i) * 2) + i);
    ctx.globalAlpha = a * tw * 0.7;
    drawSprite(ctx, glow(col, 32), x, y, S * (0.008 + hash(i * 9) * 0.012));
  }
  ctx.restore();
}

/** a soft colour wash from one edge: the light leak of an edit */
export function leak(ctx: CanvasRenderingContext2D, w: number, h: number, a: number, col: string, fromRight = true) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createLinearGradient(fromRight ? w : 0, 0, fromRight ? w * 0.2 : w * 0.8, h * 0.3);
  gr.addColorStop(0, col);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = a;
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** sparkles on water: points that flash and fade inside a band */
export function glitter(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, t: number, a: number, n = 70) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const life = (hash(i * 3.1) + t * (0.6 + hash(i) * 0.8)) % 1;
    const k = Math.sin(life * Math.PI) ** 3;
    if (k < 0.05) continue;
    const yy = lerp(y0, y1, hash(i * 5.3) ** 0.7);
    const xx = lerp(x0, x1, hash(i * 9.1 + Math.floor(t * 0.5 + hash(i))));
    ctx.globalAlpha = a * k;
    const r = (y1 - y0) * 0.02 * (0.5 + (yy - y0) / (y1 - y0));
    drawSprite(ctx, glow('#fff6d8', 32), xx, yy, r * 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(xx - r * 1.5, yy - 0.5, r * 3, 1);
  }
  ctx.restore();
}

/* ------------------------------------------------------------- particles */

export interface Flake { x: number; y: number; vx: number; vy: number; rot: number; spin: number; s: number; seed: number }

/** a drifting field of petals / leaves / snow, pushed by the finger */
export class Drift {
  items: Flake[] = [];
  n: number;
  kind: 'petal' | 'leaf' | 'snow';
  constructor(n: number, kind: 'petal' | 'leaf' | 'snow') {
    this.n = n;
    this.kind = kind;
  }
  reset(w: number, h: number) {
    const S = Math.min(w, h);
    this.items = Array.from({ length: this.n }, (_, i) => ({
      x: hash(i * 1.7) * w, y: hash(i * 4.1) * h, vx: 0, vy: 0, rot: hash(i) * TAU, spin: (hash(i * 9) - 0.5) * 2,
      s: S * (this.kind === 'snow' ? 0.004 + hash(i * 5) * 0.006 : 0.01 + hash(i * 5) * 0.012), seed: i,
    }));
  }
  /** emit some at (x, y) with a push */
  burst(x: number, y: number, vx: number, vy: number, n: number) {
    for (let i = 0; i < n && this.items.length; i++) {
      const it = this.items[Math.floor(hash(x * 0.37 + y * 0.11 + i * 7.7) * this.items.length)];
      it.x = x + (hash(i * 2.2 + x) - 0.5) * 40;
      it.y = y + (hash(i * 3.3 + y) - 0.5) * 40;
      it.vx = vx * (0.3 + hash(i) * 0.5);
      it.vy = vy * (0.3 + hash(i * 2) * 0.5);
    }
  }
  step(w: number, h: number, dt: number, t: number, wind: number, finger: { x: number; y: number; vx: number; vy: number } | null) {
    const S = Math.min(w, h);
    if (!this.items.length) this.reset(w, h);
    const fall = this.kind === 'snow' ? 0.04 : this.kind === 'leaf' ? 0.07 : 0.05;
    for (const it of this.items) {
      if (finger) {
        const dx = it.x - finger.x, dy = it.y - finger.y, d = Math.hypot(dx, dy);
        if (d < S * 0.25) {
          const k = (1 - d / (S * 0.25)) * 0.12;
          it.vx += finger.vx * k * dt * 6;
          it.vy += finger.vy * k * dt * 6;
        }
      }
      it.vx = lerp(it.vx, (Math.sin(t * 0.7 + it.rot) * 0.04 + wind) * S, dt * 1.5);
      it.vy = lerp(it.vy, S * fall * (0.7 + hash(it.seed) * 0.6), dt * 1.5);
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.rot += it.spin * dt * (1 + Math.abs(it.vx) / S);
      if (it.y > h + 10) { it.y = -10; it.x = hash(it.x + t) * w; }
      if (it.y < -60) it.y = h + 5;
      if (it.x < -30) it.x = w + 20;
      if (it.x > w + 30) it.x = -20;
    }
  }
  draw(ctx: CanvasRenderingContext2D, a: number) {
    if (a <= 0.01) return;
    ctx.save();
    for (const it of this.items) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      ctx.globalAlpha = a * 0.9;
      if (this.kind === 'snow') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, it.s, 0, TAU);
        ctx.fill();
      } else if (this.kind === 'petal') {
        ctx.fillStyle = hash(it.seed) > 0.5 ? '#ffd3dd' : '#f7b6c6';
        ctx.beginPath();
        ctx.ellipse(0, 0, it.s, it.s * 0.55, 0, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = ['#e2491f', '#f08a24', '#c9301e', '#f2b134'][it.seed % 4];
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const r = k % 2 ? it.s * 0.45 : it.s;
          const an = (k / 10) * TAU;
          ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ rain */

interface Drop { x: number; y: number; r: number; t0: number; slide: number }
const glass: Drop[] = [];

/** rain: streaks falling, drops landing on the glass and sliding; k = how hard it rains */
export function rain(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number, k: number) {
  if (k <= 0.01) {
    glass.length = 0;
    return;
  }
  const S = Math.min(w, h);
  ctx.save();
  // the streaks
  ctx.strokeStyle = 'rgba(210,225,245,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const n = Math.floor(160 * k);
  for (let i = 0; i < n; i++) {
    const sp = 1.6 + hash(i) * 1.2;
    const x = ((hash(i * 2.1) * 1.2 - 0.1) * w + t * 60) % (w * 1.2) - w * 0.1;
    const y = ((hash(i * 5.7) + t * sp) % 1.2) * h - h * 0.1;
    const L = S * (0.04 + hash(i * 3) * 0.05);
    ctx.moveTo(x, y);
    ctx.lineTo(x - L * 0.12, y + L);
  }
  ctx.stroke();
  // drops on the glass: land, swell, sometimes slide down leaving a trail
  if (Math.random() < k * dt * 40 && glass.length < 70) glass.push({ x: Math.random() * w, y: Math.random() * h, r: S * (0.004 + Math.random() * 0.012), t0: t, slide: Math.random() < 0.3 ? S * (0.05 + Math.random() * 0.2) : 0 });
  for (let i = glass.length - 1; i >= 0; i--) {
    const d = glass[i];
    const age = t - d.t0;
    if (age > 6) { glass.splice(i, 1); continue; }
    if (d.slide) d.y += d.slide * dt * clamp(age - 0.5, 0, 1);
    if (d.y > h + 20) { glass.splice(i, 1); continue; }
    const a = Math.min(1, age * 4) * Math.min(1, (6 - age) / 1.5) * k;
    ctx.globalAlpha = a;
    // a drop: dark rim, bright refraction on the lower side, a glint on top
    ctx.fillStyle = 'rgba(20,30,50,0.25)';
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(230,240,255,0.35)';
    ctx.beginPath();
    ctx.arc(d.x, d.y + d.r * 0.25, d.r * 0.7, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(d.x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.22, 0, TAU);
    ctx.fill();
    if (d.slide) {
      ctx.strokeStyle = 'rgba(220,235,255,0.18)';
      ctx.lineWidth = d.r * 0.6;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y - d.r);
      ctx.lineTo(d.x + Math.sin(d.y * 0.05) * 2, d.y - d.r - d.slide * clamp(age - 0.5, 0, 1) * 0.6);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** a rainbow arc */
export function rainbow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cols = ['255,60,60', '255,150,40', '255,235,80', '80,230,110', '70,160,255', '120,90,255'];
  cols.forEach((c, i) => {
    ctx.strokeStyle = `rgba(${c},${0.16 * a})`;
    ctx.lineWidth = r * 0.03;
    ctx.beginPath();
    ctx.arc(x, y, r * (1 - i * 0.028), Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  });
  ctx.restore();
}

/** a shooting star from (x, y) along angle ang, k = 0..1 through its flight */
export function shootingStar(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, k: number) {
  if (k <= 0 || k >= 1) return;
  const hx = x + Math.cos(ang) * len * k, hy = y + Math.sin(ang) * len * k;
  const tl = len * 0.35 * Math.sin(k * Math.PI);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createLinearGradient(hx, hy, hx - Math.cos(ang) * tl, hy - Math.sin(ang) * tl);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)');
  gr.addColorStop(1, 'rgba(160,200,255,0)');
  ctx.strokeStyle = gr;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx - Math.cos(ang) * tl, hy - Math.sin(ang) * tl);
  ctx.stroke();
  drawSprite(ctx, glow('#dfeaff', 32), hx, hy, 14);
  ctx.restore();
}
