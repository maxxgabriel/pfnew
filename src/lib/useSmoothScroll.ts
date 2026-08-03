import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Lenis smooth scrolling, plus a CSS var (--velocity, 0..1) that other
 * effects read to react to scroll speed. Skipped entirely for reduced
 * motion and on touch devices, where native momentum scrolling is both
 * better and expected — hijacking it on iOS feels broken.
 */
export function useSmoothScroll() {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = matchMedia('(pointer: coarse)').matches;
    const root = document.documentElement;

    if (reduced || coarse) {
      // Still expose velocity so velocity-driven styles have a stable value.
      root.style.setProperty('--velocity', '0');
      return;
    }

    const lenis = new Lenis({ duration: 1.1 });

    lenis.on('scroll', ({ velocity }: { velocity: number }) => {
      // Normalise to 0..1; ~55px/frame is a hard flick.
      const v = Math.min(Math.abs(velocity) / 55, 1);
      root.style.setProperty('--velocity', v.toFixed(3));
    });

    /*
     * Lenis owns the scroll position, so native anchor jumps (and
     * scrollIntoView) get overridden the moment it runs its next frame.
     * Route same-page links through Lenis instead.
     */
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest('a');
      const href = link?.getAttribute('href');
      if (!href?.startsWith('#') || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -72 }); // clear the masthead
      history.pushState(null, '', href);
    };

    document.addEventListener('click', onClick);

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('click', onClick);
      lenis.destroy();
      root.style.removeProperty('--velocity');
    };
  }, []);
}
