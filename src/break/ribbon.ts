import * as THREE from 'three';
import type { Layout } from './layout';
import { LOOK } from './page';

/*
 * The nav bar as one long strip: first it peels off the page like a sticker (the part past the peel
 * front wraps round a cylinder and lifts toward you), then it becomes a ribbon that snakes along a 3D
 * route (Catmull-Rom through eight points), always turned toward the camera, with a twist. The strip
 * is painted with the nav itself, so the hand-over from the page is invisible.
 */
const V = /* glsl */`
uniform float uLen, uH, uFront, uRad, uMaxA, uSag, uPath, uTwist, uTime, uWide;
uniform vec3 uP[8]; uniform vec3 uView; uniform vec2 uOrigin;
varying vec2 vUv; varying float vShade;
vec3 cr(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
  return 0.5 * ((2.0 * b) + (-a + c) * t + (2.0 * a - 5.0 * b + 4.0 * c - d) * t * t + (-a + 3.0 * b - 3.0 * c + d) * t * t * t);
}
vec3 path(float u) {
  float f = clamp(u, 0.0, 1.0) * 5.0;
  int i = int(min(floor(f), 4.0));
  return cr(uP[i], uP[i + 1], uP[i + 2], uP[i + 3], f - float(i));
}
void main() {
  vUv = uv;
  float x = position.x, y = position.y;
  // peel: page position, curled past the front
  vec3 pe = vec3(uOrigin.x + x, -uOrigin.y + y, 0.5);
  float s = x - uFront, sh = 0.0;
  if (s > 0.0) {
    float a = s / uRad;
    if (a < uMaxA) { pe.x = uOrigin.x + uFront + uRad * sin(a); pe.z = 0.5 + uRad * (1.0 - cos(a)); sh = a / uMaxA; }
    else {
      float r = s - uRad * uMaxA;
      pe.x = uOrigin.x + uFront + uRad * sin(uMaxA) + r * cos(uMaxA);
      pe.z = 0.5 + uRad * (1.0 - cos(uMaxA)) + r * sin(uMaxA);
      sh = 1.0;
    }
    pe.y -= uSag * pow(s / uLen, 2.0);
  }
  // path: along the route, facing the camera, twisting
  float u = x / uLen;
  vec3 c = path(u);
  vec3 T = normalize(path(min(u + 0.01, 1.0)) - path(max(u - 0.01, 0.0)) + vec3(1e-4, 0.0, 0.0));
  vec3 N = normalize(cross(T, uView) + vec3(0.0, 1e-4, 0.0));
  float th = uTwist * sin(u * 6.2832 * 0.8 - uTime * 1.6);
  vec3 Nt = N * cos(th) + cross(T, N) * sin(th);
  vec3 pa = vec3(c.x, -c.y, c.z) + vec3(Nt.x, -Nt.y, Nt.z) * y * uWide;
  vShade = mix(sh, abs(sin(th)), uPath);
  gl_Position = projectionMatrix * viewMatrix * vec4(mix(pe, pa, uPath), 1.0);
}`;
const F = /* glsl */`
uniform sampler2D uMap; uniform vec3 uBack; uniform float uAlpha;
varying vec2 vUv; varying float vShade;
void main() {
  vec3 c = gl_FrontFacing ? texture2D(uMap, vUv).rgb * (1.0 - 0.18 * vShade) : uBack * (0.82 + 0.18 * (1.0 - vShade));
  gl_FragColor = vec4(c, uAlpha);
}`;

/** catmull-rom through 8 points (p[1] … p[6] on the curve), same as the shader */
export function routeAt(P: THREE.Vector3[], u: number, out = new THREE.Vector3()) {
  const f = Math.min(1, Math.max(0, u)) * 5, i = Math.min(Math.floor(f), 4), t = f - i;
  const [a, b, c, d] = [P[i], P[i + 1], P[i + 2], P[i + 3]];
  for (const k of ['x', 'y', 'z'] as const) out[k] = 0.5 * (2 * b[k] + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t * t * t);
  return out;
}

export class Ribbon {
  readonly mesh: THREE.Mesh;
  readonly u = {
    uLen: { value: 1 }, uH: { value: 1 }, uFront: { value: 1e5 }, uRad: { value: 40 }, uMaxA: { value: 2.2 }, uSag: { value: 0 },
    uPath: { value: 0 }, uTwist: { value: 0 }, uTime: { value: 0 }, uWide: { value: 1 }, uP: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
    uView: { value: new THREE.Vector3(0, 0, 1) }, uOrigin: { value: new THREE.Vector2() },
    uMap: { value: null as THREE.Texture | null }, uBack: { value: new THREE.Color('#dedee3') }, uAlpha: { value: 1 },
  };
  vis = false;
  constructor() {
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ vertexShader: V, fragmentShader: F, uniforms: this.u, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
  }
  /** paint the nav into the strip's texture, at 2x */
  build(L: Layout) {
    const nav = L.get('nav'), k = 2;
    const cv = document.createElement('canvas');
    cv.width = Math.round(nav.w * k); cv.height = Math.round(nav.h * k);
    const g = cv.getContext('2d')!;
    g.scale(k, k);
    for (const b of L.blocks) {
      if (b.id !== 'nav' && b.parent !== 'nav') continue;
      const [f, line] = LOOK[b.kind];
      g.fillStyle = f;
      g.beginPath(); g.roundRect(b.x - nav.x, b.y - nav.y, b.w, b.h, Math.min(b.r, b.w / 2, b.h / 2)); g.fill();
      if (line && b.kind !== 'nav') { g.strokeStyle = line; g.lineWidth = 1; g.stroke(); }
    }
    (this.u.uMap.value as THREE.Texture | null)?.dispose();
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
    this.u.uMap.value = t;
    const geo = new THREE.PlaneGeometry(nav.w, nav.h, 200, 1);
    geo.translate(nav.w / 2, 0, 0);
    this.mesh.geometry.dispose();
    this.mesh.geometry = geo;
    this.u.uLen.value = nav.w; this.u.uH.value = nav.h;
    this.u.uOrigin.value.set(nav.x, nav.y + nav.h / 2);
  }
  reset() { this.vis = false; this.u.uWide.value = 1; this.u.uPath.value = 0; this.u.uFront.value = 1e5; this.u.uSag.value = 0; this.u.uTwist.value = 0; this.u.uAlpha.value = 1; }
  commit(camera: THREE.Camera, t: number) {
    this.mesh.visible = this.vis;
    this.u.uTime.value = t;
    camera.getWorldDirection(this.u.uView.value).negate();
    // the shader works in page axes (y down); flip the view vector to match
    this.u.uView.value.y *= -1;
  }
  /** where a point of the peeled strip is (page px, y down), for hanging him from it */
  peelAt(x: number, y: number) {
    const u = this.u, s = x - u.uFront.value, o = u.uOrigin.value, R = u.uRad.value, A = u.uMaxA.value;
    if (s <= 0) return new THREE.Vector3(o.x + x, o.y - y, 0.5);
    const a = s / R;
    const v = a < A ? new THREE.Vector3(o.x + u.uFront.value + R * Math.sin(a), 0, 0.5 + R * (1 - Math.cos(a)))
      : new THREE.Vector3(o.x + u.uFront.value + R * Math.sin(A) + (s - R * A) * Math.cos(A), 0, 0.5 + R * (1 - Math.cos(A)) + (s - R * A) * Math.sin(A));
    v.y = o.y - y + u.uSag.value * (s / u.uLen.value) ** 2;
    return v;
  }
}
