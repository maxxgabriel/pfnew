import { brush } from '../core/brush';
import type { Frame } from '../core/frame';
import { type Pt, TAU, bell, clamp, ease, hash, lerp, rng, seg } from '../core/math';
import { paperTile, withAlpha } from '../core/sprites';
import { C, F, font } from '../core/style';
import { drawSeal } from './ink';

/*
 * THE HAND-SCROLL.
 *
 * At every act change the frame shrinks into one panel of a long painted
 * scroll — an emakimono, read right to left in life and left to right here —
 * held open between two wooden rollers. The acts already watched sit to the
 * left as paintings; the ones still to come are blank paper with pencil
 * sketches. The act's name is brushed in beside its panel, the seal goes
 * down, and the camera dives back in. After the credits the whole mural is
 * finished, and the scroll rolls itself shut.
 */

export const ACTS = [
  { kanji: '墨', name: 'INK', n: 'I' },
  { kanji: '機', name: 'MACHINE', n: 'II' },
  { kanji: '遊', name: 'ARCADE', n: 'III' },
  { kanji: '試合', name: 'MATCH', n: 'IV' },
  { kanji: '縁', name: 'HELLO', n: 'V' },
];

let paper: CanvasPattern | null = null;

interface Geo { Z: number; pw: number; ph: number; gap: number; step: number }
function geo(w: number, h: number): Geo {
  const portrait = h > w;
  const Z = portrait ? 0.5 : 0.42;
  const pw = w * Z, ph = h * Z;
  const gap = Math.max(w * (portrait ? 0.2 : 0.12), 70);
  return { Z, pw, ph, gap, step: pw + gap };
}

export function drawScrollInterlude(
  f: Frame, p: number, act: number,
  live: HTMLCanvasElement | null, snap: (i: number) => HTMLCanvasElement | null, dpr: number,
) {
  const { ctx, w, h, t } = f;
  if (!paper) paper = ctx.createPattern(paperTile(512, C.paper), 'repeat');
  const g = geo(w, h);
  // pull out, hold on the mural, dive back in
  const out = ease.inOut3(seg(p, 0, 0.3));
  const back = ease.inOut3(seg(p, 0.74, 1));
  const k = out * (1 - back);
  const s = lerp(1 / g.Z, 1, k);
  // while held, the camera glances back along the scroll at what's been
  const look = bell(p, 0.3, 0.74) * (act > 0 ? 0.42 : 0) * g.step;
  const camX = act * g.step - look;

  drawMural(f, g, s, camX, k, (i) => {
    if (i === act) return { img: live, scale: 1 / dpr, state: 'live' as const };
    if (i < act) return { img: snap(i), scale: 1, state: 'past' as const };
    return { img: null, scale: 1, state: 'future' as const };
  }, (i) => {
    // the current act's name gets painted in during the hold
    if (i !== act) return i < act ? 1 : 0;
    return seg(p, 0.3, 0.55);
  }, (i) => (i === act ? seg(p, 0.55, 0.62) : i < act ? 1 : 0));

  void t;
}

export function drawMuralClose(f: Frame, p: number, snap: (i: number) => HTMLCanvasElement | null) {
  const { ctx, w, h, t } = f;
  if (!paper) paper = ctx.createPattern(paperTile(512, C.paper), 'repeat');
  const g = geo(w, h);
  const appear = ease.inOut2(seg(p, 0, 0.12));
  // pan the finished mural end to end, then roll it shut
  const pan = ease.inOut2(seg(p, 0.05, 0.6));
  const s = lerp(1.6, 0.92, appear);
  const camX = lerp(0, 4 * g.step, pan);
  const close = ease.inOut3(seg(p, 0.62, 0.84));
  drawMural(f, g, s, camX, 1, (i) => ({ img: snap(i), scale: 1, state: 'past' as const }), () => 1, () => 1, close);
  // the cord and the end seal
  const tie = seg(p, 0.84, 0.92);
  if (tie > 0) {
    const cy = h * 0.47;
    ctx.strokeStyle = C.red;
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.008);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const r = Math.min(w, h) * 0.06;
    ctx.ellipse(w / 2, cy, r * 1.4, r * 0.5 * ease.out3(tie), 0, 0, TAU * ease.out3(tie));
    ctx.stroke();
  }
  const st = seg(p, 0.9, 0.96);
  if (st > 0) {
    const S = Math.min(w, h);
    ctx.save();
    ctx.translate(w / 2, h * 0.47);
    const sc = st < 1 ? lerp(2.2, 1, ease.outBack(st, 2)) : 1;
    ctx.scale(sc, sc);
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.roundRect(-S * 0.06, -S * 0.06, S * 0.12, S * 0.12, S * 0.01);
    ctx.fill();
    ctx.fillStyle = C.paper;
    ctx.font = font(S * 0.085, F.serif, 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('終', 0, S * 0.004);
    ctx.restore();
  }
  // fade to black for what comes after the credits
  const black = seg(p, 0.96, 1);
  if (black > 0) {
    ctx.fillStyle = `rgba(5,5,5,${black})`;
    ctx.fillRect(0, 0, w, h);
  }
  void t;
}

type Content = { img: HTMLCanvasElement | null; scale: number; state: 'live' | 'past' | 'future' };

function drawMural(
  f: Frame, g: Geo, s: number, camX: number, k: number,
  content: (i: number) => Content, titleP: (i: number) => number, sealP: (i: number) => number, close = 0,
) {
  const { ctx, w, h, t } = f;
  const S = Math.min(w, h);
  const cy = lerp(h * 0.5, h * 0.47, k);
  // mural space → screen
  const sx = (x: number) => w / 2 + (x - camX) * s;
  const sy = (y: number) => cy + (y - 0) * s;

  // the table under the scroll: dark lacquer with a lamp pool
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 2);
  const bg = ctx.createRadialGradient(w / 2, cy, 0, w / 2, cy, Math.hypot(w, h) * 0.7);
  bg.addColorStop(0, '#2a2420');
  bg.addColorStop(1, '#0b0908');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // rollers sit at the edges of the view and slide together when it closes
  const rollGap = lerp(lerp(w * 0.62, w * 0.46, k), S * 0.04, close);
  const rl = w / 2 - rollGap, rr = w / 2 + rollGap;
  const stripH = g.ph * 1.34 * s;

  // paper strip between the rollers
  ctx.save();
  ctx.beginPath();
  ctx.rect(rl, sy(-g.ph * 0.67), rr - rl, stripH);
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(rl, sy(-g.ph * 0.67) + S * 0.015, rr - rl, stripH);
  // the paper's fibres travel with the scroll
  paper!.setTransform(new DOMMatrix().translateSelf(-(camX * s) % 512, 0));
  ctx.fillStyle = paper!;
  ctx.fillRect(rl, sy(-g.ph * 0.67), rr - rl, stripH);
  // a ruled border top and bottom, like mounted silk
  ctx.fillStyle = '#c9b38a';
  ctx.fillRect(rl, sy(-g.ph * 0.67), rr - rl, stripH * 0.035);
  ctx.fillRect(rl, sy(-g.ph * 0.67) + stripH * 0.965, rr - rl, stripH * 0.035);

  for (let i = 0; i < ACTS.length; i++) {
    const x0 = sx(i * g.step - g.pw / 2), y0 = sy(-g.ph / 2);
    const pw = g.pw * s, ph = g.ph * s;
    if (x0 > w || x0 + pw + g.gap * s < 0) continue;
    const c = content(i);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, pw, ph);
    ctx.clip();
    if (c.img) {
      ctx.drawImage(c.img, x0, y0, pw, ph);
      if (c.state === 'past') {
        // printed onto the paper: a wash of paper over the picture
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = paper!;
        ctx.fillRect(x0, y0, pw, ph);
        ctx.globalAlpha = 1;
      }
    } else {
      drawSketch(ctx, x0, y0, pw, ph, i, t);
    }
    ctx.restore();
    // brushed border: four straight strokes, cached in mural space so the
    // camera moving doesn't re-spline them every frame
    const sides = frameRect(i, g.pw, g.ph);
    ctx.save();
    ctx.translate(x0, y0);
    ctx.scale(s, s);
    for (let e = 0; e < 4; e++) {
      brush(ctx, sides[e], {
        width: Math.max(2, S * 0.012), color: c.state === 'future' ? 'rgba(20,18,15,0.35)' : C.ink, dry: 0.75, seed: 200 + i * 4 + e, press: 1.15, tail: 0.5,
      });
    }
    ctx.restore();

    // the act's name, vertical, in the gap to the right of its panel
    const tp = titleP(i);
    const tx = x0 + pw + g.gap * s * 0.5;
    if (tp > 0) {
      const kj = ACTS[i].kanji;
      const kpx = Math.min(g.gap * s * 0.62, ph * 0.2);
      ctx.font = font(kpx, F.serif, 800);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      [...kj].forEach((ch, j) => {
        const a = seg(tp, j * 0.2, j * 0.2 + 0.5);
        ctx.fillStyle = withAlpha(C.ink, a);
        ctx.save();
        ctx.translate(tx, y0 + kpx * 0.8 + j * kpx * 1.05);
        ctx.scale(lerp(1.3, 1, ease.out3(a)), lerp(1.3, 1, ease.out3(a)));
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      });
      // the English, rotated, under the kanji
      const epx = Math.max(8, kpx * 0.32);
      ctx.save();
      ctx.translate(tx, y0 + kpx * (1.1 + kj.length * 1.05));
      ctx.rotate(Math.PI / 2);
      ctx.font = font(epx, F.display);
      ctx.textAlign = 'left';
      ctx.fillStyle = withAlpha(C.ink, seg(tp, 0.4, 0.9) * 0.75);
      ctx.fillText(ACTS[i].name, 0, 0);
      ctx.restore();
    } else if (content(i).state === 'future') {
      ctx.font = font(Math.min(g.gap * s * 0.4, ph * 0.12), F.serif, 600);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(20,18,15,0.25)';
      ctx.fillText('?', tx, y0 + ph * 0.12);
    }
    const sp = sealP(i);
    if (sp > 0) {
      const sz = Math.min(g.gap * s * 0.42, ph * 0.12);
      const sc = sp < 1 ? lerp(2.2, 1, ease.outBack(sp, 2)) : 1;
      drawSeal(ctx, tx, y0 + ph - sz * 0.8, sz * sc, -0.05 + i * 0.03, Math.min(1, sp * 3));
    }
  }
  ctx.restore();

  // rollers
  const rollerA = Math.min(1, k * 1.5);
  if (rollerA > 0) {
    for (const [x, side] of [[rl, -1], [rr, 1]] as const) {
      drawRoller(ctx, x, sy(-g.ph * 0.67) - S * 0.03, stripH + S * 0.06, S * 0.032 * Math.max(0.6, s * 0.9), camX * s * side, rollerA);
    }
  }
}

function drawRoller(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, r: number, spin: number, a: number) {
  ctx.save();
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, '#2b1a10');
  g.addColorStop(0.35, '#7a4f2e');
  g.addColorStop(0.55, '#a8754a');
  g.addColorStop(1, '#2b1a10');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y, r * 2, len);
  // grain lines rolling as the paper moves
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const ph = ((i / 8) * TAU + spin * 0.05) % TAU;
    const xx = x + Math.cos(ph) * r * 0.9;
    if (Math.sin(ph) < 0) continue;
    ctx.beginPath();
    ctx.moveTo(xx, y);
    ctx.lineTo(xx, y + len);
    ctx.stroke();
  }
  // end caps
  ctx.fillStyle = '#d9b26b';
  for (const yy of [y - r * 0.5, y + len - r * 0.5]) {
    ctx.beginPath();
    ctx.roundRect(x - r * 1.25, yy, r * 2.5, r, r * 0.3);
    ctx.fill();
  }
  ctx.restore();
}

const frames = new Map<string, Pt[][]>();
function frameRect(i: number, w: number, h: number): Pt[][] {
  const key = `${i}|${w | 0}|${h | 0}`;
  let sides = frames.get(key);
  if (!sides) {
    const j = (n: number) => (hash(n + i * 17) - 0.5) * Math.min(w, h) * 0.02;
    const o = Math.min(w, h) * 0.02; // strokes overshoot the corners a little
    sides = [
      [[-o, j(1)], [w / 2, j(2)], [w + o * 0.5, j(3)]],
      [[w + j(4), -o * 0.5], [w + j(5), h / 2], [w + j(6), h + o]],
      [[w + o, h + j(7)], [w / 2, h + j(8)], [-o * 0.5, h + j(9)]],
      [[j(10), h + o * 0.5], [j(11), h / 2], [j(12), -o]],
    ];
    frames.set(key, sides);
  }
  return sides;
}

/** what a not-yet-painted panel looks like: pencil roughs of what's coming */
function drawSketch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, i: number, t: number) {
  ctx.strokeStyle = 'rgba(60,55,50,0.28)';
  ctx.lineWidth = Math.max(0.8, w * 0.004);
  ctx.lineCap = 'round';
  const r = rng(i * 13 + 5);
  const wob = () => (r() - 0.5) * w * 0.02;
  ctx.beginPath();
  if (i === 1) {
    // funnel and letters
    ctx.moveTo(x + w * 0.2, y + h * 0.15); ctx.lineTo(x + w * 0.45, y + h * 0.3); ctx.lineTo(x + w * 0.55, y + h * 0.3); ctx.lineTo(x + w * 0.8, y + h * 0.15);
    for (let k = 0; k < 4; k++) ctx.rect(x + w * (0.12 + k * 0.2) + wob(), y + h * 0.45 + wob(), w * 0.16, h * 0.12);
  } else if (i === 2) {
    ctx.roundRect(x + w * 0.2, y + h * 0.25, w * 0.6, h * 0.45, w * 0.05);
    ctx.moveTo(x + w * 0.45, y + h * 0.25); ctx.lineTo(x + w * 0.35, y + h * 0.1);
    ctx.moveTo(x + w * 0.55, y + h * 0.25); ctx.lineTo(x + w * 0.65, y + h * 0.1);
  } else if (i === 3) {
    ctx.moveTo(x + w * 0.05, y + h * 0.75); ctx.lineTo(x + w * 0.3, y + h * 0.45); ctx.lineTo(x + w * 0.7, y + h * 0.45); ctx.lineTo(x + w * 0.95, y + h * 0.75);
    ctx.rect(x + w * 0.42, y + h * 0.4, w * 0.16, h * 0.05);
    ctx.moveTo(x + w * 0.5 + w * 0.12, y + h * 0.6); ctx.arc(x + w * 0.5, y + h * 0.6, w * 0.12, 0, TAU);
  } else {
    ctx.moveTo(x + w * 0.5 + w * 0.22, y + h * 0.35); ctx.arc(x + w * 0.5, y + h * 0.35, w * 0.22, 0, TAU * 0.92);
    ctx.moveTo(x + w * 0.2, y + h * 0.75); ctx.lineTo(x + w * 0.8, y + h * 0.75);
  }
  ctx.stroke();
  // hatching to suggest light falling on the rough
  ctx.strokeStyle = 'rgba(60,55,50,0.1)';
  ctx.beginPath();
  for (let k = 0; k < 12; k++) {
    const yy = y + h * (0.82 + k * 0.012);
    ctx.moveTo(x + w * 0.1, yy); ctx.lineTo(x + w * (0.4 + r() * 0.4), yy + Math.sin(t + k) * 0.5);
  }
  ctx.stroke();
  void clamp;
}
