import type { Frame } from '../core/frame';
import { type Pt, clamp, ease, lerp, seg } from '../core/math';
import { RED } from './common';
import { deskOn } from '../desk/layout';

/*
 * RED-CIRCLE MATCH CUTS (round 24).
 *
 * The film's one red circle carries the cuts between chapters: on a seam,
 * the Spark swells until it is the whole screen, and on the far side it
 * shrinks onto the next chapter's red circle (the Spark again, the bulb,
 * the sun). Each cut is [film beat of the seam, where it starts, how big,
 * where it lands, how big], positions as fractions of the screen and sizes
 * as fractions of its shorter side. Chapters underneath change while the
 * screen is covered, so every seam is clean.
 */

interface Cut { at: number; p0: Pt; r0: number; p1: Pt; r1: number; d: number; desk?: false }
const CUTS: Cut[] = [];
/** register the cuts once the chapter table is known (src/reel/reel.ts) */
export function setCuts(seam: (name: string) => number) {
  CUTS.length = 0;
  // III → IV: he leaps after the Spark; it fills the night and is the Spark over the ink sea
  CUTS.push({ at: seam('Wave'), p0: [0.6, 0.3], r0: 0.025, p1: [0.6, 0.31], r1: 0.025, d: 0.35, desk: false }); // (a page turn on the desk: src/desk/story.ts)
  // V → VI: the Spark in the deep becomes the bulb inside the whale
  CUTS.push({ at: seam('Light'), p0: [0.5, 0.535], r0: 0.02, p1: [0.5, 0.3], r1: 0.03, d: 0.3 });
  // VI → VII: the Spark swells and settles as the sun he bursts out over
  CUTS.push({ at: seam('Chase'), p0: [0.55, 0.28], r0: 0.025, p1: [0.47, 0.76], r1: 0.47, d: 0.35 });
}

export function drawCircleCuts(f: Frame) {
  const { ctx, w, h, B } = f;
  const S = Math.min(w, h);
  const full = Math.hypot(w, h) * 0.75;
  const onDesk = deskOn(w, h);
  for (const c of CUTS) {
    if (onDesk && c.desk === false) continue;
    if (B < c.at - c.d || B > c.at + c.d) continue;
    let x: number, y: number, r: number, a = 1;
    if (B < c.at) {
      const u = ease.in3(seg(B, c.at - c.d, c.at));
      x = lerp(c.p0[0] * w, w / 2, u * u);
      y = lerp(c.p0[1] * h, h / 2, u * u);
      r = lerp(c.r0 * S, full * 1.4, u);
    } else {
      const u = ease.out3(seg(B, c.at, c.at + c.d));
      x = lerp(w / 2, c.p1[0] * w, u);
      y = lerp(h / 2, c.p1[1] * h, u);
      r = lerp(full * 1.4, c.r1 * S, u);
      a = 1 - seg(u, 0.8, 1);
    }
    if (a <= 0) continue;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // while it's small it is still the Spark: its highlight
    const hk = clamp(1 - r / (S * 0.3));
    if (hk > 0) {
      ctx.globalAlpha = a * hk * 0.85;
      ctx.fillStyle = '#fff0dc';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.32, y - r * 0.36, r * 0.24, r * 0.16, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
