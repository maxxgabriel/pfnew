import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { layoutWord, wordWidth } from '../core/glyphs';
import { type Pt, TAU, clamp, ease, lerp, rng, seg } from '../core/math';
import { paperTile } from '../core/sprites';
import { C, F, font } from '../core/style';
import { drawSeal } from '../acts/ink';
import { drawMachine } from '../acts/machine';
import { CLASHES, SEAL, drawDuel, impactNow } from './duel';
import { PIG, PW, applyCam, camAt, camZoom, drawBirds, drawLandscape, drawSheet, fadeSides, mixHex, trimToSheet } from './painting';

/*
 * THE REEL — chapter I, INK, and the cut into II, MACHINE.
 *
 * A name brushed onto paper. Two drops of pigment fall down the sheet and
 * land as two fighters. Every cut they make stays on the paper and flows
 * into a landscape, until the camera pulls back and the fight has painted a
 * whole hanging scroll. Then a word slams onto the painting in poster
 * colours and the camera dives through it into the next world.
 *
 * The chapter's current runs DOWN (ink falls, the camera tilts down the
 * sheet); UP is kept for the reveals (the moon, the pull-back).
 */

export const REEL = {
  drops: [0.6, 1.3] as const,
  reveal: 8.75,
  slam: [10.0, 11.3] as const,
  machine: [11.3, 12.8] as const,
  END: 13.2,
};

export const REEL_CHAPTERS = [
  { at: 0, n: 'I', name: 'Ink' },
  { at: 11.0, n: 'II', name: 'Machine' },
];

// [beat, x, y, view width, rotation] in painting units
const CAM: [number, number, number, number, number][] = [
  [0, 500, -470, 1000, 0],
  [0.55, 500, -450, 1000, 0],
  [1.3, 500, 1640, 900, 0],
  [1.9, 500, 1660, 860, 0],
  [2.5, 500, 1690, 760, 0],
  [2.77, 500, 1700, 690, 0],
  [2.9, 520, 1680, 840, 0],
  [3.3, 500, 1430, 1180, 0],
  [3.62, 470, 1500, 1060, 0],
  [3.8, 380, 1640, 900, 0],
  [4.06, 320, 1000, 1020, -0.035],
  [4.45, 310, 700, 860, 0],
  [4.95, 300, 610, 700, 0],
  [5.35, 310, 600, 760, 0.025],
  [5.75, 360, 640, 960, 0],
  [6.05, 300, 600, 640, 0],
  [6.48, 300, 590, 520, -0.045],
  [6.68, 420, 600, 900, 0],
  [7.0, 560, 470, 1000, 0],
  [7.22, 480, 1640, 1000, 0],
  [7.52, 300, 1680, 640, 0],
  [7.6, 500, 1690, 1080, 0],
  [7.86, 640, 1660, 880, 0],
  [8.3, 360, 1060, 1700, 0],
  [8.75, 500, 1100, 1090, 0],
  [10.0, 500, 1100, 1060, 0],
  [13.2, 500, 1100, 1060, 0],
];

let tile: HTMLCanvasElement | null = null;
let bgPat: CanvasPattern | null = null;

export function drawReel(f: Frame) {
  const { ctx, w, h, B } = f;
  if (!tile) tile = paperTile(512, PIG.paper);
  if (!bgPat) bgPat = ctx.createPattern(tile, 'repeat');

  // one-shot hits as the playhead passes a clash or the flash
  for (const [c, , , st] of CLASHES) if (f.crossedFwd(c)) f.shake(Math.min(w, h) * 0.018 * st);
  if (f.crossedFwd(7.6)) f.flash(0.35, PIG.goldHi);
  if (f.crossedFwd(SEAL.at)) f.shake(Math.min(w, h) * 0.012);

  if (B >= REEL.machine[0]) {
    drawMachineWorld(f);
    return;
  }

  const slam = seg(B, REEL.slam[0], REEL.slam[1]);
  const dive = slam > 0 ? diveState(f, slam) : null;
  if (dive && dive.dk > 0) drawMachineWorld(f);

  ctx.save();
  if (dive && dive.dk > 0) {
    // everything but the counter of the A: the next world shows through the hole
    ctx.beginPath();
    ctx.rect(-w, -h, w * 3, h * 3);
    ctx.arc(dive.hx, dive.hy, Math.max(0, dive.hr), 0, TAU);
    ctx.clip('evenodd');
  }
  if (dive) {
    // the painting rides the dive with the word that landed on it
    ctx.translate(dive.cx, dive.cy);
    ctx.scale(dive.Z, dive.Z);
    ctx.translate(-dive.cx0, -dive.cy0);
  }
  drawPainting(f);
  if (dive) drawWord(f, dive);
  ctx.restore();

  if (impactNow(B)) {
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/* --------------------------------------------------------- the painting */

function drawPainting(f: Frame) {
  const { ctx, w, h, B, t } = f;
  // until the reveal the paper around the sheet matches it, so its edge never shows
  const edge = ease.inOut2(seg(B, 8.05, 8.7));
  ctx.fillStyle = mixHex(PIG.sheet, '#ddd4c2', edge);
  ctx.fillRect(-w, -h, w * 3, h * 3);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = bgPat!;
  ctx.fillRect(-w, -h, w * 3, h * 3);
  ctx.restore();
  const cam = camAt(CAM, B);
  ctx.save();
  applyCam(ctx, cam, w, h);
  drawSheet(ctx, tile!, edge);
  drawTitle(f);
  drawLandscape(ctx, B, t);
  const around = mixHex(PIG.sheet, '#ddd4c2', edge);
  fadeSides(ctx, around);
  trimToSheet(ctx, edge, around);
  drawBirds(ctx, B, t);
  drawDrops(ctx, B);
  drawDuel(f, ctx, B, t);
  drawInscription(ctx, B);
  ctx.restore();
}

/* ------------------------------------------------------------- the title */

const MAX_SIZE = 300, GAB_SIZE = 118;
let titleStrokes: { pts: Pt[]; order: number; size: number; word: number }[] | null = null;

function drawTitle(f: Frame) {
  const { ctx, B } = f;
  if (B > 1.6) return;
  if (!titleStrokes) {
    const m = layoutWord('MAX', PW / 2 - wordWidth('MAX', MAX_SIZE, 0.16) / 2, -820, MAX_SIZE, 0.16);
    const g = layoutWord('GABRIEL', PW / 2 - wordWidth('GABRIEL', GAB_SIZE, 0.2) / 2, -430, GAB_SIZE, 0.2);
    titleStrokes = [
      ...m.strokes.map((s) => ({ pts: s.pts, order: s.order, size: MAX_SIZE, word: 0 })),
      ...g.strokes.map((s) => ({ pts: s.pts, order: s.order, size: GAB_SIZE, word: 1 })),
    ];
  }
  const I = f.intro;
  const nM = titleStrokes.filter((s) => s.word === 0).length;
  const nG = titleStrokes.length - nM;
  for (const s of titleStrokes) {
    // each stroke is written in turn: MAX, then GABRIEL
    const [a0, a1, n] = s.word === 0 ? [0.25, 1.55, nM] : [1.45, 2.55, nG];
    const step = (a1 - a0) / n;
    const p = ease.out2(clamp((I - a0 - s.order * step) / (step * 1.6)));
    if (p <= 0) continue;
    brush(ctx, s.pts, { width: s.size * (s.word === 0 ? 0.13 : 0.12), color: PIG.ink, progress: p, seed: 7 + s.order + s.word * 20, dry: 0.4, press: 1.35, tail: 0.3 });
  }
  const sub = seg(I, 2.5, 3.1);
  if (sub > 0) {
    ctx.save();
    ctx.globalAlpha = sub;
    ctx.font = font(30, F.serif, 600);
    ctx.textAlign = 'center';
    ctx.fillStyle = PIG.inkMid;
    ctx.fillText('designs and builds things that move.', PW / 2, -250 + (1 - ease.out3(sub)) * 12);
    ctx.restore();
  }
  // the seal lands beside the name
  const st = seg(I, 2.75, 2.95);
  if (st > 0) drawSeal(ctx, PW / 2 + wordWidth('GABRIEL', GAB_SIZE, 0.2) / 2 + 60, -372, 64 * lerp(1.5, 1, ease.out3(st)), -0.06, Math.min(1, st * 2));
  // a quiet nudge to scroll, once everything has landed
  const hint = seg(I, 3.4, 4.0) * (1 - seg(B, 0.05, 0.3));
  if (hint > 0) {
    ctx.save();
    ctx.globalAlpha = hint * (0.55 + 0.45 * Math.sin(f.t * 2.4));
    ctx.font = font(24, F.serif, 600);
    ctx.textAlign = 'center';
    ctx.fillStyle = PIG.inkMid;
    ctx.fillText('scroll', PW / 2, -110);
    ctx.strokeStyle = PIG.inkMid;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(PW / 2, -88);
    ctx.lineTo(PW / 2, -40 + Math.sin(f.t * 2.4) * 6);
    ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------------------------------------- the drops */

/** two drops of pigment fall the length of the sheet and land as the fighters */
function drawDrops(ctx: CanvasRenderingContext2D, B: number) {
  const [d0, d1] = REEL.drops;
  const k = seg(B, d0, d1);
  if (k <= 0) return;
  const land = 1842;
  ([[300, PIG.blue, 0], [700, PIG.green, 0.04]] as const).forEach(([x, col, lag]) => {
    const kk = clamp((k - lag) / (1 - lag));
    if (kk <= 0) return;
    if (kk < 1) {
      const e = ease.in2(kk);
      const y = lerp(-180, land, e);
      const v = kk * 2; // speed, for the stretch
      const r = 22;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1 / Math.sqrt(1 + v * 0.5), 1 + v * 0.5);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -r * 2.2);
      ctx.quadraticCurveTo(r * 1.05, -r * 0.3, r, r * 0.2);
      ctx.arc(0, r * 0.2, r, 0, Math.PI);
      ctx.quadraticCurveTo(-r * 1.05, -r * 0.3, 0, -r * 2.2);
      ctx.fill();
      ctx.fillStyle = 'rgba(246,242,232,0.7)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, -r * 0.1, r * 0.18, r * 0.32, 0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }
    // the crown of the splash, thrown up as it lands
    const s = seg(B, d1, d1 + 0.22);
    if (s >= 1) return;
    const r = rng(x);
    ctx.fillStyle = col;
    for (let i = 0; i < 14; i++) {
      const an = -Math.PI / 2 + (r() - 0.5) * 2.4, v = 60 + r() * 140;
      const q = ease.out3(s);
      ctx.globalAlpha = 1 - s;
      ctx.beginPath();
      ctx.arc(x + Math.cos(an) * v * q, land + Math.sin(an) * v * q + s * s * 120, 4 + r() * 6, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

/* ------------------------------------------------- the seal and the name */

function drawInscription(ctx: CanvasRenderingContext2D, B: number) {
  const st = seg(B, SEAL.at, SEAL.at + 0.08);
  if (st <= 0) return;
  drawSeal(ctx, SEAL.x, SEAL.y, SEAL.size * lerp(1.6, 1, ease.out3(st)), 0.04, Math.min(1, st * 3));
  // the artist's inscription, written down the corner above the seal
  const word = 'MAX GABRIEL';
  ctx.save();
  ctx.font = font(44, F.serif, 800);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PIG.ink;
  [...word].forEach((ch, i) => {
    const a = seg(B, SEAL.at + 0.1 + i * 0.045, SEAL.at + 0.2 + i * 0.045);
    if (a <= 0 || ch === ' ') return;
    ctx.globalAlpha = a;
    ctx.fillText(ch, SEAL.x, 150 + i * 40 + (1 - ease.out3(a)) * -10);
  });
  ctx.restore();
}

/* --------------------------------------------------------- MACHINE slams */

const WORD = 'MACHINE';
const THROUGH = 1;
const PX = 300;
const LETTER = [C.red, '#ffd23e', C.blue, C.paper, C.red, '#ffd23e', C.blue];

interface Dive { dk: number; s: number; base: number; total: number; widths: number[]; tx: number; ty: number; cx: number; cy: number; cx0: number; cy0: number; Z: number; hx: number; hy: number; hr: number }

let hole: { x: number; y: number; r: number; key: string } | null = null;
function counterOf(ch: string, fam: string) {
  const key = `${ch}|${fam}|${document.fonts?.check?.(`${PX}px ${fam}`) ?? ''}`;
  if (hole?.key === key) return hole;
  const W = PX * 1.4, H = PX * 1.4;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.font = font(PX, fam);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(ch, W / 2, H / 2);
  const d = g.getImageData(0, 0, W, H).data;
  const seen = new Uint8Array(W * H);
  const stack: number[] = [];
  const empty = (i: number) => d[i * 4 + 3] < 128;
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i] || !empty(i)) continue;
    seen[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < W * H; i++) if (!seen[i] && empty(i)) { sx += i % W; sy += (i / W) | 0; n++; }
  hole = n > 20 ? { x: sx / n - W / 2, y: sy / n - H / 2, r: Math.sqrt(n / Math.PI), key } : { x: 0, y: -PX * 0.1, r: PX * 0.06, key };
  return hole;
}

function diveState(f: Frame, p: number): Dive {
  const { ctx, w, h } = f;
  ctx.save();
  ctx.font = font(PX, F.display);
  const widths = [...WORD].map((ch) => ctx.measureText(ch).width * 0.98);
  ctx.restore();
  const total = widths.reduce((a, b) => a + b, 0);
  const base = (w * 0.94) / total;
  const H = counterOf(WORD[THROUGH], F.display);
  let ax = -total / 2;
  for (let i = 0; i < THROUGH; i++) ax += widths[i];
  ax += widths[THROUGH] / 2;
  const tx = ax + H.x, ty = H.y;
  const dk = ease.in3(seg(p, 0.55, 1));
  const need = (Math.hypot(w, h) * 1.2) / (H.r * base);
  const s = base * Math.exp(Math.log(need) * dk);
  const rest = { x: w / 2, y: h * 0.44 };
  const cx0 = rest.x + tx * base, cy0 = rest.y + ty * base;
  const pull = ease.inOut2(seg(p, 0.5, 0.75));
  const cx = lerp(cx0, w / 2, pull), cy = lerp(cy0, h * 0.44, pull);
  return { dk, s, base, total, widths, tx, ty, cx, cy, cx0, cy0, Z: s / base, hx: cx, hy: cy, hr: H.r * s * 0.86 };
}

function drawWord(f: Frame, d: Dive) {
  const { ctx, w, h, t } = f;
  const p = seg(f.B, REEL.slam[0], REEL.slam[1]);
  const S = Math.min(w, h);
  // the context already carries the painting's dive (about the counter, × Z); the word's own
  // transform is the same dive at the word's base scale, so undo Z and lay the word out at `base`
  ctx.save();
  ctx.translate(d.cx0, d.cy0);
  ctx.scale(d.base, d.base);
  ctx.rotate(-0.05 * (1 - d.dk));
  ctx.translate(-d.tx, -d.ty);
  ctx.font = font(PX, F.display);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let x = -d.total / 2;
  [...WORD].forEach((ch, i) => {
    const lx = x + d.widths[i] / 2;
    x += d.widths[i];
    const a0 = 0.03 + i * 0.055;
    const k = seg(p, a0, a0 + 0.08);
    if (k <= 0) return;
    if (f.crossedFwd(REEL.slam[0] + (REEL.slam[1] - REEL.slam[0]) * (a0 + 0.08))) f.shake(S * 0.03);
    const sc = lerp(3.4, 1, ease.outBack(k, 1.7));
    ctx.save();
    ctx.translate(lx, 0);
    ctx.scale(sc, sc);
    ctx.rotate((1 - k) * (i % 2 ? 0.25 : -0.25));
    ctx.globalAlpha = Math.min(1, k * 3);
    ctx.lineJoin = 'round';
    // screen print: a hard ink drop, a flat colour face, an ink keyline, slightly off register
    ctx.fillStyle = C.ink;
    ctx.fillText(ch, PX * 0.06, PX * 0.06);
    ctx.fillStyle = LETTER[i];
    ctx.fillText(ch, PX * 0.012 * Math.sin(t * 3 + i), 0);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = PX * 0.025;
    ctx.strokeText(ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

/* ------------------------------------------------------- the next world */

function drawMachineWorld(f: Frame) {
  const k = seg(f.B, REEL.slam[0] + (REEL.slam[1] - REEL.slam[0]) * 0.6, REEL.machine[1]);
  // the machine plays its opening: the ball dropped onto the poster and rolling into MAKE
  const fb = lerp(7.72, 8.9, k);
  drawMachine({ ...f, B: fb, crossed: () => false, crossedFwd: () => false });
}

/** a tap drops ink onto whatever is under the finger (a quiet answer, never blocks scrolling) */
export function reelTap(_x: number, _y: number) {}

void camZoom;
