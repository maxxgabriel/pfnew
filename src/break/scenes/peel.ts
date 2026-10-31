import * as THREE from 'three';
import { flatDist, orbit, type Ctx } from '../director';
import { beatsOf, frame, hit, inCubic, inOutCubic, lerp, noise, seg, smooth } from '../math';
import { INK } from '../page';
import { routeAt } from '../ribbon';
import { T } from '../timeline';

/*
 * PEEL — he jumps up and hangs off the end of the nav. His weight peels it off the page like a sticker;
 * it curls toward you, comes away whole and turns into a ribbon that whips across the page with him
 * riding it. The camera lifts and tilts: the website is a sheet floating in the dark. Blocks pop off
 * the page as the ribbon's head passes. Then the build: he powers up on the ribbon's head, every block
 * lifts off the sheet and trembles — and for one beat, everything stops.
 */
const P = Array.from({ length: 8 }, () => new THREE.Vector3());
const head = new THREE.Vector3(), near = new THREE.Vector3();
const SHEET = new THREE.Color('#f7f7f8');

/** where the ribbon flies: a slow figure over the top of the page (page px, z toward you) */
export function route(c: Ctx, s: number, out: THREE.Vector3) {
  const { W, H } = c.L;
  return out.set(W / 2 + 0.62 * W * Math.sin(1.9 * s + 0.4), H * 0.55 + 0.34 * H * Math.sin(1.25 * s), 280 + 190 * Math.sin(1.6 * s + 1.1));
}
/** the ribbon's control points with its head at route position s */
export function laySnake(c: Ctx, s: number) {
  for (let i = 0; i < 8; i++) route(c, s - (6 - i) / 5, P[i]);
  c.rib.u.uP.value.forEach((v, i) => v.copy(P[i]));
  return P;
}

export function peel(c: Ctx) {
  const { b, t, L, page, rib } = c;
  if (b < T.peel - 0.2) return;
  const G = T.peel, grab = G + 0.8, curl = G + 4, free = G + 6, tilt0 = G + 1.2, tilt1 = G + 8.5, power = T.drop - 4, hold = T.drop - 1;
  const frozen = b >= hold && b < T.drop;
  const B = frozen ? beatsOf(0) : beatsOf(t);
  const nav = L.get('nav'), h2 = L.get('head2'), face = L.face, len = nav.w, u = rib.u;

  // the nav becomes the strip (pixel-identical) the moment he grabs it
  if (b >= G + 0.6) { page.get('nav').look.vis = false; rib.vis = true; }
  u.uRad.value = nav.h * 0.9;
  u.uMaxA.value = lerp(1.1, 2.5, seg(b, grab, free));
  u.uFront.value = b < curl ? lerp(len + 10, len * 0.6, inOutCubic(seg(b, grab, curl))) : lerp(len * 0.6, -40, inCubic(seg(b, curl, free)));
  u.uSag.value = nav.h * 2.4 * smooth(seg(b, grab, curl));
  const path = smooth(seg(b, free - 0.5, free + 1.5));
  u.uPath.value = path;
  u.uTwist.value = 0.6 * path;
  u.uWide.value = lerp(1, 1.7, path);
  const s = 0.35 + Math.max(0, b - free) * 0.16 + 0.05 * B * path;
  laySnake(c, s);
  route(c, s, head);

  // the camera lifts off the page and tilts; the void comes in round it
  const k = inOutCubic(seg(b, tilt0, tilt1));
  if (k > 0) {
    const d = flatDist(L.H), drift = Math.sin(B * 0.25) * 0.08 * seg(b, tilt1, tilt1 + 2);
    orbit(c, L.W / 2, L.H / 2 + lerp(0, L.H * 0.18, k), 0, d * lerp(1, 1.5, k), lerp(0, -0.42, k) + drift, lerp(0, 0.62, k));
    c.bg.copy(SHEET).lerp(INK, smooth(seg(b, tilt0 + 0.5, tilt0 + 2.5)));
    if (k > 0.5) c.theme = '#1b1714';
  }

  // blocks pop off the page as the ribbon's head goes over them
  const lift = smooth(seg(b, power, hold)) * (b < T.drop ? 1 : 0);
  for (const p of b < T.drop ? page.pieces : []) {
    if (p.b.parent || p.b.kind === 'sheet' || p.b.id === 'nav') continue;
    const d = Math.hypot(p.cx - head.x, p.cy - head.y), pop = path * Math.exp(-((d / (0.28 * L.W)) ** 2)) * (1 - lift);
    p.look.z += 46 * pop + 34 * lift;
    p.look.depth = Math.max(p.look.depth, 24 * pop + 22 * lift);
    p.look.rx += 0.3 * pop * Math.sign(p.cy - head.y || 1);
    if (lift > 0 && !frozen) { p.look.x += noise(t * 31 + p.cx) * 3 * lift; p.look.y += noise(t * 29 + p.cy) * 3 * lift; }
  }
  if (lift > 0) { page.get('cta').look.flash = Math.max(page.get('cta').look.flash, 0.35 * lift * (0.5 + 0.5 * Math.sin(t * 20))); }

  // him: up to the nav, hanging off the curl, then riding the ribbon
  if (b < grab) {
    const a = seg(b, G, grab), from = [h2.x + h2.w * 0.5, h2.y], to = rib.peelAt(len * 0.86, -nav.h / 2);
    const x = lerp(from[0], to.x, a), y = lerp(from[1], to.y + face * 2.9, a) - Math.sin(a * Math.PI) * face * 1.2;
    c.boy.set(a < 0.15 ? 'leap_0' : 'leap_3', x, y, 0.6 + to.z * a, face, { flip: false });
  } else if (b < free + 0.4) {
    const end = rib.peelAt(len * 0.86, -nav.h / 2);
    c.boy.set(`swing_${frame(B, 4, 1.5)}`, end.x, end.y, end.z + 1, face, { top: true, rot: 0.16 * Math.sin((B * Math.PI) / 2) });
  } else {
    routeAt(P, 0.88, near);
    const key = b >= power ? `powerup_${frame(B, 3, 2)}` : `ride_${frame(B, 4, 1)}`;
    const air = 1 - smooth(seg(b, free + 0.4, free + 1.6));
    c.boy.set(key, near.x, near.y - nav.h * 0.45 - air * face * 1.5, near.z + 4, face * (b >= power ? 1.15 : 1), { bill: true, flip: Math.cos(1.9 * s + 0.4) < 0 });
  }

  // the held breath before the drop
  if (frozen) {
    const x = seg(b, hold, T.drop);
    c.cam.z -= (c.cam.z - c.cam.tz) * 0.1 * x;
    c.post.u.uVig.value = 0.6 * x;
  }
  if (b >= G + 0.6 && b < grab + 0.6) c.cam.shake = Math.max(c.cam.shake, 4 * hit(b - grab, 6));
}
