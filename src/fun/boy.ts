import manifest from '../assets/sketch/manifest.json';
import { url } from './art';

/*
 * The boy as one <img>: placed by his foot (x, y in the parent's px), sized by head size so every
 * drawing keeps one scale, mirrored and squashed around the foot. Swapping drawings is instant
 * because every pose is decoded up front.
 */
type Meta = { w: number; h: number; foot: number[]; face: number; top: number };
const META = manifest as unknown as Record<string, Meta>;

export class Boy {
  readonly el: HTMLImageElement;
  key = '';
  x = 0; y = 0; face = 40; flip = false; sx = 1; sy = 1; rot = 0;
  constructor(el: HTMLImageElement) { this.el = el; }
  static load(keys: string[]) {
    return Promise.all(keys.map((k) => { const im = new Image(); im.src = url(k); return im.decode().catch(() => undefined); }));
  }
  pose(key: string) {
    if (key !== this.key && META[key]) { this.key = key; this.el.src = url(key); }
    return this;
  }
  /** height of the current drawing from foot to the top of the head, px */
  get height() { const m = META[this.key]; return m ? ((m.foot[1] - m.top) * this.face) / m.face : 0; }
  apply() {
    const m = META[this.key];
    if (!m) return;
    const s = this.face / m.face, fx = m.foot[0] * s, fy = m.foot[1] * s;
    const st = this.el.style;
    st.width = `${m.w * s}px`; st.height = `${m.h * s}px`;
    st.transformOrigin = `${fx}px ${fy}px`;
    st.transform = `translate(${this.x - fx}px, ${this.y - fy}px) rotate(${this.rot}deg) scale(${(this.flip ? -1 : 1) * this.sx}, ${this.sy})`;
  }
}
