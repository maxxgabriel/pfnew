import { useEffect, useState } from 'react';

/**
 * THE CAMERA — one scroll position, read by everything.
 *
 * Entrance animations fire once and leave a static page behind them. A film
 * never stops moving, so every shot in this picture is *driven* by scroll
 * rather than triggered by it: the audience's scroll position is the playhead,
 * and pushing it backwards runs the picture backwards.
 *
 * Published as CSS custom properties on <html> as well as returned state, so
 * stylesheets can drive motion without a component re-rendering to do it.
 */
export function useCamera() {
  const [state, setState] = useState({ progress: 0, velocity: 0 });

  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    let last = 0;
    let smoothed = 0;

    const measure = () => {
      frame = 0;
      const travel = document.body.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const progress = travel > 0 ? Math.min(Math.max(y / travel, 0), 1) : 0;

      /*
       * Velocity is smoothed rather than raw: a single frame's delta is far
       * too jittery to drive motion blur, and the eye reads the *trend* of a
       * whip pan, not its instantaneous speed.
       */
      const raw = Math.min(Math.abs(y - last) / 45, 1);
      smoothed += (raw - smoothed) * 0.2;
      last = y;

      root.style.setProperty('--camera', progress.toFixed(4));
      root.style.setProperty('--velocity', smoothed.toFixed(3));
      // travelled in viewport-heights, for shots that need absolute depth
      root.style.setProperty('--depth', (y / window.innerHeight).toFixed(3));

      setState({ progress, velocity: smoothed });
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    /*
     * Velocity has to keep decaying after scrolling stops, or a whip pan would
     * freeze mid-blur the moment the wheel does.
     */
    const decay = setInterval(() => {
      if (smoothed > 0.001) {
        smoothed *= 0.86;
        root.style.setProperty('--velocity', smoothed.toFixed(3));
      }
    }, 50);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      clearInterval(decay);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return state;
}
