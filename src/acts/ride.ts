import { drawBlot } from '../core/blot';
import type { Frame } from '../core/frame';
import { type Pt, TAU, bell, clamp, ease, hash, lerp, rng, seg } from '../core/math';
import { canvas, drawSprite, glow, withAlpha } from '../core/sprites';
import { drawSpark } from './alter';

/*
 * NIGHT RIDE.
 *
 * The Spark, let go at the end of ALTER, is a star falling through a city at
 * night, and Blot is on a motorbike chasing it: the ripple of the sword in
 * the black water is a tyre slamming through a neon puddle; tail-lights smear
 * into ribbons, the headlight is a circle (the Spark again), the tunnel
 * bends, and it all ends in one long skid at the stadium gates while the star
 * sails over the wall. No text anywhere: signs are shapes and colour.
 *
 * Plays inside a hold (`ride`) between ALTER and the match; scrolling back
 * plays it in reverse. Ambient motion (rain, flicker) runs on the clock.
 */

const N = {
  sky0: '#03040f', sky1: '#0c0a2a', sky2: '#24103f', road: '#06070d', wall: '#141522',
  mag: '#ff2bd6', cyan: '#22e6ff', amber: '#ffb020', red: '#ff3048', white: '#f4f7ff',
};
const SIGN_COLS = [N.mag, N.cyan, N.amber, N.mag, N.cyan];

interface G { f: Frame; ctx: CanvasRenderingContext2D; w: number; h: number; S: number; t: number; portrait: boolean }
type Shot = { name: string; dur: number; draw: (g: G, q: number) => void; flash?: string | null };

const SHOTS: Shot[] = [
  { name: 'puddle', dur: 0.8, draw: shotPuddle, flash: null },
  { name: 'launch', dur: 1.1, draw: shotLaunch },
  { name: 'tunnel', dur: 0.9, draw: shotTunnel },
  { name: 'chase', dur: 1.0, draw: shotChase },
  { name: 'skid', dur: 1.5, draw: shotSkid },
];
const TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0);
let lastShot = -1, lastQ = 0;
let hitQ: (x: number) => boolean = () => false;

/** dev: the hold progress at which shot `name` is at its own progress q */
export function rideShotP(name: string, q = 0.5) {
  let acc = 0;
  for (const s of SHOTS) {
    if (s.name === name) return (acc + s.dur * clamp(q)) / TOTAL;
    acc += s.dur;
  }
  return 0;
}

export function drawRide(f: Frame, p: number) {
  const { ctx, w, h, t } = f;
  const g: G = { f, ctx, w, h, S: Math.min(w, h), t, portrait: h > w };
  let acc = 0, i = 0;
  const at = clamp(p) * TOTAL;
  while (i < SHOTS.length - 1 && acc + SHOTS[i].dur <= at) acc += SHOTS[i++].dur;
  const q = clamp((at - acc) / SHOTS[i].dur);
  const shot = SHOTS[i];
  if (i !== lastShot && lastShot >= 0 && Math.abs(i - lastShot) === 1 && !f.reduced && shot.flash !== null) f.shake(g.S * 0.006);
  const prevQ = i === lastShot ? lastQ : -1;
  lastShot = i;
  lastQ = q;
  hitQ = (x: number) => prevQ >= 0 && prevQ < x && q >= x;
  ctx.save();
  shot.draw(g, q);
  ctx.restore();
  rain(g, shot.name === 'tunnel' ? 0 : 1, shot.name === 'launch' || shot.name === 'skid' ? 0.55 : 0.2);
  // the cut: a frame of cold neon overexposure
  if (i > 0 && shot.flash !== null) {
    const a = 1 - clamp(q / 0.05);
    if (a > 0) {
      ctx.fillStyle = `rgba(160,240,255,${0.16 * a})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

/* ------------------------------------------------------------- the city */

interface Sign { x: number; y: number; s: number; kind: number; col: string }
interface Layer { c: HTMLCanvasElement; W: number; signs: Sign[]; top: number }
const layerCache = new Map<string, Layer>();

/** one tileable row of buildings, `d` 0 (far) .. 2 (near); y = 0 is the street line */
function layer(w: number, h: number, d: number): Layer {
  const key = `${w}x${h}x${d}`;
  const hit = layerCache.get(key);
  if (hit) return hit;
  const W = Math.ceil(w * 2.2);
  const H = Math.ceil(h * (0.45 + d * 0.12));
  const { c, ctx } = canvas(W, H);
  const r = rng(31 + d * 17);
  const S = Math.min(w, h);
  const signs: Sign[] = [];
  const body = ['#0e0c2a', '#090719', '#040310'][d];
  let x = 0;
  while (x < W) {
    const bw = S * (0.12 + r() * 0.22) * (1 + d * 0.3);
    const bh = H * (0.35 + r() * 0.6);
    const x0 = x, top = H - bh;
    ctx.fillStyle = body;
    ctx.fillRect(x0, top, Math.min(bw, W - x0), bh);
    // a stepped roof or an antenna now and then
    if (r() < 0.4) ctx.fillRect(x0 + bw * 0.2, top - bh * 0.06, bw * 0.4, bh * 0.06);
    if (r() < 0.3) ctx.fillRect(x0 + bw * 0.6, top - bh * 0.18, Math.max(1, S * 0.004), bh * 0.18);
    // windows
    const cols = Math.max(2, Math.floor(bw / (S * 0.03)));
    const rows = Math.floor(bh / (S * 0.035));
    for (let i = 0; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        if (r() > 0.32 - d * 0.08) continue;
        const wx = x0 + (i + 0.3) * (bw / cols), wy = top + j * S * 0.035;
        ctx.fillStyle = r() < 0.7 ? `rgba(255,190,110,${0.25 + d * 0.15})` : `rgba(120,220,255,${0.2 + d * 0.15})`;
        ctx.fillRect(wx, wy, Math.max(1, bw / cols * 0.35), S * 0.012);
      }
    }
    // a neon sign on the nearer rows: just shapes, no words
    if (d > 0 && r() < 0.75) {
      signs.push({ x: x0 + bw * (0.25 + r() * 0.5), y: top + bh * (0.15 + r() * 0.4) - H, s: S * (0.035 + r() * 0.04) * (1 + d * 0.4), kind: Math.floor(r() * 5), col: SIGN_COLS[Math.floor(r() * SIGN_COLS.length)] });
    }
    x += bw + S * (0.005 + r() * 0.03);
  }
  const L = { c, W, signs, top: -H };
  layerCache.set(key, L);
  return L;
}

/** a sign: a shape in neon tube, flickering on the clock */
function sign(ctx: CanvasRenderingContext2D, x: number, y: number, s: Sign, t: number, alpha: number) {
  const fl = hash(Math.floor(t * 9) + s.x) < 0.04 ? 0.3 : 1;
  const a = alpha * fl;
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a * 0.5;
  drawSprite(ctx, glow(s.col, 64), 0, 0, s.s * 4);
  ctx.globalAlpha = a;
  ctx.strokeStyle = s.col;
  ctx.lineWidth = Math.max(1.5, s.s * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (s.kind === 0) ctx.arc(0, 0, s.s * 0.6, 0, TAU);
  else if (s.kind === 1) { ctx.moveTo(0, -s.s); ctx.lineTo(0, s.s); ctx.moveTo(-s.s * 0.3, -s.s * 0.6); ctx.lineTo(-s.s * 0.3, s.s * 0.2); }
  else if (s.kind === 2) { ctx.moveTo(-s.s * 0.6, s.s * 0.4); ctx.lineTo(0, -s.s * 0.4); ctx.lineTo(s.s * 0.6, s.s * 0.4); }
  else if (s.kind === 3) { ctx.rect(-s.s * 0.7, -s.s * 0.35, s.s * 1.4, s.s * 0.7); }
  else { ctx.moveTo(-s.s * 0.7, 0); ctx.lineTo(s.s * 0.7, 0); ctx.moveTo(-s.s * 0.4, -s.s * 0.35); ctx.lineTo(s.s * 0.4, -s.s * 0.35); }
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(0.8, s.s * 0.04);
  ctx.stroke();
  ctx.restore();
}

/** the city on a street line at y = hz, scrolled by `pos` (px of travel at the nearest layer) */
function city(g: G, pos: number, hz: number, o: { reflect?: boolean; dim?: number } = {}) {
  const { ctx, w, h, t } = g;
  const sky = ctx.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, N.sky0);
  sky.addColorStop(0.65, N.sky1);
  sky.addColorStop(1, N.sky2);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, hz);
  // the glow of the city on the low cloud
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35;
  drawSprite(ctx, glow('#5a1a6a', 128), w * 0.5, hz, w * 2.2, h * 0.5);
  ctx.restore();
  const draws: (() => void)[] = [];
  for (let d = 0; d < 3; d++) {
    const L = layer(w, h, d);
    const par = [0.12, 0.35, 0.7][d];
    const off = -((((pos * par) % L.W) + L.W) % L.W);
    const draw = (reflect: boolean) => {
      for (let k = 0; k < 2; k++) {
        const x0 = off + k * L.W;
        if (x0 > w || x0 + L.W < 0) continue;
        if (!reflect) ctx.drawImage(L.c, x0, hz + L.top);
        else {
          ctx.save();
          ctx.translate(0, hz);
          ctx.scale(1, -0.5);
          ctx.drawImage(L.c, x0, L.top);
          ctx.restore();
        }
        for (const s of L.signs) {
          const sx = x0 + s.x;
          if (sx < -40 || sx > w + 40) continue;
          if (!reflect) sign(ctx, sx, hz + s.y, s, t, 1 - (o.dim ?? 0));
          else {
            // the sign smeared down the wet street
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.28;
            drawSprite(ctx, glow(s.col, 64), sx, hz + (-s.y) * 0.5 + s.s, s.s * 1.6, s.s * 9);
            ctx.restore();
          }
        }
      }
    };
    draws.push(() => draw(false));
    if (o.reflect !== false) {
      // drawn after the street fill below
      reflections.push(() => draw(true));
    }
  }
  draws.forEach((fn) => fn());
  // the wet street
  const road = ctx.createLinearGradient(0, hz, 0, h);
  road.addColorStop(0, '#0d0b22');
  road.addColorStop(1, N.road);
  ctx.fillStyle = road;
  ctx.fillRect(0, hz, w, h - hz);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, hz, w, h - hz);
  ctx.clip();
  ctx.globalAlpha = 0.22;
  for (const fn of reflections) fn();
  ctx.restore();
  reflections.length = 0;
  void bell;
}
const reflections: (() => void)[] = [];

function rain(g: G, a: number, slant: number) {
  const { ctx, w, h, S, t } = g;
  if (a <= 0) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(190,210,255,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const sp = 0.9 + hash(i * 3.1) * 0.6;
    const y = ((hash(i * 1.7) * (h + 100) + t * h * 1.6 * sp) % (h + 100)) - 50;
    const x = ((hash(i * 7.3) * (w + 200) - t * S * slant * 2 * sp) % (w + 200) + w + 200) % (w + 200) - 100;
    const L = S * (0.03 + hash(i) * 0.03);
    ctx.moveTo(x, y);
    ctx.lineTo(x - L * slant, y + L);
  }
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------- the bike */

/**
 * Blot's bike, side on, facing +x. (x, y) is the road under the middle of
 * the bike; `s` its length. `spin` turns the wheels, `lean` tips it about the
 * rear contact (a skid), `blot` how Blot sits on it.
 */
function bike(g: G, x: number, y: number, s: number, o: { spin: number; lean?: number; light?: number; look?: Pt; pose?: 'idle' | 'shock' | 'cheer' }) {
  const { ctx, t } = g;
  const r = s * 0.2;
  const rx = -s * 0.4, fx = s * 0.42;
  ctx.save();
  ctx.translate(x + rx, y);
  ctx.rotate(o.lean ?? 0);
  ctx.translate(-rx, 0);
  // headlight cone, forward along the road
  const light = o.light ?? 1;
  if (light > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const hx = fx + s * 0.1, hy = -s * 0.52;
    const gr = ctx.createLinearGradient(hx, 0, hx + s * 2.6, 0);
    gr.addColorStop(0, `rgba(255,244,214,${0.45 * light})`);
    gr.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(hx, hy - s * 0.03);
    ctx.lineTo(hx + s * 2.6, hy - s * 0.35);
    ctx.lineTo(hx + s * 2.6, hy + s * 0.45);
    ctx.lineTo(hx, hy + s * 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Blot, low over the tank, scarf streaming back
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5;
  drawSprite(ctx, glow(N.cyan, 64), -s * 0.06, -s * 0.66, s * 0.6);
  ctx.restore();
  drawBlot(ctx, -s * 0.07, -s * 0.47, s * 0.4, { t, pose: o.pose ?? 'idle', look: o.look ? [o.look[0] - x, o.look[1] - y] : [s * 3, -s * 0.6], seed: 21, eye: '#fbfaf5', rot: 0.18, wind: -1 });
  // wheels
  for (const wx of [rx, fx]) {
    ctx.save();
    ctx.translate(wx, -r);
    ctx.fillStyle = '#05050a';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = withAlpha(N.cyan, 0.85);
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.66, 0, TAU);
    ctx.stroke();
    ctx.rotate(o.spin);
    ctx.strokeStyle = withAlpha('#9aa6c8', 0.7);
    ctx.lineWidth = Math.max(1, s * 0.008);
    for (let k = 0; k < 5; k++) {
      ctx.rotate(TAU / 5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.64, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
  // the body: a little café racer in black with a magenta stripe
  ctx.fillStyle = '#121019';
  ctx.beginPath();
  ctx.moveTo(rx, -r);
  ctx.lineTo(-s * 0.22, -s * 0.44);
  ctx.lineTo(-s * 0.32, -s * 0.47); // tail
  ctx.lineTo(-s * 0.3, -s * 0.52);
  ctx.lineTo(s * 0.02, -s * 0.5); // seat
  ctx.quadraticCurveTo(s * 0.12, -s * 0.66, s * 0.3, -s * 0.6); // tank
  ctx.lineTo(s * 0.36, -s * 0.5);
  ctx.lineTo(s * 0.12, -s * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = N.mag;
  ctx.lineWidth = Math.max(1, s * 0.016);
  ctx.beginPath();
  ctx.moveTo(-s * 0.28, -s * 0.48);
  ctx.lineTo(0, -s * 0.47);
  ctx.quadraticCurveTo(s * 0.12, -s * 0.6, s * 0.3, -s * 0.56);
  ctx.stroke();
  // fork and bars
  ctx.strokeStyle = '#1d1a28';
  ctx.lineWidth = s * 0.03;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fx, -r);
  ctx.lineTo(s * 0.32, -s * 0.62);
  ctx.lineTo(s * 0.22, -s * 0.7);
  ctx.stroke();
  // exhaust
  ctx.strokeStyle = '#3a3646';
  ctx.lineWidth = s * 0.025;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.24);
  ctx.lineTo(-s * 0.36, -s * 0.3);
  ctx.stroke();
  // lights
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow(N.red, 64), -s * 0.33, -s * 0.5, s * 0.25);
  ctx.fillStyle = N.red;
  ctx.fillRect(-s * 0.35, -s * 0.515, s * 0.035, s * 0.03);
  if (light > 0) {
    ctx.globalAlpha = light;
    drawSprite(ctx, glow('#fff1c8', 64), s * 0.36, -s * 0.6, s * 0.35);
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.arc(s * 0.36, -s * 0.6, s * 0.035, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

/** the tail-light as a ribbon left in the air behind the bike (long exposure) */
function ribbon(g: G, pts: Pt[], wd: number, col: string, alpha = 1) {
  const { ctx } = g;
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [m, a] of [[3, 0.18], [1.4, 0.5], [0.5, 1]] as const) {
    ctx.strokeStyle = m < 1 ? '#ffe9ee' : col;
    ctx.globalAlpha = a * alpha;
    ctx.lineWidth = wd * m;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  ctx.restore();
}

/** the falling star, with its trail */
function star(g: G, x: number, y: number, r: number, dir: Pt, a = 1) {
  const { ctx, S, t } = g;
  const L = S * 0.35;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createLinearGradient(x, y, x - dir[0] * L, y - dir[1] * L);
  gr.addColorStop(0, `rgba(255,233,176,${0.8 * a})`);
  gr.addColorStop(1, 'rgba(255,233,176,0)');
  ctx.strokeStyle = gr;
  ctx.lineWidth = r * 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - dir[0] * L, y - dir[1] * L);
  ctx.stroke();
  ctx.restore();
  drawSpark(ctx, x, y, r, a, t);
}

/* ================================================================ SHOTS */

/* the sword's ripple, matched: a tyre slams through a puddle full of neon */
function shotPuddle(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const hz = h * 0.36;
  city(g, t * S * 0.02, hz, { dim: 0.2 });
  // blur the city down: it's far behind the puddle we're looking at
  ctx.fillStyle = 'rgba(5,4,16,0.45)';
  ctx.fillRect(0, 0, w, hz);
  // the puddle: a sheet of neon on black
  const px = w / 2, py = h * 0.62, prx = w * 0.62, pry = h * 0.14;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(px, py, prx, pry, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = '#0a0820';
  ctx.fillRect(px - prx, py - pry, prx * 2, pry * 2);
  const wob = (k: number) => Math.sin(k * 3 + t * 4) * S * 0.01 * seg(q, 0.3, 0.6) * (1 - seg(q, 0.6, 1) * 0.7);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const col = SIGN_COLS[i % SIGN_COLS.length];
    ctx.globalAlpha = 0.55;
    drawSprite(ctx, glow(col, 64), px + (hash(i) - 0.5) * prx * 1.7 + wob(i), py + (hash(i * 3) - 0.5) * pry * 1.4, S * (0.12 + hash(i * 5) * 0.2), S * (0.05 + hash(i * 7) * 0.08));
  }
  // the star, reflected
  ctx.globalAlpha = 1;
  drawSpark(ctx, px - prx * 0.3 + wob(11), py - pry * 0.3, S * 0.012, 0.9, t);
  ctx.restore();
  // the ring that came from the sword: it carries on outward across the puddle
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    const qq = clamp(q * 1.6 + 0.35 - k * 0.15);
    if (qq <= 0 || qq >= 1) continue;
    ctx.strokeStyle = withAlpha(k ? N.cyan : N.mag, (1 - qq) * 0.8);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(px, py, prx * ease.out2(qq), pry * ease.out2(qq), 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  // the bike: huge, close, low, gone in a blink
  const pass = seg(q, 0.16, 0.48);
  if (pass > 0 && pass < 1) {
    const bs = S * (g.portrait ? 1.25 : 1.0);
    const tx = lerp(-bs * 0.9, w + bs * 0.9, pass);
    // streaks it leaves in the air
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const y = py - bs * (0.05 + hash(i) * 0.6);
      const len = bs * (0.6 + hash(i * 3) * 1.2);
      const gr = ctx.createLinearGradient(tx - len, 0, tx - bs * 0.3, 0);
      gr.addColorStop(0, 'rgba(34,230,255,0)');
      gr.addColorStop(1, i % 3 ? 'rgba(160,220,255,0.35)' : 'rgba(255,60,90,0.5)');
      ctx.fillStyle = gr;
      ctx.fillRect(tx - len, y, len - bs * 0.3, Math.max(1, bs * 0.004));
    }
    ctx.restore();
    bike(g, tx, py + bs * 0.04, bs, { spin: pass * 60, light: 1 });
    if (hitQ(0.3)) g.f.shake(S * 0.03);
  }
  // spray: two sheets of drops thrown off the tyre
  const spray = seg(q, 0.25, 0.9);
  if (spray > 0) {
    const r = rng(9);
    for (let i = 0; i < 60; i++) {
      const sx = px + (r() - 0.5) * prx * 0.6;
      const an = -Math.PI / 2 + (r() - 0.5) * 2.4;
      const v = S * (0.3 + r() * 0.9);
      const k = ease.out2(spray);
      const x = sx + Math.cos(an) * v * k, y = py + Math.sin(an) * v * k + S * 1.4 * k * k;
      if (y > py + pry) continue;
      ctx.fillStyle = i % 4 ? 'rgba(200,230,255,0.75)' : withAlpha(SIGN_COLS[i % 5], 0.9);
      ctx.beginPath();
      ctx.arc(x, y, S * (0.003 + r() * 0.006) * (1 - spray * 0.5), 0, TAU);
      ctx.fill();
    }
  }
  // and away up the road, a red tail-light shrinking into the city
  const away = seg(q, 0.45, 1);
  if (away > 0) {
    const x = lerp(w * 0.55, w * 0.62, away), y = lerp(h * 0.5, hz + h * 0.02, ease.out2(away));
    const sz = lerp(S * 0.05, S * 0.008, ease.out2(away));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glow(N.red, 64), x, y, sz * 6);
    ctx.restore();
  }
  // the star itself, up in the sky, falling
  star(g, lerp(w * 0.7, w * 0.76, q), lerp(h * 0.08, h * 0.12, q), S * 0.014, [0.45, 0.9], 1);
}

/* side on, tracking: launch, and the whole street tearing past */
function shotLaunch(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const hz = h * 0.6;
  const go = ease.in2(seg(q, 0.08, 0.35));
  const pos = w * 9 * Math.max(0, q - 0.08) ** 1.3 + t * S * 0.05;
  city(g, pos, hz);
  // street lamps whipping past in the foreground
  for (let i = 0; i < 6; i++) {
    const x = w + 60 - ((pos * 1.6 + i * w * 0.45) % (w * 2.7));
    ctx.fillStyle = '#05050b';
    ctx.fillRect(x, hz - h * 0.28, S * 0.02, h * 0.4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glow(N.amber, 64), x + S * 0.01, hz - h * 0.28, S * 0.3 * (1 + go), S * 0.2);
    ctx.restore();
  }
  // the kerb and the lane
  ctx.fillStyle = '#121225';
  ctx.fillRect(0, hz, w, h * 0.025);
  ctx.fillStyle = 'rgba(180,190,230,0.25)';
  ctx.fillRect(0, hz + h * 0.025, w, 1.5);
  // road markings streaming
  ctx.fillStyle = 'rgba(255,240,200,0.5)';
  for (let i = 0; i < 6; i++) {
    const x = w + 50 - ((pos * 1.2 + i * w * 0.4) % (w * 2.4));
    ctx.fillRect(x, h * 0.88, S * 0.14 * (1 + go * 2), S * 0.008);
  }
  const s = S * (g.portrait ? 0.78 : 0.6);
  const bx = w * 0.44, by = h * 0.84 + Math.sin(t * 30) * S * 0.002 * go;
  // revving: the front lifts a little as it launches
  const wheelie = bell(q, 0.08, 0.3) * -0.12;
  // tail-light ribbon behind, the faster the longer
  const pts: Pt[] = [];
  for (let k = 0; k <= 12; k++) {
    pts.push([bx - s * 0.33 - k * S * 0.08 * go, by - s * 0.5 + Math.sin(k * 0.6 - t * 6) * S * 0.006 * k * go]);
  }
  ribbon(g, pts, S * 0.012, N.red, go);
  bike(g, bx, by, s, { spin: pos / (s * 0.2), lean: wheelie, look: [w * 0.8, h * 0.1] });
  // speed lines at full tilt
  if (go > 0.5) {
    ctx.save();
    ctx.globalAlpha = (go - 0.5) * 0.9;
    ctx.fillStyle = 'rgba(220,235,255,0.5)';
    const k = Math.floor(t * 24);
    for (let i = 0; i < 26; i++) {
      const y = hash(i * 3.1 + k) * h;
      ctx.fillRect(hash(i * 7 + k) * w, y, w * (0.2 + hash(i + k) * 0.5), 1);
    }
    ctx.restore();
  }
  // the star, ahead and high, falling the way they're going
  star(g, lerp(w * 0.72, w * 0.88, q), lerp(h * 0.1, h * 0.16, q), S * 0.016, [0.5, 0.86], 1);
  if (hitQ(0.1)) g.f.shake(S * 0.02);
}

/* head on through a tunnel: the lights pour past, the bike leans through the bends */
function shotTunnel(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  ctx.fillStyle = '#040409';
  ctx.fillRect(0, 0, w, h);
  const lean = Math.sin(q * TAU * 1.25 + 0.4) * 0.38;
  const vx = w / 2 - lean * S * 0.5, vy = h * 0.44;
  // the tunnel: frames rushing toward the camera, walls shaded by depth
  const n = 26;
  const frames: { z: number; i: number }[] = [];
  for (let i = 0; i < n; i++) frames.push({ z: (((i / n - q * 2.2 - t * 0.05) % 1) + 1) % 1, i });
  // nearest first: each farther frame sits inside the last, so the tunnel recedes
  frames.sort((p0, p1) => p0.z - p1.z);
  for (const { z, i } of frames) {
    const sc = 0.04 / (z * 0.96 + 0.04);
    const W = w * 0.7 * sc, H = h * 0.5 * sc;
    const cx = lerp(vx, w / 2, Math.min(1, sc * 0.6)), cy = lerp(vy, h * 0.55, Math.min(1, sc * 0.6));
    const a = Math.min(1, (1 - z) * 1.6) * Math.min(1, sc * 3);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-lean * 0.4 * Math.min(1, sc));
    ctx.fillStyle = i % 2 ? `rgba(22,22,40,${a})` : `rgba(16,16,30,${a})`;
    ctx.beginPath();
    ctx.roundRect(-W, -H, W * 2, H * 2, [H * 0.8, H * 0.8, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = `rgba(60,66,100,${a})`;
    ctx.lineWidth = Math.max(1, S * 0.006 * sc);
    ctx.stroke();
    // the strip lights along the walls
    ctx.globalCompositeOperation = 'lighter';
    for (const sx of [-1, 1]) {
      ctx.globalAlpha = a;
      ctx.fillStyle = i % 4 === 0 ? N.cyan : N.amber;
      ctx.fillRect(sx * W * 0.9 - S * 0.02 * sc, -H * 0.6, S * 0.04 * sc, H * 0.08);
      drawSprite(ctx, glow(i % 4 === 0 ? N.cyan : N.amber, 64), sx * W * 0.9, -H * 0.56, S * 0.3 * sc, S * 0.12 * sc);
    }
    ctx.restore();
  }
  // the far end: a glow the bike is riding into
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6;
  drawSprite(ctx, glow('#ffd9a0', 128), vx, vy, S * 0.5);
  ctx.restore();
  // lamp streaks at the edges where they pass
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) {
    const z = (((hash(i) - q * 2.2 - t * 0.05) % 1) + 1) % 1;
    if (z > 0.35) continue;
    const an = (i % 2 ? -0.4 : Math.PI + 0.4) + (hash(i * 3) - 0.5) * 0.5;
    const r0 = S * 0.5 / (z + 0.15), r1 = r0 * 1.5;
    ctx.strokeStyle = withAlpha(i % 3 ? N.amber : N.cyan, 0.6 * (1 - z / 0.35));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(vx + Math.cos(an) * r0, vy + Math.sin(an) * r0 * 0.6);
    ctx.lineTo(vx + Math.cos(an) * r1, vy + Math.sin(an) * r1 * 0.6);
    ctx.stroke();
  }
  ctx.restore();
  // the road
  ctx.fillStyle = '#08080f';
  ctx.beginPath();
  ctx.moveTo(vx - S * 0.02, vy + S * 0.03);
  ctx.lineTo(vx + S * 0.02, vy + S * 0.03);
  ctx.lineTo(w * 1.2, h);
  ctx.lineTo(-w * 0.2, h);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    const z = (((i / 8 - q * 3) % 1) + 1) % 1;
    const sc = 0.05 / (z * 0.95 + 0.05);
    const y = lerp(vy + S * 0.03, h * 1.4, Math.min(1, sc * 0.4));
    const x = lerp(vx, w / 2, Math.min(1, sc * 0.4));
    ctx.fillStyle = 'rgba(255,230,170,0.55)';
    ctx.fillRect(x - S * 0.004 * sc, y, S * 0.008 * sc, S * 0.05 * sc);
  }
  // the bike, head on, leaning through it: the headlight is the circle again
  const bx = w / 2 + Math.sin(q * TAU * 1.25 + 0.4) * S * 0.08, by = h * 0.86;
  const s = S * (g.portrait ? 0.62 : 0.5);
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(lean);
  ctx.fillStyle = '#05050a';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.2, s * 0.07, s * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#121019';
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.5);
  ctx.lineTo(s * 0.2, -s * 0.5);
  ctx.lineTo(s * 0.1, -s * 0.28);
  ctx.lineTo(-s * 0.1, -s * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5;
  drawSprite(ctx, glow(N.cyan, 64), 0, -s * 0.8, s * 1.1);
  ctx.restore();
  drawBlot(ctx, 0, -s * 0.5, s * 0.55, { t, pose: 'idle', look: [0, s], seed: 21, eye: '#fbfaf5', wind: 0.2 });
  ctx.strokeStyle = '#1d1a28';
  ctx.lineWidth = s * 0.03;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s * 0.58);
  ctx.lineTo(s * 0.3, -s * 0.58);
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow('#fff1c8', 128), 0, -s * 0.42, s * 1.2);
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.arc(0, -s * 0.42, s * 0.08, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (Math.abs(lean) > 0.35) g.f.shake(S * 0.003);
}

/* wide over the rooftops: one light trail winding through the city toward the stadium, the star ahead of it */
const CHASE_PATH: Pt[] = [[-0.1, 0.94], [0.16, 0.86], [0.34, 0.9], [0.5, 0.81], [0.6, 0.84], [0.7, 0.77], [0.76, 0.7]];
/** Catmull-Rom through the points, u in 0..1 */
function smoothAlong(pts: Pt[], u: number): Pt {
  const x = clamp(u) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(x)), f = x - k;
  const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
}
function stadium(g: G, x: number, y: number, s: number, lit: number) {
  const { ctx, t } = g;
  // the glow over the bowl, and four floodlight towers
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.45 + lit * 0.45;
  drawSprite(ctx, glow('#9fd2ff', 128), x, y - s * 0.3, s * 3, s * 1.6);
  ctx.restore();
  ctx.fillStyle = '#0b0c18';
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.quadraticCurveTo(x - s * 0.95, y - s * 0.42, x - s * 0.6, y - s * 0.45);
  ctx.lineTo(x + s * 0.6, y - s * 0.45);
  ctx.quadraticCurveTo(x + s * 0.95, y - s * 0.42, x + s, y);
  ctx.closePath();
  ctx.fill();
  for (const k of [-0.8, -0.3, 0.3, 0.8]) {
    const tx = x + k * s, ty = y - s * (0.5 + Math.abs(k) * 0.25);
    ctx.fillStyle = '#0b0c18';
    ctx.fillRect(tx - s * 0.015, ty, s * 0.03, y - ty);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, glow('#ffffff', 64), tx, ty, s * (0.25 + lit * 0.15) * (0.95 + Math.sin(t * 7 + k) * 0.05));
    ctx.restore();
  }
}
function shotChase(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const hz = h * 0.62;
  city(g, t * S * 0.01 + q * S * 0.3, hz, { reflect: false });
  // the city seen from above it: the street plane darker, a lattice of lit streets
  ctx.fillStyle = 'rgba(3,3,10,0.55)';
  ctx.fillRect(0, hz, w, h - hz);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const y = hz + (h - hz) * (i / 9) ** 1.4;
    ctx.strokeStyle = `rgba(255,170,80,${0.08 + (i / 9) * 0.1})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (i % 2 ? 6 : -6));
    ctx.stroke();
  }
  ctx.restore();
  stadium(g, w * 0.74, hz + h * 0.05, S * 0.3, 0.4 + seg(q, 0.5, 1) * 0.6);
  // the trail: everything the bike has ridden so far, still glowing
  const u = ease.inOut2(seg(q, 0, 1)) * 0.98;
  const trail: Pt[] = [];
  for (let k = 0; k <= 60; k++) {
    const p = smoothAlong(CHASE_PATH, (u * k) / 60);
    trail.push([p[0] * w, p[1] * h]);
  }
  ribbon(g, trail, S * 0.008, N.red, 0.9);
  const head = trail[trail.length - 1];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, glow('#fff1c8', 64), head[0], head[1], S * 0.12);
  ctx.restore();
  // the star, coming down out of the sky toward the stadium
  const sx = lerp(w * 0.15, w * 0.74, ease.inOut2(q)), sy = lerp(h * 0.1, h * 0.5, ease.in2(q));
  star(g, sx, sy, S * 0.02, [0.85, 0.5], 1);
}

/* the long skid: sideways on a shower of sparks, right up to the stadium gates; the star goes over the wall */
function shotSkid(g: G, q: number) {
  const { ctx, w, h, S, t } = g;
  const hz = h * 0.66;
  // the stadium wall fills the back of the frame, the gate on the right
  city(g, t * S * 0.01, hz, { dim: 0.4 });
  const wallTop = h * 0.36;
  // floodlights on towers above the wall, and the light spilling over it
  const lit = seg(q, 0.55, 0.9);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 + lit * 0.4;
  const spill = ctx.createLinearGradient(0, wallTop - h * 0.25, 0, wallTop);
  spill.addColorStop(0, 'rgba(150,200,255,0)');
  spill.addColorStop(1, 'rgba(150,200,255,0.55)');
  ctx.fillStyle = spill;
  ctx.fillRect(0, wallTop - h * 0.25, w, h * 0.25);
  ctx.restore();
  for (const k of [0.12, 0.42, 0.7, 0.95]) {
    const tx = w * k, ty = wallTop - S * (0.32 + (k % 0.3) * 0.2);
    ctx.fillStyle = '#0b0c18';
    ctx.fillRect(tx - S * 0.006, ty, S * 0.012, wallTop - ty);
    ctx.fillRect(tx - S * 0.04, ty - S * 0.015, S * 0.08, S * 0.03);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6 + lit * 0.4;
    drawSprite(ctx, glow('#e8f3ff', 64), tx, ty, S * (0.22 + lit * 0.12));
    ctx.restore();
  }
  ctx.fillStyle = N.wall;
  ctx.fillRect(0, wallTop, w, hz - wallTop);
  // panels, and the gate
  ctx.strokeStyle = 'rgba(160,170,210,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x = (i / 8) * w;
    ctx.beginPath();
    ctx.moveTo(x, wallTop);
    ctx.lineTo(x, hz);
    ctx.stroke();
  }
  const gx = w * 0.78, gw = S * 0.34;
  ctx.fillStyle = '#05060c';
  ctx.beginPath();
  ctx.moveTo(gx - gw / 2, hz);
  ctx.lineTo(gx - gw / 2, hz - S * 0.42);
  ctx.arc(gx, hz - S * 0.42, gw / 2, Math.PI, 0);
  ctx.lineTo(gx + gw / 2, hz);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.25 + lit * 0.5;
  drawSprite(ctx, glow('#cfe6ff', 128), gx, hz - S * 0.2, gw * 1.3, S * 0.7);
  ctx.restore();
  // the street in front, wet
  ctx.fillStyle = '#07070e';
  ctx.fillRect(0, hz, w, h - hz);
  // the slide: fast, then the skid bites, sideways, and it stops a hair from the gate
  const slide = ease.out3(seg(q, 0, 0.62));
  const s = S * (g.portrait ? 0.55 : 0.45);
  const bx = lerp(-w * 0.35, w * 0.48, slide), by = h * 0.86;
  // the rear steps out: a slight nose-down dip as the brakes bite, then it settles
  const lay = bell(q, 0.08, 0.62) * 0.06;
  const speed = clamp((1 - seg(q, 0.05, 0.62)) * 1.2);
  // skid mark: black rubber with a hot line in it
  if (slide > 0.05) {
    const x0 = lerp(-w * 0.35, w * 0.48, ease.out3(seg(0.12, 0, 0.62)));
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(Math.min(x0, bx), by - S * 0.006, Math.abs(bx - x0), S * 0.014);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(x0, 0, bx, 0);
    gr.addColorStop(0, 'rgba(255,120,40,0)');
    gr.addColorStop(1, `rgba(255,170,80,${0.6 * speed})`);
    ctx.fillStyle = gr;
    ctx.fillRect(Math.min(x0, bx), by - S * 0.002, Math.abs(bx - x0), S * 0.004);
    ctx.restore();
  }
  // sparks pouring off the rear where it scrapes, flung back the way it came
  if (speed > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const life = (hash(i * 3.7) + t * (1.5 + hash(i) * 1.5)) % 1;
      const an = Math.PI + 0.15 + hash(i * 1.3) * 0.9;
      const v = S * (0.2 + hash(i * 5.1) * 0.7) * speed;
      const x = bx - s * 0.4 + Math.cos(an) * v * life, y = by - S * 0.004 + Math.sin(an) * v * life + S * 0.6 * life * life;
      if (y > by + S * 0.01) continue;
      ctx.strokeStyle = withAlpha(i % 3 ? N.amber : '#fff3c4', (1 - life) * speed);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.cos(an) * S * 0.03, y - Math.sin(an) * S * 0.03);
      ctx.stroke();
    }
    ctx.restore();
    // tyre smoke
    for (let i = 0; i < 6; i++) {
      const life = (hash(i * 9.1) + t * 0.6) % 1;
      ctx.save();
      ctx.globalAlpha = 0.35 * (1 - life) * speed;
      drawSprite(ctx, glow('#4a4660', 128), bx - s * 0.4 - life * S * 0.3, by - s * 0.15 - life * S * 0.12, S * (0.25 + life * 0.4), S * (0.15 + life * 0.25));
      ctx.restore();
    }
  }
  // Blot looks up as the star goes over
  const over = seg(q, 0.45, 0.95);
  const sx = lerp(w * 0.05, w * 0.95, ease.inOut2(over)), sy = lerp(h * 0.1, wallTop - S * 0.04, Math.sin(over * Math.PI * 0.5) ** 0.6) + over * over * S * 0.2;
  bike(g, bx, by, s, { spin: slide * 40, lean: lay, light: 1, look: over > 0 ? [sx, sy] : undefined, pose: q > 0.9 ? 'cheer' : q > 0.62 ? 'shock' : 'idle' });
  if (hitQ(0.1)) g.f.shake(S * 0.02);
  if (speed > 0.3) g.f.shake(S * 0.003);
  if (over > 0 && over < 1) star(g, sx, sy, S * 0.022, [0.9, 0.3], 1);
  // it drops behind the wall and the whole stadium lights up
  const flare = bell(q, 0.92, 1);
  if (flare > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = flare * 0.8;
    const fl = ctx.createLinearGradient(0, 0, 0, wallTop);
    fl.addColorStop(0, 'rgba(255,255,255,0)');
    fl.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = fl;
    ctx.fillRect(0, 0, w, wallTop);
    ctx.restore();
  }
}
