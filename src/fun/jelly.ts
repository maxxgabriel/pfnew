import gsap from 'gsap';

/*
 * JELLY — the first screen is rubber. Each line of the name is an elastic string glued lightly to
 * the paper and held at both ends; the letters are the segments between shared edge nodes. Pull a
 * letter and the string does what rubber does: everything on the far side stretches wider,
 * everything on the near side is pushed narrower, the pulled letter comes with your finger a little
 * behind it, and when you let go the whole line twangs. The two lines tug at each other. Letters
 * show their strain through the type itself (the font's width axis, so strokes keep their weight;
 * they thin as they stretch; they tilt when their two ends sit at different heights). Stickers are
 * loose weights on their own springs. A tap on the paper sends a ring out and whatever it passes gets
 * a kick. The edges of the screen are walls. Nothing is written to the page while everything is still.
 */
type Node = { x: number; y: number; rx: number; ry: number; vx: number; vy: number; glue: number; held: boolean; tx: number; ty: number; line: number; pair?: Node };
export type Letter = { el: HTMLElement; a: Node; b: Node; w0: number; h0: number; cx: number; cy: number; grow: number; vx: number; vy: number; shocked: number; gx: number; gy: number; ox: number; oy: number };
export type Free = { el: HTMLElement; rx: number; ry: number; w: number; h: number; dx: number; dy: number; vx: number; vy: number; shocked: number };
type Pulse = { x: number; y: number; t0: number; a: number; hit: Set<object>; probed: Set<number> };
type Probe = { at: () => { x: number; y: number }; hit: (a: number) => void };

const K_GLUE = 90, END = 7, K_SEG = 1500, K_BEND = 420, K_X = 26, DAMP = 6, K_GRAB = 2000, C_GRAB = 55;
const K_FREE = ((2 * Math.PI) / 0.55) ** 2, C_FREE = 2 * 0.22 * ((2 * Math.PI) / 0.55);
const RING = 1500; // px/s, how fast a tap travels
const DS_MAX = 0.76, DS_MIN = -0.24; // the font's width axis, above and below its resting width
const MIN_W = 0.6; // a letter is never squeezed below this much of its width

export class Jelly {
  letters: Letter[] = [];
  free: Free[] = [];
  probes: Probe[] = [];
  /** a letter let go fast, or something hitting a wall hard */
  onShock?: (what: Letter | Free, speed: number) => void;
  private nodes: Node[] = [];
  private pulses: Pulse[] = [];
  private awake = false; private stillFor = 0;
  private W = 1; private H = 1;
  private _sheet = 0;
  /** how far a pull can take a letter before it stops giving (px); the hero sets it from the type size */
  pull = 400;
  private act: HTMLElement;
  constructor(act: HTMLElement) { this.act = act; gsap.ticker.add(this.tick); }

  /** the whole sheet being stretched (0..1): the letters thin out */
  get sheet() { return this._sheet; }
  set sheet(v: number) { if (v === this._sheet) return; this._sheet = v; for (const l of this.letters) this.renderLetter(l); }
  get excited() { return this.awake; }

  addLetter(el: HTMLElement): Letter {
    const mk = (): Node => ({ x: 0, y: 0, rx: 0, ry: 0, vx: 0, vy: 0, glue: 1, held: false, tx: 0, ty: 0, line: 0 });
    const l: Letter = { el, a: mk(), b: mk(), w0: 1, h0: 1, cx: 0, cy: 0, grow: 1, vx: 0, vy: 0, shocked: 0, gx: 0, gy: 0, ox: 0, oy: 0 };
    this.letters.push(l);
    return l;
  }
  addFree(el: HTMLElement): Free {
    const f: Free = { el, rx: 0, ry: 0, w: 1, h: 1, dx: 0, dy: 0, vx: 0, vy: 0, shocked: 0 };
    this.free.push(f);
    return f;
  }

  /** after layout: rest places and sizes, how much each glyph can widen, the strings and their glue */
  measure(W: number, H: number) {
    this.W = W; this.H = H;
    for (const l of this.letters) { l.el.style.transform = ''; l.el.style.marginInline = ''; l.el.style.removeProperty('--dsp'); }
    for (const f of this.free) f.el.style.transform = '';
    const box = (el: HTMLElement) => {
      let x = 0, y = 0, e: HTMLElement | null = el;
      while (e && e !== this.act) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent as HTMLElement | null; }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    };
    for (const f of this.free) { const b = box(f.el); f.rx = b.x + b.w / 2; f.ry = b.y + b.h / 2; f.w = Math.max(1, b.w); f.h = Math.max(1, b.h); }
    const boxes = this.letters.map((l) => box(l.el));
    for (const l of this.letters) l.el.style.setProperty('--dsp', String(DS_MAX));
    this.letters.forEach((l, i) => { l.grow = Math.max(1, l.el.offsetWidth - boxes[i].w); });
    for (const l of this.letters) l.el.style.removeProperty('--dsp');
    // the strings: one per line, letters sharing their edge nodes; the ends glued hard
    this.nodes = [];
    const lines = [...new Set(this.letters.map((l) => l.el.parentElement))];
    lines.forEach((line, li) => {
      const ls = this.letters.filter((l) => l.el.parentElement === line);
      let prev: Node | null = null;
      ls.forEach((l, i) => {
        const b = boxes[this.letters.indexOf(l)];
        l.w0 = Math.max(1, b.w); l.h0 = Math.max(1, b.h); l.cx = b.x + b.w / 2; l.cy = b.y + b.h / 2;
        const a = prev ?? { x: b.x, y: l.cy, rx: b.x, ry: l.cy, vx: 0, vy: 0, glue: END, held: false, tx: 0, ty: 0, line: li };
        const r = b.x + b.w, last = i === ls.length - 1;
        const nb: Node = { x: r, y: l.cy, rx: r, ry: l.cy, vx: 0, vy: 0, glue: last ? END : 1, held: false, tx: 0, ty: 0, line: li };
        if (!prev) this.nodes.push(a);
        this.nodes.push(nb);
        l.a = a; l.b = nb; prev = nb;
      });
    });
    // the lines tug at each other: every node and its nearest in the other line
    for (const n of this.nodes) {
      const others = this.nodes.filter((m) => m.line !== n.line);
      n.pair = others.length ? others.reduce((p, m) => (Math.abs(m.rx - n.rx) < Math.abs(p.rx - n.rx) ? m : p)) : undefined;
    }
    for (const l of this.letters) this.renderLetter(l);
    for (const f of this.free) this.renderFree(f);
  }

  /** pick a letter up at a point (act px) */
  grab(l: Letter, px: number, py: number) {
    l.a.held = l.b.held = true;
    l.gx = px; l.gy = py;
    l.ox = (l.a.x + l.b.x) / 2; l.oy = (l.a.y + l.b.y) / 2;
    this.drag(l, px, py, 0, 0);
  }
  drag(l: Letter, px: number, py: number, vx: number, vy: number) {
    // rubber gives less the further it is pulled
    const ex = px - l.gx, ey = py - l.gy, D = Math.hypot(ex, ey), R = this.pull, k = D > 0.01 ? (R * Math.tanh(D / R)) / D : 1;
    const cx = l.ox + ex * k, cy = l.oy + ey * k;
    l.a.tx = cx - l.w0 / 2; l.b.tx = cx + l.w0 / 2; l.a.ty = l.b.ty = cy;
    l.vx = vx; l.vy = vy;
    this.wake();
  }
  release(l: Letter, vx: number, vy: number) {
    l.a.held = l.b.held = false;
    l.a.vx = l.b.vx = vx * 0.9; l.a.vy = l.b.vy = vy * 0.9;
    l.vx = vx; l.vy = vy;
    this.wake();
    const s = Math.hypot(vx, vy);
    if (s > 900) this.onShock?.(l, s);
  }
  ripple(x: number, y: number, a = 1) { this.pulses.push({ x, y, t0: performance.now() / 1000, a, hit: new Set(), probed: new Set() }); this.wake(); }
  /** everything back to rest, now */
  settle() {
    this.pulses.length = 0;
    for (const n of this.nodes) { n.x = n.rx; n.y = n.ry; n.vx = n.vy = 0; n.held = false; }
    for (const f of this.free) { f.dx = f.dy = f.vx = f.vy = 0; }
    for (const l of this.letters) this.renderLetter(l);
    for (const f of this.free) this.renderFree(f);
    this.awake = false;
  }
  private wake() { this.awake = true; this.stillFor = 0; }

  private tick = (_t: number, dms: number) => {
    if (!this.awake) return;
    const dt = Math.min(dms / 1000, 1 / 30), now = performance.now() / 1000;
    // the rings: a kick outward as each one passes
    for (const p of this.pulses) {
      const R = (now - p.t0) * RING, reach = 0.45 * Math.max(this.W, this.H);
      const kick = (o: object, x: number, y: number, held: boolean, J0: number) => {
        if (p.hit.has(o)) return null;
        const ex = x - p.x, ey = y - p.y, d = Math.hypot(ex, ey);
        if (d > R) return null;
        p.hit.add(o);
        if (held) return null;
        const J = J0 * p.a * Math.exp(-d / reach);
        return { x: J * (d > 1 ? ex / d : 0), y: J * (d > 1 ? ey / d : -1) };
      };
      for (const n of this.nodes) { const k = kick(n, n.x, n.y, n.held, 1500); if (k) { n.vx += k.x; n.vy += k.y; } }
      for (const f of this.free) { const k = kick(f, f.rx + f.dx, f.ry + f.dy, false, 1150); if (k) { f.vx += k.x; f.vy += k.y; } }
      this.probes.forEach((pr, i) => {
        if (p.probed.has(i)) return;
        const q = pr.at(), d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d <= R) { p.probed.add(i); pr.hit(p.a * Math.exp(-d / reach)); }
      });
    }
    const far = Math.hypot(this.W, this.H) + 60;
    this.pulses = this.pulses.filter((p) => (now - p.t0) * RING < far);

    // the strings, in small steps
    const STEPS = 6, h = dt / STEPS;
    for (let s = 0; s < STEPS; s++) {
      for (const n of this.nodes) {
        let ax = -K_GLUE * n.glue * (n.x - n.rx) - DAMP * n.vx, ay = -K_GLUE * n.glue * (n.y - n.ry) - DAMP * n.vy;
        if (n.pair) { ax += K_X * ((n.pair.x - n.pair.rx) - (n.x - n.rx)); ay += K_X * ((n.pair.y - n.pair.ry) - (n.y - n.ry)); }
        if (n.held) { ax += K_GRAB * (n.tx - n.x) - C_GRAB * n.vx; ay += K_GRAB * (n.ty - n.y) - C_GRAB * n.vy; }
        n.vx += ax * h; n.vy += ay * h;
      }
      // stretch and squash run along the line only (a squeezed string must not buckle); up and down,
      // neighbours keep level with each other, so a letter pulled down takes the line with it in a curve
      for (const l of this.letters) {
        const F = (K_SEG * (l.b.x - l.a.x - l.w0)) / l.w0, B = K_BEND * (l.b.y - l.a.y);
        l.a.vx += F * h; l.b.vx -= F * h; l.a.vy += B * h; l.b.vy -= B * h;
      }
      for (const n of this.nodes) { n.x += n.vx * h; n.y += n.vy * h; }
      // a letter is never squeezed flat
      for (const l of this.letters) {
        const L = l.b.x - l.a.x, min = l.w0 * MIN_W;
        if (L >= min) continue;
        const push = min - L;
        if (!l.a.held && !l.b.held) { l.a.x -= push / 2; l.b.x += push / 2; }
        else if (!l.a.held) l.a.x -= push;
        else if (!l.b.held) l.b.x += push;
      }
    }
    // the loose stickers
    for (const f of this.free) {
      for (let s = 0; s < 2; s++) {
        f.vx += (-K_FREE * f.dx - C_FREE * f.vx) * (dt / 2); f.vy += (-K_FREE * f.dy - C_FREE * f.vy) * (dt / 2);
        f.dx += f.vx * (dt / 2); f.dy += f.vy * (dt / 2);
      }
    }
    // the walls, and how lively it all still is
    let energy = 0;
    for (const n of this.nodes) {
      let hit = 0;
      if (n.x < 0 && n.vx < 0) { n.x = 0; hit = -n.vx; n.vx *= -0.5; }
      if (n.x > this.W && n.vx > 0) { n.x = this.W; hit = n.vx; n.vx *= -0.5; }
      if (n.y < 0 && n.vy < 0) { n.y = 0; hit = Math.max(hit, -n.vy); n.vy *= -0.5; }
      if (n.y > this.H && n.vy > 0) { n.y = this.H; hit = Math.max(hit, n.vy); n.vy *= -0.5; }
      if (hit > 700) {
        const l = this.letters.find((m) => m.a === n || m.b === n);
        if (l && now - l.shocked > 0.4) { l.shocked = now; l.vx = n.vx; l.vy = n.vy; this.onShock?.(l, hit); }
      }
      energy = Math.max(energy, Math.abs(n.vx), Math.abs(n.vy), Math.abs(n.x - n.rx) * 10, Math.abs(n.y - n.ry) * 10);
    }
    for (const f of this.free) {
      let hit = 0;
      if (f.rx + f.dx - f.w / 2 < 0 && f.vx < 0) { f.dx = f.w / 2 - f.rx; hit = -f.vx; f.vx *= -0.5; }
      if (f.rx + f.dx + f.w / 2 > this.W && f.vx > 0) { f.dx = this.W - f.w / 2 - f.rx; hit = f.vx; f.vx *= -0.5; }
      if (f.ry + f.dy - f.h / 2 < 0 && f.vy < 0) { f.dy = f.h / 2 - f.ry; hit = Math.max(hit, -f.vy); f.vy *= -0.5; }
      if (f.ry + f.dy + f.h / 2 > this.H && f.vy > 0) { f.dy = this.H - f.h / 2 - f.ry; hit = Math.max(hit, f.vy); f.vy *= -0.5; }
      if (hit > 700 && now - f.shocked > 0.4) { f.shocked = now; this.onShock?.(f, hit); }
      energy = Math.max(energy, Math.abs(f.vx), Math.abs(f.vy), Math.abs(f.dx) * 10, Math.abs(f.dy) * 10);
      this.renderFree(f);
    }
    for (const l of this.letters) { l.vx = (l.a.vx + l.b.vx) / 2; l.vy = (l.a.vy + l.b.vy) / 2; this.renderLetter(l); }
    if (energy < 3 && !this.pulses.length && !this.nodes.some((n) => n.held)) { if ((this.stillFor += dt) > 0.25) this.settle(); }
    else this.stillFor = 0;
  };

  private renderLetter(l: Letter) {
    const st = l.el.style;
    const w = Math.max(1, l.b.x - l.a.x), cx = (l.a.x + l.b.x) / 2, cy = (l.a.y + l.b.y) / 2;
    const tx = cx - l.cx, ty = cy - l.cy, rot = gsap.utils.clamp(-40, 40, (Math.atan2(l.b.y - l.a.y, w) * 180) / Math.PI);
    // the width goes into the font's width axis first, and past its range into a scale
    const ds = gsap.utils.clamp(DS_MIN, DS_MAX, ((w - l.w0) / l.grow) * DS_MAX);
    const wds = l.w0 + (l.grow * ds) / DS_MAX, sx = w / wds;
    // rubber thins as it stretches, and a letter pulled up or down grows a little tall
    const sy = gsap.utils.clamp(0.6, 2.2, Math.pow(w / l.w0, -0.3) * (1 + (0.45 * Math.abs(ty)) / l.h0));
    const dsp = ds - 0.22 * this._sheet;
    if (Math.abs(dsp) < 0.001) st.removeProperty('--dsp'); else st.setProperty('--dsp', dsp.toFixed(3));
    // the layout box keeps its width while the glyph changes, so nothing reflows
    st.marginInline = Math.abs(ds) > 0.001 ? `${(-(wds - l.w0) / 2).toFixed(2)}px` : '';
    const still = Math.abs(tx) < 0.05 && Math.abs(ty) < 0.05 && Math.abs(rot) < 0.02 && Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001;
    const t = still ? '' : `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    if (st.transform !== t) st.transform = t;
  }
  private renderFree(f: Free) {
    const st = f.el.style, t = f.dx || f.dy ? `translate(${f.dx.toFixed(1)}px, ${f.dy.toFixed(1)}px)` : '';
    if (st.transform !== t) st.transform = t;
  }
}
