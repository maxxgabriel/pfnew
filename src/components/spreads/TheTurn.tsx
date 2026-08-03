import type { CSSProperties } from 'react';
import { theTurn } from '../../content/book';
import { Figure } from '../ink/Figure';
import { Headline } from '../ink/Headline';
import { Spread } from '../ink/Spread';
import { Written } from '../ink/Written';
import { clamp01, easeOut, mix, smooth, track } from '../../lib/ease';
import styles from './TheTurn.module.css';

/**
 * SPREAD 04 — STILL WOKE UP.
 *
 * The turn of the whole book. He is a heap; then he is redrawn — the same six
 * strokes, in the same order as spread 02, but this time steadier. Then he
 * takes the pen, and from here on he is drawing himself.
 *
 * The redraw deliberately reuses the *becoming* progression rather than
 * inventing a recovery animation. Getting back up is not a new thing he learns;
 * it is the same six strokes again, which is what the card actually says. If
 * this page invented new choreography it would be saying something the words
 * are not.
 *
 * The un-drawing at the start matters too: the heap has to erase before he can
 * be redrawn, or the two drawings overlap and it reads as duplication instead
 * of recovery.
 */
/** His drawn width in px. The stylesheet needs it to stand him on the floor. */
const FIGURE = 250;

/*
 * Where each of the six strokes starts and ends, in the figure's own 100 × 160
 * coordinates, in the order `Figure` reveals them: spine, head, armL, armR,
 * legL, legR. Taken from the `standing` pose in Figure.tsx, because that is the
 * pose being redrawn here.
 *
 * This is duplicated data, and the duplication is deliberate: the alternative is
 * for `Figure` to expose a nib position, which would put a concern belonging to
 * exactly one spread into the component every spread uses. If the standing pose
 * ever changes, the pen drifts off the line — which is visible immediately, and
 * is why this sits next to a comment saying so rather than being hidden.
 */
const STROKE_PATH: Array<[number, number, number, number]> = [
  [50, 52, 50, 95], // spine, downward
  [50, 24, 50, 52], // head, ending back at the neck
  [50, 62, 32, 86], // armL
  [50, 62, 68, 86], // armR
  [50, 95, 38, 148], // legL
  [50, 95, 62, 148], // legR
];

/** His raised hand in the `holding` pose — where the pen ends up. */
const HAND: [number, number] = [78, 44];

/**
 * The nib, in figure coordinates.
 *
 * While he is being redrawn it rides the stroke currently in progress, so the
 * pen is always at the exact point where ink is appearing. Once he reaches for
 * it, it crosses to his hand.
 */
function penNib(drawn: number, taken: number): [number, number] {
  // The stroke in progress, and how far through it we are.
  const i = Math.min(Math.floor(drawn), STROKE_PATH.length - 1);
  const f = clamp01(drawn - i);
  const [x1, y1, x2, y2] = STROKE_PATH[i];
  const onStroke: [number, number] = [mix(x1, x2, f), mix(y1, y2, f)];

  return [mix(onStroke[0], HAND[0], taken), mix(onStroke[1], HAND[1], taken)];
}

export function TheTurn() {
  return (
    <Spread id="the-turn" label="Still woke up" folio={4} length={3.6} pin tone="shade">
      {({ t }) => {
        /* ---------- beats ---------- */
        const erase = track(t, 0.04, 0.24); // the heap is rubbed out
        const redraw = track(t, 0.22, 0.62); // six strokes, again
        const stand = track(t, 0.6, 0.72); // upright
        const card = track(t, 0.66, 0.96); // the words

        /*
         * THE HANDOVER — he reaches, and takes the pen. It begins the instant the
         * last stroke lands, because that stroke ends at his foot: any gap
         * between finishing the drawing and starting the handover leaves the pen
         * parked on the floor, which is what it did across the whole `stand`
         * beat. One clock drives the pen, his raised arm, and the aside, so the
         * three cannot drift apart.
         */
        const handover = smooth(track(t, 0.62, 0.84));

        /*
         * Strokes present. Counted DOWN to zero while erasing and back up while
         * redrawing, so the same number drives both halves and the handover
         * between them cannot desync.
         */
        const drawn = erase < 1 ? mix(6, 0, smooth(erase)) : smooth(redraw) * 6;

        /*
         * He is the heap until nothing is left of it, then he is a person again.
         *
         * The raised arm has to be up BEFORE the pen gets there — he reaches for
         * it, it does not dock into a hand that is still by his side. Keyed off
         * the same handover clock as the pen for exactly that reason.
         */
        const pose = erase < 1 ? 'scribbled' : handover > 0.3 ? 'holding' : 'standing';

        /*
         * The pen. It comes down, does the work, and by the end he has it —
         * which is why it travels toward his raised hand rather than lifting
         * away. That handover is the whole point of the page.
         *
         * Its nib is placed in the FIGURE's coordinates and then converted to
         * pixels, so it is genuinely on the stroke being drawn and genuinely at
         * his hand when he takes it. Positioning it against the frame instead
         * left it parked in the corner while the drawing happened somewhere
         * else entirely, and the handover never read at all.
         */
        const penIn = easeOut(track(t, 0.18, 0.32));
        const [nx, ny] = penNib(drawn, handover);

        /*
         * It fades only once it has ARRIVED in his hand, so the last thing the
         * reader sees is him holding it. Fading it en route would read as the
         * pen leaving rather than being handed over, which is the opposite of
         * what this page is for.
         */
        const penGone = clamp01((handover - 0.88) / 0.12);

        /*
         * Figure-local (100 × 160) to pixels, against the same anchor the
         * stylesheet gives the nib: his centre line, and the floor. The 0.12 is
         * the empty paper below his feet inside his own box — the same constant
         * the stylesheet uses to stand him on the ground.
         */
        const penX = (nx / 100 - 0.5) * FIGURE;
        const penY = -((1 - ny / 160) * 1.6 - 0.12) * FIGURE;

        return (
          <div className={styles.frame}>
            {/* `sub`: this page already carries a big handwritten card and the note
                must not compete with it */}
            <Headline t={t} at={0} span={0.2} size="sub" className={styles.note}>
              {theTurn.note}
            </Headline>

            <div className={styles.stage}>
              <span className={styles.ground} aria-hidden="true" />

              {/*
                * Ghost of the fall: where the heap was, left behind as faint
                * pencil. He does not get to pretend it did not happen — the
                * whole card depends on it still being on the page.
                */}
              <Figure
                pose="scribbled"
                size={FIGURE}
                color="var(--pencil)"
                className={styles.ghost}
                style={{ '--figure-w': `${FIGURE}px`, opacity: clamp01(erase) * 0.22 } as CSSProperties}
              />

              <Figure
                drawn={drawn}
                pose={pose}
                size={FIGURE}
                className={styles.figure}
                style={
                  {
                    '--figure-w': `${FIGURE}px`,
                    /* he rises the last few pixels onto his feet as he stands */
                    transform: `translateY(${(mix(6, 0, easeOut(stand))).toFixed(2)}px)`,
                  } as CSSProperties
                }
              />

              {/* THE PEN, doing the drawing until he takes it off it */}
              <svg
                className={styles.pen}
                viewBox="0 0 24 90"
                fill="none"
                aria-hidden="true"
                style={
                  {
                    opacity: penIn * (1 - penGone),
                    /*
                     * Pixels, not percentages. The old percentages resolved
                     * against the pen's own ~20px box, so its whole journey
                     * across the page amounted to about four pixels.
                     *
                     * It also drops in from above before it starts drawing, and
                     * rotates as he takes it — a pen being handed over turns to
                     * be held, it does not stay at a drawing angle.
                     *
                     * The negative angle leans the barrel up and to the LEFT,
                     * away from his body. Leaning it right laid it along his
                     * spine and neck, where it stopped reading as a separate
                     * object and started reading as another one of his strokes.
                     */
                    transform: `translate(-50%, 0) translate(${penX.toFixed(2)}px, ${(penY - mix(90, 0, penIn)).toFixed(2)}px) rotate(${mix(-24, -8, handover).toFixed(1)}deg)`,
                  } as CSSProperties
                }
              >
                {/* barrel */}
                <path d="M9 4 h6 v62 h-6 z" fill="var(--ink)" />
                {/* the nib, which is the end that touches the paper */}
                <path d="M9 66 L12 84 L15 66 z" fill="var(--ink)" />
                <path d="M12 84 v4" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>

            {/*
              * THE CARD — the one line the whole book is built around, so it is
              * written by hand, at size, and given the page to itself.
              */}
            <p className={`hand drift ${styles.card}`}>
              <Written t={card}>{theTurn.card}</Written>
            </p>

            <p
              className={`mark ${styles.aside}`}
              style={{ opacity: clamp01((handover - 0.4) * 3) }}
            >
              {theTurn.aside}
            </p>
          </div>
        );
      }}
    </Spread>
  );
}
