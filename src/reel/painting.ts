import { brush, ensoPath } from '../core/brush';
import { type Pt, TAU, clamp, ease, lerp, rng, seg } from '../core/math';
import { canvas } from '../core/sprites';

/*
 * THE PAINTING.
 *
 * Chapter I happens inside one tall hanging scroll, PW × PH painting units
 * (about the shape of a phone). Every cut the two fighters make stays on the
 * paper as a wet stroke of pigment, then drains to ink and flows into its
 * place in a landscape: the first cross becomes the far ridge, the leap the
 * cliff, the spray of a parry the pine, the spinning guard the moon, the
 * thunder the river. When the camera pulls back, the fight has painted the
 * whole scroll.
 *
 * Everything is a pure function of the film beat B, so scrolling back
 * un-paints it.
 */

export const PW = 1000;
export const PH = 2200;

/** mineral pigments: the two rivals, and gold leaf for the thunder */
export const PIG = {
  blue: '#2346d6',
  green: '#16936a',
  gold: '#c9a13b',
  goldHi: '#f3dc8e',
  ink: '#1a1714',
  inkMid: '#4a453f',
  inkPale: '#8f877a',
  paper: '#efe9db',
  sheet: '#f6f2e8',
  red: '#e2401f',
};

/* ------------------------------------------------------------- helpers */

const hexRgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export function mixHex(a: string, b: string, k: number) {
  const A = hexRgb(a), Bc = hexRgb(b);
  const kk = clamp(k);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, Bc[i], kk))).join(',')})`;
}

/** resample a polyline to n points evenly spaced along its length */
export function resample(pts: Pt[], n: number): Pt[] {
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = d[d.length - 1] || 1;
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (k / (n - 1)) * L;
    while (j < d.length - 2 && d[j + 1] < s) j++;
    const t = (s - d[j]) / (d[j + 1] - d[j] || 1);
    out.push([lerp(pts[j][0], pts[j + 1][0], t), lerp(pts[j][1], pts[j + 1][1], t)]);
  }
  return out;
}

export function lerpPts(a: Pt[], b: Pt[], k: number, lift = 0): Pt[] {
  // a gentle arc as the stroke flies into place, so it reads as moving, not cross-fading
  const arc = Math.sin(k * Math.PI) * lift;
  return a.map((p, i) => [lerp(p[0], b[i][0], k), lerp(p[1], b[i][1], k) - arc]);
}

/* -------------------------------------------------------------- camera */

export interface Cam { x: number; y: number; vw: number; rot: number }

/** screen px per painting unit (phone-first: the painting's width follows the shorter side) */
export function camZoom(w: number, h: number, vw: number) {
  return Math.min(w, h * 0.46) / vw;
}

/** keyed camera: [beat, x, y, view width, rotation], smooth through the keys */
export function camAt(keys: [number, number, number, number, number][], B: number): Cam {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] <= B) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const t = ease.inOutSine(clamp((B - k1[0]) / (k2[0] - k1[0])));
  const cr = (d: number) => {
    const p0 = k0[d], p1 = k1[d], p2 = k2[d], p3 = k3[d];
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };
  // view width is interpolated in log space, so zooms read at a constant speed
  const vw = Math.exp(lerp(Math.log(k1[3]), Math.log(k2[3]), t));
  return { x: cr(1), y: cr(2), vw, rot: cr(4) };
}

export function applyCam(ctx: CanvasRenderingContext2D, cam: Cam, w: number, h: number) {
  const z = camZoom(w, h, cam.vw);
  ctx.translate(w / 2, h / 2);
  ctx.rotate(cam.rot);
  ctx.scale(z, z);
  ctx.translate(-cam.x, -cam.y);
}

/* ------------------------------------------------------- the landscape */

export interface Element {
  /** the cut as it was made (painting units) */
  from: Pt[];
  /** where it settles in the landscape */
  to: Pt[];
  /** the cut is drawn over [b0, b1] */
  cut: readonly [number, number];
  /** then flows into place over [s0, s1] */
  settle: readonly [number, number];
  pigment: string;
  /** the colour it settles to */
  ink: string;
  width: [number, number];
  lift: number;
  seed: number;
  dry: number;
}

// ---- the far ridge: the first cross
const RIDGE_TO: Pt[] = [
  [-420, 1050], [-300, 990], [-170, 1030], [-80, 1070],
  [-30, 1085], [60, 1030], [140, 955], [205, 915], [270, 950], [335, 1012], [395, 990], [450, 935], [505, 905],
  [560, 960], [615, 1060], [665, 1010], [720, 955], [790, 925], [860, 980], [930, 1035], [1030, 1075],
  [1120, 1040], [1230, 985], [1330, 1025], [1420, 1060],
];
// ---- the cliff: the leap up
const CLIFF_TO: Pt[] = [
  [440, 2010], [425, 1870], [405, 1700], [420, 1480], [398, 1230], [380, 1040], [398, 905], [478, 842],
  [462, 796], [365, 766], [250, 758], [150, 770], [70, 826], [16, 900],
];
// ---- the river: the thunder, falling out of the gap in the ridge
const RIVER_TO: Pt[] = [
  [612, 1062], [600, 1150], [596, 1240], [622, 1330], [640, 1420], [610, 1510], [570, 1600], [574, 1700],
  [612, 1790], [610, 1880], [560, 1980], [520, 2080], [540, 2230],
];

export const N_RIDGE = 40, N_CLIFF = 44, N_RIVER = 36;

export const ELEMENTS = {
  ridge: {
    from: resample([[180, 1795], [330, 1772], [500, 1765], [670, 1772], [820, 1792]], N_RIDGE),
    to: resample(RIDGE_TO, N_RIDGE),
    cut: [2.78, 2.86], settle: [3.02, 3.55],
    pigment: PIG.blue, ink: PIG.inkMid, width: [46, 20], lift: 260, seed: 11, dry: 0.45,
  } as Element,
  cliff: {
    from: resample([[250, 1860], [300, 1640], [330, 1400], [330, 1150], [312, 930], [292, 790]], N_CLIFF),
    to: resample(CLIFF_TO, N_CLIFF),
    cut: [3.74, 4.0], settle: [3.92, 4.5],
    pigment: PIG.green, ink: PIG.ink, width: [40, 17], lift: 0, seed: 23, dry: 0.62,
  } as Element,
  river: {
    from: resample([[170, 1790], [300, 1735], [380, 1815], [520, 1725], [610, 1820], [740, 1730], [880, 1790]], N_RIVER),
    to: resample(RIVER_TO, N_RIVER),
    cut: [7.6, 7.625], settle: [7.95, 8.5],
    pigment: PIG.gold, ink: PIG.gold, width: [30, 24], lift: 120, seed: 41, dry: 0.15,
  } as Element,
};

/** the moon: the spinning guard's circle, lifted into the sky */
export const MOON = { x: 690, y: 430, r: 150 };
export const MOON_FROM = (cx: number, cy: number, r: number) => ensoPath(cx, cy, r, 4, 0.97, -1.2);
export const MOON_TO = ensoPath(MOON.x, MOON.y, MOON.r, 4, 0.97, -1.2);

/** the ground the drops paint, and the pine the parries spray */
export const BANK: Pt[][] = [
  resample([[300, 1842], [180, 1850], [40, 1868], [-200, 1888], [-480, 1898]], 22),
  resample([[700, 1842], [820, 1848], [960, 1862], [1200, 1882], [1480, 1894]], 22),
  resample([[300, 1842], [500, 1838], [700, 1842]], 18),
];
export const PINE_TRUNK: Pt[] = [[300, 772], [318, 720], [352, 676], [404, 640], [470, 618], [520, 612]];
export const PINE_BRANCHES: Pt[][] = [
  [[340, 690], [300, 650], [262, 640]],
  [[404, 640], [420, 590], [470, 560]],
  [[470, 618], [540, 600], [600, 612]],
];
/** needle clumps: [x, y, size] along the trunk and branches */
export const PINE_CLUMPS: [number, number, number][] = [
  [262, 636, 48], [300, 650, 36], [470, 556, 54], [430, 590, 34], [600, 606, 52], [548, 598, 40], [520, 612, 34], [352, 676, 30],
];

/* -------------------------------------------------------------- washes */

interface Wash { c: HTMLCanvasElement; top: number; bottom: number }
const RES = 0.4;
/** washes run this far past the sheet on each side (wide screens see them until the reveal) */
const X0 = 500;
let washes: { ridge: Wash; cliff: Wash; bank: Wash } | null = null;

interface WashOpts {
  poly: Pt[];
  top: number;
  bottom: number;
  alpha: number;
  seed: number;
  rgb: string;
  /** darkest along this x, fading out to `fadeX` (a tower lit from one side) */
  edgeX?: number;
  fadeX?: number;
  /** dry-brush texture strokes along a contour */
  texture?: Pt[];
}

function makeWash(o: WashOpts): Wash {
  const { c, ctx } = canvas((PW + X0 * 2) * RES, PH * RES);
  ctx.scale(RES, RES);
  ctx.translate(X0, 0);
  const r = rng(o.seed);
  // layered, slightly offset fills give the soft wet edge of a wash
  for (let k = 0; k < 7; k++) {
    const ox = (r() - 0.5) * 16, oy = (r() - 0.2) * 18 + k * 5;
    let g: CanvasGradient;
    if (o.edgeX !== undefined) {
      g = ctx.createLinearGradient(o.edgeX, 0, o.fadeX ?? 0, 0);
      g.addColorStop(0, `rgba(${o.rgb},${o.alpha / 4})`);
      g.addColorStop(0.45, `rgba(${o.rgb},${o.alpha / 9})`);
      g.addColorStop(1, `rgba(${o.rgb},${o.alpha / 30})`);
    } else {
      g = ctx.createLinearGradient(0, o.top + oy, 0, o.bottom);
      g.addColorStop(0, `rgba(${o.rgb},${o.alpha / 3.4})`);
      g.addColorStop(0.3, `rgba(${o.rgb},${o.alpha / 8})`);
      g.addColorStop(1, `rgba(${o.rgb},0)`);
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    o.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x + ox, y + oy) : ctx.moveTo(x + ox, y + oy)));
    ctx.closePath();
    ctx.fill();
  }
  // the wash dies into mist at its foot
  ctx.globalCompositeOperation = 'destination-out';
  const fog = ctx.createLinearGradient(0, o.bottom - (o.bottom - o.top) * 0.45, 0, o.bottom);
  fog.addColorStop(0, 'rgba(0,0,0,0)');
  fog.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fog;
  ctx.fillRect(-X0, o.top, PW + X0 * 2, o.bottom - o.top + 50);
  // granulation: the pigment settling in the paper's tooth
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 2200; i++) {
    const x = -X0 + r() * (PW + X0 * 2), y = o.top + r() * (o.bottom - o.top);
    ctx.fillStyle = r() > 0.5 ? `rgba(${o.rgb},0.10)` : 'rgba(246,242,232,0.12)';
    ctx.fillRect(x, y, 2 + r() * 5, 1 + r() * 2);
  }
  // texture: short dry strokes cut down the lit face (the painters' "axe-cut" strokes)
  if (o.texture) {
    ctx.globalCompositeOperation = 'source-over';
    const T = o.texture;
    for (let i = 0; i < 34; i++) {
      const u = r();
      const j = Math.min(T.length - 2, Math.floor(u * (T.length - 1)));
      const [x, y] = T[j];
      const len = 50 + r() * 110, ang = 1.9 + (r() - 0.5) * 0.5;
      const x0 = x - 12 - r() * 70, y0 = y + (r() - 0.5) * 40;
      brush(ctx, [[x0, y0], [x0 + Math.cos(ang) * len * 0.5, y0 + Math.sin(ang) * len * 0.5], [x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len]], {
        width: 7 + r() * 10, color: `rgb(${o.rgb})`, dry: 0.9, seed: 200 + i, press: 1.2, tail: 0.2, alpha: 0.35 + r() * 0.35,
      });
    }
  }
  return { c, top: o.top, bottom: o.bottom };
}

function buildWashes() {
  if (washes) return washes;
  const ridgePoly: Pt[] = [...RIDGE_TO, [1420, 1480], [-420, 1480]];
  const cliffPoly: Pt[] = [...[...CLIFF_TO].reverse(), [-X0, 900], [-X0, 2230]];
  const bankPoly: Pt[] = [[-X0, 1900], [-40, 1880], [300, 1842], [700, 1842], [1040, 1874], [PW + X0, 1890], [PW + X0, 2080], [-X0, 2080]];
  washes = {
    ridge: makeWash({ poly: ridgePoly, top: 900, bottom: 1480, alpha: 0.75, seed: 5, rgb: '74,69,63' }),
    cliff: makeWash({ poly: cliffPoly, top: 760, bottom: 2230, alpha: 1.15, seed: 9, rgb: '26,23,20', edgeX: 430, fadeX: 0, texture: CLIFF_TO.slice(1, 9) }),
    bank: makeWash({ poly: bankPoly, top: 1840, bottom: 2080, alpha: 0.5, seed: 13, rgb: '74,69,63' }),
  };
  return washes;
}

/** a wash bleeding down from its top edge as k runs 0→1 (no hard edge: it grows and darkens) */
function drawWash(ctx: CanvasRenderingContext2D, wash: Wash, k: number) {
  if (k <= 0) return;
  const e = ease.out2(k);
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 1.4);
  ctx.translate(0, wash.top);
  ctx.scale(1, lerp(0.35, 1, e));
  ctx.translate(0, -wash.top);
  ctx.drawImage(wash.c, -X0, 0, PW + X0 * 2, PH);
  ctx.restore();
}

/** a band of mist: paper showing through between the planes */
function drawMist(ctx: CanvasRenderingContext2D, y: number, hgt: number, a: number, t: number, seed: number) {
  if (a <= 0) return;
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const yy = y + Math.sin(t * 0.15 + i * 2 + seed) * 14 + (i - 1) * hgt * 0.22;
    const g = ctx.createLinearGradient(0, yy - hgt / 2, 0, yy + hgt / 2);
    g.addColorStop(0, 'rgba(246,242,232,0)');
    g.addColorStop(0.5, `rgba(246,242,232,${0.55 * a})`);
    g.addColorStop(1, 'rgba(246,242,232,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-PW, yy - hgt / 2, PW * 3, hgt);
  }
  ctx.restore();
}

/* --------------------------------------------------------- the sheet */

let sheetPat: CanvasPattern | null = null;

/** the scroll itself: a paler sheet with a soft edge; `edge` (0..1) fades the edge in for the reveal */
export function drawSheet(ctx: CanvasRenderingContext2D, paperTileC: HTMLCanvasElement, edge: number) {
  if (!sheetPat) sheetPat = ctx.createPattern(paperTileC, 'repeat');
  ctx.save();
  ctx.fillStyle = `rgba(60,48,30,${0.14 * edge})`;
  ctx.fillRect(10, 18, PW, PH);
  ctx.fillStyle = `rgba(60,48,30,${0.06 * edge})`;
  ctx.fillRect(24, 40, PW, PH);
  ctx.fillStyle = PIG.sheet;
  ctx.fillRect(0, 0, PW, PH);
  if (sheetPat) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = sheetPat;
    ctx.fillRect(0, 0, PW, PH);
  }
  ctx.restore();
}

/* ------------------------------------------------------ drawing it all */

/** a cut, then the cut flowing into the landscape */
function drawElement(ctx: CanvasRenderingContext2D, e: Element, B: number) {
  const cut = seg(B, e.cut[0], e.cut[1]);
  if (cut <= 0) return;
  const k = ease.inOut3(seg(B, e.settle[0], e.settle[1]));
  const pts = k <= 0 ? e.from : k >= 1 ? e.to : lerpPts(e.from, e.to, k, e.lift);
  // the wet stroke is darker and fatter; settled it thins into a line
  brush(ctx, pts, {
    width: lerp(e.width[0], e.width[1], k),
    color: mixHex(e.pigment, e.ink, ease.out2(seg(k, 0, 0.7))),
    progress: k > 0 ? 1 : ease.out3(cut),
    seed: e.seed,
    dry: e.dry,
    press: 1.3,
    tail: 0.3,
    halo: 0.18,
  });
}

/** once everything has settled the landscape never changes: paint it once, then reuse it */
const SETTLED = 8.6;
const CACHE_RES = 0.8;
let cache: HTMLCanvasElement | null = null;

/** cover what ran past the sheet with the paper around it, as the sheet's edge comes in */
export function trimToSheet(ctx: CanvasRenderingContext2D, edge: number, color: string) {
  if (edge <= 0) return;
  ctx.save();
  ctx.globalAlpha = edge;
  ctx.fillStyle = color;
  const M = 4000;
  ctx.fillRect(-M, -M, M, PH + M * 2);
  ctx.fillRect(PW, -M, M, PH + M * 2);
  ctx.fillRect(0, PH, PW, M);
  ctx.restore();
}

/** on wide screens the landscape dissolves into the paper at its sides, like mist at a painting's edge */
export function fadeSides(ctx: CanvasRenderingContext2D, color: string) {
  ctx.save();
  for (const [x0, x1] of [[-120, -440], [PW + 120, PW + 440]]) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, color.replace('rgb(', 'rgba(').replace(')', ',0)'));
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x0, x1), -PH, Math.abs(x1 - x0), PH * 3);
  }
  ctx.fillStyle = color;
  ctx.fillRect(-6000, -PH, 6000 - 440, PH * 3);
  ctx.fillRect(PW + 440, -PH, 6000, PH * 3);
  ctx.restore();
}

export function drawLandscape(ctx: CanvasRenderingContext2D, B: number, t: number) {
  if (B < SETTLED) return paintLandscape(ctx, B, t, true);
  if (!cache) {
    const c = canvas(PW * CACHE_RES, PH * CACHE_RES);
    c.ctx.scale(CACHE_RES, CACHE_RES);
    paintLandscape(c.ctx, SETTLED + 1, 0, false);
    cache = c.c;
  }
  ctx.drawImage(cache, 0, 0, PW, PH);
  drawRiverGlints(ctx, ELEMENTS.river.to, t);
}

/** everything the fight has painted so far */
function paintLandscape(ctx: CanvasRenderingContext2D, B: number, t: number, glints: boolean) {
  const W = buildWashes();
  const E = ELEMENTS;

  // the far ridge and its wash, mist at its foot
  drawWash(ctx, W.ridge, seg(B, E.ridge.settle[0] + 0.25, E.ridge.settle[1] + 0.25));
  drawMist(ctx, 1240, 300, seg(B, 3.3, 3.8), t, 1);
  drawElement(ctx, E.ridge, B);

  // the river (gold leaf), behind the cliff
  drawRiver(ctx, B, t, glints);

  // the cliff
  drawWash(ctx, W.cliff, seg(B, E.cliff.settle[0] + 0.15, E.cliff.settle[1] + 0.2));
  drawElement(ctx, E.cliff, B);

  drawMist(ctx, 1660, 220, seg(B, 4.2, 4.8), t, 2);
  drawMist(ctx, 1990, 260, seg(B, 4.2, 4.8), t, 3);
  // the bank the drops painted
  drawWash(ctx, W.bank, seg(B, 1.55, 2.1));
  BANK.forEach((b, i) => {
    const p = ease.out3(seg(B, 1.32 + (i === 2 ? 0.12 : 0), 1.62 + (i === 2 ? 0.12 : 0)));
    if (p > 0) brush(ctx, b, { width: 20 - i * 4, color: PIG.inkMid, progress: p, seed: 60 + i, dry: 0.55, press: 1.5, tail: 0.2 });
  });

  drawPine(ctx, B);
  drawMoon(ctx, B);
}

function drawRiver(ctx: CanvasRenderingContext2D, B: number, t: number, glints: boolean) {
  const e = ELEMENTS.river;
  const cut = seg(B, e.cut[0], e.cut[1]);
  if (cut <= 0) return;
  const k = ease.inOut3(seg(B, e.settle[0], e.settle[1]));
  const pts = k <= 0 ? e.from : k >= 1 ? e.to : lerpPts(e.from, e.to, k, e.lift);
  const wd = lerp(e.width[0], e.width[1], k);
  brush(ctx, pts, { width: wd, color: PIG.gold, progress: cut, seed: e.seed, dry: e.dry, press: 1.2, tail: 0.5, halo: 0.1 });
  // gold leaf catches the light: a thin bright edge and a few glints that travel down it
  ctx.save();
  ctx.translate(-wd * 0.12, -wd * 0.1);
  brush(ctx, pts, { width: wd * 0.28, color: PIG.goldHi, progress: cut, seed: e.seed + 1, dry: 0.6, press: 1, tail: 0.3, alpha: 0.85 });
  ctx.restore();
  if (k >= 1 && glints) drawRiverGlints(ctx, pts, t);
}

/** gold leaf catching the light as you watch: glints travelling down the river */
function drawRiverGlints(ctx: CanvasRenderingContext2D, pts: Pt[], t: number) {
  {
    ctx.fillStyle = '#fff6d6';
    for (let i = 0; i < 7; i++) {
      const u = (t * 0.06 + i / 7) % 1;
      const j = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)));
      const f = u * (pts.length - 1) - j;
      const x = lerp(pts[j][0], pts[j + 1][0], f), y = lerp(pts[j][1], pts[j + 1][1], f);
      const tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 2);
      ctx.globalAlpha = 0.5 + 0.5 * tw;
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + tw * 3, 8 + tw * 6, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** spray dots from the parries: where they fly, land, then gather into needle clumps */
export const SPRAY = (() => {
  const r = rng(77);
  return Array.from({ length: 64 }, (_, i) => {
    const clash = [5.0, 5.15, 5.3][i % 3];
    const ang = -Math.PI / 2 + (r() - 0.5) * 2.6;
    const v = 120 + r() * 260;
    const clump = PINE_CLUMPS[i % PINE_CLUMPS.length];
    return {
      clash, ang, v, size: 5 + r() * 9, col: i % 2 ? PIG.blue : PIG.green,
      dest: [clump[0] + (r() - 0.5) * clump[2] * 1.6, clump[1] + (r() - 0.5) * clump[2] * 0.7] as Pt,
      rot: (r() - 0.5) * 0.9,
    };
  });
})();
export const PINE_AT: Pt = [305, 650];

function drawPine(ctx: CanvasRenderingContext2D, B: number) {
  const gather = ease.inOut3(seg(B, 5.45, 5.9));
  // the spray first
  for (const d of SPRAY) {
    const q = seg(B, d.clash, d.clash + 0.12);
    if (q <= 0) continue;
    const fly = ease.out3(q);
    const lx = PINE_AT[0] + Math.cos(d.ang) * d.v * fly, ly = PINE_AT[1] + Math.sin(d.ang) * d.v * fly + q * q * 60;
    const x = lerp(lx, d.dest[0], gather), y = lerp(ly, d.dest[1], gather);
    ctx.fillStyle = mixHex(d.col, PIG.ink, gather);
    ctx.globalAlpha = 1 - seg(gather, 0.55, 1);
    if (ctx.globalAlpha <= 0) continue;
    // a dot while it flies; a needle dab once it has gathered
    const len = lerp(d.size, d.size * 2.6, gather), thick = lerp(d.size, d.size * 0.55, gather);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lerp(0, d.rot, gather));
    ctx.beginPath();
    ctx.ellipse(0, 0, len, thick, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (gather <= 0) return;
  // the trunk and branches paint themselves up out of the rock
  brush(ctx, PINE_TRUNK, { width: 22, color: PIG.ink, progress: gather, seed: 31, dry: 0.65, press: 1.4, tail: 0.4 });
  PINE_BRANCHES.forEach((b, i) => {
    const p = seg(gather, 0.35 + i * 0.15, 0.85 + i * 0.05);
    if (p > 0) brush(ctx, b, { width: 9, color: PIG.ink, progress: p, seed: 32 + i, dry: 0.7, press: 1.2, tail: 0.3 });
  });
  // needle clumps darken in last
  const nd = seg(gather, 0.6, 1);
  if (nd > 0) {
    ctx.save();
    ctx.globalAlpha = nd * 0.85;
    PINE_CLUMPS.forEach(([x, y, s], i) => {
      const r = rng(90 + i);
      ctx.fillStyle = PIG.ink;
      for (let k = 0; k < 9; k++) {
        ctx.save();
        ctx.translate(x + (r() - 0.5) * s * 1.4, y + (r() - 0.5) * s * 0.5);
        ctx.rotate((r() - 0.5) * 0.5);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * (0.35 + r() * 0.3), s * 0.07, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    });
    ctx.restore();
  }
}

/** the spinning guard, then the moon */
export const MOON_SPIN = { b0: 6.5, b1: 6.62, settle: [6.66, 7.0] as const };
let moonFrom: { key: string; pts: Pt[] } | null = null;
export function setMoonFrom(cx: number, cy: number, r: number) {
  const key = `${Math.round(cx)}|${Math.round(cy)}|${Math.round(r)}`;
  if (moonFrom?.key !== key) moonFrom = { key, pts: MOON_FROM(cx, cy, r) };
}

function drawMoon(ctx: CanvasRenderingContext2D, B: number) {
  if (!moonFrom) return;
  const cut = seg(B, MOON_SPIN.b0, MOON_SPIN.b1);
  if (cut <= 0) return;
  const k = ease.inOut3(seg(B, MOON_SPIN.settle[0], MOON_SPIN.settle[1]));
  const pts = k <= 0 ? moonFrom.pts : k >= 1 ? MOON_TO : lerpPts(moonFrom.pts, MOON_TO, k, 120);
  // the moon's glow: a pale wash inside the circle once it has settled
  if (k > 0.5) {
    ctx.save();
    ctx.globalAlpha = seg(k, 0.5, 1) * 0.5;
    const g = ctx.createRadialGradient(MOON.x, MOON.y, MOON.r * 0.2, MOON.x, MOON.y, MOON.r * 1.9);
    g.addColorStop(0, 'rgba(143,135,122,0.18)');
    g.addColorStop(1, 'rgba(143,135,122,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(MOON.x, MOON.y, MOON.r * 1.9, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  brush(ctx, pts, {
    width: lerp(30, 22, k),
    color: mixHex(PIG.blue, PIG.inkMid, ease.out2(seg(k, 0, 0.7))),
    progress: k > 0 ? 1 : cut,
    seed: 4,
    dry: 0.45,
    press: 1.4,
    tail: 0.25,
  });
}
