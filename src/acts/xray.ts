import type { Frame } from '../core/frame';
import { type Pt, TAU, clamp, ease, hash, lerp, seg } from '../core/math';
import { solve } from './warrior';

/*
 * X-RAY (post-credits).
 *
 * The whole film again, fast, stripped to how it was made: an anime pencil
 * test drawn in blueprint lines. Bones for the fighters (the same IK that
 * drives them), the dragon as its spline and segment frames, TITAN as boxes
 * on motion arcs, the beams as unblended colour layers, the void as
 * wireframe orbits, the bike as circles on a road curve, the stadium as a
 * wireframe with the camera's path through it, and the first circle with its
 * handles out. An easing curve scribbles along the bottom the whole time.
 * No words: it's the "yes, every frame of this was built" moment.
 */

const BG = '#06101f', LINE = '#9fe3ff', DIM = 'rgba(159,227,255,0.25)', HOT = '#ffffff', MARK = '#ff6a4d';

interface G { ctx: CanvasRenderingContext2D; w: number; h: number; S: number; t: number }
type Seg = (g: G, u: number) => void;
const SEGS: Seg[] = [inkBones, dragonSpline, titanBoxes, rideCircles, matchWire, pageHandles];

export function drawXray(f: Frame, p: number) {
  const { ctx, w, h, t } = f;
  const g: G = { ctx, w, h, S: Math.min(w, h), t };
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  grid(g);
  const n = SEGS.length;
  const i = Math.min(n - 1, Math.floor(clamp(p) * n));
  const u = clamp(p) * n - i;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  SEGS[i](g, u);
  ctx.restore();
  graph(g, p);
  // a hard white frame at every cut, like flipping to the next sheet
  if (u < 0.04 && i > 0) {
    ctx.fillStyle = `rgba(220,245,255,${0.35 * (1 - u / 0.04)})`;
    ctx.fillRect(0, 0, w, h);
  }
  // the scan line running down the sheet
  const sy = ((t * 0.6) % 1) * h;
  const gr = ctx.createLinearGradient(0, sy - 30, 0, sy);
  gr.addColorStop(0, 'rgba(159,227,255,0)');
  gr.addColorStop(1, 'rgba(159,227,255,0.12)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, sy - 30, w, 30);
}

function grid(g: G) {
  const { ctx, w, h, S } = g;
  const sp = S * 0.08;
  ctx.strokeStyle = 'rgba(159,227,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = (w / 2) % sp; x < w; x += sp) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = (h / 2) % sp; y < h; y += sp) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
  // registration marks in the corners
  ctx.strokeStyle = DIM;
  for (const [x, y] of [[S * 0.06, h * 0.1], [w - S * 0.06, h * 0.1], [S * 0.06, h * 0.88], [w - S * 0.06, h * 0.88]]) {
    ctx.beginPath();
    ctx.arc(x, y, S * 0.015, 0, TAU);
    ctx.moveTo(x - S * 0.03, y);
    ctx.lineTo(x + S * 0.03, y);
    ctx.moveTo(x, y - S * 0.03);
    ctx.lineTo(x, y + S * 0.03);
    ctx.stroke();
  }
}

/** an easing curve plotted along the bottom, with the playhead on it */
function graph(g: G, p: number) {
  const { ctx, w, h, S } = g;
  const x0 = S * 0.1, x1 = w - S * 0.1, y0 = h * 0.86, y1 = h * 0.78;
  ctx.strokeStyle = DIM;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y0);
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0, y1);
  ctx.stroke();
  const local = (p * SEGS.length) % 1;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    if (u > local) break;
    const x = lerp(x0, x1, u), y = lerp(y0, y1, ease.inOut3(u));
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = MARK;
  ctx.beginPath();
  ctx.arc(lerp(x0, x1, local), lerp(y0, y1, ease.inOut3(local)), S * 0.008, 0, TAU);
  ctx.fill();
}

function bones(g: G, hilt: Pt, a: number, foeX: number, s: number, ground: number, alpha: number, col = LINE) {
  const { ctx, t } = g;
  const k = solve({ hilt, a, foeX, s, groundY: ground, color: col, t, vx: 0, vy: 0, seed: 1 });
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1, s * 0.008);
  ctx.beginPath();
  const seg2 = (p: Pt[]) => p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
  seg2([k.head, k.chest, k.pelvis]);
  seg2([k.shoulder, k.elbow1, k.hand1]);
  seg2([k.shoulder, k.elbow2, k.hand2]);
  seg2([k.pelvis, k.kneeF, k.footF]);
  seg2([k.pelvis, k.kneeB, k.footB]);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(k.head[0], k.head[1], s * 0.055, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = col;
  for (const j of [k.shoulder, k.elbow1, k.elbow2, k.hand1, k.pelvis, k.kneeF, k.kneeB, k.footF, k.footB]) {
    ctx.beginPath();
    ctx.arc(j[0], j[1], Math.max(1.5, s * 0.012), 0, TAU);
    ctx.fill();
  }
  // the blade, and the IK target as a crosshair on the hilt
  ctx.strokeStyle = HOT;
  ctx.beginPath();
  ctx.moveTo(hilt[0], hilt[1]);
  ctx.lineTo(hilt[0] + Math.cos(a) * s * 0.7, hilt[1] + Math.sin(a) * s * 0.7);
  ctx.stroke();
  ctx.strokeStyle = MARK;
  ctx.beginPath();
  ctx.arc(hilt[0], hilt[1], s * 0.03, 0, TAU);
  ctx.moveTo(hilt[0] - s * 0.05, hilt[1]);
  ctx.lineTo(hilt[0] + s * 0.05, hilt[1]);
  ctx.moveTo(hilt[0], hilt[1] - s * 0.05);
  ctx.lineTo(hilt[0], hilt[1] + s * 0.05);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/* 1. the duel as bones, with onion skins of the last few poses */
function inkBones(g: G, u: number) {
  const { w, h, S } = g;
  const s = S * 0.55, gy = h * 0.66;
  const pose = (v: number): [Pt, number, Pt, number] => {
    const c = Math.sin(v * TAU * 2.2);
    const bx: Pt = [w * 0.32 + c * S * 0.05, gy - s * 0.5 - Math.abs(Math.sin(v * TAU * 1.1)) * s * 0.15];
    const gx: Pt = [w * 0.68 - c * S * 0.05, gy - s * 0.5];
    return [bx, -0.9 + c * 0.9, gx, Math.PI + 0.9 - c * 0.9];
  };
  for (let k = 3; k >= 0; k--) {
    const [b, ba, gp, ga] = pose(u - k * 0.03);
    bones(g, b, ba, w, s, gy, k ? 0.18 : 1, k ? DIM : '#7fb2ff');
    bones(g, gp, ga, 0, s, gy, k ? 0.18 : 1, k ? DIM : '#b7f06a');
  }
  floor(g, gy);
}

function floor(g: G, y: number) {
  const { ctx, w } = g;
  ctx.strokeStyle = DIM;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

/* 2. the dragon: its path, the control points, the spine frames riding it */
function dragonSpline(g: G, u: number) {
  const { ctx, w, h, S } = g;
  const way: Pt[] = [[-0.1, 0.8], [0.3, 0.7], [0.7, 0.75], [0.85, 0.45], [0.55, 0.25], [0.2, 0.35], [0.35, 0.55], [1.1, 0.5]].map(([x, y]) => [x * w, y * h]);
  const at = (v: number): Pt => {
    const x = clamp(v) * (way.length - 1), k = Math.min(way.length - 2, Math.floor(x)), f = x - k;
    const p0 = way[Math.max(0, k - 1)], p1 = way[k], p2 = way[k + 1], p3 = way[Math.min(way.length - 1, k + 2)];
    const cr = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
  };
  ctx.strokeStyle = DIM;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const p = at(i / 120);
    if (i) ctx.lineTo(p[0], p[1]);
    else ctx.moveTo(p[0], p[1]);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = MARK;
  for (const p of way) ctx.strokeRect(p[0] - 4, p[1] - 4, 8, 8);
  // the spine: thirty frames following the head
  const head = lerp(0.3, 1, u);
  for (let i = 0; i < 30; i++) {
    const v = head - i * 0.012;
    if (v < 0) break;
    const p = at(v), q = at(v + 0.004);
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const r = S * 0.03 * (1 - i / 34);
    ctx.strokeStyle = i ? LINE : HOT;
    ctx.lineWidth = i ? 1 : 2;
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, TAU);
    ctx.moveTo(p[0] - Math.sin(a) * r * 1.8, p[1] + Math.cos(a) * r * 1.8);
    ctx.lineTo(p[0] + Math.sin(a) * r * 1.8, p[1] - Math.cos(a) * r * 1.8);
    ctx.stroke();
  }
}

/* 3. TITAN: boxes on motion arcs, flying into a body */
function titanBoxes(g: G, u: number) {
  const { ctx, w, h, S } = g;
  const H = S * 0.9, x = w / 2, y = h * 0.74;
  const boxes: [number, number, number, number][] = [
    [-0.2, -0.03, 0.26, 0.06], [0.2, -0.03, 0.26, 0.06], [-0.19, -0.16, 0.15, 0.2], [0.19, -0.16, 0.15, 0.2],
    [-0.17, -0.36, 0.17, 0.2], [0.17, -0.36, 0.17, 0.2], [0, -0.5, 0.44, 0.09], [0, -0.71, 0.56, 0.34],
    [-0.4, -0.72, 0.13, 0.2], [0.4, -0.72, 0.13, 0.2], [0, -0.98, 0.24, 0.18],
  ];
  boxes.forEach(([bx, by, bw, bh], i) => {
    const k = ease.outBack(seg(u, i * 0.06, i * 0.06 + 0.25), 1.3);
    const fx = x + (hash(i) - 0.5) * w * 1.4, fy = h * 1.2;
    const tx = x + bx * H, ty = y + by * H;
    // the arc it travels on
    ctx.strokeStyle = DIM;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo((fx + tx) / 2, Math.min(fy, ty) - S * 0.3, tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    if (k <= 0) return;
    const px = lerp(fx, tx, k), py = lerp(fy, ty, k) - Math.sin(Math.min(1, k) * Math.PI) * S * 0.25;
    ctx.strokeStyle = k >= 1 ? LINE : HOT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px - (bw * H) / 2, py - (bh * H) / 2, bw * H, bh * H);
    ctx.beginPath();
    ctx.moveTo(px - (bw * H) / 2, py - (bh * H) / 2);
    ctx.lineTo(px + (bw * H) / 2, py + (bh * H) / 2);
    ctx.stroke();
  });
  // the reactor: one circle
  if (u > 0.7) {
    ctx.strokeStyle = '#b7f06a';
    ctx.beginPath();
    ctx.arc(x - H * 0.03, y - H * 0.69, H * 0.075, 0, TAU);
    ctx.stroke();
  }
  floor(g, y);
}

/* 4. the ride: circles for wheels, the road as a curve, the star's fall as a parabola */
function rideCircles(g: G, u: number) {
  const { ctx, w, h, S, t } = g;
  const gy = h * 0.7;
  floor(g, gy);
  // the star's path, plotted
  ctx.strokeStyle = DIM;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const v = i / 40;
    const x = lerp(w * 0.05, w * 0.95, v), y = lerp(h * 0.08, h * 0.45, v * v);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const sx = lerp(w * 0.05, w * 0.95, u), sy = lerp(h * 0.08, h * 0.45, u * u);
  ctx.strokeStyle = HOT;
  ctx.beginPath();
  ctx.arc(sx, sy, S * 0.015, 0, TAU);
  ctx.stroke();
  // the bike
  const bx = lerp(-S * 0.3, w * 0.6, ease.out3(u)), s = S * 0.45;
  for (const ox of [-0.4, 0.42]) {
    ctx.strokeStyle = LINE;
    ctx.beginPath();
    ctx.arc(bx + ox * s, gy - s * 0.2, s * 0.2, 0, TAU);
    ctx.stroke();
    const a = -bx / (s * 0.2) + t;
    ctx.beginPath();
    ctx.moveTo(bx + ox * s, gy - s * 0.2);
    ctx.lineTo(bx + ox * s + Math.cos(a) * s * 0.2, gy - s * 0.2 + Math.sin(a) * s * 0.2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(bx - s * 0.4, gy - s * 0.2);
  ctx.lineTo(bx - s * 0.05, gy - s * 0.5);
  ctx.lineTo(bx + s * 0.32, gy - s * 0.6);
  ctx.lineTo(bx + s * 0.42, gy - s * 0.2);
  ctx.stroke();
  // Blot: a drop as two circles and a point
  ctx.strokeStyle = MARK;
  ctx.beginPath();
  ctx.arc(bx - s * 0.07, gy - s * 0.62, s * 0.1, 0, TAU);
  ctx.moveTo(bx - s * 0.07, gy - s * 0.85);
  ctx.lineTo(bx - s * 0.15, gy - s * 0.66);
  ctx.moveTo(bx - s * 0.07, gy - s * 0.85);
  ctx.lineTo(bx + s * 0.01, gy - s * 0.66);
  ctx.stroke();
}

/* 5. the match: a wireframe pitch and the camera's path through it */
function matchWire(g: G, u: number) {
  const { ctx, w, h, S } = g;
  const vp: Pt = [w / 2, h * 0.32];
  const proj = (x: number, z: number): Pt => {
    const d = 1 + z * 0.04;
    return [vp[0] + (x * S * 0.5) / d, vp[1] + (S * 1.2) / d];
  };
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const quad = (pts: [number, number][]) => pts.forEach(([x, z], i) => {
    const p = proj(x, z);
    if (i) ctx.lineTo(p[0], p[1]);
    else ctx.moveTo(p[0], p[1]);
  });
  quad([[-1, 0], [1, 0], [1, 50], [-1, 50], [-1, 0]]);
  quad([[-1, 25], [1, 25]]);
  quad([[-0.4, 50], [-0.4, 42], [0.4, 42], [0.4, 50]]);
  ctx.stroke();
  ctx.strokeStyle = DIM;
  ctx.beginPath();
  for (let i = 0; i <= 30; i++) {
    const a = (i / 30) * TAU;
    const p = proj(Math.cos(a) * 0.25, 25 + Math.sin(a) * 4);
    if (i) ctx.lineTo(p[0], p[1]);
    else ctx.moveTo(p[0], p[1]);
  }
  ctx.stroke();
  // the camera's path, and the camera on it
  const cam = (v: number): Pt => [lerp(w * 0.15, w * 0.85, v) + Math.sin(v * 7) * S * 0.05, lerp(h * 0.8, h * 0.5, v) - Math.sin(v * Math.PI) * h * 0.1];
  ctx.strokeStyle = MARK;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const p = cam(i / 40);
    if (i) ctx.lineTo(p[0], p[1]);
    else ctx.moveTo(p[0], p[1]);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const c = cam(u), cn = cam(Math.min(1, u + 0.02));
  const a = Math.atan2(vp[1] + S * 0.2 - c[1], vp[0] - c[0]);
  ctx.save();
  ctx.translate(c[0], c[1]);
  ctx.rotate(a);
  ctx.strokeStyle = HOT;
  ctx.strokeRect(-S * 0.03, -S * 0.02, S * 0.04, S * 0.04);
  ctx.beginPath();
  ctx.moveTo(S * 0.01, 0);
  ctx.lineTo(S * 0.2, -S * 0.08);
  ctx.moveTo(S * 0.01, 0);
  ctx.lineTo(S * 0.2, S * 0.08);
  ctx.stroke();
  ctx.restore();
  void cn;
}

/* 6. the page: the first circle with its handles out, and the drop's construction */
function pageHandles(g: G, u: number) {
  const { ctx, w, h, S } = g;
  const cx = w / 2, cy = h * 0.42, R = S * 0.28;
  const end = -2.2 + ease.inOut2(u) * TAU * 0.94;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, -2.2, end);
  ctx.stroke();
  // handles at four points along it
  for (let k = 0; k < 4; k++) {
    const a = -2.2 + (k / 3) * (end + 2.2);
    const p: Pt = [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    const tx = -Math.sin(a) * R * 0.35, ty = Math.cos(a) * R * 0.35;
    ctx.strokeStyle = DIM;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p[0] - tx, p[1] - ty);
    ctx.lineTo(p[0] + tx, p[1] + ty);
    ctx.stroke();
    ctx.strokeStyle = MARK;
    ctx.strokeRect(p[0] - 3, p[1] - 3, 6, 6);
    ctx.beginPath();
    ctx.arc(p[0] - tx, p[1] - ty, 3, 0, TAU);
    ctx.arc(p[0] + tx, p[1] + ty, 3, 0, TAU);
    ctx.stroke();
  }
  // the drop: where everything started
  const dx = cx + Math.cos(-2.3) * R, dy = cy + Math.sin(-2.3) * R - S * 0.08;
  ctx.strokeStyle = HOT;
  ctx.beginPath();
  ctx.arc(dx, dy, S * 0.025, 0, TAU);
  ctx.moveTo(dx, dy - S * 0.07);
  ctx.lineTo(dx - S * 0.022, dy - S * 0.012);
  ctx.moveTo(dx, dy - S * 0.07);
  ctx.lineTo(dx + S * 0.022, dy - S * 0.012);
  ctx.stroke();
}
