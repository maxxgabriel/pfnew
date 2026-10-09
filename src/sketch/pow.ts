import type { Frame } from '../core/frame';
import { clamp, ease } from '../core/math';
import { drawArt } from './art';
import { deskOf } from '../desk/layout';
import { CHAPTERS } from '../reel/reel';

/*
 * POW! (round 28): pop-art comic onomatopoeia on every big impact.
 *
 * Each impact is a painted comic burst (scripts/gen-desk.sh pow_1/pow_2 →
 * pow1_*, pow2_*) that slams in with an overshoot, shudders, holds and
 * shrinks away. Its life is in film beats, so scrolling back rewinds it; but
 * if the reader races past, it still gets its moment on the wall clock.
 * On a wide screen it is bigger and pushed out over the desk at the edge of
 * the picture.
 */

const ART: Record<string, string> = {
  'POW!': 'pow1_0', 'BAM!': 'pow1_1', 'WHAM!': 'pow1_2', 'KRAK!': 'pow1_3', 'ZAP!': 'pow1_4', 'BOOM!': 'pow1_5',
  'SPLASH!': 'pow2_0', 'GULP!': 'pow2_1', 'SWOOSH!': 'pow2_2', VMMM: 'pow2_3', 'CHOMP!': 'pow2_4', 'SNAP!': 'pow2_5',
};

/** [chapter, local beat, word, x, y (fractions of the screen), tilt] */
const HITS: [string, number, string, number, number, number][] = [
  ['Run', 3.35, 'WHAM!', 0.27, 0.36, -0.16], // the Eraser slams down behind him
  ['Run', 5.55, 'SWOOSH!', 0.72, 0.34, 0.1], // its lunge
  ['Run', 8.55, 'GULP!', 0.7, 0.36, 0.12], // the look over the edge
  ['Fold', 2.45, 'BAM!', 0.28, 0.3, -0.12], // onto the sheet
  ['Fold', 4.25, 'SNAP!', 0.72, 0.28, 0.14], // the bird base snaps
  ['Wave', 0.8, 'SPLASH!', 0.3, 0.56, -0.1], // down onto the sea
  ['Deep', 3.15, 'CHOMP!', 0.7, 0.3, 0.12], // the whale swallows him
  ['Light', 1.2, 'BAM!', 0.28, 0.32, -0.14], // down into the belly
  ['Light', 4.1, 'VMMM', 0.72, 0.28, 0.08], // the blue blade comes up
  ['Light', 4.9, 'KRAK!', 0.28, 0.3, -0.12], // first clash
  ['Light', 5.48, 'ZAP!', 0.72, 0.32, 0.14], // third clash (after the bullet time)
  ['Light', 7.1, 'WHAM!', 0.3, 0.3, -0.1], // the cut
  ['Chase', 4.05, 'SWOOSH!', 0.28, 0.3, -0.12], // the pull out of the dive
  ['Chase', 5.5, 'POW!', 0.72, 0.34, 0.12], // the catch
  ['Home', 0.75, 'BAM!', 0.28, 0.42, -0.12], // he lands home
  ['Home', 1.45, 'WHAM!', 0.72, 0.34, 0.14], // the Eraser slams back
  ['Home', 5.35, 'BOOM!', 0.66, 0.3, 0.1], // the fire kick hits
];

/** film beats of the impacts */
export const POW_AT = HITS.map(([c, l]) => CHAPTERS.find((ch) => ch.name === c)!.from + l);
export const POW_WORDS = HITS.map((x) => x[2]);
const at = POW_AT;
const fired: number[] = HITS.map(() => -1);

/** how long a word lives, in beats; and at least this long on the clock once passed going forward */
const LIFE = 0.55, SECS = 0.7;

export function drawPows(f: Frame) {
  const { ctx, w, h, B, t } = f;
  const desk = deskOf(w, h);
  HITS.forEach(([, , word, fx, fy, tilt], i) => {
    const b = at[i];
    if (f.crossedFwd(b)) fired[i] = t;
    const kb = (B - b) / LIFE;
    if (kb < 0 || kb > 4) { if (kb < 0) fired[i] = -1; return; }
    // a hold (bullet time, the wall) freezes the film: no word hangs in it
    if (f.hold) return;
    const kt = fired[i] >= 0 ? (t - fired[i]) / SECS : Infinity;
    const k = Math.min(kb, kt);
    if (k >= 1) return;
    const key = ART[word];
    let x = fx * w, y = fy * h, size = Math.min(w * 0.46, h * 0.24);
    if (desk) {
      // bigger, and out over the desk at the edge of the picture
      size = Math.min(desk.mw * 0.86, h * 0.38);
      x = fx < 0.5 ? desk.colL - size * 0.08 : desk.colR + size * 0.08;
      x = clamp(x, size * 0.55, w - size * 0.55);
    }
    // slam in past full size, shudder, hold, shrink away
    const pop = k < 0.16 ? ease.outBack(k / 0.16) : 1;
    const out = k > 0.7 ? (k - 0.7) / 0.3 : 0;
    const s = pop * (1 - out * out * 0.55);
    const shud = k < 0.3 ? (1 - k / 0.3) * size * 0.025 : 0;
    ctx.save();
    ctx.globalAlpha = 1 - out * out;
    drawArt(ctx, key, x + Math.sin(t * 97) * shud, y + Math.cos(t * 83) * shud, size * s, { rot: tilt * (1 + (1 - pop) * 0.6) });
    ctx.restore();
  });
}
