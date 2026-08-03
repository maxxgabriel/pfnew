import { useEffect } from 'react';

/**
 * THE POINTER — where the reader's hand is, read by everything.
 *
 * Published as custom properties on <html> rather than as React state, and that
 * is the entire design of this hook. A pointer move fires on every frame the
 * mouse is in motion; putting that in state re-renders nine spreads and every
 * figure in them, sixty times a second, to move a shadow. Setting two custom
 * properties instead touches no React at all and the work stays on the compositor.
 *
 *   --px, --py   0–1 across the viewport
 *   --pdx, --pdy -1–1, signed from the centre — what most motion actually wants
 *   --plit       0–1, how far the pointer is from centre, for lighting intensity
 *
 * WHAT CONSUMES THEM. The headline rules lengthen and the paper's light shifts with
 * the cursor — a small, quiet response, but enough that the page feels aware of the
 * reader rather than inert.
 *
 * These once drove a much louder effect: the display type was extruded into a slab
 * that cast away from the pointer. That went when the display face became a Bodoni, and
 * the hook stayed because the underlying idea — the page responding to a hand — is
 * worth keeping at any volume.
 *
 * SMOOTHED, not raw. The pointer teleports between frames when someone flicks the
 * mouse, and a slab of type that snaps to a new angle reads as a glitch rather
 * than as light. Chasing the target at a fixed fraction per frame gives it the
 * weight of something heavy being lit from a moving lamp.
 *
 * The rAF loop only runs while there is distance left to close, so an idle page
 * costs nothing.
 */
export function usePointer() {
  useEffect(() => {
    /*
     * Coarse pointers get nothing. A touch screen has no hover state, so `--px`
     * would be frozen wherever the last tap landed — a light source stuck in the
     * corner of the page is worse than no light source, and every consumer of
     * these already has a sensible default of 0.5 / 0.
     */
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    let frame = 0;
    let tx = 0.5;
    let ty = 0.5;
    let x = 0.5;
    let y = 0.5;

    const tick = () => {
      const dx = tx - x;
      const dy = ty - y;

      /*
       * Stop when there is nothing left to move. Without this the loop runs
       * forever on a page nobody is touching, which is a wake-up every 16ms for
       * a value that is not changing.
       */
      if (Math.abs(dx) < 0.0005 && Math.abs(dy) < 0.0005) {
        frame = 0;
        return;
      }

      x += dx * 0.09;
      y += dy * 0.09;

      root.style.setProperty('--px', x.toFixed(4));
      root.style.setProperty('--py', y.toFixed(4));
      root.style.setProperty('--pdx', ((x - 0.5) * 2).toFixed(4));
      root.style.setProperty('--pdy', ((y - 0.5) * 2).toFixed(4));
      root.style.setProperty(
        '--plit',
        Math.min(Math.hypot((x - 0.5) * 2, (y - 0.5) * 2), 1).toFixed(4),
      );

      frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth;
      ty = e.clientY / window.innerHeight;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    /* back to centre when the pointer leaves, so the light does not stay skewed */
    const onLeave = () => {
      tx = 0.5;
      ty = 0.5;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);
}
