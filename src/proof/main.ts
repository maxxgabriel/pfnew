import '@fontsource/permanent-marker';
import '@fontsource/inter/600.css';
import './proof.css';
import gsap from 'gsap';
import crouchUrl from '../assets/sketch/hero_1.webp?url';
import sitUrl from '../assets/sketch/headout_0.webp?url';

/*
 * PROOF — the opening only (docs/study/MATVOYCE_FRAMES.md, in our ink):
 *   silence → the tagline scrambles in → the counter rises from under the screen edge,
 *   stretched → it counts in steps, every digit rolling in bands → 100 sinks away →
 *   MAX / GABRIEL assemble in bands → the camera pushes → the boy drops onto the X and
 *   sits → the red Spark lands as the dot → the scroll chip.
 */

const BANDS = 4;
const rand = gsap.utils.random;

/** a word split into letters, each letter cut into horizontal bands that move on their own */
function bandWord(el: HTMLElement) {
  const word = el.dataset.word ?? '';
  const letters: HTMLElement[][] = [];
  for (const ch of word) {
    const g = document.createElement('span');
    g.className = 'g';
    g.innerHTML = `<span class="ghost">${ch}</span>`;
    const bands: HTMLElement[] = [];
    for (let i = 0; i < BANDS; i++) {
      const b = document.createElement('span');
      b.className = 'band';
      b.textContent = ch;
      // overlap the bands by a hair so no seam shows once they land
      b.style.clipPath = `inset(${(i * 100) / BANDS - 0.6}% -10% ${100 - ((i + 1) * 100) / BANDS - 0.6}% -10%)`;
      g.appendChild(b);
      bands.push(b);
    }
    el.appendChild(g);
    letters.push(bands);
  }
  return letters;
}

/** a counter digit: four bands, each a strip of 0-9 that rolls to the digit with its own lag */
function slot() {
  const s = document.createElement('div');
  s.className = 'slot';
  const strips: HTMLElement[] = [];
  for (let i = 0; i < BANDS; i++) {
    const b = document.createElement('div');
    b.className = 'band';
    b.style.clipPath = `inset(${(i * 100) / BANDS - 0.6}% 0 ${100 - ((i + 1) * 100) / BANDS - 0.6}% 0)`;
    const strip = document.createElement('div');
    strip.className = 'strip';
    strip.innerHTML = Array.from({ length: 10 }, (_, n) => `<span>${n}</span>`).join('');
    b.appendChild(strip);
    s.appendChild(b);
    strips.push(strip);
  }
  return { el: s, strips };
}

/** text scramble: random glyphs settle into the real text, left to right */
function scramble(el: HTMLElement, dur = 0.5) {
  const html = el.innerHTML;
  const text = el.textContent ?? '';
  const glyphs = '#%&*+=<>/\\|_-~';
  const o = { p: 0 };
  return gsap.to(o, {
    p: 1, duration: dur, ease: 'none',
    onStart: () => { el.style.visibility = 'visible'; },
    onUpdate: () => {
      const n = Math.floor(o.p * text.length);
      el.textContent = text.slice(0, n) + Array.from(text.slice(n), (c) => (c === ' ' || c === '\n' ? c : glyphs[(Math.random() * glyphs.length) | 0])).join('').slice(0, Math.max(0, Math.round((text.length - n) * Math.min(1, o.p * 3))));
    },
    onComplete: () => { el.innerHTML = html; },
  });
}

const counter = document.querySelector<HTMLElement>('.counter')!;
const slots = [slot(), slot(), slot()];
slots.forEach((s) => counter.appendChild(s.el));
const setDigits = (value: number, tl: gsap.core.Timeline, at: number) => {
  const d = String(value).padStart(3, '0');
  slots.forEach((s, i) => s.strips.forEach((strip, b) => {
    // every band rolls to the digit with its own small lag: the digit shears, then snaps clean
    tl.to(strip, { yPercent: -Number(d[i]) * 10, duration: 0.42, ease: 'power3.inOut' }, at + i * 0.03 + b * rand(0.01, 0.05));
  }));
};

const max = bandWord(document.querySelector<HTMLElement>('.line-max .word')!);
const gab = bandWord(document.querySelector<HTMLElement>('.line-gab .word')!);
const allBands = [...max, ...gab];
const lineMax = document.querySelector<HTMLElement>('.line-max')!;
const lineGab = document.querySelector<HTMLElement>('.line-gab')!;
const spark = document.querySelector<HTMLElement>('.spark')!;
const boy = document.querySelector<HTMLImageElement>('.boy')!;
const chip = document.querySelector<HTMLElement>('.chip')!;
const menuWord = document.querySelector<HTMLElement>('.menu-word')!;
boy.src = crouchUrl;
new Image().src = sitUrl;

document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => { el.style.visibility = 'hidden'; });
gsap.set(allBands.flat(), { yPercent: 115 });
gsap.set(counter, { yPercent: 100 });
gsap.set(menuWord, { clipPath: 'inset(0 100% 0 0)' });
// before the push the two lines sit smaller and closer to the centre
gsap.set(lineMax, { scale: 0.72, x: () => innerWidth * 0.12, y: () => innerHeight * 0.1, transformOrigin: '0% 0%' });
gsap.set(lineGab, { scale: 0.72, x: () => -innerWidth * 0.1, y: () => -innerHeight * 0.08, transformOrigin: '100% 100%' });

/** where the boy sits: on the top of the X of MAX */
function boySeat() {
  const x = max[2][0].parentElement!.getBoundingClientRect();
  const hero = document.querySelector('.hero')!.getBoundingClientRect();
  const bw = boy.getBoundingClientRect().width || 150;
  return { left: x.left + x.width * 0.5 - bw * 0.5 - hero.left, top: x.top - hero.top + x.height * 0.12 - bw * 1.05 };
}

async function play() {
  await document.fonts.ready;
  const tl = gsap.timeline({ delay: 0.9 });

  // 1. the tagline and place scramble in
  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el, i) => tl.add(scramble(el, 0.45), 0.05 + i * 0.12));

  // 2. the counter rises from under the bottom edge, stretched tall, digits staggered
  slots.forEach((s, i) => tl.fromTo(s.el, { yPercent: 70, scaleY: 1.45, scaleX: 0.86 }, { yPercent: 0, scaleY: 1, scaleX: 1, duration: 0.95, ease: 'expo.out' }, 0.2 + i * 0.09));
  tl.to(counter, { yPercent: 0, duration: 0.01 }, 0.2);
  // the whole block drifts up a little while it counts: nothing is ever still
  tl.to(counter, { y: () => -innerHeight * 0.05, duration: 5.2, ease: 'none' }, 0.6);

  // 3. it counts in steps and holds: 000 → 035 → 070 → 100
  let at = 1.25;
  for (const v of [12, 23, 35]) { setDigits(v, tl, at); at += 0.16; }
  at += 0.75;
  for (const v of [48, 59, 70]) { setDigits(v, tl, at); at += 0.16; }
  at += 0.7;
  for (const v of [84, 92, 100]) { setDigits(v, tl, at); at += 0.16; }
  at += 0.55;

  // 4. 100 sinks out through the bottom edge in bands; the header's MENU wipes on in steps
  slots.forEach((s, i) => s.strips.forEach((strip, b) => tl.to(strip.parentElement, { yPercent: 130, duration: 0.5, ease: 'power3.in' }, at + i * 0.04 + b * 0.03)));
  tl.to(menuWord, { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'steps(5)' }, at + 0.1);

  // 5. MAX / GABRIEL assemble band by band, letters out of sync
  const start = at + 0.18;
  allBands.forEach((bands, li) => bands.forEach((b) => tl.to(b, { yPercent: 0, duration: rand(0.55, 0.85), ease: 'expo.out' }, start + li * 0.045 + rand(0, 0.32))));
  at = start + 1.25;

  // 6. the camera push: the lines grow and spread to the edges
  tl.to([lineMax, lineGab], { scale: 1, x: 0, y: 0, duration: 0.85, ease: 'power3.inOut' }, at);
  at += 0.62;

  // 7. the boy drops onto the X, squashes, and sits; the red Spark lands as the dot
  tl.add(() => { const s = boySeat(); gsap.set(boy, { left: s.left, top: s.top, opacity: 1, y: -innerHeight, scaleY: 1.25, scaleX: 0.85 }); }, at);
  tl.to(boy, { y: 0, duration: 0.42, ease: 'power3.in' }, at);
  tl.to(boy, { scaleY: 0.72, scaleX: 1.25, duration: 0.08, ease: 'power1.out' }, at + 0.42);
  tl.add(() => { boy.src = sitUrl; }, at + 0.62);
  tl.to(boy, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.35)' }, at + 0.5);
  tl.to(lineMax, { y: 10, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.out' }, at + 0.42);
  tl.add(() => { const x = max[2][0].parentElement!.getBoundingClientRect(); gsap.set(spark, { left: x.right + x.width * 0.04, top: x.bottom - x.height * 0.42 }); }, at + 0.7);
  tl.fromTo(spark, { scale: 0, y: -innerHeight * 0.5 }, { scale: 1, y: 0, duration: 0.55, ease: 'bounce.out' }, at + 0.75);

  // 8. the scroll chip pops in
  tl.fromTo(chip, { opacity: 0, scale: 0.6, rotate: -6 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.2)' }, at + 1.2);

  // after: the boy breathes on the clock
  tl.add(() => { gsap.to(boy, { scaleY: 1.03, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }); }, at + 1.4);
}
void play();
