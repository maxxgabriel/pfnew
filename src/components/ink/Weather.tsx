import { useMemo, type CSSProperties } from 'react';
import { clamp01, mix, pulse, track } from '../../lib/ease';
import { useReducedMotion } from '../../lib/useReducedMotion';
import styles from './Weather.module.css';

/**
 * THE STORM — the only thing in the book that is not drawn on paper.
 *
 * Spread 08 is the payoff for the whole rewrite. The last card is STORMS / FLOODS
 * / OR GODS, which is about enduring forces vastly larger than yourself, and that
 * cannot land on cream paper with a pencil line for a horizon — it reads as a
 * quote pinned to a noticeboard. So he tears out of the sketchbook into weather,
 * and the weather is real: rain falling, a horizon, and lightning that fires on
 * the words themselves.
 *
 * DRAWN, NOT SIMULATED. Every drop is a line on one fixed diagonal at one of
 * three depths, seeded off its index. No physics, no canvas, no particle system —
 * a storm that is a hundred CSS-animated lines composites entirely on the GPU and
 * costs nothing, whereas a canvas loop repaints a full-screen bitmap every frame
 * for a page whose whole job is to hold still and be read.
 *
 * The rain is on its OWN CLOCK rather than the playhead. Everything else in the
 * book scrubs with scroll, deliberately — but weather does not stop when you stop
 * reading. It is the one element here that exists whether or not the reader is
 * moving, which is most of what makes the page feel like somewhere rather than
 * something.
 *
 * The LIGHTNING is on the playhead, because it is punctuation: it fires as each of
 * the three words lands, so the flashes are the book's own beats rather than a
 * loop running underneath them.
 */

type Props = {
  /** The spread's playhead. Drives the lightning, not the rain. */
  t: number;
  /** When the storm arrives — it builds rather than switching on. */
  at?: number;
  /** How many drops. Three depths are dealt from this. */
  drops?: number;
};

export function Weather({ t, at = 0.1, drops = 90 }: Props) {
  const reduced = useReducedMotion();
  const arrived = track(t, at, at + 0.28);

  /*
   * Three flashes, timed to the three words of the last card (see `TheEnd`, whose
   * `words` beat runs 0.3–0.62). `pulse` gives each a there-and-back so it strikes
   * and decays rather than fading up, which is the entire difference between
   * lightning and a light being turned on.
   */
  const strike = reduced
    ? 0
    : Math.max(
        pulse(track(t, 0.33, 0.4)) * 0.85,
        pulse(track(t, 0.45, 0.51)),
        pulse(track(t, 0.56, 0.63)) * 0.7,
      );

  const rain = useMemo(() => make(drops), [drops]);

  return (
    <div
      className={styles.sky}
      aria-hidden="true"
      style={{ '--arrived': arrived.toFixed(3) } as CSSProperties}
    >
      {/*
       * The flash is a full-bleed wash rather than a bolt. A drawn fork of lightning
       * is a picture of lightning; a sheet of light across everything is what being
       * inside a storm actually looks like, and it lets the flash illuminate the
       * figure and the type instead of sitting behind them.
       */}
      <div className={styles.flash} style={{ opacity: (strike * 0.5).toFixed(3) }} />

      {!reduced && (
        <div className={styles.rain}>
          {rain.map((d, i) => (
            <span
              key={i}
              className={styles.drop}
              style={
                {
                  left: `${d.x}%`,
                  '--fall': `${d.fall}s`,
                  '--delay': `${-d.delay}s`,
                  '--len': `${d.len}px`,
                  '--dim': d.dim,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/*
       * The horizon. Solid, level, and lit — everything he stood on for seven
       * spreads was a pencil line ruled on paper, so this being a different KIND of
       * line is the quiet half of the ending.
       */}
      <div className={styles.horizon} style={{ opacity: mix(0, 1, clamp01(arrived * 1.4)) }} />
    </div>
  );
}

/* -------------------------------------------------------------------- the rain */

type Drop = { x: number; fall: number; delay: number; len: number; dim: number };

/**
 * A field of drops at three depths.
 *
 * Deterministic, seeded off the index rather than `Math.random()` — the same rule
 * the rest of the book follows. A rain field that reshuffled on every re-render
 * would visibly jump on resize, and one whose composition cannot be reproduced
 * cannot be art-directed.
 *
 * The depth bands are what make it read as volume rather than as a flat texture:
 * near drops are long, fast and bright; far ones are short, slow and dim. Without
 * that spread it is a screen of identical diagonal lines, which reads as a filter
 * laid over the page.
 */
function make(count: number): Drop[] {
  const out: Drop[] = [];

  for (let i = 0; i < count; i++) {
    /*
     * A cheap hash of the index, not a PRNG. The values only need to be
     * uncorrelated between the four fields — using `i` directly for all of them
     * would land every long drop at the same x as every fast one, and the field
     * would read as banded.
     */
    const h = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;

    const depth = i % 3;
    out.push({
      x: h(1) * 104 - 2,
      /* near drops fall in about half the time far ones take */
      fall: [0.55, 0.85, 1.3][depth] + h(2) * 0.3,
      /* spread across the cycle so the field is already full at t=0 */
      delay: h(3) * 2.2,
      len: [78, 52, 34][depth] + h(4) * 22,
      dim: [0.42, 0.26, 0.15][depth],
    });
  }

  return out;
}
