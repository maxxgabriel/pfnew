import { TAU, ease, seg } from './math';
import { drawSprite, glow } from './sprites';
import { C, F, font } from './style';

/*
 * CHAPTER MARKS PLAY A LOOP.
 *
 * Every chapter mark on the reel has its own little performance. Press one
 * and, before the film jumps there, a bubble pops up over the mark and plays
 * a tiny loop of that world: a blade flicking (Ink), a gear turning
 * (Machine), a red eye opening (Alter), a ball bouncing (Match), a circle
 * being painted (Hello), Blot waving (Credits).
 */

interface Play { name: string; x: number; t0: number }
let play: Play | null = null;
export const MARK_LOOP = 0.6; // seconds before the jump

export function startMarkLoop(name: string, x: number, t: number) {
  play = { name, x, t0: t };
}

export function drawMarkLoop(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, bottom: number) {
  if (!play) return;
  const age = t - play.t0;
  const life = MARK_LOOP + 0.35;
  if (age > life || age < 0) {
    play = null;
    return;
  }
  const S = Math.min(w, h);
  const r = Math.max(26, S * 0.085);
  const pop = age < 0.15 ? ease.outBack(age / 0.15, 2.4) : age > MARK_LOOP ? 1 - ease.in2(seg(age, MARK_LOOP, life)) : 1;
  const x = Math.min(w - r - 8, Math.max(r + 8, play.x));
  const y = h - bottom - r - 14;
  const k = age / MARK_LOOP; // 0..1 through the loop
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  // the bubble, with a little tail down to the mark
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.moveTo(-r * 0.2, r * 0.9);
  ctx.lineTo(play.x - x, r + 10);
  ctx.lineTo(r * 0.2, r * 0.9);
  ctx.fill();
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r - 2, 0, TAU);
  ctx.clip();
  scene(ctx, play.name, r, k, t);
  ctx.restore();
  ctx.restore();
}

function scene(ctx: CanvasRenderingContext2D, name: string, r: number, k: number, t: number) {
  ctx.lineCap = 'round';
  if (name === 'Ink') {
    // two blades flick and cross
    const a = Math.sin(k * Math.PI * 2) * 0.6;
    for (const [col, s] of [[C.blue, -1], [C.green, 1]] as const) {
      ctx.save();
      ctx.rotate(s * (0.7 - Math.abs(a)));
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = col;
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.7);
      ctx.lineTo(0, -r * 0.7);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = r * 0.05;
      ctx.stroke();
      ctx.restore();
    }
  } else if (name === 'Machine') {
    // a poster gear turning
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.rotate(k * TAU * 0.5);
    ctx.fillStyle = C.red;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const rr = i % 2 ? r * 0.52 : r * 0.68;
      const a0 = (i / 16) * TAU;
      ctx.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
      ctx.lineTo(Math.cos(a0 + TAU / 16) * rr, Math.sin(a0 + TAU / 16) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.18, 0, TAU);
    ctx.fill();
  } else if (name === 'Alter') {
    // a red eye opens and stares
    ctx.fillStyle = '#12040a';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    const open = Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (k > 0.85 ? 1 - seg(k, 0.85, 1) * 0.9 : 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glow('#ff1f3d', 64), 0, 0, r * 1.6 * open + 1);
    ctx.restore();
    ctx.fillStyle = '#ff3a52';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.7, r * 0.22 * open + 0.5, -0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a0006';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.07, r * 0.2 * open + 0.3, 0, 0, TAU);
    ctx.fill();
  } else if (name === 'Match') {
    // a ball bouncing on the grass
    ctx.fillStyle = C.pitchB;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.55);
    ctx.lineTo(r, r * 0.55);
    ctx.stroke();
    const b = Math.abs(Math.sin(k * Math.PI * 2));
    const by = r * 0.55 - r * 0.2 - b * r * 0.8;
    const sq = b < 0.15 ? 1 - (0.15 - b) * 2 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.55, r * 0.22 * (1 - b * 0.4), r * 0.06, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(0, by);
    ctx.rotate(k * 6);
    ctx.scale(1 / sq, sq);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) ctx.lineTo(Math.cos((i / 5) * TAU) * r * 0.08, Math.sin((i / 5) * TAU) * r * 0.08);
    ctx.fill();
    ctx.restore();
  } else if (name === 'Hello') {
    // the circle, painted
    ctx.fillStyle = C.paper;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, -2.2, -2.2 + TAU * 0.93 * ease.inOut2(Math.min(1, k * 1.3)));
    ctx.stroke();
  } else {
    // Credits: "the end", and a bow
    ctx.fillStyle = C.paper;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = C.ink;
    ctx.font = font(Math.round(r * 0.36), F.display);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(0, r * 0.25);
    ctx.rotate(-Math.sin(k * Math.PI) * 0.25);
    ctx.fillText('FIN', 0, -r * 0.25);
    ctx.restore();
  }
  void t;
}
