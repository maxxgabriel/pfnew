import type { BoneName } from './model';

/*
 * Poses, authored as a few readable angles (radians) and turned into bone
 * rotations. "Forward" is the way he faces.
 *
 *   lean   torso forward (+) / back (-)      twist  shoulders turn (+ = left)
 *   nod    head down (+) / up (-)            turn   head turns (+ = left)
 *   thL/R  thigh forward (+)                 shL/R  knee bend (+)
 *   ftL/R  toes down (+)                     spL/R  leg out to the side (+)
 *   arL/R  upper arm forward (+)             outL/R arm out to the side (+)
 *   elL/R  elbow bend (+)
 */
export interface Pose {
  lean: number; twist: number; nod: number; turn: number;
  thL: number; shL: number; ftL: number; spL: number;
  thR: number; shR: number; ftR: number; spR: number;
  arL: number; outL: number; elL: number;
  arR: number; outR: number; elR: number;
}

const Z: Pose = { lean: 0, twist: 0, nod: 0, turn: 0, thL: 0, shL: 0, ftL: 0, spL: 0, thR: 0, shR: 0, ftR: 0, spR: 0, arL: 0, outL: 0, elL: 0, arR: 0, outR: 0, elR: 0 };
const p = (o: Partial<Pose>): Pose => ({ ...Z, ...o });

export const POSE = {
  stand: p({ lean: 0.04, thL: 0.04, shL: 0.08, thR: -0.04, shR: 0.05, spL: 0.04, spR: 0.04, arL: -0.05, outL: 0.12, elL: 0.35, arR: 0.08, outR: 0.12, elR: 0.3 }),
  /** sole on the ball, arms loose for balance */
  roll: p({ lean: -0.04, twist: 0.1, nod: 0.3, thR: 0.55, shR: 0.45, ftR: -0.25, thL: -0.04, shL: 0.12, spL: 0.06, arL: 0.2, outL: 0.45, elL: 0.6, arR: -0.15, outR: 0.4, elR: 0.5 }),
  windup: p({ lean: 0.22, twist: -0.25, nod: 0.25, thR: -0.65, shR: 1.7, ftR: 0.5, thL: 0.12, shL: 0.25, arL: 0.9, outL: 0.45, elL: 0.8, arR: -0.6, outR: 0.5, elR: 0.6 }),
  flick: p({ lean: -0.32, twist: 0.25, nod: -0.25, thR: 1.55, shR: 0.12, ftR: 0.35, thL: -0.1, shL: 0.18, arL: -0.3, outL: 0.95, elL: 0.4, arR: 0.35, outR: 0.75, elR: 0.5 }),
  crouch: p({ lean: 0.55, nod: -0.4, thL: 1.25, shL: 2.0, thR: 1.05, shR: 1.85, ftL: 0.3, ftR: 0.3, arL: -0.7, outL: 0.25, elL: 0.4, arR: -0.8, outR: 0.25, elR: 0.4 }),
  rise: p({ lean: -0.08, nod: -0.45, thL: 0.25, shL: 0.55, thR: -0.2, shR: 0.35, ftL: 0.7, ftR: 0.7, arL: 2.6, outL: 0.25, elL: 0.3, arR: 2.4, outR: 0.3, elR: 0.35 }),
  tuck: p({ lean: 0.5, nod: 0.3, thL: 1.9, shL: 2.15, thR: 1.7, shR: 2.05, ftL: 0.5, ftR: 0.5, arL: 0.8, outL: 0.2, elL: 1.3, arR: 0.9, outR: 0.2, elR: 1.3 }),
  /** the bicycle volley: kicking leg high, the other folded under, arms flung out */
  volley: p({ lean: -0.35, nod: 0.55, thR: 2.25, shR: 0.08, ftR: 0.45, thL: 0.35, shL: 1.3, ftL: 0.4, arL: 0.5, outL: 1.25, elL: 0.4, arR: -0.2, outR: 1.1, elR: 0.3 }),
  follow: p({ lean: -0.2, nod: 0.3, thR: 1.3, shR: 0.4, thL: 0.5, shL: 1.0, ftL: 0.4, ftR: 0.4, arL: 0.6, outL: 0.9, elL: 0.6, arR: -0.1, outR: 0.9, elR: 0.5 }),
  /** a running stride, phase given by runPose() */
  run: p({ lean: 0.2 }),
} satisfies Record<string, Pose>;

export function mix(a: Pose, b: Pose, k: number): Pose {
  const o = {} as Pose;
  for (const key of Object.keys(a) as (keyof Pose)[]) o[key] = a[key] + (b[key] - a[key]) * k;
  return o;
}

/** a run cycle at phase ph (radians) */
export function runPose(ph: number): Pose {
  const s = Math.sin(ph), c = Math.cos(ph);
  return p({
    lean: 0.22, nod: -0.1, twist: s * 0.18,
    thL: s * 0.85, shL: 0.5 + Math.max(0, -c) * 1.3, ftL: 0.2,
    thR: -s * 0.85, shR: 0.5 + Math.max(0, c) * 1.3, ftR: 0.2,
    arL: -s * 0.8, outL: 0.15, elL: 1.4, arR: s * 0.8, outR: 0.15, elR: 1.4,
  });
}

/** bone rotations (x, y, z) for a pose */
export function boneRotations(ps: Pose): Partial<Record<BoneName, [number, number, number]>> {
  return {
    spine: [ps.lean * 0.45, ps.twist * 0.4, 0],
    chest: [ps.lean * 0.55, ps.twist * 0.6, 0],
    neck: [ps.nod * 0.4, ps.turn * 0.4, 0],
    head: [ps.nod * 0.6 - ps.lean * 0.3, ps.turn * 0.6, 0],
    thighL: [-ps.thL, 0, ps.spL],
    shinL: [ps.shL, 0, 0],
    footL: [ps.ftL, 0, 0],
    thighR: [-ps.thR, 0, -ps.spR],
    shinR: [ps.shR, 0, 0],
    footR: [ps.ftR, 0, 0],
    upperArmL: [-ps.arL, 0, ps.outL],
    lowerArmL: [-ps.elL, 0, 0],
    upperArmR: [-ps.arR, 0, -ps.outR],
    lowerArmR: [-ps.elR, 0, 0],
  };
}
