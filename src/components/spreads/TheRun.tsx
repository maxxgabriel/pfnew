import type { CSSProperties } from 'react';
import { theRun } from '../../content/book';
import { Figure } from '../ink/Figure';
import { Headline } from '../ink/Headline';
import { Spread } from '../ink/Spread';
import { Written } from '../ink/Written';
import { mix, smooth, track } from '../../lib/ease';
import styles from './TheRun.module.css';

/**
 * SPREAD 05 — THE RUN.
 *
 * A side-scrolling tracking shot. He runs on the spot in the centre of frame
 * and the world moves past him, which is how every side-scroller has ever
 * worked and the only way to get unbounded travel out of a fixed viewport.
 *
 * Three layers at three rates. That parallax is the entire reason this reads as
 * distance covered rather than as a texture sliding: the ground rushes, the
 * scenery keeps pace, the far marks barely move. Take the rate difference away
 * and he is running on a conveyor belt.
 *
 * He accelerates. The gait cycle is driven off a *quadratic* of the playhead so
 * his legs speed up as the page goes on, and the milestones pass at intervals
 * that compress — he is not practising, he is running OUT of page, so each post
 * should arrive sooner than the last rather than at one rate.
 */
export function TheRun() {
  return (
    <Spread id="the-run" label="The run" folio={5} length={4.2} pin>
      {({ t }) => {
        const start = track(t, 0, 0.12); // he gets going
        const card = track(t, 0.68, 0.94);

        /*
         * Distance covered, in viewport widths. Quadratic, so the world moves
         * faster the longer he keeps at it — the acceleration is the argument
         * the page is making.
         */
        const distance = t * t * 4 + t * 1.2;

        // Gait follows distance, so his legs and the ground can never desync.
        const cycle = distance * 5.5;

        /*
         * Layer offsets, in VIEWPORT WIDTHS — the same unit `distance` is in, so
         * a milestone placed at 60vw is passed when he has covered 60vw of it.
         *
         * Deliberately not percentages: a percentage translate resolves against
         * the element's OWN width, so on a 900%-wide track every number means
         * nine times what it appears to, and placing a landmark becomes
         * guesswork. vw is absolute and the maths stays legible.
         *
         * The three rates are the parallax. Without the difference between them
         * this is a texture sliding, not distance being covered.
         */
        const ground = -((distance * 2600) % 40); // px, one dash pitch
        const near = -distance * 62; // vw
        const far = -distance * 22; // vw

        return (
          <div className={styles.frame}>
            <Headline t={t} at={0} span={0.18} className={styles.note}>
              {theRun.note}
            </Headline>

            {/* FAR — hills, barely moving. Establishes that there is a distance. */}
            <div className={styles.far} style={{ transform: `translateX(${far.toFixed(2)}vw)` }}>
              {/*
                * Stretched rather than scaled: `preserveAspectRatio="none"` on a
                * very wide, very short box keeps the ridge low on the page. A
                * uniformly scaled 900%-wide SVG would be 900% tall too.
                */}
              <svg
                viewBox="0 0 400 60"
                preserveAspectRatio="none"
                fill="none"
                stroke="var(--paper-deep)"
                strokeWidth="4"
                vectorEffect="non-scaling-stroke"
                aria-hidden="true"
              >
                <path d="M0 52 q30 -30 60 -4 t50 -14 t70 12 t60 -22 t80 18 t80 -8" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>

            {/*
              * NEAR — the countdown. Each post carries one word, starting at
              * four and counting DOWN toward the edge; the last passes and then
              * he is off.
              */}
            <div className={styles.near} style={{ transform: `translateX(${near.toFixed(2)}vw)` }}>
              {theRun.milestones.map((word, i) => (
                <span
                  key={i}
                  className={`hand ${styles.milestone}`}
                  /*
                   * Placed along the whole 322vw the near layer travels, with
                   * gaps that shrink as they go (78 → 47vw), so each signpost
                   * arrives sooner than the last. The compression is the
                   * argument the page is making: he is running OUT of page, and
                   * less page is left every time one of these goes by.
                   *
                   * The spacing is checked against the layer's actual travel —
                   * spread too tightly and the last fifth of the page is empty
                   * paper with nothing to measure his speed against.
                   */
                  style={{ left: `${60 + i * 78 - i * i * 4}vw` }}
                >
                  {word}
                </span>
              ))}
            </div>

            {/* HIM — fixed in frame. The world does the travelling. */}
            <div className={styles.runner}>
              <Figure
                pose="running"
                cycle={cycle}
                size={FIGURE}
                className={styles.figure}
                style={
                  {
                    '--figure-w': `${FIGURE}px`,
                    /* he leans into it as he gets up to speed */
                    transform: `rotate(${mix(0, 4, smooth(start)).toFixed(2)}deg)`,
                  } as CSSProperties
                }
              />
            </div>

            {/*
              * GROUND — fastest, so it rushes under him. Drawn as dashes rather
              * than a solid rule: a continuous line moving sideways is invisible,
              * whereas dashes give the eye something to measure the speed by.
              */}
            <div
              className={styles.ground}
              style={{ transform: `translateX(${ground.toFixed(2)}px)` }}
            />

            <p className={`hand drift ${styles.card}`}>
              <Written t={card}>{theRun.card}</Written>
            </p>
          </div>
        );
      }}
    </Spread>
  );
}

/** His drawn width in px. The stylesheet needs it to stand him on the floor. */
const FIGURE = 230;
