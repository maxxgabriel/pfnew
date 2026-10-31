import { flat, type Ctx } from '../director';
import { beatsOf, bez, clamp, hit, inOutCubic, lerp, noise, outQuad, outSine, ring, seg, smooth } from '../math';
import { PAPER, RED, shared } from '../page';
import { T } from '../timeline';

/*
 * LOAD → KNOCK → PUSH → RIP → OUT. A grey template site, still loading. It scrolls like any page until
 * the media box is in the middle, then it won't scroll any more: something behind the box knocks. The
 * skin bulges like rubber (twice more, and on its own while you wait), then a fist pushes until the X
 * seams split and the four flaps burst open. An eye looks out of the dark. He leaps out over the camera
 * and lands on the call-to-action, which turns red: the first colour on the page. The landing ripples
 * through every block.
 */
/** a knock from behind: snaps out, recoils, settles (x in beats since the knock) */
const knock = (x: number) => (x < 0 ? 0 : x < 0.1 ? outQuad(x / 0.1) : Math.exp(-(x - 0.1) * 4.5) * Math.cos((x - 0.1) * 11));
type K = [number, number, number, number];

export function opening(c: Ctx) {
  const { b, t, L, page } = c;
  const m = page.media, ml = m.look, w = m.w, h = m.h, mn = Math.min(w, h);
  const mb = L.get('media'), cta = L.get('cta');
  const mx = mb.x + w / 2, my = mb.y + h / 2, cx = cta.x + cta.w / 2;

  // the scroll: a normal page at first, then locked on the box; then the camera follows him back up
  const s = b < T.pin ? L.mediaScroll * outSine(b / T.pin)
    : b < T.jump + 0.4 ? L.mediaScroll
      : lerp(L.mediaScroll, 0, inOutCubic(seg(b, T.jump + 0.4, T.land - 0.3)));
  flat(c, s);

  // the skeleton shimmer: loading, loading… until the page gets stuck
  const live = 1 - seg(b, T.pin - 0.5, T.k1);
  shared.uShimX.value = -350 + ((beatsOf(t) / 3) % 1) * (L.W + 700) - 0.4 * (L.H / 2 + s);
  for (const p of page.pieces) p.look.shim = 0.6 * live;

  // knocks: three on the scroll, and knock-knock on the clock while you wait in front of the box
  const ks: K[] = [];
  let energy = 0;
  if (b < T.rip) {
    for (const [kb, fx, fy, a] of [[T.k1, -0.22, -0.06, 0.24], [T.k2, 0.21, 0.07, 0.3], [T.k3, -0.04, 0.03, 0.36]]) {
      const v = knock(b - kb);
      if (v) { ks.push([fx * w, fy * h, v * a * mn, mn * 0.62]); energy += Math.max(0, v); }
    }
    const zone = seg(b, T.pin - 0.5, T.pin + 0.5) * (1 - seg(b, T.push - 1, T.push)) * c.idle;
    if (zone > 0) {
      const P = 2.4, n = Math.floor(t / P), kt = beatsOf(t - n * P);
      const fx = [-0.2, 0.18, 0.02, -0.1, 0.24][n % 5], fy = [0.04, -0.06, 0.08, -0.02, 0][n % 5];
      for (const [d, a] of [[0, 0.17], [0.5, 0.23]]) {
        const v = knock(kt - d) * zone;
        if (v) { ks.push([fx * w + d * 24, fy * h, v * a * mn, mn * 0.56]); energy += Math.max(0, v); }
      }
    }
    if (b >= T.push) {
      const u = seg(b, T.push, T.rip);
      ks.push([0, 0.04 * h, mn * 0.62 * u ** 0.8 + Math.sin(t * 38) * 4 * u, mn * (0.66 + 0.12 * u)]);
      energy += 0.3 + u;
      ml.strain = u;
      ml.gap = seg(b, T.rip - 0.7, T.rip) * 6;
    }
  }
  ml.knocks = ks.sort((a, z) => Math.abs(z[2]) - Math.abs(a[2])).slice(0, 3);
  // everything rattles a little with each knock
  if (energy > 0.01) {
    page.pieces.forEach((p, i) => { if (p.b.kind !== 'sheet' && !p.b.parent) { p.look.x += noise(t * 41 + i * 7.3) * 0.9 * energy; p.look.y += noise(t * 43 + i * 3.1) * 1.3 * energy; } });
    ml.s = 1 + 0.006 * energy;
  }

  // RIP: the flaps burst open, overshoot, and hang; once he's out they swing shut behind him
  if (b >= T.rip) {
    // top stands up out of the page (it would cover the button), the rest fold flat outwards
    const x = b - T.rip, amp = [1.86, 2.86, 2.74, 2.7], dl = [0, 0.05, 0.1, 0.07];
    const shut = seg(b, T.land + 1.3, T.land + 2.1), slam = b - T.land - 2.1;
    for (let i = 0; i < 4; i++) {
      const u = x - dl[i];
      const open = u <= 0 ? 0 : amp[i] * (1 - Math.exp(-u * 5.5) * Math.cos(u * 8)) + Math.sin(t * 1.4 + i * 1.7) * 0.035 * seg(x, 1, 2);
      ml.open[i] = open * (1 - shut * shut) + 0.2 * Math.max(0, ring(slam - i * 0.04, 13, 5));
    }
    ml.strain = Math.max(ml.strain, 0.55 * shut);
    if (slam > 0) c.cam.shake = Math.max(c.cam.shake, 5 * hit(slam, 6));
    ml.flash = 0.9 * hit(x, 9);
    impact(c, x, PAPER, 0.16);
    c.cam.shake = Math.max(c.cam.shake, 12 * hit(x, 4));
  }

  // the eye in the dark
  if (b >= T.peek && b < T.jump - 0.1) {
    const look = -smooth(seg(b, 14.6, 15)) + 2 * smooth(seg(b, 15.6, 16)) - smooth(seg(b, 16.5, 16.8));
    const lunge = smooth(seg(b, 16.5, 16.8)) - smooth(seg(b, 16.95, 17.3));
    const z = m.rest.z - m.depth * lerp(0.62, 0.22, lunge) - m.depth * 0.3 * seg(b, 16.95, 17.35);
    c.eye.set('closeup_0', mx + look * w * 0.11, my + h * 0.04, z, (w * 1.02 * 756) / 864, { mid: true, soft: 0.55, ink: Math.max(1 - seg(b, T.peek, T.peek + 0.8), seg(b, 16.95, 17.35)) });
  }

  // OUT: crouch in the well, launch, over the camera, down onto the button
  if (b >= T.jump - 0.6 && b < T.land) {
    const u = seg(b, T.jump, T.land);
    const P0 = [mx, my + h * 0.3, m.rest.z - m.depth * 0.45], P2 = [cx, cta.y, 0.6];
    const P1 = [lerp(P0[0], P2[0], 0.5) + w * 0.08, Math.min(P0[1], P2[1]) - L.H * 0.26, 520];
    const at = (i: number) => bez(P0[i], P1[i], P2[i], u);
    if (b < T.jump) c.boy.set('leap_0', P0[0], P0[1], P0[2], L.face, { ink: 1 - seg(b, T.jump - 0.6, T.jump), sy: 1 - 0.08 * seg(b, T.jump - 0.6, T.jump) });
    else {
      const key = u < 0.2 ? 'leap_2' : u < 0.36 ? 'leap_3' : u < 0.62 ? 'fall_2' : 'fall_0';
      c.boy.set(key, at(0), at(1), at(2), L.face, { flip: P2[0] < P0[0], rot: key === 'fall_2' ? -0.25 + u * 0.4 : 0, sy: key === 'leap_2' ? 1.08 : 1 });
    }
  }

  // landing: the button goes down and turns red; a ripple runs through the whole page
  if (b >= T.land) {
    const x = b - T.land, ctaP = page.get('cta');
    ctaP.look.color = RED;
    const press = 7 * hit(x, 6);
    ctaP.look.y += press; ctaP.look.sy = 1 - 0.14 * hit(x, 7);
    const key = x < 0.45 ? 'hero_0' : x < 1.3 ? 'hero_1' : 'hero_3';
    const breathe = x > 1.6 ? 1 + 0.012 * Math.sin(t * 3.2) : 1;
    c.boy.set(key, cx, cta.y + press, 0.6, L.face, { sy: (x < 0.45 ? 0.88 + 0.12 * outQuad(x / 0.45) : 1) * breathe, flip: cx < mx });
    const cy = cta.y + cta.h / 2;
    for (const p of page.pieces) {
      if (p.b.parent || p.b.kind === 'sheet' || p === ctaP) continue;
      const d = Math.hypot(p.cx - cx, p.cy - cy), v = ring(x - d / 1400, 16, 5) * clamp(1 - d / 2200);
      p.look.y -= 10 * v; p.look.s *= 1 + 0.035 * v;
    }
    const dm = Math.hypot(mx - cx, my - cy);
    ml.y -= 8 * ring(x - dm / 1400, 16, 5);
    impact(c, x, RED, 0.2);
    c.cam.shake = Math.max(c.cam.shake, 14 * hit(x, 5));
  }
}

/** an impact frame: the picture slammed to ink and one colour for a moment */
export function impact(c: Ctx, x: number, col: typeof RED, len: number) {
  if (x < 0 || x > len + 0.15) return;
  const k = x < len ? 1 : 1 - (x - len) / 0.15;
  const u = c.post.u;
  u.uImpact.value = Math.max(u.uImpact.value, c.calm ? 0.25 * k : k);
  u.uImpB.value.copy(col);
  u.uChroma.value = Math.max(u.uChroma.value, 9 * k);
}
