import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

/*
 * SLICES — the house signature (docs/study/MATVOYCE_FRAMES.md): nothing appears, it
 * arrives in horizontal bands that land at slightly different times. Every display word
 * on the site goes through bandText(); counters through slot(); small UI text scrambles.
 */

export const BANDS = 4;
const rand = gsap.utils.random;
const clip = (i: number, n = BANDS) => `inset(${(i * 100) / n - 0.6}% -10% ${100 - ((i + 1) * 100) / n - 0.6}% -10%)`;

/** split an element's text into letters, each cut into bands; returns bands per letter. Keeps an aria-label. */
export function bandText(el: HTMLElement, n = BANDS): HTMLElement[][] {
  if (el.dataset.banded) return [...el.querySelectorAll<HTMLElement>('.g')].map((g) => [...g.querySelectorAll<HTMLElement>('.band')]);
  el.dataset.banded = '1';
  const text = el.textContent ?? '';
  if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', text.trim());
  el.textContent = '';
  const letters: HTMLElement[][] = [];
  for (const ch of text) {
    if (ch === ' ') { el.append(' '); continue; }
    if (ch === '\n') { el.append(document.createElement('br')); continue; }
    const g = document.createElement('span');
    g.className = 'g';
    g.setAttribute('aria-hidden', 'true');
    const ghost = document.createElement('span');
    ghost.className = 'ghost';
    ghost.textContent = ch;
    g.appendChild(ghost);
    const bands: HTMLElement[] = [];
    for (let i = 0; i < n; i++) {
      const b = document.createElement('span');
      b.className = 'band';
      b.textContent = ch;
      b.style.clipPath = clip(i, n);
      g.appendChild(b);
      bands.push(b);
    }
    el.appendChild(g);
    letters.push(bands);
  }
  return letters;
}

/** bands rise into place from below, letters out of sync (the name, section titles) */
export function bandsIn(letters: HTMLElement[][], o: { stagger?: number; jitter?: number; from?: number } = {}) {
  const tl = gsap.timeline();
  letters.forEach((bands, li) => bands.forEach((b) => tl.fromTo(b, { yPercent: o.from ?? 115 }, { yPercent: 0, duration: rand(0.55, 0.85), ease: 'expo.out' }, li * (o.stagger ?? 0.045) + rand(0, o.jitter ?? 0.3))));
  return tl;
}
/** bands drop out downward */
export function bandsOut(letters: HTMLElement[][]) {
  const tl = gsap.timeline();
  letters.forEach((bands, li) => bands.forEach((b, bi) => tl.to(b, { yPercent: 130, duration: 0.45, ease: 'power3.in' }, li * 0.03 + bi * 0.025)));
  return tl;
}
/** any element with [data-slice]: its text arrives in bands when it scrolls into view (once) */
export function sliceOnEnter(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-slice]').forEach((el) => {
    const letters = bandText(el);
    gsap.set(letters.flat(), { yPercent: 115 });
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => { bandsIn(letters, { stagger: 0.03, jitter: 0.25 }); } });
  });
}

/** a counter digit: bands, each a strip of 0-9 that rolls with its own lag */
export function slot() {
  const s = document.createElement('div');
  s.className = 'slot';
  const strips: HTMLElement[] = [];
  for (let i = 0; i < BANDS; i++) {
    const b = document.createElement('div');
    b.className = 'band';
    b.style.clipPath = `inset(${(i * 100) / BANDS - 0.6}% 0 ${100 - ((i + 1) * 100) / BANDS - 0.6}% 0)`;
    const strip = document.createElement('div');
    strip.className = 'strip';
    strip.innerHTML = Array.from({ length: 10 }, (_, k) => `<span>${k}</span>`).join('');
    b.appendChild(strip);
    s.appendChild(b);
    strips.push(strip);
  }
  return { el: s, strips };
}

/** text scramble: random glyphs settle into the real text, left to right */
export function scramble(el: HTMLElement, dur = 0.45) {
  const html = el.innerHTML;
  const text = el.textContent ?? '';
  const glyphs = '#%&*+=<>/\\|_-~';
  const o = { p: 0 };
  return gsap.to(o, {
    p: 1, duration: dur, ease: 'none',
    onStart: () => { el.style.visibility = 'visible'; },
    onUpdate: () => {
      const n = Math.floor(o.p * text.length);
      el.textContent = text.slice(0, n) + Array.from(text.slice(n), (c) => (c === ' ' ? c : glyphs[(Math.random() * glyphs.length) | 0])).join('').slice(0, Math.round((text.length - n) * Math.min(1, o.p * 3)));
    },
    onComplete: () => { el.innerHTML = html; },
  });
}

/** a word that rolls letter by letter to another word (MENU → CLOSE), each letter in its own clip */
export function rollWord(el: HTMLElement, to: string, dur = 0.5) {
  const from = el.textContent ?? '';
  const len = Math.max(from.length, to.length);
  el.textContent = '';
  el.style.display = 'inline-flex';
  const cells = Array.from({ length: len }, (_, i) => {
    const c = document.createElement('span');
    c.style.cssText = 'display:inline-block;overflow:hidden;height:1em;line-height:1;vertical-align:bottom';
    const col = document.createElement('span');
    col.style.cssText = 'display:flex;flex-direction:column';
    col.innerHTML = `<span>${from[i] ?? '&nbsp;'}</span><span>${to[i] ?? '&nbsp;'}</span>`;
    c.appendChild(col);
    el.appendChild(c);
    return col;
  });
  return gsap.to(cells, { yPercent: -50, duration: dur, ease: 'power4.inOut', stagger: 0.04, onComplete: () => { el.textContent = to; el.style.display = ''; } });
}
