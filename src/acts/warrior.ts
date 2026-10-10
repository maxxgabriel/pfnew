import { brush } from '../core/brush';
import { type Pt, TAU, clamp, lerp } from '../core/math';

/*
 * THE INK WARRIORS.
 *
 * Each fighter is painted fresh every frame from a handful of brush strokes
 * around a tiny skeleton. The skeleton is solved from the blade: the hands
 * are wherever the hilt is, the chest sits behind the hands, the hips under
 * the chest, and the feet find the ground — or, when the hilt is too high
 * for the feet to reach it, tuck up into a leap. So the existing blade
 * choreography drives the whole body.
 */

export interface WarriorIn {
  hilt: Pt;
  /** blade direction (radians) */
  a: number;
  /** x of the opponent's hilt, so the fighter faces them */
  foeX: number;
  /** figure height in px */
  s: number;
  groundY: number;
  /** blade colour, used for the sash and the rim light */
  color: string;
  t: number;
  /** smoothed hilt velocity, px/s */
  vx: number;
  vy: number;
  seed: number;
  alpha?: number;
  /** sash and headband colour, if not the blade's */
  sash?: string;
}

/** two-bone IK: the joint between a and b for bones l1, l2; bend picks the side */
function ik(a: Pt, b: Pt, l1: number, l2: number, bend: number): Pt {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = clamp(Math.hypot(dx, dy), 1e-3, l1 + l2 - 1e-3);
  const ang = Math.atan2(dy, dx);
  const cos = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const off = Math.acos(cos) * bend;
  return [a[0] + Math.cos(ang + off) * l1, a[1] + Math.sin(ang + off) * l1];
}

interface Skel {
  head: Pt; chest: Pt; pelvis: Pt; shoulder: Pt;
  hand1: Pt; hand2: Pt; elbow1: Pt; elbow2: Pt;
  footF: Pt; footB: Pt; kneeF: Pt; kneeB: Pt;
  f: number; air: number;
}

export function solve(o: WarriorIn): Skel {
  const { hilt, a, s } = o;
  const f = o.foeX > hilt[0] ? 1 : -1;
  const dx = Math.cos(a), dy = Math.sin(a);
  // both hands on the grip, one at the guard and one at the pommel
  const hl = s * 0.22;
  const hand1: Pt = [hilt[0] - dx * hl * 0.12, hilt[1] - dy * hl * 0.12];
  const hand2: Pt = [hilt[0] - dx * hl * 0.6, hilt[1] - dy * hl * 0.6];
  const mid: Pt = [(hand1[0] + hand2[0]) / 2, (hand1[1] + hand2[1]) / 2];
  // the chest stands back from the hands, away from where the blade points
  let chest: Pt = [mid[0] - f * s * 0.17 - dx * s * 0.06, mid[1] + s * 0.02 - dy * s * 0.05];
  const reach = s * 0.31;
  const cd = Math.hypot(chest[0] - mid[0], chest[1] - mid[1]);
  if (cd > reach) chest = [mid[0] + ((chest[0] - mid[0]) / cd) * reach, mid[1] + ((chest[1] - mid[1]) / cd) * reach];
  // lean into the motion
  const lean = clamp(o.vx / (s * 6), -0.35, 0.35);
  const pelvis: Pt = [chest[0] - lean * s * 0.25 - f * s * 0.04, chest[1] + s * 0.29];
  const head: Pt = [chest[0] + f * s * 0.035 + lean * s * 0.05, chest[1] - s * 0.13];
  const shoulder: Pt = [chest[0] + f * s * 0.025, chest[1] + s * 0.025];
  const ua = s * 0.17;
  const elbow1 = ik(shoulder, hand1, ua, ua, f > 0 ? 1 : -1);
  const elbow2 = ik(shoulder, hand2, ua, ua, f > 0 ? 1 : -1);

  const leg = s * 0.23;
  const stand = o.groundY - pelvis[1];
  // when the ground is out of reach, the legs tuck into a leap
  const air = clamp((stand - leg * 1.85) / (s * 0.22), 0, 1);
  const standF: Pt = [pelvis[0] + f * s * 0.2, o.groundY];
  const standB: Pt = [pelvis[0] - f * s * 0.24, o.groundY];
  const tuckF: Pt = [pelvis[0] + f * s * 0.16, pelvis[1] + s * 0.2];
  const tuckB: Pt = [pelvis[0] - f * s * 0.2, pelvis[1] + s * 0.36];
  const footF: Pt = [lerp(standF[0], tuckF[0], air), lerp(standF[1], tuckF[1], air)];
  const footB: Pt = [lerp(standB[0], tuckB[0], air), lerp(standB[1], tuckB[1], air)];
  const hipF: Pt = [pelvis[0] + f * s * 0.02, pelvis[1]];
  const hipB: Pt = [pelvis[0] - f * s * 0.02, pelvis[1]];
  const kneeF = ik(hipF, footF, leg, leg, f > 0 ? -1 : 1);
  const kneeB = ik(hipB, footB, leg, leg, f > 0 ? -1 : 1);
  return { head, chest, pelvis, shoulder, hand1, hand2, elbow1, elbow2, footF, footB, kneeF, kneeB, f, air };
}

function strokes(ctx: CanvasRenderingContext2D, k: Skel, o: WarriorIn, color: string, rim: boolean) {
  const { s, t, seed } = o;
  const W = s * 0.01;
  const br = (pts: Pt[], width: number, sd: number, dry = 0.4) =>
    brush(ctx, pts, { width, color, dry, seed: seed * 50 + sd, press: 1.25, tail: 0.35, halo: rim ? 0 : 0.12 });
  const f = k.f;
  const flow = clamp(-o.vx / (s * 4), -1, 1) - f * 0.3;
  const wave = (ph: number) => Math.sin(t * 9 + ph + seed) * s * 0.02;

  // hakama: two wide trouser legs that follow hip → knee → ankle, so a leg can
  // never come loose from the body; each flares at the hem and flutters
  ctx.fillStyle = color;
  const trouser = (hip: Pt, knee: Pt, foot: Pt, ph: number) => {
    const hem: Pt = [lerp(knee[0], foot[0], 0.78), lerp(knee[1], foot[1], 0.78)];
    const pts: [Pt, number][] = [[hip, s * 0.068], [[lerp(hip[0], knee[0], 0.5), lerp(hip[1], knee[1], 0.5)], s * 0.062], [knee, s * 0.056], [[lerp(knee[0], hem[0], 0.5), lerp(knee[1], hem[1], 0.5)], s * 0.06], [hem, s * 0.074]];
    const L: Pt[] = [], R: Pt[] = [];
    pts.forEach(([p, wd], i) => {
      const a0 = pts[Math.max(0, i - 1)][0], a1 = pts[Math.min(pts.length - 1, i + 1)][0];
      const dx = a1[0] - a0[0], dy = a1[1] - a0[1], d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d;
      const fl = i === pts.length - 1 ? wave(ph) + flow * s * 0.03 : 0;
      L.push([p[0] + nx * wd + fl, p[1] + ny * wd]);
      R.push([p[0] - nx * wd + fl, p[1] - ny * wd]);
    });
    // smooth sides: curve through the midpoints so the cloth never shows a corner
    const side = (P: Pt[], first: boolean) => {
      if (first) ctx.moveTo(P[0][0], P[0][1]);
      else ctx.lineTo(P[0][0], P[0][1]);
      for (let i = 1; i < P.length - 1; i++) ctx.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
      ctx.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
    };
    ctx.beginPath();
    side(L, true);
    // the hem, rippling
    const hl = L[L.length - 1], hr = R[R.length - 1];
    for (let i = 1; i <= 4; i++) {
      const q = i / 4;
      ctx.lineTo(lerp(hl[0], hr[0], q), lerp(hl[1], hr[1], q) + Math.sin(q * 7 + t * 7 + seed + ph) * s * 0.012);
    }
    side(R.slice(0, -1).reverse(), false);
    ctx.closePath();
    ctx.fill();
    return hem;
  };
  const hipF: Pt = [k.pelvis[0] + f * s * 0.03, k.pelvis[1]], hipB: Pt = [k.pelvis[0] - f * s * 0.03, k.pelvis[1]];
  // the waist that joins them
  ctx.beginPath();
  ctx.ellipse(k.pelvis[0], k.pelvis[1] - s * 0.01, s * 0.085, s * 0.06, 0, 0, TAU);
  ctx.fill();
  const hemB = trouser(hipB, k.kneeB, k.footB, 2);
  const hemF = trouser(hipF, k.kneeF, k.footF, 0);
  // shins out of the hem, and the feet
  br([hemF, k.footF], W * 3, 1, 0.2);
  br([hemB, k.footB], W * 3, 2, 0.2);
  br([k.footF, [k.footF[0] + f * s * 0.06, k.footF[1] + s * 0.005]], W * 2.4, 3, 0.2);
  br([k.footB, [k.footB[0] + f * s * 0.06, k.footB[1] + s * 0.005]], W * 2.4, 4, 0.2);

  // torso: one heavy stroke, hips to collar
  br([k.pelvis, [lerp(k.pelvis[0], k.chest[0], 0.5) - f * s * 0.02, lerp(k.pelvis[1], k.chest[1], 0.5)], [k.chest[0], k.chest[1] - s * 0.03]], s * 0.14, 5, 0.25);
  // sash in the blade's colour
  if (!rim) {
    ctx.strokeStyle = o.sash ?? o.color;
    ctx.lineWidth = s * 0.035;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(k.pelvis[0] - s * 0.065, k.pelvis[1] - s * 0.035);
    ctx.lineTo(k.pelvis[0] + s * 0.065, k.pelvis[1] - s * 0.045);
    ctx.stroke();
    // sash tails
    ctx.lineWidth = s * 0.016;
    ctx.beginPath();
    const sx = k.pelvis[0] - f * s * 0.06, sy = k.pelvis[1] - s * 0.04;
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx - f * s * 0.08, sy + s * 0.05 + wave(3), sx - f * s * 0.16 + flow * s * 0.05, sy + s * 0.07 + wave(4));
    ctx.stroke();
  }

  // arms in wide sleeves
  for (const [el, hd, sd] of [[k.elbow2, k.hand2, 6], [k.elbow1, k.hand1, 7]] as [Pt, Pt, number][]) {
    br([k.shoulder, [lerp(k.shoulder[0], el[0], 0.5), lerp(k.shoulder[1], el[1], 0.5) + s * 0.01], el], s * 0.075, sd, 0.3);
    br([el, hd], W * 3, sd + 10);
    // the sleeve hangs off the elbow and trails in the wind
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(el[0] - s * 0.03, el[1] - s * 0.01);
    ctx.quadraticCurveTo(el[0] - f * s * 0.05 + flow * s * 0.05, el[1] + s * 0.08 + wave(sd), el[0] - f * s * 0.09 + flow * s * 0.09, el[1] + s * 0.11 + wave(sd + 1));
    ctx.lineTo(el[0] + s * 0.03, el[1] + s * 0.01);
    ctx.closePath();
    ctx.fill();
  }

  // head, topknot and headband tails
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(k.head[0], k.head[1], s * 0.058, s * 0.066, 0, 0, TAU);
  ctx.fill();
  br([[k.head[0] - f * s * 0.02, k.head[1] - s * 0.06], [k.head[0] - f * s * 0.05, k.head[1] - s * 0.1]], W * 2.6, 8, 0.2);
  if (!rim) {
    ctx.strokeStyle = o.sash ?? o.color;
    ctx.lineWidth = s * 0.012;
    ctx.beginPath();
    ctx.moveTo(k.head[0] - s * 0.055, k.head[1] - s * 0.015);
    ctx.lineTo(k.head[0] + s * 0.055, k.head[1] - s * 0.025);
    ctx.stroke();
  }
  for (let j = 0; j < 2; j++) {
    const bx = k.head[0] - f * s * 0.05, by = k.head[1] - s * 0.015;
    const pts: Pt[] = [];
    for (let i = 0; i <= 4; i++) {
      const q = i / 4;
      pts.push([bx - f * s * (0.2 + j * 0.05) * q + flow * s * 0.05 * q, by + q * s * 0.04 + Math.sin(t * 11 + q * 4 + j + seed) * s * 0.025 * q]);
    }
    if (rim) {
      ctx.strokeStyle = color;
      ctx.lineWidth = s * 0.012;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    } else {
      ctx.strokeStyle = o.sash ?? o.color;
      ctx.lineWidth = s * 0.01;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    }
  }
}

export function drawWarrior(ctx: CanvasRenderingContext2D, o: WarriorIn) {
  const k = solve(o);
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  // rim light: the same figure in the blade's colour, nudged toward the blade
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = (o.alpha ?? 1) * 0.55;
  ctx.translate(Math.cos(o.a) * o.s * 0.012, Math.sin(o.a) * o.s * 0.012 - o.s * 0.004);
  strokes(ctx, k, o, o.color, true);
  ctx.restore();
  strokes(ctx, k, o, '#060505', false);
  ctx.restore();
  return k;
}
