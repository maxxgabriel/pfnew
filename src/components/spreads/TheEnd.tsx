import type { CSSProperties } from 'react';
import { book, theEnd } from '../../content/book';
import { ChromaticAberration } from '../ink/ChromaticAberration';
import { Figure } from '../ink/Figure';
import { GlitchText } from '../ink/GlitchText';
import { Spread } from '../ink/Spread';
import { Weather } from '../ink/Weather';
import { Written } from '../ink/Written';
import { clamp01, easeOut, mix, smooth, track } from '../../lib/ease';
import styles from './TheEnd.module.css';

/**
 * SPREAD 08 — THE END.
 *
 * Off the page, on real ground. He writes the last card himself — which is the
 * only reason the pen handover on spread 04 was worth building.
 *
 * NOT PAPER. This is the only spread in the book that is not a page — dark sky,
 * rain, a lit horizon, and him standing in it. He tore his way out of the sketchbook
 * on the spread before, so the ground under the type stops being cream stock.
 *
 * That scale change is the whole reason the rewrite happened. The last card is three
 * words about enduring elemental forces, and on paper with a pencil horizon it read
 * as a quote pinned to a noticeboard. It needs weather to be the payoff of.
 *
 * NOT pinned, and that is deliberate. Every spread since the cover has held the
 * page still and moved the drawing; this one lets the page scroll normally,
 * because the reader has left the sketchbook and the book's own grammar should
 * stop applying. It is also the practical choice — this is the one spread with
 * real reading and real links on it, and pinning text you want someone to act on
 * behind a scroll-scrubbed playhead is hostile.
 *
 * The last card is STORMS / FLOODS / or even / GODS — three display lines with a quiet
 * italic hinge between the last two. `or even` is deliberately NOT one of the big
 * words: it is what turns a list of weather into a list ending with gods, and it does
 * that by being the only thing here not shouting. Four big lines would make the setup
 * as loud as the nouns, and GODS has to land hardest.
 */
export function TheEnd() {
  return (
    <Spread id="the-end" label="The end" folio={8} length={1.7} tone="storm">
      {({ t }) => {
        /*
         * The playhead here is a crossing rather than a pin, so it already reads
         * ~0.35 when the page is centred. Beats are placed against that, and the
         * contact block is intentionally live well before the end — nobody should
         * have to scroll to the last pixel to find an email address.
         */
        const arrive = track(t, 0.22, 0.42); // he lands on real ground
        const words = track(t, 0.3, 0.62); // STORMS / FLOODS / OR GODS
        const reach = track(t, 0.52, 0.7); // the invitation
        const close = track(t, 0.62, 0.78); // the sign-off, last of all

        return (
          <div className={styles.frame} style={{ '--figure-w': `${FIGURE}px` } as CSSProperties}>
            <ChromaticAberration intensity={1.5} />
            {/*
              * THE WEATHER, behind everything. The rain runs on its own clock rather
              * than the playhead — every other element in the book scrubs with scroll,
              * but weather does not stop because the reader stopped, and that is most
              * of what makes this page feel like somewhere instead of something.
              *
              * The lightning IS on the playhead: it fires as each of the three words
              * lands, so the flashes are the book's own beats.
              */}
            <Weather t={t} />
            {/* ---------- he draws the last card ---------- */}
            <div className={styles.stage}>
              {/*
                * Real ground: solid, level, and drawn in ink rather than pencil.
                * Everything he has stood on until now was a pencil line on paper.
                */}
              {/*
                * No drawn ground here any more — the storm's own horizon is the line he
                * stands on now (see Weather.module.css). A second rule on top of it read
                * as two horizons at slightly different heights.
                */}

              <Figure
                pose="holding"
                size={FIGURE}
                className={styles.figure}
                style={
                  {
                    opacity: clamp01(arrive * 3),
                    transform: `translateY(${mix(18, 0, easeOut(arrive)).toFixed(2)}px)`,
                  } as CSSProperties
                }
              />
            </div>

            <p className={`hand breathe ${styles.lead}`} style={{ opacity: clamp01(arrive * 2) }}>
              {theEnd.lead}
            </p>

            <p className={`hand breathe ${styles.through}`} style={{ opacity: clamp01((words - 0.05) * 4) }}>
              {theEnd.through}
            </p>

            {/*
              * THE LAST CARD. Each word is written per character, one after the last,
              * so it lands as three blows rather than as a block of type fading up.
              *
              * FLAT, like every other headline in the book. These were extruded slabs
              * until the display face became a Bodoni — a heavy 3D shadow behind
              * hairline serifs is two design languages arguing, and the shadow wins.
              * The words are the largest thing in the book by a wide margin, and at
              * this size the letterforms need no help at all.
              *
              * What escalates instead is pure scale: the headlines cap at 4.4rem and
              * these run to 9rem, so eight pages set the measure and the last three
              * words break it.
              */}
            <h2 className={styles.words}>
              {theEnd.words.map((word, i) => {
                const own = track(words, i * 0.24, i * 0.24 + 0.46);
                /* the rule is ruled under each word once that word has finished */
                const rule = track(words, i * 0.24 + 0.3, i * 0.24 + 0.62);

                return (
                  <span key={word} className={styles.word}>
                    <span
                      className={styles.slab}
                      style={
                        {
                          /*
                           * Each line pushes in slightly from its own side, and gets a
                           * hairline rule beneath it in its own colour — the same
                           * device the headlines use, so the ending is the book's
                           * grammar at full volume rather than a different treatment.
                           */
                          '--tint': TINTS[i],
                          transform: `translateX(${mix(i % 2 ? 14 : -14, 0, smooth(own)).toFixed(2)}px)`,
                          opacity: clamp01(own * 4),
                          '--drawn': clamp01(rule).toFixed(3),
                        } as CSSProperties
                      }
                    >
                      <GlitchText intensity={0.8}>
                        <Written t={own} overlap={0.55}>
                          {word}
                        </Written>
                      </GlitchText>
                    </span>

                    {/*
                      * THE HINGE, between FLOODS and GODS. Small, handwritten, and
                      * quiet — it is the word that turns a list of weather into a
                      * list that ends with gods, and it does that by being the one
                      * thing on this page not shouting.
                      *
                      * Rendered inside the FLOODS item rather than as a fourth
                      * sibling so it cannot pick up `.word`'s full-width block and
                      * display measure.
                      */}
                    {i === 1 && (
                      <span
                        className={`hand drift ${styles.hinge}`}
                        style={{ opacity: clamp01(track(words, 0.46, 0.6) * 2) }}
                      >
                        {theEnd.hinge}
                      </span>
                    )}
                  </span>
                );
              })}
            </h2>

            {/* ---------- invitation ---------- */}
            <div
              className={styles.contact}
              style={{
                opacity: clamp01(reach * 2),
                transform: `translateY(${mix(14, 0, easeOut(reach)).toFixed(2)}px)`,
              }}
            >
              <p className={`mark ${styles.reach}`}>{theEnd.reach}</p>

              <a className={styles.email} href={`mailto:${book.email}`}>
                {theEnd.invite}
              </a>

              <ul className={styles.links}>
                {book.links.map((link) => (
                  <li key={link.label}>
                    <a
                      className={styles.link}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* ---------- signature ---------- */}
            <footer
              className={styles.close}
              style={{
                opacity: clamp01(close * 2),
                transform: `translateY(${mix(14, 0, easeOut(close)).toFixed(2)}px)`,
              }}
            >
              <span className={`hand ${styles.sig}`}>{theEnd.sign}</span>
            </footer>
          </div>
        );
      }}
    </Spread>
  );
}

/** His drawn width in px. The stylesheet needs it to stand him on the floor. */
const FIGURE = 150;

/*
 * The rule under each word — the book's three markers, in the order they were earned:
 * marine for the first line that moved, coral for the erasure, highlight for what he
 * became. Every colour the book has, spent at once, on the only page with nothing left
 * to save them for.
 */
const TINTS = ['var(--marine)', 'var(--coral)', 'var(--highlight)'] as const;
