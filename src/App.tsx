import { useSmoothScroll } from './lib/useSmoothScroll';
import { useCamera } from './lib/useCamera';
import { usePointer } from './lib/usePointer';
import { Paper } from './components/ink/Paper';
import { Cover } from './components/spreads/Cover';
import { FirstLine } from './components/spreads/FirstLine';
import { Becoming } from './components/spreads/Becoming';
import { TheFall } from './components/spreads/TheFall';
import { TheTurn } from './components/spreads/TheTurn';
import { TheRun } from './components/spreads/TheRun';
import { TheMachine } from './components/spreads/TheMachine';
import { TheEscape } from './components/spreads/TheEscape';
import { TheEnd } from './components/spreads/TheEnd';

/**
 * THE SKETCHBOOK.
 *
 * A stick figure draws himself, falls, gets back up, and eventually tears his
 * way off the page. Read by scrolling.
 *
 * Everything is *driven* by scroll rather than triggered by it: each spread
 * hands its children a 0–1 playhead, so scrolling back up runs the drawing
 * backwards. That is the difference between a page with animations on it and
 * something that reads as continuous.
 *
 * Spreads are built one at a time and appended here as they are finished.
 */
export default function App() {
  useSmoothScroll();
  useCamera();
  /*
   * Publishes the pointer as CSS variables on <html>. Nothing here consumes the
   * return value because there isn't one — a hook that re-rendered nine spreads on
   * every mouse move would cost more than the effect it drives. See `usePointer`.
   */
  usePointer();

  return (
    <>
      <main>
        <Cover />
        <FirstLine />
        <Becoming />
        <TheFall />
        <TheTurn />
        <TheRun />
        <TheMachine />
        <TheEscape />
        <TheEnd />
      </main>

      {/* paper fibre sits above the ink, as it does on a real sheet */}
      <Paper />
    </>
  );
}
