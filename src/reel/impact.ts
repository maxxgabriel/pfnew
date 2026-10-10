import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, hash, lerp, seg } from '../core/math';
import { drawSprite, glow } from '../core/sprites';
import { BLADE, drawFighter, poses } from './duel';
import { PIG } from './painting';
import { SH, drawShadow, rivalsOnScreen } from './shadow';

/*
 * IV · IMPACT.
 *
 * The two silhouettes the shadow left at sunset fight it out as an anime
 * set piece: a held standoff, a blade's glint in a cut-in panel, the dash,
 * a clash on impact frames, the blades locked and grinding, a leap across
 * the sun, a pass and a landing back to back, then each turns and pours
 * everything into one beam. The beams meet; the light where they meet grows
 * until it's all there is (chapter V begins on that white).
 */

/** local beats */
export const IM = {
  spring: [0.55, 0.72] as const,
  panel: [0.72, 1.0] as const,
  clash1: 1.4,
  lock: [1.55, 1.95] as const,
  leap: [1.95, 2.4] as const,
  clash2: 2.2,
  land: 2.4,
  turn: [2.88, 3.0] as const,
  charge: [3.0, 3.42] as const,
  fire: 3.45,
  swell: [4.2, 4.6] as const,
  white: [4.6, 5.3] as const,
  end: 6.0,
};

const BLUE = '#3d6bff', GREEN = '#2fe08a';
const PAPER = '#f3eee3';

/* ------------------------------------------------------------- choreography */

/** [beat, x, y, angle, facing] for each fighter; mode 1 snaps into the key */
type K = [b: number, x: number, y: number, a: number, face: number, mode: number];
const [b0, g0] = poses(1.9);
const BK: K[] = [
  [0, b0.x, b0.y, b0.a, 1, 0], [0.55, b0.x, b0.y, b0.a, 1, 0],
  [0.72, 300, 1735, -0.5, 1, 1], [1.0, 300, 1745, 2.7, 1, 0],
  [1.36, 470, 1730, 2.9, 1, 0], [1.4, 482, 1700, -0.25 + TAU, 1, 1],
  [1.55, 470, 1690, -0.6 + TAU, 1, 0], [1.95, 455, 1700, -0.75 + TAU, 1, 0],
  [2.08, 380, 1480, -1.2 + TAU, 1, 0], [2.2, 492, 1290, 0.25 + TAU, 1, 1],
  [2.4, 655, 1712, 0.35 + TAU, 1, 1], [2.88, 655, 1712, 0.35 + TAU, 1, 0],
  [3.0, 660, 1708, -1.75 + TAU, -1, 1], [3.42, 665, 1700, -1.6 + TAU, -1, 0],
  [3.45, 680, 1705, Math.PI + 0.04, -1, 1], [6.0, 680, 1705, Math.PI + 0.04, -1, 0],
];
const GK: K[] = [
  [0, g0.x, g0.y, g0.a, -1, 0], [0.55, g0.x, g0.y, g0.a, -1, 0],
  [0.72, 700, 1735, -2.64, -1, 1], [1.0, 700, 1745, 0.44, -1, 0],
  [1.36, 530, 1730, 0.24, -1, 0], [1.4, 518, 1700, -2.89, -1, 1],
  [1.55, 530, 1690, -2.54, -1, 0], [1.95, 545, 1700, -2.39, -1, 0],
  [2.08, 620, 1480, -1.94, -1, 0], [2.2, 508, 1290, -3.39, -1, 1],
  [2.4, 345, 1712, 2.79, -1, 1], [2.88, 345, 1712, 2.79, -1, 0],
  [3.0, 340, 1708, -1.39, 1, 1], [3.42, 335, 1700, -1.54, 1, 0],
  [3.45, 320, 1705, -0.04, 1, 1], [6.0, 320, 1705, -0.04, 1, 0],
];

function keyAt(keys: K[], L: number) {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] <= L) i++;
  const a = keys[i], b = keys[i + 1];
  const u = clamp((L - a[0]) / (b[0] - a[0] || 1));
  const k = b[5] === 1 ? ease.out5(u) : ease.inOut2(u);
  return { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), a: lerp(a[3], b[3], k), face: u < 0.5 ? a[4] : b[4] };
}

/** the beams' meeting point struggles back and forth */
const meetX = (L: number) => 500 + Math.sin((L - IM.fire) * 5.3) * 55 * seg(L, IM.fire, IM.fire + 0.3) + Math.sin(L * 23) * 6;

/* ------------------------------------------------------------- the shots */

interface View { fx: number; fy: number; zoom: number; rot: number; sun: number; sunAt: Pt }
const SUN: Pt = [500, 1688];

function viewAt(L: number, base: { fx: number; fy: number }): View {
  if (L < IM.clash1 - 0.4) {
    // a slow push in on the standoff, then out as they spring apart
    const z = 1 + 0.06 * ease.inOut2(seg(L, 0.05, IM.spring[0])) - 0.2 * ease.out3(seg(L, IM.spring[0], IM.spring[1] + 0.1));
    return { fx: base.fx, fy: base.fy, zoom: z, rot: 0, sun: 1, sunAt: SUN };
  }
  if (L < IM.lock[0]) return { fx: 500, fy: 1690, zoom: lerp(0.86, 1.15, ease.in2(seg(L, 1.0, 1.4))), rot: 0, sun: 1, sunAt: SUN };
  if (L < IM.lock[1]) return { fx: 500, fy: 1640, zoom: lerp(2.2, 2.45, seg(L, IM.lock[0], IM.lock[1])), rot: 0.2, sun: 1.6, sunAt: [520, 1600] };
  if (L < IM.land) return { fx: 500, fy: lerp(1560, 1420, seg(L, IM.leap[0], IM.leap[1])), zoom: 1.05, rot: -0.12, sun: 3.4, sunAt: [500, 1380] };
  if (L < IM.charge[0]) return { fx: 500, fy: 1690, zoom: lerp(0.98, 0.92, seg(L, IM.land, IM.charge[0])), rot: 0, sun: 1, sunAt: SUN };
  return { fx: 500, fy: 1660, zoom: lerp(0.92, 0.84, seg(L, IM.charge[0], IM.swell[1])), rot: 0, sun: 1, sunAt: [500, 1720] };
}

/* ------------------------------------------------------------- drawing */

export function drawImpact(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  const R = rivalsOnScreen(w, h);
  const base = { fx: 500 + (w / 2 - R.x0) / R.k, fy: 1842 + (h / 2 - R.y0) / R.k };
  const v = viewAt(L, base);
  const k = R.k * v.zoom;
  const dark = ease.inOut2(seg(L, IM.charge[0], IM.fire));
  const col = ease.inOut2(seg(L, IM.spring[0] - 0.1, IM.spring[1] + 0.1));
  const B = f.B - L; // this chapter's start, for crossings

  for (const c of [IM.clash1, IM.clash2]) {
    if (f.crossedFwd(B + c)) { f.shake(18); f.flash(0.4); }
  }
  if (f.crossedFwd(B + IM.spring[0] + 0.03)) f.shake(5);
  if (f.crossedFwd(B + IM.land)) f.shake(8);
  if (f.crossedFwd(B + IM.fire)) { f.shake(22); f.flash(0.6, '#e8f0ff'); }
  if (L > IM.fire && L < IM.white[1]) f.shake(3 + 6 * seg(L, IM.swell[0], IM.white[0]));

  // ---- the stage: the first second is the shadow chapter's last frame, live
  ctx.save();
  if (L < IM.spring[0] + 0.03) {
    ctx.translate(w / 2, h / 2);
    ctx.scale(v.zoom, v.zoom);
    ctx.translate(-w / 2, -h / 2);
    drawShadow(f, SH.end, false);
    ctx.restore();
    ctx.save();
  }
  const toPaint = () => {
    ctx.translate(w / 2, h / 2);
    ctx.rotate(v.rot);
    ctx.scale(k, k);
    ctx.translate(-v.fx, -v.fy);
  };
  toPaint();
  if (L >= IM.spring[0] + 0.03) drawStage(ctx, v, dark, L);

  // ---- the fighters (ghosts behind them when they move fast)
  const fast = (L > 1.05 && L < 1.4) || (L > IM.leap[0] && L < IM.land);
  const bc = mixHex('#000000', BLUE, col), gc = mixHex('#000000', GREEN, col);
  const fighter = (keys: K[], c: string, seed: number, LL: number) => {
    const p = keyAt(keys, LL), q = keyAt(keys, LL - 0.01);
    drawFighter(ctx, [p.x, p.y], p.a, p.face, c, t, (p.x - q.x) * 30, (p.y - q.y) * 30, seed);
    return p;
  };
  if (fast) {
    for (const lag of [0.06, 0.03]) {
      ctx.globalAlpha = lag === 0.06 ? 0.18 : 0.35;
      fighter(BK, bc, 1, L - lag);
      fighter(GK, gc, 2, L - lag);
    }
    ctx.globalAlpha = 1;
  }
  const pb = fighter(BK, bc, 1, L);
  const pg = fighter(GK, gc, 2, L);

  // ---- swing smears on the snaps
  for (const [c, keys, cc] of [[IM.clash1, BK, BLUE], [IM.clash1, GK, GREEN], [IM.clash2, BK, BLUE], [IM.clash2, GK, GREEN], [IM.land, BK, BLUE], [IM.land, GK, GREEN]] as const) {
    const age = L - c;
    if (age < 0 || age > 0.12) continue;
    const from = keyAt(keys, c - 0.06), to = keyAt(keys, c);
    drawSmear(ctx, to.x, to.y, from.a, to.a, cc, 1 - age / 0.12);
  }

  // ---- the lock: blades grinding, sparks streaming off the contact
  if (L > IM.clash1 && L < IM.lock[1] + 0.05) drawSparks(ctx, contact(pb, pg), L, IM.clash1, 70, 1);
  if (L > IM.clash2 && L < IM.clash2 + 0.3) drawSparks(ctx, contact(pb, pg), L, IM.clash2, 50, 2);

  // ---- the beams
  if (L >= IM.charge[0]) drawBeams(ctx, pb, pg, L, t, k);
  ctx.restore();

  // ---- screen-space: speed lines, the cut-in panel, impact frames, the white
  if (L > 1.0 && L < 1.4) speedLines(ctx, w, h, L, 0);
  if (L > IM.leap[0] + 0.05 && L < IM.land) speedLines(ctx, w, h, L, 1);
  if (L > IM.panel[0] && L < IM.panel[1]) drawPanel(ctx, w, h, L);
  for (const c of [IM.clash1, IM.clash2]) impactFrames(ctx, w, h, L - c, c === IM.clash1 ? 0.5 : 0.48);
  drawWhite(ctx, w, h, L, toPaint, k);
}

function drawStage(ctx: CanvasRenderingContext2D, v: View, dark: number, L: number) {
  const g = ctx.createRadialGradient(v.sunAt[0], v.sunAt[1], 0, v.sunAt[0], v.sunAt[1], 1727 * (0.7 + 0.3 * v.sun));
  g.addColorStop(0, '#ffe2a8');
  g.addColorStop(0.3, '#f08a45');
  g.addColorStop(0.65, '#a0303a');
  g.addColorStop(1, '#2a0c26');
  ctx.fillStyle = g;
  ctx.fillRect(-4000, -4000, 9000, 5842);
  if (dark > 0) {
    ctx.fillStyle = `rgba(20,4,16,${dark * 0.72})`;
    ctx.fillRect(-4000, -4000, 9000, 5842);
  }
  // the sun
  const r = 86 * v.sun;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6 * (1 - dark * 0.8);
  drawSprite(ctx, glow('#ff9a4a', 128), v.sunAt[0], v.sunAt[1], r * 8);
  ctx.restore();
  ctx.fillStyle = mixHex('#fff0cf', '#ff7a4a', dark);
  ctx.beginPath();
  ctx.arc(v.sunAt[0], v.sunAt[1], r * (1 - dark * 0.3), 0, TAU);
  ctx.fill();
  // the ground
  const gg = ctx.createLinearGradient(0, 1842, 0, 2300);
  gg.addColorStop(0, '#1d0c10');
  gg.addColorStop(1, '#050203');
  ctx.fillStyle = gg;
  ctx.fillRect(-4000, 1842, 9000, 3000);
  // dust on the wind
  ctx.fillStyle = 'rgba(255,214,170,0.55)';
  for (let i = 0; i < 40; i++) {
    const sp = 260 + hash(i) * 380;
    const x = 1500 - ((hash(i * 3.3) * 2600 + L * sp * 3) % 2600);
    const y = 1842 - 10 - hash(i * 7.1) * 260 + Math.sin(L * 6 + i) * 12;
    ctx.fillRect(x, y, 10 + hash(i * 2) * 18, 2.2);
  }
}

const tip = (p: { x: number; y: number; a: number }): Pt => [p.x + Math.cos(p.a) * BLADE, p.y + Math.sin(p.a) * BLADE];
function contact(pb: { x: number; y: number; a: number }, pg: { x: number; y: number; a: number }): Pt {
  const a = tip(pb), b = tip(pg);
  // where the two blades cross, roughly: between the tips, pulled toward the hilts' midpoint
  return [(a[0] + b[0] + pb.x + pg.x) / 4, (a[1] + b[1]) / 2 * 0.6 + ((pb.y + pg.y) / 2) * 0.4];
}

function drawSmear(ctx: CanvasRenderingContext2D, x: number, y: number, a0: number, a1: number, col: string, k: number) {
  const r0 = BLADE * 0.35, r1 = BLADE * 1.02;
  const dir = a1 > a0 ? 1 : -1;
  ctx.save();
  ctx.globalAlpha = k * 0.85;
  ctx.fillStyle = '#fff6e8';
  ctx.beginPath();
  ctx.arc(x, y, r1, a0, a1, dir < 0);
  ctx.arc(x, y, r0, a1, a0, dir > 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = k * 0.6;
  ctx.strokeStyle = col;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(x, y, r1 - 6, a0, a1, dir < 0);
  ctx.stroke();
  ctx.restore();
}

function drawSparks(ctx: CanvasRenderingContext2D, at: Pt, L: number, from: number, n: number, seed: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  for (let i = 0; i < n; i++) {
    // each spark is born on a stream and lives 0.12 beats
    const born = from + hash(i * 3.7 + seed) * Math.max(0.05, L - from);
    const age = L - born;
    if (age < 0 || age > 0.14) continue;
    const an = -Math.PI / 2 + (hash(i * 5.1 + seed) - 0.5) * 2.6;
    const sp = 1600 + hash(i * 1.3) * 2600;
    const x = at[0] + Math.cos(an) * sp * age, y = at[1] + Math.sin(an) * sp * age + 4000 * age * age;
    const x2 = at[0] + Math.cos(an) * sp * Math.max(0, age - 0.02), y2 = at[1] + Math.sin(an) * sp * Math.max(0, age - 0.02);
    ctx.globalAlpha = 1 - age / 0.14;
    ctx.strokeStyle = i % 3 ? '#ffd27a' : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.8;
  drawSprite(ctx, glow('#ffe9b0', 64), at[0], at[1], 160);
  ctx.restore();
}

function drawBeams(ctx: CanvasRenderingContext2D, pb: { x: number; y: number; a: number }, pg: { x: number; y: number; a: number }, L: number, t: number, k: number) {
  const ch = seg(L, IM.charge[0], IM.fire);
  const fire = seg(L, IM.fire, IM.fire + 0.08);
  const swell = ease.in2(seg(L, IM.swell[0], IM.white[0]));
  const tb = tip(pb), tg = tip(pg);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // the charge: each blade drinks light, the air crackles round them
  for (const [p, tp, c, s] of [[pb, tb, BLUE, 1], [pg, tg, GREEN, 2]] as const) {
    ctx.globalAlpha = 0.25 + 0.55 * ch;
    drawSprite(ctx, glow(c, 128), p.x, p.y - 160, 520 + 140 * ch + 30 * Math.sin(t * 30 + s));
    ctx.globalAlpha = 0.6 + 0.4 * ch;
    drawSprite(ctx, glow('#ffffff', 64), tp[0], tp[1], 50 + 90 * ch);
    if (ch > 0 && fire < 1) {
      ctx.strokeStyle = c;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const an = hash(Math.floor(t * 20) * 13 + i * 3 + s) * TAU, r0 = 60 + hash(i + s * 9) * 60, r1 = r0 + 90 * ch;
        ctx.moveTo(p.x + Math.cos(an) * r0, p.y - 160 + Math.sin(an) * r0);
        ctx.lineTo(p.x + Math.cos(an + 0.25) * (r0 + r1) / 2, p.y - 160 + Math.sin(an + 0.25) * (r0 + r1) / 2 + 20);
        ctx.lineTo(p.x + Math.cos(an) * r1, p.y - 160 + Math.sin(an) * r1);
      }
      ctx.stroke();
    }
  }
  if (fire > 0) {
    const mx = meetX(L), my = (tb[1] + tg[1]) / 2;
    // two beams, each from its tip to the meeting point
    for (const [tp, c, s] of [[tb, BLUE, 1], [tg, GREEN, 2]] as const) {
      const ex = lerp(tp[0], mx, ease.out3(fire));
      const wob = 1 + 0.12 * Math.sin(t * 40 + s * 2);
      const wd = (38 + 30 * swell) * wob;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = c;
      ctx.fillRect(Math.min(tp[0], ex), my - wd, Math.abs(ex - tp[0]), wd * 2);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(Math.min(tp[0], ex), my - wd * 0.45, Math.abs(ex - tp[0]), wd * 0.9);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.min(tp[0], ex), my - wd * 0.16, Math.abs(ex - tp[0]), wd * 0.32);
      // a shimmer running down the beam
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 6; i++) {
        const u = ((t * 3 + i / 6) % 1);
        const x = lerp(tp[0], ex, u);
        drawSprite(ctx, glow('#ffffff', 32), x, my, wd * 2.4, wd * 1.2);
      }
    }
    // where they meet
    if (fire >= 1) {
      const R = 70 + 30 * Math.sin(t * 25) + 220 * swell;
      ctx.globalAlpha = 1;
      drawSprite(ctx, glow('#ffffff', 128, 0.3), mx, my, R * 3.4);
      drawSprite(ctx, glow(BLUE, 128), mx - R * 0.3, my, R * 4);
      drawSprite(ctx, glow(GREEN, 128), mx + R * 0.3, my, R * 4);
      // rays
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      for (let i = 0; i < 14; i++) {
        const an = (i / 14) * TAU + t * 1.5 + hash(i) * 0.3;
        const len = R * (2.2 + hash(i * 3 + Math.floor(t * 12)) * 2.4);
        ctx.moveTo(mx + Math.cos(an - 0.04) * R * 0.6, my + Math.sin(an - 0.04) * R * 0.6);
        ctx.lineTo(mx + Math.cos(an) * len, my + Math.sin(an) * len);
        ctx.lineTo(mx + Math.cos(an + 0.04) * R * 0.6, my + Math.sin(an + 0.04) * R * 0.6);
      }
      ctx.fill();
      // shock rings
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#fff4e0';
      for (let j = 0; j < 3; j++) {
        const ph = ((L - IM.fire) * 3 + j / 3) % 1;
        ctx.globalAlpha = (1 - ph) * 0.7;
        ctx.lineWidth = (1 - ph) * 14 / Math.max(0.6, k);
        ctx.beginPath();
        ctx.ellipse(mx, my, 80 + ph * 900, (80 + ph * 900) * 0.35, 0, 0, TAU);
        ctx.stroke();
      }
      // the ground gives: stones lift off and hang in the light
      ctx.fillStyle = '#120608';
      ctx.globalAlpha = 1;
      for (let i = 0; i < 26; i++) {
        const born = IM.fire + hash(i * 2.2) * 0.6;
        const age = L - born;
        if (age < 0) continue;
        const x = 500 + (hash(i * 4.4) - 0.5) * 1100;
        const y = 1842 - Math.min(380, age * (260 + hash(i) * 400)) * (0.4 + hash(i * 6) * 0.6);
        const s = 8 + hash(i * 8.8) * 22;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(age * (hash(i * 3) - 0.5) * 6);
        ctx.fillRect(-s / 2, -s / 2, s, s * 0.7);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

function speedLines(ctx: CanvasRenderingContext2D, w: number, h: number, L: number, radial: number) {
  ctx.save();
  ctx.strokeStyle = '#fff6e6';
  ctx.lineCap = 'round';
  const fr = Math.floor(L * 60);
  for (let i = 0; i < 34; i++) {
    const r = hash(i * 7.7 + fr);
    ctx.globalAlpha = 0.25 + r * 0.45;
    ctx.lineWidth = 1 + r * 3;
    ctx.beginPath();
    if (!radial) {
      const y = hash(i * 3.1 + fr * 0.37) * h;
      const x = hash(i * 1.9 + fr) * w * 1.4 - w * 0.2;
      ctx.moveTo(x, y);
      ctx.lineTo(x + w * (0.2 + r * 0.5), y);
    } else {
      const an = hash(i * 2.3 + fr) * TAU;
      const R0 = Math.hypot(w, h) * (0.32 + r * 0.15);
      ctx.moveTo(w / 2 + Math.cos(an) * R0, h / 2 + Math.sin(an) * R0);
      ctx.lineTo(w / 2 + Math.cos(an) * R0 * 1.8, h / 2 + Math.sin(an) * R0 * 1.8);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** the cut-in: a band across the frame, a blade's edge, a glint running along it */
function drawPanel(ctx: CanvasRenderingContext2D, w: number, h: number, L: number) {
  const u = seg(L, IM.panel[0], IM.panel[1]);
  const open = ease.out3(seg(u, 0, 0.25)) * (1 - ease.in3(seg(u, 0.85, 1)));
  const y0 = h * 0.4, ph = h * 0.17;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${0.45 * open})`;
  ctx.fillRect(0, 0, w, h);
  ctx.beginPath();
  ctx.rect(0, y0 - (ph / 2) * open, w, ph * open);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y0 - ph / 2, 0, y0 + ph / 2);
  g.addColorStop(0, '#ffb067');
  g.addColorStop(1, '#c2413e');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0 - ph / 2, w, ph);
  // the blade, huge, sliding a little
  const sx = -w * 0.15 + u * w * 0.12;
  ctx.fillStyle = '#060505';
  ctx.beginPath();
  ctx.moveTo(sx, y0 + ph * 0.1);
  ctx.lineTo(sx + w * 1.4, y0 - ph * 0.05);
  ctx.lineTo(sx + w * 1.4, y0 + ph * 0.6);
  ctx.lineTo(sx, y0 + ph * 0.6);
  ctx.closePath();
  ctx.fill();
  // its edge, and the glint
  ctx.strokeStyle = '#ffe9cc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, y0 + ph * 0.1);
  ctx.lineTo(sx + w * 1.4, y0 - ph * 0.05);
  ctx.stroke();
  const gx = lerp(-w * 0.1, w * 1.1, ease.inOut3(seg(u, 0.2, 0.8)));
  const gy = y0 + ph * 0.1 + ((gx - sx) / (w * 1.4)) * (-ph * 0.15);
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow('#ffffff', 64), gx, gy, ph * 1.4, ph * 0.5);
  drawSprite(ctx, glow('#ffffff', 64), gx, gy, ph * 0.25, ph * 1.2);
  ctx.restore();
  // the panel's frame
  ctx.save();
  ctx.strokeStyle = '#060505';
  ctx.lineWidth = 4;
  ctx.strokeRect(-4, y0 - (ph / 2) * open, w + 8, ph * open);
  ctx.restore();
}

/** two frames of negative and one of white light on black — the anime clash */
function impactFrames(ctx: CanvasRenderingContext2D, w: number, h: number, age: number, cy: number) {
  if (age < 0 || age > 0.1) return;
  ctx.save();
  if (age < 0.045) {
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  } else {
    // white spikes from the clash on black; the figures were drawn already, so cut them out of the black by multiply
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const c: Pt = [w / 2, h * cy];
    for (let i = 0; i < 22; i++) {
      const an = (i / 22) * TAU + hash(i) * 0.2;
      const len = Math.hypot(w, h) * (0.4 + hash(i * 3) * 0.6);
      ctx.moveTo(c[0] + Math.cos(an - 0.05) * 30, c[1] + Math.sin(an - 0.05) * 30);
      ctx.lineTo(c[0] + Math.cos(an) * len, c[1] + Math.sin(an) * len);
      ctx.lineTo(c[0] + Math.cos(an + 0.05) * 30, c[1] + Math.sin(an + 0.05) * 30);
    }
    ctx.fill();
  }
  ctx.restore();
}

/** the light where the beams meet grows until it's all there is, and settles into paper */
function drawWhite(ctx: CanvasRenderingContext2D, w: number, h: number, L: number, toPaint: () => void, k: number) {
  const u = seg(L, IM.white[0], IM.white[1]);
  if (u <= 0) return;
  ctx.save();
  toPaint();
  const mx = meetX(L), my = 1690; // the beams' line
  const far = Math.hypot(w, h) / k;
  const R = lerp(300, far * 1.3, ease.in3(u));
  ctx.fillStyle = mixHex('#ffffff', PAPER, seg(L, IM.white[1], IM.white[1] + 0.5));
  ctx.beginPath();
  ctx.arc(mx, my, R, 0, TAU);
  ctx.fill();
  // its edge burns
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1 - u;
  drawSprite(ctx, glow('#ffffff', 128), mx, my, R * 2.6);
  ctx.restore();
  if (u >= 1) {
    ctx.fillStyle = mixHex('#ffffff', PAPER, seg(L, IM.white[1], IM.white[1] + 0.5));
    ctx.fillRect(0, 0, w, h);
  }
}

function mixHex(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], clamp(k))).toString(16).padStart(2, '0')).join('');
}

void PIG;
