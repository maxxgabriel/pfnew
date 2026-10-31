import type { Ctx } from '../director';
import type { Look } from '../page';

/*
 * The page's parts as free bodies: every top-level block (nav excepted, it is the ribbon now) plus the
 * media box, with helpers to put them at absolute poses in page space (px, y down, z toward you) and
 * to blend between choreographies. The red call-to-action is kept apart: it is his board.
 */
export type Pose3 = { x: number; y: number; z: number; rx: number; ry: number; rz: number; depth: number; sx: number; sy: number; s: number; alpha: number };
export type Member = { id: string; cx: number; cy: number; w: number; h: number; look: Look };
export const pose = (o: Partial<Pose3> = {}): Pose3 => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, depth: 0, sx: 1, sy: 1, s: 1, alpha: 1, ...o });

export function members(c: Ctx, withCta = false): Member[] {
  const m = c.page.media, mb = m.b;
  const out: Member[] = [{ id: 'media', cx: mb.x + mb.w / 2, cy: mb.y + mb.h / 2, w: mb.w, h: mb.h, look: m.look }];
  for (const p of c.page.pieces) {
    if (p.b.parent || p.b.kind === 'sheet' || p.b.id === 'nav' || (!withCta && p.b.id === 'cta')) continue;
    out.push({ id: p.b.id, cx: p.cx, cy: p.cy, w: p.b.w, h: p.b.h, look: p.look });
  }
  return out;
}

/** the member's pose at rest (where the page put it), as an absolute pose */
export const rest = (m: Member) => pose({ x: m.cx, y: m.cy, z: 0 });

export function mix(a: Pose3, b: Pose3, k: number): Pose3 {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const o = pose();
  for (const key of Object.keys(o) as (keyof Pose3)[]) o[key] = a[key] + (b[key] - a[key]) * k;
  return o;
}

/** write an absolute pose into the member's look (offsets from rest) */
export function put(m: Member, p: Pose3) {
  const L = m.look;
  L.x = p.x - m.cx; L.y = p.y - m.cy; L.z = p.z;
  L.rx = p.rx; L.ry = p.ry; L.rz = p.rz;
  L.depth = p.depth; L.sx = p.sx; L.sy = p.sy; L.s = p.s; L.alpha = p.alpha;
}
