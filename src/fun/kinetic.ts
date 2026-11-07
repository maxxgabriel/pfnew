import gsap from 'gsap';
import { MOTION, type Uni } from './universe';

/*
 * KINETIC TYPE — the letters are the layout, so a change of universe is a re-typesetting: the
 * letters already on screen tumble and land again in the new face, in the new world's way of
 * moving (stepped in pixel, bouncy in rubber hose, floating in watercolour).
 */
const rnd = gsap.utils.random;
export function retypeset(chars: HTMLElement[], uni: Uni, delay = 0) {
  if (!chars.length) return;
  const m = MOTION[uni];
  gsap.killTweensOf(chars);
  const ease = uni === 'pixel' ? 'steps(5)' : uni === 'water' ? 'sine.out' : uni === 'hose' ? 'elastic.out(1.3, 0.45)' : uni === 'clay' ? 'power2.out' : 'back.out(2.2)';
  gsap.fromTo(chars,
    { scale: uni === 'water' ? 1.15 : 0.45, rotation: () => (uni === 'pixel' ? (Math.random() < 0.5 ? -90 : 90) : rnd(-45, 45)), yPercent: () => rnd(-35, 35), opacity: uni === 'water' ? 0 : 1 },
    { scale: 1, rotation: 0, yPercent: 0, opacity: 1, duration: 0.75 / m.speed, ease, delay, stagger: { each: 0.025, from: 'random' }, overwrite: true, clearProps: 'opacity' });
}
/** every big letter currently on screen */
export function visibleChars(selector = '.pc, .skill, .card h3, .bubble, .cap, .sfx, .pill-text, .foot-name, .menu-panel a'): HTMLElement[] {
  const H = innerHeight;
  return [...document.querySelectorAll<HTMLElement>(selector)].filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > -H * 0.2 && r.top < H * 1.2; });
}
