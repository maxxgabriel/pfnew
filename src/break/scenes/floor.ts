import * as THREE from 'three';
import { flatDist, orbit, type Ctx } from '../director';
import { beatsOf, frame, hit, seg, smooth } from '../math';
import { PAPER, RED } from '../page';
import { T } from '../timeline';
import { members, put, pose, type Member, type Pose3 } from './slabs';

/*
 * FLOOR — the slabs lie down as a dance floor floating in the dark: every block of the page scaled to
 * one square tile, his red button in the middle. The tiles light on the beat in patterns that change
 * every bar. And the whole frame changes drawing style as he dances — ink, pixel, comic, watercolour,
 * clay, chalk, 1930s rubber hose — each with its own move from his drawings in that style. Last bar:
 * one style per beat, him standing with his brush.
 */
const grid = (c: Ctx, N: number) => {
  const cols = c.L.phone ? 4 : 5, rows = Math.ceil((N + 1) / cols);
  const S = c.L.phone ? 118 : 190, sp = S * 1.14;
  const centre = Math.floor(rows / 2) * cols + Math.floor(cols / 2);
  return { cols, rows, S, sp, centre, y: c.L.H * 0.5 };
};
const cellPos = (c: Ctx, g: ReturnType<typeof grid>, cell: number) => {
  const col = cell % g.cols, row = Math.floor(cell / g.cols);
  return { col, row, x: c.L.W / 2 + (col - (g.cols - 1) / 2) * g.sp, z: (row - (g.rows - 1) / 2) * g.sp };
};
const cellOf = (i: number, centre: number) => (i >= centre ? i + 1 : i);

/** tile i of N (every member but the button) */
export function floorSlot(c: Ctx, i: number, N: number, m: Member): Pose3 {
  const g = grid(c, N), p = cellPos(c, g, cellOf(i, g.centre));
  const sq = m.id === 'media' ? { s: g.S / Math.max(m.w, m.h) } : { sx: g.S / m.w, sy: g.S / m.h };
  return pose({ x: p.x, y: g.y, z: p.z, rx: -Math.PI / 2, depth: 26, ...sq });
}
/** his tile: the red button, in the middle */
export function floorTarget(c: Ctx): Pose3 {
  const N = members(c).length, g = grid(c, N), p = cellPos(c, g, g.centre), cta = c.L.get('cta');
  return pose({ x: p.x, y: g.y, z: p.z, rx: -Math.PI / 2, depth: 26, sx: g.S / cta.w, sy: g.S / cta.h });
}

// per style: the prefix of his drawings, a move (frames, frames per beat), the room colour
const STYLES: { pre: string; move: string[]; per: number; bg: string }[] = [
  { pre: '', move: ['moonwalk6_0', 'moonwalk6_1', 'moonwalk6_2', 'moonwalk6_3', 'moonwalk6_4', 'moonwalk6_5'], per: 2, bg: '#1b1714' },
  { pre: 'pixel-', move: ['moonwalk6_0', 'moonwalk6_1', 'moonwalk6_2', 'moonwalk6_3', 'moonwalk6_4', 'moonwalk6_5'], per: 2, bg: '#1d2b53' },
  { pre: 'comic-', move: ['saber_1', 'saber_2', 'saber_3', 'saber_4', 'saber_5'], per: 2, bg: '#0b1630' },
  { pre: 'water-', move: ['surf_0', 'surf_1', 'surf_2'], per: 1, bg: '#16323a' },
  { pre: 'clay-', move: ['ride_0', 'ride_1', 'ride_2', 'ride_3'], per: 1, bg: '#2a1f1a' },
  { pre: 'chalk-', move: ['surf_2', 'home_3'], per: 1, bg: '#1f2a24' },
  { pre: 'hose-', move: ['broom_0', 'broom_1', 'broom_2', 'broom_3', 'broom_5'], per: 2, bg: '#2a2016' },
];
export const floorKeys = () => STYLES.flatMap((s) => [...s.move.map((k) => s.pre + k), `${s.pre}home_3`]);
const BG = new THREE.Color();
const rnd = (k: number) => { const s = Math.sin(k * 12.9898) * 43758.5453; return s - Math.floor(s); };

export function floor(c: Ctx) {
  const { b, t, L } = c;
  if (b < T.floor - 1 || b >= T.quiet) return;
  const B = beatsOf(t), n = Math.floor(B), ph = B - n, X = b - T.floor;
  const ms = members(c), N = ms.length, g = grid(c, N), f = floorTarget(c);
  const on = smooth(seg(b, T.floor - 1, T.floor));

  // the tiles light in a pattern that changes every bar
  const pat = Math.floor(n / 4) % 4, cc = cellPos(c, g, g.centre);
  ms.forEach((m, i) => {
    const p = cellPos(c, g, cellOf(i, g.centre));
    const lit = pat === 0 ? (p.col + p.row + n) % 2 === 0
      : pat === 1 ? Math.max(Math.abs(p.col - cc.col), Math.abs(p.row - cc.row)) === (n % 3)
        : pat === 2 ? p.col === n % g.cols
          : rnd(i * 13 + n) > 0.35;
    if (!lit) return;
    const k = hit(ph, 2.5) * on;
    m.look.color = (m.look.color ?? (c.page.byId.get(m.id)?.front ?? PAPER)).clone().lerp(PAPER, k);
    m.look.y -= 10 * hit(ph, 7) * on;
  });
  const cta = members(c, true).find((m) => m.id === 'cta')!;
  cta.look.color = RED; cta.look.flash = 0.35 * hit(ph, 4) * on;
  put(cta, { ...f, y: f.y - 6 * hit(ph, 7), sx: f.sx, sy: f.sy });

  // the style: every three beats of scroll and every bar of clock; the last bar, every beat
  const fast = X >= 20;
  const si = fast ? n % 7 : (Math.floor(X / 3) + Math.floor(B / 4)) % 7;
  const st = STYLES[si];
  c.post.u.uStyle.value = c.calm ? 0 : si;
  c.bg.copy(BG.set(st.bg));
  const key = fast ? `${st.pre}home_3` : st.pre + st.move[frame(B, st.move.length, st.per)];
  const hover = st.pre === 'hose-' || st.pre === 'water-' ? 18 + 8 * Math.sin(B * Math.PI) : 0;
  c.boy.set(key, f.x, f.y - 3 - hover, f.z, L.face * 1.25, { bill: true, sy: 1 - 0.05 * hit(ph, 8), flip: Math.floor(B / 2) % 2 === 1 });

  // the camera circles him low; every style change cuts to another side
  const d0 = flatDist(L.H), alt = si % 3;
  const yaw = 0.35 + 0.12 * X + 0.04 * B + [0, 1.9, -1.4][alt], dist = [1.25, 0.85, 1.6][alt] * d0, pitch = [0.36, 0.16, 0.62][alt];
  if (b >= T.floor) orbit(c, f.x, f.y - L.face * 1.4, f.z, dist, yaw, pitch);
  c.post.u.uChroma.value = Math.max(c.post.u.uChroma.value, 4 * hit(ph, 9));
  c.post.u.uVig.value = Math.max(c.post.u.uVig.value, 0.5);
  if (b >= T.quiet - 1) c.post.u.uStyle.value = 0;
}
