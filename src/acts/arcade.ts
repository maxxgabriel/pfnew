import { BLOT_SPRITE } from '../core/blot';
import type { Frame } from '../core/frame';
import { type Pt, TAU, bell, clamp, ease, hash, lerp, rng, seg } from '../core/math';
import { canvas } from '../core/sprites';
import { C } from '../core/style';
import { drawBall } from './machine';
import { GOLD, drawBolt, drawCrackle } from '../core/bolt';

/*
 * ACT III — THE ARCADE.
 *
 * The cannon's shot doesn't reach the sky; it goes straight through the
 * glass of a cartoon television. The set cracks and switches on, the camera
 * dives into the screen, and the film drops to 8-bit: a Pong rally between
 * the same two rivals (blue and green, again), a Breakout wall that spells
 * PLAY, and then the signal tears apart into a glitch storm. The last frame
 * of the glitch blows outward as pixels that slow down and turn into stars —
 * the night sky the ball falls through into the match.
 *
 * The 8-bit world is drawn into a tiny buffer and scaled up without
 * smoothing, so the pixels are real pixels.
 */

const A = {
  // the cannon ball turns into a bolt that tears up the screen; hard cut to the TV
  bolt: [12.3, 12.4] as const,
  tvIn: 12.4,
  hit: 12.82,
  on: [12.84, 13.02] as const,
  dive: [13.0, 13.42] as const,
  boot: [13.1, 13.55] as const,
  pong: [13.55, 14.65] as const,
  brk: [14.65, 15.55] as const,
  glitch: [15.5, 15.98] as const,
  warp: [15.92, 16.6] as const,
};

const PAL = { bg: '#0b0f2a', blue: C.blue, green: C.green, red: C.red, paper: C.paper, yellow: '#ffd23e', dim: '#1b2350' };

/* ------------------------------------------------------------- 3×5 font */
const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', K: '101101110101101',
  L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010',
  W: '101101111111101', X: '101101010101101', Y: '101101010010010', '0': '111101101101111', '1': '010110010010111',
  '2': '110001010100111', '3': '110001010001110', '4': '101101111001001', '5': '111100110001110', '6': '011100111101111',
  '7': '111001010010010', '8': '111101111101111', '9': '111101111001110', '!': '010010010000010', ' ': '000000000000000',
  '-': '000000111000000', ':': '000010000010000', '.': '000000000000010', '?': '110001010000010',
};

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, scale = 1, center = true) {
  const wid = s.length * 4 * scale - scale;
  let cx = Math.round(center ? x - wid / 2 : x);
  g.fillStyle = color;
  for (const ch of s) {
    const bits = FONT[ch] ?? FONT[' '];
    for (let i = 0; i < 15; i++) if (bits[i] === '1') g.fillRect(cx + (i % 3) * scale, Math.round(y) + Math.floor(i / 3) * scale, scale, scale);
    cx += 4 * scale;
  }
}

function sprite(g: CanvasRenderingContext2D, x: number, y: number, blink: boolean, scale = 1) {
  const cols: Record<string, string> = { '1': '#14120f', '2': blink ? '#14120f' : '#fbfaf5', '3': PAL.red, '4': '#14120f' };
  const X = Math.round(x), Y = Math.round(y);
  // a one-pixel paper outline first, so the ink-black sprite reads on navy
  g.fillStyle = '#8f96c8';
  BLOT_SPRITE.forEach((row, j) => {
    [...row].forEach((c, i) => {
      if (c === '.') return;
      g.fillRect(X + (i - 1) * scale, Y + j * scale, scale * 3, scale);
      g.fillRect(X + i * scale, Y + (j - 1) * scale, scale, scale * 3);
    });
  });
  BLOT_SPRITE.forEach((row, j) => {
    [...row].forEach((c, i) => {
      if (c === '.') return;
      g.fillStyle = cols[c];
      g.fillRect(X + i * scale, Y + j * scale, scale, scale);
    });
  });
}

/* ----------------------------------------------------------------- pong */

function pongTimes() {
  // seven crossings, each quicker than the last; the eighth gets past blue
  const out: number[] = [];
  let b = A.pong[0] + 0.05, step = 0.2;
  for (let i = 0; i < 9; i++) {
    out.push(b);
    b += step;
    step *= 0.82;
  }
  return out;
}
const PONG_T = pongTimes();
const PONG_Y = [0.5, 0.2, 0.75, 0.35, 0.85, 0.15, 0.6, 0.3, 0.7];

function pongBall(B: number, W: number, H: number, top: number, bot: number) {
  void H;
  const xL = 7, xR = W - 8;
  let k = 0;
  while (k < PONG_T.length - 2 && B >= PONG_T[k + 1]) k++;
  const s = clamp((B - PONG_T[k]) / (PONG_T[k + 1] - PONG_T[k]));
  const fromR = k % 2 === 1;
  let x = fromR ? lerp(xR, xL, s) : lerp(xL, xR, s);
  // the last one goes past blue's paddle and off the screen
  if (k === PONG_T.length - 2 && fromR) x = lerp(xR, -10, s);
  const y = lerp(top + 2, bot - 2, lerp(PONG_Y[k], PONG_Y[k + 1], s));
  return { x, y, k, s };
}

/* ------------------------------------------------------------- breakout */

interface Brick { x: number; y: number; c: string; hit: number; vx: number }
let bricks: Brick[] = [];
let brickKey = '';
let brkPath: Pt[] = [];

function buildBreakout(W: number, H: number, padT: number, padB: number) {
  const key = `${W}x${H}`;
  if (key === brickKey) return;
  brickKey = key;
  bricks = [];
  const word = 'PLAY';
  const bw = 4, bh = 3;
  const cell = bw + 1;
  const letterW = 3 * cell + 3;
  const total = word.length * letterW - 3;
  const x0 = Math.round(W / 2 - total / 2);
  const y0 = padT + 6;
  const cols = [PAL.blue, PAL.green, PAL.red, PAL.yellow, PAL.paper];
  [...word].forEach((ch, li) => {
    const bits = FONT[ch];
    for (let i = 0; i < 15; i++) {
      if (bits[i] !== '1') continue;
      const r = Math.floor(i / 3);
      bricks.push({ x: x0 + li * letterW + (i % 3) * cell, y: y0 + r * (bh + 1), c: cols[r], hit: Infinity, vx: 0 });
    }
  });
  // the ball's route: up off the paddle, ricochets, and through the letters
  const pad = H - padB - 6;
  brkPath = [
    [W / 2, pad - 3], [W * 0.15, H * 0.55], [W * 0.38, y0 + 4], [W - 3, H * 0.4], [W * 0.62, y0 + 16],
    [3, H * 0.33], [W * 0.3, y0 + 10], [W * 0.55, H * 0.6], [W * 0.82, y0 + 6], [W * 0.5, -10],
  ];
  // when does the ball pass each brick? sample the route once
  const N = 600;
  for (let n = 0; n <= N; n++) {
    const q = n / N;
    const [bx, by] = alongPath(q);
    const b = lerp(A.brk[0] + 0.12, A.brk[1] - 0.12, q);
    for (const br of bricks) {
      if (br.hit !== Infinity) continue;
      if (bx > br.x - 3 && bx < br.x + bw + 3 && by > br.y - 3 && by < br.y + bh + 3) {
        br.hit = b;
        br.vx = (hash(br.x * 7 + br.y) - 0.5) * 40;
      }
    }
  }
}

function alongPath(q: number): Pt {
  const n = brkPath.length - 1;
  const f = clamp(q) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const s = f - i;
  return [lerp(brkPath[i][0], brkPath[i + 1][0], s), lerp(brkPath[i][1], brkPath[i + 1][1], s)];
}

/* ------------------------------------------------------------- the draw */

let buf: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
let tint: { r: HTMLCanvasElement; rc: CanvasRenderingContext2D; b: HTMLCanvasElement; bc: CanvasRenderingContext2D } | null = null;
let bufKey = '';
let crackPts: Pt[][] = [];

function ensureBuf(f: Frame) {
  const P = Math.max(4, Math.round(Math.min(f.w, f.h) / 80));
  const W = Math.ceil(f.w / P), H = Math.ceil(f.h / P);
  const key = `${W}x${H}`;
  if (key !== bufKey) {
    bufKey = key;
    buf = canvas(W, H);
    const r = canvas(W, H), b = canvas(W, H);
    tint = { r: r.c, rc: r.ctx, b: b.c, bc: b.ctx };
  }
  return { P, W, H };
}

export function drawArcade(f: Frame) {
  const { ctx, w, h, B, t } = f;
  const S = Math.min(w, h);
  const { P, W, H } = ensureBuf(f);
  const g = buf!.ctx;

  // the cut away from the machine: the ball becomes lightning
  if (B < A.tvIn) {
    drawCutBolt(f, seg(B, A.bolt[0], A.bolt[1]), 1);
    return;
  }

  renderPixels(g, W, H, f, P);

  // ---- the television
  const dive = ease.inOut3(seg(B, A.dive[0], A.dive[1]));
  const sw = Math.min(w * 0.72, (h * 0.5) * (w / h)), sh = sw * (h / w);
  const scx = w / 2, scy = h * 0.44;
  const zTarget = w / sw;
  const z = lerp(1, zTarget, dive);
  // the screen centre slides to the viewport centre as we dive
  const cx = lerp(scx, w / 2, dive), cy = lerp(scy, h / 2, dive);

  if (dive < 1) {
    // backdrop: a dark poster wall with drifting stripes
    ctx.fillStyle = '#121735';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#1d2550';
    ctx.lineWidth = S * 0.04;
    for (let i = -10; i < 20; i++) {
      const x = ((i * S * 0.12 + t * 20) % (w + h)) - h * 0.2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - h * 0.5, h);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(z, z);
    ctx.translate(-scx, -scy);
    drawTV(ctx, scx, scy, sw, sh, S, t, B);
    ctx.restore();
  }

  // the screen content, scaled into the (diving) screen rectangle
  ctx.save();
  const dw = sw * z, dh = sh * z;
  const dx = cx - dw / 2, dy = cy - dh / 2;
  ctx.beginPath();
  ctx.roundRect(dx, dy, dw, dh, S * 0.03 * (1 - dive) * z);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  const on = seg(B, A.on[0], A.on[1]);
  if (on <= 0) {
    // dark glass, a reflection
    ctx.fillStyle = '#0b0e1c';
    ctx.fillRect(dx, dy, dw, dh);
  } else {
    // CRT switch-on: a bright line that opens into the picture
    const open = ease.out3(on);
    const lineH = lerp(dh * 0.01, dh, open);
    ctx.fillStyle = '#05060f';
    ctx.fillRect(dx, dy, dw, dh);
    const gl = seg(B, A.glitch[0], A.glitch[1]);
    if (gl > 0) drawGlitched(ctx, dx, dy, dw, dh, gl, B, t, P);
    else ctx.drawImage(buf!.c, 0, 0, W, H, dx, dy + (dh - lineH) / 2, dw, lineH);
    if (on < 1) {
      ctx.fillStyle = `rgba(255,255,255,${1 - open})`;
      ctx.fillRect(dx, dy + dh / 2 - lineH / 2, dw, lineH);
    }
  }
  // scanlines + glass curvature shading
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000';
  const step = Math.max(2, P * z * (dw / w));
  for (let y = dy; y < dy + dh; y += step) ctx.fillRect(dx, y, dw, step * 0.4);
  ctx.globalAlpha = 1;
  const vg = ctx.createRadialGradient(dx + dw / 2, dy + dh / 2, Math.min(dw, dh) * 0.35, dx + dw / 2, dy + dh / 2, Math.hypot(dw, dh) * 0.6);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(dx, dy, dw, dh);
  ctx.restore();

  // cracks in the glass from the ball's impact
  if (B >= A.hit && dive < 1) drawCracks(ctx, cx + (scx - scx) * z, cy, z, sw, sh, S, B);

  // the ball flying into the set
  if (B >= A.tvIn && B < A.hit) {
    const q = seg(B, A.tvIn, A.hit);
    const e = ease.in2(q);
    const bx = lerp(w * 0.38, scx + sw * 0.12, e);
    const by = lerp(h * 1.1, scy - sh * 0.1, e);
    // still carrying the charge: a trail of lightning and sparks
    const tail: Pt[] = [];
    for (let k = 0; k < 6; k++) {
      const qq = Math.max(0, q - k * 0.05), ee = ease.in2(qq);
      tail.push([lerp(w * 0.38, scx + sw * 0.12, ee), lerp(h * 1.1, scy - sh * 0.1, ee)]);
    }
    drawBolt(ctx, tail, t, { width: S * 0.005, amp: S * 0.02, seed: 21, alpha: 0.9, branches: 3 });
    const r = lerp(S * 0.09, S * 0.03, e);
    drawCrackle(ctx, bx, by, r * 1.6, t, 1, 8);
    drawBall(ctx, bx, by, r, q * 9, t, 1);
  }
  if (f.crossedFwd(A.hit)) {
    f.shake(S * 0.04);
    f.flash(0.7, GOLD.hot);
  }
  // the screen glows where the charge went in
  const zap = seg(B, A.hit, A.hit + 0.08);
  if (zap > 0 && zap < 1 && dive < 1) {
    drawCrackle(ctx, scx + sw * 0.12, scy - sh * 0.1, S * 0.14 * (1 - zap * 0.5), t, 1 - zap, 9);
  }

  // the warp out: pixels become stars
  const warp = seg(B, A.warp[0], A.warp[1]);
  if (warp > 0) drawWarp(ctx, w, h, warp, S);

  // the bolt's afterimage burned on the eye across the cut
  const after = seg(B, A.tvIn, A.tvIn + 0.1);
  if (after < 1) drawCutBolt(f, 1, 1 - after);
}

function drawCutBolt(f: Frame, q: number, alpha: number) {
  const { ctx, w, h, t } = f;
  const S = Math.min(w, h);
  if (q <= 0 || alpha <= 0) return;
  // a jagged column from the bottom of the screen to the top
  const path: Pt[] = [[w * 0.55, h * 1.05], [w * 0.38, h * 0.75], [w * 0.62, h * 0.5], [w * 0.4, h * 0.28], [w * 0.58, -h * 0.05]];
  const head = ease.out3(seg(q, 0, 0.7));
  const shown: Pt[] = [];
  const n = path.length - 1;
  for (let i = 0; i <= n; i++) {
    if (i / n <= head) shown.push(path[i]);
    else {
      const k = (head - (i - 1) / n) * n;
      shown.push([lerp(path[i - 1][0], path[i][0], k), lerp(path[i - 1][1], path[i][1], k)]);
      break;
    }
  }
  if (q > 0.5 && alpha === 1) {
    // the whole frame bleaches as it connects
    const k = seg(q, 0.5, 1);
    ctx.fillStyle = `rgba(255,246,214,${k * 0.85})`;
    ctx.fillRect(0, 0, w, h);
  }
  drawBolt(ctx, shown, t, { width: S * 0.012 * alpha, amp: S * 0.05, seed: 17, alpha, branches: 12 });
  if (f.crossedFwd(A.bolt[0] + 0.05)) {
    f.shake(S * 0.05);
    f.flash(0.5, GOLD.hot);
  }
}

function drawTV(ctx: CanvasRenderingContext2D, x: number, y: number, sw: number, sh: number, S: number, t: number, B: number) {
  const bw = sw * 1.18, bh = sh * 1.2;
  const bx = x - bw / 2, by = y - sh / 2 - (bh - sh) * 0.32;
  const lw = Math.max(2, S * 0.008);
  // antenna, wobbling
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const ang = -Math.PI / 2 + side * (0.45 + Math.sin(t * 3 + side) * 0.08 + bell(B, A.hit, A.hit + 0.2) * 0.4);
    const ax = x + side * bw * 0.06, ay = by;
    const ex = ax + Math.cos(ang) * sh * 0.4, ey = ay + Math.sin(ang) * sh * 0.4;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.arc(ex, ey, S * 0.012, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  // legs
  ctx.fillStyle = C.ink;
  ctx.fillRect(bx + bw * 0.12, by + bh, bw * 0.06, sh * 0.12);
  ctx.fillRect(bx + bw * 0.82, by + bh, bw * 0.06, sh * 0.12);
  // body with a hard shadow
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.roundRect(bx + S * 0.015, by + S * 0.015, bw, bh, S * 0.04);
  ctx.fill();
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, S * 0.04);
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.stroke();
  // halftone on the cabinet
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  const r = rng(3);
  for (let i = 0; i < 70; i++) {
    ctx.beginPath();
    ctx.arc(bx + r() * bw, by + r() * bh, S * 0.004, 0, TAU);
    ctx.fill();
  }
  // bezel
  ctx.fillStyle = '#2b2a2e';
  ctx.beginPath();
  ctx.roundRect(x - sw / 2 - S * 0.015, y - sh / 2 - S * 0.015, sw + S * 0.03, sh + S * 0.03, S * 0.035);
  ctx.fill();
  ctx.stroke();
  // knobs and the brand plate along the bottom
  const ky = y + sh / 2 + (by + bh - (y + sh / 2)) / 2;
  for (let i = 0; i < 2; i++) {
    const kx = x + sw * (0.28 + i * 0.14);
    ctx.fillStyle = C.paper;
    ctx.beginPath();
    ctx.arc(kx, ky, S * 0.022, 0, TAU);
    ctx.fill();
    ctx.stroke();
    const a = t * (i ? -1.2 : 0.8);
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(kx + Math.cos(a) * S * 0.018, ky + Math.sin(a) * S * 0.018);
    ctx.stroke();
  }
  ctx.fillStyle = C.paper;
  ctx.font = `${Math.round(S * 0.035)}px "Dela Gothic One", "Arial Black", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('MG·TV', x - sw * 0.45, ky);
}

function drawCracks(ctx: CanvasRenderingContext2D, cx: number, cy: number, z: number, sw: number, sh: number, S: number, B: number) {
  if (crackPts.length === 0) {
    const r = rng(41);
    for (let k = 0; k < 9; k++) {
      let a = (k / 9) * TAU + r() * 0.4;
      const pts: Pt[] = [[0, 0]];
      let x = 0, y = 0;
      const len = 0.25 + r() * 0.35;
      for (let i = 0; i < 6; i++) {
        a += (r() - 0.5) * 0.6;
        x += Math.cos(a) * len / 6;
        y += Math.sin(a) * len / 6;
        pts.push([x, y]);
      }
      crackPts.push(pts);
    }
  }
  const grow = ease.out5(seg(B, A.hit, A.hit + 0.05));
  const ix = cx + sw * 0.12 * z, iy = cy - sh * 0.1 * z;
  ctx.save();
  ctx.lineJoin = 'round';
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)';
    ctx.lineWidth = (pass ? 1.2 : 3) * Math.min(3, z);
    ctx.beginPath();
    for (const pts of crackPts) {
      pts.forEach(([x, y], i) => {
        const px = ix + x * sw * z * grow, py = iy + y * sw * z * grow;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
    }
    ctx.stroke();
  }
  ctx.restore();
  void S;
}

function drawGlitched(ctx: CanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number, gl: number, B: number, t: number, P: number) {
  const src = buf!.c;
  const W = src.width, H = src.height;
  const k = Math.floor(t * 20);
  // torn horizontal slices
  const slices = 18;
  for (let i = 0; i < slices; i++) {
    const sy = (i / slices) * H, shh = H / slices + 1;
    const off = (hash(i * 7 + k) - 0.5) * W * 0.5 * gl * (hash(i + k * 3) > 0.6 ? 1 : 0.15);
    ctx.drawImage(src, 0, sy, W, shh, dx + (off / W) * dw, dy + (sy / H) * dh, dw, (shh / H) * dh);
  }
  // colour channels pulled apart
  const tc = tint!;
  for (const [cv, cc, col] of [[tc.r, tc.rc, '#ff2030'], [tc.b, tc.bc, '#20c8ff']] as const) {
    cc.globalCompositeOperation = 'source-over';
    cc.clearRect(0, 0, W, H);
    cc.drawImage(src, 0, 0);
    cc.globalCompositeOperation = 'source-in';
    cc.fillStyle = col;
    cc.fillRect(0, 0, W, H);
    void cv;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6 * gl;
  const sh = P * 3 * gl * (1 + Math.sin(t * 40));
  ctx.drawImage(tc.r, dx - sh, dy, dw, dh);
  ctx.drawImage(tc.b, dx + sh, dy, dw, dh);
  ctx.restore();
  // blocks of noise
  const blocks = Math.floor(gl * 26);
  for (let i = 0; i < blocks; i++) {
    const bx = hash(i * 13 + k) * dw, by = hash(i * 17 + k * 2) * dh;
    ctx.fillStyle = [C.blue, C.green, C.red, '#ffffff', '#000000'][Math.floor(hash(i + k) * 5)];
    ctx.fillRect(dx + bx, dy + by, dw * (0.05 + hash(i * 3 + k) * 0.25), P * (1 + Math.floor(hash(i * 5) * 3)));
  }
  // the screen flashes to inverse on the beat
  if (Math.floor(B * 40) % 7 === 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.restore();
  }
}

function drawWarp(ctx: CanvasRenderingContext2D, w: number, h: number, q: number, S: number) {
  // the screen shatters outward into squares that slow down into stars
  const bgA = ease.inOut2(seg(q, 0, 0.35)) * (1 - ease.inOut2(seg(q, 0.75, 1)));
  ctx.fillStyle = `rgba(4,6,15,${bgA})`;
  ctx.fillRect(0, 0, w, h);
  const r = rng(77);
  const cols = [C.blue, C.green, C.red, '#ffd23e', C.paper];
  const fade = 1 - seg(q, 0.7, 1);
  for (let i = 0; i < 220; i++) {
    const a = r() * TAU;
    const r0 = r() * S * 0.4;
    const sp = 0.3 + r();
    const d = r0 + ease.out3(q) * Math.max(w, h) * 0.9 * sp;
    const x = w / 2 + Math.cos(a) * d, y = h / 2 + Math.sin(a) * d;
    const size = lerp(S * 0.02 * (0.5 + r()), 1.5, ease.in2(seg(q, 0.2, 0.8)));
    const col = q < 0.5 ? cols[i % cols.length] : '#ece6d6';
    ctx.globalAlpha = fade * (q < 0.5 ? 1 : 0.8);
    ctx.fillStyle = col;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------- the 8-bit screen */

function renderPixels(g: CanvasRenderingContext2D, W: number, H: number, f: Frame, P: number) {
  const { B, t } = f;
  // keep the game clear of the heads-up display at the top and bottom
  const padT = Math.ceil(72 / P), padB = Math.ceil(62 / P);
  g.imageSmoothingEnabled = false;
  g.fillStyle = PAL.bg;
  g.fillRect(0, 0, W, H);
  // starfield behind everything, scrolling
  const r = rng(5);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * W), y = Math.floor((r() * H + t * (4 + r() * 10)) % H);
    g.fillStyle = r() > 0.5 ? PAL.dim : '#2a3570';
    g.fillRect(x, y, 1, 1);
  }
  const blink = (t % 2.2) < 0.12;

  if (B < A.pong[0]) {
    // boot: names in, Blot at the bottom, PRESS START blinking
    const k = seg(B, A.boot[0], A.boot[1]);
    const sc = W > 110 ? 3 : 2;
    const y0 = padT + 6;
    const span = H - padT - padB;
    text(g, 'BLUE', W / 2, y0 + span * 0.05, PAL.blue, sc);
    if (k > 0.3) text(g, 'VS', W / 2, y0 + span * 0.2, PAL.paper, sc - 1);
    if (k > 0.6) text(g, 'GREEN', W / 2, y0 + span * 0.32, PAL.green, sc);
    if (Math.floor(t * 2.5) % 2 === 0) text(g, 'PRESS START', W / 2, y0 + span * 0.55, PAL.yellow, 1);
    sprite(g, W / 2 - 9, y0 + span * 0.66 + Math.abs(Math.sin(t * 5)) * -4, blink, 2);
    return;
  }

  if (B < A.brk[0]) {
    // ---- PONG
    const top = padT + 10, bot = H - padB - 10;
    g.fillStyle = PAL.paper;
    g.fillRect(2, top - 2, W - 4, 1);
    g.fillRect(2, bot + 2, W - 4, 1);
    for (let y = top; y < bot; y += 4) g.fillRect(Math.floor(W / 2), y, 1, 2);
    const ball = pongBall(B, W, H, top, bot);
    // paddles chase the ball, the receiving one a little late
    const ph = 14;
    const lp = clamp(ball.k % 2 === 1 ? lerp(H / 2, ball.y, ease.out2(ball.s)) : ball.y + Math.sin(t * 3) * 3, top, bot - ph);
    const rp = clamp(ball.k % 2 === 0 ? lerp(H / 2, ball.y, ease.out2(ball.s)) : ball.y + Math.sin(t * 2.6) * 3, top, bot - ph);
    const lose = ball.k >= PONG_T.length - 2;
    g.fillStyle = PAL.blue;
    g.fillRect(4, Math.round(lose ? lp + 12 : lp - ph / 2), 2, ph);
    g.fillStyle = PAL.green;
    g.fillRect(W - 6, Math.round(rp - ph / 2), 2, ph);
    // ball with a short trail
    for (let k = 3; k >= 0; k--) {
      const p = pongBall(B - k * 0.012, W, H, top, bot);
      g.fillStyle = k ? `rgba(236,230,214,${0.25 / k})` : '#ffffff';
      g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
    }
    // score and rally counter
    const scored = lose && ball.s > 0.5;
    text(g, '0', W / 2 - 10, padT, PAL.blue, 2);
    text(g, scored ? '1' : '0', W / 2 + 10, padT, PAL.green, 2);
    const rally = Math.min(ball.k + 1, 7);
    if (!lose) {
      const pop = 1 + (ball.s < 0.15 ? 1 : 0);
      text(g, `RALLY ${rally}`, W / 2, bot + 4, rally > 4 ? PAL.yellow : PAL.paper, pop);
      // a flash where the ball meets a paddle
      if (ball.s < 0.12 && ball.k > 0) {
        const hx = ball.k % 2 === 1 ? W - 7 : 6;
        const rr = Math.round(2 + ball.s * 40);
        g.fillStyle = ball.k % 2 === 1 ? PAL.green : PAL.blue;
        g.fillRect(hx - rr, Math.round(ball.y), rr * 2, 1);
        g.fillRect(hx, Math.round(ball.y) - rr, 1, rr * 2);
      }
    } else {
      text(g, 'GREEN SCORES', W / 2, H * 0.45, PAL.green, 1);
    }
    sprite(g, 3, bot + 2, blink, 1);
    return;
  }

  if (B < A.glitch[1]) {
    // ---- BREAKOUT
    buildBreakout(W, H, padT, padB);
    const k = seg(B, A.brk[0], A.brk[0] + 0.15);
    for (const br of bricks) {
      // bricks drop in at the start, then get knocked out
      const fallIn = ease.outBounce(clamp(k * 1.3 - (br.x % 7) * 0.03));
      const y0 = lerp(-10, br.y, fallIn);
      if (B < br.hit) {
        g.fillStyle = br.c;
        g.fillRect(br.x, Math.round(y0), 4, 3);
      } else {
        const dt = (B - br.hit) * 6;
        const x = br.x + br.vx * dt, y = br.y + dt * 10 + dt * dt * 60;
        if (y < H) {
          g.fillStyle = br.c;
          g.fillRect(Math.round(x), Math.round(y), 2, 2);
        }
      }
    }
    const q = seg(B, A.brk[0] + 0.12, A.brk[1] - 0.12);
    const padY = H - padB - 3;
    const [bx, by] = q > 0 ? alongPath(q) : [W / 2, padY - 3];
    const padX = clamp(q > 0 ? lerp(W / 2, bx, 0.6) : W / 2, 8, W - 8);
    g.fillStyle = PAL.green;
    g.fillRect(Math.round(padX - 8), padY, 16, 2);
    g.fillStyle = '#ffffff';
    g.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 3, 3);
    const left = bricks.filter((b) => B < b.hit).length;
    text(g, `${String(left).padStart(2, '0')}`, W - 8, padT - 6, PAL.paper, 1);
    if (q >= 1) text(g, 'LEVEL CLEAR!', W / 2, H * 0.5, PAL.yellow, 1);
    sprite(g, 2, H - padB - 10 - (q >= 1 ? Math.abs(Math.sin(t * 10)) * 5 : 0), blink, 1);
    if (B > A.glitch[0]) text(g, 'SIGNAL LOST', W / 2, H * 0.62, PAL.red, 1);
    return;
  }
}

export const ARCADE = A;
