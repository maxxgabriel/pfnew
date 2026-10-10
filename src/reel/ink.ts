import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { layoutWord, wordWidth } from '../core/glyphs';
import { type Pt, TAU, clamp, ease, lerp, rng, seg } from '../core/math';
import { paperTile } from '../core/sprites';
import { F, font } from '../core/style';
import { drawSeal } from '../acts/ink';
import { CLASHES, SEAL, drawDuel, impactNow } from './duel';
import { type Cam, PIG, PW, applyCam, camAt, camZoom, drawLandscape, drawSheet, fadeSides, mixHex, trimToSheet } from './painting';

/*
 * I · INK.
 *
 * A name brushed onto paper. Two drops of pigment fall down the sheet and
 * land as two fighters. Every cut they make stays on the paper and flows
 * into a landscape, until the camera pulls back and the fight has painted a
 * whole hanging scroll.
 *
 * The chapter's current runs DOWN (ink falls, the camera tilts down the
 * sheet); UP is kept for the reveals (the moon, the pull-back, and the lift
 * into the next chapter's sky).
 */

const DROPS = [0.6, 1.3] as const;
/** the scroll is whole from here on */
export const INK_DONE = 9.0;

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
  const [d0, d1] = DROPS;
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


/* ------------------------------------------------------------- the chapter */

let tile: HTMLCanvasElement | null = null;
let bgPat: CanvasPattern | null = null;

export function drawInk(f: Frame) {
  const { ctx, w, h, B } = f;
  if (!tile) tile = paperTile(512, PIG.paper);
  if (!bgPat) bgPat = ctx.createPattern(tile, 'repeat');
  // one-shot hits as the playhead passes a clash or the flash
  for (const [c, , , st] of CLASHES) if (f.crossedFwd(c)) f.shake(Math.min(w, h) * 0.018 * st);
  if (f.crossedFwd(7.6)) f.flash(0.35, PIG.goldHi);
  if (f.crossedFwd(SEAL.at)) f.shake(Math.min(w, h) * 0.012);
  drawPainting(f);
  if (impactNow(B)) {
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/** where a point of the painting is on screen at beat B */
export function inkToScreen(f: Frame, x: number, y: number, B = f.B): Pt {
  const cam: Cam = camAt(CAM, B);
  const z = camZoom(f.w, f.h, cam.vw);
  const dx = (x - cam.x) * z, dy = (y - cam.y) * z;
  const c = Math.cos(cam.rot), s = Math.sin(cam.rot);
  return [f.w / 2 + dx * c - dy * s, f.h / 2 + dx * s + dy * c];
}
