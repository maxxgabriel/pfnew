import type { CSSProperties, ReactNode } from 'react';
import styles from './GlitchText.module.css';

type Props = {
  children: ReactNode;
  className?: string;
  /** 0 = static chromatic split only, 1 = full slice animation */
  intensity?: number;
};

/**
 * GLITCH TEXT — chromatic aberration + slice animation on any text.
 *
 * Renders the children twice more as ::before / ::after pseudo-elements
 * (via data-text), tinted red and cyan, with clip-path slicing that
 * jitters horizontally. The Spider-Verse "broken signal" look.
 *
 * Respects prefers-reduced-motion: shows static split only.
 */
export function GlitchText({ children, className, intensity = 1 }: Props) {
  return (
    <span
      className={`${styles.glitch} ${className ?? ''}`}
      data-text={typeof children === 'string' ? children : undefined}
      style={{ '--glitch-intensity': intensity } as CSSProperties}
    >
      {children}
    </span>
  );
}
