import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onBeat, whileVisible } from './kit';
import './bands.css';

/*
 * Two bands of words crossing like tape over the page: red going left, black going right. They run
 * on their own, run faster (and turn round) when you scroll, and on every beat one word punches up
 * a size with a slight overshoot.
 */
export function initBands(root: HTMLElement) {
  const runs = [...root.querySelectorAll<HTMLElement>('.band-run')];
  const tweens = runs.map((run, b) => {
    const words = (run.dataset.words ?? '').split('|');
    const set = () => words.flatMap((w, i) => [`<span class="wd${i % 2 && b ? ' out' : ''}">${w}</span>`, '<span class="sep" aria-hidden="true">★</span>']).join('');
    run.innerHTML = `<span class="half">${set()}</span><span class="half" aria-hidden="true">${set()}</span>`;
    return gsap.fromTo(run, { xPercent: b ? -50 : 0 }, { xPercent: b ? 0 : -50, duration: 26, ease: 'none', repeat: -1 });
  });
  // the scroll pushes them, in its own direction
  let boost = 0, dir = 1;
  ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onUpdate: (s) => { boost = Math.min(6, Math.abs(s.getVelocity()) / 350); dir = s.direction; } });
  gsap.ticker.add(() => {
    boost *= 0.92;
    for (const t of tweens) t.timeScale(dir * (1 + boost));
  });
  // a word punches on every beat
  const words = [...root.querySelectorAll<HTMLElement>('.band-a .half:first-child .wd, .band-b .half:first-child .wd')];
  let stop = () => {};
  whileVisible(root, () => {
    stop = onBeat((n) => {
      const w = words[n % words.length];
      gsap.fromTo(w, { scale: 1.22, rotation: n % 2 ? -3 : 3 }, { scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(3)', overwrite: true });
    });
  }, () => stop());
}
