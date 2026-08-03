import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './Spread.module.css';

type RenderArgs = {
  /** 0 → 1 as the spread passes the viewport. This page's own playhead. */
  t: number;
};

type Props = {
  children: ReactNode | ((args: RenderArgs) => ReactNode);
  id?: string;
  label?: string;
  /** Page number, pencilled into the margin. */
  folio?: number;
  /** Height as a multiple of the viewport. Longer = more scroll to cross it. */
  length?: number;
  /**
   * Hold the page at the viewport for its whole length, so scrolling drives
   * motion *within* a still page rather than moving the page itself. Required
   * for anything whose motion is not vertical — the run, the machine.
   */
  pin?: boolean;
  /**
   * Paper tone, for pages that want to sit slightly deeper in the book — and
   * `storm`, which is not paper at all.
   *
   * `storm` inverts `--ink` and `--paper` for everything inside the spread, so the
   * last page can be a night sky without a single component being rewritten. Only
   * spread 08 uses it, because by then he has torn his way out of the book.
   */
  tone?: 'paper' | 'shade' | 'deep' | 'storm';
  className?: string;
};

/**
 * A SPREAD — one page of the sketchbook.
 *
 * Gives its children a scroll-driven playhead rather than a one-shot trigger:
 * every drawing on the page is a function of `t`, so scrolling back up runs it
 * backwards. That is the whole difference between a page with animations on it
 * and something that reads as continuous.
 */
export function Spread({
  children,
  id,
  label,
  folio,
  length = 1,
  pin = false,
  tone = 'paper',
  className,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const [t, setT] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;

      /*
       * Two different playheads, and using the wrong one is a real bug rather
       * than a preference:
       *
       * PINNED — how far you have scrolled *through* the page while it is held
       * at the viewport. 0 the moment its top meets the top of the window.
       * This is the only correct definition for a pin, and it is the only one
       * that works for the FIRST page: a page that starts at the top of the
       * viewport never enters from below, so a crossing-based playhead would
       * already read ~0.4 at rest and the animation would be part-played
       * before the reader touched anything.
       *
       * UNPINNED — how far the page has crossed the window, so it animates as
       * it passes through on its way up.
       */
      const t = pin
        ? -rect.top / Math.max(rect.height - viewport, 1)
        : (viewport - rect.top) / (rect.height + viewport);

      setT(Math.min(Math.max(t, 0), 1));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pin]);

  const body = typeof children === 'function' ? children({ t }) : children;

  return (
    <section
      id={id}
      ref={ref}
      aria-label={label}
      data-tone={tone}
      className={`${styles.spread} ${className ?? ''}`}
      style={{ '--length': length } as CSSProperties}
    >
      {/*
        * The pinned frame owns its own elements rather than styling a child.
        * Learned the hard way: a sticky element is broken by any ancestor with
        * non-visible overflow (it becomes the scroll container) and by any
        * ancestor creating a containing block. So the track must not clip, and
        * the clip goes on the sticky element itself.
        */}
      {pin ? (
        <div className={styles.pinTrack}>
          <div className={styles.pinned}>{body}</div>
        </div>
      ) : (
        <div className={styles.stage}>{body}</div>
      )}

      {folio !== undefined && (
        <span className={`mark ${styles.folio}`} aria-hidden="true">
          {String(folio).padStart(2, '0')}
        </span>
      )}
    </section>
  );
}
