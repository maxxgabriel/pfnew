/*
 * INK IN WATER: a small CPU stable-fluids solver (Stam) with vorticity
 * confinement, ink that can be pulled toward a target picture, and a sumi
 * renderer (transparent where there's no ink, so the paper shows).
 * (First written by Codex to a spec; drag added after review.)
 */
export class InkWater {
  readonly nx: number;
  readonly ny: number;
  /** Density includes a one-cell border. */
  readonly dye: Float32Array;
  private readonly stride: number;
  private readonly u: Float32Array;
  private readonly v: Float32Array;
  private readonly u0: Float32Array;
  private readonly v0: Float32Array;
  private readonly scratch: Float32Array;
  private readonly pressure: Float32Array;
  private readonly divergence: Float32Array;
  private canvas: HTMLCanvasElement | null = null;
  private pixels: ImageData | null = null;
  private context: CanvasRenderingContext2D | null = null;

  constructor(nx: number, ny: number) {
    if (!Number.isInteger(nx) || !Number.isInteger(ny) || nx < 2 || ny < 2) {
      throw new RangeError('Grid dimensions must be integers of at least 2.');
    }
    this.nx = nx;
    this.ny = ny;
    this.stride = nx + 2;
    const size = (nx + 2) * (ny + 2);
    this.dye = new Float32Array(size);
    this.u = new Float32Array(size);
    this.v = new Float32Array(size);
    this.u0 = new Float32Array(size);
    this.v0 = new Float32Array(size);
    this.scratch = new Float32Array(size);
    this.pressure = new Float32Array(size);
    this.divergence = new Float32Array(size);
  }

  /** Advance seconds, with a maximum timestep of 1/20. */
  step(dt: number, fade = 0): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    // water drag: currents and pushes die away within a couple of seconds
    const drag = Math.exp(-1.4 * dt);
    for (let i = 0; i < this.u.length; i++) {
      this.u[i] *= drag;
      this.v[i] *= drag;
    }
    this.boundary(1, this.u);
    this.boundary(2, this.v);
    this.confine(dt);
    this.project(this.u, this.v);
    this.u0.set(this.u);
    this.v0.set(this.v);
    this.advect(1, this.u, this.u0, this.u0, this.v0, dt);
    this.advect(2, this.v, this.v0, this.u0, this.v0, dt);
    this.project(this.u, this.v);
    // Negligible viscosity; only the ink needs a little diffusion.
    this.scratch.set(this.dye);
    const a = dt * 0.000001 * this.nx * this.nx;
    this.solve(0, this.dye, this.scratch, a, 1 + 4 * a, 2);
    this.scratch.set(this.dye);
    this.advect(0, this.dye, this.scratch, this.u, this.v, dt);
    if (fade > 0 && Number.isFinite(fade)) this.scaleInk(Math.exp(-fade * dt));
  }

  /** Gaussian ink drop; radius is a fraction of screen width. */
  addInk(u: number, v: number, r: number, amount: number): void {
    this.splat(this.dye, u, v, r, amount);
    this.boundary(0, this.dye);
  }

  /** Velocity input is in screen widths per second on both axes. */
  addForce(u: number, v: number, fx: number, fy: number, r: number): void {
    this.splat(this.u, u, v, r, fx * this.nx);
    this.splat(this.v, u, v, r, fy * this.nx);
  }

  /** Add a smooth, divergence-free analytic curl current. */
  stir(t: number, strength: number): void {
    if (!Number.isFinite(t) || !Number.isFinite(strength)) return;
    const s = this.stride;
    const a = 5.3;
    const b = 4.1;
    const gain = strength * this.nx / (a + b);
    for (let y = 1; y <= this.ny; y++) {
      const py = (y - 0.5) / this.nx;
      const by = py * b - t * 0.21;
      const cy = py * a + t * 0.17;
      for (let x = 1; x <= this.nx; x++) {
        const px = (x - 0.5) / this.nx;
        const ax = px * a + t * 0.3;
        const bx = px * b - t * 0.13;
        const i = x + y * s;
        this.u[i] += gain * (-b * Math.sin(ax) * Math.sin(by)
          + 0.5 * a * Math.sin(bx) * Math.cos(cy));
        this.v[i] -= gain * (a * Math.cos(ax) * Math.cos(by)
          + 0.5 * b * Math.cos(bx) * Math.sin(cy));
      }
    }
  }

  /** Relax ink toward the target, and optionally clear empty regions. */
  attract(target: Float32Array, k: number, level: number, clear: number, dt: number): void {
    if (target.length !== this.nx * this.ny) throw new RangeError('Invalid target size.');
    if (!Number.isFinite(k) || !Number.isFinite(level)
      || !Number.isFinite(clear) || !Number.isFinite(dt)) return;
    const rate = Math.max(0, k) * Math.max(0, dt);
    let j = 0;
    for (let y = 1; y <= this.ny; y++) {
      for (let x = 1; x <= this.nx; x++, j++) {
        const i = x + y * this.stride;
        const d = this.dye[i];
        this.dye[i] = Math.max(0, d + (target[j] > 0.02
          ? rate * (target[j] * level - d)
          : -rate * 0.5 * d * clear));
      }
    }
    this.boundary(0, this.dye);
  }

  /** Multiply ink density by a factor in [0, 1]. */
  scaleInk(f: number): void {
    if (!Number.isFinite(f)) return;
    f = Math.max(0, Math.min(1, f));
    for (let i = 0; i < this.dye.length; i++) this.dye[i] *= f;
  }

  /** Render transparent sumi washes over the caller's paper. */
  /** light = moonlit mist on a night background instead of ink on paper (0..1) */
  render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, light = 0): void {
    if (!this.canvas) {
      const canvas = document.createElement('canvas');
      canvas.width = this.nx;
      canvas.height = this.ny;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('A 2D canvas context is required.');
      this.canvas = canvas;
      this.context = context;
      this.pixels = context.createImageData(this.nx, this.ny);
    }
    const pixels = this.pixels;
    const context = this.context;
    if (!pixels || !context) return;
    const data = pixels.data;
    const st = this.stride;
    const dye = this.dye;
    let j = 0;
    for (let row = 1; row <= this.ny; row++) {
      for (let col = 1; col <= this.nx; col++) {
        const i = col + row * st;
        const d = Math.max(0, dye[i]);
        // wet edge: where the ink thins out fast it pools darker, like sumi drying on paper
        const gx = dye[i + 1] - dye[i - 1], gy = dye[i + st] - dye[i - st];
        const edge = Math.min(0.3, Math.sqrt(gx * gx + gy * gy) * 0.7);
        const body = 1 - Math.exp(-d * 3.2);
        const alpha = Math.min(1, body * (0.85 + edge));
        const tint = Math.max(0, 1 - d / 0.35);
        data[j++] = 18 + tint * 14 + light * (175 - tint * 10);
        data[j++] = 16 + tint * 18 + light * (180 - tint * 8);
        data[j++] = 16 + tint * 26 + light * (190 - tint * 4);
        data[j++] = Math.round(alpha * (1 - light * 0.45) * 255);
      }
    }
    context.putImageData(pixels, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.canvas, x, y, w, h);
    ctx.restore();
  }

  private splat(field: Float32Array, u: number, v: number, r: number, amount: number): void {
    if (!Number.isFinite(u) || !Number.isFinite(v) || !Number.isFinite(r)
      || !Number.isFinite(amount) || r <= 0) return;
    const cx = 0.5 + Math.max(0, Math.min(1, u)) * this.nx;
    const cy = 0.5 + Math.max(0, Math.min(1, v)) * this.ny;
    const radius = Math.max(0.5, r * this.nx);
    const extent = radius * 3;
    const inverse = 0.5 / (radius * radius);
    const left = Math.max(1, Math.ceil(cx - extent));
    const right = Math.min(this.nx, Math.floor(cx + extent));
    const top = Math.max(1, Math.ceil(cy - extent));
    const bottom = Math.min(this.ny, Math.floor(cy + extent));
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const i = x + y * this.stride;
        field[i] += amount * Math.exp(-(dx * dx + dy * dy) * inverse);
        if (field === this.dye) field[i] = Math.max(0, field[i]);
      }
    }
  }

  private boundary(kind: number, field: Float32Array): void {
    const s = this.stride;
    for (let y = 1; y <= this.ny; y++) {
      const i = y * s;
      field[i] = -field[i + 1];
      field[i + this.nx + 1] = -field[i + this.nx];
      if (kind === 0) {
        field[i] = field[i + 1];
        field[i + this.nx + 1] = field[i + this.nx];
      }
    }
    const bottom = (this.ny + 1) * s;
    for (let x = 1; x <= this.nx; x++) {
      const sign = kind === 0 ? 1 : -1;
      field[x] = sign * field[x + s];
      field[x + bottom] = sign * field[x + bottom - s];
    }
    field[0] = 0.5 * (field[1] + field[s]);
    field[s - 1] = 0.5 * (field[s - 2] + field[2 * s - 1]);
    field[bottom] = 0.5 * (field[bottom + 1] + field[bottom - s]);
    field[bottom + s - 1] = 0.5 * (field[bottom + s - 2] + field[bottom - 1]);
  }

  private solve(kind: number, out: Float32Array, source: Float32Array,
    a: number, c: number, iterations: number): void {
    const s = this.stride;
    const inverse = 1 / c;
    for (let iteration = 0; iteration < iterations; iteration++) {
      for (let y = 1; y <= this.ny; y++) {
        const end = y * s + this.nx;
        for (let i = y * s + 1; i <= end; i++) {
          out[i] = (source[i] + a * (out[i - 1] + out[i + 1]
            + out[i - s] + out[i + s])) * inverse;
        }
      }
      this.boundary(kind, out);
    }
  }

  private project(u: Float32Array, v: Float32Array): void {
    const s = this.stride;
    const p = this.pressure;
    const div = this.divergence;
    p.fill(0);
    this.boundary(1, u);
    this.boundary(2, v);
    for (let y = 1; y <= this.ny; y++) {
      for (let x = 1; x <= this.nx; x++) {
        const i = x + y * s;
        div[i] = -0.5 * (u[i + 1] - u[i - 1] + v[i + s] - v[i - s]);
      }
    }
    this.boundary(0, div);
    this.solve(0, p, div, 1, 4, 16);
    for (let y = 1; y <= this.ny; y++) {
      for (let x = 1; x <= this.nx; x++) {
        const i = x + y * s;
        u[i] -= 0.5 * (p[i + 1] - p[i - 1]);
        v[i] -= 0.5 * (p[i + s] - p[i - s]);
      }
    }
    this.boundary(1, u);
    this.boundary(2, v);
  }

  private advect(kind: number, out: Float32Array, source: Float32Array,
    u: Float32Array, v: Float32Array, dt: number): void {
    const s = this.stride;
    for (let y = 1; y <= this.ny; y++) {
      for (let x = 1; x <= this.nx; x++) {
        const i = x + y * s;
        const px = Math.max(0.5, Math.min(this.nx + 0.5, x - dt * u[i]));
        const py = Math.max(0.5, Math.min(this.ny + 0.5, y - dt * v[i]));
        const ix = Math.floor(px);
        const iy = Math.floor(py);
        const tx = px - ix;
        const ty = py - iy;
        const j = ix + iy * s;
        out[i] = (1 - ty) * ((1 - tx) * source[j] + tx * source[j + 1])
          + ty * ((1 - tx) * source[j + s] + tx * source[j + s + 1]);
      }
    }
    this.boundary(kind, out);
  }

  private confine(dt: number): void {
    const s = this.stride;
    const curl = this.scratch;
    for (let y = 1; y <= this.ny; y++) {
      for (let x = 1; x <= this.nx; x++) {
        const i = x + y * s;
        curl[i] = 0.5 * (this.v[i + 1] - this.v[i - 1]
          - this.u[i + s] + this.u[i - s]);
      }
    }
    this.boundary(0, curl);
    const gain = 0.15 * dt;
    for (let y = 1; y <= this.ny; y++) {
      for (let x = 1; x <= this.nx; x++) {
        const i = x + y * s;
        const dx = 0.5 * (Math.abs(curl[i + 1]) - Math.abs(curl[i - 1]));
        const dy = 0.5 * (Math.abs(curl[i + s]) - Math.abs(curl[i - s]));
        const force = gain * curl[i] / (Math.sqrt(dx * dx + dy * dy) + 0.000001);
        this.u[i] += dy * force;
        this.v[i] -= dx * force;
      }
    }
  }
}
