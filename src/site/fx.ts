import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

/*
 * FX — the page's own physics (round 36, the owner: "crazy motions").
 *   boil      big type and stickers wobble like hand-drawn ink, 8 frames a second
 *   lean      big type leans toward the cursor in 3D (desktop)
 *   rubber    fast scrolling stretches and skews the whole page; it snaps back
 *   slam      each section lands with a camera punch as it arrives
 *   shock     every press sends one ring out and punches what was pressed
 *   grain     a living paper grain over everything
 * Reduced motion: none of it.
 */

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/** one SVG filter, its noise reseeded 8 times a second: the hand-drawn boil */
function boil() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `<filter id="fx-boil" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="1" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  document.body.appendChild(svg);
  const turb = svg.querySelector('feTurbulence')!;
  let seed = 1;
  setInterval(() => { seed = (seed % 3) + 1; turb.setAttribute('seed', String(seed)); }, 125);
}
const BOIL = '[data-boil], h1, [class*="hero"] h1, [class*="logo"] img, img[src*="sticker"], img[src*="logo_"]';

/** big type leans toward the cursor */
function lean(els: HTMLElement[]) {
  if (!fine) return;
  for (const el of els) {
    gsap.set(el, { transformPerspective: 1200 });
    const rx = gsap.quickTo(el, 'rotateX', { duration: 0.9, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotateY', { duration: 0.9, ease: 'power3.out' });
    addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      ry(((e.clientX - (r.left + r.width / 2)) / innerWidth) * 14);
      rx(-((e.clientY - (r.top + r.height / 2)) / innerHeight) * 10);
    });
  }
}

/** fast scrolling stretches and skews the big type and pictures; they snap back with a wobble
 *  (never the page wrapper or a pinned section: a transform there would break the pins) */
function rubber() {
  const els = [...document.querySelectorAll<HTMLElement>('h1, h2, [data-skew], main section img')].filter((el) => !el.closest('.pin-spacer'));
  if (!els.length) return;
  const skew = gsap.quickTo(els, 'skewY', { duration: 0.35, ease: 'power3.out' });
  const sy = gsap.quickTo(els, 'scaleY', { duration: 0.35, ease: 'power3.out' });
  let settle: gsap.core.Tween | null = null;
  ScrollTrigger.create({
    onUpdate: (s) => {
      const v = gsap.utils.clamp(-1, 1, s.getVelocity() / 4500);
      skew(v * -4);
      sy(1 + Math.abs(v) * 0.08);
      settle?.kill();
      settle = gsap.to(els, { skewY: 0, scaleY: 1, duration: 1.1, ease: 'elastic.out(1, 0.3)', delay: 0.12 });
    },
  });
}

/** each section lands with a camera punch */
function slam() {
  document.querySelectorAll<HTMLElement>('main > section, [data-slam]').forEach((sec, i) => {
    if (i === 0 || sec.closest('.pin-spacer') || sec.querySelector('.pin-spacer')) return;
    gsap.from(sec, {
      scale: 0.93, rotate: i % 2 ? 1.2 : -1.2, y: 60, transformOrigin: '50% 0%', duration: 1.1, ease: 'back.out(1.6)',
      scrollTrigger: { trigger: sec, start: 'top 92%', once: true },
    });
  });
}

/** every press sends one ring out and punches what was pressed */
function shock() {
  addEventListener('pointerdown', (e) => {
    const ring = document.createElement('div');
    ring.className = 'fx-ring';
    ring.style.left = `${e.clientX}px`;
    ring.style.top = `${e.clientY}px`;
    document.body.appendChild(ring);
    gsap.fromTo(ring, { scale: 0, opacity: 0.9 }, { scale: 1, opacity: 0, duration: 0.7, ease: 'expo.out', onComplete: () => ring.remove() });
    const hit = (e.target as Element | null)?.closest?.('a, button, [role="button"], img, [data-piece]') as HTMLElement | null;
    if (hit && !hit.closest('iframe')) gsap.fromTo(hit, { scale: 0.94 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.35)', overwrite: 'auto' });
  });
}

/** a living paper grain over everything */
function grain() {
  const g = document.createElement('div');
  g.className = 'fx-grain';
  g.setAttribute('aria-hidden', 'true');
  document.body.appendChild(g);
}

export function startFx() {
  if (reduced) return;
  boil();
  const big = [...document.querySelectorAll<HTMLElement>(BOIL)];
  big.forEach((el) => el.classList.add('fx-boil'));
  lean([...document.querySelectorAll<HTMLElement>('[data-boil], h1')]);
  rubber();
  slam();
  shock();
  grain();
}
