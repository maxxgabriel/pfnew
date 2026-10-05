import type { Frame } from '../core/frame';
import { TAU, clamp, hash, lerp } from '../core/math';

/*
 * PLAY (INK v5, beat 2), in the `play` hold: the night has just taken the
 * sheet and the petals are falling. The finger blows them about; a tap bursts
 * the ones under it outward. (The ink spirits that lived here were cut: the
 * owner didn't want small characters. What fills this beat is still open.)
 */

interface Petal { x: number; y: number; vx: number; vy: number; rot: number; spin: number; s: number }

let petals: Petal[] = [];
let size = '';
let unit = 400;
let finger: { x: number; y: number; vx: number; vy: number; t: number } | null = null;
let lastT = 0;

/** the finger moved over the film (screen px) */
export function playFinger(x: number, y: number, t: number) {
  if (finger) {
    const dt = Math.max(0.008, t - finger.t);
    finger = { x, y, vx: (x - finger.x) / dt, vy: (y - finger.y) / dt, t };
  } else finger = { x, y, vx: 0, vy: 0, t };
}
export function playFingerUp() {
  if (finger) finger = { ...finger, vx: 0, vy: 0 };
}

/** a tap: the petals near it burst outward */
export function playTap(x: number, y: number) {
  const S = unit;
  for (const pt of petals) {
    const dx = pt.x - x, dy = pt.y - y, d = Math.hypot(dx, dy) || 1;
    if (d > S * 0.35) continue;
    const k = (1 - d / (S * 0.35)) * S * 3;
    pt.vx += (dx / d) * k;
    pt.vy += (dy / d) * k;
    pt.spin *= 3;
  }
}

function setup(w: number, h: number) {
  const key = `${w}x${h}`;
  if (key === size) return;
  size = key;
  const S = Math.min(w, h);
  unit = S;
  petals = Array.from({ length: 48 }, (_, i) => ({
    x: hash(i * 1.7) * w, y: hash(i * 4.1) * h, vx: 0, vy: 0, rot: hash(i) * TAU, spin: (hash(i * 9) - 0.5) * 2, s: S * (0.01 + hash(i * 5) * 0.012),
  }));
}

export function drawPlay(f: Frame) {
  const { ctx, w, h, t } = f;
  setup(w, h);
  const S = Math.min(w, h);
  const dt = clamp(t - lastT, 0, 0.05);
  lastT = t;
  const live = finger && t - finger.t < 2.5 ? finger : null;
  ctx.save();
  ctx.fillStyle = '#e8b9c0';
  for (const pt of petals) {
    if (live) {
      const dx = pt.x - live.x, dy = pt.y - live.y, d = Math.hypot(dx, dy);
      if (d < S * 0.25) {
        const k = (1 - d / (S * 0.25)) * 0.12;
        pt.vx += live.vx * k * dt * 6;
        pt.vy += live.vy * k * dt * 6;
      }
    }
    pt.vx = lerp(pt.vx, Math.sin(t * 0.7 + pt.rot) * S * 0.04, dt * 1.5);
    pt.vy = lerp(pt.vy, S * 0.05, dt * 1.5);
    pt.spin = lerp(pt.spin, Math.sign(pt.spin) * 1, dt);
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.rot += pt.spin * dt * (1 + Math.abs(pt.vx) / S);
    if (pt.y > h + 10) { pt.y = -10; pt.x = hash(pt.x + t) * w; }
    if (pt.y < -40) pt.y = h + 5;
    if (pt.x < -20) pt.x = w + 10;
    if (pt.x > w + 20) pt.x = -10;
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.rot);
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, pt.s, pt.s * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
