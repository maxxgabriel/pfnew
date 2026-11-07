import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './fun.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import Lenis from 'lenis';
import { initBoil } from './boil';
import { Boy } from './boy';
import { initComic } from './comic';
import { initContact } from './contact';
import { initFoot } from './foot';
import { initFx } from './fx';
import { HERO_POSES, initHero } from './hero';
import { calm, darkHeader, fine } from './kit';
import { initMenu } from './menu';
import { initSkills } from './skills';
import { stickerUrl } from './stickers';
import { initStyles } from './styles';
import { initUniverse, onUniverse } from './universe';
import { retypeset, visibleChars } from './kinetic';
import { initWork } from './work';
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/*
 * MAX GABRIEL — a fun site that never stops playing. In order: the name as a rubber playground,
 * six little loops, what I do (every word moves its own way), about as a comic page, one boy in seven
 * styles, say hi, and a graffiti footer.
 * Smooth wheel on fine pointers, native scrolling on phones. Nothing starts until the type, his
 * drawings and the stickers are in, so the first thing you see already moves properly.
 */
const q = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
initBoil(calm);
initFx();

const lenis = fine ? new Lenis({ duration: 1.1, smoothWheel: true }) : null;
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (t: number) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  gsap.ticker.lagSmoothing(0);
}
const go = (target: string) => {
  const el = target === '#top' ? 0 : q(target);
  if (lenis) lenis.scrollTo(el, { duration: 1.6 });
  else gsap.to(window, { scrollTo: el, duration: 1.2, ease: 'power3.inOut' });
};

const uni = initUniverse({ header: q('.top') });
const hero = initHero(q('.hero'));
const work = initWork(q('.work'));
initSkills(q('.skills'));
initComic(q('.comic'));
initStyles(q('.styles'));
initContact(q('.contact'));
initFoot(q('.foot'), () => go('#top'));
initMenu(go);
onUniverse((u) => { work.fit(); ScrollTrigger.refresh(); retypeset(visibleChars(), u, 0.05); });
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]:not(.menu-panel a):not(.up)').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); go(a.getAttribute('href') ?? '#top'); }));

// the header turns light over the dark sections
for (const s of ['.foot']) ScrollTrigger.create({ trigger: s, start: 'top 40px', end: 'bottom 40px', onToggle: (st) => darkHeader(s, st.isActive) });
new MutationObserver(() => document.documentElement.classList.toggle('menu-open', q('.menu').getAttribute('aria-expanded') === 'true')).observe(q('.menu'), { attributes: true });

// start once the type, his drawings and the stickers are ready (but never wait more than 3 s)
const decode = (src: string) => { const im = new Image(); im.src = src; return im.decode().catch(() => undefined); };
const fonts = ['900 100px Anybody', '100px Anton', '100px Bangers', '100px "Bebas Neue"', '900 100px Montserrat', '800 100px Jost'];
const poses = [...HERO_POSES, 'closeup_0', 'closeup_1', 'closeup_2', 'fall_3', 'curious', 'bye_0', 'bye_1', 'bye_2', 'bye_3', 'leap_3', ...Array.from({ length: 8 }, (_, i) => `run8_${i}`)];
const stickers = ['spark', 'sun', 'sparkle', 'inkpot', 'boombox', 'bolt', 'glove', 'shout', 'boing'].map((n) => stickerUrl(n));
const ready = Promise.race([
  Promise.all([...fonts.map((f) => document.fonts.load(f)), Boy.load(poses), ...stickers.map(decode)]),
  new Promise((r) => setTimeout(r, 3000)),
]);
void ready.then(() => {
  hero.fit(); work.fit();
  // the landing: ink, and a little after it settles, a stutter into pixel
  hero.intro().eventCallback('onComplete', () => gsap.delayedCall(2.4, () => uni.stutter('pixel')));
  ScrollTrigger.refresh();
});
let rw = innerWidth;
addEventListener('resize', () => {
  if (innerWidth === rw) return; // phone toolbars: ignore
  rw = innerWidth;
  hero.fit(); work.fit(); ScrollTrigger.refresh();
});
(window as unknown as { __fun: object }).__fun = { ready, gsap, go, hero, uni };
