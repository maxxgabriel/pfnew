import type { CSSProperties } from 'react';
import { cover } from '../../content/book';
import { Burst } from '../ink/Burst';
import { ChromaticAberration } from '../ink/ChromaticAberration';
import { Figure } from '../ink/Figure';
import { GlitchText } from '../ink/GlitchText';
import { Spread } from '../ink/Spread';
import { clamp01, smooth, track } from '../../lib/ease';
import styles from './Cover.module.css';

/**
 * SPREAD 00 — THE COVER.
 *
 * A sketchbook lying on a surface. Two shots, both driven by scroll:
 *
 *   1. the cover lifts away, revealing page one
 *   2. the book GROWS until the page is the whole screen, and you are inside it
 *
 * That second shot is what stops the book being an object you look at and makes
 * it the world the rest of the story happens in. Without it there is a hard
 * seam — a small book, then abruptly a full-bleed page — and the reader feels
 * the join.
 *
 * Deliberately not a 3D page-turn: a rotateY on a full-bleed cover fills the
 * viewport with a dark slab mid-rotation and warps its own lettering into mush.
 * Insetting the book so the surface shows around it says "book" far better than
 * perspective did, and the type stays flat and legible throughout.
 */
export function Cover() {
  return (
    <Spread id="cover" label="Cover" length={2.6} pin tone="shade">
      {({ t }) => {
        /* SHOT 1 — the cover lifts and tips away. */
        const lift = track(t, 0, 0.36);

        /*
         * SHOT 2 — the push in. Eased rather than linear so it accelerates as
         * it goes, which is what makes it read as falling into the page instead
         * of a box being resized.
         */
        const zoom = smooth(track(t, 0.46, 1));

        /*
         * Scaling past the point of coverage is intentional: the surface fades
         * to the same tone as the page underneath, so the frame stays seamless
         * however wide the viewport is, and the extra travel reads as entering.
         */
        const scale = 1 + zoom * 5.5;

        return (
          <div
            className={styles.frame}
            /* book-scale detail stops making sense once the page fills the frame */
            style={{ '--detail': 1 - zoom } as CSSProperties}
          >
            <ChromaticAberration intensity={2} />

            {/* the surface the book is lying on, fading as we enter the page */}
            <div className={styles.surface} style={{ opacity: 1 - zoom }} />

            <div
              className={styles.book}
              style={{
                transform: `scale(${scale.toFixed(3)})`,
                filter: `drop-shadow(0 18px 28px rgb(26 26 24 / ${(0.22 * (1 - zoom)).toFixed(3)}))`,
              }}
            >
              {/* page one, revealed by the lift and then flown into */}
              <div className={styles.beneath}>
                <span
                  className={`mark ${styles.waiting}`}
                  style={{ opacity: (1 - zoom) * lift }}
                >
                  page one
                </span>
              </div>

              {/* the stack of sheets, along the outer edges */}
              <span className={styles.pages} aria-hidden="true" />

              <div
                className={styles.board}
                style={{
                  transform: `translateY(${lift * -108}%) rotate(${lift * -4}deg)`,
                }}
              >
                <span className={styles.spine} aria-hidden="true" />

                {/*
                  * The logo burst — the red starburst the masthead sits in.
                  * Parallax: moves 85% as fast as the board during the lift,
                  * creating depth between the background and the masthead.
                  */}
                <span
                  className={styles.logoBurst}
                  aria-hidden="true"
                  style={{
                    transform: `translateY(${lift * 15}%)`,
                  }}
                />

                {/*
                  * THE MASTHEAD — SKETCH over BOOK, stacked like a comic logo and
                  * sized to the board so it fits without ever clipping. Both
                  * colour plates are off-register: blue and yellow sit slightly
                  * free of the white ink, with a black kick under the lot.
                  */}
                <div className={`drift ${styles.mast}`}>
                  <GlitchText intensity={0.6}>
                    <span className={styles.line}>sketch</span>
                  </GlitchText>
                  <GlitchText intensity={0.6}>
                    <span className={`${styles.line} ${styles.lineSecond}`}>book</span>
                  </GlitchText>
                </div>

                {/*
                  * HIM, the hero of the book, printed big in the middle of the
                  * burst — a blue plate the way the paper pages carry a dark one.
                  * The misprint shadow is the same dropped-plate idea as the
                  * masthead, so he is physically a part of the cover print.
                  */}
                <Figure
                  pose="standing"
                  size={COVER_FIGURE}
                  color="var(--ink)"
                  className={styles.hero}
                  style={
                    {
                      /* sized to the board, so he scales with it on any screen */
                      width: 'clamp(7rem, 44cqw, 14.5rem)',
                      '--figure-w': `${COVER_FIGURE}px`,
                      /* parallax: moves 90% as fast as the board during lift */
                      transform: `translateY(${lift * 10}%)`,
                    } as CSSProperties
                  }
                />

                {/*
                  * The impact words — the cover is coming alive before the cover
                  * is even open. One blue, one red, thrown into the spaces the
                  * figure leaves free.
                  */}
                <Burst
                  word="wham"
                  plain
                  className={styles.wham}
                  style={
                    {
                      width: 'clamp(3.5rem, 24cqw, 7rem)',
                      '--burst-fill': 'var(--marine)',
                      '--burst-ink': 'var(--paper)',
                      '--burst-fs': 'clamp(1rem, 4.4cqw, 1.8rem)',
                    } as CSSProperties
                  }
                />
                <Burst
                  word="pow"
                  plain
                  className={styles.pow}
                  style={
                    {
                      width: 'clamp(2.5rem, 16cqw, 4.4rem)',
                      '--burst-fill': 'var(--punch)',
                      '--burst-ink': 'var(--paper)',
                      '--burst-fs': 'clamp(0.8rem, 3cqw, 1.4rem)',
                    } as CSSProperties
                  }
                />

                <span className={`mark drift ${styles.owner}`}>{cover.owner}</span>
                <span className={`mark drift ${styles.note}`}>{cover.note}</span>
              </div>
            </div>

            <p
              className={`mark ${styles.hint}`}
              style={{ opacity: clamp01(1 - t * 6) }}
            >
              {cover.hint}
            </p>
          </div>
        );
      }}
    </Spread>
  );
}

/** His drawn width in px on the cover — big enough to be the hero of it. */
const COVER_FIGURE = 230;
