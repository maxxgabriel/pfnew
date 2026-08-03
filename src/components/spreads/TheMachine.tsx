import type { CSSProperties } from 'react';
import { theMachine } from '../../content/book';
import { Figure } from '../ink/Figure';
import { Headline } from '../ink/Headline';
import { Spread } from '../ink/Spread';
import { Written } from '../ink/Written';
import { clamp01, easeOut, mix, track } from '../../lib/ease';
import styles from './TheMachine.module.css';

/**
 * SPREAD 06 — THE MACHINE.
 *
 * Five components lock into a contraption as you descend, and then the whole
 * thing turns. Each component is a real project, which is the argument of the
 * page: the things you build end up building you, and this is what gives him
 * the strength to tear his way off the page on the next spread.
 *
 * This is also the portfolio, so the projects are a real ordered list of real
 * text, not labels painted onto a drawing. The contraption is decoration around
 * a list — if the drawing failed to load, the page would still be a CV.
 *
 * The parts assemble in sequence and the machine only runs once all five are
 * in: a Rube Goldberg machine with a missing component is just parts, and
 * running it early would throw away the only reward the page has.
 */
export function TheMachine() {
  return (
    <Spread id="the-machine" label="The machine" folio={6} length={5.4} pin tone="shade">
      {({ t }) => {
        /*
         * Assembly occupies the first three-quarters, one part per beat, then
         * the machine runs. `run` is the payoff and needs room to be enjoyed, so
         * it gets a full quarter of a deliberately long page.
         */
        const assembly = track(t, 0.04, 0.72);
        const run = track(t, 0.74, 1);
        const card = track(t, 0.8, 0.98);

        // Fractional: 2.4 means two parts locked and the third arriving.
        const built = assembly * theMachine.parts.length;

        /*
         * Rotation of the driven parts once it runs. Continues to accelerate
         * rather than settling, because the page is about routine compounding —
         * and because a machine that eases to a stop reads as breaking down.
         */
        const turn = run * run * 900;

        return (
          <div className={styles.frame}>
            {/* HIGHLIGHT — it works now, and this is the portfolio page */}
            <Headline t={t} at={0} span={0.18} tint="var(--highlight)" className={styles.note}>
              {theMachine.note}
            </Headline>

            {/* ---------- THE CONTRAPTION ---------- */}
            <div className={styles.stage}>
              {/*
                * The viewBox ends ON the ground line (y=200, plus half a stroke),
                * not below it. He is aligned to the bottom of this same box, so any
                * blank paper down here reads as him standing under the floor.
                * `overflow: visible` on .rig means trimming it clips nothing.
                */}
              <svg
                className={styles.rig}
                viewBox="0 0 300 202"
                fill="none"
                stroke="var(--ink)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {/* the frame it is all bolted to, drawn first as a scaffold */}
                <path
                  className={styles.scaffold}
                  d="M18 200 H290 M30 200 V112 M272 200 V178"
                  stroke="var(--pencil)"
                  strokeWidth="1.6"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - clamp01(assembly * 5)}
                />

                {PARTS.map((part, i) => {
                  /*
                   * Each part's own arrival, 0–1. Overlapped slightly so the
                   * next one starts before the last has settled — parts landing
                   * in strict single file reads as a slideshow, not assembly.
                   */
                  const lock = clamp01(built - i);
                  const arrive = easeOut(lock);

                  return (
                    <g
                      key={part.id}
                      className={styles.part}
                      style={{
                        opacity: clamp01(lock * 3),
                        /* drops into place from above, overshooting very slightly */
                        transform: `translateY(${mix(-26, 0, arrive).toFixed(2)}px)`,
                      }}
                    >
                      {/*
                        * Anything that turns gets the running rotation; struts
                        * and belts do not. Rotation is per-part about its own
                        * centre, which is why the pivots are in the data.
                        */}
                      <g
                        style={{
                          transformOrigin: `${part.cx}px ${part.cy}px`,
                          transform: part.spins
                            ? `rotate(${(turn * part.spins).toFixed(2)}deg)`
                            : undefined,
                        }}
                      >
                        <path
                          d={part.d}
                          pathLength={1}
                          strokeDasharray={1}
                          strokeDashoffset={1 - lock}
                        />
                      </g>

                      {/*
                        * The part number, pencilled on the scaffold BELOW the
                        * component — deliberately outside the rotating group, or
                        * it would spin with the gear it labels and be unreadable
                        * for most of the page.
                        */}
                      <text
                        className={styles.stamp}
                        x={part.lx}
                        y={192}
                        textAnchor="middle"
                        fill="var(--pencil)"
                        stroke="none"
                      >
                        {theMachine.parts[i].n}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/*
                * He builds it, then stands back and pulls the lever. Placed
                * beside the rig rather than on it: he is the one who made this,
                * not a component of it.
                */}
              <Figure
                pose={run > 0.1 ? 'holding' : 'standing'}
                size={FIGURE}
                className={styles.builder}
                style={{ '--figure-w': `${FIGURE}px` } as CSSProperties}
              />
            </div>

            {/* ---------- THE PROJECTS ---------- */}
            <ol className={styles.parts}>
              {theMachine.parts.map((part, i) => {
                const lock = clamp01(built - i);
                return (
                  <li
                    key={part.name}
                    className={styles.project}
                    /* dimmed until its component is in the machine */
                    style={{
                      opacity: mix(0.18, 1, clamp01(lock * 2)),
                      transform: `translateX(${mix(10, 0, easeOut(lock)).toFixed(2)}px)`,
                    }}
                  >
                    <span className={`mark ${styles.numeral}`} aria-hidden="true">{part.n}</span>
                    <h3 className={styles.name}>{part.name}</h3>
                    <p className={styles.does}>{part.does}</p>
                    <p className={`mark ${styles.meta}`}>
                      {part.built} · {part.year}
                    </p>
                  </li>
                );
              })}
            </ol>

            <p className={`hand drift ${styles.card}`}>
              <Written t={card}>{theMachine.card}</Written>
            </p>
          </div>
        );
      }}
    </Spread>
  );
}

/** His drawn width in px. The stylesheet needs it to stand him on the floor. */
const FIGURE = 130;

/**
 * The five components, on the rig's 0 0 300 220 stage. Ground is y=200.
 *
 * Three things in this data are load-bearing:
 *
 *  - `cx`/`cy` is the PIVOT, not the centre of the artwork. A hammer pivots at
 *    the foot of its arm; rotating it about its own head throws the head off
 *    the rig entirely.
 *  - `spins` is a multiplier on the running rotation, and its SIGN matters:
 *    meshed gears turn opposite ways. A train of gears all rotating the same
 *    direction is the single mistake that makes a drawn machine read as not
 *    connected to itself. Belts and struts do not spin.
 *  - `lx` is where the part number is pencilled — on the scaffold under the
 *    part, never on the part. A numeral stamped on a spinning gear rotates with
 *    it and is unreadable for most of the page.
 */
const PARTS = [
  // I — the crank he turns. Largest, slowest, drives everything.
  {
    id: 'crank',
    cx: 62,
    cy: 150,
    lx: 62,
    spins: 1,
    d: 'M62 118 A32 32 0 1 1 61.9 118 Z M62 150 L62 122 M62 150 L88 164 M62 150 L36 164',
  },
  // II — meshed with the crank at x=146, so it turns the other way and faster.
  {
    id: 'gear',
    cx: 124,
    cy: 150,
    lx: 124,
    spins: -1.8,
    d: 'M124 128 A22 22 0 1 1 123.9 128 Z M124 150 L124 130 M124 150 L141 161 M124 150 L107 161',
  },
  /*
   * III — the belt from gear to wheel. Two straight runs tangent to both, with
   * no end caps: the caps used to be drawn as arcs, which overlapped the wheels
   * they were meant to wrap and read as two extra loose rings on the rig.
   */
  {
    id: 'belt',
    cx: 176,
    cy: 150,
    lx: 176,
    spins: 0,
    d: 'M146 140 H226 M146 160 H226',
  },
  // IV — driven by the belt, and the fastest thing on the rig.
  {
    id: 'wheel',
    cx: 226,
    cy: 150,
    lx: 226,
    spins: 2.6,
    d: 'M226 132 A18 18 0 1 1 225.9 132 Z M226 150 L226 134 M226 150 L240 159 M226 150 L212 159',
  },
  /*
   * V — the output: a hammer on an arm. Pivots at the FOOT of the arm (264,168)
   * so it swings like a hammer, and `spins` is small so it beats rather than
   * whirls — the machine has to visibly do something at the end of the chain or
   * the whole contraption is decoration.
   */
  {
    id: 'hammer',
    cx: 272,
    cy: 178,
    lx: 272,
    spins: -0.35,
    d: 'M272 178 L272 140 M262 136 H282 M262 136 V126 H282 V136',
  },
] as const;
