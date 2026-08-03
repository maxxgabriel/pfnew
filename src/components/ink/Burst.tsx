import type { CSSProperties } from 'react';
import styles from './Burst.module.css';

type Props = {
  word: string;
  className?: string;
  style?: CSSProperties;
  /** render only the word, no star — for sound-effects that should just be type */
  plain?: boolean;
};

const TIPS = 24;

/**
 * ONOMATOPOEIA — a comic sound-effect.
 *
 * A skewed burst of spikes, the way a costumed hero lands in a panel. The path
 * is an even-radius star solved once and reused, so every "WHAM" in the book
 * points the same twelve ways out; the word sits on a plain disc over the
 * middle so the spikes read as a frame around it rather than cutting it up.
 */
const STAR = (() => {
  const pts: string[] = [];
  for (let i = 0; i < TIPS; i++) {
    const a = (i / TIPS) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 44 : 15;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
})();

export function Burst({ word, className, style, plain = false }: Props) {
  return (
    <div
      className={`${styles.burst} ${plain ? styles.plain : ''} ${className ?? ''}`}
      style={style}
      aria-hidden="true"
    >
      {!plain && (
        <svg viewBox="0 0 100 100" className={styles.shape} fill="none">
          <path d={STAR} fill="var(--burst-fill, var(--punch))" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" />
        </svg>
      )}
      <span className={styles.word}>{word}</span>
    </div>
  );
}