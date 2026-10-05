import { type Pt, TAU, lerp } from '../core/math';

/*
 * THE STRIKER: #10, drawn as a cel-shaded anime character.
 *
 * A cut-out rig: every body part is a hand-shaped outline in its own bone's
 * space (thigh, shin, boot, torso, arm, head, hair), posed by forward
 * kinematics from a few angles and drawn far-to-near with dark line art.
 * Each part is lit like a cel: a flat base, a hard shadow on the side away
 * from the light, and a thin rim of coloured light on the side facing it.
 * Hair and the jersey hem move in the wind (secondary motion on ones; the
 * pose itself is meant to step on twos).
 *
 * Original design: a lean striker with a swept-back mane of spiky navy hair,
 * the team's lime kit with a black collar, black boots with a lime flash.
 */

/** angles in radians. Limbs: absolute, from straight down, + = forward. lean: torso from upright, + = forward. */
export interface Pose {
  lean: number; hd: number;
  tL: number; sL: number; tR: number; sR: number; ftL: number; ftR: number;
  aL: number; eL: number; aR: number; eR: number;
}

export const POSES = {
  stand: { lean: 0.05, hd: 0.08, tL: -0.1, sL: -0.14, tR: 0.12, sR: -0.02, ftL: 0, ftR: 0, aL: -0.2, eL: 0.25, aR: 0.18, eR: 0.5 },
  roll: { lean: -0.02, hd: 0.15, tL: -0.06, sL: -0.12, tR: 0.55, sR: 0.2, ftL: 0, ftR: 0.15, aL: -0.55, eL: -0.2, aR: 0.5, eR: 0.9 },
  windup: { lean: 0.22, hd: 0.1, tL: 0.08, sL: -0.06, tR: -0.75, sR: -1.85, ftL: 0, ftR: 0.6, aL: 1.1, eL: 1.6, aR: -1.0, eR: -0.5 },
  flick: { lean: -0.32, hd: -0.2, tL: -0.08, sL: -0.14, tR: 1.5, sR: 1.75, ftL: 0, ftR: 0.5, aL: -0.9, eL: -0.4, aR: 1.0, eR: 1.5 },
  crouch: { lean: 0.55, hd: -0.2, tL: 1.25, sL: -0.45, tR: 1.1, sR: -0.5, ftL: 0, ftR: 0, aL: -1.0, eL: -0.6, aR: -1.2, eR: -0.8 },
  rise: { lean: 0.05, hd: -0.35, tL: 0.3, sL: -0.5, tR: -0.15, sR: -0.35, ftL: 0.7, ftR: 0.6, aL: 2.5, eL: 2.8, aR: 2.2, eR: 2.6 },
  tuck: { lean: 0.4, hd: 0.2, tL: 1.7, sL: 0.05, tR: 1.5, sR: -0.1, ftL: 0.4, ftR: 0.4, aL: 0.9, eL: 1.7, aR: 0.6, eR: 1.5 },
  volley: { lean: -0.8, hd: 0.45, tL: 0.4, sL: -0.6, tR: 2.05, sR: 2.15, ftL: 0.6, ftR: 0.5, aL: 2.0, eL: 2.3, aR: -1.5, eR: -1.2 },
  follow: { lean: -0.35, hd: 0.25, tL: 0.45, sL: -0.25, tR: 1.1, sR: 0.85, ftL: 0.4, ftR: 0.4, aL: 1.3, eL: 1.7, aR: -1.0, eR: -0.7 },
} satisfies Record<string, Pose>;

export function mixPose(a: Pose, b: Pose, k: number): Pose {
  const o = {} as Pose;
  for (const key of Object.keys(a) as (keyof Pose)[]) o[key] = lerp(a[key], b[key], k);
  return o;
}

export interface Look {
  /** direction the light comes FROM, in screen space (unit-ish) */
  light: Pt;
  rim: string;
  rimA?: number;
  /** a flat dark silhouette with only the rim (for white or blinding frames) */
  silhouette?: boolean;
  /** 0..1: how hard the wind pulls the hair and jersey */
  wind?: number;
  t: number;
  /** the direction the scarf streams toward, in screen space (default: behind him) */
  flow?: Pt;
  /** draw the 10 on his back (when we see it) */
  back?: boolean;
}

const COL = {
  line: '#0b0d16',
  skin: '#f3cfae', skinS: '#c98b72',
  kit: '#a6f03a', kitS: '#5a9a1c',
  collar: '#10131c',
  shorts: '#151925', shortsS: '#07080d',
  sock: '#eef2f7', sockS: '#a9b4c6',
  boot: '#11141c', bootS: '#05060a', flash: '#a6f03a',
  hair: '#eef1f7', hairS: '#a3b0c9', hairHi: '#ffffff',
  iris: '#53d6b6',
  scarf: '#f4ecd9', scarfS: '#c8b99c',
};

export interface Skeleton { hip: Pt; neck: Pt; head: Pt; footL: Pt; footR: Pt; toeR: Pt; handL: Pt; handR: Pt; kneeR: Pt }

type Path = (ctx: CanvasRenderingContext2D) => void;

/**
 * Draw the striker with his hip at (x, y), H = full standing height in px, facing d (+1 right),
 * the whole body turned by rot. Returns key points in screen space.
 */
export function drawStriker(ctx: CanvasRenderingContext2D, x: number, y: number, H: number, ps: Pose, look: Look, d = 1, rot = 0): Skeleton {
  const u = H / 7.4;
  const wind = look.wind ?? 0.3;
  const t = look.t;
  // world light, into the unmirrored, unrotated body frame
  const L0 = norm([look.light[0] * d, look.light[1]]);
  const Lb = rotV(L0, -rot);
  const sil = !!look.silhouette;

  // ---- the skeleton, in body space (facing +x, y down, units of u)
  const down = (a: number, l: number): Pt => [Math.sin(a) * l, Math.cos(a) * l];
  const up = (a: number, l: number): Pt => [Math.sin(a) * l, -Math.cos(a) * l];
  const add = (p: Pt, v: Pt): Pt => [p[0] + v[0], p[1] + v[1]];
  const hip: Pt = [0, 0];
  const shoulder = add(hip, up(ps.lean, 2.25));
  const neck = add(hip, up(ps.lean, 2.55));
  const headO = add(neck, up(ps.lean + ps.hd, 0.12));
  const kneeL = add(hip, down(ps.tL, 1.95)), ankleL = add(kneeL, down(ps.sL, 1.9));
  const kneeR = add(hip, down(ps.tR, 1.95)), ankleR = add(kneeR, down(ps.sR, 1.9));
  const shL = add(shoulder, [-0.12 * Math.cos(ps.lean), 0]), shR = add(shoulder, [0.1 * Math.cos(ps.lean), 0.05]);
  const elL = add(shL, down(ps.aL, 1.35)), hdL = add(elL, down(ps.eL, 1.2));
  const elR = add(shR, down(ps.aR, 1.35)), hdR = add(elR, down(ps.eR, 1.2));

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(d, 1);
  ctx.rotate(rot);
  ctx.scale(u, u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  /** draw one part: in a bone frame at `o`, rotated by `ang` (canvas rotation), cel-lit */
  const part = (o: Pt, ang: number, path: Path, base: string, shade: string, extra?: () => void) => {
    ctx.save();
    ctx.translate(o[0], o[1]);
    ctx.rotate(ang);
    const Lp = rotV(Lb, -ang);
    cel(ctx, path, sil ? '#06080d' : base, sil ? '#06080d' : shade, look.rim, (look.rimA ?? 1) * (sil ? 1.3 : 1), Lp, sil);
    if (extra && !sil) extra();
    ctx.restore();
  };

  // limbs: canvas rotation that makes +y run along the bone = -angle
  const leg = (hipP: Pt, knee: Pt, ankle: Pt, tA: number, sA: number, ft: number, far: boolean) => {
    const dim = far && !sil ? 0.82 : 1;
    ctx.save();
    part(hipP, -tA, thighPath, shadeMul(COL.skin, dim), shadeMul(COL.skinS, dim));
    part(hipP, -tA, shortsLegPath, shadeMul(COL.shorts, dim), COL.shortsS);
    part(knee, -sA, shinPath, shadeMul(COL.skin, dim), shadeMul(COL.skinS, dim));
    part(knee, -sA, sockPath, shadeMul(COL.sock, dim), shadeMul(COL.sockS, dim), () => {
      ctx.fillStyle = COL.kit;
      ctx.fillRect(-0.24, 0.62, 0.46, 0.1);
    });
    part(ankle, -sA + ft, bootPath, COL.boot, COL.bootS, () => {
      ctx.strokeStyle = COL.flash;
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.moveTo(0.05, 0.02);
      ctx.quadraticCurveTo(0.3, 0.12, 0.6, 0.04);
      ctx.stroke();
    });
    ctx.restore();
  };
  const arm = (sh: Pt, el: Pt, aA: number, eA: number, far: boolean) => {
    const dim = far && !sil ? 0.82 : 1;
    part(el, -eA, forearmPath, shadeMul(COL.skin, dim), shadeMul(COL.skinS, dim));
    part(sh, -aA, upperArmPath, shadeMul(COL.skin, dim), shadeMul(COL.skinS, dim));
    part(sh, -aA, sleevePath, shadeMul(COL.kit, dim), shadeMul(COL.kitS, dim));
  };

  // the scarf's two tails, streaming behind everything
  const flow = norm(rotV([(look.flow?.[0] ?? -1) * d, look.flow?.[1] ?? -0.2], -rot));
  const anchor = add([0, 0], rotV([-0.32, -2.42], ps.lean));
  for (const [len, ph, dim] of [[2.4, 1.9, 0.8], [3.1, 0, 1]] as const) {
    const pts = scarfTail(anchor, flow, len, ph, wind, t);
    part([0, 0], 0, (c) => ribbon(c, pts, 0.5, 0.42), shadeMul(COL.scarf, dim), COL.scarfS, () => {
      // lime stripes near the end
      ctx.strokeStyle = COL.kit;
      ctx.lineWidth = 0.09;
      for (const k of [0.8, 0.88]) {
        const i = Math.floor(k * (pts.length - 1));
        const [p, q] = [pts[i], pts[i + 1]];
        const nx = -(q[1] - p[1]), ny = q[0] - p[0], l = Math.hypot(nx, ny) || 1;
        ctx.beginPath();
        ctx.moveTo(p[0] + (nx / l) * 0.16, p[1] + (ny / l) * 0.16);
        ctx.lineTo(p[0] - (nx / l) * 0.16, p[1] - (ny / l) * 0.16);
        ctx.stroke();
      }
    });
  }

  // far side first
  arm(shL, elL, ps.aL, ps.eL, true);
  leg([-0.06, 0.05], kneeL, ankleL, ps.tL, ps.sL, ps.ftL, true);
  part(hip, ps.lean, pelvisPath, COL.shorts, COL.shortsS);
  leg([0.06, 0.08], kneeR, ankleR, ps.tR, ps.sR, ps.ftR, false);
  // torso, with the hem lifting in the wind
  const hem = (ctx2: CanvasRenderingContext2D) => torsoPath(ctx2, wind, t);
  part(hip, ps.lean, hem, COL.kit, COL.kitS, () => {
    // collar and a side panel
    ctx.fillStyle = COL.collar;
    ctx.beginPath();
    ctx.moveTo(-0.22, -2.42);
    ctx.quadraticCurveTo(0.05, -2.28, 0.26, -2.42);
    ctx.lineTo(0.22, -2.52);
    ctx.quadraticCurveTo(0.03, -2.42, -0.18, -2.52);
    ctx.fill();
    ctx.fillStyle = 'rgba(16,19,28,0.55)';
    ctx.beginPath();
    ctx.moveTo(-0.08, -2.2);
    ctx.lineTo(0.02, 0.1);
    ctx.lineTo(-0.12, 0.1);
    ctx.lineTo(-0.2, -2.2);
    ctx.fill();
    if (look.back) {
      ctx.fillStyle = COL.collar;
      ctx.font = '700 0.95px "Dela Gothic One", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('10', -0.05, -1.35);
    }
  });
  // neck, the scarf's wrap, head, hair
  part(neck, ps.lean + ps.hd * 0.5, neckPath, COL.skin, COL.skinS);
  part(hip, ps.lean, scarfWrap, COL.scarf, COL.scarfS, () => {
    ctx.strokeStyle = COL.scarfS;
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(-0.3, -2.45);
    ctx.quadraticCurveTo(0.05, -2.36, 0.36, -2.46);
    ctx.stroke();
  });
  part(headO, ps.lean + ps.hd, bigHead(headPath), COL.skin, COL.skinS, () => {
    ctx.scale(HEAD, HEAD);
    face(ctx);
  });
  part(headO, ps.lean + ps.hd, bigHead((c) => hairPath(c, wind, t)), COL.hair, COL.hairS, () => {
    ctx.save();
    ctx.scale(HEAD, HEAD);
    hairPath(ctx, wind, t);
    ctx.clip();
    ctx.strokeStyle = COL.hairHi;
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    ctx.arc(-0.02, -0.66, 0.36, Math.PI * 1.08, Math.PI * 1.62);
    ctx.stroke();
    ctx.restore();
  });
  arm(shR, elR, ps.aR, ps.eR, false);
  ctx.restore();

  // key points back in screen space
  const toS = (p: Pt): Pt => {
    const r = rotV([p[0] * u, p[1] * u], rot);
    return [x + r[0] * d, y + r[1]];
  };
  const toeR = add(ankleR, rotV([0.7, 0.12], -ps.sR + ps.ftR));
  return { hip: toS(hip), neck: toS(neck), head: toS(add(headO, up(ps.lean + ps.hd, 0.55))), footL: toS(ankleL), footR: toS(ankleR), toeR: toS(toeR), handL: toS(hdL), handR: toS(hdR), kneeR: toS(kneeR) };
}

/** where his key points would land, without drawing (same arguments as drawStriker) */
export function strikerPoints(x: number, y: number, H: number, ps: Pose, d = 1, rot = 0): Skeleton {
  const u = H / 7.4;
  const down = (a: number, l: number): Pt => [Math.sin(a) * l, Math.cos(a) * l];
  const up = (a: number, l: number): Pt => [Math.sin(a) * l, -Math.cos(a) * l];
  const add = (p: Pt, v: Pt): Pt => [p[0] + v[0], p[1] + v[1]];
  const neck = up(ps.lean, 2.55);
  const headO = add(neck, up(ps.lean + ps.hd, 0.12));
  const kneeL = down(ps.tL, 1.95), ankleL = add(kneeL, down(ps.sL, 1.9));
  const kneeR = down(ps.tR, 1.95), ankleR = add(kneeR, down(ps.sR, 1.9));
  const sh = up(ps.lean, 2.25);
  const hdL = add(add(sh, down(ps.aL, 1.35)), down(ps.eL, 1.2)), hdR = add(add(sh, down(ps.aR, 1.35)), down(ps.eR, 1.2));
  const toeR = add(ankleR, rotV([0.7, 0.12], -ps.sR + ps.ftR));
  const toS = (p: Pt): Pt => {
    const r = rotV([p[0] * u, p[1] * u], rot);
    return [x + r[0] * d, y + r[1]];
  };
  return { hip: [x, y], neck: toS(neck), head: toS(add(headO, up(ps.lean + ps.hd, 0.55))), footL: toS(ankleL), footR: toS(ankleR), toeR: toS(toeR), handL: toS(hdL), handR: toS(hdR), kneeR: toS(kneeR) };
}

/** a close-up of his face in profile, for the eye insert. (x, y) = the eye; s = head height in px */
export function drawStrikerFace(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, look: Look, glint: number, d = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(d * s, s);
  ctx.translate(-0.35, 0.58);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const L = norm([look.light[0] * d, look.light[1]]);
  cel(ctx, headPath, COL.skin, COL.skinS, look.rim, look.rimA ?? 1, L, false, 0.02, 0.3);
  face(ctx, glint);
  cel(ctx, (c) => hairPath(c, look.wind ?? 0.5, look.t), COL.hair, COL.hairS, look.rim, look.rimA ?? 1, L, false, 0.02, 0.3);
  ctx.save();
  hairPath(ctx, look.wind ?? 0.5, look.t);
  ctx.clip();
  ctx.strokeStyle = COL.hairHi;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.arc(-0.02, -0.66, 0.36, Math.PI * 1.08, Math.PI * 1.62);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/* ============================================================= cel paint */

function cel(ctx: CanvasRenderingContext2D, path: Path, base: string, shade: string, rim: string, rimA: number, L: Pt, sil: boolean, lw = 0.055, off = 1) {
  // base + hard shadow: shadow everywhere, then the base nudged toward the light
  ctx.save();
  ctx.beginPath();
  path(ctx);
  ctx.clip();
  ctx.fillStyle = shade;
  ctx.fill();
  if (!sil) {
    ctx.save();
    ctx.translate(L[0] * 0.13 * off, L[1] * 0.13 * off);
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = base;
    ctx.fill();
    ctx.restore();
  }
  // the rim: what the part covers outside a copy of itself nudged away from the light
  if (rimA > 0) {
    ctx.globalAlpha = Math.min(1, rimA);
    ctx.beginPath();
    ctx.rect(-50, -50, 100, 100);
    ctx.save();
    ctx.translate(-L[0] * 0.09 * off, -L[1] * 0.09 * off);
    path(ctx);
    ctx.restore();
    ctx.fillStyle = rim;
    ctx.fill('evenodd');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // line art
  ctx.beginPath();
  path(ctx);
  ctx.strokeStyle = COL.line;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/* ================================================================ shapes */
/* limbs: the bone runs from (0,0) down +y; +x is forward */

const thighPath: Path = (c) => {
  c.moveTo(0.3, -0.1);
  c.bezierCurveTo(0.42, 0.5, 0.36, 1.3, 0.22, 1.9);
  c.quadraticCurveTo(0.02, 2.08, -0.2, 1.92);
  c.bezierCurveTo(-0.3, 1.3, -0.36, 0.5, -0.32, -0.1);
  c.closePath();
};
const shortsLegPath: Path = (c) => {
  c.moveTo(0.38, -0.2);
  c.lineTo(0.44, 0.95);
  c.quadraticCurveTo(0.02, 1.08, -0.4, 0.98);
  c.lineTo(-0.38, -0.2);
  c.closePath();
};
const shinPath: Path = (c) => {
  c.moveTo(0.2, -0.05);
  c.bezierCurveTo(0.22, 0.6, 0.15, 1.3, 0.12, 1.9);
  c.lineTo(-0.13, 1.9);
  c.bezierCurveTo(-0.2, 1.3, -0.36, 0.7, -0.22, -0.05);
  c.quadraticCurveTo(0, -0.12, 0.2, -0.05);
  c.closePath();
};
const sockPath: Path = (c) => {
  c.moveTo(0.21, 0.55);
  c.bezierCurveTo(0.18, 1.1, 0.15, 1.5, 0.13, 1.92);
  c.lineTo(-0.14, 1.92);
  c.bezierCurveTo(-0.2, 1.4, -0.33, 0.95, -0.3, 0.55);
  c.quadraticCurveTo(-0.05, 0.6, 0.21, 0.55);
  c.closePath();
};
/** the boot, at the ankle: heel back, toe forward along +x */
const bootPath: Path = (c) => {
  c.moveTo(-0.17, -0.3);
  c.lineTo(0.16, -0.3);
  c.quadraticCurveTo(0.22, -0.06, 0.45, -0.04);
  c.quadraticCurveTo(0.78, -0.02, 0.84, 0.13);
  c.quadraticCurveTo(0.84, 0.22, 0.7, 0.23);
  c.lineTo(-0.15, 0.22);
  c.quadraticCurveTo(-0.26, 0.2, -0.24, 0.0);
  c.closePath();
};
const upperArmPath: Path = (c) => {
  c.moveTo(0.18, -0.05);
  c.bezierCurveTo(0.22, 0.5, 0.16, 1.0, 0.13, 1.38);
  c.quadraticCurveTo(0, 1.46, -0.13, 1.38);
  c.bezierCurveTo(-0.19, 1.0, -0.22, 0.5, -0.18, -0.05);
  c.closePath();
};
const sleevePath: Path = (c) => {
  c.moveTo(0.26, -0.22);
  c.quadraticCurveTo(0.3, 0.3, 0.27, 0.72);
  c.quadraticCurveTo(0, 0.8, -0.25, 0.72);
  c.quadraticCurveTo(-0.29, 0.3, -0.24, -0.22);
  c.quadraticCurveTo(0, -0.34, 0.26, -0.22);
  c.closePath();
};
const forearmPath: Path = (c) => {
  c.moveTo(0.13, -0.05);
  c.bezierCurveTo(0.16, 0.4, 0.11, 0.9, 0.09, 1.2);
  // the hand, a loose fist
  c.quadraticCurveTo(0.2, 1.3, 0.14, 1.48);
  c.quadraticCurveTo(0.0, 1.6, -0.13, 1.46);
  c.quadraticCurveTo(-0.17, 1.3, -0.09, 1.2);
  c.bezierCurveTo(-0.12, 0.9, -0.17, 0.4, -0.13, -0.05);
  c.closePath();
};
/* torso frame: hip at (0,0), up is -y */
const pelvisPath: Path = (c) => {
  c.moveTo(-0.44, -0.4);
  c.lineTo(0.44, -0.4);
  c.lineTo(0.48, 0.35);
  c.quadraticCurveTo(0, 0.5, -0.48, 0.35);
  c.closePath();
};
function torsoPath(c: CanvasRenderingContext2D, wind: number, t: number) {
  const f = (i: number) => wind * 0.12 * Math.sin(t * 11 + i * 1.7);
  c.moveTo(0.4, 0.12 + f(0));
  c.bezierCurveTo(0.5, -0.5, 0.58, -1.3, 0.48, -2.05);
  c.quadraticCurveTo(0.42, -2.38, 0.2, -2.46);
  c.quadraticCurveTo(0.0, -2.36, -0.22, -2.46);
  c.quadraticCurveTo(-0.55, -2.32, -0.56, -1.9);
  c.bezierCurveTo(-0.6, -1.2, -0.48, -0.5, -0.44, 0.14 + f(1));
  // the hem, fluttering
  c.lineTo(-0.5 - wind * 0.15, 0.22 + f(2));
  c.quadraticCurveTo(-0.1, 0.3 + f(3), 0.2, 0.2 + f(4));
  c.lineTo(0.44, 0.24 + f(5));
  c.closePath();
}
const neckPath: Path = (c) => {
  c.moveTo(0.13, -0.05);
  c.lineTo(0.12, -0.42);
  c.lineTo(-0.16, -0.42);
  c.lineTo(-0.15, -0.05);
  c.closePath();
};
/* head frame: origin at the top of the neck, up is -y, the face looks along +x */
const headPath: Path = (c) => {
  c.moveTo(-0.06, -0.12);
  c.quadraticCurveTo(0.16, -0.0, 0.3, -0.06);
  c.quadraticCurveTo(0.41, -0.13, 0.42, -0.26);
  c.lineTo(0.45, -0.34);
  c.lineTo(0.44, -0.39);
  c.lineTo(0.5, -0.47);
  c.lineTo(0.45, -0.52);
  c.quadraticCurveTo(0.48, -0.76, 0.37, -0.92);
  c.bezierCurveTo(0.2, -1.14, -0.36, -1.1, -0.45, -0.75);
  c.quadraticCurveTo(-0.5, -0.4, -0.2, -0.25);
  c.closePath();
};
function face(c: CanvasRenderingContext2D, glint = 0) {
  // ear
  c.fillStyle = COL.skinS;
  c.beginPath();
  c.ellipse(-0.06, -0.5, 0.08, 0.13, 0.1, 0, TAU);
  c.fill();
  c.strokeStyle = COL.line;
  c.lineWidth = 0.035;
  c.stroke();
  // brow: thin and calm
  c.strokeStyle = '#6d7891';
  c.lineWidth = 0.035;
  c.beginPath();
  c.moveTo(0.22, -0.8);
  c.quadraticCurveTo(0.34, -0.83, 0.44, -0.78);
  c.stroke();
  // the eye: big and gentle, a soft upper lid, a teal iris, two glints
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(0.23, -0.67);
  c.quadraticCurveTo(0.35, -0.73, 0.44, -0.64);
  c.quadraticCurveTo(0.38, -0.5, 0.27, -0.54);
  c.closePath();
  c.fill();
  const ir = c.createLinearGradient(0, -0.7, 0, -0.5);
  ir.addColorStop(0, '#1f6f7c');
  ir.addColorStop(1, COL.iris);
  c.fillStyle = ir;
  c.beginPath();
  c.ellipse(0.37, -0.6, 0.055, 0.08, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#0b2a31';
  c.beginPath();
  c.ellipse(0.38, -0.6, 0.022, 0.04, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(0.355, -0.635, 0.016 + glint * 0.025, 0, TAU);
  c.arc(0.39, -0.565, 0.008, 0, TAU);
  c.fill();
  c.strokeStyle = COL.line;
  c.lineWidth = 0.045;
  c.beginPath();
  c.moveTo(0.21, -0.65);
  c.quadraticCurveTo(0.34, -0.74, 0.45, -0.64);
  c.lineTo(0.48, -0.66);
  c.stroke();
  c.lineWidth = 0.018;
  c.beginPath();
  c.moveTo(0.29, -0.535);
  c.quadraticCurveTo(0.36, -0.52, 0.41, -0.55);
  c.stroke();
  // mouth: a small calm line
  c.lineWidth = 0.025;
  c.beginPath();
  c.moveTo(0.36, -0.24);
  c.quadraticCurveTo(0.39, -0.23, 0.42, -0.25);
  c.stroke();
  // a little blush
  c.fillStyle = 'rgba(232,130,120,0.35)';
  c.beginPath();
  c.ellipse(0.3, -0.44, 0.06, 0.025, 0, 0, TAU);
  c.fill();
}

/**
 * The hair: a soft, full mop of silver, flaring into feathered points at the back and the nape
 * (they stream with the wind), bangs falling over the brow, a lock down in front of the ear.
 * [x, y, sharp, blows]
 */
const HAIR: [number, number, 0 | 1, 0 | 1][] = [
  [0.14, -0.7, 0, 0],
  [0.42, -0.73, 1, 0],
  [0.34, -0.78, 0, 0],
  [0.55, -0.78, 1, 0],
  [0.44, -0.92, 0, 0],
  [0.56, -1.02, 1, 0],
  [0.3, -1.16, 0, 0],
  [0.0, -1.24, 0, 0],
  [-0.14, -1.33, 1, 1],
  [-0.32, -1.14, 0, 0],
  [-0.68, -1.1, 1, 1],
  [-0.56, -0.95, 0, 0],
  [-0.84, -0.8, 1, 1],
  [-0.6, -0.7, 0, 0],
  [-0.8, -0.46, 1, 1],
  [-0.52, -0.44, 0, 0],
  [-0.58, -0.18, 1, 1],
  [-0.3, -0.3, 0, 0],
  [-0.12, -0.52, 0, 0],
  [0.03, -0.62, 0, 0],
  [0.06, -0.38, 1, 0],
  [0.15, -0.58, 0, 0],
];
function hairPath(c: CanvasRenderingContext2D, wind: number, t: number) {
  const pts = HAIR.map(([x, y, sharp, blows], i): [number, number, number] => {
    const b = blows ? wind * (0.1 + 0.06 * Math.sin(t * 9 + i * 1.7)) : 0;
    return [x - b, y + (blows ? Math.sin(t * 7 + i) * wind * 0.03 : 0), sharp];
  });
  const n = pts.length;
  const mid = (i: number): Pt => {
    const p = pts[i % n], q = pts[(i + 1) % n];
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  };
  // soft points are curve controls; sharp ones are hit exactly
  const m0 = mid(n - 1);
  c.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], m = mid(i);
    if (p[2]) {
      c.lineTo(p[0], p[1]);
      c.lineTo(m[0], m[1]);
    } else c.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  c.closePath();
}

/** the scarf's wrap round the neck (torso frame) */
const scarfWrap: Path = (c) => {
  c.moveTo(-0.34, -2.28);
  c.quadraticCurveTo(0.05, -2.18, 0.4, -2.3);
  c.lineTo(0.4, -2.62);
  c.quadraticCurveTo(0.05, -2.5, -0.36, -2.62);
  c.closePath();
};

/** anime proportions: the head a little big for the body */
const HEAD = 1.18;
function bigHead(p: Path): Path {
  return (c) => {
    const m = c.getTransform();
    c.scale(HEAD, HEAD);
    p(c);
    c.setTransform(m);
  };
}

/** the centre line of a scarf tail: out from the anchor along the flow, rippling more toward the end */
function scarfTail(a: Pt, flow: Pt, len: number, ph: number, wind: number, t: number): Pt[] {
  const N = 28, px = -flow[1], py = flow[0];
  const amp = 0.2 + wind * 0.5;
  const out: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    const wv = (Math.sin(t * 8 - k * 4.2 + ph) + 0.35 * Math.sin(t * 13 - k * 7.5 + ph)) * amp * k;
    // with no wind the tail droops
    const sag = (1 - wind) * k * k * len * 0.7;
    out.push([a[0] + flow[0] * len * k + px * wv, a[1] + flow[1] * len * k + py * wv + sag]);
  }
  return out;
}
/** a ribbon of width w0 → w1 along a centre line, cut square at the end */
function ribbon(c: CanvasRenderingContext2D, pts: Pt[], w0: number, w1: number) {
  const n = pts.length;
  const side = (s: number) => pts.map((p, i): Pt => {
    const q = pts[Math.min(n - 1, i + 1)], o = pts[Math.max(0, i - 1)];
    const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1;
    const w = lerp(w0, w1, i / (n - 1)) / 2;
    return [p[0] - (dy / l) * w * s, p[1] + (dx / l) * w * s];
  });
  const A = side(1), B = side(-1);
  c.moveTo(A[0][0], A[0][1]);
  for (let i = 1; i < n; i++) c.lineTo(A[i][0], A[i][1]);
  for (let i = n - 1; i >= 0; i--) c.lineTo(B[i][0], B[i][1]);
  c.closePath();
}

/* ================================================================== util */

function norm(v: Pt): Pt {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
}
function rotV(v: Pt, a: number): Pt {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}
function shadeMul(hex: string, k: number): string {
  if (k === 1) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}
