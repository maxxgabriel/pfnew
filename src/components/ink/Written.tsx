import type { CSSProperties } from 'react';
import styles from './Written.module.css';

type Props = {
  children: string;
  /** 0–1. How much of the text has been written. */
  t: number;
  /**
   * How much of the reveal each character overlaps its neighbour. 0 writes one
   * letter at a time in hard succession; 1 fades the whole line in at once.
   * The default is a hand moving at a normal pace.
   */
  overlap?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * TEXT BEING WRITTEN, not text appearing.
 *
 * Per-character, driven by a playhead so it un-writes when the reader scrolls
 * back up. Each character comes in with a small rise and a little rotation
 * because a pen does not set type — it puts letters down at slightly wrong
 * angles, and that unevenness is the entire difference between handwriting and
 * a font that looks like handwriting.
 *
 * Words are kept whole so a line can wrap without breaking a word in half; the
 * spans are inside the words rather than around them.
 */
export function Written({ children, t, overlap = 0.55, className, style }: Props) {
  const words = children.split(' ');
  const total = children.length;

  // Characters consumed by the words before this one, for a continuous index.
  let seen = 0;

  return (
    <span className={`${className ?? ''}`} style={style}>
      {/* the real string, for anything that is not looking at the drawing */}
      <span className="visually-hidden">{children}</span>

      <span aria-hidden="true">
        {words.map((word, w) => {
          const offset = seen;
          seen += word.length + 1; // +1 for the space that followed it

          return (
            <span key={`${word}-${w}`} className={styles.word}>
              {[...word].map((char, c) => {
                /*
                 * Spread each character's reveal across the line, with windows
                 * that overlap. Dividing by (1 - overlap) is what lets the last
                 * character still finish at t=1 rather than being cut off.
                 */
                const start = ((offset + c) / total) * (1 - overlap);
                const on = Math.min(Math.max((t - start) / Math.max(1 - overlap, 1e-6) * 1.6, 0), 1);

                return (
                  <span
                    key={c}
                    className={styles.char}
                    style={{
                      opacity: on,
                      transform: `translateY(${((1 - on) * 0.28).toFixed(3)}em) rotate(${((1 - on) * (c % 2 ? 6 : -6)).toFixed(1)}deg)`,
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </span>
          );
        })}
      </span>
    </span>
  );
}
