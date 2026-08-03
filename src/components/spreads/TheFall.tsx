import type { CSSProperties } from 'react';
import { theFall } from '../../content/book';
import { Figure } from '../ink/Figure';
import { Headline } from '../ink/Headline';
import { Spread } from '../ink/Spread';
import { clamp01, easeIn, mix, pulse, smooth, track } from '../../lib/ease';
import styles from './TheFall.module.css';

/**
 * SPREAD 03 — THE FALL.
 *
 * Four beats on one page: he walks, he trips, he lands, he is a heap. Then the
 * first card arrives, one line at a time.
 *
 * The important decision is that the fall is never a swap between two drawings.
 * `walking → tripped → scribbled` are three sets of joint angles on the same
 * six strokes, and the page moves him through them with position and rotation
 * driven off the playhead, so the reader sees one continuous accident. Cutting
 * between poses here would read as three separate pictures and the page would
 * stop being a fall.
 */
export function TheFall() {
  return (
    <Spread id="the-fall" label="The fall" folio={3} length={3.4} pin>
      {({ t }) => {
        /* ---------- beats ---------- */
        const walk = track(t, 0, 0.34); // he crosses the page, confident
        const trip = track(t, 0.34, 0.52); // the catch, and the flight
        const land = track(t, 0.52, 0.62); // contact
        const heap = track(t, 0.62, 0.76); // he becomes scrawl
        const card = track(t, 0.72, 1); // the words

        /*
         * One pose at a time, but the *transition* is carried by transform
         * rather than by the pose swap, so the change of drawing lands on the
         * frame where the motion already explains it.
         */
        const pose = heap > 0.02 ? 'scribbled' : trip > 0.02 ? 'tripped' : 'walking';

        /*
         * He travels left-to-right and simply keeps going through the trip —
         * momentum does not stop because he did. The 4.5 gait cycles across the
         * walk are tuned so his feet do not visibly skate over the distance.
         */
        const x = mix(-26, 6, walk) + trip * 10;
        const cycle = walk * 4.5;

        /*
         * The arc: up a little on the catch, then accelerating down. `easeIn`
         * on the descent is the whole reason it reads as gravity and not as a
         * lift — a linear fall looks like an elevator.
         *
         * The drop unwinds as he becomes the heap, because the scribbled pose is
         * drawn lying at the bottom of its own box: it needs no offset to be on
         * the floor, whereas the airborne pose does.
         */
        const rise = pulse(trip) * 4;
        const drop = easeIn(land) * 30 * (1 - smooth(heap));
        const y = mix(0, -6, trip) * (1 - smooth(heap)) - rise + drop;

        /*
         * He pitches forward through the trip and lands flat — then the tilt
         * UNWINDS to zero as he becomes the heap. The scribbled pose is already
         * drawn lying on the ground, so leaving 90° of rotation on it stands the
         * heap on its end and pushes half of it through the floor.
         */
        const tilt = (mix(0, 74, trip) + land * 16) * (1 - smooth(heap));

        return (
          <div className={styles.frame}>
            {/*
              * CORAL, and the first colour in the book. The headline sequence is the
              * argument in four beats — marine while he is being drawn, coral for the
              * erasure, marine again as he redraws himself, highlight once he outlives
              * the page — so a reader who takes in nothing but the headline colours
              * still gets the shape of the story.
              */}
            <Headline t={walk} at={0} span={0.22} tint="var(--coral)" className={styles.note}>
              {theFall.note}
            </Headline>

            <div className={styles.stage}>
              {/* the floor he is walking along, and lands on */}
              <span className={styles.ground} aria-hidden="true" />

              {/*
                * The impact shudder is on the ground rather than the figure:
                * shaking him would fight the fall's own motion, whereas shaking
                * the world he hit sells the weight of it.
                */}
              <div
                className={styles.world}
                style={{ transform: `translateY(${(pulse(land) * 5).toFixed(2)}px)` }}
              >
                <Figure
                  pose={pose}
                  cycle={cycle}
                  size={FIGURE}
                  className={styles.figure}
                  style={
                    {
                      /* the stylesheet needs his width to sit his feet on the floor */
                      '--figure-w': `${FIGURE}px`,
                      transform: `translate(${x.toFixed(2)}vw, ${y.toFixed(2)}vh) rotate(${tilt.toFixed(1)}deg)`,
                    } as CSSProperties
                  }
                />

                {/*
                  * The wounds. Coral, and the only colour on the page so far —
                  * held back this long precisely so that when it arrives it
                  * reads as damage rather than decoration.
                  */}
                <svg
                  className={styles.wounds}
                  viewBox="0 0 100 40"
                  fill="none"
                  stroke="var(--coral)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  aria-hidden="true"
                  style={{ opacity: clamp01(heap * 1.6) }}
                >
                  {WOUNDS.map((d, i) => (
                    <path
                      key={d}
                      d={d}
                      pathLength={1}
                      strokeDasharray={1}
                      /* each nick opens a beat after the last, so it stings in sequence */
                      strokeDashoffset={1 - clamp01(heap * 2.4 - i * 0.28)}
                    />
                  ))}
                </svg>
              </div>

              {/*
                * Motion lines, drawn where he *was*. A cartoon convention, and
                * it belongs here: this is a doodle, and doodles are allowed to
                * annotate their own physics.
                */}
              <svg
                className={styles.speed}
                viewBox="0 0 60 40"
                fill="none"
                stroke="var(--pencil)"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden="true"
                style={{ opacity: (pulse(trip) * 0.9).toFixed(2) }}
              >
                <path d="M4 14 H26" />
                <path d="M0 22 H20" />
                <path d="M8 30 H30" />
              </svg>
            </div>

            {/*
              * THE CARD. Handwritten, one line per beat, each landing with a
              * small settle. Flat and specific — the specificity of what stopped
              * is the whole weight of the page, and any polish would take it off.
              */}
            <ul className={styles.card}>
              {theFall.card.map((line, i) => {
                const on = clamp01(card * theFall.card.length - i);
                return (
                  <li
                    key={line}
                    className={`hand ${styles.line}`}
                    style={{
                      opacity: on,
                      transform: `translateY(${((1 - on) * 14).toFixed(2)}px) rotate(${(1 - on) * -1.5}deg)`,
                    }}
                  >
                    {line}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      }}
    </Spread>
  );
}

/** His drawn width in px. The stylesheet needs it to stand him on the floor. */
const FIGURE = 240;

/** Four nicks and a graze, on a 0 0 100 40 stage over the heap. */
const WOUNDS = [
  'M30 16 l6 6',
  'M38 12 l-5 7',
  'M56 20 l7 4',
  'M64 14 c4 3, 2 6, 6 7',
] as const;
