import type { CSSProperties } from 'react';
import { Written } from './Written';
import { clamp01, track } from '../../lib/ease';
import styles from './Headline.module.css';

/**
 * THE ONE LINE THAT SAYS WHAT THE PAGE IS.
 *
 * Every spread used to carry this in the corner as `<p class="mark">Shipped it</p>` —
 * eight pencil words at 12px beside a figure two-thirds the height of the screen. The
 * drawing had all the visual weight and the words had all the meaning, so the book
 * worked emotionally and not at all semantically: a reader felt a little guy having a
 * hard time and never learned that the figure IS the software, that the fall is a
 * production crash, or that any of this was a developer's portfolio. A hierarchy
 * problem, not a script problem — the meaning was set at footnote size.
 *
 * So it is a headline now: display face, large, and the first thing read on the page.
 *
 * FLAT, AND THAT IS THE SECOND FIX. This was built extruded — a slab of the word
 * stacked into depth with a coloured side. That worked when the display face was a
 * heavy condensed sans, and it stopped working the moment the face became a Bodoni: a
 * chunky 3D shadow behind hairline serifs is two design languages arguing, and the
 * shadow wins. An elegant face needs the OPPOSITE of reinforcement — size, air, and
 * nothing else.
 *
 * What carries the weight instead:
 *
 *   - scale, and the letterforms' own thick/thin contrast
 *   - generous letterspacing, so the hairlines have room to be seen
 *   - a single colour, and one hairline RULE under the line rather than a shadow
 *
 * The colour sequence is the argument of the book: MARINE while he is being
 * drawn, CORAL for the erasure, marine again as he redraws himself, HIGHLIGHT
 * once he outlives the page. A reader who takes in nothing but the four
 * headline colours still gets the shape.
 */

type Props = {
  children: string;
  /** The spread's playhead. */
  t: number;
  /** When on that playhead the headline arrives, and how long it takes. */
  at?: number;
  span?: number;
  /** The rule under the line. The word itself stays ink — see the stylesheet. */
  tint?: string;
  /**
   * Size step. `lead` is the page's own title; `sub` is for a spread that already
   * carries a big card and only needs its note promoted a little.
   */
  size?: 'lead' | 'sub';
  className?: string;
  style?: CSSProperties;
};

export function Headline({
  children,
  t,
  at = 0,
  span = 0.22,
  tint = 'var(--marine)',
  size = 'lead',
  className,
  style,
}: Props) {
  const own = track(t, at, at + span);

  /*
   * The rule draws AFTER the words have finished arriving, as a line ruled under
   * something already written. Simultaneous would read as a single fading block, and
   * the point of the delay is that one thing follows the other.
   */
  const rule = track(t, at + span * 0.75, at + span * 1.7);

  return (
    <h2
      className={`${styles.head} ${styles[size]} ${className ?? ''}`}
      style={{ '--tint': tint, ...style } as CSSProperties}
    >
      {/*
       * Set per character rather than faded in as a block — the same `Written` the
       * cards use, so the headlines arrive in the book's existing grammar instead of
       * inventing a second one.
       */}
      <Written t={own} overlap={0.62}>
        {children}
      </Written>

      {/*
       * The rule, drawn left to right. This is what replaced the extrusion: it gives
       * the line a base and somewhere for the spread's colour to live, without putting
       * anything behind the letterforms.
       */}
      <span
        className={styles.rule}
        aria-hidden="true"
        style={{ transform: `scaleX(${clamp01(rule).toFixed(3)})` }}
      />
    </h2>
  );
}
