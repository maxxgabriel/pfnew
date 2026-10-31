/*
 * Speed lines, manga style: tapered wedges rushing out from a vanishing point. Drawn on a canvas and
 * redrawn only twelve times a second (each drawing is a new random set, like hand-drawn lines on
 * twos), so they flicker the way drawn effects do. One amount (0..1) sets how many, how close to the
 * centre they reach and how strong they are.
 */
export class Speed {
  readonly cv = document.createElement('canvas');
  private g = this.cv.getContext('2d')!;
  private w = 1; private h = 1; private dpr = 1;
  private frame = -1; private last = -1; private lastKey = '';

  constructor(parent: HTMLElement, cls: string) {
    this.cv.className = cls;
    this.cv.setAttribute('aria-hidden', 'true');
    parent.append(this.cv);
  }
  size(w: number, h: number) {
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.w = w; this.h = h;
    this.cv.width = Math.round(w * this.dpr); this.cv.height = Math.round(h * this.dpr);
    this.frame = -1;
  }
  clear() {
    if (this.last === 0) return;
    this.g.setTransform(1, 0, 0, 1, 0, 0);
    this.g.clearRect(0, 0, this.cv.width, this.cv.height);
    this.last = 0;
  }
  draw(amount: number, cx: number, cy: number, color: string) {
    if (amount < 0.02) { this.clear(); return; }
    const f = Math.floor(performance.now() / 83);
    const key = `${color}|${Math.round(cx)}|${Math.round(cy)}`;
    if (f === this.frame && Math.abs(amount - this.last) < 0.06 && key === this.lastKey) return;
    this.frame = f; this.last = amount; this.lastKey = key;
    const g = this.g, { w, h } = this;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    let seed = f * 9301 + 49297;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const R = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) * 1.05;
    const n = Math.round(12 + 22 * amount);
    g.fillStyle = color;
    g.globalAlpha = Math.min(1, 0.25 + 0.6 * amount);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const r0 = R * (0.2 + rnd() * 0.45) * (1.15 - 0.55 * amount);
      const half = (0.004 + rnd() * 0.016) * Math.PI;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a - half) * R, cy + Math.sin(a - half) * R);
      g.lineTo(cx + Math.cos(a + half) * R, cy + Math.sin(a + half) * R);
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 1;
  }
}
