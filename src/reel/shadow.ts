import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, hash, lerp, seg } from '../core/math';
import { canvas, drawSprite, glow } from '../core/sprites';
import { drawRivalsFlat } from './duel';
import { FD, craneShape, FACES } from './fold';
import { type V3, lookAt, project, rotX, rotY } from './v3';

/*
 * III · SHADOW.
 *
 * The crane's last point of light, in the dark, is a bulb. It clicks on,
 * swinging, over a sheet of paper standing in the void, and the crane's
 * shadow lies on the paper, swaying with the light. Each flick of the bulb
 * melts the shadow soft and it sets again as something else: mountains under
 * a moon, then the two rivals from the first chapter, blades raised. The
 * light sinks into a sunset on the paper, and the two silhouettes harden on
 * its horizon (chapter IV is their fight).
 */

/** local beats */
export const SH = {
  click: 0.32,
  shapes: [[1.75, 2.55], [2.95, 3.75]] as const,
  /** the camera drifts round a little and back */
  reveal: [3.95, 4.55] as const,
  back: [4.55, 5.1] as const,
  sunset: [5.15, 6.0] as const,
  end: 6.2,
};

// the light at rest, the pivot it hangs from
const REST: V3 = [0, 420, 700];
const PIVOT: V3 = [0, 1500, 700];
const ROPE = PIVOT[1] - REST[1];
/** the shapes live on the wall in x ∈ [-480, 480], y ∈ [0, 960] */
const MW = 240, WU = 4; // mask px, wall units per mask px
const RIVALS_B = 1.9; // the duel's opening guard
const K_RIV = 1.1; // painting units → wall units

/* ------------------------------------------------------------- the shapes */

type Paint = (g: CanvasRenderingContext2D) => void;

const toWall = (g: CanvasRenderingContext2D) => g.setTransform(1 / WU, 0, 0, -1 / WU, MW / 2, MW);

const CRANE: Paint = (g) => {
  toWall(g);
  const v = craneShape(FD.end, 0);
  const P = (p: V3): Pt => {
    const q = rotX(rotY(p, 0.62), -0.32);
    return [q[0] * 3.3 - 20, q[1] * 3.3 + 300];
  };
  g.fillStyle = '#000';
  for (const [a, b, c] of FACES) {
    const A = P(v[a]), Bp = P(v[b]), C = P(v[c]);
    g.beginPath();
    g.moveTo(...A);
    g.lineTo(...Bp);
    g.lineTo(...C);
    g.closePath();
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = '#000';
    g.stroke();
  }
};

const PEAKS: Paint = (g) => {
  toWall(g);
  g.fillStyle = '#000';
  // karst peaks, as in the scroll, and the moon over them
  const ridge: Pt[] = [[-480, 0], [-470, 170], [-420, 300], [-380, 330], [-330, 250], [-280, 420], [-235, 560], [-200, 600], [-160, 540], [-120, 380], [-60, 300], [0, 360], [40, 470], [80, 520], [120, 470], [150, 330], [210, 250], [270, 300], [320, 400], [360, 430], [400, 360], [440, 240], [480, 160], [480, 0]];
  g.beginPath();
  ridge.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p)));
  g.closePath();
  g.fill();
  g.beginPath();
  g.arc(250, 760, 105, 0, TAU);
  g.fill();
};

const RIVALS: Paint = (g) => {
  g.setTransform(K_RIV / WU, 0, 0, K_RIV / WU, MW / 2 - (500 * K_RIV) / WU, MW - (1842 * K_RIV) / WU);
  drawRivalsFlat(g, RIVALS_B, 0, '#000');
};

let shapes: HTMLCanvasElement[] | null = null;

function build(paint: Paint): HTMLCanvasElement {
  const { c, ctx } = canvas(MW, MW);
  paint(ctx);
  return c;
}

function getShapes() {
  if (!shapes) shapes = [build(CRANE), build(PEAKS), build(RIVALS)];
  return shapes;
}

/* ------------------------------------------------------------- the light */

/** the swing: a flick, a decaying swing, and rest (exactly) by each shape's moment */
function swing(L: number) {
  const kicks: [number, number, number][] = [[SH.click, 0.5, 1.3], [1.7, 0.42, 2.6], [2.9, 0.42, 3.8]];
  let a = 0;
  for (const [t0, A, rest] of kicks) {
    if (L <= t0 || L >= rest) continue;
    const u = L - t0;
    a += A * Math.exp(-u * 1.6) * Math.sin(u * 9.5) * (1 - ease.inOut2(seg(L, rest - 0.35, rest)));
  }
  return a;
}

function lightAt(L: number): V3 {
  const a = swing(L);
  const up = ease.inOut2(seg(L, SH.sunset[0] + 0.05, SH.sunset[1] - 0.2)) * 1400;
  return [Math.sin(a) * ROPE, PIVOT[1] - Math.cos(a) * ROPE + up, PIVOT[2] + Math.sin(a * 0.6) * 120];
}

/** a picture, softened: drawn small and scaled back up (no canvas filter on iOS) */
const softs: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D }[] = [];
function soft(img: HTMLCanvasElement, k: number, slot: number) {
  const px = Math.max(10, Math.round(MW / (1.6 + k * 12)));
  if (!softs[slot] || softs[slot].c.width !== px) softs[slot] = canvas(px, px);
  const s = softs[slot];
  s.ctx.clearRect(0, 0, px, px);
  s.ctx.imageSmoothingQuality = 'high';
  s.ctx.drawImage(img, 0, 0, px, px);
  return s.c;
}

/* ------------------------------------------------------------- the camera */

function camera(L: number, w: number, h: number) {
  const fl = Math.min(w, h * 0.5) * 1.9;
  const cy = h * 0.45;
  // far off in the dark (a dot), then in and round to the side
  const kIn = ease.inOut3(seg(L, SH.click, 1.25));
  const kRev = ease.inOut3(seg(L, SH.reveal[0], SH.reveal[1]));
  const kBack = ease.inOut3(seg(L, SH.back[0], SH.back[1]));
  const th = lerp(lerp(0, 0.42, kIn) + 0.18 * kRev, 0, kBack);
  const r = lerp(lerp(4900, 1750, kIn) + 150 * kRev, 1650, kBack);
  const atY = lerp(REST[1], 400, kIn);
  const at: V3 = [lerp(lerp(0, -30, kIn), -120, kRev) * (1 - kBack), lerp(atY, 470, kBack), lerp(lerp(0, 120, kIn), 260, kRev) * (1 - kBack)];
  const pos: V3 = [Math.sin(th) * r, lerp(REST[1], 520, kIn) - 90 * kBack, Math.cos(th) * r];
  return lookAt(pos, at, fl, w / 2, cy);
}

/* ------------------------------------------------------------- the chapter */

const off = { c: null as HTMLCanvasElement | null, ctx: null as CanvasRenderingContext2D | null };

export function drawShadow(f: Frame, L: number, rivals = true) {
  const { ctx, w, h, t } = f;
  const cam = camera(L, w, h);
  const Lp = lightAt(L);
  // the bulb struggles, then clicks on
  const pre = L < SH.click ? (hash(Math.floor(t * 14)) < 0.25 + L * 1.5 ? 0.45 : 0.15) : 1;
  const on = L < SH.click ? 0 : 1;
  if (f.crossedFwd(f.B - L + SH.click)) f.flash(0.35, '#fff1d6');
  const sun = ease.inOut2(seg(L, SH.sunset[0], SH.sunset[1]));

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  if (on) {
    // ---- the floor and the paper wall, lit by the bulb (and then by the sunset)
    const hot: V3 = [Lp[0] * (1 - sun), lerp(Lp[1], 170, sun), 0];
    const H = project(cam, hot);
    const foot = project(cam, [Lp[0], 0, Math.min(Lp[2], 900)]);
    const fl = project(cam, [-2400, 0, 2200]), fr = project(cam, [2400, 0, 2200]), bl = project(cam, [-1500, 0, 0]), br = project(cam, [1500, 0, 0]);
    if (foot && fl && fr && bl && br) {
      const R = (1400 * cam.f) / foot[2];
      const g = ctx.createRadialGradient(foot[0], foot[1], 0, foot[0], foot[1], R);
      g.addColorStop(0, mix('#4a3a2a', '#2a1418', sun));
      g.addColorStop(0.5, mix('#1e1610', '#120a0e', sun));
      g.addColorStop(1, '#000');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bl[0], bl[1]);
      ctx.lineTo(br[0], br[1]);
      ctx.lineTo(fr[0], fr[1]);
      ctx.lineTo(fl[0], fl[1]);
      ctx.fill();
    }
    const W = [[-1500, 0], [1500, 0], [1500, 3400], [-1500, 3400]].map(([x, y]) => project(cam, [x, y, 0]));
    if (H && W.every(Boolean)) {
      const R = (1900 * cam.f) / H[2];
      const g = ctx.createRadialGradient(H[0], H[1], 0, H[0], H[1], R);
      g.addColorStop(0, mix('#f6e9cc', '#ffe2a8', sun));
      g.addColorStop(0.3, mix('#cdb48c', '#f08a45', sun));
      g.addColorStop(0.65, mix('#5e4a34', '#a0303a', sun));
      g.addColorStop(1, mix('#000000', '#2a0c26', sun));
      ctx.fillStyle = g;
      ctx.beginPath();
      W.forEach((p, i) => (i ? ctx.lineTo(p![0], p![1]) : ctx.moveTo(p![0], p![1])));
      ctx.closePath();
      ctx.fill();
      // the sun the bulb becomes, low on the paper
      if (sun > 0) {
        const r = (95 * cam.f) / H[2];
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = sun * 0.6;
        drawSprite(ctx, glow('#ff9a4a', 128), H[0], H[1], r * 8);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = ease.out2(seg(sun, 0.2, 0.7));
        ctx.fillStyle = '#fff0cf';
        ctx.beginPath();
        ctx.arc(H[0], H[1], r, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    // ---- the shadow: the picture on the paper, swaying against the swing, melting soft as it changes
    const sw = Math.ceil(w / 2), shh = Math.ceil(h / 2);
    if (!off.c || off.c.width !== sw || off.c.height !== shh) {
      const o = canvas(sw, shh);
      off.c = o.c;
      off.ctx = o.ctx;
    }
    const o = off.ctx!;
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, sw, shh);
    o.setTransform(0.5, 0, 0, 0.5, 0, 0);
    // shadows land only on the paper
    const WP = [[-1500, 0], [1500, 0], [1500, 3400], [-1500, 3400]].map(([x, y]) => project(cam, [x, y, 0]));
    o.save();
    if (WP.every(Boolean)) {
      o.beginPath();
      WP.forEach((p, i) => (i ? o.lineTo(p![0], p![1]) : o.moveTo(p![0], p![1])));
      o.closePath();
      o.clip();
    }
    if (rivals) {
      const sh = getShapes();
      const m1 = ease.inOut3(seg(L, SH.shapes[0][0], SH.shapes[0][1]));
      const m2 = ease.inOut3(seg(L, SH.shapes[1][0], SH.shapes[1][1]));
      const melt = Math.sin(m1 * Math.PI) + Math.sin(m2 * Math.PI);
      // the swing throws the shadow the other way, and stretches it a touch
      const dx = -Math.sin(swing(L)) * ROPE * 0.45 * (1 - sun);
      const grow = 1 + melt * 0.06;
      const layers: [HTMLCanvasElement, number][] = m2 > 0 ? [[sh[1], 1 - m2], [sh[2], m2]] : [[sh[0], 1 - m1], [sh[1], m1]];
      const tl = project(cam, [dx - (MW / 2) * WU * grow, MW * WU * grow, 0]), br2 = project(cam, [dx + (MW / 2) * WU * grow, 0, 0]);
      if (tl && br2) {
        o.imageSmoothingEnabled = true;
        layers.forEach(([img, a], i) => {
          if (a <= 0.001) return;
          o.globalAlpha = a;
          o.drawImage(soft(img, melt, i), tl[0], tl[1], br2[0] - tl[0], br2[1] - tl[1]);
        });
        o.globalAlpha = 1;
      }
    }
    o.restore();
    ctx.save();
    ctx.globalAlpha = lerp(0.82, 1, sun);
    ctx.drawImage(off.c!, 0, 0, w, h);
    ctx.restore();
    // and the silhouettes harden into figures: a crisp pass over the soft one
    if (sun > 0 && rivals) {
      const img = getShapes()[2];
      const tl = project(cam, [-MW / 2 * WU, MW * WU, 0]), br2 = project(cam, [MW / 2 * WU, 0, 0]);
      if (tl && br2) {
        ctx.save();
        ctx.globalAlpha = sun;
        ctx.drawImage(img, tl[0], tl[1], br2[0] - tl[0], br2[1] - tl[1]);
        ctx.restore();
      }
    }
  }

  // ---- the bulb on its cord
  drawBulb(ctx, cam, Lp, on ? 1 : pre, L, w, h, sun);
}

function drawBulb(ctx: CanvasRenderingContext2D, cam: ReturnType<typeof lookAt>, Lp: V3, power: number, L: number, w: number, h: number, sun: number) {
  const b = project(cam, Lp);
  if (!b) return;
  const fade = 1 - sun;
  if (fade <= 0) return;
  const r = (26 * cam.f) / b[2];
  ctx.save();
  ctx.globalAlpha = fade;
  // the cord, up out of the frame
  if (L >= SH.click) {
    const top = project(cam, [PIVOT[0], PIVOT[1] + 2000, PIVOT[2]]);
    if (top) {
      ctx.strokeStyle = '#2a2219';
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(b[0], b[1] - r);
      ctx.lineTo(top[0], top[1]);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  if (L < SH.click) {
    // the dot the last chapter left, stuttering
    ctx.globalAlpha = 0.7 * power + 0.1;
    drawSprite(ctx, glow('#ffcf7a', 64), b[0], b[1], 70);
    ctx.globalAlpha = 1;
    drawSprite(ctx, glow('#fff4dc', 32), b[0], b[1], 8 + power * 6);
  } else {
    ctx.globalAlpha = 0.55 * fade;
    drawSprite(ctx, glow('#ffcf7a', 128), b[0], b[1], r * 14);
    ctx.globalAlpha = fade;
    drawSprite(ctx, glow('#fff6e0', 64, 0.35), b[0], b[1], r * 2.6);
  }
  ctx.restore();
  void w;
  void h;
}

function mix(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], clamp(k)))).join(',')})`;
}

/** where the rivals stand at the end of the chapter, on screen: chapter IV starts from this */
export function rivalsOnScreen(w: number, h: number) {
  const cam = camera(SH.end, w, h);
  const p = (x: number, y: number) => project(cam, [x, y, 0])!;
  // painting units → screen: the duel's x = 500 and its ground (1842) map to wall x = 0, y = 0
  const o = p(0, 0), u = p(100, 0);
  const k = ((u[0] - o[0]) / 100) * K_RIV;
  return { x0: o[0], y0: o[1], k, sun: p(0, 170), sunR: (95 * cam.f) / p(0, 170)[2] };
}
