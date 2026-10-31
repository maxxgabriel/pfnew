import { flatDist, orbit, type Ctx } from '../director';
import { beatsOf, frame, hit, inCubic, inOutCubic, lerp, seg, smooth } from '../math';
import { INK, PAPER, RED } from '../page';
import { T } from '../timeline';
import { impact } from './open';
import { floorSlot, floorTarget } from './floor';
import { laySnake, rider } from './peel';
import { members, mix, pose, put, rest, type Pose3 } from './slabs';

/*
 * DROP — the page breaks along its layout. The sheet falls away into the dark and every block becomes
 * a thick slab, bursting out (nearest the button first) into a carousel that turns round him while he
 * rides the red button like a board. The camera cuts every two beats: wide, close, low, inside the
 * ring, overhead, a dutch angle. Halfway, the slabs line up into two walls streaming past and the cuts
 * come on every beat: chase, front, side. Then they fly down into a floor.
 */
const wrap = (v: number, lo: number, hi: number) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));

export function drop(c: Ctx) {
  const { b, t, L, page } = c;
  if (b < T.drop) return;
  const X = b - T.drop, B = beatsOf(t), n = Math.floor(B), ph = B - n;
  const { W, H } = L, d0 = flatDist(H), cx = W / 2, cy = H / 2;
  const ms = members(c), N = ms.length;
  const R = Math.max(Math.min(W, H * 1.25) * 0.95, 330), Rt = Math.max(Math.min(W, H * 1.25) * 0.55, 210);
  const spin = 0.32 * X + 0.1 * B;
  const tunnel = smooth(seg(X, 15, 17.5)), settle = inOutCubic(seg(b, T.floor - 6, T.floor - 0.5));
  c.bg.copy(INK); c.theme = '#1b1714';

  // the sheet falls away
  const sh = page.sheet.look;
  sh.z -= 1800 * inCubic(seg(X, 0, 2.2)); sh.rx -= 0.5 * seg(X, 0, 2.2); sh.alpha = 1 - seg(X, 0.6, 2.2);

  // the slabs: burst → carousel → tunnel → floor
  const ctaB = L.get('cta'), ccx = ctaB.x + ctaB.w / 2, ccy = ctaB.y + ctaB.h / 2;
  const order = ms.map((m, i) => [Math.hypot(m.cx - ccx, m.cy - ccy), i]).sort((a, z) => a[0] - z[0]).map((v) => v[1]);
  const rank = new Map(order.map((i, r) => [i, r]));
  const flow = X * 260 + B * 150, gap = 240, lo = -gap * Math.ceil(N / 2) + 500;
  ms.forEach((m, i) => {
    const a = (i / N) * Math.PI * 2 + spin, stomp = n % N === i ? hit(ph, 8) : 0;
    const ring = pose({ x: cx + Math.sin(a) * (R + 60 * stomp), y: cy + ((((i * 7) % 5) / 4) - 0.5) * H * 0.95, z: Math.cos(a) * (R + 60 * stomp), ry: a, depth: 70, s: 1 + 0.08 * stomp });
    // two walls of panels, every one scaled to the same height, streaming toward the camera
    const side = i % 2 ? 1 : -1, z = wrap(-Math.floor(i / 2) * gap + flow + (i % 2) * gap * 0.5, lo, 500), fade = smooth(seg(z, lo, lo + 600));
    const ph2 = Math.min(H * 0.42, 360) / Math.max(m.h, m.w * 0.5);
    const wall = pose({ x: cx + side * Rt, y: cy - H * 0.04, z, ry: -side * (Math.PI / 2 - 0.12 * Math.sin(z * 0.004)), depth: 40, s: ph2, alpha: fade });
    let p: Pose3 = mix(ring, wall, tunnel);
    p = mix(p, floorSlot(c, i, N, m), settle);
    const r = rank.get(i)!, e = inOutCubic(seg(X, 0.05 * r, 1.7 + 0.05 * r));
    const tumble = e * (1 - e) * 4;
    p.rz += tumble * (i % 2 ? 1.6 : -1.6); p.rx += tumble * 0.8;
    put(m, mix(rest(m), p, e));
  });

  // his board: the red button, flying a tight circle inside the ring, then straight down the tunnel
  const cta = members(c, true).find((m) => m.id === 'cta')!;
  const ab = -0.55 * X - 0.15 * B, bob = Math.sin(B * Math.PI) * 10;
  const circle = pose({ x: cx + 0.38 * R * Math.sin(ab), y: cy + 0.12 * H * Math.sin(0.8 * X + 0.5 * B), z: 0.38 * R * Math.cos(ab), rx: -Math.PI / 2, ry: ab + Math.PI / 2, rz: 0.3, depth: 18 });
  const straight = pose({ x: cx, y: cy + bob, z: 0, rx: -Math.PI / 2, rz: 0.12 * Math.sin(B * 0.9), depth: 18 });
  let bp = mix(mix(circle, straight, tunnel), floorTarget(c), settle);
  bp = mix(rest(cta), bp, inOutCubic(seg(X, 0, 1.6)));
  put(cta, bp);
  cta.look.color = RED;
  // he leaps off the ribbon onto the board as it comes up to meet him
  const hop = smooth(seg(X, 0.15, 1.5));
  const key = hop < 1 ? (hop < 0.5 ? 'leap_3' : 'fall_0') : settle > 0.5 ? 'still_0' : tunnel > 0.5 ? (n % 4 === 3 ? 'ride_3' : 'ride_0') : `ride_${frame(B, 4, 1)}`;
  const fx = lerp(rider.x, bp.x, hop), fy = lerp(rider.y, bp.y - 2, hop) - Math.sin(hop * Math.PI) * L.face * 1.5, fz = lerp(rider.z, bp.z, hop);
  c.boy.set(key, fx, fy, fz, L.face * lerp(1, 1.25, smooth(seg(X, 0, 2))), { bill: true, sy: 1 - 0.05 * hit(ph, 8) });

  // the ribbon rides alongside: round the ring, then down the tunnel beside him, then off into the dark
  if (tunnel > 0 || settle > 0) {
    const P = laySnake(c, 0.35 + (b - T.peel - 6) * 0.16 + 0.05 * B);
    P.forEach((v, i) => {
      v.set(lerp(v.x, cx + 0.45 * Rt * Math.sin(B * 1.5 + i * 0.9), tunnel), lerp(v.y, cy - 0.14 * H + 0.05 * H * Math.cos(B + i), tunnel), lerp(v.z, -300 - (i - 1) * 280, tunnel));
      v.y -= 2600 * inCubic(settle);
    });
    c.rib.u.uP.value.forEach((v, i) => v.copy(P[i]));
  }

  // the camera: a cut every two beats round the ring, every beat in the tunnel
  const cut = tunnel < 0.5 ? Math.floor(X / 2) : Math.floor(X);
  const v = tunnel < 0.5 ? (X % 2) / 2 : X % 1;
  const k = c.calm ? 0 : tunnel < 0.5 ? [1, 0, 2, 4, 3, 1, 5, 0][cut % 8] : 6 + [0, 1, 0, 2, 0, 1, 3, 2][cut % 8];
  const bx = fx, by = fy - L.face * 1.3, bz = fz;
  switch (k) {
    case 0: orbit(c, cx, cy, 0, 2.3 * d0, 0.25 + 0.25 * v, 0.42); break;
    case 1: orbit(c, bx, by, bz, 0.62 * d0, ab + Math.PI * 0.6 + 0.3 * v, 0.06); break;
    case 2: orbit(c, cx, cy, 0, 1.45 * d0, 1.1 - 0.25 * v, -0.5); break;
    case 3: orbit(c, cx, cy, 0, 2.7 * d0, -0.4, 1.3); c.cam.roll = 0.6 * v; break;
    case 4: orbit(c, bx, by, bz, 0.42 * d0, ab + 0.5 + 0.3 * v, -0.38); break;                    // under him, looking up
    case 5: orbit(c, cx, cy, 0, 1.8 * d0, -1.6 + 0.3 * v, 0.24); c.cam.roll = 0.28; break;
    case 6: orbit(c, bx, by, bz, 0.45 * d0, 0.1 * Math.sin(B), 0.24 + 0.05 * v); break;            // chase, from behind
    case 7: orbit(c, bx, by, bz, 0.42 * d0, Math.PI, 0.06); break;                            // in front, looking back at him
    case 8: orbit(c, bx, by, bz, Math.min(0.12 * d0, Rt * 0.7), Math.PI / 2 - 0.25, -0.12 + 0.1 * v); c.cam.fov = 55; c.cam.roll = -0.15; break; // low side
    default: orbit(c, bx, by, bz, 1.2 * d0, 0.2, 1.1); break;                                       // overhead
  }
  if (settle > 0) {
    const f = floorTarget(c);
    const from = { ...c.cam };
    orbit(c, f.x, f.y - L.face * 1.2, f.z, 1.25 * d0, 0.35, 0.36);
    for (const key2 of ['x', 'y', 'z', 'tx', 'ty', 'tz', 'roll'] as const) c.cam[key2] = lerp(from[key2], c.cam[key2], settle);
  }

  // hits: the burst, the tunnel, a kick of colour fringing on every cut
  impact(c, X, PAPER, 0.18);
  impact(c, X - 16, RED, 0.12);
  c.post.u.uChroma.value = Math.max(c.post.u.uChroma.value, 5 * hit(v, 10) * (1 - settle));
  c.cam.shake = Math.max(c.cam.shake, 18 * hit(X, 3.5), 10 * hit(X - 16, 5));
}
