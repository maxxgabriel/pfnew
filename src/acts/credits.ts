import { brush } from '../core/brush';
import { drawBlot } from '../core/blot';
import type { Frame } from '../core/frame';
import { type Pt, TAU, ease, lerp, rng, seg } from '../core/math';
import { drawSprite, glow, paperTile, withAlpha } from '../core/sprites';
import { C, F, font } from '../core/style';
import { drawLightLine, drawSeal } from './ink';

/*
 * END CREDITS, and the scene after them.
 *
 * The credits roll on paper at the speed you scroll. Every line gets a
 * brush underline painted in as it crosses the middle of the frame, and
 * Blot walks the bottom of the page the whole time.
 *
 * Then the post-credits scene: black, then a night field where the two
 * hilts lie crossed in the grass. Blot creeps up, picks one up, it ignites
 * in its hands — and across the field the other one lights by itself.
 */

export const CRED = { start: 22.55, roll: [22.85, 26.6] as const, post: 26.75, end: 30.0 };

type Line = { kind: 'head' | 'pair' | 'big' | 'note' | 'gap'; a?: string; b?: string; color?: string };
const LINES: Line[] = [
  { kind: 'head', a: 'a film by' },
  { kind: 'big', a: 'MAX GABRIEL' },
  { kind: 'gap' },
  { kind: 'pair', a: 'written, designed & built by', b: 'Max Gabriel' },
  { kind: 'pair', a: 'ink', b: 'one brush, no undo' },
  { kind: 'pair', a: 'the blue one', b: 'Blue', color: C.blue },
  { kind: 'pair', a: 'the green one', b: 'Green', color: C.green },
  { kind: 'pair', a: 'the ball', b: 'itself' },
  { kind: 'pair', a: 'blot', b: 'Blot', color: C.red },
  { kind: 'pair', a: 'machine operator', b: 'a see-saw' },
  { kind: 'pair', a: 'goalkeeper (wrong way)', b: 'No. 1, Blue' },
  { kind: 'pair', a: 'pixels', b: 'the chunky ones' },
  { kind: 'pair', a: 'score', b: 'the sound of your thumb' },
  { kind: 'gap' },
  { kind: 'note', a: 'No undo was used in the making of this film.' },
  { kind: 'note', a: '© 2026 Max Gabriel' },
];

let pattern: CanvasPattern | null = null;

export function drawCredits(f: Frame) {
  const { ctx, w, h, B, t } = f;
  if (!pattern) pattern = ctx.createPattern(paperTile(512, C.paper), 'repeat');
  const S = Math.min(w, h);
  if (B < CRED.post + 0.1) drawRoll(f, S);
  if (B >= CRED.post) drawPost(f, S);
  void t;
}

function drawRoll(f: Frame, S: number) {
  const { ctx, w, h, B, t } = f;
  const inn = ease.inOut2(seg(B, CRED.start, CRED.start + 0.3));
  ctx.save();
  ctx.globalAlpha = inn;
  ctx.fillStyle = pattern!;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  if (inn < 0.5) return;

  // the roll: line positions are fixed on a tall strip that the scroll lifts
  // narrow screens stack each role above its name
  const stacked = w < 640;
  const lh = Math.max(34, S * 0.095) * (stacked ? 1.45 : 1);
  const p = seg(B, CRED.roll[0], CRED.roll[1]);
  // the roll comes to rest with its last line in the middle of the frame
  const top = lerp(h * 1.02, h * 0.5 - (LINES.length - 1) * lh, ease.out2(p));
  const mid = w / 2;
  ctx.textBaseline = 'middle';
  LINES.forEach((ln, i) => {
    const y = top + i * lh + (ln.kind === 'big' ? lh * 0.2 : 0);
    if (y < -lh || y > h + lh) return;
    // lines brighten as they pass the centre and fade at the edges
    const edge = Math.min(1, Math.min(y, h - y) / (h * 0.18));
    ctx.globalAlpha = Math.max(0, edge);
    const crossed = 1 - Math.min(1, Math.max(0, (y - h * 0.5) / (h * 0.25)));
    if (ln.kind === 'head') {
      ctx.font = font(Math.max(12, S * 0.034), F.serif, 600);
      ctx.textAlign = 'center';
      ctx.fillStyle = withAlpha(C.ink, 0.7);
      ctx.fillText(ln.a!, mid, y);
    } else if (ln.kind === 'big') {
      ctx.font = font(Math.min(w * 0.11, S * 0.1), F.display);
      ctx.textAlign = 'center';
      ctx.fillStyle = C.ink;
      ctx.fillText(ln.a!, mid, y);
      const tw = ctx.measureText(ln.a!).width;
      brush(ctx, [[mid - tw / 2, y + lh * 0.45], [mid, y + lh * 0.5], [mid + tw / 2, y + lh * 0.44]], {
        width: S * 0.012, color: C.red, progress: ease.inOut2(crossed), dry: 0.6, seed: 77,
      });
    } else if (ln.kind === 'pair') {
      const gap = S * 0.025;
      const rx = stacked ? mid : mid - gap, ry = stacked ? y - lh * 0.2 : y;
      const nx = stacked ? mid : mid + gap, ny = stacked ? y + lh * 0.14 : y;
      ctx.font = font(Math.max(10, S * 0.028), F.serif, 600);
      ctx.textAlign = stacked ? 'center' : 'right';
      ctx.fillStyle = withAlpha(C.ink, 0.62);
      ctx.fillText(ln.a!.toUpperCase(), rx, ry);
      ctx.font = font(Math.max(13, S * (stacked ? 0.05 : 0.042)), F.display);
      ctx.textAlign = stacked ? 'center' : 'left';
      ctx.fillStyle = C.ink;
      ctx.fillText(ln.b!, nx, ny);
      if (ln.color) {
        const tw = ctx.measureText(ln.b!).width;
        const x0 = stacked ? nx - tw / 2 : nx;
        brush(ctx, [[x0, ny + lh * 0.2], [x0 + tw * 0.5, ny + lh * 0.23], [x0 + tw, ny + lh * 0.19]], {
          width: S * 0.008, color: ln.color, progress: ease.inOut2(crossed), dry: 0.5, seed: 30 + i,
        });
      }
    } else if (ln.kind === 'note') {
      ctx.font = font(Math.max(11, S * 0.03), F.serif, 600);
      ctx.textAlign = 'center';
      ctx.fillStyle = withAlpha(C.ink, 0.75);
      ctx.fillText(ln.a!, mid, y);
    }
  });
  ctx.globalAlpha = 1;

  // Blot strolls the bottom of the page, waving at the names going by
  const loop = (t * 0.07) % 1.3;
  const bx = lerp(-S * 0.1, w + S * 0.1, loop / 1.3);
  const by = h * 0.86 + Math.abs(Math.sin(t * 6)) * -S * 0.008;
  drawBlot(ctx, bx, by, S * 0.07, { t, pose: Math.floor(t / 2) % 3 === 0 ? 'wave' : 'idle', look: [bx + 40, by - 100], seed: 9, wind: -0.5 });
  // its footprints, small ink dots fading behind it
  for (let k = 1; k < 8; k++) {
    const fx = bx - k * S * 0.035;
    ctx.fillStyle = withAlpha(C.ink, 0.25 * (1 - k / 8));
    ctx.beginPath();
    ctx.ellipse(fx, h * 0.86 + (k % 2) * S * 0.006, S * 0.006, S * 0.003, 0, 0, TAU);
    ctx.fill();
  }
}

/* --------------------------------------------------------- post-credits */

const HILT_LEN = 0.075;

function drawPost(f: Frame, S: number) {
  const { ctx, w, h, B, t } = f;
  const b = B - CRED.post;
  // cut to black, hold, then fade up on the field
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, w, h);
  const up = ease.inOut2(seg(b, 0.25, 0.55));
  if (b < 0.25) {
    ctx.font = font(Math.max(12, S * 0.035), F.serif, 600);
    ctx.textAlign = 'center';
    ctx.fillStyle = withAlpha(C.paper, Math.sin(seg(b, 0.02, 0.24) * Math.PI) * 0.8);
    ctx.fillText('wait —', w / 2, h / 2);
  }
  const outro = seg(b, 2.05, 2.25);
  if (up > 0 && outro < 1) {
    ctx.save();
    ctx.globalAlpha = up * (1 - outro);
    // night field: sky, moon, a low brushed horizon, grass
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0d0c0b');
    g.addColorStop(0.7, '#24221e');
    g.addColorStop(1, '#141310');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha *= 0.5;
    drawSprite(ctx, glow(C.paper, 128), w * 0.72, h * 0.24, S * 0.5);
    ctx.globalAlpha = up * (1 - outro);
    ctx.fillStyle = C.paper;
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.24, S * 0.07, 0, TAU);
    ctx.fill();
    const gy = h * 0.68;
    ctx.fillStyle = '#0a0908';
    ctx.fillRect(0, gy, w, h - gy);
    brush(ctx, HORIZON(w, gy), { width: S * 0.01, color: '#000000', dry: 0.7, seed: 4 });
    // grass blades swaying
    const r = rng(6);
    ctx.strokeStyle = '#1d1b17';
    ctx.lineWidth = Math.max(1, S * 0.003);
    for (let i = 0; i < 70; i++) {
      const x = r() * w, hh = S * (0.02 + r() * 0.03);
      ctx.beginPath();
      ctx.moveTo(x, gy + 2);
      ctx.quadraticCurveTo(x + Math.sin(t * 1.4 + i) * hh * 0.3, gy - hh * 0.5, x + Math.sin(t * 1.4 + i) * hh * 0.6, gy - hh);
      ctx.stroke();
    }

    // the two hilts, crossed in the grass
    const hl = S * HILT_LEN * 1.4;
    const cx = w * 0.5, cy = gy + S * 0.03;
    const pick = ease.inOut2(seg(b, 0.95, 1.15));
    const blueLit = seg(b, 1.18, 1.26);
    const greenLit = seg(b, 1.6, 1.68);
    // Blot creeps in, looks, reaches
    const walk = ease.inOut2(seg(b, 0.45, 0.9));
    const startled = seg(b, 1.22, 1.4);
    const blotX = lerp(-S * 0.1, cx - S * 0.12, walk) - startled * S * 0.08;
    const blotY = gy + S * 0.035;
    const blotS = S * 0.13;
    // the green hilt stays where it fell
    const gH: Pt = [cx + S * 0.1, cy];
    const gA = -0.08;
    drawHilt(ctx, gH, gA, hl, S);
    if (greenLit > 0) {
      const len = S * 0.42 * ease.out3(greenLit);
      const hum = 0.85 + 0.15 * Math.sin(t * 50);
      drawLightLine(ctx, gH[0], gH[1], gH[0] + Math.cos(gA) * len, gH[1] + Math.sin(gA) * len, C.green, C.greenHot, S * 0.014, hum);
    }
    // the blue one: in the grass, then in Blot's hands
    const bH: Pt = [lerp(cx - S * 0.05, blotX + blotS * 0.32, pick), lerp(cy, blotY - blotS * 0.42, pick)];
    const bA = lerp(0.35, -1.2 - startled * 0.6 + Math.sin(t * 9) * 0.06 * blueLit, pick);
    if (blueLit > 0) {
      const len = S * 0.38 * ease.out3(blueLit);
      drawLightLine(ctx, bH[0], bH[1], bH[0] + Math.cos(bA) * len, bH[1] + Math.sin(bA) * len, C.blue, C.blueHot, S * 0.014, 0.9 + 0.1 * Math.sin(t * 60));
    }
    drawHilt(ctx, bH, bA, hl, S);
    if (walk > 0) {
      const pose = greenLit > 0 ? 'shock' : blueLit > 0 ? 'fall' : pick > 0 ? 'idle' : 'peek';
      drawBlot(ctx, blotX, blotY, blotS, {
        t, pose: pose === 'peek' ? 'idle' : pose, seed: 12,
        look: greenLit > 0 ? gH : blueLit > 0 ? [bH[0] + Math.cos(bA) * S * 0.3, bH[1] + Math.sin(bA) * S * 0.3] : [cx, cy],
        rot: -startled * 0.25, eye: C.white,
      });
    }
    // light from the blades on the grass
    if (blueLit > 0 || greenLit > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 * Math.max(blueLit, greenLit) * up;
      if (blueLit > 0) drawSprite(ctx, glow(C.blue, 128), bH[0], gy, S * 0.8, S * 0.2);
      if (greenLit > 0) drawSprite(ctx, glow(C.green, 128), gH[0] + S * 0.2, gy, S * 0.8, S * 0.2);
    }
    ctx.restore();
  }
  // the promise
  if (outro > 0) {
    const k = ease.out3(seg(b, 2.25, 2.6));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(Math.min(w * 0.085, S * 0.08), F.serif, 800);
    ctx.fillStyle = withAlpha(C.paper, k);
    const spread = lerp(0.6, 0.18, k);
    drawSpaced(ctx, 'MAX GABRIEL', w / 2, h * 0.36, spread * S * 0.06);
    ctx.font = font(Math.max(12, S * 0.034), F.serif, 600);
    ctx.fillStyle = withAlpha(C.paper, ease.out3(seg(b, 2.45, 2.75)) * 0.8);
    drawSpaced(ctx, 'WILL RETURN', w / 2, h * 0.36 + S * 0.08, S * 0.02);
    const st = seg(b, 2.7, 2.85);
    if (st > 0) drawSeal(ctx, w / 2, h * 0.36 + S * 0.19, S * 0.07 * (st < 1 ? lerp(2, 1, ease.outBack(st, 2)) : 1), -0.05, Math.min(1, st * 3));
  }
}

function drawSpaced(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, track: number) {
  const widths = [...s].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (s.length - 1);
  let cx = x - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  [...s].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + track;
  });
  ctx.textAlign = align;
}

function drawHilt(ctx: CanvasRenderingContext2D, p: Pt, a: number, hl: number, S: number) {
  ctx.save();
  ctx.translate(p[0], p[1]);
  ctx.rotate(a);
  const hw = S * 0.02;
  ctx.fillStyle = '#4a4640';
  ctx.fillRect(-hl, -hw / 2, hl, hw);
  ctx.fillStyle = 'rgba(236,230,214,0.5)';
  for (let k = 1; k < 5; k++) ctx.fillRect(-hl + k * hl * 0.2, -hw / 2, hl * 0.05, hw);
  ctx.fillStyle = '#8a8378';
  ctx.fillRect(-hw * 0.3, -hw * 0.8, hw * 0.6, hw * 1.6);
  ctx.restore();
  // the vermilion cord
  ctx.strokeStyle = C.red;
  ctx.lineWidth = Math.max(1.5, S * 0.005);
  ctx.beginPath();
  const px = p[0] - Math.cos(a) * hl, py = p[1] - Math.sin(a) * hl;
  ctx.moveTo(px, py);
  ctx.quadraticCurveTo(px - S * 0.02, py + S * 0.02, px - S * 0.01, py + S * 0.04);
  ctx.stroke();
}

const horizons = new Map<string, Pt[]>();
function HORIZON(w: number, y: number): Pt[] {
  const key = `${w}|${y}`;
  let pts = horizons.get(key);
  if (!pts) {
    pts = [];
    for (let i = 0; i <= 10; i++) pts.push([(w * i) / 10, y + Math.sin(i * 1.7) * 3]);
    horizons.set(key, pts);
  }
  return pts;
}
