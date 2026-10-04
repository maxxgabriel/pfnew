import { TAU } from './math';

interface P {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number;
  color: string; kind: number; rot: number; vr: number;
}

export const SPARK = 0, CONFETTI = 1, DROP = 2, DOT = 3;

/** A small fixed-capacity particle pool; spawning past capacity recycles the oldest. */
export class Particles {
  list: P[] = [];
  cap: number;
  gravity: number;
  drag: number;
  constructor(cap = 500, gravity = 900, drag = 1.2) {
    this.cap = cap;
    this.gravity = gravity;
    this.drag = drag;
  }

  spawn(p: Partial<P> & { x: number; y: number }) {
    const q: P = {
      vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff', kind: SPARK, rot: 0, vr: 0,
      ...p,
    };
    if (this.list.length >= this.cap) this.list.shift();
    this.list.push(q);
  }

  burst(x: number, y: number, n: number, speed: number, o: Partial<P> & { spread?: number; dir?: number } = {}) {
    const spread = o.spread ?? TAU, dir = o.dir ?? 0;
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const s = speed * (0.25 + Math.random() * 0.9);
      this.spawn({
        ...o,
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        max: (o.max ?? 0.8) * (0.5 + Math.random() * 0.8),
        size: (o.size ?? 2) * (0.5 + Math.random()),
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 14,
      });
    }
  }

  update(dt: number) {
    const k = Math.exp(-this.drag * dt);
    for (const p of this.list) {
      p.life += dt;
      p.vx *= k;
      p.vy = p.vy * k + this.gravity * dt * (p.kind === CONFETTI ? 0.25 : p.kind === DOT ? 0 : 1);
      if (p.kind === CONFETTI) p.vx += Math.sin(p.life * 6 + p.rot) * 30 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.list = this.list.filter((p) => p.life < p.max);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.list) {
      const f = 1 - p.life / p.max;
      if (p.kind === SPARK) {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = Math.min(1, f * 1.6);
        ctx.lineWidth = p.size * (0.4 + f * 0.6);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
        ctx.stroke();
      } else if (p.kind === CONFETTI) {
        ctx.globalAlpha = Math.min(1, f * 3);
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.life * 9 + p.rot));
        ctx.fillRect(-p.size, -p.size * 0.55, p.size * 2, p.size * 1.1);
        ctx.restore();
      } else {
        ctx.globalAlpha = Math.min(1, f * 2);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.kind === DROP ? 1 : f), 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
