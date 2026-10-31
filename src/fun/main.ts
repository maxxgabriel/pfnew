import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './fun.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Boy } from './boy';
import { CARD_POSES, initCard } from './card';
import { HERO_POSES, initHero } from './hero';
gsap.registerPlugin(ScrollTrigger);

/*
 * FUN — the mock for choosing a look: the opening screen and one card. Same choreography in both
 * looks (?look=pop | ?look=candy, or the switch at the bottom). Smooth wheel on fine pointers,
 * native scrolling on phones. Nothing starts until the fonts and his drawings are in, so the first
 * thing you see is already moving properly.
 */
const html = document.documentElement;
const fine = matchMedia('(pointer: fine)').matches;
const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;

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

// the scroll badge turns, its arrow bobs; MENU rolls its letters when pressed
gsap.to('.badge svg', { rotation: 360, duration: 14, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
gsap.to('.badge i', { y: 6, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' });
const menuWord = document.querySelector<HTMLElement>('.menu-word')!;
const menuChars = [...(menuWord.textContent ?? '')].map((ch) => { const s = document.createElement('span'); s.textContent = ch; s.style.display = 'inline-block'; return s; });
menuWord.replaceChildren(...menuChars);
document.querySelector('.menu')!.addEventListener('pointerdown', () => gsap.timeline()
  .to(menuChars, { yPercent: -120, duration: 0.18, ease: 'power2.in', stagger: 0.04 })
  .set(menuChars, { yPercent: 120 })
  .to(menuChars, { yPercent: 0, duration: 0.4, ease: 'back.out(2.4)', stagger: 0.04 }));
gsap.set(chars, { yPercent: 120, rotation: () => gsap.utils.random(-40, 40), scale: 0.4, opacity: 0 });
ScrollTrigger.create({
  trigger: title, start: 'top 85%', once: true,
  onEnter: () => gsap.to(chars, { yPercent: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(2.2)', stagger: { each: 0.035, from: 'random' } }),
});

// the look switch
function setLook(look: string) {
  html.dataset.look = look;
  document.querySelectorAll<HTMLButtonElement>('.looks button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.look === look)));
  theme.content = getComputedStyle(html).getPropertyValue('--bg').trim() || '#fbf7ef';
  const u = new URL(location.href);
  u.searchParams.set('look', look);
  history.replaceState(null, '', u);
}
const fonts = () => Promise.all([document.fonts.load('900 100px Anybody'), document.fonts.load('700 100px Fredoka')]);
document.querySelectorAll<HTMLButtonElement>('.looks button').forEach((b) => b.addEventListener('click', () => {
  setLook(b.dataset.look ?? 'pop');
  void fonts().then(() => { hero.fit(); card.fit(); });
}));
setLook(new URLSearchParams(location.search).get('look') === 'candy' ? 'candy' : 'pop');

// start once the type and his drawings are ready (but never wait more than 2.5 s)
const ready = Promise.race([Promise.all([fonts(), Boy.load([...HERO_POSES, ...CARD_POSES])]), new Promise((r) => setTimeout(r, 2500))]);
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
(window as unknown as { __fun: object }).__fun = { ready, gsap, setLook };
