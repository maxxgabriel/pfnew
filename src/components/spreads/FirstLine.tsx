import { firstLine } from '../../content/book';
import { Figure } from '../ink/Figure';
import { Headline } from '../ink/Headline';
import { Spread } from '../ink/Spread';
import styles from './FirstLine.module.css';

/**
 * SPREAD 01 — THE FIRST LINE.
 *
 * One stroke, drawn as you scroll. It should be inert. It twitches.
 *
 * The whole picture rests on this page working: if the reader accepts that a
 * single line is alive, everything after it is free. So the page is almost
 * empty — one stroke, one headline, and a lot of paper.
 */
export function FirstLine() {
  return (
    <Spread id="first-line" label="The first line" folio={1} length={1.8} pin>
      {({ t }) => {
        // The stroke draws over the first half, then holds while it comes alive.
        const drawn = Math.min(t * 2.2, 1);
        const alive = Math.max(0, (t - 0.45) * 2.4);

        return (
          <div className={styles.frame}>
            <Headline t={t} at={0} span={0.2} className={styles.note}>
              {firstLine.note}
            </Headline>

            <div className={styles.stage}>
              {/*
                * Only the spine exists yet — `drawn={1}` reveals exactly one
                * stroke of six. The figure rig is doing the work here rather
                * than a bespoke line, so this stroke *is* his spine and stays
                * his spine for the rest of the book.
                */}
              <Figure
                drawn={drawn}
                pose="standing"
                size={260}
                className={styles.line}
                style={{ opacity: alive > 0 ? 1 : 0.85 }}
              />
            </div>

            {/* the realisation, once it has actually moved */}
            <p
              className={`hand breathe ${styles.aside}`}
              style={{
                opacity: Math.min(Math.max(alive - 0.3, 0) * 2, 1),
                transform: `translateY(${(1 - Math.min(alive, 1)) * 10}px)`,
              }}
            >
              {firstLine.aside}
            </p>
          </div>
        );
      }}
    </Spread>
  );
}
