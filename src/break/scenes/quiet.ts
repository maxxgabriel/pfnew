import { flatDist, orbit, type Ctx } from '../director';
import { beatsOf, frame, hit, inCubic, inOutCubic, inQuart, lerp, outQuart, seg, smooth } from '../math';
import { INK, RED } from '../page';
import { T } from '../timeline';
import { members, mix, pose, put, type Pose3 } from './slabs';

/*
 * QUIET — the floor falls away. One thing is left in the dark: the box he came out of, righting itself
 * and floating. He sits on it with his coffee. This is fine. The box opens like a flower; deep inside,
 * red light: the Spark. It rises out of the box and he takes it.
 * RISE — he floats up holding it over his head. It pulses, faster and faster (a snare roll you can
 * see), one ring at a time. The page's parts come back as sketched outlines and circle him, faster.
 * The camera spirals round. Then one beat of nothing.
 */
export const RING = (c: Ctx) => Math.max(Math.min(c.L.W, c.L.H * 1.1) * 0.62, 260);

/** the floating box: centre (page px) and scale */
export function boxAt(c: Ctx) {
  const { W, H } = c.L, m = c.page.media;
  return { x: W / 2, y: H * 0.5, s: Math.min(W * 0.78, 560) / m.w };
}

/** where member i of N circles during the rise */
export function ringPose(c: Ctx, i: number, N: number, b: number, B: number): Pose3 {
  const x = Math.max(0, b - T.rise - 2), spin = 0.15 * x * (1 + x * 0.09) + 0.1 * B;
  const a = (i / N) * Math.PI * 2 + spin, R = RING(c), hub = riseHub(c, b);
  const tilt = 0.35;
  return pose({
    x: hub.x + Math.sin(a) * R, y: hub.y + Math.cos(a) * R * Math.sin(tilt) - c.L.face, z: Math.cos(a) * R * Math.cos(tilt),
    ry: a, depth: 0, s: Math.min(1, 220 / Math.max(80, c.page.byId.get('card0')?.b.w ?? 200)), sx: 1, sy: 1,
  });
}
/** where he floats during the rise */
export function riseHub(c: Ctx, b: number) {
  const bx = boxAt(c), top = bx.y - (c.page.media.h * bx.s) / 2;
  return { x: bx.x, y: lerp(top, c.L.H * 0.42, inOutCubic(seg(b, T.rise, T.rise + 6))), z: 0 };
}

export function quiet(c: Ctx) {
  const { b, t, L, page } = c;
  if (b < T.quiet || b >= T.slam) return;
  const Q = T.quiet, R0 = T.rise, hold = T.slam - 2;
  const frozen = b >= hold;
  const B = frozen ? 0 : beatsOf(t);
  const d0 = flatDist(L.H), face = L.face;
  c.bg.copy(INK); c.theme = '#1b1714';
  c.rib.vis = false;
  c.post.u.uStyle.value = 0;
  c.post.u.uVig.value = 0.55;

  // the floor falls away (all but the box)
  const ms = members(c, true);
  const ring = ms.filter((m) => m.id !== 'media' && m.id !== 'cta');
  ms.forEach((m, i) => {
    if (m.id === 'media') return;
    const f = inQuart(seg(b, Q + 0.06 * i, Q + 2.4 + 0.06 * i));
    const L0 = m.look;
    L0.y += 1600 * f; L0.rx += 1.4 * f * (i % 2 ? 1 : -1); L0.alpha = 1 - seg(b, Q + 1.2 + 0.06 * i, Q + 2.4 + 0.06 * i);
  });

  // the box rights itself and floats; later it opens and lets the Spark out; in the rise it falls away
  const m = page.media, ml = m.look, bx = boxAt(c);
  const media = ms.find((x) => x.id === 'media')!;
  const up = inOutCubic(seg(b, Q + 0.5, Q + 3));
  const float = pose({ x: bx.x, y: bx.y + 8 * Math.sin(t * 1.1), z: 0, ry: 0.18 * Math.sin(t * 0.5) * (1 - seg(b, Q + 8, Q + 9)), s: bx.s });
  const cur = pose({ x: media.cx + ml.x, y: media.cy + ml.y, z: ml.z, rx: ml.rx, ry: ml.ry, rz: ml.rz, s: ml.s });
  const away = inCubic(seg(b, R0 + 1, R0 + 4));
  const p = mix(cur, float, up);
  p.y += 1400 * away; p.rx += 0.8 * away;
  put(media, p);
  ml.vis = away < 0.99;
  ml.strain = 0.3;
  const open = smooth(seg(b, Q + 8, Q + 12.5)), amp = [1.7, 2.4, 2.3, 2.25];
  for (let i = 0; i < 4; i++) ml.open[i] = amp[i] * open + 0.05 * Math.sin(t * 2 + i) * open;

  // the Spark: deep in the box, rising out, then in his hands
  const top = bx.y - (m.h * bx.s) / 2, hub = riseHub(c, b);
  const sparkR = face * lerp(0.42, 0.75, seg(b, R0, hold));
  let sx = bx.x, sy = bx.y, sz = -m.depth * bx.s * 0.6;
  const rise = inOutCubic(seg(b, Q + 12.5, Q + 18.5));
  sz = lerp(sz, 60, rise); sy = lerp(bx.y, top - face * 3.2, rise);
  if (b >= R0 - 0.5) { const held = smooth(seg(b, R0 - 0.5, R0)); sx = lerp(sx, hub.x + face * 0.15, held); sy = lerp(sy, hub.y - face * 3.7, held); sz = lerp(sz, 6, held); }
  // the pulse: faster and faster through the rise
  const rate = b < R0 + 4 ? 1 : b < R0 + 8 ? 2 : b < R0 + 12 ? 4 : 8;
  const P = B * rate, pulse = b >= R0 ? hit(P % 1, 6) : 0;
  if (b >= Q + 8) {
    c.fx.spark.disc(sx, sy, sz, sparkR * (1 + 0.25 * pulse), RED, lerp(0.6, 1.6, seg(b, Q + 8, hold)) * (1 + 0.6 * pulse), smooth(seg(b, Q + 8, Q + 10)));
    c.fx.spark.bill = true;
  }
  if (b >= R0 && rate <= 2 && !frozen) {
    const u = P % 1;
    c.fx.a.ring(sx, sy, sz, sparkR + outQuart(u) * Math.max(L.W, L.H) * 0.6, 3 * (1 - u) + 1, RED, 1 - u);
    c.fx.a.bill = true;
  }

  // him: onto the box, sitting with his coffee; up when it opens; takes the Spark; rises with it
  if (b < R0) {
    if (b < Q + 2.5) {
      const a = seg(b, Q + 0.3, Q + 2.5), from = [L.W / 2, L.H * 0.5], to = [bx.x, top];
      const yy = lerp(from[1], to[1], a) - Math.sin(a * Math.PI) * face * 2.5;
      c.boy.set(a < 0.95 ? (a < 0.5 ? 'leap_2' : 'fall_0') : 'fine_1', lerp(from[0], to[0], a), yy, 4, face, { bill: true });
    } else if (b < Q + 11) {
      const sip = Math.floor(B / 2) % 2;
      c.boy.set(sip ? 'fine_0' : 'fine_1', bx.x, top + 2 + 8 * Math.sin(t * 1.1), 4, face, { bill: true });
    } else {
      const key = b < Q + 13.5 ? 'curious' : b < R0 - 1 ? 'still_3' : 'leap_3';
      c.boy.set(key, bx.x, top + 2 + 8 * Math.sin(t * 1.1) - (key === 'leap_3' ? face * 1.2 * seg(b, R0 - 1, R0) : 0), 4, face, { bill: true });
    }
  } else {
    c.boy.set(`powerup_${frame(B, 3, 2)}`, hub.x, hub.y + Math.sin(B * Math.PI) * 6, 4, face * 1.1, { bill: true, flash: 0.25 * pulse });
  }

  // the parts come back as outlines and circle him
  ring.forEach((mm, i) => {
    const k = inOutCubic(seg(b, R0 + 2 + 0.12 * i, R0 + 6 + 0.12 * i));
    if (k <= 0) return;
    const rp = ringPose(c, i, ring.length, b, B);
    const far = pose({ ...rp, x: rp.x * 4 - L.W * 1.5, y: rp.y - 2400, z: rp.z * 4 });
    put(mm, mix(far, rp, k));
    mm.look.wire = 1; mm.look.alpha = k; mm.look.color = null; mm.look.ink = 0;
  });

  // the camera: in front of the box, quiet and close; then spiralling round him
  const front = () => orbit(c, bx.x, bx.y - face, 0, d0 * lerp(1.1, 0.85, seg(b, Q + 3, Q + 12)), 0.12 * Math.sin(t * 0.3), 0.06);
  if (b < R0) front();
  else {
    const x = b - R0;
    front();
    const fr = { ...c.cam };
    orbit(c, hub.x, hub.y - face * 1.5, 0, d0 * lerp(1.25, 0.8, seg(b, R0, hold)), 0.55 * x * (1 + x * 0.04) + 0.08 * B, 0.22 + 0.18 * Math.sin(x * 0.35), lerp(35, 48, seg(b, R0, hold)));
    const k = smooth(seg(b, R0, R0 + 2));
    for (const key of ['x', 'y', 'z', 'tx', 'ty', 'tz'] as const) c.cam[key] = lerp(fr[key], c.cam[key], k);
  }
  if (frozen) { c.post.u.uVig.value = lerp(0.55, 0.9, seg(b, hold, T.slam)); c.cam.z -= (c.cam.z - c.cam.tz) * 0.08 * seg(b, hold, T.slam); }
  c.cam.shake = Math.max(c.cam.shake, 3 * pulse * seg(b, R0 + 6, hold));
}
