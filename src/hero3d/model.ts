import * as THREE from 'three';
import { browTex, decal, eyeTex, mouthTex, numberTex, outline, toon } from './shade';

/*
 * THE HERO, modelled in code.
 *
 * A skeleton of 19 bones in a relaxed A-pose (metres, facing +z, his left
 * is +x). The body is lofted: the torso, each leg and each arm is a smooth
 * tube of elliptical rings, each ring skinned to the bones around it with
 * weights that blend across the joints, so knees and elbows bend smoothly.
 * The kit is painted into vertex colours along each loft (jersey, collar,
 * shorts, skin, socks). Rigid parts ride their bone: boots, fists, the head
 * (with decal eyes, brows and mouth), the hair (a shell plus ~30 tapered,
 * curved strands that sway on their roots), the scarf's wrap. The scarf's
 * tails are rebuilt every frame as cloth ribbons (index.ts).
 *
 * Every solid gets an inverted-hull outline.
 */

export const KIT = {
  skin: new THREE.Color('#f6d3b8'),
  jersey: new THREE.Color('#a6f03a'),
  jerseyDark: new THREE.Color('#5e9c22'),
  collar: new THREE.Color('#141824'),
  shorts: new THREE.Color('#1b2033'),
  sock: new THREE.Color('#f2f4f8'),
  sockBand: new THREE.Color('#a6f03a'),
  boot: new THREE.Color('#15171f'),
  hair: new THREE.Color('#3b3448'),
  scarf: new THREE.Color('#f3ead6'),
  scarfBand: new THREE.Color('#a6f03a'),
};

type V3 = [number, number, number];
export type BoneName =
  | 'root' | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | 'upperArmL' | 'lowerArmL' | 'handL' | 'upperArmR' | 'lowerArmR' | 'handR'
  | 'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR';

/** bind positions (world, metres) and parents */
const BIND: Record<BoneName, { p: V3; parent: BoneName | null }> = {
  root: { p: [0, 0, 0], parent: null },
  hips: { p: [0, 0.93, 0], parent: 'root' },
  spine: { p: [0, 1.05, 0], parent: 'hips' },
  chest: { p: [0, 1.2, 0], parent: 'spine' },
  neck: { p: [0, 1.4, 0], parent: 'chest' },
  head: { p: [0, 1.455, 0.008], parent: 'neck' },
  upperArmL: { p: [0.182, 1.35, 0], parent: 'chest' },
  lowerArmL: { p: [0.228, 1.1, 0], parent: 'upperArmL' },
  handL: { p: [0.265, 0.865, 0.005], parent: 'lowerArmL' },
  upperArmR: { p: [-0.182, 1.35, 0], parent: 'chest' },
  lowerArmR: { p: [-0.228, 1.1, 0], parent: 'upperArmR' },
  handR: { p: [-0.265, 0.865, 0.005], parent: 'lowerArmR' },
  thighL: { p: [0.085, 0.9, 0], parent: 'hips' },
  shinL: { p: [0.09, 0.49, 0.005], parent: 'thighL' },
  footL: { p: [0.09, 0.075, -0.005], parent: 'shinL' },
  thighR: { p: [-0.085, 0.9, 0], parent: 'hips' },
  shinR: { p: [-0.09, 0.49, 0.005], parent: 'thighR' },
  footR: { p: [-0.09, 0.075, -0.005], parent: 'shinR' },
};
export const BONES = Object.keys(BIND) as BoneName[];
const BI = Object.fromEntries(BONES.map((b, i) => [b, i])) as Record<BoneName, number>;

export interface Hero {
  group: THREE.Group;
  bones: Record<BoneName, THREE.Bone>;
  /** hair strand pivots, for sway */
  strands: { pivot: THREE.Object3D; axis: THREE.Vector3; phase: number; give: number }[];
  /** decals that hide in silhouette */
  decals: THREE.Object3D[];
  /** the scarf tails: rebuilt per frame */
  tails: { mesh: THREE.Mesh; geo: THREE.BufferGeometry; n: number; len: number; phase: number }[];
  /** outline meshes (to scale their width) */
}

/* ================================================================ lofts */

interface Ring { at: number; rx: number; rz: number; dz?: number; col: THREE.Color; flare?: number }

/**
 * A tube along a chain of bone positions. `at` is the distance along the chain in [0, 1]; rings
 * are skinned to the two bones either side of their position, blending over `blend` of a segment
 * around each joint.
 */
function loft(chain: BoneName[], ends: V3[], rings: Ring[], seg = 18, blend = 0.22, extraBone?: { bone: BoneName; until: number }) {
  // segment lengths
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < ends.length - 1; i++) {
    const l = new THREE.Vector3(...ends[i + 1]).sub(new THREE.Vector3(...ends[i])).length();
    lens.push(l);
    total += l;
  }
  const pos: number[] = [], col: number[] = [], si: number[] = [], sw: number[] = [];
  const idx: number[] = [];
  const at = (u: number) => {
    let d = u * total;
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) {
        const k = Math.min(1, d / lens[i]);
        const a = new THREE.Vector3(...ends[i]), b = new THREE.Vector3(...ends[i + 1]);
        return { p: a.clone().lerp(b, k), seg: i, k, tan: b.clone().sub(a).normalize() };
      }
      d -= lens[i];
    }
    throw new Error('loft');
  };
  const Z = new THREE.Vector3(0, 0, 1);
  rings.forEach((r) => {
    const { p, seg: s, k, tan } = at(r.at);
    const side = new THREE.Vector3().crossVectors(tan, Z);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const fwd = new THREE.Vector3().crossVectors(side, tan).normalize();
    // weights: blend into the neighbour bone near each joint
    const b0 = chain[s];
    let b1 = chain[s], w1 = 0;
    if (k < blend && s > 0) {
      b1 = chain[s - 1];
      w1 = 0.5 * (1 - k / blend);
    } else if (k > 1 - blend && s < chain.length - 1) {
      b1 = chain[s + 1];
      w1 = 0.5 * (1 - (1 - k) / blend);
    }
    if (extraBone && r.at <= extraBone.until) {
      b1 = extraBone.bone;
      w1 = 0.5 * (1 - r.at / extraBone.until);
    }
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const fl = r.flare ?? 0;
      const v = p.clone()
        .addScaledVector(side, Math.cos(a) * r.rx * (1 + fl))
        .addScaledVector(fwd, Math.sin(a) * r.rz * (1 + fl) + (r.dz ?? 0));
      pos.push(v.x, v.y, v.z);
      col.push(r.col.r, r.col.g, r.col.b);
      si.push(BI[b0], BI[b1], 0, 0);
      sw.push(1 - w1, w1, 0, 0);
    }
  });
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * seg + j, b = i * seg + ((j + 1) % seg), c = (i + 1) * seg + j, d = (i + 1) * seg + ((j + 1) % seg);
      idx.push(a, c, b, b, c, d);
    }
  }
  // caps
  const cap = (ri: number, flip: boolean) => {
    const base = ri * seg;
    const c = new THREE.Vector3();
    for (let j = 0; j < seg; j++) c.add(new THREE.Vector3(pos[(base + j) * 3], pos[(base + j) * 3 + 1], pos[(base + j) * 3 + 2]));
    c.divideScalar(seg);
    const ci = pos.length / 3;
    pos.push(c.x, c.y, c.z);
    col.push(col[base * 3], col[base * 3 + 1], col[base * 3 + 2]);
    si.push(si[base * 4], si[base * 4 + 1], 0, 0);
    sw.push(sw[base * 4], sw[base * 4 + 1], 0, 0);
    for (let j = 0; j < seg; j++) {
      const a = base + j, b = base + ((j + 1) % seg);
      if (flip) idx.push(ci, b, a);
      else idx.push(ci, a, b);
    }
  };
  cap(0, false);
  cap(rings.length - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** a rigid geometry fully weighted to one bone */
function rigid(g: THREE.BufferGeometry, bone: BoneName, color?: THREE.Color) {
  const n = g.attributes.position.count;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    si[i * 4] = BI[bone];
    sw[i * 4] = 1;
  }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  if (color && !g.attributes.color) {
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      c[i * 3] = color.r;
      c[i * 3 + 1] = color.g;
      c[i * 3 + 2] = color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  return g;
}

/* ================================================================ build */

export function buildHero(): Hero {
  const group = new THREE.Group();
  // ---- bones
  const bones = {} as Record<BoneName, THREE.Bone>;
  for (const b of BONES) {
    const bone = new THREE.Bone();
    bone.name = b;
    bones[b] = bone;
  }
  for (const b of BONES) {
    const { p, parent } = BIND[b];
    const pp = parent ? BIND[parent].p : [0, 0, 0];
    bones[b].position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
    if (parent) bones[parent].add(bones[b]);
  }
  group.add(bones.root);
  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(BONES.map((b) => bones[b]));

  const solids: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, mat: THREE.Material, outlineW = 1) => {
    const m = new THREE.SkinnedMesh(g, mat);
    m.bind(skeleton);
    m.frustumCulled = false;
    group.add(m);
    if (outlineW > 0) {
      const o = new THREE.SkinnedMesh(g, outline(outlineW));
      o.bind(skeleton);
      o.frustumCulled = false;
      group.add(o);
    }
    solids.push(g);
    return m;
  };
  const kit = toon('#ffffff', { vertexColors: true });

  // ---- torso: pelvis (shorts) → waist → chest (jersey) → collar → neck (skin)
  const P = (b: BoneName) => BIND[b].p;
  const torsoRings: Ring[] = [
    { at: 0.0, rx: 0.1, rz: 0.08, col: KIT.shorts },
    { at: 0.06, rx: 0.135, rz: 0.095, col: KIT.shorts },
    { at: 0.13, rx: 0.142, rz: 0.1, col: KIT.shorts },
    { at: 0.2, rx: 0.138, rz: 0.098, col: KIT.shorts },
    { at: 0.215, rx: 0.14, rz: 0.1, col: KIT.jersey, flare: 0.06 },
    { at: 0.3, rx: 0.126, rz: 0.088, col: KIT.jersey },
    { at: 0.42, rx: 0.123, rz: 0.086, col: KIT.jersey },
    { at: 0.55, rx: 0.145, rz: 0.096, dz: 0.006, col: KIT.jersey },
    { at: 0.68, rx: 0.165, rz: 0.1, dz: 0.01, col: KIT.jersey },
    { at: 0.78, rx: 0.175, rz: 0.097, dz: 0.006, col: KIT.jersey },
    { at: 0.84, rx: 0.158, rz: 0.088, col: KIT.jersey },
    { at: 0.87, rx: 0.08, rz: 0.064, col: KIT.collar },
    { at: 0.885, rx: 0.058, rz: 0.054, col: KIT.collar },
    { at: 0.9, rx: 0.052, rz: 0.05, col: KIT.skin },
    { at: 1.0, rx: 0.05, rz: 0.05, col: KIT.skin },
  ];
  add(loft(['hips', 'spine', 'chest', 'neck'], [[0, 0.8, 0], P('spine'), P('chest'), P('neck'), [0, 1.5, 0.005]], torsoRings, 20, 0.3), kit);

  // ---- legs: shorts leg → thigh → knee → calf → sock → ankle
  for (const s of ['L', 'R'] as const) {
    const x = s === 'L' ? 1 : -1;
    const legRings: Ring[] = [
      { at: 0.0, rx: 0.088, rz: 0.088, col: KIT.shorts },
      { at: 0.06, rx: 0.09, rz: 0.09, col: KIT.shorts },
      { at: 0.17, rx: 0.088, rz: 0.088, col: KIT.shorts, flare: 0.08 },
      { at: 0.175, rx: 0.077, rz: 0.079, col: KIT.skin },
      { at: 0.28, rx: 0.074, rz: 0.076, col: KIT.skin },
      { at: 0.4, rx: 0.061, rz: 0.063, col: KIT.skin },
      { at: 0.47, rx: 0.054, rz: 0.057, col: KIT.skin },
      { at: 0.52, rx: 0.054, rz: 0.056, col: KIT.skin },
      { at: 0.58, rx: 0.058, rz: 0.064, dz: -0.008, col: KIT.skin },
      { at: 0.6, rx: 0.055, rz: 0.06, dz: -0.01, col: KIT.sockBand },
      { at: 0.64, rx: 0.055, rz: 0.06, dz: -0.012, col: KIT.sockBand },
      { at: 0.645, rx: 0.055, rz: 0.06, dz: -0.012, col: KIT.sock },
      { at: 0.75, rx: 0.046, rz: 0.05, dz: -0.006, col: KIT.sock },
      { at: 0.9, rx: 0.036, rz: 0.038, col: KIT.sock },
      { at: 1.0, rx: 0.034, rz: 0.036, col: KIT.sock },
    ];
    const hip = P(`thigh${s}`);
    add(loft([`thigh${s}`, `shin${s}`], [[hip[0] - x * 0.005, hip[1] + 0.06, hip[2]], P(`shin${s}`), P(`foot${s}`)], legRings, 18, 0.2, { bone: 'hips', until: 0.06 }), kit);

    // boot: a sculpted ellipsoid, flat soled, toe forward
    const boot = new THREE.SphereGeometry(1, 20, 14);
    const bp = boot.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      let bx = bp.getX(i), by = bp.getY(i), bz = bp.getZ(i);
      by = Math.max(by, -0.55);
      const toe = bz > 0 ? 1 + bz * 0.9 : 1;
      bx *= 0.045 * (bz > 0.3 ? 1 - (bz - 0.3) * 0.25 : 1);
      by = by * 0.045 * (bz > 0 ? 1 - bz * 0.35 : 1);
      bz = bz * 0.06 * toe;
      bp.setXYZ(i, P(`foot${s}`)[0] + bx, P(`foot${s}`)[1] - 0.015 + by, P(`foot${s}`)[2] + 0.035 + bz);
    }
    boot.computeVertexNormals();
    const bc = new Float32Array(bp.count * 3);
    for (let i = 0; i < bp.count; i++) {
      // a lime flash along the side
      const lx = Math.abs(bp.getX(i) - P(`foot${s}`)[0]);
      const ly = bp.getY(i) - P(`foot${s}`)[1];
      const c = lx > 0.035 && ly > -0.03 && ly < -0.012 ? KIT.jersey : KIT.boot;
      bc.set([c.r, c.g, c.b], i * 3);
    }
    boot.setAttribute('color', new THREE.BufferAttribute(bc, 3));
    add(rigid(boot, `foot${s}`), kit);

    // arms: sleeve → upper arm → elbow → forearm → wrist
    const armRings: Ring[] = [
      { at: 0.0, rx: 0.062, rz: 0.062, col: KIT.jersey },
      { at: 0.08, rx: 0.065, rz: 0.062, col: KIT.jersey },
      { at: 0.3, rx: 0.062, rz: 0.058, col: KIT.jersey, flare: 0.06 },
      { at: 0.305, rx: 0.05, rz: 0.048, col: KIT.skin },
      { at: 0.42, rx: 0.046, rz: 0.044, col: KIT.skin },
      { at: 0.5, rx: 0.04, rz: 0.04, col: KIT.skin },
      { at: 0.62, rx: 0.043, rz: 0.041, col: KIT.skin },
      { at: 0.9, rx: 0.031, rz: 0.028, col: KIT.skin },
      { at: 1.0, rx: 0.03, rz: 0.027, col: KIT.skin },
    ];
    const sh = P(`upperArm${s}`);
    add(loft([`upperArm${s}`, `lowerArm${s}`], [[sh[0] - x * 0.03, sh[1] + 0.01, sh[2]], P(`lowerArm${s}`), P(`hand${s}`)], armRings, 14, 0.2, { bone: 'chest', until: 0.06 }), kit);
    // the shoulder: a rounded cap of jersey over the joint
    const cap = new THREE.SphereGeometry(1, 16, 12);
    cap.scale(0.064, 0.058, 0.06);
    cap.translate(sh[0] - x * 0.012, sh[1] - 0.012, sh[2]);
    const cw = cap.attributes.position.count;
    const csi = new Uint16Array(cw * 4), csw = new Float32Array(cw * 4), ccol = new Float32Array(cw * 3);
    for (let i = 0; i < cw; i++) {
      csi.set([BI[`upperArm${s}`], BI.chest, 0, 0], i * 4);
      csw.set([0.55, 0.45, 0, 0], i * 4);
      ccol.set([KIT.jersey.r, KIT.jersey.g, KIT.jersey.b], i * 3);
    }
    cap.setAttribute('skinIndex', new THREE.BufferAttribute(csi, 4));
    cap.setAttribute('skinWeight', new THREE.BufferAttribute(csw, 4));
    cap.setAttribute('color', new THREE.BufferAttribute(ccol, 3));
    add(cap, kit);
    // fist
    const fist = new THREE.SphereGeometry(1, 14, 10);
    fist.scale(0.036, 0.056, 0.04);
    fist.translate(P(`hand${s}`)[0] + x * 0.004, P(`hand${s}`)[1] - 0.045, P(`hand${s}`)[2] + 0.004);
    add(rigid(fist, `hand${s}`, KIT.skin), kit);
  }

  // ---- head (a touch large, as anime heads are)
  const H0 = P('head');
  const HEAD = 1.1;
  const head = new THREE.SphereGeometry(1, 36, 28);
  const hp = head.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    // jaw: taper to a small pointed chin, the face a little flat
    if (y < 0) {
      const k = Math.min(1, -y);
      // a defined jaw: the sides come in toward a small chin
      x *= 1 - 0.42 * k ** 1.3;
      if (z < 0) z *= 1 - 0.45 * k;
      else z = z * (1 - 0.06 * k) + 0.05 * k ** 2;
      y *= 1.1;
    }
    if (z > 0.55) z = 0.55 + (z - 0.55) * 0.55;
    hp.setXYZ(i, H0[0] + x * 0.098 * HEAD, H0[1] + (0.105 + y * 0.108) * HEAD, H0[2] + z * 0.104 * HEAD);
  }
  head.computeVertexNormals();
  add(rigid(head, 'head', KIT.skin), kit);
  // ears
  for (const x of [1, -1]) {
    const ear = new THREE.SphereGeometry(1, 10, 8);
    ear.scale(0.012 * HEAD, 0.026 * HEAD, 0.018 * HEAD);
    ear.translate(H0[0] + x * 0.094 * HEAD, H0[1] + 0.098 * HEAD, H0[2] - 0.008);
    add(rigid(ear, 'head', KIT.skin), kit, 0.6);
  }
  // face decals (each a small plane on the face, riding the head bone)
  const decals: THREE.Object3D[] = [];
  // everything riding the head is scaled with it
  const headGroup = new THREE.Group();
  headGroup.scale.setScalar(HEAD);
  bones.head.add(headGroup);
  const face = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), decal(tex));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    headGroup.add(m);
    decals.push(m);
    return m;
  };
  const hy = 0.105; // head centre above the head bone
  face(eyeTex(false), 0.044, 0.044, 0.035, hy - 0.024, 0.08, 0.4);
  face(eyeTex(true), 0.044, 0.044, -0.035, hy - 0.024, 0.08, -0.4);
  face(browTex(), 0.04, 0.01, 0.036, hy + 0.01, 0.081, 0.38);
  face(browTex(), 0.04, 0.01, -0.036, hy + 0.01, 0.081, -0.38).scale.x = -1;
  face(mouthTex(), 0.02, 0.01, 0, hy - 0.074, 0.073, 0);
  // a small nose, so the face catches light like a face
  const nose = new THREE.SphereGeometry(1, 10, 8);
  nose.scale(0.005, 0.012, 0.007);
  nose.rotateX(-0.35);
  nose.translate(H0[0], H0[1] + (hy - 0.045) * HEAD, H0[2] + 0.075 * HEAD);
  add(rigid(nose, 'head', KIT.skin), kit, 0);
  // the number on his back
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), decal(numberTex('10')));
  num.position.set(0, 0.07, -0.103);
  num.rotation.y = Math.PI;
  bones.chest.add(num);
  decals.push(num);

  // ---- hair: a shell over the skull and tapered curved strands
  const hairMat = toon(KIT.hair, { gloss: 0.35, side: THREE.DoubleSide });
  const shell = new THREE.SphereGeometry(1, 30, 22, 0, Math.PI * 2, 0, Math.PI * 0.56);
  shell.scale(0.106, 0.118, 0.112);
  shell.rotateX(-0.5);
  shell.translate(0, hy + 0.012, -0.008);
  const hairGroup = new THREE.Group();
  headGroup.add(hairGroup);
  const shellMesh = new THREE.Mesh(shell, hairMat);
  hairGroup.add(shellMesh);
  hairGroup.add(new THREE.Mesh(shell, outline(1)));
  const strands: Hero['strands'] = [];
  // the scalp the hair lies on: an ellipsoid a little outside the skull
  const HC = new THREE.Vector3(0, hy + 0.004, -0.004);
  const HR = new THREE.Vector3(0.108, 0.121, 0.114);
  const onScalp = (d: THREE.Vector3, lift: number) => {
    const n = d.clone().normalize();
    return HC.clone().add(new THREE.Vector3(n.x * HR.x, n.y * HR.y, n.z * HR.z).multiplyScalar(1 + lift));
  };
  /**
   * One lock of a normal haircut: it grows from the crown, lies along the scalp with a little
   * volume, and ends in a soft tapered tip at `end` (a direction from the head's centre).
   */
  const lock = (end: V3, r0: number, vol = 0.07, tipLift = 0.03, give = 0.3) => {
    const crown = new THREE.Vector3(0, 1, -0.25).normalize();
    const e = new THREE.Vector3(...end).normalize();
    const N = 14, R = 8;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const d = crown.clone().lerp(e, u);
      pts.push(onScalp(d, vol * Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.6 + 0.01 + tipLift * u ** 3));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const root = curve.getPoint(0);
    const pivot = new THREE.Object3D();
    pivot.position.copy(root);
    hairGroup.add(pivot);
    const pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const p = curve.getPoint(u).sub(root);
      const T = curve.getTangent(u);
      const out = curve.getPoint(u).sub(HC).normalize();
      const across = new THREE.Vector3().crossVectors(T, out).normalize();
      const thin = new THREE.Vector3().crossVectors(across, T).normalize();
      const r = r0 * Math.pow(Math.max(0, 1 - u), 0.75) * Math.min(1, 0.55 + u * 2) + 0.0008;
      for (let j = 0; j < R; j++) {
        const ang = (j / R) * Math.PI * 2;
        const q = p.clone().addScaledVector(across, Math.cos(ang) * r).addScaledVector(thin, Math.sin(ang) * r * 0.32);
        pos.push(q.x, q.y, q.z);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) {
      const A = i * R + j, B = i * R + ((j + 1) % R), C = (i + 1) * R + j, D = (i + 1) * R + ((j + 1) % R);
      idx.push(A, C, B, B, C, D);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    pivot.add(new THREE.Mesh(g, hairMat));
    pivot.add(new THREE.Mesh(g, outline(0.6)));
    const axis = new THREE.Vector3().crossVectors(e, new THREE.Vector3(0, 1, 0));
    if (axis.lengthSq() < 1e-4) axis.set(1, 0, 0);
    strands.push({ pivot, axis: axis.normalize(), phase: strands.length * 1.7, give });
  };
  // fringe: pointed locks of different lengths, falling to the brows, one or two between the eyes
  for (const [x, y, tl] of [[-0.68, 0.18, 0.06], [-0.46, 0.08, 0.03], [-0.24, 0.12, 0.05], [-0.04, 0.02, 0.03], [0.16, 0.1, 0.05], [0.38, 0.04, 0.03], [0.6, 0.16, 0.06]] as const) {
    lock([x, y, 1], 0.05, 0.1, tl, 0.3);
  }
  // sides: over the ears, tips flicking out a little
  for (const sx of [1, -1]) {
    lock([sx, -0.05, 0.5], 0.05, 0.09, 0.06, 0.3);
    lock([sx, -0.25, 0.1], 0.055, 0.09, 0.08, 0.3);
    lock([sx, -0.3, -0.35], 0.055, 0.09, 0.1, 0.3);
  }
  // the back: locks down the back of the head, tips lifting into a slightly messy nape
  for (const x of [-0.8, -0.45, -0.1, 0.25, 0.6]) lock([x, -0.55, -1], 0.06, 0.1, 0.12, 0.3);
  // volume on top: a few locks whose tips stand up
  for (const [x, z, tl] of [[-0.55, 0.45, 0.14], [0.05, 0.6, 0.1], [0.55, 0.45, 0.14], [-0.85, -0.25, 0.16], [0.85, -0.25, 0.16], [0, -0.6, 0.18]] as const) lock([x, 0.3, z], 0.065, 0.12, tl, 0.4);

  // (no scarf: he's a footballer in his kit)
  const tails: Hero['tails'] = [];

  return { group, bones, strands, decals, tails };
}
