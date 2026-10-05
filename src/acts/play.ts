import { drawBlot, type BlotPose } from '../core/blot';
import type { Frame } from '../core/frame';
import { TAU, clamp, ease, hash, lerp, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';

/*
 * PLAY (INK v5, beat 2, "delight"), in the `play` hold.
 *
 * The night has just taken the sheet. Out of the ground climb the ink
 * spirits: Blot's kin, little drops of pale ink with eyes. They hop after the
 * finger and jump for it when it's high; tap one and it bursts into droplets
 * and pulls itself back together; a swipe blows the petals about. When the
 * blades start to hum (the end of the hold) they gasp and dive back into the
 * ground, and the duel begins.
 *
 * The spirits are a little physics toy run on the wall clock; the hold's
 * progress only decides when they come out and when they hide.
 */

interface Spirit { x: number; y: number; vx: number; vy: number; s: number; seed: number; off: number; burst: number; land: number }
interface Drop { x: number; y: number; vx: number; vy: number; r: number; owner: number }
interface Petal { x: number; y: number; vx: number; vy: number; rot: number; spin: number; s: number }

let spirits: Spirit[] = [];
let drops: Drop[] = [];
let petals: Petal[] = [];
let size = '';
let finger: { x: number; y: number; vx: number; vy: number; t: number } | null = null;
let lastT = 0;

const BODY = '#e9e2cf';

/** the finger moved over the film (screen px) */
export function playFinger(x: number, y: number, t: number) {
  if (finger) {
    const dt = Math.max(0.008, t - finger.t);
    finger = { x, y, vx: (x - finger.x) / dt, vy: (y - finger.y) / dt, t };
  } else finger = { x, y, vx: 0, vy: 0, t };
}
export function playFingerUp() {
  if (finger) finger = { ...finger, vx: 0, vy: 0 };
}

/** a tap: the spirit under it bursts */
export function playTap(x: number, y: number, t: number) {
  for (const [i, sp] of spirits.entries()) {
    if (sp.burst > 0 && t - sp.burst < 1.2) continue;
    if (Math.hypot(x - sp.x, y - (sp.y - sp.s * 0.45)) < sp.s * 0.7) {
      sp.burst = t;
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * TAU + hash(k + i) * 0.5;
        const v = sp.s * (5 + hash(k * 3 + i) * 5);
        drops.push({ x: sp.x, y: sp.y - sp.s * 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp.s * 4, r: sp.s * (0.07 + hash(k) * 0.08), owner: i });
      }
      return;
    }
  }
}

function setup(w: number, h: number) {
  const key = `${w}x${h}`;
  if (key === size) return;
  size = key;
  const S = Math.min(w, h);
  spirits = Array.from({ length: 6 }, (_, i) => ({
    x: w * (0.12 + i * 0.15), y: h * 0.83, vx: 0, vy: 0,
    s: S * (0.12 + hash(i * 2.3) * 0.07), seed: i + 2, off: (i - 2.5) * S * 0.13, burst: -9, land: 0,
  }));
  petals = Array.from({ length: 36 }, (_, i) => ({
    x: hash(i * 1.7) * w, y: hash(i * 4.1) * h, vx: 0, vy: 0, rot: hash(i) * TAU, spin: (hash(i * 9) - 0.5) * 2, s: S * (0.01 + hash(i * 5) * 0.012),
  }));
}

export function drawPlay(f: Frame, p: number) {
  const { ctx, w, h, t } = f;
  setup(w, h);
  const S = Math.min(w, h);
  const dt = clamp(t - lastT, 0, 0.05);
  lastT = t;
  const ground = h * 0.83;
  const out = ease.outBack(seg(p, 0.02, 0.16), 1.6); // climbing out of the ground
  const hide = ease.in2(seg(p, 0.86, 0.98)); // diving back in
  const scared = seg(p, 0.78, 0.86) > 0;
  const live = finger && t - finger.t < 2.5 ? finger : null;

  // ---- petals: drift down, blown about by the finger
  ctx.save();
  ctx.fillStyle = '#e8b9c0';
  for (const pt of petals) {
    if (live) {
      const dx = pt.x - live.x, dy = pt.y - live.y, d = Math.hypot(dx, dy);
      if (d < S * 0.25) {
        const k = (1 - d / (S * 0.25)) * 0.12;
        pt.vx += live.vx * k * dt * 6;
        pt.vy += live.vy * k * dt * 6;
      }
    }
    pt.vx = lerp(pt.vx, Math.sin(t * 0.7 + pt.rot) * S * 0.04, dt * 1.5);
    pt.vy = lerp(pt.vy, S * 0.05, dt * 1.5);
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.rot += pt.spin * dt * (1 + Math.abs(pt.vx) / S);
    if (pt.y > h + 10) { pt.y = -10; pt.x = hash(pt.x + t) * w; }
    if (pt.x < -20) pt.x = w + 10;
    if (pt.x > w + 20) pt.x = -10;
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.rot);
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, pt.s, pt.s * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // ---- the spirits
  spirits.forEach((sp, i) => {
    // where it wants to be: under the finger (spread out), or wandering about
    const wander = w * (0.5 + 0.38 * Math.sin(t * 0.35 + i * 1.9));
    const tx = live ? live.x + sp.off : wander;
    const ax = (tx - sp.x) * 9 - sp.vx * 4.5;
    sp.vx += ax * dt;
    sp.x += sp.vx * dt;
    sp.x = clamp(sp.x, sp.s * 0.5, w - sp.s * 0.5);
    // hopping: on the ground they hop when moving; a finger held high makes them jump for it
    const onGround = sp.y >= ground - 0.5;
    if (onGround) {
      sp.y = ground;
      sp.vy = 0;
      const moving = Math.abs(sp.vx) > S * 0.15;
      const reach = live && live.y < ground - sp.s && Math.abs(live.x + sp.off - sp.x) < S * 0.25;
      if (!scared && out >= 1 && hide <= 0 && (moving || reach) && t - sp.land > 0.12 + hash(i + Math.floor(t)) * 0.2) {
        const jump = reach ? Math.min(S * 3.2, Math.sqrt(2 * S * 9 * Math.max(0, ground - live!.y)) ) : S * (0.9 + hash(i * 7) * 0.5);
        sp.vy = -jump;
      }
    } else {
      sp.vy += S * 9 * dt;
      sp.y += sp.vy * dt;
      if (sp.y >= ground) sp.land = t;
    }
    if (!onGround || sp.y < ground) sp.y = Math.min(sp.y, ground);

    // drawn
    const since = t - sp.burst;
    const burst = since >= 0 && since < 0.9;
    const reform = burst ? ease.outBack(seg(since, 0.45, 0.9), 2) : 1;
    if (burst && reform <= 0.02) return;
    const squash = clamp(1 - (t - sp.land) / 0.18, 0, 1) * 0.6;
    const sink = (1 - out) + hide;
    const pose: BlotPose = scared ? 'shock' : burst ? 'fall' : !onGround ? 'cheer' : Math.abs(sp.vx) > S * 0.3 ? 'idle' : i % 3 === 0 ? 'wave' : 'idle';
    const look: [number, number] = scared ? [i % 2 ? w * 1.2 : -w * 0.2, h * 0.6] : live ? [live.x, live.y] : [w * 0.5, h * 0.4];
    ctx.save();
    // a soft moonlit glow under each one, so pale ink reads on the night
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18 * (1 - sink);
    drawSprite(ctx, glow('#cfe0ff', 64), sp.x, sp.y - sp.s * 0.4, sp.s * 2.2);
    ctx.restore();
    // sinking into the ground: clip at the ground line
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, ground + 1);
    ctx.clip();
    drawBlot(ctx, sp.x, sp.y + sink * sp.s * 1.05, sp.s * reform, { t, pose, look, seed: sp.seed, body: BODY, eye: '#ffffff', squash, wind: clamp(-sp.vx / (S * 2), -1, 1), rot: clamp(sp.vx / (S * 6), -0.3, 0.3) });
    ctx.restore();
    // the ink pool it climbs out of / dives into
    const pool = Math.max(seg(p, 0.0, 0.08) * (1 - seg(p, 0.16, 0.24)), seg(p, 0.84, 0.9) * (1 - seg(p, 0.97, 1)));
    if (pool > 0) {
      ctx.fillStyle = `rgba(233,226,207,${0.5 * pool})`;
      ctx.beginPath();
      ctx.ellipse(sp.x, ground + 2, sp.s * 0.55 * pool, sp.s * 0.12 * pool, 0, 0, TAU);
      ctx.fill();
    }
  });

  // ---- droplets from a burst spirit: fly out, then are pulled home
  ctx.fillStyle = BODY;
  for (let k = drops.length - 1; k >= 0; k--) {
    const d = drops[k];
    const sp = spirits[d.owner];
    const since = t - sp.burst;
    if (since > 0.45) {
      // pulled back to the body
      d.vx += (sp.x - d.x) * 60 * dt;
      d.vy += (sp.y - sp.s * 0.4 - d.y) * 60 * dt;
      d.vx *= 0.85;
      d.vy *= 0.85;
    } else d.vy += S * 9 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (since > 0.9) {
      drops.splice(k, 1);
      continue;
    }
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, TAU);
    ctx.fill();
  }
}
