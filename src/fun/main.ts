import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './fun.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initBoil } from './boil';
import { Boy } from './boy';
import { CARD_POSES, initCard } from './card';
import { HERO_POSES, initHero } from './hero';
import { stickerUrl } from './stickers';
gsap.registerPlugin(ScrollTrigger);

/*
 * FUN — the opening screen and one card. Smooth wheel on fine pointers, native scrolling on phones.
 * Nothing starts until the type, his drawings and the stickers are in, so the first thing you see is
 * already moving properly.
 */
const fine = matchMedia('(pointer: fine)').matches;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
initBoil(calm);

const lenis = fine ? new Lenis({ duration: 1.1, smoothWheel: true }) : null;
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

const hero = initHero(document.querySelector<HTMLElement>('.hero')!, fine);
const card = initCard(document.querySelector<HTMLElement>('.card')!, fine);

// the section title: every letter pops up on its own, in a random order (words stay whole when it wraps)
const title = document.querySelector<HTMLElement>('[data-pop]')!;
const chars: HTMLElement[] = [];
const words = (title.textContent ?? '').split(' ').map((w) => {
  const word = document.createElement('span');
  word.className = 'pw';
  for (const ch of w) { const s = document.createElement('span'); s.className = 'pc'; s.textContent = ch; word.append(s); chars.push(s); }
  return word;
});
title.replaceChildren(...words.flatMap((w, i) => (i ? [document.createTextNode(' '), w] : [w])));
gsap.set(chars, { yPercent: 120, rotation: () => gsap.utils.random(-40, 40), scale: 0.4, opacity: 0 });
ScrollTrigger.create({
  trigger: title, start: 'top 85%', once: true,
  onEnter: () => gsap.to(chars, { yPercent: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(2.2)', stagger: { each: 0.035, from: 'random' } }),
});

// the scroll ring turns; MENU rolls its letters when pressed
gsap.to('.badge svg', { rotation: 360, duration: 14, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
const menuWord = document.querySelector<HTMLElement>('.menu-word')!;
const menuChars = [...(menuWord.textContent ?? '')].map((ch) => { const s = document.createElement('span'); s.textContent = ch; s.style.display = 'inline-block'; return s; });
menuWord.replaceChildren(...menuChars);
document.querySelector('.menu')!.addEventListener('pointerdown', () => gsap.timeline()
  .to(menuChars, { yPercent: -120, duration: 0.18, ease: 'power2.in', stagger: 0.04 })
  .set(menuChars, { yPercent: 120 })
  .to(menuChars, { yPercent: 0, duration: 0.4, ease: 'back.out(2.4)', stagger: 0.04 }));

// start once the type, his drawings and the stickers are ready (but never wait more than 3 s)
const decode = (src: string) => { const im = new Image(); im.src = src; return im.decode().catch(() => undefined); };
const stickers = ['spark', 'sun', 'sparkle', 'inkpot', 'boombox', 'bolt', 'glove', 'flipbook', 'badge', 'stopwatch'].map((n) => stickerUrl(n)).filter(Boolean);
const ready = Promise.race([
  Promise.all([document.fonts.load('900 100px Anybody'), Boy.load([...HERO_POSES, ...CARD_POSES]), ...stickers.map(decode)]),
  new Promise((r) => setTimeout(r, 3000)),
]);
void ready.then(() => {
  hero.fit(); card.fit();
  hero.intro();
  ScrollTrigger.refresh();
});
let rw = innerWidth;
addEventListener('resize', () => {
  if (innerWidth === rw) return; // phone toolbars: ignore
  rw = innerWidth;
  hero.fit(); card.fit(); ScrollTrigger.refresh();
});
(window as unknown as { __fun: object }).__fun = { ready, gsap };
