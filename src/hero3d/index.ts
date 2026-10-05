import * as THREE from 'three';
import { type BoneName, type Hero, buildHero } from './model';
import { type Pose, boneRotations } from './poses';
import { U } from './shade';

export { POSE, mix, runPose, type Pose } from './poses';

/*
 * THE HERO IN 3D: one call draws him into any 2D frame.
 *
 *   drawHero(ctx, w, h, { x, y, height, anchor: 'footL', pose, yaw, ... })
 *
 * He is rendered by a single shared WebGL renderer the size of the frame,
 * with the camera placed so that his `anchor` lands exactly on (x, y) in the
 * 2D context's current coordinates and he stands `height` px tall; the image
 * is then drawn into the 2D context (so its transform, alpha and clipping all
 * apply). Returns where his key points landed, for props like the ball.
 *
 * Built lazily on first use. Returns null if WebGL isn't available.
 */

export type Anchor = 'hips' | 'head' | 'eye' | 'chest' | 'footL' | 'footR' | 'toeR' | 'toeL' | 'handL' | 'handR' | 'kneeR';
export interface HeroOpts {
  x: number; y: number;
  /** his standing height in px */
  height: number;
  anchor?: Anchor;
  pose: Pose;
  /** facing: 0 = toward the camera, +PI/2 = facing screen right */
  yaw?: number;
  /** a turn about his own left-right axis (forward flips), radians */
  flip?: number;
  /** the camera rolled: the whole image rotated in the screen plane */
  tilt?: number;
  /** camera elevation: + looks down on him, - looks up at him */
  pitch?: number;
  fov?: number;
  /** where the key light comes FROM, in screen terms: x right, y down, z toward the viewer */
  light?: [number, number, number];
  rimDir?: [number, number, number];
  rim?: string;
  rimA?: number;
  silhouette?: boolean;
  /** 0..1: wind in the hair and the scarf */
  wind?: number;
  /** screen direction the scarf streams toward */
  flow?: [number, number];
  t: number;
  /** outline width multiplier */
  line?: number;
}
export type HeroPts = Record<Anchor, [number, number]>;

let hero: Hero | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, pivot: THREE.Object3D;
let failed = false;

function init() {
  if (hero || failed) return !!hero;
  try {
    const canvas = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(24, 1, 0.05, 50);
    pivot = new THREE.Object3D();
    scene.add(pivot);
    hero = buildHero();
    hero.group.position.set(0, -0.93, 0);
    pivot.add(hero.group);
    for (const tl of hero.tails) scene.add(tl.mesh);
    return true;
  } catch {
    failed = true;
    return false;
  }
}

export function heroReady() {
  return init();
}

const v = new THREE.Vector3();
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);

function world(b: BoneName, local?: [number, number, number]) {
  const bone = hero!.bones[b];
  return local ? bone.localToWorld(new THREE.Vector3(...local)) : bone.getWorldPosition(new THREE.Vector3());
}

const ANCHOR: Record<Anchor, [BoneName, [number, number, number] | undefined]> = {
  hips: ['hips', undefined],
  chest: ['chest', [0, 0.08, 0]],
  head: ['head', [0, 0.105, 0]],
  eye: ['head', [0.036, 0.093, 0.08]],
  footL: ['footL', [0, -0.06, 0.03]],
  footR: ['footR', [0, -0.06, 0.03]],
  toeL: ['footL', [0, -0.03, 0.15]],
  toeR: ['footR', [0, -0.03, 0.15]],
  handL: ['handL', [0, -0.045, 0]],
  handR: ['handR', [0, -0.045, 0]],
  kneeR: ['shinR', undefined],
};

/** pose him and place the camera; returns the projector */
function setup(w: number, h: number, o: HeroOpts) {
  const H = hero!;
  // pose
  for (const b of Object.keys(H.bones) as BoneName[]) H.bones[b].rotation.set(0, 0, 0);
  const rots = boneRotations(o.pose);
  for (const [b, r] of Object.entries(rots) as [BoneName, [number, number, number]][]) H.bones[b].rotation.set(r[0], r[1], r[2]);
  // facing and flips, about the hips
  q1.setFromAxisAngle(AY, o.yaw ?? Math.PI / 2);
  q2.setFromAxisAngle(AX, o.flip ?? 0);
  pivot.quaternion.copy(q1).multiply(q2);
  // the hair sways on its roots
  const wind = o.wind ?? 0.3;
  for (const s of H.strands) {
    const a = s.give * (wind * (0.1 * Math.sin(o.t * 7 + s.phase) + 0.12) + 0.02 * Math.sin(o.t * 2 + s.phase));
    s.pivot.quaternion.setFromAxisAngle(s.axis, -a);
  }
  scene.updateMatrixWorld(true);
  // camera: the anchor at (x, y), `height` px tall
  const [ab, al] = ANCHOR[o.anchor ?? 'hips'];
  const A = world(ab, al);
  const fov = o.fov ?? 24;
  const ppm = o.height / 1.68;
  const D = h / 2 / (ppm * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
  const pitch = o.pitch ?? 0;
  camera.fov = fov;
  camera.aspect = w / h;
  camera.position.set(A.x, A.y + Math.sin(pitch) * D, A.z + Math.cos(pitch) * D);
  camera.up.set(0, 1, 0);
  camera.lookAt(A);
  camera.rotateZ(-(o.tilt ?? 0));
  camera.near = Math.max(0.02, D - 3);
  camera.far = D + 3;
  camera.setViewOffset(w, h, w / 2 - o.x, h / 2 - o.y, w, h);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return (p: THREE.Vector3): [number, number] => {
    v.copy(p).project(camera);
    return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
  };
}

/** the scarf's tails: cloth ribbons from the back of the neck, streaming along `flow` */
function tails(o: HeroOpts) {
  const H = hero!;
  const wind = o.wind ?? 0.3;
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const toCam = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2);
  const fl = o.flow ?? [-1, -0.15];
  const dir = right.clone().multiplyScalar(fl[0]).addScaledVector(up, -fl[1]).addScaledVector(toCam, -0.25).normalize();
  const side = new THREE.Vector3().crossVectors(dir, toCam).normalize();
  const anchor = world('neck', [0, 0.02, -0.07]);
  const p = new THREE.Vector3(), wa = new THREE.Vector3();
  for (const tl of H.tails) {
    const pos = tl.geo.attributes.position as THREE.BufferAttribute;
    const amp = 0.04 + wind * 0.09;
    for (let i = 0; i <= tl.n; i++) {
      const k = i / tl.n;
      const ph = o.t * 8 - k * 4.4 + tl.phase;
      const wv = (Math.sin(ph) + 0.35 * Math.sin(o.t * 13 - k * 8 + tl.phase)) * amp * k;
      const sag = (1 - wind) * k * k * tl.len * 0.75;
      p.copy(anchor).addScaledVector(dir, tl.len * k * (0.35 + 0.65 * wind)).addScaledVector(side, wv).addScaledVector(toCam, Math.cos(ph) * amp * 0.6 * k);
      p.y -= sag;
      const tw = Math.sin(ph * 0.7) * 0.9 * k;
      wa.copy(side).multiplyScalar(Math.cos(tw)).addScaledVector(toCam, Math.sin(tw));
      const wd = (0.1 - 0.02 * k) / 2;
      pos.setXYZ(i * 2, p.x + wa.x * wd, p.y + wa.y * wd, p.z + wa.z * wd);
      pos.setXYZ(i * 2 + 1, p.x - wa.x * wd, p.y - wa.y * wd, p.z - wa.z * wd);
    }
    pos.needsUpdate = true;
    tl.geo.computeVertexNormals();
  }
}

function hexColor(s: string) {
  return new THREE.Color(s);
}

/** where his points would land, without drawing */
export function heroPoints(w: number, h: number, o: HeroOpts): HeroPts | null {
  if (!init()) return null;
  const proj = setup(w, h, o);
  const pts = {} as HeroPts;
  for (const a of Object.keys(ANCHOR) as Anchor[]) {
    const [b, l] = ANCHOR[a];
    pts[a] = proj(world(b, l));
  }
  return pts;
}

let lastSize = '';
/** draw him into a 2D context whose local frame is w × h */
export function drawHero(ctx: CanvasRenderingContext2D, w: number, h: number, o: HeroOpts): HeroPts | null {
  if (!init() || !renderer) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const key = `${w}x${h}x${dpr}`;
  if (key !== lastSize) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    lastSize = key;
  }
  const proj = setup(w, h, o);
  tails(o);
  // lights, in view space
  const L = o.light ?? [-0.5, -0.6, 0.6];
  U.uLight.value.set(L[0], -L[1], L[2]).normalize();
  const R = o.rimDir ?? [-L[0], L[1], -0.6];
  U.uRimDir.value.set(R[0], -R[1], R[2]).normalize();
  U.uRim.value.copy(hexColor(o.rim ?? '#bfefff'));
  U.uRimA.value = o.rimA ?? 1;
  U.uSil.value = o.silhouette ? 1 : 0;
  U.uOutline.value = (2.2 * (o.line ?? 1)) / (o.height / 1.68);
  for (const d of hero!.decals) d.visible = !o.silhouette;
  renderer.render(scene, camera);
  ctx.drawImage(renderer.domElement, 0, 0, w, h);
  const pts = {} as HeroPts;
  for (const a of Object.keys(ANCHOR) as Anchor[]) {
    const [b, l] = ANCHOR[a];
    pts[a] = proj(world(b, l));
  }
  return pts;
}
