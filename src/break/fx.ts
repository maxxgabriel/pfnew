import * as THREE from 'three';

/*
 * Single strong shapes drawn with signed distances on a quad: a ring (the snap, a slam) or a disc
 * (the Spark, glowing). Placed in page px like the actors. One at a time, never a swarm.
 */
const V = /* glsl */`uniform float uSize; varying vec2 vP; void main() { vP = position.xy * uSize; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const F = /* glsl */`
uniform float uR, uW, uAlpha, uGlow, uDisc; uniform vec3 uColor;
varying vec2 vP;
void main() {
  float d = length(vP);
  float a;
  if (uDisc > 0.5) a = 1.0 - smoothstep(uR - 1.2, uR + 1.2, d);
  else a = 1.0 - smoothstep(uW * 0.5 - 1.0, uW * 0.5 + 1.0, abs(d - uR));
  a = max(a, uGlow * exp(-pow(max(d - uR * uDisc, 0.0) / (uR * 0.9 + 1.0), 2.0)) * 0.55);
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a * uAlpha);
}`;

export class Shape {
  readonly mesh: THREE.Mesh;
  readonly u = { uSize: { value: 1 }, uR: { value: 10 }, uW: { value: 4 }, uAlpha: { value: 1 }, uGlow: { value: 0 }, uDisc: { value: 0 }, uColor: { value: new THREE.Color('#e8432a') } };
  /** page px (y down) */ x = 0; y = 0; z = 0; vis = false; bill = false;
  constructor(order = 30) {
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ vertexShader: V, fragmentShader: F, uniforms: this.u, transparent: true, depthWrite: false }));
    this.mesh.renderOrder = order;
  }
  reset() { this.vis = false; this.u.uGlow.value = 0; this.u.uAlpha.value = 1; this.bill = false; }
  ring(x: number, y: number, z: number, r: number, w: number, col: THREE.Color, alpha = 1) {
    Object.assign(this, { x, y, z, vis: true });
    this.u.uR.value = r; this.u.uW.value = w; this.u.uDisc.value = 0; this.u.uAlpha.value = alpha; this.u.uColor.value.copy(col);
  }
  disc(x: number, y: number, z: number, r: number, col: THREE.Color, glow = 0, alpha = 1) {
    Object.assign(this, { x, y, z, vis: true });
    this.u.uR.value = r; this.u.uDisc.value = 1; this.u.uGlow.value = glow; this.u.uAlpha.value = alpha; this.u.uColor.value.copy(col);
  }
  commit(camera: THREE.Camera) {
    this.mesh.visible = this.vis && this.u.uAlpha.value > 0.003;
    if (!this.mesh.visible) return;
    const r = this.u.uR.value, size = (r + this.u.uW.value + (this.u.uGlow.value > 0 ? r * 2.2 : 0)) * 2 + 8;
    this.mesh.scale.set(size, size, 1);
    this.u.uSize.value = size;
    this.mesh.position.set(this.x, -this.y, this.z);
    if (this.bill) this.mesh.quaternion.copy(camera.quaternion); else this.mesh.quaternion.identity();
  }
}
