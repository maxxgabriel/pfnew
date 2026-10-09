import type { Frame } from '../core/frame';
import { clamp, ease, lerp, seg } from '../core/math';
import { artImage, artSize, queueArt } from '../sketch/art';
import { bgImage } from '../sketch/bg';
import { INK, RED } from '../sketch/common';
import { CHAPTERS, chapterAt } from '../reel/reel';
import { HM } from '../sketch/home';
import { type Shot, isRest, matrix, mix, rest, unproject } from './camera';
import { deskOn } from './layout';
import { live } from './live';
import { PHOTO_W, drawLight, drawOver, drawScreen, drawUnder, jolt, leafAngle, leafCapture, queueStory, storyCues } from './story';

/** the margins beside the sheet where the act's things lie (desk units: CSS pixels) */
interface Desk { mw: number }

/*
 * THE DESK (round 28; the owner: "a lot of blank spaces… sketches, doodles,
 * stickers, handwritten, scribble, comic… be bold").
 *
 * On a wide screen the picture's sides become the animator's desk, and it
 * lives with the film:
 *   left   two taped sketchbook scraps for the act on screen (crossed out in
 *          red pencil and slid away as the act ends), and a flipbook whose
 *          pencil test turns its pages with the playhead (and riffles by
 *          itself when the reader stops);
 *   right  the exposure sheet: its rows run under a red line with the
 *          playhead, and its notes get written in as their frames come up;
 *          a sticker slaps onto it for every act finished (drag and flick them);
 *   all    the mouse is a brush: drag to paint, click to splat (it dries away).
 * Everything but the stickers you threw and the ink you painted is a pure
 * function of the playhead, so scrolling back runs the desk backwards too.
 */

const HAND = '"Caveat", "Segoe Print", cursive';
const PAPER_D = '#f3eee2';

/* ------------------------------------------------------------ the art */

/** the act's two scraps (scripts/gen-desk.sh scraps_*) */
const SCRAPS = [
  ['scrap1_0', 'scrap1_1'], ['scrap1_2', 'scrap1_3'], ['scrap2_0', 'scrap2_1'], ['scrap2_2', 'scrap2_3'],
  ['scrap3_0', 'scrap3_1'], ['scrap3_2', 'scrap3_3'], ['scrap4_0', 'scrap4_1'], ['scrap4_2', 'scrap4_3'],
];
/** the flipbook's pencil test, per act */
const PENCIL = [
  ['pencil1_0', 'pencil1_1'], ['pencil1_2', 'pencil1_3', 'pencil1_4', 'pencil1_5'], ['pencil1_6', 'pencil1_7', 'pencil2_0', 'pencil2_1'],
  ['pencil2_2', 'pencil2_3'], ['pencil2_4', 'pencil2_5'], ['pencil2_6', 'pencil2_7', 'pencil3_0'], ['pencil3_1', 'pencil3_2', 'pencil3_3'],
  ['pencil3_4', 'pencil3_5', 'pencil3_6', 'pencil3_7'],
];
/** one sticker for every act finished: ink, pixel, clay, watercolour, chalk, comic, rubber hose */
const STICKERS = ['stick1_0', 'stick1_1', 'stick1_2', 'stick1_3', 'stick2_0', 'stick2_1', 'stick2_2'];

let queued = false;
function queueDesk() {
  if (queued) return;
  queued = true;
  // after the film's own drawings, in the order the acts need them
  SCRAPS.forEach((s, i) => s.forEach((k) => queueArt(k, 60 + i * 3)));
  PENCIL.forEach((s, i) => s.forEach((k) => queueArt(k, 61 + i * 3)));
  STICKERS.forEach((k, i) => queueArt(k, 62 + i * 3));
  document.fonts?.load(`700 20px ${HAND}`).catch(() => {});
}

/** a drawing baked once with its soft drop shadow, at a given width */
const baked = new Map<string, HTMLCanvasElement>();
function bake(k: string, width: number, lift = 1) {
  const W = Math.max(8, Math.round(width));
  const id = `${k}@${W}@${lift}`;
  const hit = baked.get(id);
  if (hit) return hit;
  const im = artImage(k);
  if (!im) return null;
  const [aw, ah] = artSize(k);
  const H = Math.round((W * ah) / aw);
  const pad = Math.ceil(16 * lift);
  const c = document.createElement('canvas');
  c.width = W + pad * 2;
  c.height = H + pad * 2;
  const g = c.getContext('2d')!;
  g.shadowColor = 'rgba(20,12,4,0.38)';
  g.shadowBlur = 9 * lift;
  g.shadowOffsetX = 2 * lift;
  g.shadowOffsetY = 4 * lift;
  g.drawImage(im, pad, pad, W, H);
  baked.set(id, c);
  return c;
}
function drawBaked(ctx: CanvasRenderingContext2D, k: string, cx: number, cy: number, width: number, rot = 0, alpha = 1, lift = 1) {
  const c = bake(k, width, lift);
  if (!c) return;
  ctx.save();
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);
  ctx.globalAlpha *= alpha;
  const s = width / Math.round(width);
  ctx.drawImage(c, (-c.width / 2) * s, (-c.height / 2) * s, c.width * s, c.height * s);
  ctx.restore();
}

/** a little seeded random */
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** a pencil line drawn on from a to b as k runs 0→1 (a little wobble, a heavier middle) */
function pencilLine(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, k: number, seed: number) {
  if (k <= 0) return;
  const n = 14;
  ctx.beginPath();
  for (let i = 0; i <= n * k; i++) {
    const u = i / n;
    const wob = Math.sin(u * 9 + seed) * 1.6;
    const x = lerp(ax, bx, u) - (by - ay) * 0.012 * wob, y = lerp(ay, by, u) + (bx - ax) * 0.012 * wob;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

/* ------------------------------------------------------------ left: the scraps */

function drawScraps(f: Frame, d: Desk, ci: number) {
  const { ctx, h, B } = f;
  const c = CHAPTERS[ci];
  const L = B - c.from;
  const len = c.name === 'Home' ? HM.offer : c.to - c.from;
  const sw = Math.min(d.mw * 0.74, h * 0.4);
  const SLOTS: [number, number, number][] = [[0.5, 0.27, -0.06], [0.47, 0.53, 0.05]];
  SCRAPS[ci].forEach((k, j) => {
    const [fx, fy, r0] = SLOTS[j];
    // slapped on as the act begins (the second a beat later)…
    const kin = seg(L, j * 0.25, j * 0.25 + 0.45);
    if (kin <= 0) return;
    // …crossed out in red pencil and slid away as it ends
    const kx = seg(L, len - 0.75, len - 0.35);
    const kout = ease.in2(seg(L, len - 0.4 + j * 0.06, len - 0.02));
    if (kout >= 1) return;
    const drop = ease.outBack(kin);
    const x = d.mw * fx - kout * d.mw * 1.1;
    const y = h * fy - (1 - drop) * h * 0.05;
    const rot = r0 + (1 - drop) * 0.12 * (j ? -1 : 1) - kout * 0.4 + Math.sin(f.t * 0.7 + j * 2) * 0.004;
    const scale = 1 + (1 - drop) * 0.12;
    const sh = sw * (artSize(k)[1] / artSize(k)[0]);
    drawBaked(ctx, k, x, y, sw * scale, rot, clamp(kin * 2), 1 + (1 - drop) * 1.5);
    if (kx > 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.strokeStyle = 'rgba(214,40,26,0.85)';
      ctx.lineWidth = Math.max(2, sw * 0.012);
      ctx.lineCap = 'round';
      const hw = sw * 0.36, hh = sh * 0.32;
      pencilLine(ctx, -hw, -hh, hw, hh, seg(kx, 0, 0.5), 1 + j);
      pencilLine(ctx, hw, -hh * 0.9, -hw, hh * 1.05, seg(kx, 0.5, 1), 4 + j);
      ctx.restore();
    }
  });
}

/* ------------------------------------------------------------ left: the flipbook */

/** which pencil frames are up: this page, the next, and how far the page between them has turned */
function flipState(f: Frame, ci: number): [string, string, number, number] {
  const c = CHAPTERS[ci];
  const set = PENCIL[ci];
  const n = set.length;
  if (f.idle > 1.6 && !f.reduced) {
    // the reader stopped: the pencil test riffles through the act's pages by itself
    const q = (f.t * 3) % n;
    const i = Math.floor(q);
    return [set[i], set[(i + 1) % n], seg(q - i, 0.62, 1), i];
  }
  const q = clamp(((f.B - c.from) / (c.to - c.from)) * n, 0, n - 0.0001);
  const i = Math.floor(q);
  const next = i + 1 < n ? set[i + 1] : (PENCIL[ci + 1] ?? PENCIL[0])[0];
  return [set[i], next, seg(q - i, 0.8, 1), i];
}

function drawPencilPage(ctx: CanvasRenderingContext2D, k: string, x: number, y: number, pw: number, ph: number) {
  ctx.fillStyle = '#fbf8f0';
  ctx.fillRect(x, y, pw, ph);
  const im = artImage(k);
  if (!im) return;
  // one scale for the whole test (the sheets were drawn at one size), feet on one line
  const s = (ph * 0.8) / 320;
  const [aw, ah] = artSize(k);
  ctx.drawImage(im, x + pw / 2 - (aw * s) / 2, y + ph * 0.9 - ah * s, aw * s, ah * s);
}

function drawFlipbook(f: Frame, d: Desk, ci: number) {
  const { ctx, h } = f;
  const pw = Math.min(d.mw * 0.44, h * 0.19), ph = pw * 1.18;
  const cx = d.mw * 0.5, cy = h * 0.79;
  const x0 = -pw / 2, y0 = -ph / 2;
  const [cur, next, p, idx] = flipState(f, ci);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.035);
  // the pad: its depth, a shadow, the board at the back
  ctx.save();
  ctx.shadowColor = 'rgba(20,12,4,0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#5a3e2b';
  ctx.fillRect(x0 - 3, y0 - 3, pw + 10, ph + 12);
  ctx.restore();
  for (let i = 4; i >= 1; i--) {
    ctx.fillStyle = i % 2 ? '#e9e2d2' : '#f6f1e5';
    ctx.fillRect(x0 + i * 1.2, y0 + i * 1.6, pw, ph);
  }
  // the page under, then the page turning off it (bound at the top: it lifts and folds up and away)
  drawPencilPage(ctx, p > 0 ? next : cur, x0, y0, pw, ph);
  if (p > 0 && p < 1) {
    const lift = 1 - ease.in2(p);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, pw, ph * lift);
    ctx.clip();
    ctx.translate(0, y0);
    ctx.scale(1, lift);
    drawPencilPage(ctx, cur, x0, 0, pw, ph);
    ctx.fillStyle = `rgba(60,40,20,${0.3 * (1 - lift)})`;
    ctx.fillRect(x0, 0, pw, ph);
    ctx.restore();
    // the curl's edge
    ctx.fillStyle = `rgba(30,20,10,${0.25 * (1 - lift)})`;
    ctx.fillRect(x0, y0 + ph * lift, pw, Math.max(2, ph * 0.03));
  }
  // the binding clip and the page number, circled in red pencil like an animator's key
  ctx.fillStyle = '#26211d';
  ctx.fillRect(x0 + pw * 0.3, y0 - 6, pw * 0.4, 9);
  ctx.fillStyle = '#8c8f94';
  ctx.fillRect(x0 + pw * 0.33, y0 - 4, pw * 0.34, 3);
  const num = PENCIL.slice(0, ci).reduce((a, s) => a + s.length, 0) + idx + 1;
  ctx.font = `700 ${Math.round(pw * 0.13)}px ${HAND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(40,36,32,0.85)';
  ctx.fillText(String(num), x0 + pw * 0.86, y0 + ph * 0.1);
  ctx.strokeStyle = 'rgba(214,40,26,0.8)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(x0 + pw * 0.86, y0 + ph * 0.1, pw * 0.09, pw * 0.075, 0.2, 0.3, Math.PI * 2.15);
  ctx.stroke();
  ctx.restore();
  // its label under it
  ctx.save();
  ctx.font = `600 ${Math.round(pw * 0.12)}px ${HAND}`;
  ctx.textAlign = 'center';
  const label = `pencil test · sc. ${CHAPTERS[ci].n}`;
  const ly = cy + ph * 0.5 + pw * 0.19, lw = ctx.measureText(label).width + pw * 0.16;
  ctx.translate(cx, ly);
  ctx.rotate(0.03);
  ctx.fillStyle = 'rgba(226,206,160,0.92)';
  ctx.fillRect(-lw / 2, -pw * 0.1, lw, pw * 0.17);
  ctx.fillStyle = 'rgba(30,26,22,0.85)';
  ctx.fillText(label, 0, pw * 0.03);
  ctx.restore();
}

/* ------------------------------------------------------------ right: the exposure sheet */

/** notes on the sheet: [film beat, note, red pencil?] */
const NOTES: [number, string, boolean][] = [];
{
  const at = (n: string, l: number) => CHAPTERS.find((c) => c.name === n)!.from + l;
  const add = (n: string, l: number, s: string, red = false) => NOTES.push([at(n, l), s, red]);
  add('Still', 0.15, 'one line — boil on 2s');
  add('Still', 1.6, 'spark drops: squash!', true);
  add('Run', 0.4, 'first steps, ease in');
  add('Run', 1.6, 'walk cycle — 8 dwgs');
  add('Run', 3.75, 'run on 2s, lean in');
  add('Run', 4.0, 'style swap ×5', true);
  add('Run', 6.0, 'flip — smear!');
  add('Run', 8.0, 'rubber hose gag');
  add('Run', 8.6, 'iris out', true);
  add('Fold', 0.3, 'fall — hold the scream');
  add('Fold', 5.4, 'crane — slow in');
  add('Wave', 1.9, 'wave stands up');
  add('Wave', 3.2, 'tube: hold 6', true);
  add('Wave', 4.5, 'flip into the dark');
  add('Deep', 0.9, 'whale — FEEL the size');
  add('Deep', 3.9, 'one bulb', true);
  add('Light', 1.4, 'shadow copies him');
  add('Light', 3.3, 'red blade up — slow');
  add('Light', 5.2, 'BULLET TIME → hold', true);
  add('Light', 6.25, 'swing on the cord');
  add('Chase', 0.55, 'broom! hat!');
  add('Chase', 1.7, 'wink at camera ;)', true);
  add('Chase', 2.4, 'loop the loop');
  add('Chase', 6.95, 'paint the slide');
  add('Home', 2.2, '360° — camera orbits', true);
  add('Home', 4.45, 'spin — fire!');
  add('Home', 6.7, 'offer the brush. HOLD');
  add('Home', 9.9, 'walk off… peek');
  add('Home', 12.2, 'loop → sc. I', true);
  NOTES.sort((a, b) => a[0] - b[0]);
}
/** rows of the sheet per beat (one row a frame; the heavy line every beat) */
const ROWS = 8;

function drawXSheet(f: Frame, d: Desk, ci: number) {
  const { ctx, h, B } = f;
  const w = f.w;
  const sw = Math.min(d.mw * 0.62, h * 0.36);
  const x0 = w - d.mw * 0.5 - sw / 2, y0 = h * 0.085, y1 = h * 0.915;
  const sh = y1 - y0;
  ctx.save();
  ctx.translate(x0 + sw / 2, y0 + sh / 2);
  ctx.rotate(0.012);
  ctx.translate(-sw / 2, -sh / 2);
  // the sheet
  ctx.save();
  ctx.shadowColor = 'rgba(20,12,4,0.38)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = PAPER_D;
  ctx.fillRect(0, 0, sw, sh);
  ctx.restore();
  const fs = Math.max(11, sw * 0.062);
  const head = fs * 4.4;
  // the printed header
  ctx.strokeStyle = 'rgba(50,70,90,0.55)';
  ctx.fillStyle = 'rgba(50,70,90,0.7)';
  ctx.lineWidth = 1;
  ctx.font = `700 ${Math.round(fs * 0.62)}px "Dela Gothic One", sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText('EXPOSURE SHEET', fs * 0.5, fs * 1.0);
  ctx.font = `600 ${Math.round(fs * 0.48)}px "Shippori Mincho", serif`;
  ctx.fillText('PROD.', fs * 0.5, fs * 2.1);
  ctx.fillText('SC.', sw * 0.62, fs * 2.1);
  ctx.fillText('ANIM.', fs * 0.5, fs * 3.2);
  ctx.beginPath();
  for (const [a, b, yy] of [[fs * 1.8, sw * 0.58, 2.2], [sw * 0.72, sw - fs * 0.5, 2.2], [fs * 1.9, sw - fs * 0.5, 3.3]] as const) {
    ctx.moveTo(a, fs * yy); ctx.lineTo(b, fs * yy);
  }
  ctx.moveTo(0, head); ctx.lineTo(sw, head);
  ctx.stroke();
  // the handwriting in it
  ctx.fillStyle = 'rgba(28,26,30,0.9)';
  ctx.font = `700 ${Math.round(fs * 0.95)}px ${HAND}`;
  ctx.fillText('The Sketch', fs * 1.95, fs * 2.05);
  ctx.fillText(`${CHAPTERS[ci].n} — ${CHAPTERS[ci].name}`, sw * 0.73, fs * 2.05);
  ctx.fillText('M. Gabriel', fs * 2.05, fs * 3.15);

  // the columns: frame | action | keys | camera
  const cFrame = sw * 0.12, cAct = sw * 0.7, cCells = sw * 0.86;
  const bodyTop = head, bodyH = sh - head;
  const rowH = Math.max(10, bodyH / 46);
  const nowY = bodyTop + bodyH * 0.36;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, bodyTop, sw, bodyH);
  ctx.clip();
  // rows (a heavy one every beat)
  const r0 = Math.floor(B * ROWS - (nowY - bodyTop) / rowH) - 1;
  const r1 = Math.ceil(B * ROWS + (bodyTop + bodyH - nowY) / rowH) + 1;
  const yOf = (r: number) => nowY + (r - B * ROWS) * rowH;
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = 'rgba(70,110,150,0.32)';
  ctx.beginPath();
  for (let r = r0; r <= r1; r++) {
    if (r % ROWS === 0) continue;
    const y = yOf(r);
    ctx.moveTo(0, y); ctx.lineTo(sw, y);
  }
  for (const x of [cFrame, cAct, cAct + (cCells - cAct) / 2, cCells]) { ctx.moveTo(x, bodyTop); ctx.lineTo(x, bodyTop + bodyH); }
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(70,110,150,0.6)';
  ctx.beginPath();
  for (let r = Math.ceil(r0 / ROWS) * ROWS; r <= r1; r += ROWS) { const y = yOf(r); ctx.moveTo(0, y); ctx.lineTo(sw, y); }
  ctx.stroke();
  // frame numbers every 4
  ctx.fillStyle = 'rgba(70,110,150,0.85)';
  ctx.font = `600 ${Math.round(rowH * 0.78)}px "Shippori Mincho", serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let r = Math.ceil(r0 / 4) * 4; r <= r1; r += 4) if (r > 0) ctx.fillText(String(r), cFrame - 3, yOf(r) - rowH / 2);
  // the chapter breaks: a double red rule and the scene written across
  ctx.textAlign = 'left';
  for (const c of CHAPTERS) {
    const y = yOf(c.from * ROWS);
    if (y < bodyTop - rowH * 3 || y > bodyTop + bodyH + rowH) continue;
    ctx.strokeStyle = 'rgba(214,40,26,0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, y - 1.5); ctx.lineTo(sw, y - 1.5);
    ctx.moveTo(0, y + 1.5); ctx.lineTo(sw, y + 1.5);
    ctx.stroke();
  }
  // the action column: the key drawings' track (a ruled line with a tick at every key), and the notes,
  // written in as the playhead reaches them
  ctx.strokeStyle = 'rgba(28,26,30,0.55)';
  ctx.lineWidth = 1.1;
  const cx = cAct + (cCells - cAct) * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, bodyTop);
  ctx.lineTo(cx, Math.min(nowY, bodyTop + bodyH));
  ctx.stroke();
  for (const [b, text, red] of NOTES) {
    const y = yOf(b * ROWS);
    if (y < bodyTop - rowH * 2 || y > bodyTop + bodyH + rowH * 2) continue;
    const k = seg(B, b - 0.05, b + 0.3);
    // the key: an x in the cells, circled in red where it is a hit
    ctx.strokeStyle = red ? 'rgba(214,40,26,0.85)' : 'rgba(28,26,30,0.7)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    const s = rowH * 0.32;
    ctx.moveTo(cx - s, y - rowH / 2 - s); ctx.lineTo(cx + s, y - rowH / 2 + s);
    ctx.moveTo(cx + s, y - rowH / 2 - s); ctx.lineTo(cx - s, y - rowH / 2 + s);
    ctx.stroke();
    if (k <= 0) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cFrame + 2, y - rowH * 2, (sw - cFrame - 4) * k, rowH * 3);
    ctx.clip();
    ctx.fillStyle = red ? 'rgba(206,38,24,0.95)' : 'rgba(28,26,30,0.92)';
    ctx.font = `700 ${Math.round(rowH * 1.45)}px ${HAND}`;
    ctx.fillText(text, cFrame + 4, y - rowH * 0.4);
    ctx.restore();
    if (red && /^hit/.test(text) && k >= 1) {
      ctx.strokeStyle = 'rgba(214,40,26,0.7)';
      ctx.beginPath();
      ctx.ellipse(cFrame * 0.55, y - rowH / 2, cFrame * 0.42, rowH * 0.75, -0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // the playhead: a highlighter band and a red pencil arrow
  ctx.fillStyle = 'rgba(255,214,60,0.38)';
  ctx.fillRect(0, nowY - rowH, sw, rowH);
  ctx.restore();
  ctx.strokeStyle = 'rgba(214,40,26,0.9)';
  ctx.fillStyle = 'rgba(214,40,26,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-fs * 1.1, nowY - rowH / 2);
  ctx.lineTo(-fs * 0.25, nowY - rowH / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-fs * 0.1, nowY - rowH / 2);
  ctx.lineTo(-fs * 0.45, nowY - rowH / 2 - fs * 0.25);
  ctx.lineTo(-fs * 0.45, nowY - rowH / 2 + fs * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------ stickers */

interface Thrown { x: number; y: number; vx: number; vy: number; rot: number; vr: number }
const thrown = new Map<number, Thrown>();
let held: { i: number; dx: number; dy: number; lx: number; ly: number; lt: number } | null = null;

function stickerSize(d: Desk, h: number) {
  return Math.min(d.mw * 0.3, h * 0.15);
}
/** where sticker i sits now (home on the sheet's edge, or where you threw it), its turn and its slap (0→1) */
function stickerAt(f: Frame, d: Desk, i: number): { x: number; y: number; rot: number; k: number } | null {
  const slapB = CHAPTERS[i + 1].from + 0.15;
  const k = seg(f.B, slapB, slapB + 0.4);
  if (k <= 0) { thrown.delete(i); return null; }
  const th = thrown.get(i);
  if (th) return { x: th.x, y: th.y, rot: th.rot, k: 1 };
  const sz = stickerSize(d, f.h);
  const xs = f.w - d.mw * 0.5 - Math.min(d.mw * 0.62, f.h * 0.36) / 2;
  return { x: xs - sz * (i % 2 ? 0.12 : 0.32), y: f.h * (0.2 + i * 0.1), rot: (rnd(i) - 0.5) * 0.5, k };
}

function drawStickers(f: Frame, d: Desk) {
  const { ctx, h } = f;
  const sz = stickerSize(d, h);
  // physics for the thrown ones
  for (const [i, th] of thrown) {
    if (held?.i === i) continue;
    const fr = Math.exp(-f.dt * 3.2);
    th.vx *= fr; th.vy *= fr; th.vr *= fr;
    th.x += th.vx * f.dt; th.y += th.vy * f.dt; th.rot += th.vr * f.dt;
    const m = sz * 0.4;
    // they slide about the whole desk round the sheet
    const x0 = -f.w * 0.9, x1 = f.w * 1.6, y0 = -f.h * 0.6, y1 = f.h * 1.5;
    if (th.x < x0 + m || th.x > x1 - m) { th.vx *= -0.6; th.x = clamp(th.x, x0 + m, x1 - m); }
    if (th.y < y0 + m || th.y > y1 - m) { th.vy *= -0.6; th.y = clamp(th.y, y0 + m, y1 - m); }
  }
  STICKERS.forEach((k, i) => {
    const s = stickerAt(f, d, i);
    if (!s) return;
    // slapped down from above the desk: big, turned, then flat with a little bounce
    const e = ease.outBack(s.k, 2.4);
    const scale = s.k < 1 ? 1.9 - 0.9 * e : held?.i === i ? 1.08 : 1;
    const [aw, ah] = artSize(k);
    const wd = sz * scale * Math.min(1, aw / ah);
    drawBaked(ctx, k, s.x, s.y, wd, s.rot + (1 - s.k) * 0.6, clamp(s.k * 3), held?.i === i || s.k < 1 ? 2.2 : 0.8);
  });
}

function stickerUnder(f: Frame, d: Desk, x: number, y: number) {
  const sz = stickerSize(d, f.h);
  for (let i = STICKERS.length - 1; i >= 0; i--) {
    const s = stickerAt(f, d, i);
    if (s && s.k >= 1 && Math.hypot(x - s.x, y - s.y) < sz * 0.5) return { i, s };
  }
  return null;
}

/* ------------------------------------------------------------ the mouse brush */

interface Stroke { pts: [number, number, number][]; col: string; splat: boolean; seed: number }
const strokes: Stroke[] = [];
let painting: Stroke | null = null;
let downAt: [number, number] | null = null;
const DRY = 4.5;

function inkCol(ci: number) {
  return CHAPTERS[ci].paper ? INK : RED;
}

function drawBrush(f: Frame) {
  const { ctx } = f;
  const now = performance.now() / 1000;
  for (let s = strokes.length - 1; s >= 0; s--) {
    const st = strokes[s];
    const last = st.pts[st.pts.length - 1][2];
    const age = st === painting ? 0 : now - last;
    const a = 1 - clamp((age - DRY) / 1.4);
    if (a <= 0) { strokes.splice(s, 1); continue; }
    ctx.save();
    ctx.globalAlpha = a * 0.92;
    ctx.fillStyle = ctx.strokeStyle = st.col;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (st.splat) {
      const [x, y] = st.pts[0];
      const r = 9 + rnd(st.seed) * 7;
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const an = (i / 18) * Math.PI * 2;
        const rr = r * (0.8 + rnd(st.seed + i) * 0.45) * (i % 5 === 0 ? 1.5 : 1);
        if (i) ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); else ctx.moveTo(x + rr, y);
      }
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const an = rnd(st.seed + 40 + i) * Math.PI * 2, dd = r * (1.9 + rnd(st.seed + 50 + i) * 1.4);
        ctx.beginPath();
        ctx.arc(x + Math.cos(an) * dd, y + Math.sin(an) * dd, r * (0.16 + rnd(st.seed + 60 + i) * 0.16), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // a brush: thick when slow, thin when fast, tapering at both ends
      const P = st.pts, n = P.length;
      for (let i = 1; i < n; i++) {
        const [ax, ay, at] = P[i - 1], [bx, by, bt] = P[i];
        const v = Math.hypot(bx - ax, by - ay) / Math.max(0.004, bt - at);
        const taper = Math.min(1, i / 4, (n - i) / 4 + (st === painting ? 1 : 0));
        ctx.lineWidth = Math.max(1.2, clamp(14 - v / 160, 3, 14) * taper);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------ the desk itself */

/** the desk's props, lying round the sheet (scripts/gen-cine.sh props_1, props_2) */
const PROPS = ['prop1_0', 'prop1_1', 'prop1_2', 'prop2_0', 'prop2_1'];
/** the daylit room past the desk's edge (also the page behind the canvases while the camera is out: src/style.css) */
const ROOM = '#e2ddd4';
/** which painted desk top (dev: ?desk=desk_a to try another) */
const DESK_TOP = (typeof location === 'object' && new URLSearchParams(location.search).get('desk')) || 'desk_top';
/** how far the desk reaches round the sheet, as multiples of the screen (the dark takes over past it) */
const EXT = { x0: -1.25, y0: -2.0, x1: 2.25, y1: 2.2 };
/** the desk canvas' resolution per CSS pixel (it is only ever seen pulled back) */
const RES = 0.55;

let deskC: HTMLCanvasElement | null = null;
let deskG: CanvasRenderingContext2D | null = null;
let inkC: HTMLCanvasElement | null = null;
let inkG: CanvasRenderingContext2D | null = null;
let filmC: HTMLCanvasElement | null = null;
let base: HTMLCanvasElement | null = null;
let baseId = '';

/** the wood, the lamp, the sheet's shadow and the props: drawn once (again when a prop arrives) */
function drawBase(w: number, h: number) {
  const have = PROPS.filter((k) => artImage(k)).length + (bgImage(DESK_TOP) ? 10 : 0);
  const id = `${w}x${h}:${have}`;
  if (base && id === baseId) return base;
  baseId = id;
  const X0 = EXT.x0 * w, Y0 = EXT.y0 * h, DW = (EXT.x1 - EXT.x0) * w, DH = (EXT.y1 - EXT.y0) * h;
  base ??= document.createElement('canvas');
  base.width = Math.round(DW * RES);
  base.height = Math.round(DH * RES);
  const g = base.getContext('2d')!;
  g.setTransform(RES, 0, 0, RES, -X0 * RES, -Y0 * RES);
  g.fillStyle = ROOM;
  g.fillRect(X0, Y0, DW, DH);
  // the desk top, centred under the sheet, mirrored out on every side so it never runs out
  const wood = bgImage(DESK_TOP);
  const ww = w * PHOTO_W, wh = ww / 1.5;
  const ox = w / 2 - ww / 2, oy = h * 0.5 - wh / 2;
  if (wood) {
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      g.save();
      g.translate(ox + i * ww + ww / 2, oy + j * wh + wh / 2);
      g.scale(i ? -1 : 1, j ? -1 : 1);
      g.drawImage(wood, -ww / 2, -wh / 2, ww, wh);
      g.restore();
    }
  } else { g.fillStyle = ROOM; g.fillRect(X0, Y0, DW, DH); }
  // daylight: a soft bright pool on the sheet, the far desk falling gently into shade
  const lx = w * 0.45, ly = h * 0.35;
  const pool = g.createRadialGradient(lx, ly, h * 0.3, lx, ly, w * 2.5);
  pool.addColorStop(0, 'rgba(255,250,235,0.10)');
  pool.addColorStop(0.55, 'rgba(255,250,235,0)');
  pool.addColorStop(0.8, 'rgba(226,221,212,0.5)');
  pool.addColorStop(0.95, ROOM);
  g.fillStyle = pool;
  g.fillRect(X0, Y0, DW, DH);
  // the sheet lies a little proud of the wood: its soft shadow
  g.save();
  g.shadowColor = 'rgba(30,24,16,0.45)';
  g.shadowBlur = h * 0.05;
  g.shadowOffsetX = h * 0.012;
  g.shadowOffsetY = h * 0.022;
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  g.restore();
  // the props: big, few, spread out (one strong shape each)
  const prop = (k: string, x: number, y: number, len: number, rot: number) => {
    const [aw, ah] = artSize(k);
    if (!artImage(k)) return;
    drawBaked(g, k, x, y, len * Math.min(1, aw / ah) * Math.max(1, aw / ah), rot, 1, 2.2);
  };
  prop('prop1_2', w / 2, -h * 0.05, h * 0.75, Math.PI / 2); // the peg bar the sheet hangs on
  prop('prop2_0', -h * 0.46, -h * 0.2, h * 0.36, 0.2); // the inkstone
  prop('prop1_1', -h * 0.16, -h * 0.15, h * 0.62, -0.95); // the brush, wet from it
  // (the eraser, the villain off duty, is drawn by src/desk/story.ts: it wakes up and leaves)
  // (the red pencil is in your hand: it is the mouse pointer)
  return base;
}

/* ------------------------------------------------------------ the shots */

/** seconds of stillness before the camera eases back over the desk (it is a treat, not the frame) */
const PEEK_AFTER = 5;
/** seconds the film's intro clock waits while the opening shot pushes in */
export const INTRO_DELAY = 1.8;
const OPEN = 3.8;
let openT = 0, openDone = false, peekK = 0, lastShot: Shot | null = null, lastM: DOMMatrix | null = null;

/** the opening: low across the desk in the lamplight, craning up and pushing into the sheet */
function openShot(w: number, h: number, t: number): Shot {
  const u = seg(t, 0.25, OPEN);
  // close and low across the desk, over the inkstone and the brush, the sheet off to the right in the daylight
  const a: Shot = { cx: w * 0.12, cy: h * 0.4, s: 1.9, tilt: 58, roll: -10 };
  const r = rest(w, h);
  const kc = ease.inOut3(u);
  return {
    cx: lerp(a.cx, r.cx, kc),
    cy: lerp(a.cy, r.cy, kc),
    // the crane comes up first, the push in comes last
    tilt: lerp(a.tilt, 0, ease.inOut2(seg(u, 0, 0.8))),
    roll: lerp(a.roll, 0, ease.inOut2(seg(u, 0.1, 0.9))),
    s: Math.exp(lerp(Math.log(a.s), 0, ease.inOut3(seg(u, 0.15, 1)))),
  };
}

/** the reader stopped: ease back over the desk, a slow drift while they rest */
function peekShot(w: number, h: number, t: number): Shot {
  // far enough back that the margins' things fit beside the sheet on a narrower screen too
  const s = Math.max(1.55, 1 + (2.15 * h * 0.45) / w);
  return { cx: w * 0.5 + Math.sin(t * 0.16) * w * 0.035, cy: h * 0.56, s, tilt: 15 + Math.sin(t * 0.11) * 2, roll: -1.4 + Math.sin(t * 0.13) * 0.6 };
}

/** the end: pull back to the finished drawing on the desk, the card beside it */
function endShot(w: number, h: number, t: number): Shot {
  return { cx: w * 0.92 + Math.sin(t * 0.12) * w * 0.01, cy: h * 0.6, s: 1.85, tilt: 21, roll: 2.4 };
}

/** 0→1 through the end reveal (back to 0 as the loop dives into the seal) */
function endK(B: number) {
  const home = CHAPTERS[CHAPTERS.length - 1].from, L = B - home;
  return ease.inOut3(seg(L, HM.stand - 0.35, HM.offer)) * (1 - ease.inOut3(seg(L, HM.loop[0] - 0.1, HM.loop[0] + 0.35)));
}

/** the Toy Story rule: while the camera has pulled out to look at the desk, the drawing freezes (main stops the film's clock) */
export const deskWatching = () => peekK > 0.12;

/** the raw intro clock (seconds since the film was ready), from main */
let rawClock = 0;
export function setDeskClock(s: number, forced = false) {
  rawClock = s;
  // dev screenshots set the clock: replay the opening from there
  if (forced) { openT = s; openDone = s >= OPEN; }
}

function shotFor(f: Frame): Shot {
  const { w, h } = f;
  // the opening plays once, from the top (landing mid-film skips it); a scroll hurries it along
  if (!openDone) {
    if (f.B > 1.2) openDone = true;
    else {
      openT = Math.max(openT, rawClock) + (f.B > 0.02 ? f.dt * 3 : 0);
      if (openT >= OPEN) openDone = true;
      else return openShot(w, h, openT);
    }
  }
  const ek = endK(f.B);
  const cues = storyCues(f);
  const busy = cues.some((c) => c.k > 0.01) || (f.hold !== null && f.hold.kind !== 'bullet');
  const want = f.idle > PEEK_AFTER && ek < 0.01 && !busy ? 1 : 0;
  peekK = want ? Math.min(1, peekK + f.dt / 1.6) : Math.max(0, peekK - f.dt / 0.35);
  let s = rest(w, h);
  if (peekK > 0) s = mix(s, peekShot(w, h, f.t), want ? ease.inOut2(peekK) : ease.out2(peekK));
  // the story's own trips out to the desk (src/desk/story.ts)
  for (const c of cues) if (c.k > 0) s = mix(s, c.shot, c.k);
  if (ek > 0) s = mix(s, endShot(w, h, f.t), ek);
  // the biggest hits jolt the camera (and the desk jumps)
  const j = jolt(f.B, f.hold !== null);
  if (j > 0.001) {
    const r = Math.sin(f.B * 977);
    s = { ...s, s: s.s * (1 + 0.075 * j), roll: s.roll + 1.4 * j * r, cx: s.cx + w * 0.008 * j * r, cy: s.cy + h * 0.01 * j * Math.cos(f.B * 613) };
  }
  return s;
}

/* ------------------------------------------------------------ input */

let lastFrame: Frame | null = null;
const skip = (e: PointerEvent) => !!(e.target as Element | null)?.closest?.('a, button, input, #hello, .reel-marks, #sign');
/** a screen point on the sheet, in the film's own pixels (the same point while the sheet fills the screen) */
export function screenToSheet(x: number, y: number): [number, number] {
  return lastM ? unproject(lastM, x, y) : [x, y];
}
/** the mouse on the desk (null while the sheet fills the screen) */
function onDesk(e: PointerEvent): [number, number] | null {
  return lastM && lastShot ? unproject(lastM, e.clientX, e.clientY) : null;
}

export function initDesk() {
  filmC = document.getElementById('film') as HTMLCanvasElement;
  deskC = document.createElement('canvas');
  deskC.id = 'desk';
  deskC.setAttribute('aria-hidden', 'true');
  deskC.style.cssText = 'position:fixed;left:0;top:0;transform-origin:0 0;pointer-events:none;display:none';
  deskG = deskC.getContext('2d', { alpha: false });
  filmC.before(deskC);
  overC = document.createElement('canvas');
  overC.id = 'over';
  overC.setAttribute('aria-hidden', 'true');
  overC.style.cssText = 'position:fixed;left:0;top:0;transform-origin:0 0;pointer-events:none;display:none';
  overG = overC.getContext('2d');
  filmC.after(overC);
  leafC = document.createElement('canvas');
  leafC.id = 'leaf';
  leafC.setAttribute('aria-hidden', 'true');
  leafC.style.cssText = 'position:fixed;left:0;top:0;transform-origin:0 0;pointer-events:none;display:none';
  leafG = leafC.getContext('2d');
  overC.after(leafC);
  document.documentElement.classList.toggle('pencil', fine);
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pointer = { x: e.clientX, y: e.clientY, at: performance.now(), ui: !!(e.target as Element | null)?.closest?.('a, button, input, #hello, .reel-marks') };
  });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; });
  inkC = document.createElement('canvas');
  inkC.id = 'ink';
  inkC.setAttribute('aria-hidden', 'true');
  inkC.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2';
  inkG = inkC.getContext('2d');
  filmC.after(inkC);

  window.addEventListener('pointerdown', (e) => {
    const f = lastFrame;
    if (!f || e.pointerType !== 'mouse' || e.button !== 0 || skip(e) || !deskOn(f.w, f.h)) return;
    const p = onDesk(e);
    const hit = p && stickerUnder(f, deskMargins(f), p[0], p[1]);
    if (p && hit) {
      const th = thrown.get(hit.i) ?? { x: hit.s.x, y: hit.s.y, vx: 0, vy: 0, rot: hit.s.rot, vr: 0 };
      thrown.set(hit.i, th);
      held = { i: hit.i, dx: p[0] - th.x, dy: p[1] - th.y, lx: p[0], ly: p[1], lt: performance.now() };
      e.preventDefault();
      return;
    }
    downAt = [e.clientX, e.clientY];
    painting = { pts: [[e.clientX, e.clientY, performance.now() / 1000]], col: inkCol(chapterAt(f.B)), splat: false, seed: Math.random() * 100 };
    strokes.push(painting);
    e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    const f = lastFrame;
    if (held) {
      const p = onDesk(e);
      if (!p) return;
      const th = thrown.get(held.i)!;
      const now = performance.now(), dt = Math.max(1, now - held.lt) / 1000;
      th.vx = lerp(th.vx, (p[0] - held.lx) / dt, 0.5);
      th.vy = lerp(th.vy, (p[1] - held.ly) / dt, 0.5);
      th.vr = th.vx * 0.002;
      th.x = p[0] - held.dx;
      th.y = p[1] - held.dy;
      held.lx = p[0]; held.ly = p[1]; held.lt = now;
      return;
    }
    if (painting) {
      const q = painting.pts[painting.pts.length - 1];
      if (Math.hypot(e.clientX - q[0], e.clientY - q[1]) > 2) painting.pts.push([e.clientX, e.clientY, performance.now() / 1000]);
      return;
    }
    // a hand over a sticker you can pick up
    if (f && e.pointerType === 'mouse') {
      const p = deskOn(f.w, f.h) ? onDesk(e) : null;
      grabbing = !!(p && stickerUnder(f, deskMargins(f), p[0], p[1]));
      document.body.style.cursor = grabbing ? 'grab' : '';
    }
  });
  const up = (e: PointerEvent) => {
    if (held) {
      if (performance.now() - held.lt > 80) { const th = thrown.get(held.i)!; th.vx = th.vy = th.vr = 0; }
      held = null;
    }
    if (painting) {
      // a click, not a drag: a splat
      if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 5 && painting.pts.length < 4) painting.splat = true;
      painting.pts[painting.pts.length - 1][2] = performance.now() / 1000;
      painting = null;
    }
    downAt = null;
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

/* ------------------------------------------------------------ draw */

const deskMargins = (f: Frame): Desk => ({ mw: f.h * 0.45 });

function park() {
  if (filmC && filmC.style.transform) filmC.style.transform = '';
  if (deskC && deskC.style.display !== 'none') deskC.style.display = 'none';
  if (overC && overC.style.display !== 'none') overC.style.display = 'none';
  if (leafC && leafC.style.display !== 'none') leafC.style.display = 'none';
  document.documentElement.classList.remove('cine', 'cine-open');
  lastShot = lastM = null;
}

/** the camera over the desk, and the desk under the sheet (wide screens with a mouse) */
export function drawDesk(f: Frame) {
  lastFrame = f;
  live.pointer = pointerSheet();
  const { w, h } = f;
  if (!deskOn(w, h) || !filmC || !deskC || !deskG) { park(); return; }
  queueDesk();
  queueStory();
  PROPS.forEach((k, i) => queueArt(k, 1 + i * 0.1));
  // the page turn: keep a copy of the night sheet's last frames, to lift off the peg bar after the seam
  if (leafCapture(f.B)) {
    leafFront ??= document.createElement('canvas');
    if (leafFront.width !== filmC.width || leafFront.height !== filmC.height) { leafFront.width = filmC.width; leafFront.height = filmC.height; }
    const lg = leafFront.getContext('2d')!;
    lg.drawImage(filmC, 0, 0);
    leafOk = true;
    leafShown = '';
  }
  const shot = shotFor(f);
  if (isRest(shot, w, h)) { park(); return; }
  const m = matrix(shot, w, h);
  lastShot = shot;
  lastM = m;
  document.documentElement.classList.add('cine');
  filmC.style.transformOrigin = '0 0';
  filmC.style.transform = m.toString();
  // the desk: its canvas covers EXT, scaled down by RES
  const X0 = EXT.x0 * w, Y0 = EXT.y0 * h, DW = (EXT.x1 - EXT.x0) * w, DH = (EXT.y1 - EXT.y0) * h;
  const pw = Math.round(DW * RES), ph = Math.round(DH * RES);
  if (deskC.width !== pw || deskC.height !== ph) {
    deskC.width = pw;
    deskC.height = ph;
    deskC.style.width = `${DW}px`;
    deskC.style.height = `${DH}px`;
  }
  deskC.style.display = '';
  deskC.style.transform = m.translate(X0, Y0).toString();
  // the opening pulls focus from the desk to the sheet as it arrives
  const opening = !openDone;
  const blur = opening ? 2.6 * seg(openT, 0.6, 2.4) * (1 - seg(openT, 3.0, OPEN)) : 0;
  deskC.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '';
  document.documentElement.classList.toggle('cine-open', opening && openT < OPEN - 0.5);
  const g = deskG;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(drawBase(w, h), 0, 0);
  g.setTransform(RES, 0, 0, RES, -X0 * RES, -Y0 * RES);
  // the act's things in the margins: scraps and the flipbook on the left, the exposure sheet and stickers on the right
  const d = deskMargins(f);
  const ci = chapterAt(f.B);
  const fd = { ...f, ctx: g };
  g.save();
  g.translate(-d.mw, 0);
  drawScraps(fd, d, ci);
  drawFlipbook(fd, d, ci);
  g.restore();
  const fr = { ...fd, w: w + d.mw };
  drawXSheet(fr, d, ci);
  drawStickers(fr, d);
  // the story's things on the desk, then the light of the moment over all of it
  drawUnder(g, f);
  drawLight(g, f, X0, Y0, DW, DH);
  // above the sheet: whatever leaves the paper (same matrix, its own transparent canvas)
  if (overC && overG) {
    if (overC.width !== pw || overC.height !== ph) {
      overC.width = pw;
      overC.height = ph;
      overC.style.width = `${DW}px`;
      overC.style.height = `${DH}px`;
    }
    overG.setTransform(1, 0, 0, 1, 0, 0);
    overG.clearRect(0, 0, pw, ph);
    overG.setTransform(RES, 0, 0, RES, -X0 * RES, -Y0 * RES);
    const any = drawOver(overG, f, deskC, { x: X0, y: Y0, w: DW, h: DH });
    overC.style.display = any ? '' : 'none';
    if (any) overC.style.transform = m.translate(X0, Y0).toString();
  }
  // the page turn: the night sheet, hinged at its top under the peg bar, lifts up and over
  const ang = leafAngle(f.B);
  if (leafC && leafG && leafFront && ang !== null && leafOk) {
    const side = ang > 90 ? 'back' : 'front';
    if (side !== leafShown) {
      if (leafC.width !== leafFront.width || leafC.height !== leafFront.height) { leafC.width = leafFront.width; leafC.height = leafFront.height; }
      leafG.setTransform(1, 0, 0, 1, 0, 0);
      leafG.globalAlpha = 1;
      leafG.drawImage(leafFront, 0, 0);
      // past upright we see its back: plain paper, the drawing faintly through it
      if (side === 'back') {
        leafG.fillStyle = 'rgba(240,233,218,0.9)';
        leafG.fillRect(0, 0, leafC.width, leafC.height);
      }
      leafShown = side;
    }
    leafC.style.width = `${w}px`;
    leafC.style.height = `${h}px`;
    leafC.style.display = '';
    leafC.style.transform = m.rotate(ang, 0, 0).toString();
  } else if (leafC) leafC.style.display = 'none';
}
let overC: HTMLCanvasElement | null = null, overG: CanvasRenderingContext2D | null = null;
let leafC: HTMLCanvasElement | null = null, leafG: CanvasRenderingContext2D | null = null, leafFront: HTMLCanvasElement | null = null, leafOk = false, leafShown = '';
let pointer: { x: number; y: number; at: number; ui: boolean } | null = null;
let grabbing = false;
const fine = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
/** the mouse on the sheet, in the film's pixels, while it is being moved (for him to glance at: live.pointer) */
function pointerSheet(): [number, number] | null {
  if (!pointer || performance.now() - pointer.at > 4000) return null;
  return screenToSheet(pointer.x, pointer.y);
}

/** the red pencil from the desk, as the mouse pointer: its point on the pointer */
function drawPencil(g: CanvasRenderingContext2D, h: number) {
  if (!pointer || pointer.ui || grabbing || performance.now() - pointer.at > 6000) return;
  const im = artImage('prop1_0');
  if (!im) return;
  const [, ah] = artSize('prop1_0');
  const s = (h * 0.24) / ah;
  const down = painting ? 0.12 : 0;
  g.save();
  g.translate(pointer.x, pointer.y);
  g.rotate(0.5 + down);
  g.scale(s, s);
  g.shadowColor = 'rgba(20,14,8,0.35)';
  g.shadowBlur = 10;
  g.shadowOffsetX = 6;
  g.shadowOffsetY = 8;
  // (the drawing's frame holds a little stray ink beside the pencil: draw only its column)
  g.drawImage(im, 0, 0, 70, ah, -33.5, -940, 70, ah);
  g.restore();
}

/** the reader's own ink, over everything (its own screen-space layer) */
export function drawInk(f: Frame) {
  if (!inkC || !inkG) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(f.w * dpr), H = Math.round(f.h * dpr);
  if (inkC.width !== W || inkC.height !== H) { inkC.width = W; inkC.height = H; }
  const pen = fine && deskOn(f.w, f.h);
  if (!strokes.length && !inkDirty && !pen) return;
  inkG.setTransform(1, 0, 0, 1, 0, 0);
  inkG.clearRect(0, 0, W, H);
  inkG.setTransform(dpr, 0, 0, dpr, 0, 0);
  inkDirty = strokes.length > 0;
  if (strokes.length) drawBrush({ ...f, ctx: inkG });
  if (pen) {
    drawScreen(inkG, f);
    drawPencil(inkG, f.h);
  }
}
let inkDirty = false;
