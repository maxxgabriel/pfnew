import type { CSSProperties } from 'react';
import { theEscape } from '../../content/book';
import { Figure } from '../ink/Figure';
import { Headline } from '../ink/Headline';
import { Spread } from '../ink/Spread';
import { Weather } from '../ink/Weather';
import { clamp01, easeIn, easeOut, mix, smooth, track } from '../../lib/ease';
import styles from './TheEscape.module.css';

/**
 * SPREAD 07 — THE ESCAPE. The camera pulls out of the book.
 *
 * This is the mirror of the cover, and that symmetry is the point: spread 00 opens a
 * sketchbook lying on a table and flies INTO the page until it fills the screen, so
 * spread 07 flies back OUT until the sketchbook is a small closed object again. The
 * book was the container for seven spreads; getting out of it is the only escalation
 * left, and it has to be a camera move rather than a cut or it reads as a scene
 * change instead of an exit.
 *
 * FOUR SHOTS, in one pinned page.
 *
 *   1  TEAR      he takes the page's edge and rips it open
 *   2  THROUGH   he climbs out toward the reader, growing past the frame
 *   3  CLOSE     the camera retreats: the torn sheet becomes a closed book,
 *                shrinking into a void, and he is standing beside it — outside it
 *   4  AWAY      the book slides off, leaving him alone in the void as the rain
 *                starts
 *
 * Shot 3 is the one that was missing, and its absence was the whole problem. He used
 * to grow and simply leave the top of the frame — so he never appeared to be OUTSIDE
 * anything, he just exited stage up while the next section began somewhere else. The
 * exit only reads if the thing he left is still visible, smaller than him, and
 * behind him.
 *
 * WHY THE SCALE INVERTS. Up to shot 2 he grows because he is approaching the reader.
 * From shot 3 he holds still and the BOOK shrinks — same relative change, completely
 * different meaning. A figure growing reads as coming closer; a world shrinking reads
 * as being left.
 */
export function TheEscape() {
  return (
    <Spread id="the-escape" label="The escape" folio={7} length={6.5} pin tone="storm">
      {({ t }) => {
        /* ---------- beats ---------- */
        const pull = track(t, 0.14, 0.26); // strain — the paper resists
        const rip = track(t, 0.24, 0.42); // it goes
        const through = track(t, 0.38, 0.56); // he climbs out, toward the reader
        const close = track(t, 0.54, 0.78); // the camera retreats; the book shuts
        const away = track(t, 0.76, 1); // the book slides off into the void

        /*
         * The gap the tear opens. `easeIn` because paper does not tear evenly — it
         * resists, then gives all at once. A linear tear looks like a shutter opening.
         */
        const open = easeIn(rip);

        /*
         * THE CAMERA. One number for the whole retreat, and everything in the scene
         * is a function of it, which is what keeps the move coherent: the sheet, the
         * cover closing over it and the void behind all read as one pull-back rather
         * than as three elements animating at once.
         */
        const back = smooth(close);

        /*
         * HIM. Grows to full size coming through, then holds — see the header. Once
         * the camera starts retreating he must NOT keep scaling, or he grows while
         * the world shrinks and the shot reads as a zoom rather than as a departure.
         */
        const forward = smooth(through);
        const scale = mix(1, 2.6, forward);

        /*
         * He braces while pulling and stands once he is out. The pose swap is hidden
         * inside the frame where the paper gives, which is the busiest moment on the
         * page and the only place a change of drawing is invisible.
         */
        const pose = through > 0.5 ? 'standing' : 'tearing';

        return (
          <div className={styles.frame}>
            {/*
              * THE VOID. Not "behind the page" any more — it is the space the book
              * turns out to be sitting in, and it is where he ends up. Revealed by the
              * tear, then it becomes the whole scene as the camera pulls back.
              */}
            <div
              className={styles.void}
              style={{ opacity: clamp01(mix(rip * 0.55, 1, back)) }}
            />

            {/*
              * THE WEATHER, arriving in the void as the book leaves. It starts under
              * the closing book rather than after it, so the storm is something he is
              * already standing in by the time the book is gone — a storm that began
              * only once the page cleared would read as the next slide.
              */}
            {close > 0.2 && (
              <div className={styles.storm} style={{ opacity: clamp01(track(t, 0.62, 0.9)) }}>
                <Weather t={mix(0.4, 1, away)} at={0} drops={70} />
              </div>
            )}

            {/*
              * THE SKETCHBOOK. From here on this whole element is the object the
              * camera is retreating from: it holds the torn sheet, and the cover that
              * closes over it.
              *
              * Scaled and slid as one group, so the sheet and its cover can never
              * drift apart. The slide-away is a translate on the same element for the
              * same reason.
              */}
            <div
              className={styles.book}
              style={
                {
                  /* 1 while we are inside it, shrinking to a small object as we leave */
                  '--shut': back.toFixed(3),
                  opacity: clamp01(1 - away * 1.6),
                  transform: [
                    `translateX(${mix(0, -128, easeIn(away)).toFixed(2)}%)`,
                    `rotate(${mix(0, -14, easeIn(away)).toFixed(2)}deg)`,
                    `scale(${mix(1, 0.3, back).toFixed(3)})`,
                  ].join(' '),
                } as CSSProperties
              }
            >
              {/*
                * THE TORN SHEET. Two halves clipped along the SAME ragged seam from
                * opposite sides, so the edges are complementary and read as one tear
                * rather than two things that happen to be near each other.
                */}
              <div
                className={styles.sheet}
                style={
                  {
                    '--open': open,
                    /* the whole sheet shudders as it gives */
                    transform: `translateX(${(Math.sin(rip * 40) * (1 - rip) * pull * 3).toFixed(2)}px)`,
                  } as CSSProperties
                }
              >
                <div className={styles.left} />
                <div className={styles.right} />
              </div>

              {/*
                * THE COVER, closing over the torn page as the camera pulls out. This
                * is the exact inverse of the cover spread, where the board lifts away
                * to reveal page one — here it swings back down and shuts.
                *
                * It rotates about its TOP edge, like a real board on a spine, which is
                * also what hides the seam: the closing edge sweeps down over the tear
                * rather than sliding across it.
                */}
              <div className={styles.board} style={{ '--shut': back.toFixed(3) } as CSSProperties}>
                <span className={styles.spine} aria-hidden="true" />
                <span className={`hand ${styles.title}`}>Sketchbook</span>
              </div>
            </div>

            {/*
              * HIM. Inside the gap, then out of it and standing in the void.
              *
              * Positioned against the FRAME rather than inside `.book`, which is the
              * mechanical heart of the shot: he cannot be a child of the thing he is
              * escaping, or he would shrink and slide away with it.
              */}
            <div
              className={styles.him}
              style={{
                /*
                 * He steps sideways out of the book's footprint as it closes — see
                 * `.him` in the stylesheet. Without this he stands in front of the
                 * shrinking book rather than beside it, and the shot reads as a figure
                 * pasted over a picture of a sketchbook.
                 */
                '--aside': back.toFixed(3),
                transform: [
                  `translate(-50%, ${mix(0, 9, forward).toFixed(2)}%)`,
                  `scale(${scale.toFixed(3)})`,
                ].join(' '),
              } as CSSProperties}
            >
              <Figure
                pose={pose}
                size={FIGURE}
                className={styles.figure}
                style={
                  {
                    '--figure-w': `${FIGURE}px`,
                    /*
                     * INK while he is on paper, PALE once he is in the void. The storm
                     * tone inverts `--ink`, so this is one variable doing the work of
                     * two drawings — and the crossover is timed to the cover shutting,
                     * so he changes colour at the moment the paper stops being behind
                     * him rather than at some arbitrary point.
                     */
                    color: back > 0.5 ? 'var(--ink)' : '#1a1a18',
                    /* he leans into the pull, then straightens as he steps out */
                    transform: `rotate(${mix(0, -3, pull).toFixed(2)}deg) rotate(${mix(0, 3, forward).toFixed(2)}deg)`,
                  } as CSSProperties
                }
              />
            </div>

            {/*
              * The headline, on the paper — so it goes with the paper. It fades as he
              * comes through, because the page carrying it is being destroyed.
              */}
            <Headline
              t={t}
              at={0}
              span={0.14}
              size="sub"
              className={styles.note}
              style={{ opacity: clamp01(t * 12) * (1 - clamp01(through * 1.4)) }}
            >
              {theEscape.note}
            </Headline>

            {/*
              * The aside arrives LAST, once he is alone in the void — "Nothing out here
              * is ruled" only means anything after the ruled thing has gone.
              */}
            <p
              className={`hand ${styles.aside}`}
              style={{
                opacity: clamp01(track(t, 0.82, 0.94) * 2),
                transform: `translateY(${mix(14, 0, easeOut(away)).toFixed(2)}px)`,
              }}
            >
              {theEscape.aside}
            </p>
          </div>
        );
      }}
    </Spread>
  );
}

/** His drawn width in px. The stylesheet needs it to stand him on the floor. */
const FIGURE = 200;
