import manifest from '../assets/sketch/manifest.json';
import { url } from './art';
import { TWIN, onUniverse, universe } from './universe';

/*
 * The boy as one <img>: placed by his foot (x, y in the parent's px), sized by head size so every
 * drawing keeps one scale, mirrored and squashed around the foot. Swapping drawings is instant
 * because every pose is decoded up front.
 */
type Meta = { w: number; h: number; foot: number[]; face: number; top: number };
const META = manifest as unknown as Record<string, Meta>;

export class Boy {
  static all = new Set<Boy>();
  readonly el: HTMLImageElement;
  key = ''; shown = '';
  x = 0; y = 0; face = 40; flip = false; sx = 1; sy = 1; rot = 0;
  constructor(el: HTMLImageElement) { this.el = el; Boy.all.add(this); }
  static load(keys: string[]) {
    return Promise.all(keys.map((k) => { const im = new Image(); im.src = url(k); return im.decode().catch(() => undefined); }));
  }
  pose(key: string) {
    if (key !== this.key && META[key]) { this.key = key; this.show(); }
    return this;
  }
  /** the drawing for this pose in this universe: his twin where one exists, otherwise the ink original */
  show() {
    const t = TWIN[universe()] + this.key, k = META[t] && url(t) ? t : this.key;
    if (k !== this.shown) { this.shown = k; this.el.src = url(k); }
    this.el.classList.toggle('uni-art', k !== this.key || universe() === 'ink');
  }
  /** height of the current drawing from foot to the top of the head, px */
  get height() { const m = META[this.shown]; return m ? ((m.foot[1] - m.top) * this.face) / m.face : 0; }
  apply() {
    const m = META[this.shown];
    if (!m) return;
    const s = this.face / m.face, fx = m.foot[0] * s, fy = m.foot[1] * s;
    const st = this.el.style;
    st.width = `${m.w * s}px`; st.height = `${m.h * s}px`;
    st.transformOrigin = `${fx}px ${fy}px`;
    st.transform = `translate(${this.x - fx}px, ${this.y - fy}px) rotate(${this.rot}deg) scale(${(this.flip ? -1 : 1) * this.sx}, ${this.sy})`;
  }
}
onUniverse(() => { for (const b of Boy.all) if (b.key) { b.show(); b.apply(); } });
