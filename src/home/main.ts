import '@fontsource/permanent-marker';
import '@fontsource/caveat-brush';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './base.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initHero } from './hero';
import { initWork } from './work';
import { initMake } from './make';
import { initStyles } from './styles';
import { initContact } from './contact';
import { initFooter } from './footer';
import { initMenu } from './menu';
import { initCursor } from './cursor';
import { initWipe } from './wipe';
import { sliceOnEnter } from './slices';
gsap.registerPlugin(ScrollTrigger);

/*
 * HOME — Max Gabriel's portfolio (round 39). Structure and motion from the frame study
 * (docs/study/MATVOYCE_*.md), made our way: sumi ink on paper, one red Spark, the ink boy.
 * Smooth scroll on fine pointers only; phones scroll natively (as the reference does).
 */
const touch = matchMedia('(pointer: coarse)').matches;
export const lenis = touch ? null : new Lenis({ duration: 1.1, smoothWheel: true });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
/** scroll to a section (menu, logo, chip) */
export function go(target: string | number) {
  if (lenis) lenis.scrollTo(target, { duration: 1.4 });
  else if (typeof target === 'number') scrollTo({ top: target, behavior: 'smooth' });
  else document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
}

initWork(); initMake(); initStyles(); initContact(); initFooter(); initMenu(); initCursor(); initWipe();
sliceOnEnter();
// the hero owns the opening (preloader, name, boy); scrolling is locked until it lands
void initHero({ lock: (on) => { if (on) { lenis?.stop(); document.documentElement.style.overflow = 'hidden'; } else { document.documentElement.style.overflow = ''; lenis?.start(); ScrollTrigger.refresh(); } } });
addEventListener('load', () => ScrollTrigger.refresh());
(window as unknown as { __home: object }).__home = { go, gsap, ScrollTrigger };
