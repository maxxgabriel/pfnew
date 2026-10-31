import * as THREE from 'three';
import type { Ctx } from '../director';
import { beatsOf, clamp, frame, hit, lerp, outQuart, ring, seg, smooth } from '../math';
import { RED, shared } from '../page';
import { T } from '../timeline';

/*
 * SNAP — he snaps, and the page keeps time. The beat runs on the clock, so the page dances on its own
 * while you watch; the scroll decides who has joined in, a new part every bar: the kick (everything
 * thumps), the headlines stepping side to side, the copy lines jumping like a level meter, the nav
 * ticking like hi-hats, the media box and the cards on the backbeat. He listens, hops up the buttons
 * onto the second headline and moonwalks along it, then looks up at the nav.
 */
const rnd = (n: number) => { const s = Math.sin(n * 91.7) * 43758.5; return s - Math.floor(s); };
const GREY = new THREE.Color('#8c8c95');

export function snap(c: Ctx) {
  const { b, t, L, page } = c;
  if (b < T.land + 3.2) return;
  const B = beatsOf(t), n = Math.floor(B), ph = B - n;
  const S = T.snap, end = 1 - seg(b, T.peel - 0.5, T.peel + 1);
  const on = (a: number) => smooth(seg(b, a, a + 1.5)) * end;
  const kick = hit(ph, 7);
  const cta = L.get('cta'), cta2 = L.get('cta2'), h2 = L.get('head2');
  const top = page.pieces.filter((p) => !p.b.parent && p.b.kind !== 'sheet');
  const P = (id: string) => page.get(id);
  const face = L.face;

  // ---- the boy ----
  const ctaP = P('cta'), cta2P = P('cta2'), h2P = P('head2');
  const onCta = () => [cta.x + cta.w / 2 + ctaP.look.x, cta.y + ctaP.look.y];
  if (b < S + 3.5) {
    const [x, y] = onCta();
    const key = b < S ? 'still_0' : b < S + 0.6 ? 'snap_0' : b < S + 2 ? 'snap_1' : 'still_0';
    const groove = on(S + 2);
    c.boy.set(key, x, y - 5 * kick * groove, 0.6, face, { sy: 1 - 0.05 * kick * groove, flip: key.startsWith('snap') ? false : x < L.W / 2 });
  } else if (b < S + 7.3) {
    // two hops: onto the second button, then up onto the second headline
    const hop1 = seg(b, S + 3.5, S + 4.5), hop2 = seg(b, S + 5.8, S + 7);
    const a = onCta(), m = [cta2.x + cta2.w / 2 + cta2P.look.x, cta2.y + cta2P.look.y], z = [h2.x + h2.w * 0.3 + h2P.look.x, h2.y + h2P.look.y];
    const [p0, p1, u] = b < S + 5.2 ? [a, m, hop1] : [m, z, hop2];
    const x = lerp(p0[0], p1[0], u), y = lerp(p0[1], p1[1], u) - Math.sin(u * Math.PI) * face * (b < S + 5.2 ? 1.4 : 2.2);
    const air = u > 0.02 && u < 0.98;
    const land = b < S + 5.2 ? b - (S + 4.5) : b - (S + 7);
    const key = air ? (u < 0.5 ? 'leap_2' : 'fall_0') : land >= 0 && land < 0.5 ? 'hero_1' : 'still_0';
    c.boy.set(key, x, y, 0.6, face, { flip: p1[0] < p0[0], sy: land >= 0 && land < 0.5 ? 0.9 + 0.1 * outQuart(land / 0.5) : 1 - 0.04 * kick });
    if (land >= 0 && land < 1) (b < S + 5.2 ? cta2P : h2P).look.y += 5 * hit(land, 6);
  } else if (b < T.peel - 3) {
    // the moonwalk, on the clock: he slides back and forth along the headline while his feet walk the other way
    const k = smooth(seg(b, S + 7.3, S + 8.8));
    const sway = Math.sin((B * Math.PI) / 4), vel = Math.cos((B * Math.PI) / 4);
    const x = h2.x + h2.w * lerp(0.3, 0.5 + 0.32 * sway, k) + h2P.look.x;
    c.boy.set(`moonwalk6_${frame(B, 6, 2)}`, x, h2.y + h2P.look.y, 0.6, face, { flip: vel * k > 0, sy: 1 - 0.03 * kick });
  } else {
    const x = h2.x + h2.w * 0.5 + h2P.look.x;
    const key = b < T.peel - 0.7 ? 'still_3' : 'leap_0';
    c.boy.set(key, x, h2.y + h2P.look.y, 0.6, face, { flip: false });
  }

  // ---- the snap: a red ring off his fingers, the page jumps, the shimmer whips across once ----
  const sx = b - (S + 0.6);
  if (sx >= 0 && sx < 1.6) {
    const [x, y] = onCta();
    const hx = x + face * 0.62, hy = y - face * 2.25;
    const u = sx / 1.4;
    c.fx.a.ring(hx, hy, 2, outQuart(clamp(u)) * Math.max(L.W, L.H) * 0.95, 2 + 7 * (1 - clamp(u)), RED, 1 - clamp(u));
    for (const p of top) {
      const d = Math.hypot(p.cx - hx, p.cy - hy), v = ring(sx - d / 1600, 14, 4.5);
      p.look.y -= 14 * v;
    }
    shared.uShimX.value = -400 + (sx / 0.8) * (L.W + 800) - 0.4 * (L.H / 2 + c.scroll);
    for (const p of page.pieces) p.look.shim = Math.max(p.look.shim, 0.85 * (1 - clamp(sx / 0.9)));
  }

  // ---- the groove: each layer joins on the scroll and plays on the clock ----
  const k1 = on(S + 1), k2 = on(S + 4), k3 = on(S + 7), k4 = on(S + 10), k5 = on(S + 13);
  const build = smooth(seg(b, S + 15, T.peel)) * end;
  const kick8 = hit((B * 2) % 1, 9);
  const thump = lerp(kick, Math.max(kick, kick8), build) * (1 + build);
  for (const p of top) p.look.s *= 1 + 0.03 * thump * k1;
  ctaP.look.flash = Math.max(ctaP.look.flash, 0.25 * kick * k1);

  // headlines step left and right on every beat, the badge rocks
  const dir = n % 2 ? 1 : -1, pos = lerp(-dir, dir, outQuart(clamp(ph * 3.5)));
  P('head1').look.x += pos * L.W * 0.055 * k2;
  h2P.look.x -= pos * L.W * 0.055 * k2;
  P('badge').look.rz += 0.07 * pos * k2;

  // copy lines: a level meter, new levels every eighth
  for (let i = 0; i < 3; i++) {
    const p = page.byId.get(`line${i}`);
    if (!p) continue;
    const lvl = 0.3 + 0.7 * rnd(Math.floor(B * 2) * 7 + i * 13), dec = 1 - 0.35 * ((B * 2) % 1);
    p.look.sx *= lerp(1, lvl * dec, k3);
  }

  // the nav: hi-hats on the burger / links, the logo on the kick, a step sequencer across the links
  page.byId.get('logo')!.look.s *= 1 + 0.2 * kick * k4;
  for (let i = 0; i < 4; i++) {
    const p = page.byId.get(`burger${i}`) ?? page.byId.get(`link${i}`);
    if (!p) continue;
    p.look.sx *= 1 - 0.35 * hit((B * 2 + i * 0.5) % 1, 9) * k4;
    if (p.b.id.startsWith('link') && n % 4 === i) {
      const g = hit(ph, 3) * k4;
      p.look.color = p.front.clone().lerp(GREY, g);
    }
  }

  // the backbeat: media box and cards
  const ml = page.media.look;
  ml.s *= 1 + 0.012 * thump * k5;
  if (b > T.land + 3) ml.strain = Math.max(ml.strain, 0.55 + 0.35 * kick * k5);
  for (let i = 0; i < 3; i++) if (n % 2 === 1) P(`card${i}`).look.y -= 14 * hit(ph, 8) * k5;

  // the build: kicks on the eighths, the camera swings round the page and leans in
  if (build > 0) {
    const sw = Math.sin((B * Math.PI) / 2);
    c.cam.x += sw * L.W * 0.05 * build;
    c.cam.z *= 1 - 0.07 * build;
    c.cam.roll += sw * 0.02 * build;
  }
}
