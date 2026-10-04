import { drawBlot } from '../core/blot';
import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, damp, ease, hash, lerp, rng, seg } from '../core/math';
import { glow, drawSprite } from '../core/sprites';
import { C, F, font } from '../core/style';
import { win } from '../core/side';
import { drawBall } from './machine';

/*
 * THE GLASS.
 *
 * Everything here is about the screen itself, the pane between the film and
 * the person holding the phone.
 *
 *   - It notices you: stop scrolling and Blot comes up to the glass and
 *     knocks. Scroll backwards and the film turns into a rewinding tape.
 *     Fling it too fast and the projector overheats and the film burns.
 *   - It breaks the screen: the cannon ball ricochets off the edges of the
 *     phone and cracks the glass; Blot hangs off the top edge and drops into
 *     the television; the goal confetti piles up along the bottom.
 */

let lastT = 0;
let glassA = 0;
let rewindA = 0;
let heat = 0;
let burnAt: Pt | null = null;

export function drawGlass(f: Frame, raw: { vR: number; inInterlude: boolean }) {
  const { ctx, t } = f;
  const dt = Math.min(0.05, t - lastT || 0.016);
  lastT = t;
  if (!raw.inInterlude) {
    ricochet(f);
    hangingBlot(f);
    confettiPile(f, dt);
  }
  rewind(f, raw.vR, dt);
  overheat(f, raw.vR, dt);
  knock(f, dt);
  void ctx;
}

/* ------------------------------------------------------- Blot at the glass */

function knock(f: Frame, dt: number) {
  const { ctx, w, h, t, B, idle } = f;
  const S = Math.min(w, h);
  // not on the title screen, where Blot is already watching from the circle
  const want = idle > 5.5 && B > 0.35 && !f.reduced ? 1 : 0;
  glassA = damp(glassA, want, want ? 2.2 : 6, dt);
  if (glassA < 0.01) return;
  const a = ease.out3(glassA);
  const size = S * 0.5;
  const x = w * 0.5, y = h + size * 0.08 - a * size * 0.62;
  // a knock every couple of seconds: lean in, tap, ripples on the glass
  const kc = (idle - 5.5) % 2.2;
  const lean = kc < 0.3 ? Math.sin((kc / 0.3) * Math.PI) : kc > 0.45 && kc < 0.7 ? Math.sin(((kc - 0.45) / 0.25) * Math.PI) * 0.8 : 0;
  ctx.save();
  // the room behind the glass darkens a touch so Blot reads
  ctx.fillStyle = `rgba(0,0,0,${0.18 * a})`;
  ctx.fillRect(0, 0, w, h);
  ctx.translate(x, y);
  ctx.scale(1 + lean * 0.03, 1 + lean * 0.03);
  drawBlot(ctx, 0, 0, size, { t, pose: 'idle', seed: 77, eye: C.white, wind: 0.3, squash: lean * 0.05 });
  ctx.restore();
  // palms flat on the glass, pale where they press
  const palmY = y - size * 0.5;
  for (const sd of [-1, 1]) {
    const px = x + sd * size * 0.42, py = palmY + Math.sin(t * 2 + sd) * S * 0.004;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#1d1a16';
    ctx.beginPath();
    ctx.ellipse(px, py, size * 0.08, size * 0.06, sd * 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(px - sd * size * 0.01, py, size * 0.05, size * 0.035, sd * 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // the knock: ripples where the knuckle meets the glass, and a little word
  if (lean > 0.2) {
    const kx = x + size * 0.42, ky = palmY - size * 0.05;
    for (let r = 0; r < 3; r++) {
      ctx.strokeStyle = `rgba(255,255,255,${(0.6 - r * 0.18) * lean * a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(kx, ky, S * (0.03 + r * 0.03) * lean, 0, TAU);
      ctx.stroke();
    }
    ctx.font = font(Math.max(13, S * 0.045), F.display);
    ctx.fillStyle = `rgba(255,255,255,${lean * a})`;
    ctx.textAlign = 'center';
    ctx.fillText(kc < 0.4 ? 'tok' : 'tok!', kx + S * 0.08, ky - S * 0.08);
  }
  // breath fogs the glass, and a finger draws an arrow in it
  const fog = seg(idle, 8, 9) * a;
  if (fog > 0) {
    const fx = x, fy = y - size * 0.25;
    ctx.save();
    ctx.globalAlpha = fog * (0.55 + 0.1 * Math.sin(t * 1.5));
    drawSprite(ctx, glow('#e9eef2', 128), fx, fy, size * 0.7, size * 0.38);
    ctx.globalAlpha = fog;
    const draw = seg(idle, 9, 10.5);
    ctx.strokeStyle = 'rgba(30,30,40,0.55)';
    ctx.lineWidth = Math.max(3, S * 0.012);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const L = size * 0.11;
    ctx.moveTo(fx, fy - L);
    ctx.lineTo(fx, fy - L + 2 * L * Math.min(1, draw * 1.6));
    if (draw > 0.62) {
      const q = (draw - 0.62) / 0.38;
      ctx.moveTo(fx - L * 0.5 * q, fy + L - L * 0.5 * q);
      ctx.lineTo(fx, fy + L);
      ctx.lineTo(fx + L * 0.5 * q, fy + L - L * 0.5 * q);
    }
    ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------------------------------------- rewinding */

function rewind(f: Frame, vR: number, dt: number) {
  const { ctx, w, h, t } = f;
  const S = Math.min(w, h);
  rewindA = damp(rewindA, vR < -0.5 && !f.reduced ? 1 : 0, 8, dt);
  if (rewindA < 0.02) return;
  const a = rewindA;
  const k = Math.floor(t * 30);
  // the frame tears into shifted slices, the way a tape does at speed
  const cvs = ctx.canvas;
  const sx = cvs.width / w;
  for (let i = 0; i < 5; i++) {
    const y = ((hash(i + k * 0.37) * h) | 0);
    const hh = S * (0.02 + hash(i * 3 + k) * 0.05);
    const off = (hash(i * 7 + k) - 0.5) * S * 0.08 * a;
    ctx.drawImage(cvs, 0, y * sx, cvs.width, hh * sx, off, y, w, hh);
  }
  // tracking noise rolling up the screen
  const band = ((t * 0.9) % 1.3) * h * 1.2 - h * 0.1;
  ctx.save();
  ctx.globalAlpha = 0.55 * a;
  for (let i = 0; i < 70; i++) {
    const x = hash(i * 13 + k) * w, y = h - band + hash(i * 7 + k) * S * 0.06;
    ctx.fillStyle = hash(i + k) > 0.5 ? '#ffffff' : '#9aa0b8';
    ctx.fillRect(x, y, S * (0.02 + hash(i * 5 + k) * 0.12), 2);
  }
  ctx.globalAlpha = 0.12 * a;
  ctx.fillStyle = '#000';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1.5);
  ctx.restore();
  // on-screen display
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = font(Math.max(14, S * 0.05), F.display);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const x0 = 18, y0 = 70;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText('◀◀ REWIND', x0 + 2, y0 + 2);
  ctx.fillStyle = '#ffffff';
  if (Math.floor(t * 3) % 2 === 0) ctx.fillText('◀◀ REWIND', x0, y0);
  ctx.font = font(Math.max(11, S * 0.03), F.display);
  const secs = Math.floor(f.B * 7.3);
  ctx.fillText(`SP  0:${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`, x0, y0 + S * 0.065);
  ctx.restore();
}

/* ------------------------------------------------------------- overheat */

function overheat(f: Frame, vR: number, dt: number) {
  const { ctx, w, h, t, R } = { ...f, R: f.B };
  const S = Math.min(w, h);
  const fast = vR > 2.6 && !f.reduced;
  heat = clamp(heat + (fast ? (vR - 2.6) * 0.35 * dt : -0.5 * dt), 0, 1.4);
  if (heat < 0.05) {
    burnAt = null;
    return;
  }
  const a = Math.min(1, heat * 2);
  // the projector strains: flicker and gate weave
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${(hash(Math.floor(t * 24)) * 0.22) * a})`;
  ctx.fillRect(0, 0, w, h);
  // the film's own edges show: sprocket holes running down both sides
  const sw = S * 0.07;
  ctx.globalAlpha = Math.min(1, a * 1.2);
  ctx.fillStyle = '#0b0a09';
  ctx.fillRect(0, 0, sw, h);
  ctx.fillRect(w - sw, 0, sw, h);
  ctx.fillStyle = '#d8d0bd';
  const hole = S * 0.035, gap = S * 0.075;
  const off = (R * h * 2.5) % gap;
  for (let y = -gap + off; y < h + gap; y += gap) {
    for (const x of [sw * 0.5, w - sw * 0.5]) {
      ctx.beginPath();
      ctx.roundRect(x - hole * 0.45, y, hole * 0.9, hole * 0.6, hole * 0.15);
      ctx.fill();
    }
  }
  ctx.font = font(Math.max(8, S * 0.02), F.display);
  ctx.fillStyle = '#e1a63c';
  ctx.save();
  ctx.translate(sw * 0.82, h * 0.5);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('MG · 35 · SAFETY FILM · ' + String(Math.floor(R * 24)).padStart(5, '0'), 0, 0);
  ctx.restore();
  ctx.restore();
  // the burn: a hole that bubbles open where the film is stuck in the gate
  const burn = seg(heat, 0.6, 1.4);
  if (burn > 0) {
    if (!burnAt) burnAt = [w * (0.3 + Math.random() * 0.4), h * (0.3 + Math.random() * 0.4)];
    const [bx, by] = burnAt;
    // celluloid melting in the gate: a cluster of bubbles that open, each
    // white-hot in the middle, amber, then a ring of char
    const r = rng(5);
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const delay = i * 0.1;
      const k = ease.out2(clamp((burn - delay) / (1 - delay)));
      if (k <= 0) continue;
      const a0 = r() * TAU, d = i === 0 ? 0 : S * (0.05 + r() * 0.1);
      const cx = bx + Math.cos(a0) * d, cy = by + Math.sin(a0) * d;
      const rad = S * (i === 0 ? 0.16 : 0.05 + r() * 0.06) * k;
      const blob = (scale: number) => {
        ctx.beginPath();
        for (let j = 0; j <= 28; j++) {
          const an = (j / 28) * TAU;
          const wob = 1 + Math.sin(an * 4 + i * 2 + t * 2.5) * 0.07 + (hash(j * 3 + i * 31 + Math.floor(t * 10)) - 0.5) * 0.08;
          const x = cx + Math.cos(an) * rad * scale * wob, y = cy + Math.sin(an) * rad * scale * wob;
          if (j) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
      };
      blob(1.25);
      ctx.fillStyle = 'rgba(28,14,6,0.8)';
      ctx.fill();
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * 1.05);
      g.addColorStop(0, '#fffdf4');
      g.addColorStop(0.45, '#fff0c4');
      g.addColorStop(0.7, '#f3a640');
      g.addColorStop(0.88, '#b4521b');
      g.addColorStop(1, 'rgba(70,30,10,0.9)');
      blob(1);
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ------------------------------------------- the ball that hits the glass */

const RICO = [12.08, 12.14, 12.2, 12.28];

function ricochet(f: Frame) {
  const { ctx, w, h, B, t } = f;
  const S = Math.min(w, h);
  if (B < RICO[0] - 0.01 || B > 12.5) return;
  const r = S * 0.09;
  const P0: Pt = [w * 0.62, h * 0.42], P1: Pt = [w - r * 0.7, h * 0.24], P2: Pt = [w * 0.3, r * 0.7 + 60], P3: Pt = [-r * 2, h * 0.3];
  const hits: Pt[] = [[w, h * 0.24], [w * 0.3, 0]];
  // cracks stay on the glass after each hit, fading before the next act
  const fade = 1 - seg(B, 12.38, 12.5);
  hits.forEach((hp, i) => {
    const on = seg(B, RICO[i + 1], RICO[i + 1] + 0.01);
    if (on > 0) drawCrack(ctx, hp[0], hp[1], S * 0.32, i + 3, fade);
    if (f.crossedFwd(RICO[i + 1])) {
      f.shake(S * 0.05);
      f.flash(0.35, '#ffffff');
    }
  });
  if (B > RICO[3]) return;
  let p: Pt;
  if (B < RICO[1]) p = lerpPt(P0, P1, seg(B, RICO[0], RICO[1]));
  else if (B < RICO[2]) p = lerpPt(P1, P2, seg(B, RICO[1], RICO[2]));
  else p = lerpPt(P2, P3, seg(B, RICO[2], RICO[3]));
  const grow = lerp(0.5, 1, seg(B, RICO[0], RICO[1]));
  // motion smear
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = C.white;
  for (let k = 1; k < 5; k++) {
    const q = B - k * 0.008;
    let pp: Pt;
    if (q < RICO[1]) pp = lerpPt(P0, P1, seg(q, RICO[0], RICO[1]));
    else if (q < RICO[2]) pp = lerpPt(P1, P2, seg(q, RICO[1], RICO[2]));
    else pp = lerpPt(P2, P3, seg(q, RICO[2], RICO[3]));
    ctx.beginPath();
    ctx.arc(pp[0], pp[1], r * grow * (1 - k * 0.1), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  drawBall(ctx, p[0], p[1], r * grow, B * 40, t, 1);
}

const lerpPt = (a: Pt, b: Pt, s: number): Pt => [lerp(a[0], b[0], s), lerp(a[1], b[1], s)];

const cracks = new Map<number, Pt[][]>();
export function drawCrack(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number, alpha = 1) {
  let lines = cracks.get(seed);
  if (!lines) {
    const r = rng(seed * 31);
    lines = [];
    for (let k = 0; k < 11; k++) {
      let a = (k / 11) * TAU + r() * 0.5;
      const pts: Pt[] = [[0, 0]];
      let px = 0, py = 0;
      const len = 0.4 + r() * 0.6;
      for (let i = 0; i < 7; i++) {
        a += (r() - 0.5) * 0.7;
        px += (Math.cos(a) * len) / 7;
        py += (Math.sin(a) * len) / 7;
        pts.push([px, py]);
      }
      lines.push(pts);
    }
    // concentric spall rings
    for (const rr of [0.12, 0.22]) {
      const ring: Pt[] = [];
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * TAU;
        ring.push([Math.cos(a) * rr * (0.9 + r() * 0.2), Math.sin(a) * rr * (0.9 + r() * 0.2)]);
      }
      lines.push(ring);
    }
    cracks.set(seed, lines);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.45)';
    ctx.lineWidth = pass ? 1.3 : 3;
    ctx.beginPath();
    for (const l of lines) l.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * size, y + py * size) : ctx.moveTo(x + px * size, y + py * size)));
    ctx.stroke();
  }
  // the impact point: a frosted star
  ctx.globalAlpha = alpha * 0.7;
  drawSprite(ctx, glow('#ffffff', 64), x, y, size * 0.35);
  ctx.restore();
}

/* ------------------------------------------ Blot hanging off the top edge */

function hangingBlot(f: Frame) {
  const { ctx, w, h, B, t } = f;
  const S = Math.min(w, h);
  if (B < 12.55 || B > 13.0) return;
  const appear = ease.outBack(seg(B, 12.55, 12.62), 1.8);
  const drop = seg(B, 12.84, 12.98);
  const size = S * 0.17;
  const hx = w * 0.72;
  // swinging from its fingertips, watching the ball go in
  const swing = Math.sin(t * 2.4) * 0.18 * (1 - drop);
  const top = lerp(-size, 0, appear);
  ctx.save();
  ctx.translate(hx, top + size * 0.02);
  ctx.rotate(swing + drop * 1.2);
  const fall = ease.in2(drop);
  ctx.translate(0, fall * h * 0.35);
  ctx.scale(1 - fall * 0.7, 1 - fall * 0.7);
  // arms up to the edge
  if (drop === 0) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = size * 0.07;
    ctx.lineCap = 'round';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * size * 0.18, size * 0.35);
      ctx.lineTo(sd * size * 0.14, 0);
      ctx.stroke();
    }
  }
  drawBlot(ctx, 0, size * 1.25, size, { t, pose: drop > 0 ? 'fall' : B > 12.78 ? 'shock' : 'idle', look: [w * 0.5, h * 0.6], seed: 55, eye: C.white });
  ctx.restore();
  // fingertips curled over the edge of the screen
  if (drop === 0 && appear > 0.5) {
    ctx.fillStyle = C.ink;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(hx + sd * size * 0.14 + Math.sin(swing) * size * 0.3, 2, size * 0.06, size * 0.04, 0, 0, TAU);
      ctx.fill();
    }
  }
}

/* -------------------------------------------- the confetti that piles up */

interface Bit { x: number; y: number; vy: number; vx: number; c: string; r: number; stuck: boolean }
let bits: Bit[] = [];
let heights: Float32Array | null = null;
const GOAL_FILM = 16.5 + 5.1;

function confettiPile(f: Frame, dt: number) {
  const { ctx, w, h, B, t } = f;
  const S = Math.min(w, h);
  if (B < GOAL_FILM - 0.05 || B > 23.1) {
    if (bits.length) bits = [];
    return;
  }
  const cols = Math.ceil(w / 6);
  if (!heights || heights.length !== cols) heights = new Float32Array(cols);
  if (f.crossedFwd(GOAL_FILM + 0.02) || (bits.length === 0 && B > GOAL_FILM + 0.02)) {
    heights.fill(0);
    const palette = [win().c, C.paper, C.red, win().hot, '#ffd23e'];
    for (let i = 0; i < 220; i++) {
      bits.push({ x: Math.random() * w, y: -Math.random() * h * 0.8, vy: S * (0.4 + Math.random() * 0.5), vx: (Math.random() - 0.5) * S * 0.2, c: palette[i % palette.length], r: Math.random() * TAU, stuck: false });
    }
  }
  // slide off the bottom when the iris takes the screen
  const slide = seg(B, 22.9, 23.1);
  const floor = h - 60; // rest on top of the chapter reel
  for (const b of bits) {
    if (!b.stuck) {
      b.vy += S * 0.6 * dt;
      b.x += (b.vx + Math.sin(t * 4 + b.r * 3) * S * 0.08) * dt;
      b.y += b.vy * dt;
      b.r += dt * 5;
      const ci = Math.max(0, Math.min(cols - 1, Math.floor(b.x / 6)));
      const top = floor - heights[ci];
      if (b.y >= top) {
        b.y = top;
        b.stuck = true;
        heights[ci] += S * 0.006;
        if (ci > 0) heights[ci - 1] += S * 0.002;
        if (ci < cols - 1) heights[ci + 1] += S * 0.002;
      }
    }
    const y = b.y + slide * h * 0.3;
    ctx.save();
    ctx.translate(b.x, y);
    ctx.rotate(b.stuck ? b.r % 1 : b.r);
    ctx.scale(1, b.stuck ? 0.6 : Math.cos(b.r * 2));
    ctx.fillStyle = b.c;
    ctx.globalAlpha = 1 - slide;
    ctx.fillRect(-S * 0.009, -S * 0.005, S * 0.018, S * 0.01);
    ctx.restore();
  }
}
