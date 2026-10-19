import './interact.css';
import { initInteract } from './interact';
import { autoReveal } from './reveal';
import { startFx } from './fx';

/*
 * LIFE — starts the interaction kit and the scroll entrances once the site has
 * built its DOM (round 36). Import this once from src/site/main.ts, after the
 * sections are created: `import { startLife } from './life'; startLife();`
 */
export function startLife() {
  const go = () => { initInteract(); autoReveal(); startFx(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });
  else requestAnimationFrame(go);
}
