import * as THREE from 'three';
import { heightMap } from './art';
import type { Block, Kind, Layout } from './layout';

/*
 * The page as real geometry. Every block is a rounded rectangle extruded to depth 1 (front face at z 0,
 * sides running back), scaled in z to its current thickness: flat it reads exactly like a web page,
 * thick it is a slab you can throw around in 3D. The media box is its own object (Media): a rubber
 * skin cut into four flaps along its X, with a dark well behind the page.
 * World units are page px; world y = -page y.
 */
export const INK = new THREE.Color('#1b1714'), PAPER = new THREE.Color('#efe9dc'), RED = new THREE.Color('#e8432a');

// front, outline, sides
export const LOOK: Record<Kind, [string, string | null, string]> = {
  sheet: ['#f7f7f8', '#d6d6dc', '#d9d9de'],
  nav: ['#ffffff', null, '#d4d4da'],
  rule: ['#e7e7eb', null, '#cfcfd6'],
  logo: ['#c9c9d0', null, '#a9a9b2'],
  bar: ['#e4e4e8', null, '#bdbdc5'],
  burger: ['#9d9da6', null, '#7c7c86'],
  head: ['#d9d9df', null, '#b3b3bc'],
  badge: ['#f1f1f3', '#dcdce1', '#c8c8cf'],
  btn: ['#c8c8cf', null, '#a2a2ac'],
  btn2: ['#ffffff', '#d4d4da', '#c8c8cf'],
  media: ['#eeeef1', '#d6d6dc', '#c3c3ca'],
  card: ['#ffffff', '#e6e6ea', '#cfcfd6'],
  cimg: ['#eeeef1', null, '#c8c8cf'],
  foot: ['#1d1d21', null, '#111114'],
  fbar: ['#38383f', null, '#26262b'],
};
// Max's site, ink on paper with the red Spark: front, outline
const INKLOOK: Record<Kind, [string, string | null]> = {
  sheet: ['#efe9dc', null], nav: ['#efe9dc', null], rule: ['#1b1714', null], logo: ['#e8432a', null],
  bar: ['#1b1714', null], burger: ['#1b1714', null], head: ['#1b1714', null], badge: ['#efe9dc', '#1b1714'],
  btn: ['#e8432a', null], btn2: ['#efe9dc', '#1b1714'], media: ['#e4dccb', '#1b1714'], card: ['#f6f1e6', '#1b1714'],
  cimg: ['#e4dccb', null], foot: ['#1b1714', null], fbar: ['#5a5047', null],
};
const SHIMMER = new Set<Kind>(['logo', 'bar', 'head', 'cimg']);

/** shared by every material: the clock and the skeleton shimmer's sweep */
export const shared = { uTime: { value: 0 }, uShimX: { value: -1e4 } };

const SDF = /* glsl */`
float sdRR(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r; }`;

const BLOCK_V = /* glsl */`
varying vec2 vP; varying vec3 vN; varying vec3 vW; varying float vFront;
void main() {
  vP = position.xy;
  vFront = normal.z > 0.5 ? 1.0 : 0.0;
  vN = normalize(normalMatrix * normal);
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const BLOCK_F = /* glsl */`
uniform vec3 uColor, uSide, uLine, uFlashC;
uniform vec2 uHalf; uniform float uR, uBorder, uShim, uShimX, uFlash, uAlpha, uHole, uHoleR, uWire;
uniform vec4 uHoleRect;
varying vec2 vP; varying vec3 vN; varying vec3 vW; varying float vFront;
${SDF}
void main() {
  vec3 c;
  float a = uAlpha;
  if (vFront > 0.5) {
    float d = sdRR(vP, uHalf, uR);
    c = uColor;
    // wire: only the outline, drawn in paper (the page coming back as a sketch)
    if (uWire > 0.0) { a *= mix(1.0, 1.0 - smoothstep(2.2, 3.6, -d), uWire); c = mix(c, vec3(0.94, 0.91, 0.86), uWire); }
    if (uBorder > 0.0) c = mix(c, uLine, smoothstep(-uBorder - 0.75, -uBorder + 0.25, d));
    if (uHole > 0.0) {
      float dh = sdRR(vP - uHoleRect.xy, uHoleRect.zw, uHoleR);
      if (dh < 0.0) discard;
      c = mix(c, uLine, (1.0 - smoothstep(0.0, 1.5, dh)) * uHole);
    }
    float band = exp(-pow((vW.x + vW.y * 0.4 - uShimX) / 120.0, 2.0));
    c = mix(c, vec3(1.0), band * uShim);
  } else {
    if (uWire > 0.5) discard;
    float l = 0.5 + 0.5 * max(dot(vN, normalize(vec3(-0.45, 0.7, 0.55))), 0.0);
    c = uSide * l;
  }
  if (a < 0.01) discard;
  c = mix(c, uFlashC, uFlash);
  gl_FragColor = vec4(c, a);
}`;

export type Look = {
  /** offset from rest, page px (y down) */ x: number; y: number; z: number;
  rx: number; ry: number; rz: number; s: number; sx: number; sy: number;
  depth: number; flash: number; alpha: number; shim: number; vis: boolean;
  /** 0 grey template … 1 Max's ink-on-paper site */ ink: number;
  /** 0 solid … 1 outline only */ wire: number;
  color: THREE.Color | null; side: THREE.Color | null; flashC: THREE.Color | null;
};
const fresh = (): Look => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, sx: 1, sy: 1, depth: 0, flash: 0, alpha: 1, shim: 0, vis: true, ink: 0, wire: 0, color: null, side: null, flashC: null });
const BASE = fresh();

function slab(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: r > 12 ? 10 : 5 });
  g.translate(0, 0, -1);
  return g;
}

export class Piece {
  readonly g = new THREE.Group();
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.ShaderMaterial;
  readonly look: Look = fresh();
  readonly front: THREE.Color; readonly side: THREE.Color; readonly line: THREE.Color;
  readonly inkFront: THREE.Color; readonly inkLine: THREE.Color; private readonly border: number; private readonly inkBorder: number;
  /** rest centre, relative to the parent group (world axes) */
  readonly rest: THREE.Vector3;
  readonly cx: number; readonly cy: number;
  readonly b: Block;
  constructor(b: Block, parent?: Block) {
    this.b = b;
    const [f, l, s] = LOOK[b.kind];
    this.front = new THREE.Color(f); this.side = new THREE.Color(s); this.line = new THREE.Color(l ?? f);
    const [inf, inl] = INKLOOK[b.kind];
    this.inkFront = new THREE.Color(inf); this.inkLine = new THREE.Color(inl ?? inf);
    this.border = l && b.kind !== 'sheet' ? 1 : 0; this.inkBorder = inl ? 2.2 : 0;
    this.cx = b.x + b.w / 2; this.cy = b.y + b.h / 2;
    const z = b.kind === 'sheet' ? 0 : 0.4;
    this.rest = parent ? new THREE.Vector3(this.cx - (parent.x + parent.w / 2), -(this.cy - (parent.y + parent.h / 2)), 0.4) : new THREE.Vector3(this.cx, -this.cy, z);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: BLOCK_V, fragmentShader: BLOCK_F,
      uniforms: {
        uColor: { value: this.front.clone() }, uSide: { value: this.side.clone() }, uLine: { value: this.line.clone() }, uFlashC: { value: new THREE.Color(1, 1, 1) },
        uHalf: { value: new THREE.Vector2(b.w / 2, b.h / 2) }, uR: { value: Math.min(b.r, b.w / 2, b.h / 2) },
        uBorder: { value: l && b.kind !== 'sheet' ? 1 : 0 }, uShim: { value: 0 }, uShimX: shared.uShimX, uFlash: { value: 0 }, uAlpha: { value: 1 }, uWire: { value: 0 },
        uHole: { value: 0 }, uHoleR: { value: 0 }, uHoleRect: { value: new THREE.Vector4() },
      },
    });
    this.mesh = new THREE.Mesh(slab(b.w, b.h, b.r), this.mat);
    this.g.add(this.mesh);
  }
  reset() { Object.assign(this.look, BASE); }
  commit() {
    const L = this.look, u = this.mat.uniforms;
    this.g.visible = L.vis && L.alpha > 0.003;
    if (!this.g.visible) return;
    this.g.position.set(this.rest.x + L.x, this.rest.y - L.y, this.rest.z + L.z);
    this.g.rotation.set(L.rx, L.ry, L.rz);
    this.g.scale.set(L.s * L.sx, L.s * L.sy, 1);
    this.mesh.scale.z = Math.max(L.depth, 0.02);
    const k = L.ink, col = u.uColor.value as THREE.Color;
    if (L.color) col.copy(L.color); else col.copy(this.front).lerp(this.inkFront, k);
    (u.uLine.value as THREE.Color).copy(this.line).lerp(this.inkLine, k);
    u.uBorder.value = this.border + (this.inkBorder - this.border) * k;
    (u.uSide.value as THREE.Color).copy(L.side ?? (L.color || k > 0 ? col.clone().multiplyScalar(0.72) : this.side));
    u.uWire.value = L.wire;
    (u.uFlashC.value as THREE.Color).copy(L.flashC ?? PAPER);
    u.uFlash.value = L.flash; u.uAlpha.value = L.alpha;
    u.uShim.value = SHIMMER.has(this.b.kind) ? L.shim : 0;
    const see = L.alpha < 0.999 || L.wire > 0;
    if (this.mat.transparent !== see) { this.mat.transparent = see; this.mat.depthWrite = !see; }
  }
}

/* ---------- the media box: a rubber skin over a hole, cut into four flaps along its X ---------- */
// a fist (his drawing's silhouette, blurred into a height map) pressing into the skin from behind
const FLAP_V = /* glsl */`
uniform vec4 uK[3]; uniform vec2 uHalf; uniform float uMaxD; uniform sampler2D uFist;
varying vec2 vP; varying vec3 vN; varying float vDisp;
// vN is in the box's own space: the light is fixed to the box, so a tilting camera never darkens it
float fist(vec2 p, vec4 k) {
  if (k.z == 0.0) return 0.0;
  vec2 uv = (p - k.xy) / k.w + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  vec4 m = texture2D(uFist, uv);
  return k.z * (m.r * 0.45 + m.g * 0.55);
}
float disp(vec2 p) {
  float d = fist(p, uK[0]) + fist(p, uK[1]) + fist(p, uK[2]);
  vec2 m = 1.0 - smoothstep(uHalf - min(uHalf * 0.35, 70.0), uHalf, abs(p));
  return d * m.x * m.y;
}
void main() {
  vec2 p = position.xy; float z = disp(p);
  float dx = disp(p + vec2(3.0, 0.0)) - disp(p - vec2(3.0, 0.0));
  float dy = disp(p + vec2(0.0, 3.0)) - disp(p - vec2(0.0, 3.0));
  vN = normalize(vec3(-dx / 6.0, -dy / 6.0, 1.0));
  vP = p; vDisp = z / max(uMaxD, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, z, 1.0);
}`;
const FLAP_F = /* glsl */`
uniform vec2 uHalf; uniform float uR, uFlap, uStrain, uGap, uFlash;
uniform vec3 uColor, uLine, uBack, uFlashC;
varying vec2 vP; varying vec3 vN; varying float vDisp;
${SDF}
void main() {
  vec2 p = vP, h = uHalf;
  float ax = abs(p.x) / h.x, ay = abs(p.y) / h.y;
  bool mine = uFlap < 0.5 ? (p.y >= 0.0 && ay >= ax) : uFlap < 1.5 ? (p.y <= 0.0 && ay >= ax) : uFlap < 2.5 ? (p.x <= 0.0 && ax >= ay) : (p.x >= 0.0 && ax >= ay);
  if (!mine) discard;
  float d = sdRR(p, h, uR);
  if (d > 0.0) discard;
  float k = h.y / h.x, kn = inversesqrt(1.0 + k * k);
  float dx = min(abs(p.y - k * p.x), abs(p.y + k * p.x)) * kn;
  float cen = 1.0 - smoothstep(0.0, 0.6, length(p / h));
  if (dx < uGap * (0.35 + 0.65 * cen)) discard;
  vec3 L = normalize(vec3(-0.45, 0.7, 0.75)), n = normalize(vN);
  if (!gl_FrontFacing) {
    // the underside of the skin: dark grey board, lit by the room
    float l = 0.75 + 0.45 * max(dot(-n, L), 0.0);
    vec3 b = uBack * l;
    b = mix(b, uLine * 0.5, smoothstep(-2.5, -0.8, d) * 0.6);
    gl_FragColor = vec4(mix(b, uFlashC, uFlash), 1.0);
    return;
  }
  vec3 c = uColor;
  float lw = 1.0 + uStrain * 2.0;
  c = mix(c, uLine * (1.0 - uStrain * 0.45), 1.0 - smoothstep(lw - 0.75, lw + 0.75, dx));
  c = mix(c, uLine, smoothstep(-2.0, -0.6, d));
  // stretched rubber: soft light across the bump and a broad sheen on its shoulder
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float dif = max(dot(n, L), 0.0) - L.z;
  float sp = max(pow(max(dot(n, H), 0.0), 28.0) - pow(H.z, 28.0), 0.0);
  c = c * (1.0 + 0.6 * dif) + sp * 0.12;
  c *= 1.0 - smoothstep(0.45, 1.0, vDisp) * 0.1;
  gl_FragColor = vec4(mix(c, uFlashC, uFlash), 1.0);
}`;
// the well behind the page: ink walls, lit at the lip and falling into the dark
const WELL_F = /* glsl */`
uniform vec3 uInk; uniform float uDepth;
varying vec3 vL; varying vec3 vNo;
void main() {
  float f = clamp((uDepth * 0.5 - vL.z) / uDepth, 0.0, 1.0);
  float wall = 0.75 + 0.35 * dot(-vNo, normalize(vec3(0.35, -0.8, 0.0)));
  vec3 lip = vec3(0.36, 0.33, 0.3) * wall;
  gl_FragColor = vec4(mix(lip, uInk * 0.45, pow(f, 0.45)), 1.0);
}`;
const WELL_V = /* glsl */`varying vec3 vL; varying vec3 vNo; void main() { vL = position; vNo = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export type MediaLook = Look & { open: [number, number, number, number]; strain: number; gap: number; knocks: [number, number, number, number][] };

export class Media {
  readonly g = new THREE.Group();
  readonly hinges: THREE.Group[] = [];
  readonly mats: THREE.ShaderMaterial[] = [];
  readonly well: THREE.Mesh;
  readonly rest: THREE.Vector3;
  readonly w: number; readonly h: number; readonly depth: number;
  readonly look: MediaLook;
  private readonly u: Record<string, THREE.IUniform>;
  readonly b: Block;
  constructor(b: Block, fist: THREE.Texture) {
    this.b = b;
    const w = (this.w = b.w), h = (this.h = b.h), D = (this.depth = Math.min(w, h) * 1.1);
    this.rest = new THREE.Vector3(b.x + w / 2, -(b.y + h / 2), 0.4);
    this.look = { ...fresh(), open: [0, 0, 0, 0], strain: 0, gap: 0, knocks: [] };
    const [f, l] = LOOK.media;
    this.u = {
      uK: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] }, uHalf: { value: new THREE.Vector2(w / 2, h / 2) }, uFist: { value: fist },
      uMaxD: { value: Math.min(w, h) * 0.5 }, uR: { value: b.r }, uStrain: { value: 0 }, uGap: { value: 0 }, uFlash: { value: 0 },
      uColor: { value: new THREE.Color(f) }, uLine: { value: new THREE.Color(l!) }, uBack: { value: new THREE.Color('#2e2e34') }, uFlashC: { value: PAPER.clone() },
    };
    const sx = Math.round(Math.min(160, Math.max(64, w / 5)));
    const geo = new THREE.PlaneGeometry(w, h, sx, Math.max(24, Math.round((sx * h) / w)));
    const pivots: [number, number][] = [[0, h / 2], [0, -h / 2], [-w / 2, 0], [w / 2, 0]];
    pivots.forEach(([px, py], i) => {
      const mat = new THREE.ShaderMaterial({ vertexShader: FLAP_V, fragmentShader: FLAP_F, side: THREE.DoubleSide, uniforms: { ...this.u, uFlap: { value: i } } });
      const hinge = new THREE.Group(); hinge.position.set(px, py, 0);
      const m = new THREE.Mesh(geo, mat); m.position.set(-px, -py, 0);
      hinge.add(m); this.g.add(hinge); this.hinges.push(hinge); this.mats.push(mat);
    });
    this.well = new THREE.Mesh(new THREE.BoxGeometry(w, h, D), new THREE.ShaderMaterial({
      vertexShader: WELL_V, fragmentShader: WELL_F, side: THREE.BackSide,
      uniforms: { uInk: { value: INK.clone() }, uDepth: { value: D } },
    }));
    this.well.position.z = -D / 2 - 0.4;
    this.g.add(this.well);
  }
  reset() { Object.assign(this.look, BASE, { open: [0, 0, 0, 0], strain: 0, gap: 0, knocks: [] }); }
  private readonly grey = new THREE.Color(LOOK.media[0]); private readonly greyLine = new THREE.Color(LOOK.media[1]!);
  commit() {
    const L = this.look;
    this.g.visible = L.vis;
    this.g.position.set(this.rest.x + L.x, this.rest.y - L.y, this.rest.z + L.z);
    this.g.rotation.set(L.rx, L.ry, L.rz);
    this.g.scale.setScalar(L.s);
    const [t, b, l, r] = L.open;
    this.hinges[0].rotation.set(-t, 0, 0); this.hinges[1].rotation.set(b, 0, 0);
    this.hinges[2].rotation.set(0, -l, 0); this.hinges[3].rotation.set(0, r, 0);
    const K = this.u.uK.value as THREE.Vector4[];
    for (let i = 0; i < 3; i++) { const k = L.knocks[i]; if (k) K[i].set(k[0], -k[1], k[2], k[3]); else K[i].set(0, 0, 0, 1); }
    this.u.uStrain.value = L.strain; this.u.uGap.value = L.gap; this.u.uFlash.value = L.flash;
    (this.u.uColor.value as THREE.Color).copy(this.grey).lerp(PAPER, L.ink);
    (this.u.uLine.value as THREE.Color).copy(this.greyLine).lerp(INK, L.ink);
    if (L.flashC) (this.u.uFlashC.value as THREE.Color).copy(L.flashC);
  }
}

export class Page {
  readonly root = new THREE.Group();
  pieces: Piece[] = [];
  byId = new Map<string, Piece>();
  media!: Media;
  sheet!: Piece;
  private readonly fist = heightMap('closeup_2', 0.68);
  build(L: Layout) {
    this.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
    this.root.clear(); this.pieces = []; this.byId.clear();
    for (const b of L.blocks) {
      if (b.kind === 'media') { this.media = new Media(b, this.fist); this.root.add(this.media.g); continue; }
      const parent = b.parent ? L.get(b.parent) : undefined;
      const p = new Piece(b, parent);
      this.pieces.push(p); this.byId.set(b.id, p);
      (parent ? this.byId.get(parent.id)!.g : this.root).add(p.g);
    }
    this.sheet = this.byId.get('sheet')!;
    const m = L.get('media'), u = this.sheet.mat.uniforms;
    u.uHole.value = 1; u.uHoleR.value = m.r;
    (u.uHoleRect.value as THREE.Vector4).set(m.x + m.w / 2 - L.W / 2, -(m.y + m.h / 2 - L.pageH / 2), m.w / 2, m.h / 2);
  }
  get(id: string) { return this.byId.get(id)!; }
  reset() { for (const p of this.pieces) p.reset(); this.media.reset(); }
  commit() { for (const p of this.pieces) p.commit(); this.media.commit(); }
}
