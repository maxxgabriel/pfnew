import * as THREE from 'three';
import { meta, ready, tex } from './art';

/*
 * One of his drawings on a quad. Placed by the foot (or by the middle for tumbles), sized by head
 * size so a whole sequence keeps one scale. Every frame the scene says which drawing and where; if a
 * drawing hasn't arrived yet the last one that had stays up, so a slow network never blanks him.
 */
const V = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const F = /* glsl */`
uniform sampler2D uMap; uniform float uAlpha, uFlash, uInk, uSoft; uniform vec3 uFlashC, uInkC;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(uMap, vUv);
  if (uSoft > 0.0) { vec2 q = (vUv - 0.5) * 2.0; t.a *= 1.0 - smoothstep(1.0 - uSoft, 1.0, length(q)); }
  if (t.a < 0.02) discard;
  vec3 c = mix(t.rgb, uInkC, uInk);
  c = mix(c, uFlashC, uFlash);
  gl_FragColor = vec4(c, t.a * uAlpha);
}`;

export type Pose = {
  key: string; x: number; y: number; z: number; face: number;
  flip: boolean; rot: number; sx: number; sy: number; alpha: number; flash: number; ink: number;
  /** fade the drawing's edges into an ellipse (0 = off) */ soft: number;
  /** anchor at the top of the drawing (hanging) instead of the foot */ top: boolean;
  mid: boolean; bill: boolean; vis: boolean; flashC: THREE.Color | null;
};
const fresh = (): Pose => ({ key: '', x: 0, y: 0, z: 0, face: 50, flip: false, rot: 0, sx: 1, sy: 1, alpha: 1, flash: 0, ink: 0, soft: 0, top: false, mid: false, bill: false, vis: false, flashC: null });
const BASE = fresh();

export class Actor {
  readonly g = new THREE.Group();
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.ShaderMaterial;
  readonly p: Pose = fresh();
  private shown = '';
  constructor(order = 10) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: V, fragmentShader: F, transparent: true, depthWrite: false,
      uniforms: { uMap: { value: null }, uAlpha: { value: 1 }, uFlash: { value: 0 }, uInk: { value: 0 }, uSoft: { value: 0 }, uFlashC: { value: new THREE.Color(1, 1, 1) }, uInkC: { value: new THREE.Color('#1b1714') } },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.mesh.renderOrder = order;
    this.g.add(this.mesh);
  }
  reset() { Object.assign(this.p, BASE); }
  /** show drawing `key` with its foot at (x, y, z) in page px (y down), head `face` px */
  set(key: string, x: number, y: number, z: number, face: number, o: Partial<Pose> = {}) {
    Object.assign(this.p, { key, x, y, z, face, vis: true }, o);
    return this.p;
  }
  commit(camera: THREE.Camera) {
    const p = this.p;
    let key = p.key;
    if (p.vis && key && !ready(tex(key))) key = this.shown;
    const m = key ? meta(key) : undefined;
    this.g.visible = p.vis && !!m && p.alpha > 0.003;
    if (!this.g.visible || !m) return;
    this.shown = key;
    const s = p.face / m.face;
    this.mat.uniforms.uMap.value = tex(key);
    this.mat.uniforms.uAlpha.value = p.alpha;
    this.mat.uniforms.uFlash.value = p.flash;
    this.mat.uniforms.uInk.value = p.ink;
    this.mat.uniforms.uSoft.value = p.soft;
    if (p.flashC) (this.mat.uniforms.uFlashC.value as THREE.Color).copy(p.flashC);
    this.mesh.scale.set(m.w * s * (p.flip ? -1 : 1), m.h * s, 1);
    // the drawing's centre relative to the anchor (foot, or the middle of the figure)
    const ax = p.mid ? m.w / 2 : m.foot[0], ay = p.mid ? (m.top + m.foot[1]) / 2 : p.top ? m.top : m.foot[1];
    this.mesh.position.set((m.w / 2 - ax) * s * (p.flip ? -1 : 1), (ay - m.h / 2) * s, 0);
    this.g.position.set(p.x, -p.y, p.z);
    if (p.bill) this.g.quaternion.copy(camera.quaternion); else this.g.quaternion.identity();
    this.g.rotateZ(p.rot);
    this.g.scale.set(p.sx, p.sy, 1);
  }
}
