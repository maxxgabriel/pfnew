import { TAU, hash } from './math';
import { C } from './style';

/**
 * BLOT — the film's mascot.
 *
 * A drop of ink with eyes and a vermilion scarf: the first drop that falls
 * in the opening, which then refuses to stay a drop. It watches every act,
 * and the same few poses carry it through all of them.
 */
export type BlotPose = 'idle' | 'cover' | 'cheer' | 'fall' | 'wave' | 'peek' | 'shock';

export interface BlotOpts {
  /** where it is looking (absolute coords, same space as x/y) */
  look?: [number, number];
  pose?: BlotPose;
  t: number;
  /** body colour: ink on paper, but it can glow in the dark acts */
  body?: string;
  /** eye-white colour */
  eye?: string;
  rot?: number;
  /** 0..1 squash (landing) */
  squash?: number;
  /** seed so two Blots never blink together */
  seed?: number;
  /** wind on the scarf, -1..1 */
  wind?: number;
}

/** Draws Blot standing with its feet at (x, y); `s` is its height. */
export function drawBlot(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: BlotOpts) {
  const { t } = o;
  const pose = o.pose ?? 'idle';
  const seed = o.seed ?? 1;
  const body = o.body ?? C.ink;
  const sq = o.squash ?? 0;
  const breathe = Math.sin(t * 3 + seed) * 0.03;
  const sy = 1 - sq * 0.35 + breathe;
  const sx = 1 + sq * 0.3 - breathe * 0.5;
  const r = s * 0.36;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.rot ?? 0);
  ctx.scale(sx, sy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // feet
  ctx.fillStyle = body;
  const step = pose === 'cheer' ? Math.abs(Math.sin(t * 10)) * s * 0.05 : 0;
  ctx.beginPath();
  ctx.ellipse(-r * 0.42, -s * 0.03 - step, r * 0.26, r * 0.13, 0, 0, TAU);
  ctx.ellipse(r * 0.42, -s * 0.03, r * 0.26, r * 0.13, 0, 0, TAU);
  ctx.fill();

  // body: a drop, point up, with a little wobble at the tip
  const cy = -s * 0.42;
  const tipSway = Math.sin(t * 2.2 + seed) * r * 0.12 + (o.wind ?? 0) * r * 0.2;
  ctx.beginPath();
  ctx.moveTo(tipSway, -s * 0.98);
  ctx.bezierCurveTo(r * 0.35 + tipSway * 0.5, -s * 0.78, r * 1.05, cy - r * 0.2, r, cy + r * 0.2);
  ctx.bezierCurveTo(r * 0.95, cy + r * 0.95, -r * 0.95, cy + r * 0.95, -r, cy + r * 0.2);
  ctx.bezierCurveTo(-r * 1.05, cy - r * 0.2, -r * 0.35 + tipSway * 0.5, -s * 0.78, tipSway, -s * 0.98);
  ctx.fill();
  // a highlight so it reads as wet ink
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.5, cy - r * 0.15, r * 0.12, r * 0.28, 0.4, 0, TAU);
  ctx.fill();

  // scarf: a band and two tails that never stop moving
  const scarfY = cy + r * 0.48;
  const wind = o.wind ?? 0.6;
  ctx.strokeStyle = C.red;
  ctx.lineWidth = r * 0.24;
  ctx.beginPath();
  ctx.moveTo(-r * 0.92, scarfY - r * 0.05);
  ctx.quadraticCurveTo(0, scarfY + r * 0.22, r * 0.92, scarfY - r * 0.05);
  ctx.stroke();
  ctx.lineWidth = r * 0.17;
  for (let k = 0; k < 2; k++) {
    const ph = t * 7 + k * 1.3 + seed;
    const dir = -Math.sign(wind || 1);
    ctx.beginPath();
    const ax = r * 0.75 * -dir, ay = scarfY + r * 0.05;
    ctx.moveTo(ax, ay);
    for (let i = 1; i <= 4; i++) {
      const q = i / 4;
      ctx.lineTo(
        ax + dir * r * (0.35 + Math.abs(wind) * 0.9) * q * (1 + k * 0.3),
        ay + r * 0.25 * q + Math.sin(ph + q * 3) * r * 0.12 * q - k * r * 0.1 * q,
      );
    }
    ctx.stroke();
  }

  // arms
  ctx.strokeStyle = body;
  ctx.lineWidth = r * 0.16;
  const arm = (side: number, ex: number, ey: number) => {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.85, cy + r * 0.3);
    ctx.quadraticCurveTo(side * r * 1.25, cy + r * 0.1, ex, ey);
    ctx.stroke();
  };
  if (pose === 'cheer') {
    const flap = Math.sin(t * 14) * r * 0.2;
    arm(-1, -r * 1.3, cy - r * 1.0 + flap);
    arm(1, r * 1.3, cy - r * 1.0 - flap);
  } else if (pose === 'wave') {
    arm(-1, -r * 1.25, cy + r * 0.75);
    arm(1, r * 1.35 + Math.sin(t * 9) * r * 0.25, cy - r * 0.9);
  } else if (pose === 'cover') {
    arm(-1, -r * 0.25, cy - r * 0.05);
    arm(1, r * 0.25, cy - r * 0.05);
  } else if (pose === 'fall' || pose === 'shock') {
    arm(-1, -r * 1.45, cy - r * 0.55 + Math.sin(t * 20) * r * 0.2);
    arm(1, r * 1.45, cy - r * 0.55 - Math.sin(t * 20) * r * 0.2);
  } else {
    arm(-1, -r * 1.2, cy + r * 0.8);
    arm(1, r * 1.2, cy + r * 0.8);
  }

  // eyes
  if (pose !== 'cover') {
    const blink = (t * 0.7 + hash(seed) * 3) % 3.3 < 0.09;
    const big = pose === 'shock' || pose === 'fall' ? 1.25 : 1;
    const look = o.look;
    let ax = 0, ay = 0;
    if (look) {
      const lx = look[0] - x, ly = look[1] - (y + cy * sy);
      const l = Math.hypot(lx, ly) || 1;
      ax = (lx / l) * r * 0.1;
      ay = (ly / l) * r * 0.1;
    }
    for (const ex of [-0.33, 0.33]) {
      const ecx = ex * r + ax * 0.4, ecy = cy - r * 0.08 + ay * 0.3;
      ctx.fillStyle = o.eye ?? C.white;
      ctx.beginPath();
      ctx.ellipse(ecx, ecy, r * 0.22 * big, blink ? r * 0.03 : r * 0.3 * big, 0, 0, TAU);
      ctx.fill();
      if (!blink) {
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.arc(ecx + ax, ecy + ay + r * 0.04, r * (pose === 'shock' ? 0.07 : 0.11), 0, TAU);
        ctx.fill();
      }
    }
    // mouth
    ctx.strokeStyle = o.eye ?? C.white;
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    if (pose === 'cheer' || pose === 'wave') {
      ctx.arc(0, cy + r * 0.2, r * 0.18, 0.15, Math.PI - 0.15);
    } else if (pose === 'shock' || pose === 'fall') {
      ctx.ellipse(0, cy + r * 0.3, r * 0.08, r * 0.12, 0, 0, TAU);
    } else {
      ctx.moveTo(-r * 0.1, cy + r * 0.27);
      ctx.quadraticCurveTo(0, cy + r * 0.33, r * 0.1, cy + r * 0.27);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Blot as a 9×10 sprite for the arcade. 0 empty, 1 body, 2 eye, 3 scarf, 4 pupil. */
export const BLOT_SPRITE = [
  '....1....',
  '...111...',
  '..11111..',
  '.1221221.',
  '.1241241.',
  '111111111',
  '133333331',
  '.1111113.',
  '..11.11.3',
  '.11...11.',
];
