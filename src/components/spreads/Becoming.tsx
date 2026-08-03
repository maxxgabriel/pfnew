import { becoming } from '../../content/book';
import { Figure } from '../ink/Figure';
import { Headline } from '../ink/Headline';
import { Spread } from '../ink/Spread';
import styles from './Becoming.module.css';

/**
 * SPREAD 02 — BECOMING.
 *
 * The pen adds the rest of him: head, arms, legs, in that order. He goes from
 * one line to a person over the length of the page.
 *
 * The five remaining strokes are mapped straight onto the playhead, so the
 * reader is doing the drawing — and scrolling back up un-draws him, which is
 * the detail that makes it feel like their hand rather than a canned sequence.
 */
export function Becoming() {
  return (
    <Spread id="becoming" label="Becoming" folio={2} length={2.4} pin>
      {({ t }) => {
        /*
         * Stroke 1 (the spine) already exists from the previous page, so this
         * page draws strokes 2–6. The 0.82 ceiling leaves a beat at the end
         * where he simply stands, finished, before the next page.
         */
        const drawn = 1 + Math.min(t / 0.82, 1) * 5;

        // Which part label is currently being added, for the margin notes.
        const partIndex = Math.min(Math.floor((drawn - 1) / 5 * 3), 2);

        return (
          <div className={styles.frame}>
            <div className={styles.margin}>
              <Headline t={t} at={0} span={0.2} className={styles.note}>
                {becoming.note}
              </Headline>

              <ul className={styles.parts}>
                {becoming.parts.map((part, i) => (
                  <li
                    key={part}
                    className={`hand ${styles.part}`}
                    style={{
                      opacity: i <= partIndex ? 1 : 0.16,
                      // the current part is struck through as it is completed
                      textDecoration: i < partIndex ? 'line-through' : 'none',
                    }}
                  >
                    {part}
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.stage}>
              <Figure
                drawn={drawn}
                /* he can only stand once he has legs — before that he hangs */
                pose={drawn >= 5.4 ? 'standing' : 'blank'}
                size={300}
                className={styles.figure}
              />
            </div>

            <p
              className={`hand drift ${styles.aside}`}
              style={{ opacity: Math.min(Math.max(t - 0.78, 0) * 6, 1) }}
            >
              {becoming.aside}
            </p>
          </div>
        );
      }}
    </Spread>
  );
}
