import type { Frame } from '../core/frame';
import { TAU, clamp, ease, hash, lerp, rng, rubber, seg } from '../core/math';
import { canvas, drawSprite, glow } from '../core/sprites';
import { font } from '../core/style';
import { FACES, FD, craneShape, craneTris, cranePose, drawGround, drawHorizonCity, drawNight } from './fold';
import { sheetRect } from './murmur';
import { type Cam3, type V3, add, drawTris, lookAt, project, rotX, rotY, rotZ } from './v3';

/*
 * IV · NEON.
 *
 * The crane flies into the city on the horizon, and the city is type. Giant
 * letters grow out of the wet street as it arrives, their tubes stutter on
 * and pour colour into the puddles; the paper crane's edges catch and it
 * becomes a neon sign of itself. Letters drop out of the sky and slam down
 * across the avenue, and the camera threads under their crossbars. At the end
 * of the street an O rises like a moon; the city goes dark street by street
 * until the O is the only light; the crane flies into its counter and the
 * camera dives after it, into the dark (chapter V is a single bulb in that dark).
 */

/** local beats */
export const NE = {
  boot: [0.05, 1.1] as const,
  neon: [0.5, 1.3] as const,
  dip: [0.3, 1.8] as const,
  rise: [4.4, 5.25] as const,
  ring: [5.0, 5.5] as const,
  climb: [4.75, 5.75] as const,
  out: [5.15, 5.75] as const,
  end: 6.8,
};

const COLS = ['#ff3fa4', '#2fd6ff', '#ffb547', '#b6ff4a', '#a77bff'];
const CRANE_NEON = '#ff3fa4';
const O_NEON = '#ff6ac1';

/* ------------------------------------------------------------- glyph sprites */

interface Glyph {
  /** the lit face, a silhouette for the extrusion, the tube */
  body: HTMLCanvasElement;
  side: HTMLCanvasElement;
  neon: HTMLCanvasElement;
  W: number;
  H: number;
  /** anchor (bottom centre of the letter) in sprite px, and the letter's height */
  ax: number;
  ay: number;
  bw: number;
  bh: number;
  /** the bloom and the glass apart (the O lights its glass round, stroke by stroke) */
  bloom: HTMLCanvasElement;
  tube: HTMLCanvasElement;
  /** for the O: its counter, sprite px from the anchor */
  hole?: { y: number; r: number };
}

const glyphs = new Map<string, Glyph>();
// asked once a frame: until the face has loaded, sprites are drawn again when it has
let ready = false;
function glyph(ch: string, col: string, px: number, plain = false): Glyph {
  const key = `${ch}|${col}|${px}|${plain}|${ready}`;
  const got = glyphs.get(key);
  if (got) return got;
  const probe = canvas(4, 4).ctx;
  probe.font = font(px);
  const m = probe.measureText(ch);
  const bw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const bh = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const pad = Math.ceil(px * 0.16);
  const W = Math.ceil(bw + pad * 2), H = Math.ceil(bh + pad * 2);
  const ox = pad + m.actualBoundingBoxLeft, oy = pad + m.actualBoundingBoxAscent;
  const text = (g: CanvasRenderingContext2D) => {
    g.font = font(px);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
  };

  // the face: dark glass, a sheen, rows of lit windows
  const b = canvas(W, H);
  text(b.ctx);
  const gr = b.ctx.createLinearGradient(0, pad, 0, pad + bh);
  gr.addColorStop(0, '#272340');
  gr.addColorStop(1, '#0e0d1a');
  b.ctx.fillStyle = gr;
  b.ctx.fillText(ch, ox, oy);
  b.ctx.globalCompositeOperation = 'source-atop';
  const r = rng(ch.charCodeAt(0) * 7 + px);
  const cell = Math.max(3, px * 0.045);
  // the monuments are plain dark glass: windows that size would read as blocks
  for (let y = pad + cell; !plain && y < pad + bh - cell; y += cell * 1.6) {
    for (let x = pad + cell * 0.5; x < pad + bw; x += cell * 1.3) {
      const v = r();
      if (v > 0.42) continue;
      b.ctx.globalAlpha = 0.25 + r() * 0.6;
      b.ctx.fillStyle = v < 0.12 ? '#9fd8ff' : '#ffd98a';
      b.ctx.fillRect(x, y, cell * 0.7, cell * 0.8);
    }
  }
  b.ctx.globalAlpha = 1;
  // the colour of its own tube, spilling down the face
  const sp = b.ctx.createLinearGradient(0, pad, 0, pad + bh);
  sp.addColorStop(0, col + (plain ? '18' : '30'));
  sp.addColorStop(1, col + '00');
  b.ctx.fillStyle = sp;
  b.ctx.fillRect(0, 0, W, H);

  const s = canvas(W, H);
  text(s.ctx);
  s.ctx.fillStyle = '#07060d';
  s.ctx.fillText(ch, ox, oy);

  // the tube: a bloom that stays outside the letter (its face is dark glass),
  // and the glass itself set just inside the edge with a white-hot core
  const n = canvas(W, H);
  text(n.ctx);
  n.ctx.lineJoin = 'round';
  n.ctx.shadowColor = col;
  n.ctx.shadowBlur = px * 0.12;
  n.ctx.strokeStyle = col;
  n.ctx.lineWidth = px * 0.05;
  n.ctx.strokeText(ch, ox, oy);
  n.ctx.strokeText(ch, ox, oy);
  n.ctx.shadowBlur = 0;
  n.ctx.globalCompositeOperation = 'destination-out';
  n.ctx.fillText(ch, ox, oy);
  const tube = canvas(W, H);
  text(tube.ctx);
  tube.ctx.lineJoin = 'round';
  tube.ctx.strokeStyle = col;
  tube.ctx.lineWidth = px * 0.075;
  tube.ctx.strokeText(ch, ox, oy);
  tube.ctx.strokeStyle = '#ffffff';
  tube.ctx.globalAlpha = 0.85;
  tube.ctx.lineWidth = px * 0.03;
  tube.ctx.strokeText(ch, ox, oy);
  tube.ctx.globalAlpha = 1;
  tube.ctx.globalCompositeOperation = 'destination-in';
  tube.ctx.fillText(ch, ox, oy);
  n.ctx.globalCompositeOperation = 'source-over';
  const bloom = canvas(W, H);
  bloom.ctx.drawImage(n.c, 0, 0);
  n.ctx.drawImage(tube.c, 0, 0);

  const G: Glyph = { body: b.c, side: s.c, neon: n.c, bloom: bloom.c, tube: tube.c, W, H, ax: pad + bw / 2, ay: pad + bh, bw, bh };
  if (ch === 'O') {
    // measure the counter down the middle column of the silhouette
    const d = s.ctx.getImageData(Math.round(G.ax), 0, 1, H).data;
    const solid = (y: number) => d[y * 4 + 3] > 128;
    let y = 0;
    while (y < H && !solid(y)) y++;
    while (y < H && solid(y)) y++;
    const top = y;
    while (y < H && !solid(y)) y++;
    G.hole = { y: G.ay - (top + y) / 2, r: (y - top) / 2 };
  }
  glyphs.set(key, G);
  return G;
}

/* ------------------------------------------------------------- the street */

interface Tower { ch: string; col: string; x: number; d: number; H: number; row: number; i: number; boot: number; sq: number }
interface Gate { ch: string; col: string; d: number; H: number; impact: number }

const GATES: Gate[] = [
  { ch: 'A', col: '#2fd6ff', d: 3690, H: 1400, impact: 0 },
  { ch: 'H', col: '#ffb547', d: 5040, H: 1300, impact: 0 },
  { ch: 'X', col: '#b6ff4a', d: 6390, H: 1400, impact: 0 },
];
const O_D = 10500, O_H = 1800;
/** a gate letter falls from the sky over this span of distance, and lands */
const DROP = [2700, 1900] as const;

const TOWERS: Tower[] = (() => {
  const r = rng(424);
  const out: Tower[] = [];
  const name = 'MAXGABRIEL';
  const rows: [number, number, number, number, number, number][] = [
    // row, first d, step, x from, x spread, height from, (height spread below)
    [0, 2300, 300, 250, 150, 520],
    [1, 2000, 420, 560, 300, 900],
    [2, 1600, 560, 1000, 700, 1500],
  ];
  const spread = [520, 900, 1200];
  for (const [row, d0, step, x0, xs, h0] of rows) {
    for (let d = d0, k = 0; d < O_D - 600; d += step * (0.8 + r() * 0.4), k++) {
      for (const side of [-1, 1]) {
        const dd = d + (side > 0 ? step * 0.45 : 0) + (r() - 0.5) * 60;
        if (row < 2 && GATES.some((g) => Math.abs(g.d - dd) < 260)) continue;
        out.push({
          ch: name[(k * 3 + (side > 0 ? 1 : 0) + row * 5) % name.length],
          col: COLS[Math.floor(r() * COLS.length)],
          x: side * (x0 + r() * xs),
          d: dd,
          H: h0 + r() * spread[row],
          row,
          i: out.length,
          boot: r(),
          // condensed: letters stood up as towers
          sq: 0.42 + r() * 0.25,
        });
      }
    }
  }
  return out;
})();

// the camera's distance down the street: [beat, distance, speed] (hermite); it
// leaves at the crane's speed, cruises, all but stops before the O, then dives
const CAMD: [number, number, number][] = [
  [0, 0, 1342], [1.2, 1740, 1558], [2.0, 2950, 1500], [4.6, 6840, 1500],
  [5.5, 7650, 300], [5.85, 7713, 60], [6.6, 10800, 4200], [6.8, 11640, 4200],
];
function camD(L: number) {
  if (L <= 0) return L * CAMD[0][2];
  let i = 0;
  while (i < CAMD.length - 2 && CAMD[i + 1][0] <= L) i++;
  const [a, p0, m0] = CAMD[i], [b, p1, m1] = CAMD[i + 1];
  const hh = b - a, s = clamp((L - a) / hh);
  const s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * hh * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * hh * m1;
}
/** the beat at which the camera reaches distance d */
function beatAt(d: number) {
  let lo = 0, hi = NE.end;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (camD(mid) < d) lo = mid;
    else hi = mid;
  }
  return lo;
}
for (const g of GATES) g.impact = beatAt(g.d - DROP[1]);
const PASS_O = beatAt(O_D - 40);

// the world: the fold's crane flight continues; z = Z0 - distance
const Z0 = cranePose(FD.end, 0).zc;

/** the crane relative to the camera */
function craneRel(L: number): V3 {
  const k = ease.inOut2(seg(L, 0.4, 1.8));
  let x = lerp(-150, Math.sin(L * 1.3) * 40, k);
  let y = lerp(-120, 85, k);
  let z = -lerp(520, 1300, k);
  const ko = ease.inOut2(seg(L, NE.climb[0], NE.climb[1]));
  x = lerp(x, 0, ko);
  y = lerp(y, -15, ko);
  z -= ease.in2(seg(L, 5.8, 6.25)) * 1700;
  return [x, y, z];
}

function camera(L: number, t: number, w: number, h: number) {
  const sr = sheetRect(w, h);
  const f0 = (sr.side * 600) / 200;
  const fl = lerp(f0, Math.min(f0, h * 0.95), ease.inOut2(seg(L, 0.3, 1.5)));
  const alt0 = 180 + Math.sin(t * 2.2) * 10;
  const kd = ease.inOut2(seg(L, NE.dip[0], NE.dip[1]));
  const sway = Math.sin(L * 1.6) * 70 * kd * (1 - seg(L, 4.4, 5.0));
  const og = glyph('O', O_NEON, 480, true);
  const oc = ((og.hole?.y ?? og.bh * 0.5) / og.bh) * O_H;
  const ko = ease.inOut3(seg(L, NE.climb[0], NE.climb[1]));
  const x = lerp(150, sway, kd);
  const y = lerp(lerp(alt0 + 120, 110, kd), oc, ko);
  const pos: V3 = [x, y, Z0 + 520 - camD(L)];
  const at = add(pos, [lerp(-240, 0, kd), lerp(-130, lerp(40, 0, ko), kd), -820]);
  // the bank as the camera weaves
  const roll = -Math.cos(L * 1.6) * 1.6 * 70 * kd * (1 - seg(L, 4.4, 5.0)) * 0.0008;
  return { cam: lookAt(pos, at, fl, sr.cx, sr.cy), roll, oc };
}

/* ------------------------------------------------------------- drawing */

/** an extruded letter standing on the street, its base centre at (x, y, z) */
function drawGlyph(
  ctx: CanvasRenderingContext2D, cam: Cam3, G: Glyph, x: number, y: number, z: number,
  Hw: number, depth: number, sx: number, sy: number, lit: number, neon: number, w: number, h: number, maxSlices = 4,
) {
  const s = Hw / G.bh;
  const near = project(cam, [x, y, z]);
  if (!near) return;
  const kN = (cam.f / near[2]) * s;
  if (near[0] + G.W * kN * sx < 0 || near[0] - G.W * kN * sx > w || near[1] - G.H * kN * sy > h) return;
  const n = Math.min(maxSlices, Math.max(1, Math.round((G.W * kN) / 50)));
  for (let i = n; i >= 0; i--) {
    const p = i ? project(cam, [x, y, z - (depth * i) / n]) : near;
    if (!p) continue;
    const k = (cam.f / p[2]) * s;
    const dw = G.W * k * sx, dh = G.H * k * sy;
    const dx = p[0] - G.ax * k * sx, dy = p[1] - G.ay * k * sy;
    ctx.drawImage(G.side, dx, dy, dw, dh);
    if (i) continue;
    if (lit > 0) {
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * lit;
      ctx.drawImage(G.body, dx, dy, dw, dh);
      ctx.globalAlpha = a;
    }
    if (neon > 0) {
      const a = ctx.globalAlpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a * neon;
      ctx.drawImage(G.neon, dx, dy, dw, dh);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
    }
  }
}

/** the tube's colour in the wet street: the letter flipped under its own base */
function drawReflection(ctx: CanvasRenderingContext2D, cam: Cam3, G: Glyph, x: number, z: number, Hw: number, sx: number, sy: number, a: number, w: number) {
  if (a <= 0.01) return;
  const p = project(cam, [x, 0, z]);
  if (!p) return;
  const k = (cam.f / p[2]) * (Hw / G.bh);
  const dw = G.W * k * sx, dh = G.H * k * sy * 1.6;
  if (p[0] + dw < 0 || p[0] - dw > w) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(p[0], p[1]);
  ctx.scale(1, -1);
  ctx.drawImage(G.neon, -G.ax * k * sx, -(G.ay / G.H) * dh, dw, dh);
  ctx.restore();
}

/** a tube that is coming on stutters first */
function flicker(on: number, t: number, i: number) {
  if (on >= 1) return 0.93 + 0.07 * Math.sin(t * 50 + i);
  if (on <= 0) return 0;
  return hash(Math.floor(t * 22) * 7 + i * 13) < on ? 1 : 0.08;
}

const EDGES: [string, string][] = (() => {
  const seen = new Set<string>();
  const out: [string, string][] = [];
  for (const f of FACES) {
    for (let i = 0; i < 3; i++) {
      const a = f[i], b = f[(i + 1) % 3];
      const k = a < b ? a + b : b + a;
      if (!seen.has(k)) { seen.add(k); out.push([a, b]); }
    }
  }
  return out;
})();

const toHex = (c: string) => {
  const m = c.match(/\d+/g);
  return m && c.startsWith('rgb') ? '#' + m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join('') : c;
};
function hexMix(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], clamp(k))).toString(16).padStart(2, '0')).join('');
}

function drawCrane(ctx: CanvasRenderingContext2D, cam: Cam3, L: number, t: number, pos: V3) {
  const Lf = FD.end + L;
  const flap = cranePose(Lf, t).flap;
  const bank = Math.sin(Lf * 2.1) * 0.22;
  const verts = craneShape(Lf, flap);
  const place = (p: V3): V3 => add(rotY(rotZ(rotX(p, bank), 0.15), Math.PI / 2), pos);
  const kn = ease.inOut2(seg(L, NE.neon[0], NE.neon[1]));
  const tris = craneTris(verts, place, 0.35).map((tr) => ({
    ...tr,
    front: hexMix(toHex(tr.front), '#1c0c1f', kn),
    back: hexMix(toHex(tr.back ?? tr.front), '#12081a', kn),
  }));
  drawTris(ctx, cam, tris, 0.6);
  // the paper's edges catch, and it becomes a sign of itself
  const on = flicker(seg(L, NE.neon[0] + 0.1, NE.neon[1]), t, 99);
  if (on <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const [a, b] of EDGES) {
    const A = project(cam, place(verts[a])), Bp = project(cam, place(verts[b]));
    if (!A || !Bp) continue;
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(Bp[0], Bp[1]);
  }
  ctx.strokeStyle = CRANE_NEON;
  ctx.globalAlpha = on * 0.35;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.globalAlpha = on;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.strokeStyle = '#fff2fa';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  const c = project(cam, pos);
  if (c) {
    ctx.globalAlpha = on * 0.45;
    drawSprite(ctx, glow(CRANE_NEON, 128), c[0], c[1], (420 * cam.f) / c[2]);
  }
  ctx.restore();
}

export function drawNeon(f: Frame, L: number) {
  const { ctx, w, h, t } = f;
  if (!ready) ready = document.fonts?.check?.('100px "Dela Gothic One"') ?? true;
  const { cam, roll, oc } = camera(L, t, w, h);
  const D = camD(L);
  const camZ = cam.pos[2];
  const zOf = (d: number) => Z0 + 520 - d;
  const out = ease.inOut2(seg(L, NE.out[0], NE.out[1]));
  const passedO = D > O_D - 40;

  if (f.crossedFwd(f.B - L + PASS_O)) f.flash(0.55, O_NEON);
  if (passedO) {
    // through the counter: nothing but the dark, and far off, one bulb
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    drawBulbHint(ctx, w, h, L);
    return;
  }

  ctx.save();
  if (roll) {
    ctx.translate(w / 2, h / 2);
    ctx.rotate(roll);
    ctx.scale(1 + Math.abs(roll) * 0.6, 1 + Math.abs(roll) * 0.6);
    ctx.translate(-w / 2, -h / 2);
  }

  // ---- sky
  drawNight(ctx, w, h, t, 1);
  const far = project(cam, [cam.pos[0], 0, camZ - 1e6]);
  const hy = far ? far[1] : h * 0.45;
  // the city's own glow, stronger as we arrive; then the lights go out
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5 * seg(L, 0, 1.2) * (1 - out);
  drawSprite(ctx, glow('#ff3fa4', 128), w * 0.5, hy, w * 2.2, h * 0.5);
  drawSprite(ctx, glow('#2fd6ff', 128), w * 0.35, hy, w * 1.2, h * 0.25);
  ctx.restore();
  // the skyline the crane saw from the fields; real letters grow up through it
  drawHorizonCity(ctx, w, h, hy, 1 - seg(L, 0.15, 0.8));
  if (out > 0) {
    ctx.fillStyle = `rgba(1,1,4,${out * 0.85})`;
    ctx.fillRect(0, 0, w, h);
  }

  // ---- the street: the paper ground turns to wet asphalt
  const ga = ctx.createLinearGradient(0, hy, 0, h);
  ga.addColorStop(0, '#0d0b18');
  ga.addColorStop(1, '#040407');
  ctx.fillStyle = ga;
  ctx.fillRect(0, hy, w, h - hy);
  drawGround(ctx, cam, w, h, 1 - ease.inOut2(seg(L, 0.15, 1.3)), 1, camZ);

  // ---- the city, far to near
  type Item = { d: number; draw: () => void; refl?: () => void };
  const items: Item[] = [];
  const boot = (b: number) => seg(L, NE.boot[0] + b * 0.75, NE.boot[0] + b * 0.75 + 0.3);
  const [rx, ry] = rubber(f.vB, 0, t);
  for (const tw of TOWERS) {
    const rel = tw.d - D;
    if (rel < 40 || rel > 6800 || tw.d > O_D) continue;
    const kRise = Math.min(boot(tw.boot), clamp((3400 + tw.row * 1400 - rel) / 600));
    if (kRise <= 0) continue;
    const grow = Math.max(0, ease.outBack(kRise, 1.8));
    const offAt = NE.out[0] + 0.5 * clamp((tw.d - camD(NE.out[0])) / (O_D - camD(NE.out[0])));
    const onK = Math.min(seg(L, NE.boot[0] + tw.boot * 0.75 + 0.15, NE.boot[0] + tw.boot * 0.75 + 0.45), clamp((3000 + tw.row * 1400 - rel) / 500));
    const offK = seg(L, offAt, offAt + 0.08);
    const neon = flicker(onK, t, tw.i) * (offK > 0 && offK < 1 ? (hash(Math.floor(t * 30) + tw.i) > offK ? 1 : 0) : 1 - offK);
    const fog = clamp((6800 - rel) / 2600);
    const sx = (tw.row === 0 ? rx : 1) * tw.sq, sy = (tw.row === 0 ? ry : 1) * grow;
    const G = glyph(tw.ch, tw.col, tw.row === 2 ? 120 : 160);
    // the letter's inner edge stands on the kerb line
    const x = tw.x + Math.sign(tw.x) * (G.bw / G.bh) * tw.H * sx * 0.5;
    const z = zOf(tw.d);
    items.push({
      d: rel,
      draw: () => {
        ctx.globalAlpha = fog;
        drawGlyph(ctx, cam, G, x, 0, z, tw.H, tw.H * 0.22, sx, sy, (1 - out) * 0.9, neon * fog, w, h, tw.row ? 1 : 3);
        ctx.globalAlpha = 1;
      },
      refl: tw.row || rel > 4200 ? undefined : () => drawReflection(ctx, cam, G, x, z, tw.H, sx, sy, 0.15 * neon * fog * clamp((rel - 300) / 1200), w),
    });
  }

  // the gates: letters that fall across the avenue
  GATES.forEach((g, gi) => {
    const rel = g.d - D;
    if (rel < 220 || rel > 9000) return;
    const kd = clamp((DROP[0] - rel) / (DROP[0] - DROP[1]));
    if (kd <= 0) return;
    const fall = (1 - ease.in3(kd)) * 2600;
    const age = L - g.impact;
    // a squash on landing, a ring of sparks
    const sq = age > 0 ? Math.exp(-age * 9) * Math.sin(age * 40) * 0.08 : 0;
    const offAt = NE.out[0] + 0.5 * clamp((g.d - camD(NE.out[0])) / (O_D - camD(NE.out[0])));
    const offK = seg(L, offAt, offAt + 0.08);
    // close up the tube would wash the frame out
    const neon = (age > 0 ? flicker(seg(age, 0.02, 0.2), t, 300 + gi) : 0.15) * (1 - offK) * lerp(0.45, 1, clamp((rel - 600) / 600)) * clamp((rel - 220) / 380);
    if (f.crossedFwd(f.B - L + g.impact)) f.shake(10);
    const G = glyph(g.ch, g.col, 360, true);
    const z = zOf(g.d);
    items.push({
      d: rel,
      draw: () => {
        drawGlyph(ctx, cam, G, 0, fall, z, g.H, 220, 1 + sq * 0.6, 1 - sq, 1 - out, neon, w, h);
        if (age > 0 && age < 0.6) drawSparks(ctx, cam, g, z, age, gi);
      },
      refl: () => (fall < 1 ? drawReflection(ctx, cam, G, 0, z, g.H, 1, 1, 0.16 * neon, w) : undefined),
    });
  });

  // the O, rising like a moon at the end of the street
  const kO = ease.out3(seg(L, NE.rise[0], NE.rise[1]));
  if (kO > 0) {
    const og = glyph('O', O_NEON, 480, true);
    const z = zOf(O_D);
    const sink = (1 - kO) * O_H * 1.05;
    const ring = seg(L, NE.ring[0], NE.ring[1]);
    const enter = craneEnters;
    const flare = L > enter ? Math.exp(-(L - enter) * 7) : 0;
    const hum = 0.92 + 0.08 * Math.sin(t * 60) * Math.sin(t * 7.3);
    items.push({
      d: O_D - D,
      draw: () => {
        // it climbs out of the ground: clip at the street line
        const base = project(cam, [0, 0, z]);
        ctx.save();
        if (base) {
          ctx.beginPath();
          ctx.rect(-w, -h, w * 3, base[1] + h);
          ctx.clip();
        }
        drawGlyph(ctx, cam, og, 0, -sink, z, O_H, 360, 1, 1, 0.55 * (1 - out * 0.7), 0, w, h);
        // the tube traces itself round, then holds
        const c = project(cam, [0, oc - sink, z]);
        if (c && ring > 0) {
          const p = project(cam, [0, -sink, z])!;
          const k = (cam.f / p[2]) * (O_H / og.bh);
          const at = [p[0] - og.ax * k, p[1] - og.ay * k, og.W * k, og.H * k] as const;
          const a = Math.min(1, hum * (0.8 + flare * 1.5));
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a * ease.in2(ring);
          ctx.drawImage(og.bloom, ...at);
          if (ring < 1) {
            ctx.beginPath();
            ctx.moveTo(c[0], c[1]);
            ctx.arc(c[0], c[1], w * 4, -Math.PI / 2, -Math.PI / 2 + ring * TAU);
            ctx.closePath();
            ctx.clip();
          }
          ctx.globalAlpha = a;
          ctx.drawImage(og.tube, ...at);
          ctx.restore();
          // its light on the air, gone as we close in (the counter is the dark)
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = (0.3 + flare * 0.6) * ring * clamp((O_D - D - 900) / 1200);
          drawSprite(ctx, glow(O_NEON, 128), c[0], c[1], og.W * k * 1.9);
          ctx.restore();
        }
        ctx.restore();
      },
      refl: () => (ring > 0 ? drawReflection(ctx, cam, og, 0, z, O_H, 1, 1, 0.32 * Math.min(1, hum + flare), w) : undefined),
    });
  }

  // the crane, out ahead
  const rel = craneRel(L);
  const cpos = add(cam.pos, rel);
  const cd = Z0 + 520 - cpos[2];
  if (cd < O_D) items.push({ d: cd - D, draw: () => drawCrane(ctx, cam, L, t, cpos) });

  items.sort((a, b) => b.d - a.d);

  // ---- reflections in the wet street, broken into ripples
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w, hy, w * 3, h * 2);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (const it of items) it.refl?.();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(6,5,12,0.32)';
  for (let i = 0; i < 18; i++) {
    const y = hy + (h - hy) * ((i + hash(i) * 0.8) / 18) ** 1.5;
    const th = 0.6 + hash(i + 40) * 2.2 * ((y - hy) / (h - hy));
    const x0 = hash(i + 80) * w * 0.6 - w * 0.2 + Math.sin(t * 0.9 + i * 2.1) * 20;
    ctx.fillRect(x0, y, w * (0.4 + hash(i + 3) * 0.8), th);
  }
  ctx.restore();
  drawStreet(ctx, cam, D, out + (1 - seg(L, 0.05, 0.7)), w);

  for (const it of items) it.draw();

  drawRain(ctx, w, h, t, f.vB, L, out);
  ctx.restore();
}

// the beat (relative to the chapter) at which the crane crosses into the O
const craneEnters = (() => {
  let lo = 5.5, hi = NE.end;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    const d = camD(mid) - craneRel(mid)[2];
    if (d < O_D) lo = mid;
    else hi = mid;
  }
  return lo;
})();

function drawStreet(ctx: CanvasRenderingContext2D, cam: Cam3, D: number, out: number, w: number) {
  const a = clamp(1 - out);
  if (a <= 0) return;
  const zOf = (d: number) => Z0 + 520 - d;
  ctx.save();
  // the centre line
  ctx.fillStyle = '#ffb547';
  for (let d = Math.floor(D / 260) * 260; d < D + 6000; d += 260) {
    const n0 = d + 0, n1 = d + 110;
    if (n0 - D < 60) continue;
    const A = project(cam, [-7, 0, zOf(n0)]), B = project(cam, [7, 0, zOf(n0)]), C = project(cam, [7, 0, zOf(n1)]), E = project(cam, [-7, 0, zOf(n1)]);
    if (!A || !B || !C || !E) continue;
    ctx.globalAlpha = a * 0.55 * clamp((6000 - (d - D)) / 3000);
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0], B[1]);
    ctx.lineTo(C[0], C[1]);
    ctx.lineTo(E[0], E[1]);
    ctx.fill();
  }
  // the kerbs
  ctx.globalAlpha = a * 0.3;
  ctx.strokeStyle = '#8a86b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const x of [-210, 210]) {
    const A = project(cam, [x, 0, zOf(D + 60)]), B = project(cam, [x, 0, zOf(D + 9000)]);
    if (A && B) { ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); }
  }
  ctx.stroke();
  ctx.restore();
  void w;
}

function drawSparks(ctx: CanvasRenderingContext2D, cam: Cam3, g: Gate, z: number, age: number, gi: number) {
  const legs = [-g.H * 0.36, g.H * 0.36];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = g.col;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 1 - seg(age, 0.2, 0.6);
  ctx.beginPath();
  for (let i = 0; i < 40; i++) {
    const leg = legs[i % 2];
    const a = hash(i * 3 + gi * 50) * Math.PI;
    const v = 500 + hash(i * 5 + gi) * 900;
    const tt = age, t2 = Math.max(0, age - 0.025);
    const P = (q: number): V3 => [leg + Math.cos(a) * v * q * (leg < 0 ? -1 : 1), Math.max(0, Math.sin(a) * v * q - 1600 * q * q), z + (hash(i + 9) - 0.5) * 200];
    const A = project(cam, P(tt)), B = project(cam, P(t2));
    if (!A || !B) continue;
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0], B[1]);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRain(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, vB: number, L: number, out: number) {
  const a = (0.22 + 0.1 * Math.min(1, Math.abs(vB) / 3)) * (1 - out * 0.7) * seg(L, 0.3, 1.2);
  if (a <= 0.01) return;
  const len = 14 + Math.min(70, Math.abs(vB) * 18);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = '#a9bcff';
  ctx.globalAlpha = a;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 150; i++) {
    const sp = 0.8 + hash(i * 1.7) * 0.6;
    const x = hash(i * 3.1) * (w + 80) - 40;
    const y = ((hash(i * 5.3) * h * 1.3 + t * h * 1.4 * sp) % (h * 1.3)) - h * 0.15;
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.12, y - len * sp);
  }
  ctx.stroke();
  ctx.restore();
}

/** the next chapter's bulb, far off in the dark */
function drawBulbHint(ctx: CanvasRenderingContext2D, w: number, h: number, L: number) {
  const a = seg(L, 6.45, 6.8);
  if (a <= 0) return;
  const sr = sheetRect(w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a * 0.7;
  drawSprite(ctx, glow('#ffcf7a', 64), sr.cx, sr.cy, 40 + a * 30);
  ctx.globalAlpha = a;
  drawSprite(ctx, glow('#fff4dc', 32), sr.cx, sr.cy, 8);
  ctx.restore();
}
