import type { Frame } from '../core/frame';
import { TAU, clamp, ease, hash, lerp, seg } from '../core/math';
import { blot, drawSprite, glow, paperTile } from '../core/sprites';
import { C } from '../core/style';
import pointsJson from '../assets/day/points.json';
import { Drift, flare, glitter, leak, motes, rain, rainbow, rays, shootingStar } from './fx';
import { finger, holding, liveFinger, stepTilt, taps, tilt } from './input';
import { type Cam, img, layer, placeOf } from './layers';

/*
 * ONE DAY (round 13). After the ink night you paint (core/paint.ts), the
 * colour of morning bleeds through the ink and one day goes by as you scroll,
 * the seasons turning with it: a spring hill at sunrise, a train along the
 * coast, a summer noon at a railway crossing, a summer storm (hold your finger
 * and the rain stops), golden hour by an autumn river, a town lighting up at
 * dusk (tap to light the windows), a winter night over a lake. Then the colour
 * drains back to ink, the paper goes blank, and it's before dawn again.
 *
 * The paintings are ChatGPT images (scripts/gen-art.sh, cut out by
 * scripts/cutout-day.py); everything that moves is drawn here: parallax,
 * light, weather, the edit between scenes.
 */

export const DAY = {
  bleed: [2.2, 2.95] as const,
  spring: [2.2, 4.05] as const,
  cut: [3.85, 4.2] as const,
  train: [3.85, 5.45] as const,
  tunnel: [5.3, 5.62] as const,
  summer: [5.5, 8.0] as const,
  rain: [6.55, 7.75] as const,
  split: [7.75, 8.05] as const,
  golden: [7.75, 9.15] as const,
  dusk: [8.9, 10.3] as const,
  night: [10.05, 11.5] as const,
  drain: [11.2, 11.8] as const,
  END: 12.2,
};

type Pts = { crossing_lamps?: [number, number, number][]; stair_lamps?: [number, number, number][]; window?: [number, number, number, number] };
const PTS = pointsJson as Pts;

type Scene = (g: G, p: number) => void;
interface G { f: Frame; ctx: CanvasRenderingContext2D; w: number; h: number; S: number; t: number; dt: number; cam: Cam }

const petals = new Drift(46, 'petal');
const leaves = new Drift(40, 'leaf');
const snow = new Drift(140, 'snow');
let lastT = 0;

/* ================================================================ buffers */

const bufs: HTMLCanvasElement[] = [];
function buffer(i: number, w: number, h: number, dpr: number) {
  let c = bufs[i];
  const bw = Math.ceil(w * dpr), bh = Math.ceil(h * dpr);
  if (!c) c = bufs[i] = document.createElement('canvas');
  if (c.width !== bw || c.height !== bh) {
    c.width = bw;
    c.height = bh;
  }
  const g = c.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, bw, bh);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { c, g };
}
/** draw a scene into a buffer and return it */
function render(g: G, i: number, scene: Scene, p: number) {
  const dpr = Math.abs(g.ctx.getTransform().a) || 1;
  const b = buffer(i, g.w, g.h, dpr);
  scene({ ...g, ctx: b.g }, p);
  return b.c;
}

/* ================================================================ scenes */

function spring(g: G, p: number) {
  const { ctx, w, h, t, S, dt } = g;
  const cam = { ...g.cam, push: g.cam.push + p * 0.6, y: g.cam.y - (1 - p) * 0.6 };
  layer(ctx, w, h, '01_sky_spring', cam, { depth: 0.1 });
  // the sun just clearing the ridge
  const sun = placeOf(w, h, cam, { depth: 0.15 }).at(0.56, 0.6);
  rays(ctx, sun[0], sun[1], S * 1.6, -Math.PI / 2, 2.4, 0.9, t);
  flare(ctx, sun[0], sun[1], S * 0.05, 0.85, w, h, t);
  layer(ctx, w, h, '02_spring_far', cam, { depth: 0.3 });
  // mist drifting over the valley
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const mx = ((hash(i * 3.7) + t * 0.004 * (1 + i * 0.3)) % 1.4 - 0.2) * w;
    const my = placeOf(w, h, cam, { depth: 0.35 }).at(0.5, 0.68 + hash(i) * 0.1)[1];
    ctx.globalAlpha = 0.18;
    drawSprite(ctx, glow('#ffffff', 128), mx, my, S * 0.9, S * 0.18);
  }
  ctx.restore();
  layer(ctx, w, h, '03_spring_mid', cam, { depth: 0.6 });
  // the tree stands off to the right so the sunrise and the valley show past it
  const tree = layer(ctx, w, h, '04_spring_near', cam, { depth: 1, zoom: 0.92, ox: 1, oy: 1, dx: 0.2 + (1 - p) * 0.08 });
  // petals blow off the tree, and off wherever the finger moves
  const fg = liveFinger(t);
  if (hash(Math.floor(t * 6)) > 0.7) petals.burst(...tree.at(0.62 + hash(t) * 0.25, 0.35 + hash(t * 2) * 0.2), -S * 0.3, S * 0.05, 1);
  if (fg && Math.hypot(fg.vx, fg.vy) > S * 0.5) petals.burst(fg.x, fg.y, fg.vx * 0.4, fg.vy * 0.4, 2);
  petals.step(w, h, dt, t, -0.05, fg);
  petals.draw(ctx, 1);
  motes(ctx, w, h, t, 0.6);
}

/** the train: the coast sliding past the window; poles and wires whipping by */
function train(g: G, p: number, through?: (g: G) => void, viewA = 1) {
  const { ctx, w, h, t, S } = g;
  const view = img('06_train_view');
  // the view: a wide painting panned across as the train runs
  if (view && viewA > 0) {
    const dh = h * 1.12;
    const dw = dh * (view.naturalWidth / view.naturalHeight);
    const run = (t * 0.012 + p * 0.55) % 1;
    const x = -run * (dw - w) * 0.9 + g.cam.x * w * 0.02;
    ctx.save();
    ctx.globalAlpha = viewA;
    ctx.drawImage(view, x, (h - dh) / 2 + g.cam.y * h * 0.01, dw, dh);
    ctx.restore();
  }
  if (through && viewA < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - viewA;
    through(g);
    ctx.restore();
  }
  // poles and wires: the poles flash past, the wires dip and rise between them
  const sp = w * 1.9, gap = w * 0.95;
  const off = (t * sp) % gap;
  ctx.save();
  ctx.globalAlpha = viewA;
  ctx.strokeStyle = 'rgba(20,24,30,0.85)';
  ctx.lineWidth = 1.4;
  for (let i = -1; i < 3; i++) {
    const x0 = w - off + i * gap, x1 = x0 + gap;
    for (const [y, sag] of [[0.22, 0.05], [0.25, 0.055], [0.28, 0.05]] as const) {
      ctx.beginPath();
      ctx.moveTo(x0, h * y);
      ctx.quadraticCurveTo((x0 + x1) / 2, h * (y + sag), x1, h * y);
      ctx.stroke();
    }
    // a pole whips past too fast to see clearly: a soft dark smear
    const pg = ctx.createLinearGradient(x0 - S * 0.05, 0, x0 + S * 0.05, 0);
    pg.addColorStop(0, 'rgba(16,18,22,0)');
    pg.addColorStop(0.5, 'rgba(16,18,22,0.75)');
    pg.addColorStop(1, 'rgba(16,18,22,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(x0 - S * 0.05, h * 0.12, S * 0.1, h);
  }
  ctx.restore();
  // the carriage, rocking on the rails, warm light on it
  const rock = Math.sin(t * 13) * 0.6 + Math.sin(t * 3.1) * 0.8;
  layer(ctx, w, h, '05_train_interior', { ...g.cam, push: 0 }, { depth: 0.08, dy: rock / h });
  leak(ctx, w, h, 0.18 + 0.08 * Math.sin(t * 0.7), 'rgba(255,190,120,0.5)', true);
}

function summer(g: G, p: number) {
  const { ctx, w, h, t, S, dt, f } = g;
  const cam = { ...g.cam, push: g.cam.push + p * 0.5 };
  // how hard it rains: holding the finger stops it, and at the end it clears by itself
  const rainP = seg(f.B, DAY.rain[0], DAY.rain[1]);
  const storm = ease.inOut2(seg(rainP, 0, 0.25)) * (1 - ease.inOut2(seg(rainP, 0.8, 1)));
  const hold = ease.inOut2(clamp(holding(t) / 0.8));
  stopK = lerp(stopK, hold, dt * 3);
  const k = storm * (1 - stopK);
  const after = seg(rainP, 0.8, 1) * (1 - seg(f.B, DAY.split[0], DAY.split[1]));
  const sky = placeOf(w, h, cam, { depth: 0.1 });
  layer(ctx, w, h, '07_sky_summer', cam, { depth: 0.1, dx: -t * 0.0015 % 0.05 });
  const sun = sky.at(0.8, 0.1);
  flare(ctx, sun[0], sun[1], S * 0.06, 0.95 * (1 - k), w, h, t);
  layer(ctx, w, h, '08_summer_far', cam, { depth: 0.3 });
  const cross = layer(ctx, w, h, '09_summer_crossing', cam, { depth: 0.6, dx: 0.14 });
  // the crossing's red lamps blink in turn
  const lamps = PTS.crossing_lamps ?? [];
  if (lamps.length) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    lamps.slice(0, 4).forEach(([u, v], i) => {
      const on = (Math.floor(t * 1.6) + i) % 2 === 0 ? 1 : 0.15;
      const [lx, ly] = cross.at(u, v);
      ctx.globalAlpha = on;
      drawSprite(ctx, glow('#ff3a2a', 64), lx, ly, S * 0.09);
    });
    ctx.restore();
  }
  layer(ctx, w, h, '10_summer_near', cam, { depth: 1 });
  motes(ctx, w, h, t, 0.5 * (1 - k));
  // the storm: the light goes grey-blue, rain on the glass, a far flash now and then
  if (k > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.5 * k;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.62 * k;
    ctx.fillStyle = '#1a2232';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    if (k > 0.6 && hash(Math.floor(t * 3)) > 0.97) {
      ctx.fillStyle = `rgba(230,235,255,${0.25 * k})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
  rain(ctx, w, h, t, dt, k);
  // when it stops: beams through the clouds and a rainbow
  const clear = Math.max(stopK * storm, after);
  rays(ctx, sun[0], sun[1], S * 1.8, Math.PI * 0.75, 1.2, clear, t);
  rainbow(ctx, w * 0.42, h * 0.72, S * 0.95, clear);
}
let stopK = 0;

function golden(g: G, p: number) {
  const { ctx, w, h, t, S, dt } = g;
  const cam = { ...g.cam, push: g.cam.push + p * 0.55, x: g.cam.x + p * 0.3 };
  const sky = layer(ctx, w, h, '11_sky_golden', cam, { depth: 0.1 });
  const sun = sky.at(0.56, 0.64);
  rays(ctx, sun[0], sun[1], S * 1.7, -Math.PI / 2, 2.6, 0.8, t, '255,200,140');
  flare(ctx, sun[0], sun[1], S * 0.07, 1, w, h, t);
  layer(ctx, w, h, '12_golden_far', cam, { depth: 0.3 });
  const river = layer(ctx, w, h, '13_golden_river', cam, { depth: 0.6 });
  const [gx0, gy0] = river.at(0.25, 0.72), [gx1, gy1] = river.at(0.78, 0.9);
  glitter(ctx, gx0, gy0, gx1, gy1, t, 1);
  const maple = layer(ctx, w, h, '14_golden_maple', cam, { depth: 1 });
  const fg = liveFinger(t);
  if (hash(Math.floor(t * 5) + 3) > 0.72) leaves.burst(...maple.at(0.1 + hash(t) * 0.3, 0.05 + hash(t * 3) * 0.2), S * 0.2, S * 0.05, 1);
  if (fg && Math.hypot(fg.vx, fg.vy) > S * 0.5) leaves.burst(fg.x, fg.y, fg.vx * 0.4, fg.vy * 0.4, 2);
  leaves.step(w, h, dt, t, 0.06, fg);
  leaves.draw(ctx, 1);
  motes(ctx, w, h, t, 0.7, '#ffd9a0');
  leak(ctx, w, h, 0.22, 'rgba(255,150,60,0.6)', false);
}

/** where the windows have been lit, as frame fractions, and when */
const lit: { u: number; v: number; t0: number }[] = [];

function dusk(g: G, p: number) {
  const { ctx, w, h, t, S } = g;
  const cam = { ...g.cam, push: g.cam.push + p * 0.45 };
  layer(ctx, w, h, '15_sky_dusk', cam, { depth: 0.1 });
  // the first stars come out
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 30; i++) {
    const a = seg(p, hash(i) * 0.6, hash(i) * 0.6 + 0.2) * (0.6 + 0.4 * Math.sin(t * 2 + i));
    ctx.globalAlpha = a;
    drawSprite(ctx, glow('#fff6e0', 32), hash(i * 2.3) * w, hash(i * 5.1) * h * 0.4, S * 0.012);
  }
  ctx.restore();
  const town = layer(ctx, w, h, '16_town_off', cam, { depth: 0.4 });
  // the lights coming on: the lit painting, cut to circles that open by themselves and where you tap
  const dpr = Math.abs(ctx.getTransform().a) || 1;
  const b = buffer(3, w, h, dpr);
  layer(b.g, w, h, '17_town_on', cam, { depth: 0.4 });
  b.g.globalCompositeOperation = 'destination-in';
  b.g.fillStyle = '#000';
  b.g.beginPath();
  for (let i = 0; i < 26; i++) {
    const k = ease.outBack(seg(p, 0.08 + hash(i * 1.9) * 0.6, 0.18 + hash(i * 1.9) * 0.6), 1.4);
    if (k <= 0) continue;
    const [x, y] = town.at(0.08 + hash(i * 3.3) * 0.84, 0.5 + hash(i * 7.7) * 0.45);
    b.g.moveTo(x + S * 0.12 * k, y);
    b.g.arc(x, y, S * 0.12 * k, 0, TAU);
  }
  for (const l of lit) {
    const k = ease.outBack(clamp((t - l.t0) / 0.5), 1.6);
    const [x, y] = town.at(l.u, l.v);
    b.g.moveTo(x + S * 0.16 * k, y);
    b.g.arc(x, y, S * 0.16 * k, 0, TAU);
  }
  if (p > 0.85) b.g.rect(0, 0, w, h * ease.in2(seg(p, 0.85, 1)) * 2);
  b.g.fill();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(b.c, 0, 0);
  ctx.restore();
  // the stairway: its lamps flicker on halfway through
  const lampOn = seg(p, 0.42, 0.5);
  const flick = lampOn > 0 && lampOn < 1 ? (hash(Math.floor(t * 20)) > 0.5 ? 1 : 0.2) : lampOn;
  const st = layer(ctx, w, h, '18_stairs_off', cam, { depth: 0.75 });
  layer(ctx, w, h, '19_stairs_on', cam, { depth: 0.75, alpha: flick });
  if (flick > 0.5) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [u, v] of (PTS.stair_lamps ?? []).slice(0, 8)) {
      const [lx, ly] = st.at(u, v);
      ctx.globalAlpha = 0.5 * flick;
      drawSprite(ctx, glow('#ffc66b', 64), lx, ly, S * 0.18);
    }
    ctx.restore();
  }
}

function night(g: G, p: number) {
  const { ctx, w, h, t, S, dt } = g;
  const cam = { ...g.cam, push: g.cam.push + p * 0.4 };
  // the sky turns, slowly, about a point above the frame
  const sky = img('20_sky_night');
  if (sky) {
    ctx.save();
    ctx.translate(w / 2, -h * 0.3);
    ctx.rotate((t * 0.004 + p * 0.06) % TAU);
    ctx.translate(-w / 2, h * 0.3);
    layer(ctx, w, h, '20_sky_night', cam, { depth: 0.05, zoom: 1.5 });
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = Math.max(0, Math.sin(t * (0.7 + hash(i) * 2) + i * 3)) * 0.8;
    drawSprite(ctx, glow('#e6efff', 32), hash(i * 1.1) * w, hash(i * 3.9) * h * 0.55, S * 0.016);
  }
  ctx.restore();
  // a shooting star every few seconds, and one wherever you swipe
  const cyc = (t % 6.5) / 1.1;
  shootingStar(ctx, w * (0.2 + hash(Math.floor(t / 6.5)) * 0.5), h * 0.08, 0.5, S * 0.9, cyc);
  if (swipeStar && t - swipeStar.t < 0.9) shootingStar(ctx, swipeStar.x, swipeStar.y, swipeStar.a, S * 1.1, (t - swipeStar.t) / 0.9);
  layer(ctx, w, h, '21_night_mountains', cam, { depth: 0.3 });
  layer(ctx, w, h, '22_night_lake', cam, { depth: 0.6 });
  layer(ctx, w, h, '23_night_pines', cam, { depth: 1 });
  const fg = liveFinger(t);
  snow.step(w, h, dt, t, 0.01, fg);
  snow.draw(ctx, 0.9);
}
let swipeStar: { x: number; y: number; a: number; t: number } | null = null;

/* ============================================================ the day */

let inkBlots: HTMLCanvasElement[] = [];
let paperPat: CanvasPattern | null = null;

/** call every frame with the film; draws everything from the ink's end to the end card */
export function drawDay(f: Frame) {
  const { ctx, w, h, B, t } = f;
  const S = Math.min(w, h);
  const dt = clamp(t - lastT, 0, 0.05);
  lastT = t;
  stepTilt(dt);
  if (B < DAY.bleed[0]) return;
  // the camera: the phone's tilt, and a slow breathing drift of its own
  const cam: Cam = { x: tilt.x + Math.sin(t * 0.13) * 0.25, y: tilt.y * 0.6 + Math.sin(t * 0.17) * 0.2, push: 0 };
  const g: G = { f, ctx, w, h, S, t, dt, cam };

  // taps: light windows at dusk; swipes: shooting stars at night
  if (taps.length) {
    for (const tp of taps.splice(0)) {
      if (B > DAY.dusk[0] && B < DAY.dusk[1]) {
        const pl = placeOf(w, h, { ...cam, push: seg(B, DAY.dusk[0], DAY.dusk[1]) * 0.45 }, { depth: 0.4 });
        lit.push({ u: (tp.x - pl.x) / pl.dw, v: (tp.y - pl.y) / pl.dh, t0: t });
        if (lit.length > 30) lit.shift();
      }
    }
  }
  if (B > DAY.night[0] && Math.hypot(finger.vx, finger.vy) > S * 3 && t - finger.t < 0.1 && (!swipeStar || t - swipeStar.t > 0.6)) {
    swipeStar = { x: finger.x, y: finger.y, a: Math.atan2(finger.vy, finger.vx), t };
  }
  if (B < DAY.dusk[0] - 0.5) lit.length = 0;

  const P = (r: readonly [number, number]) => seg(B, r[0], r[1]);

  if (B < DAY.cut[0]) {
    // morning: colour bleeds into the ink night in blooms, until it's all morning
    const k = P(DAY.bleed);
    if (k >= 1) spring(g, P(DAY.spring));
    else {
      const c = render(g, 0, spring, P(DAY.spring));
      maskBleed(ctx, c, w, h, k);
    }
  } else if (B < DAY.cut[1]) {
    // the match cut: a train window rushes up out of the morning and frames it, then the coast replaces it
    const k = ease.inOut3(P(DAY.cut));
    const view = seg(k, 0.45, 0.95);
    const win = PTS.window ?? [0.15, 0.2, 0.85, 0.65];
    const ox = (win[0] + win[2]) / 2, oy = (win[1] + win[3]) / 2;
    const c = render(g, 1, (gg) => train(gg, 0, (g2) => spring(g2, 1), view), 0);
    ctx.save();
    const z = lerp(4.2, 1, k);
    ctx.translate(ox * w, oy * h);
    ctx.scale(z, z);
    ctx.translate(-ox * w, -oy * h);
    ctx.drawImage(c, 0, 0, w, h);
    ctx.restore();
  } else if (B < DAY.tunnel[0]) {
    train(g, P(DAY.train));
  } else if (B < DAY.tunnel[1]) {
    // the tunnel: dark, lamps streaking past, then a blast of light into summer
    const k = P(DAY.tunnel);
    if (k < 0.75) {
      train(g, P(DAY.train));
      ctx.fillStyle = `rgba(4,5,8,${ease.in2(seg(k, 0, 0.3))})`;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const lx = w - ((t * w * 2.4 + i * w * 0.7) % (w * 2.1));
        const a = seg(k, 0.2, 0.35) * (1 - seg(k, 0.65, 0.75));
        ctx.globalAlpha = a;
        drawSprite(ctx, glow('#ffb35c', 64), lx, h * 0.2, S * 0.5, S * 0.06);
      }
      ctx.restore();
    } else {
      summer(g, 0);
      ctx.fillStyle = `rgba(255,255,250,${1 - ease.out3(seg(k, 0.75, 1))})`;
      ctx.fillRect(0, 0, w, h);
    }
  } else if (B < DAY.split[0]) {
    summer(g, P(DAY.summer));
  } else if (B < DAY.split[1]) {
    // the split screen: evening slides in from the right, a seam of sunlight between the two
    const k = ease.inOut2(P(DAY.split));
    summer(g, P(DAY.summer));
    const c = render(g, 0, golden, 0);
    const sx = w * (1 - k);
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, 0, w - sx, h);
    ctx.clip();
    ctx.drawImage(c, 0, 0, w, h);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(sx - S * 0.03, 0, sx + S * 0.03, 0);
    gr.addColorStop(0, 'rgba(255,240,210,0)');
    gr.addColorStop(0.5, 'rgba(255,250,235,0.95)');
    gr.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(sx - S * 0.03, 0, S * 0.06, h);
    ctx.restore();
    flare(ctx, sx, h * 0.55, S * 0.05, Math.sin(k * Math.PI), w, h, t);
  } else if (B < DAY.dusk[0]) {
    golden(g, P(DAY.golden));
  } else if (B < DAY.golden[1]) {
    // golden into dusk: a slow dissolve under a light leak
    const k = ease.inOut2(seg(B, DAY.dusk[0], DAY.golden[1]));
    golden(g, P(DAY.golden));
    ctx.save();
    ctx.globalAlpha = k;
    ctx.drawImage(render(g, 0, dusk, P(DAY.dusk)), 0, 0, w, h);
    ctx.restore();
    leak(ctx, w, h, Math.sin(k * Math.PI) * 0.5, 'rgba(255,120,170,0.7)', true);
  } else if (B < DAY.night[0]) {
    dusk(g, P(DAY.dusk));
  } else if (B < DAY.dusk[1]) {
    const k = ease.inOut2(seg(B, DAY.night[0], DAY.dusk[1]));
    dusk(g, P(DAY.dusk));
    ctx.save();
    ctx.globalAlpha = k;
    ctx.drawImage(render(g, 0, night, P(DAY.night)), 0, 0, w, h);
    ctx.restore();
  } else if (B < DAY.drain[1]) {
    night(g, P(DAY.night));
    // the colour drains, the night goes back to ink, and the ink to paper
    const k = P(DAY.drain);
    if (k > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'saturation';
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      paperOver(ctx, w, h, ease.inOut2(seg(k, 0.45, 1)));
    }
  } else paperOver(ctx, w, h, 1);
}

/** the paper, at alpha a */
function paperOver(ctx: CanvasRenderingContext2D, w: number, h: number, a: number) {
  if (a <= 0) return;
  if (!paperPat) paperPat = ctx.createPattern(paperTile(512, C.paper), 'repeat');
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = paperPat!;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** colour blooming through the ink: the rendered morning cut to growing blots */
function maskBleed(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, w: number, h: number, k: number) {
  if (!inkBlots.length) inkBlots = [2, 4, 6, 8].map((s) => blot(s * 19 + 3, 256));
  const S = Math.min(w, h);
  const g = c.getContext('2d')!;
  g.save();
  g.globalCompositeOperation = 'destination-in';
  const m = buffer(2, w, h, c.width / w);
  for (let i = 0; i < 18; i++) {
    const d = hash(i * 2.9) * 0.5;
    const b = ease.inOut2(seg(k, d, d + 0.45));
    if (b <= 0) continue;
    const x = (0.1 + hash(i * 7.3) * 0.8) * w, y = (0.15 + hash(i * 4.1) * 0.75) * h;
    const r = S * (0.08 + b * (0.7 + hash(i) * 0.6));
    m.g.save();
    m.g.translate(x, y);
    m.g.rotate(hash(i) * TAU);
    m.g.drawImage(inkBlots[i % inkBlots.length], -r, -r, r * 2, r * 2);
    m.g.restore();
  }
  if (k > 0.8) {
    m.g.globalAlpha = seg(k, 0.8, 1);
    m.g.fillRect(0, 0, w, h);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(m.c, 0, 0);
  g.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}
