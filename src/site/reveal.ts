import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

/*
 * REVEAL — the scroll entrances for everything that has none of its own
 * (round 36). Opt in with a data attribute, or let autoReveal() give plain
 * headings, paragraphs, images and lists a sensible default.
 *   data-reveal="lines"   lines rise out of a mask, staggered
 *   data-reveal="chars"   letters slam up with a little rotation (big type)
 *   data-reveal="pop"     stickers spring in with a twist
 *   data-reveal="wipe"    an image is uncovered by a sweeping clip
 *   data-reveal="fade"    a quiet rise and fade
 *   data-parallax="0.2"   drifts against the scroll by that fraction
 *   data-skew             leans with the scroll speed
 * Every entrance plays once; reduced motion shows everything at rest.
 */

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const seen = new WeakSet<Element>();

function words(el: HTMLElement) {
  if (el.dataset.split) return [...el.querySelectorAll<HTMLElement>('.rv-in')];
  el.dataset.split = '1';
  const parts = (el.textContent ?? '').split(/(\s+)/);
  el.setAttribute('aria-label', (el.textContent ?? '').trim());
  el.textContent = '';
  const out: HTMLElement[] = [];
  for (const p of parts) {
    if (/^\s+$/.test(p)) { el.append(p); continue; }
    const mask = document.createElement('span');
    mask.className = 'rv-mask';
    mask.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.className = 'rv-in';
    inner.textContent = p;
    mask.appendChild(inner);
    el.appendChild(mask);
    out.push(inner);
  }
  return out;
}

function chars(el: HTMLElement) {
  const text = el.textContent ?? '';
  el.setAttribute('aria-label', text.trim());
  el.textContent = '';
  return [...text].map((c) => {
    const s = document.createElement('span');
    s.className = 'rv-ch';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = c === ' ' ? ' ' : c;
    el.appendChild(s);
    return s;
  });
}

const at = (el: Element) => ({ trigger: el, start: 'top 88%', once: true });

const KINDS: Record<string, (el: HTMLElement) => void> = {
  lines: (el) => gsap.from(el.children.length ? [el] : words(el), { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.035, scrollTrigger: at(el) }),
  chars: (el) => gsap.from(chars(el), { yPercent: 120, rotate: () => gsap.utils.random(-14, 14), duration: 0.8, ease: 'back.out(2)', stagger: 0.03, scrollTrigger: at(el) }),
  pop: (el) => gsap.from(el, { scale: 0, rotate: () => gsap.utils.random(-40, 40), duration: 0.9, ease: 'elastic.out(1.1, 0.45)', scrollTrigger: at(el) }),
  wipe: (el) => gsap.fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'expo.inOut', scrollTrigger: at(el) }),
  fade: (el) => gsap.from(el, { y: 28, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: at(el) }),
};

function reveal(el: HTMLElement, kind: string) {
  if (seen.has(el) || reduced) return;
  seen.add(el);
  (KINDS[kind] ?? KINDS.fade)(el);
}

/** leave anything that already animates alone: only quiet, un-animated elements get a default */
const BUSY = '[data-reveal], [data-no-reveal], .ix-roll, .ix-ch, .rv-mask, [style*="transform"], header *, .loader *, [class*="marquee"] *, [class*="hero"] *';
const DEFAULTS: [string, string][] = [
  ['main h2, main h3', 'lines'],
  ['main p', 'fade'],
  ['main img:not([src*="sticker"])', 'fade'],
  ['main img[src*="sticker"], [class*="sticker"]', 'pop'],
  ['main li', 'fade'],
];

export function autoReveal(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => reveal(el, el.dataset.reveal ?? 'fade'));
  for (const [sel, k] of DEFAULTS) root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
    // splitting text would wipe out a heading's lettering image or inner markup: plain-text elements only
    const kind = k === 'lines' && (el.children.length || el.dataset.art) ? 'fade' : k;
    if (!el.matches(BUSY) && !el.closest('[data-no-reveal]')) reveal(el, kind);
  });
  if (reduced) return;
  root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    const f = parseFloat(el.dataset.parallax ?? '0.2');
    gsap.to(el, { yPercent: -100 * f, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  const skews = [...root.querySelectorAll<HTMLElement>('[data-skew]')].filter((el) => !seen.has(el));
  if (skews.length) {
    skews.forEach((el) => seen.add(el));
    const set = gsap.quickTo(skews, 'skewY', { duration: 0.5, ease: 'power3.out' });
    ScrollTrigger.create({ onUpdate: (s) => set(gsap.utils.clamp(-7, 7, s.getVelocity() / -300)) });
  }
}
