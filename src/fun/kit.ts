import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

/*
 * The shared kit: one beat for the whole site (118 bpm, so pops land together even though there is
 * no music), text split into letters that keep their words whole, and the house moves: the pop
 * (in with a slight overshoot), the zoom punch, the shake, the glitch flash. Loops only run while
 * their section is on screen.
 */
export const BPM = 118, BEAT = 60 / BPM;
export const fine = matchMedia('(pointer: fine)').matches;
export const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** call fn(beatIndex) on every beat */
export function onBeat(fn: (n: number) => void) {
  let last = -1;
  const tick = (t: number) => { const n = Math.floor(t / BEAT); if (n !== last) { last = n; fn(n); } };
  gsap.ticker.add(tick);
  return () => gsap.ticker.remove(tick);
}

/** split an element's text into letter spans (words stay together so lines wrap between words) */
export function splitChars(el: HTMLElement, cls = 'ch') {
  const chars: HTMLElement[] = [];
  const walk = (node: Node): Node[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const out: Node[] = [];
      (node.textContent ?? '').split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { out.push(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w';
        for (const c of part) { const s = document.createElement('span'); s.className = cls; s.textContent = c; w.append(s); chars.push(s); }
        out.push(w);
      });
      return out;
    }
    if (node instanceof HTMLElement) { const kids = [...node.childNodes].flatMap(walk); node.replaceChildren(...kids); return [node]; }
    return [node];
  };
  el.replaceChildren(...[...el.childNodes].flatMap(walk));
  return chars;
}

/** letters pop in: up from below, a random tilt, a slight overshoot; random order */
export function popIn(chars: HTMLElement[], delay = 0) {
  return gsap.fromTo(chars, { yPercent: 115, rotation: () => gsap.utils.random(-35, 35), scale: 0.4, opacity: 0 },
    { yPercent: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.75, ease: 'back.out(2.2)', stagger: { each: 0.03, from: 'random' }, delay });
}
/** pop a heading's letters in when it scrolls into view */
export function popOnScroll(el: HTMLElement, start = 'top 85%') {
  const chars = splitChars(el, 'pc');
  gsap.set(chars, { yPercent: 115, opacity: 0 });
  ScrollTrigger.create({ trigger: el, start, once: true, onEnter: () => { popIn(chars); zoomPunch(el); } });
  return chars;
}

/** a zoom punch: snaps big, settles with a bounce */
export const zoomPunch = (el: Element, k = 1.12) => gsap.fromTo(el, { scale: k }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.1, 0.45)', overwrite: 'auto' });
/** camera shake */
export function shake(el: Element, px = 10, t = 0.35) {
  if (calm) return gsap.timeline();
  return gsap.fromTo(el, { x: 0, y: 0 }, { duration: t, ease: 'none', overwrite: 'auto',
    onUpdate() { const k = 1 - this.progress(); gsap.set(el, { x: gsap.utils.random(-px, px) * k, y: gsap.utils.random(-px, px) * k }); },
    onComplete: () => gsap.set(el, { x: 0, y: 0 }) });
}
/** a glitch flash across the whole screen: a few frames of sliced, colour-split bars */
export function glitchFlash(t = 0.32) {
  if (calm) return;
  const el = document.querySelector<HTMLElement>('.glitch-flash');
  if (!el) return;
  el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  gsap.delayedCall(t, () => el.classList.remove('go'));
}

/** the header turns light over dark ground; several parts of the page can ask at once */
const darkAsks = new Set<string>();
export function darkHeader(key: string, on: boolean) {
  if (on === darkAsks.has(key)) return;
  if (on) darkAsks.add(key); else darkAsks.delete(key);
  document.querySelector('.top')?.classList.toggle('on-dark', darkAsks.size > 0);
}

/** the house colours, for code that paints */
export const C = { paper: '#fbf7ef', ink: '#151311', hot: '#ff3d22', sun: '#ffd54a', cool: '#4fb6ff', mint: '#7fddb4' };

/** run start() while the element is on screen and stop() when it leaves (loops cost nothing off screen) */
export function whileVisible(el: Element, start: () => void, stop: () => void) {
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: '10% 0px' }).observe(el);
}
