import type { Frame } from '../core/frame';
import { clamp, seg, TAU } from '../core/math';
import { bgImage, drawBgXY, drawLayer, drawStrip } from './bg';

/** Round 34: all animation is sampled from local film beat + ambient clock.
 * No event history: seeks, seam renders and storyboard thumbnails are safe. */
export const WORLD = { farSpeed: 5, nearSpeed: 17, roll: 0.009, wind: 0.004,
  inkAlpha: 0.23, glowAlpha: 0.16, block: 48, reactionLength: 0.7 };
type Act = 'Still' | 'Run' | 'Wave' | 'Light' | 'Chase' | 'Home';
interface Options {
  camera?: number;
  ground?: number;
  reveal?: number;
  eraser?: number;
  heal?: number;
  impacts?: readonly number[];
  impactX?: number;
  impactY?: number;
  scorch?: number;
  panX?: number;
  panY?: number;
}

// Small shared light textures: one draw per light, no live shadow blur/filter.
const pools = new Map<string, HTMLCanvasElement>();
export function worldGlow(ctx: CanvasRenderingContext2D, x: number, y: number,
  radius: number, alpha = WORLD.glowAlpha, color = '#ffb065', aspect = 1) {
  if (alpha <= 0 || radius <= 0) return;
  let c = pools.get(color);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, color); grad.addColorStop(1, `${color}00`);
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128); pools.set(color, c);
  }
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= alpha;
  ctx.drawImage(c, x - radius, y - radius * aspect, radius * 2, radius * aspect * 2);
  ctx.restore();
}

// Static cover plates cached in CSS pixels, bounded to the current size per art.
const plates = new Map<string, { c: HTMLCanvasElement; im: HTMLImageElement; key: string }>();
function plate(f: Frame, name: string, fallback: string, px = 0.5, py = 0.5, zoom = 1) {
  const chosen = bgImage(name) ? name : fallback;
  const im = bgImage(chosen);
  if (!im) return;
  if (px !== 0.5 || py !== 0.5) { drawBgXY(f.ctx, chosen, f.w, f.h, px, py, 1, zoom); return; }
  const key = `${f.w}:${f.h}:${zoom}`;
  let p = plates.get(name);
  if (!p || p.key !== key || p.im !== im) {
    const c = document.createElement('canvas'); c.width = Math.ceil(f.w); c.height = Math.ceil(f.h);
    drawBgXY(c.getContext('2d')!, chosen, f.w, f.h, px, py, 1, zoom);
    p = { c, im, key }; plates.set(name, p);
  }
  f.ctx.drawImage(p.c, 0, 0, f.w, f.h);
}
function pulse(L: number, at: number, duration = WORLD.reactionLength) {
  const q = (L - at) / duration;
  return q >= 0 && q < 1 ? Math.sin(Math.PI * Math.sqrt(q)) * (1 - q) : 0;
}

/** Background only. Call under the chapter's existing camera and before its drawing. */
function paintWorld(f: Frame, act: Act, L: number, o: Options) {
  const { ctx, w, h } = f;
  const t = f.t * (f.reduced ? 0.18 : 1), wind = f.reduced ? 0 : Math.sin(t * 0.7) * WORLD.wind;
  const camera = o.camera ?? L * w * 0.12;
  const impact = Math.max(0, ...(o.impacts ?? []).map(at => pulse(L, at)));
  const ix = o.impactX ?? w * 0.5, iy = o.impactY ?? h * 0.72;
  ctx.save();
  if (act === 'Still' || act === 'Home' || act === 'Run') {
    const pixel = act === 'Run', reveal = clamp(o.reveal ?? seg(L, 0, 1.4));
    ctx.save(); ctx.beginPath();
    if (pixel) {
      // A single advancing stepped edge, not a field of animated particles.
      const b = WORLD.block;
      for (let y = 0; y < h; y += b) {
        const edge = Math.ceil((reveal * (w + b * 2) - (Math.floor(y / b) % 3) * b) / b) * b;
        ctx.rect(0, y, Math.max(0, edge), b);
      }
    } else {
      ctx.moveTo(0, 0);
      for (let i = 0; i <= 20; i++) ctx.lineTo(reveal * (w + 24) + Math.sin(i * 2.3) * 12 - 12, i * h / 20);
      ctx.lineTo(0, h); ctx.closePath();
    }
    ctx.clip();
    ctx.imageSmoothingEnabled = !pixel;
    if (pixel) {
      ctx.save(); ctx.globalAlpha *= seg(L, 0, 0.55) * 0.7;
      plate(f, 'px_sky', ''); ctx.restore();
    }
    const a = pixel ? 0.75 : WORLD.inkAlpha;
    const ground = o.ground ?? h * 0.7;
    drawStrip(ctx, pixel ? 'px_far' : 'ink_far', w, h, 0.44, -camera * 0.13 - t * WORLD.farSpeed, ground - h * 0.46, a);
    ctx.save(); ctx.transform(1, 0, pixel ? 0 : wind, 1, pixel ? 0 : -wind * ground, 0);
    drawStrip(ctx, pixel ? 'px_mid' : 'ink_mid', w, h, 0.34, -camera * 0.3 - t * WORLD.nearSpeed, ground - h * 0.31, a);
    ctx.restore(); ctx.restore();
    if (o.eraser !== undefined) {
      const heal = 1 - clamp(o.heal ?? 0);
      ctx.save(); ctx.globalAlpha *= heal * 0.87; ctx.fillStyle = '#efe9dc';
      if (pixel) {
        const b = WORLD.block, edge = Math.floor(o.eraser / b) * b;
        for (let y = Math.floor(h * 0.25 / b) * b; y < h * 0.75; y += b) {
          const blink = f.reduced ? 0 : Math.floor(L * 8 + y / b) % 2;
          ctx.fillRect(0, y, Math.max(0, edge - blink * b), b);
        }
      } else {
        ctx.beginPath(); ctx.ellipse(o.eraser + w * 0.5, h * 0.52, w * 0.5, h * 0.25, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  } else if (act === 'Wave') {
    plate(f, 'wc_sky', 'bg_inksea', o.panX, o.panY, 1.35);
    drawStrip(ctx, 'wc_cloud', w, h, 0.3, -camera * 0.08 - t * WORLD.farSpeed, h * 0.12, 0.7);
    const roll = (v: number) => Math.sin(v * 7 + L * 2 + t * 0.8) * w * WORLD.roll * (f.reduced ? 0.2 : 1);
    drawStrip(ctx, 'wc_sea_far', w, h, 0.38, -camera * 0.22 - t * 9, h * 0.48, 1, roll);
    const y = h * (0.66 + (f.reduced ? 0 : Math.sin(t * 1.2 + L) * 0.008) - impact * 0.055);
    if (!drawStrip(ctx, 'wc_sea_near', w, h, 0.4, -camera * 0.5 - t * WORLD.nearSpeed, y, 1, roll))
      drawLayer(ctx, 'fg_inksea', w, h, Math.sin(L) * w * 0.12, h * 0.1 - impact * h * 0.05, 0.8, 1.3);
    const lightning = !f.reduced ? pulse(L, 2.12, 0.22) : 0;
    if (lightning > 0) {
      worldGlow(ctx, w * 0.72, h * 0.24, w * 0.8, lightning * 0.4, '#c4ddff');
      ctx.save(); ctx.globalAlpha *= lightning * 0.7; ctx.strokeStyle = '#dfedff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w * 0.72, h * 0.22); ctx.lineTo(w * 0.67, h * 0.36);
      ctx.lineTo(w * 0.71, h * 0.35); ctx.lineTo(w * 0.64, h * 0.53); ctx.stroke(); ctx.restore();
    }
  } else if (act === 'Light') {
    plate(f, 'cm_space', 'bg_space');
    const earth = bgImage('cm_space') ? bgImage('cm_earth') : null;
    if (earth) {
      const r = Math.min(w * 0.22, h * 0.18), x = w * 0.73, y = h * 0.26;
      worldGlow(ctx, x, y, r * 1.2, 0.16 + Math.sin(t * 0.5) * 0.025, '#8fcaff');
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip(); ctx.translate(x, y); ctx.rotate(L * 0.012 + t * 0.008);
      ctx.drawImage(earth, -r, -r, r * 2, r * 2); ctx.restore();
    }
    ctx.fillStyle = '#777a80'; ctx.beginPath(); ctx.moveTo(0, h * 0.78);
    ctx.quadraticCurveTo(w * 0.5, h * 0.6, w, h * 0.78); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    const moon = bgImage('cm_moon') ?? bgImage('fg_moon');
    if (moon) ctx.drawImage(moon, 0, 0, w, h);
    if (impact > 0) {
      const past = (o.impacts ?? []).filter(at => at <= L);
      const last = past.at(-1) ?? L, age = seg(L, last, last + WORLD.reactionLength);
      worldGlow(ctx, ix + age * w * 0.03, iy + age * h * 0.04,
        Math.min(w, h) * (0.12 + age * 0.3), impact * 0.28, '#ccc4b8', 0.3);
      if (!f.reduced) {
        worldGlow(ctx, ix, iy, Math.max(w, h) * 0.55, pulse(L, last, 0.16) * 0.55,
          past.length % 2 ? '#76bdff' : '#ff746e', 0.45);
      }
    }
  } else {
    plate(f, 'hs_sky', 'bg_sunset', 0.5, o.panY ?? 0.5, 1.18);
    const sun = bgImage('hs_sky') ? bgImage('hs_sun') : null, sx = w * 0.66, sy = h * 0.33;
    const r = Math.min(w * 0.25, h * 0.22);
    if (sun) {
      // Upper disc stays registered; just the lower edge shimmers in heat.
      ctx.drawImage(sun, 0, 0, sun.naturalWidth, sun.naturalHeight * 0.7, sx - r, sy - r, r * 2, r * 1.4);
      const sh = sun.naturalHeight * 0.3 / 6;
      for (let b = 0; b < 6; b++) {
        const dx = f.reduced ? 0 : Math.sin(t * 1.1 + b * 0.6) * r * 0.008 * b / 6;
        ctx.drawImage(sun, 0, sun.naturalHeight * 0.7 + sh * b, sun.naturalWidth, sh,
          sx - r + dx, sy + r * 0.4 + r * 0.1 * b, r * 2, r * 0.1 + 0.5);
      }
    }
    // One broad shaft; the same sun position also lights the cloud rims.
    ctx.save(); ctx.globalAlpha *= 0.065; ctx.fillStyle = '#ffe7b0';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(w * (0.08 + Math.sin(L) * 0.06), h); ctx.lineTo(w * 0.68, h); ctx.fill(); ctx.restore();
    ctx.save();
    if (impact > 0) {
      ctx.beginPath(); ctx.rect(0, 0, w, h);
      ctx.ellipse(ix, o.impactY ?? h * 0.45, Math.max(1, w * 0.22 * impact), Math.max(1, h * 0.14 * impact), 0, 0, TAU);
      ctx.clip('evenodd');
    }
    drawStrip(ctx, 'hs_cloud_far', w, h, 0.4, -camera * 0.15 - t * 7, h * 0.27 - impact * h * 0.04, 0.85);
    if (!drawStrip(ctx, 'hs_cloud_near', w, h, 0.5, -camera * 0.5 - t * 22, h * 0.53 + impact * h * 0.1, 1))
      drawLayer(ctx, 'fg_sunset', w, h, Math.sin(L * 0.9) * w * 0.12, h * 0.05, 1, 1.3);
    ctx.restore();
    worldGlow(ctx, sx, sy, r * 1.7, 0.12 + Math.sin(t * 0.6) * 0.018 + impact * (f.reduced ? 0.08 : 0.32), '#ffd187', 1.2);
  }
  if (o.scorch !== undefined) {
    const a = pulse(L, o.scorch, 1.5), q = seg(L, o.scorch, o.scorch + 1.5);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha *= a * 0.4; ctx.strokeStyle = '#774932'; ctx.lineWidth = 8 * (1 - q) + 1;
      ctx.beginPath(); ctx.ellipse(ix, iy, w * (0.08 + q * 0.22), h * (0.025 + q * 0.07), 0, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }
  ctx.restore();
}


let rippleLayer: HTMLCanvasElement | null = null;
/** One expanding annulus refracts the painted world at each existing paper slam.
 * Only the short reaction uses this scratch surface; normal frames draw directly. */
export function drawWorld(f: Frame, act: Act, L: number, o: Options = {}) {
  const at = (o.impacts ?? []).find(a => L > a && L < a + WORLD.reactionLength);
  if (f.reduced || (act !== 'Run' && act !== 'Home') || at === undefined) {
    paintWorld(f, act, L, o); return;
  }
  const { ctx, w, h } = f;
  const W = Math.ceil(w), H = Math.ceil(h);
  if (!rippleLayer) rippleLayer = document.createElement('canvas');
  if (rippleLayer.width !== W || rippleLayer.height !== H) { rippleLayer.width = W; rippleLayer.height = H; }
  const g = rippleLayer.getContext('2d')!;
  g.clearRect(0, 0, W, H);
  paintWorld({ ...f, ctx: g }, act, L, o);
  ctx.drawImage(rippleLayer, 0, 0, w, h);
  const q = seg(L, at, at + WORLD.reactionLength), strength = pulse(L, at);
  const x = o.impactX ?? w * 0.5, y = o.impactY ?? h * 0.72;
  const rx = Math.max(1, q * w * 0.8), ry = Math.max(1, q * h * 0.22);
  ctx.save(); ctx.beginPath();
  ctx.ellipse(x, y, rx + 6, ry + 3, 0, 0, TAU);
  ctx.ellipse(x, y, Math.max(0.1, rx - 6), Math.max(0.1, ry - 3), 0, 0, TAU);
  ctx.clip('evenodd');
  ctx.fillStyle = '#efe9dc'; ctx.fillRect(0, 0, w, h);
  ctx.translate(x, y); ctx.scale(1 + strength * 0.025, 1 + strength * 0.04); ctx.translate(-x, -y);
  ctx.drawImage(rippleLayer, 0, 0, w, h); ctx.restore();
}
