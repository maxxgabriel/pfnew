import * as THREE from 'three';

/*
 * The last pass over the frame: impact frames (the whole picture slammed to two flat colours for a
 * moment, the anime way), a chromatic kick on hits, ink wipes with a ragged brush edge, paper grain
 * and a vignette. The scene renders into a multisampled target first.
 */
const V = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const F = /* glsl */`
uniform sampler2D tScene; uniform vec2 uRes; uniform float uTime, uImpact, uChroma, uVig, uGrain, uWipe, uWipeSoft, uStyle, uPx;
uniform vec3 uImpA, uImpB, uWipeC; uniform vec2 uWipeDir;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 tap(vec2 uv) { return texture2D(tScene, uv).rgb; }
float edge(vec2 uv, float r) {
  vec2 e = r / uRes;
  float tl = lum(tap(uv + vec2(-e.x, e.y))), t = lum(tap(uv + vec2(0.0, e.y))), tr = lum(tap(uv + e));
  float l = lum(tap(uv - vec2(e.x, 0.0))), rr = lum(tap(uv + vec2(e.x, 0.0)));
  float bl = lum(tap(uv - e)), b = lum(tap(uv - vec2(0.0, e.y))), br = lum(tap(uv + vec2(e.x, -e.y)));
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * rr + br, gy = -bl - 2.0 * b - br + tl + 2.0 * t + tr;
  return sqrt(gx * gx + gy * gy);
}
/* the seven looks he draws in, as a pass over the whole frame (0 = ink, as drawn) */
vec3 styled(vec2 uv, vec3 c) {
  vec2 px = uv * uRes;
  if (uStyle < 0.5) return c;
  if (uStyle < 1.5) { // pixel: big pixels, a few levels, ordered dither
    float bs = 5.0 * uPx;
    vec2 q = (floor(px / bs) + 0.5) * bs / uRes;
    vec3 s = tap(q);
    vec2 cell = mod(floor(px / bs), 4.0);
    float bay = mod(cell.x * 3.0 + cell.y * 7.0, 16.0) / 16.0 - 0.5;
    return floor(s * 5.0 + 0.5 + bay * 0.6) / 5.0;
  }
  if (uStyle < 2.5) { // comic: flat colour, ink outlines, halftone in the shade
    vec3 s = floor(c * 4.0 + 0.5) / 4.0;
    s = mix(vec3(lum(s)), s, 1.35);
    float e = smoothstep(0.25, 0.6, edge(uv, 1.5 * uPx));
    float ang = 0.785, cs = cos(ang), sn = sin(ang);
    vec2 r = mat2(cs, -sn, sn, cs) * px / (6.0 * uPx);
    float dot_ = length(fract(r) - 0.5);
    float tone = 1.0 - lum(c);
    s *= mix(1.0, 0.25, step(dot_, tone * 0.55) * smoothstep(0.25, 0.6, tone));
    return mix(s, vec3(0.06, 0.05, 0.05), e);
  }
  if (uStyle < 3.5) { // watercolour: bleeding edges, pooled pigment, paper
    vec2 w = (vec2(fbm(px * 0.012 + 3.1), fbm(px * 0.012 + 7.7)) - 0.5) * 9.0 * uPx / uRes;
    vec3 s = (tap(uv + w) + tap(uv + w * 1.8 + 2.0 / uRes) + tap(uv - w) + tap(uv + vec2(w.y, -w.x))) * 0.25;
    float pool = smoothstep(0.05, 0.3, edge(uv + w, 3.0 * uPx));
    s *= 1.0 - pool * 0.35;
    float paper = 0.92 + 0.08 * fbm(px * 0.08);
    return mix(s, s * vec3(1.0, 0.97, 0.92), 0.5) * paper + 0.04;
  }
  if (uStyle < 4.5) { // clay: soft steps, a bevel of light, warm
    vec3 s = floor(c * 6.0 + 0.5) / 6.0;
    float b = lum(tap(uv - 2.0 * uPx / uRes)) - lum(tap(uv + 2.0 * uPx / uRes));
    s += b * 0.6;
    return mix(vec3(lum(s)), s, 1.25) * vec3(1.06, 0.98, 0.9);
  }
  if (uStyle < 5.5) { // chalk on a board
    float e = edge(uv, 1.6 * uPx), l = lum(c);
    float grain = fbm(px * vec2(0.9, 0.25)) * 0.8 + 0.4;
    float chalk = clamp(e * 1.6 + smoothstep(0.55, 0.95, l) * 0.55, 0.0, 1.0) * grain;
    vec3 board = vec3(0.12, 0.17, 0.14) + 0.03 * fbm(px * 0.01);
    vec3 ink = mix(vec3(0.93, 0.92, 0.86), vec3(0.98, 0.55, 0.5), step(0.15, c.r - c.g) * 0.8);
    return mix(board, ink, chalk);
  }
  // rubber hose, 1930s: sepia film, heavy grain, gate weave, flicker
  vec2 wv = uv + vec2(0.0, sin(uTime * 24.0) * 0.0015);
  float l = lum(tap(wv));
  l = smoothstep(0.08, 0.92, l);
  vec3 s = mix(vec3(0.16, 0.12, 0.08), vec3(0.95, 0.88, 0.7), l);
  s *= 0.92 + 0.08 * sin(uTime * 41.0);
  s += (hash(px + fract(uTime * 13.0) * 77.0) - 0.5) * 0.14;
  vec2 q = uv - 0.5;
  return s * (1.0 - dot(q, q) * 1.4);
}
void main() {
  vec2 uv = vUv;
  vec3 c;
  if (uChroma > 0.001) {
    vec2 o = (uv - 0.5) * uChroma / uRes * 2.0;
    c = vec3(texture2D(tScene, uv + o).r, texture2D(tScene, uv).g, texture2D(tScene, uv - o).b);
  } else c = texture2D(tScene, uv).rgb;
  c = styled(uv, c);
  if (uImpact > 0.001) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c, l > 0.5 ? uImpB : uImpA, uImpact);
  }
  if (uWipe > 0.001) {
    vec2 a = vec2(uRes.x / uRes.y, 1.0);
    float s = dot((uv - 0.5) * a, normalize(uWipeDir)) / (0.5 * length(a)) * 0.5 + 0.5;
    float n = fbm(uv * a * 4.0 + uTime * 0.05) - 0.5;
    float e = uWipe * 1.4 - 0.2 + n * 0.22;
    c = mix(c, uWipeC, 1.0 - smoothstep(e - uWipeSoft, e, s));
  }
  vec2 q = uv - 0.5;
  c *= 1.0 - uVig * dot(q, q) * 1.6;
  c += (hash(uv * uRes + fract(uTime * 7.0) * 91.0) - 0.5) * uGrain;
  gl_FragColor = vec4(c, 1.0);
}`;

export class Post {
  readonly rt: THREE.WebGLRenderTarget;
  readonly u = {
    tScene: { value: null as THREE.Texture | null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
    uImpact: { value: 0 }, uImpA: { value: new THREE.Color('#1b1714') }, uImpB: { value: new THREE.Color('#e8432a') },
    uChroma: { value: 0 }, uVig: { value: 0 }, uGrain: { value: 0 },
    uWipe: { value: 0 }, uWipeSoft: { value: 0.01 }, uWipeC: { value: new THREE.Color('#1b1714') }, uWipeDir: { value: new THREE.Vector2(0, 1) },
    uStyle: { value: 0 }, uPx: { value: 1 },
  };
  private readonly scene = new THREE.Scene();
  private readonly cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  constructor() {
    this.rt = new THREE.WebGLRenderTarget(2, 2, { samples: 4, depthBuffer: true });
    this.u.tScene.value = this.rt.texture;
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: V, fragmentShader: F, uniforms: this.u, depthTest: false, depthWrite: false }));
    quad.frustumCulled = false;
    this.scene.add(quad);
  }
  /** w, h in device px; px = device px per css px */
  setSize(w: number, h: number, px = 1) { this.rt.setSize(w, h); this.u.uRes.value.set(w, h); this.u.uPx.value = px; }
  /** back to a clean frame; scenes then add what they need */
  reset() {
    const u = this.u;
    u.uImpact.value = 0; u.uChroma.value = 0; u.uVig.value = 0; u.uGrain.value = 0; u.uWipe.value = 0; u.uWipeSoft.value = 0.01; u.uStyle.value = 0;
    u.uImpA.value.set('#1b1714'); u.uImpB.value.set('#e8432a'); u.uWipeC.value.set('#1b1714'); u.uWipeDir.value.set(0, 1);
  }
  render(r: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    r.setRenderTarget(this.rt); r.render(scene, camera);
    r.setRenderTarget(null); r.render(this.scene, this.cam);
  }
}
