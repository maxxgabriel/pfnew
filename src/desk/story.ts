import type { Frame } from '../core/frame';
import { ESCAPE_AT } from '../core/holds';
import { type Pt, TAU, clamp, ease, lerp, seg } from '../core/math';
import { CHAPTERS } from '../core/frame';
import { artImage, artSize, drawPose, queueArt } from '../sketch/art';
import { CH, ESC_OUT, KNOCK } from '../sketch/chase';
import { HM, homeSeal } from '../sketch/home';
import { RN } from '../sketch/run';
import { type Shot } from './camera';
import { live } from './live';

/*
 * THE STORY ON THE DESK (round 30, PC). The desk is not the frame: the camera
 * only goes out to it when the story spills off the paper.
 *
 *   I/II   the Eraser on the desk wakes up and hops onto the sheet (it is the
 *          villain); its dusty outline stays behind.
 *   VII    at the wink he notices the desk, knocks on the inside of the page
 *          (it bulges), then flies out and loops round the coffee (the
 *          'escape' hold).
 *   VIII   the fire kick burns a hole right through the sheet; the Eraser,
 *          scorched and smaller, hops home.
 * Round them, the desk lives with the story: the light changes (morning,
 * the lamp off for the duel, sunset for the chase, night at the end), a
 * crumpled draft lands for every chapter done, and the big hits shake it.
 * Everything is a pure function of the playhead (and the hold's progress).
 */

/** chapter start beats */
const AT = (n: string) => CHAPTERS.find((c) => c.name === n)!.at;
const RUN = AT('Run'), CHASE = AT('Chase'), HOME = AT('Home');

/* ------------------------------------------------------------ the photo */

/** the desk photo is drawn this many screen widths wide, centred on the sheet (src/desk/desk.ts) */
export const PHOTO_W = 2.6;
/** a point of the desk photo (u, v in 0..1) on the desk */
export function photo(u: number, v: number, w: number, h: number): Pt {
  const ww = w * PHOTO_W, wh = ww / 1.5;
  return [w / 2 + (u - 0.5) * ww, h * 0.5 + (v - 0.5) * wh];
}
/** where things are in the (mirrored) photo */
const MUG: Pt = [0.67, 0.07], PLANT: Pt = [0.88, 0.15];

/* ------------------------------------------------------------ the eraser */

/** where the real eraser lies, and how big it is */
const eraserHome = (w: number, h: number): Pt => [w * 0.16, h * 1.17];
const ERASER_K = 'prop2_1';
const eraserLen = (h: number) => h * 0.3;
/** Run: it wakes, wriggles and hops onto the page as the villain slams down there */
const EZ = { wake: [2.5, 2.8] as const, hop: [2.8, 3.36] as const };
/** Home: after the snap (the 'finale' hold) it gathers itself again in its place, scorched and worn down */
const EZ_BACK = [5.85, 6.3] as const, WORN = 0.72;

function drawEraserProp(g: CanvasRenderingContext2D, x: number, y: number, len: number, rot: number, alpha = 1, sq = 1, scorch = 0, lift = 0) {
  const im = artImage(ERASER_K);
  if (!im) return;
  const [aw, ah] = artSize(ERASER_K);
  const wd = len * (aw / ah);
  g.save();
  g.globalAlpha *= alpha;
  // the higher it is, the further its shadow falls
  if (lift > 0) {
    g.save();
    g.globalAlpha *= 0.28 * (1 - Math.min(0.7, lift));
    g.fillStyle = '#1a140c';
    g.beginPath();
    g.ellipse(x + lift * len * 0.5, y + lift * len * 0.8, wd * 0.5, len * 0.42, rot, 0, TAU);
    g.fill();
    g.restore();
  }
  g.translate(x, y);
  g.rotate(rot);
  g.scale((1 + lift * 0.35) / Math.sqrt(sq), (1 + lift * 0.35) * sq);
  g.drawImage(im, -wd / 2, -len / 2, wd, len);
  if (scorch > 0) {
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha *= scorch;
    const gr = g.createLinearGradient(0, -len / 2, 0, len / 2);
    gr.addColorStop(0, 'rgba(30,18,10,0.75)');
    gr.addColorStop(1, 'rgba(30,18,10,0.15)');
    g.fillStyle = gr;
    g.fillRect(-wd / 2, -len / 2, wd, len);
  }
  g.restore();
}

/** the dusty outline it left behind, and the crumbs */
function drawDust(g: CanvasRenderingContext2D, x: number, y: number, len: number, a: number) {
  if (a <= 0) return;
  const wd = len * 0.62;
  g.save();
  g.globalAlpha *= a;
  g.translate(x, y);
  g.rotate(0.22);
  g.strokeStyle = 'rgba(214,170,170,0.55)';
  g.setLineDash([len * 0.05, len * 0.04]);
  g.lineWidth = len * 0.02;
  g.strokeRect(-wd / 2, -len / 2, wd, len);
  g.setLineDash([]);
  g.fillStyle = 'rgba(210,160,160,0.55)';
  for (let i = 0; i < 5; i++) {
    const r = len * (0.025 + (i % 3) * 0.012);
    g.beginPath();
    g.ellipse(Math.sin(i * 2.3) * wd * 0.5, len * (0.55 + (i % 2) * 0.1), r * 1.4, r, i, 0, TAU);
    g.fill();
  }
  g.restore();
}

/** the eraser where it lies: on the desk, gone (its dust), or back (worn) — the hops are drawn above the sheet */
function eraserUnder(g: CanvasRenderingContext2D, f: Frame, jump: number) {
  const { w, h, B } = f;
  const [x, y] = eraserHome(w, h);
  const len = eraserLen(h);
  const L = B - RUN;
  if (L < EZ.hop[0]) {
    // waking: a twitch, a wriggle
    const u = seg(L, EZ.wake[0], EZ.wake[1]);
    const wig = u > 0 ? Math.sin(u * 30) * 0.12 * Math.sin(u * Math.PI) : 0;
    drawEraserProp(g, x, y - jump * h * 0.03, len, 0.22 + wig, 1, 1 + Math.sin(u * 22) * 0.06 * u);
    return;
  }
  const back = B - HOME;
  if (B < HOME || back < EZ_BACK[0]) { drawDust(g, x, y, len, 1); return; }
  // snapped to dust on the page, it gathers itself again where it lay: back, smaller, singed
  const k = seg(back, EZ_BACK[0], EZ_BACK[1]);
  drawDust(g, x, y, len, 1 - k);
  drawEraserProp(g, x, y - jump * h * 0.03, len * WORN, 0.3, k, 1 + (1 - k) * 0.3, 0.8);
}

function eraserOver(g: CanvasRenderingContext2D, f: Frame) {
  const { w, h, B } = f;
  const home = eraserHome(w, h);
  const len = eraserLen(h);
  const L = B - RUN;
  if (L >= EZ.hop[0] && L < EZ.hop[1]) {
    // onto the page, landing where the villain slams down (or where it will)
    const u = seg(L, EZ.hop[0], EZ.hop[1]);
    // (onto the line he runs on, where the villain slams down: its x once it is falling, the line's height from him)
    const gy = live.runHero ? live.runHero.y : h * 0.7, face = live.runHero ? live.runHero.size : h * 0.08;
    const to: Pt = [live.runEraser ? live.runEraser.x : (live.runHero ? live.runHero.x - face * 2.6 : w * 0.3), gy - len * 0.42];
    const k = ease.inOut2(u);
    const x = lerp(home[0], to[0], k), y = lerp(home[1], to[1], k);
    const lift = Math.sin(u * Math.PI) * 1.4;
    drawEraserProp(g, x, y, len, 0.22 + u * TAU * 0.75, 1 - seg(u, 0.88, 1), 1, 0, lift);
    return;
  }
}

/* ------------------------------------------------------------ the escape (hold) */

/** his flight out of the sheet, round the coffee and the plant, and back in */
function escapeAt(f: Frame, p: number): { at: Pt; ang: number; dir: number; lift: number } {
  const { w, h } = f;
  const s0: Pt = live.chaseHero ? [live.chaseHero.x, live.chaseHero.y] : [w * 0.5, h * 0.62];
  const mug = photo(MUG[0], MUG[1], w, h), plant = photo(PLANT[0], PLANT[1], w, h);
  const R = h * 0.42;
  const u = seg(p, ESC_OUT[0], ESC_OUT[1]);
  // out over the top edge, a full circle round the mug, a swing past the plant, back down to where he was
  const pts: Pt[] = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const q = i / N;
    let pt: Pt;
    if (q < 0.25) { const a = ease.inOut2(q / 0.25); pt = [lerp(s0[0], mug[0] - R, a), lerp(s0[1], mug[1] + R * 0.2, a)]; }
    else if (q < 0.65) { const a = (q - 0.25) / 0.4; const th = Math.PI * 0.95 + a * TAU; pt = [mug[0] + Math.cos(th) * R, mug[1] - Math.sin(th) * R * 0.9]; }
    else if (q < 0.8) { const a = ease.inOut2((q - 0.65) / 0.15); const c: Pt = [mug[0] - R * 0.95, mug[1] + R * 0.25]; pt = [lerp(c[0], plant[0] - R * 0.3, a), lerp(c[1], plant[1] + R * 0.6, a)]; }
    else { const a = ease.inOut2((q - 0.8) / 0.2); pt = [lerp(plant[0] - R * 0.3, s0[0], a), lerp(plant[1] + R * 0.6, s0[1], a)]; }
    pts.push(pt);
  }
  const fi = u * N, i0 = Math.min(N - 1, Math.floor(fi)), fr = fi - i0;
  const a = pts[i0], b = pts[i0 + 1];
  const at: Pt = [lerp(a[0], b[0], fr), lerp(a[1], b[1], fr)];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return { at, ang: Math.atan2(dy, Math.abs(dx)) * 0.6, dir: dx < 0 ? -1 : 1, lift: Math.sin(u * Math.PI) };
}

function escapeOver(g: CanvasRenderingContext2D, f: Frame, p: number) {
  const face = live.chaseHero?.size ?? f.h * 0.08;
  // the knocks: the page bulges out toward us round his fist
  for (const [a, b] of KNOCK) {
    if (p < a || p > b + 0.05) continue;
    const k = seg(p, a, b + 0.05);
    // (on his fist, punched toward us)
    const s0: Pt = live.chaseHero ? [live.chaseHero.x - face * 0.3, live.chaseHero.y - face * 0.95] : [f.w * 0.5, f.h * 0.55];
    const r = face * (1.2 + k * 1.6);
    g.save();
    g.globalAlpha = (1 - k) * 0.85;
    const gr = g.createRadialGradient(s0[0] - r * 0.2, s0[1] - r * 0.25, r * 0.05, s0[0], s0[1], r);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)');
    gr.addColorStop(0.55, 'rgba(255,255,255,0.08)');
    gr.addColorStop(0.8, 'rgba(40,30,20,0.22)');
    gr.addColorStop(1, 'rgba(40,30,20,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(s0[0], s0[1], r, 0, TAU);
    g.fill();
    g.restore();
  }
  if (p <= ESC_OUT[0] || p >= ESC_OUT[1]) return;
  const e = escapeAt(f, p);
  const sc = 1 + e.lift * 0.25;
  // his shadow on the desk (he is up in the air)
  g.save();
  g.globalAlpha = 0.22;
  g.fillStyle = '#16110b';
  g.beginPath();
  g.ellipse(e.at[0] + face * 1.2 * e.lift, e.at[1] + face * 1.8 * e.lift, face * 1.3, face * 0.4, 0, 0, TAU);
  g.fill();
  g.restore();
  const bank = Math.abs(e.ang) > 0.25 ? 'broom_3' : 'broom_1';
  drawPose(g, bank, e.at[0], e.at[1], face * sc, { rot: e.ang * e.dir, flip: e.dir < 0, boil: 0.004 });
}

/* ------------------------------------------------------------ the burn (Home) */

function burnOver(g: CanvasRenderingContext2D, f: Frame, deskC: HTMLCanvasElement, ext: { x: number; y: number; w: number; h: number }) {
  const L = f.B - HOME;
  if (f.B < HOME || L < HM.hit || L > 7.4) return;
  const [cx, cy, face] = homeSeal(f);
  const grow = ease.out3(seg(L, HM.hit, HM.hit + 0.18));
  const heal = ease.inOut2(seg(L, 6.05, 6.5));
  const R = face * 1.25 * grow * (1 - heal);
  const ragged = (r: number, seed: number) => {
    g.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * TAU;
      const rr = r * (0.82 + 0.18 * Math.sin(a * 5 + seed) * Math.sin(a * 3 - seed * 0.7));
      if (i) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else g.moveTo(cx + rr, cy);
    }
    g.closePath();
  };
  // the scorch round it (it stays, browned, round the seal)
  const scR = face * 1.25 * grow * 1.45;
  g.save();
  const sg = g.createRadialGradient(cx, cy, scR * 0.4, cx, cy, scR);
  sg.addColorStop(0, 'rgba(40,22,10,0.85)');
  sg.addColorStop(0.6, 'rgba(90,50,20,0.45)');
  sg.addColorStop(1, 'rgba(120,80,40,0)');
  g.fillStyle = sg;
  g.globalAlpha = 0.9 * (1 - seg(L, 6.6, 7.4)) + 0.25 * seg(L, 6.6, 7.4) * (1 - seg(L, 7.2, 7.4));
  ragged(scR, 1.3);
  g.fill();
  g.restore();
  if (R > 1) {
    // through the hole: the desk under the sheet
    g.save();
    ragged(R, 2.1);
    g.clip();
    g.drawImage(deskC, ext.x, ext.y, ext.w, ext.h);
    g.fillStyle = 'rgba(20,10,4,0.25)';
    g.fillRect(cx - R, cy - R, R * 2, R * 2);
    g.restore();
    // the glowing edge, flickering
    g.save();
    g.strokeStyle = `rgba(255,${140 + Math.floor(Math.sin(f.t * 23) * 40)},40,0.9)`;
    g.shadowColor = '#ff8a20';
    g.shadowBlur = face * 0.4;
    g.lineWidth = face * 0.08 * (1 - heal);
    ragged(R, 2.1);
    g.stroke();
    g.restore();
  }
  // smoke: three big soft puffs rising off it
  for (let i = 0; i < 3; i++) {
    const u = f.hold?.kind === 'finale' ? (f.t * 0.45 + i / 3) % 1 : seg(L, HM.hit + 0.05 + i * 0.12, HM.hit + 1.0 + i * 0.12);
    if (u <= 0 || u >= 1) continue;
    const r = face * (0.8 + u * 1.8);
    g.save();
    g.globalAlpha = 0.35 * Math.sin(u * Math.PI);
    const pg = g.createRadialGradient(0, 0, 0, 0, 0, r);
    pg.addColorStop(0, 'rgba(90,85,80,0.9)');
    pg.addColorStop(1, 'rgba(90,85,80,0)');
    g.translate(cx + Math.sin(u * 3 + i) * face * 0.8 + u * face * 1.5, cy - u * face * 4.5);
    g.fillStyle = pg;
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.fill();
    g.restore();
  }
}

/* ------------------------------------------------------------ crumpled drafts */

const CRUMPLE = ['crumple_0', 'crumple_1', 'crumple_2', 'crumple_3'];
/** where each chapter's thrown-away draft lands (spread out round the sheet, clear of the margins' things) */
const SPOTS: [number, number, number][] = [
  [-0.42, 0.28, 0.3], [1.4, 0.55, -0.5], [0.42, 1.3, 1.1], [-0.4, 1.12, -1.2], [1.33, 1.22, 0.7], [0.1, -0.3, 2.0], [0.82, -0.3, -2.2],
];
function drawCrumples(g: CanvasRenderingContext2D, f: Frame, jump: number) {
  const { w, h, B } = f;
  for (let i = 0; i < SPOTS.length; i++) {
    const c = CHAPTERS[i + 1];
    if (!c || B < c.at) break;
    const k = CRUMPLE[i % CRUMPLE.length];
    const im = artImage(k);
    if (!im) continue;
    const [sx, sy, r0] = SPOTS[i];
    // tossed in from off the desk: an arc, a bounce, a roll to rest
    const u = seg(B, c.at + 0.1, c.at + 0.7);
    const land = ease.outBounce(u);
    const x = lerp(w * (sx < 0.5 ? -1.2 : 2.2), sx * w, ease.out2(u));
    const y = sy * h - (1 - land) * h * 0.25 - jump * h * 0.02 * ((i % 2) + 1);
    const [aw, ah] = artSize(k);
    const len = h * 0.22;
    g.save();
    g.translate(x, y);
    g.rotate(r0 + (1 - u) * 4);
    g.globalAlpha *= clamp(u * 4);
    g.shadowColor = 'rgba(20,14,8,0.35)';
    g.shadowBlur = h * 0.012;
    g.shadowOffsetY = h * 0.008;
    g.drawImage(im, -len * (aw / ah) / 2, -len / 2, len * (aw / ah), len);
    g.restore();
  }
}

/* ------------------------------------------------------------ the light */

interface Light { tint: string; dark: number; glow: string | null; pool: string | null; warm: string | null }
const LIGHTS: Record<string, Light> = {
  morning: { tint: '#eef4ff', dark: 0, glow: null, pool: null, warm: null },
  day: { tint: '#ffffff', dark: 0, glow: null, pool: null, warm: null },
  lampOff: { tint: '#ffffff', dark: 0.8, glow: 'rgba(140,190,255,0.35)', pool: null, warm: null },
  sunset: { tint: '#ffd2a8', dark: 0.12, glow: null, pool: null, warm: 'rgba(255,120,40,0.32)' },
  night: { tint: '#ffffff', dark: 0.72, glow: null, pool: 'rgba(255,190,110,0.4)', warm: null },
};
/** which light each chapter has, and the crossfade between them */
function lightAt(B: number): [Light, Light, number] {
  const keys: [number, string][] = [[0, 'morning'], [AT('Wave'), 'day'], [AT('Light'), 'lampOff'], [CHASE, 'sunset'], [HOME, 'night']];
  let i = 0;
  while (i < keys.length - 1 && B >= keys[i + 1][0] - 0.5) i++;
  const next = keys[Math.min(keys.length - 1, i + 1)];
  const k = i < keys.length - 1 ? seg(B, next[0] - 0.5, next[0] + 0.3) : 0;
  return [LIGHTS[keys[i][1]], LIGHTS[next[1]], k];
}

/** light the desk (drawn over everything on it) */
export function drawLight(g: CanvasRenderingContext2D, f: Frame, x0: number, y0: number, dw: number, dh: number) {
  const [a, b, k] = lightAt(f.B);
  const one = (l: Light, al: number) => {
    if (al <= 0) return;
    const { w, h } = f;
    g.save();
    g.globalAlpha = al;
    if (l.tint !== '#ffffff') { g.globalCompositeOperation = 'multiply'; g.fillStyle = l.tint; g.fillRect(x0, y0, dw, dh); }
    if (l.warm) {
      // low sun from the right, long and orange
      g.globalCompositeOperation = 'source-over';
      const gr = g.createLinearGradient(w * 2, 0, -w, h);
      gr.addColorStop(0, l.warm);
      gr.addColorStop(1, 'rgba(60,20,40,0.25)');
      g.fillStyle = gr;
      g.fillRect(x0, y0, dw, dh);
    }
    if (l.dark > 0) {
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = `rgba(10,10,16,${l.dark})`;
      g.fillRect(x0, y0, dw, dh);
    }
    if (l.glow || l.pool) {
      // the glowing sheet (the duel) or the lamp (night) lights the desk round it
      g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(w / 2, h / 2, h * 0.4, w / 2, h / 2, w * (l.pool ? 1.1 : 0.85));
      gr.addColorStop(0, (l.glow ?? l.pool)!);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x0, y0, dw, dh);
    }
    g.restore();
  };
  one(a, 1 - k);
  one(b, k);
}

/* ------------------------------------------------------------ the hits */

/** the biggest hits jolt the camera and make the desk jump */
const HITS = [RUN + RN.eraser, AT('Deep') + 3.15, AT('Light') + 4.9, HOME + 1.45, HOME + HM.hit];
export function jolt(B: number, held = false) {
  // (not while the film holds: a held jolt would freeze the camera half out)
  if (held) return 0;
  let j = 0;
  for (const b of HITS) {
    const u = seg(B, b - 0.01, b + 0.3);
    if (u > 0 && u < 1) j = Math.max(j, Math.sin(u * Math.PI) * (1 - u) * 1.6);
  }
  return j;
}

/* ------------------------------------------------------------ the camera */

export interface Cue { k: number; shot: Shot }

/** where the story takes the camera, and how far (0..1) */
export function storyCues(f: Frame): Cue[] {
  const { w, h, B } = f;
  const out: Cue[] = [];
  const L = B - RUN;
  // the Eraser wakes: look over at it and the sheet
  {
    // (back in on the sheet as it lands: the red-light game straight after plays full screen)
    const k = f.hold?.kind === 'redlight' ? 0 : ease.inOut2(seg(L, 2.4, 2.72)) * (1 - ease.inOut2(seg(L, 3.3, 3.42)));
    if (k > 0) out.push({ k, shot: { cx: w * 0.32, cy: h * 0.8, s: 1.75, tilt: 18, roll: -3 } });
  }
  // the escape (a hold): near for the knock, wide for the flight, back in
  if (f.hold?.kind === 'escape') {
    const p = f.hold.p;
    const mug = photo(MUG[0], MUG[1], w, h);
    const near: Shot = { cx: w * 0.5, cy: h * 0.5, s: 1.28, tilt: 9, roll: -1 };
    const wide: Shot = { cx: lerp(w * 0.5, mug[0], 0.62), cy: lerp(h * 0.4, mug[1], 0.62), s: 2.55, tilt: 24, roll: -3 };
    let s = near;
    if (p > ESC_OUT[0] - 0.04) s = mixShot(near, wide, ease.inOut2(seg(p, ESC_OUT[0] - 0.04, ESC_OUT[0] + 0.1)));
    if (p > ESC_OUT[1] - 0.12) s = mixShot(s, near, ease.inOut2(seg(p, ESC_OUT[1] - 0.12, ESC_OUT[1])));
    // a knock nudges the camera
    for (const [a] of KNOCK) { const u = seg(p, a, a + 0.03); if (u > 0 && u < 1) s = { ...s, s: s.s * (1 - Math.sin(u * Math.PI) * 0.015) }; }
    const k = ease.inOut2(seg(p, 0, 0.1)) * (1 - ease.inOut2(seg(p, 0.9, 1)));
    out.push({ k, shot: s });
  }
  // the burn: a look at the smoking hole (the end's pull-back takes over)
  {
    const Lh = B - HOME;
    // (in the finale hold it goes back in for the snap, and out again after it)
    const fin = f.hold?.kind === 'finale' ? f.hold.p : -1;
    const k = B < HOME ? 0 : ease.inOut2(seg(Lh, HM.hit + 0.04, HM.hit + 0.35)) * (fin >= 0 ? 1 - ease.inOut2(seg(fin, 0.36, 0.5)) : 1);
    if (k > 0) {
      const [cx, cy] = homeSeal(f);
      out.push({ k, shot: { cx: lerp(w * 0.5, cx, 0.5), cy: lerp(h * 0.5, cy, 0.5), s: 1.45, tilt: 16, roll: 1.5 } });
    }
  }
  return out;
}
function mixShot(a: Shot, b: Shot, k: number): Shot {
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), k)), tilt: lerp(a.tilt, b.tilt, k), roll: lerp(a.roll, b.roll, k) };
}
/** a story moment has the camera (the idle peek waits) */
export const storyBusy = (f: Frame) => storyCues(f).some((c) => c.k > 0.01);

/* ------------------------------------------------------------ drawing */

let queued = false;
export function queueStory() {
  if (queued) return;
  queued = true;
  CRUMPLE.forEach((k, i) => queueArt(k, 30 + i));
  ['knock_0', 'knock_1', 'knock_2'].forEach((k) => queueArt(k, 40));
}

/** on the desk, under the sheet: the eraser (or its dust), the drafts */
export function drawUnder(g: CanvasRenderingContext2D, f: Frame) {
  const j = jolt(f.B, f.hold !== null);
  drawCrumples(g, f, j);
  eraserUnder(g, f, j);
}

/** above the sheet: whatever leaves the paper, and the hole burnt through it */
export function drawOver(g: CanvasRenderingContext2D, f: Frame, deskC: HTMLCanvasElement, ext: { x: number; y: number; w: number; h: number }): boolean {
  let drawn = 0;
  const L = f.B - RUN;
  if (L > EZ.hop[0] - 0.01 && L < EZ.hop[1]) { eraserOver(g, f); drawn++; }
  if (f.hold?.kind === 'escape') { escapeOver(g, f, f.hold.p); drawn++; }
  if (f.B >= HOME + HM.hit && f.B < HOME + 7.4) { burnOver(g, f, deskC, ext); drawn++; }
  return drawn > 0;
}

/** over the whole screen (nothing at the moment: the paint wash went with the tumble, round 32) */
export function drawScreen(_g: CanvasRenderingContext2D, _f: Frame) {}

/** (dev) the escape is a hold at this film beat */
export const STORY_HOLDS = { escape: ESCAPE_AT, wink: CHASE + CH.wink[0] };
