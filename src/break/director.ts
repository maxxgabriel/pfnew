import * as THREE from 'three';
import { Actor } from './actor';
import type { Layout } from './layout';
import { noise } from './math';
import { Page, shared } from './page';
import { Post } from './post';
import { Shape } from './fx';
import { Ribbon } from './ribbon';
import { drop } from './scenes/drop';
import { floor } from './scenes/floor';
import { home } from './scenes/home';
import { opening } from './scenes/open';
import { peel } from './scenes/peel';
import { quiet } from './scenes/quiet';
import { snap } from './scenes/snap';

/*
 * Every frame is a pure function of the playhead (b, in beats) plus the clock (t, for the loops that
 * keep things moving while you watch). Each frame starts from rest — the flat grey page, the boy
 * hidden, a flat camera — and the scenes, in running order, pile their changes on top. Scrolling back
 * is therefore free: nothing is simulated, everything is recomputed.
 */
export const FOV = 35;
export type Cam = { x: number; y: number; z: number; tx: number; ty: number; tz: number; fov: number; roll: number; shake: number };
export type Ctx = {
  b: number; t: number; idle: number; calm: boolean;
  /** scroll speed, beats per second (signed, smoothed) */ v: number;
  L: Layout; page: Page; boy: Actor; eye: Actor; post: Post; fx: { a: Shape; b: Shape; spark: Shape }; rib: Ribbon;
  /** stamped art at the end (lettering, seal, his faces) */ deco: Actor[];
  /** the contact link is live over the button */ hi: boolean;
  cam: Cam; scroll: number; bg: THREE.Color; theme: string;
};

/** a camera circling a target (page px): yaw round the vertical, pitch up over the page */
export function orbit(c: Ctx, tx: number, ty: number, tz: number, dist: number, yaw: number, pitch: number, fov = FOV) {
  Object.assign(c.cam, {
    x: tx + dist * Math.sin(yaw) * Math.cos(pitch), y: ty - dist * Math.sin(pitch), z: tz + dist * Math.cos(yaw) * Math.cos(pitch),
    tx, ty, tz, fov, roll: 0,
  });
}
/** distance at which the flat camera sees the page 1:1 */
export const flatDist = (H: number, fov = FOV) => H / 2 / Math.tan((fov * Math.PI) / 360);

/** the camera that sees the page exactly as a browser would, scrolled by s page px */
export function flat(c: Ctx, s: number, fov = FOV) {
  const { W, H } = c.L, d = H / 2 / Math.tan((fov * Math.PI) / 360);
  Object.assign(c.cam, { x: W / 2, y: H / 2 + s, z: d, tx: W / 2, ty: H / 2 + s, tz: 0, fov, roll: 0 });
  c.scroll = s;
}

const SCENES = [opening, snap, peel, drop, floor, quiet, home];

export class Director {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 5, 60000);
  readonly page = new Page();
  readonly boy = new Actor(20);
  readonly eye = new Actor(4);
  readonly post = new Post();
  readonly fx = { a: new Shape(30), b: new Shape(31), spark: new Shape(15) };
  readonly rib = new Ribbon();
  readonly deco = Array.from({ length: 7 }, () => new Actor(12));
  readonly c: Ctx;
  /** clock time of the last tap on him */
  tapped = -1e9;
  constructor(L: Layout, calm: boolean) {
    this.c = {
      b: 0, t: 0, idle: 0, v: 0, calm, L, page: this.page, boy: this.boy, eye: this.eye, post: this.post, fx: this.fx, rib: this.rib, deco: this.deco, hi: false,
      cam: { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 0, fov: FOV, roll: 0, shake: 0 }, scroll: 0, bg: new THREE.Color('#f7f7f8'), theme: '#f7f7f8',
    };
    this.scene.add(this.page.root, this.boy.g, this.eye.g, this.fx.a.mesh, this.fx.b.mesh, this.fx.spark.mesh, this.rib.mesh, ...this.deco.map((a) => a.g));
    this.layout(L);
  }
  layout(L: Layout) {
    this.c.L = L;
    this.page.build(L);
    this.rib.build(L);
    this.camera.aspect = L.W / L.H;
  }
  update(b: number, t: number, idle: number, v = 0) {
    const c = this.c;
    c.b = b; c.t = t; c.idle = idle; c.v = v;
    c.page.reset(); c.boy.reset(); c.eye.reset(); c.post.reset();
    for (const f of Object.values(c.fx)) f.reset();
    c.rib.reset();
    for (const a of c.deco) a.reset();
    c.hi = false;
    c.bg.set('#f7f7f8'); c.theme = '#f7f7f8'; c.cam.shake = 0;
    flat(c, 0);
    shared.uTime.value = t;
    for (const s of SCENES) s(c);
    // inner parts (card images and lines, nav links, footer lines) follow their parent into outline or out of sight
    for (const p of c.page.pieces) {
      if (!p.b.parent) continue;
      const par = c.page.get(p.b.parent).look;
      p.look.wire = Math.max(p.look.wire, par.wire);
      p.look.alpha = Math.min(p.look.alpha, par.alpha);
    }
    // a tap on him: a jump of surprise, then a grin (wherever he is, whatever he was doing)
    const r = t - this.tapped;
    if (r >= 0 && r < 0.95 && c.boy.p.vis) {
      const p = c.boy.p;
      p.key = r < 0.4 ? 'comedy_0' : 'extra_1';
      p.y -= Math.sin(Math.min(1, r / 0.5) * Math.PI) * c.L.face * 0.9;
      p.sx *= 1 + 0.12 * Math.exp(-r * 9); p.sy *= 1 + 0.12 * Math.exp(-r * 9);
      p.top = false; p.mid = false; p.rot = 0;
    }
    // the camera, with any shake
    const k = c.calm ? 0 : c.cam.shake, n = (o: number) => noise(t * 23 + o) * k;
    this.camera.fov = c.cam.fov;
    this.camera.position.set(c.cam.x + n(1), -(c.cam.y + n(7)), c.cam.z);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(c.cam.tx + n(13), -(c.cam.ty + n(19)), c.cam.tz);
    this.camera.rotateZ(c.cam.roll + n(29) * 0.0015);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    c.page.commit(); c.boy.commit(this.camera); c.eye.commit(this.camera);
    for (const f of Object.values(c.fx)) f.commit(this.camera);
    c.rib.commit(this.camera, t);
    for (const a of c.deco) a.commit(this.camera);
    c.post.u.uTime.value = t;
  }
  /** is this screen point (css px) on him? */
  hits(x: number, y: number) {
    const m = this.boy.mesh, v = new THREE.Vector3(), L = this.c.L;
    if (!this.boy.g.visible) return false;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [sx, sy] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
      v.set(sx, sy, 0).applyMatrix4(m.matrixWorld).project(this.camera);
      const px = ((v.x + 1) / 2) * L.W, py = ((1 - v.y) / 2) * L.H;
      x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
    }
    const pad = 12;
    return x > x0 - pad && x < x1 + pad && y > y0 - pad && y < y1 + pad;
  }
  /** where the call-to-action is on screen (css px), for the real link laid over it */
  ctaRect() {
    const p = this.page.get('cta'), { w, h } = p.b, v = new THREE.Vector3(), L = this.c.L;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      v.set((sx * w) / 2, (sy * h) / 2, 0).applyMatrix4(p.g.matrixWorld).project(this.camera);
      const x = ((v.x + 1) / 2) * L.W, y = ((1 - v.y) / 2) * L.H;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  render(r: THREE.WebGLRenderer) {
    r.setClearColor(this.c.bg, 1);
    this.post.render(r, this.scene, this.camera);
  }
}
