import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './make.css';
import { artUrl, image, pose, url } from './art';
import { bandText, bandsIn, scramble } from './slices';
gsap.registerPlugin(ScrollTrigger);

/*
 * WHAT I DO — the scroll-tracked list (docs/study/MATVOYCE_PHONE.md §3d, in our ink).
 * The line nearest mid-screen is full ink, the rest ease to 10 %; the whole page ground
 * takes that line's pale wash; the boy pops onto the active line in the pose for that
 * craft (squash in, cycling at ~10 fps) and one prop pops at the other end of it.
 * Lines arrive through the band slicer; the eyebrow scrambles in.
 */
type Craft = { words: string[]; tint: string; frames: string[]; fps: number; prop: string; propW: number; tilt: number; scale: number };
const n8 = (k: string, c = 8) => Array.from({ length: c }, (_, i) => `${k}_${i}`);
const CRAFTS: Craft[] = [
  { words: ['CHARACTER', 'ANIMATION'], tint: '#e8eef0', frames: n8('roto'), fps: 10, prop: 'sparkle', propW: 0.55, tilt: -8, scale: 1 },
  { words: ['MOTION', 'DESIGN'], tint: '#edf1e4', frames: n8('paint', 4), fps: 6, prop: url('stick1_0'), propW: 0.8, tilt: 10, scale: 1.45 },
  { words: ['INTERFACES'], tint: '#f3eedc', frames: n8('sign', 4), fps: 3, prop: artUrl('sticker_spark'), propW: 0.7, tilt: -6, scale: 1 },
  { words: ['CREATIVE', 'CODE'], tint: '#ece8f1', frames: ['pencil1_2', 'pencil1_3', 'pencil1_4', 'pencil1_5'], fps: 8, prop: url('prop1_0'), propW: 0.45, tilt: 28, scale: 1.2 },
];
const SPARKLE = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 1 C22 14 26 18 39 20 C26 22 22 26 20 39 C18 26 14 22 1 20 C14 18 18 14 20 1Z" fill="#efe9dc" stroke="#1b1714" stroke-width="2.4" stroke-linejoin="round"/></svg>`;

export function initMake() {
  const root = document.querySelector<HTMLElement>('#make');
  if (!root) return;
  root.innerHTML = `<div class="mk-tint" aria-hidden="true"></div>
  <p class="mk-eyebrow"><span class="mk-dot"></span><span class="mk-eb">What I do</span></p>
  <ol class="mk-list">${CRAFTS.map((c, i) => `<li class="mk-item" data-i="${i}"><span class="mk-num">0${i + 1}</span><h3 class="mk-line" aria-label="${c.words.join(' ').toLowerCase()}">${c.words.map((w) => `<span class="mk-w">${w}</span>`).join(' ')}</h3></li>`).join('')}</ol>
  <div class="mk-boy" aria-hidden="true"><canvas></canvas></div>
  <div class="mk-prop" aria-hidden="true"></div>`;

  const tint = root.querySelector<HTMLElement>('.mk-tint')!;
  const eb = root.querySelector<HTMLElement>('.mk-eb')!;
  const dot = root.querySelector<HTMLElement>('.mk-dot')!;
  const items = [...root.querySelectorAll<HTMLElement>('.mk-item')];
  const boyEl = root.querySelector<HTMLElement>('.mk-boy')!;
  const cv = boyEl.querySelector('canvas')!;
  const ctx = cv.getContext('2d')!;
  const propEl = root.querySelector<HTMLElement>('.mk-prop')!;
  CRAFTS.forEach((c) => c.frames.forEach((f) => image(f)));

  // the eyebrow scrambles in, the red dot pops
  eb.style.visibility = 'hidden';
  gsap.set(dot, { scale: 0 });
  ScrollTrigger.create({ trigger: root, start: 'top 80%', once: true, onEnter: () => { scramble(eb, 0.5); gsap.to(dot, { scale: 1, duration: 0.5, ease: 'back.out(3)', delay: 0.15 }); } });

  // each line arrives through the band slicer as it enters
  const lines = items.map((li) => {
    const words = [...li.querySelectorAll<HTMLElement>('.mk-w')];
    const letters = words.flatMap((w) => bandText(w));
    const num = li.querySelector<HTMLElement>('.mk-num')!;
    gsap.set(letters.flat(), { yPercent: 115 });
    num.style.visibility = 'hidden';
    const line = { li, words, letters, landed: false };
    ScrollTrigger.create({ trigger: li, start: 'top 90%', once: true, onEnter: () => { bandsIn(letters, { stagger: 0.035, jitter: 0.22 }).eventCallback('onComplete', () => { line.landed = true; }); scramble(num, 0.4); } });
    return line;
  });

  // the boy: drawn on a canvas so every pose stands on the same feet at the same height
  let active = -1, frame = 0, acc = 0, bob = 0;
  const S = { h: 100 };
  function sizeBoy() {
    const fs = parseFloat(getComputedStyle(items[0].querySelector('.mk-line')!).fontSize);
    S.h = fs * (innerWidth < 700 ? 1.9 : 1.75);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = S.h * 2.2, h = S.h * 1.7;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = `${w}px`; cv.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    propEl.style.width = `${fs * 1.2}px`;
  }
  function draw() {
    if (active < 0) return;
    const c = CRAFTS[active];
    const w = cv.width / Math.min(devicePixelRatio || 1, 2), h = cv.height / Math.min(devicePixelRatio || 1, 2);
    ctx.clearRect(0, 0, w, h);
    pose(ctx, c.frames[frame % c.frames.length], w * 0.5, h - 2 - Math.abs(bob), S.h * c.scale);
  }
  gsap.ticker.add((_t, dt) => {
    if (active < 0) return;
    const c = CRAFTS[active];
    acc += dt / 1000;
    if (acc > 1 / c.fps) { acc = 0; frame++; }
    bob = active === 1 || active === 0 ? Math.sin(performance.now() / 260) * S.h * 0.03 : 0;
    draw();
  });

  /** where the boy stands for a line: desktop at the end of the line, on its baseline;
   *  phone (two stacked words) on top of the shorter word, at its right end */
  function anchors(i: number) {
    const host = root!.getBoundingClientRect();
    const { words } = lines[i];
    const stacked = innerWidth < 700;
    const a = words[0].getBoundingClientRect(), b = words[words.length - 1].getBoundingClientRect();
    const fs = a.height;
    if (stacked) {
      return {
        boy: { x: Math.min(a.right - host.left - fs * 0.35, host.width - fs * 0.75), y: a.top - host.top + fs * 0.28 },
        prop: words.length > 1
          ? { x: Math.min(b.right - host.left + fs * 0.2, host.width - fs * 0.4), y: b.bottom - host.top - fs * 0.3 }
          : { x: a.left - host.left + fs * 0.4, y: a.top - host.top - fs * 0.12 },
      };
    }
    return {
      boy: { x: Math.min(b.right - host.left + fs * 0.85, innerWidth - host.left - S.h * 0.55), y: b.bottom - host.top - fs * 0.1 },
      prop: { x: a.left - host.left + fs * 0.12, y: a.top - host.top + fs * 0.02 },
    };
  }
  function place(i: number) {
    const p = anchors(i);
    gsap.set(boyEl, { x: p.boy.x, y: p.boy.y, xPercent: -50, yPercent: -100 });
    gsap.set(propEl, { x: p.prop.x, y: p.prop.y, xPercent: -50, yPercent: -50 });
  }

  let popTl: gsap.core.Timeline | null = null;
  function setActive(i: number) {
    if (i === active) return;
    const prev = active;
    items.forEach((li, k) => li.classList.toggle('out', i >= 0 && k !== i));
    items.forEach((li, k) => li.classList.toggle('on', k === i));
    root!.classList.toggle('lit', i >= 0);
    tint.style.backgroundColor = i >= 0 ? CRAFTS[i].tint : 'transparent';
    tint.style.opacity = i >= 0 ? '1' : '0';
    popTl?.kill();
    popTl = gsap.timeline();
    // the old pose squashes down into the line and is gone
    if (prev >= 0) {
      popTl.to(boyEl, { scaleX: 1.35, scaleY: 0, duration: 0.16, ease: 'power4.in' }, 0);
      popTl.to(propEl, { scale: 0, rotate: 0, duration: 0.16, ease: 'power4.in' }, 0);
    }
    active = i;
    if (i < 0) return;
    // the active line's bands give a small jolt as the ink lands
    // (its own tweens, so a quick line change never leaves the bands sheared)
    if (lines[i].landed) lines[i].letters.forEach((bands, li) => bands.forEach((b) => gsap.fromTo(b, { yPercent: gsap.utils.random(-14, 14) }, { yPercent: 0, duration: 0.4, ease: 'power4.out', overwrite: true, delay: (prev >= 0 ? 0.12 : 0) + li * 0.012 })));
    const c = CRAFTS[i];
    popTl.add(() => {
      frame = 0; acc = 0; place(i); draw();
      propEl.innerHTML = c.prop === 'sparkle' ? SPARKLE : `<img src="${c.prop}" alt="">`;
      propEl.style.width = `${parseFloat(getComputedStyle(lines[i].words[0]).fontSize) * c.propW}px`;
    }, prev >= 0 ? 0.16 : 0);
    // squash pop: from nothing, flattened and wide → tall and thin → settled
    popTl.fromTo(boyEl, { scaleX: 1.5, scaleY: 0 }, { scaleX: 0.82, scaleY: 1.22, duration: 0.16, ease: 'power4.out' }, prev >= 0 ? 0.17 : 0.01)
      .to(boyEl, { scaleX: 1.12, scaleY: 0.88, duration: 0.12, ease: 'power4.inOut' })
      .to(boyEl, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.45)' });
    popTl.fromTo(propEl, { scale: 0, rotate: c.tilt - 40 }, { scale: 1, rotate: c.tilt, duration: 0.6, ease: 'back.out(2.6)' }, prev >= 0 ? 0.3 : 0.14);
  }

  // which line is nearest mid-screen (only while one is within reach of it)
  function pick() {
    const mid = innerHeight / 2;
    let best = -1, bd = Infinity;
    items.forEach((li, k) => {
      const r = li.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bd) { bd = d; best = k; }
    });
    setActive(bd < innerHeight * 0.32 ? best : -1);
  }
  // checked every frame (cheap: five rects) so it holds under pins, Lenis and native scroll alike
  gsap.ticker.add(() => {
    const r = root!.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) { if (active >= 0) setActive(-1); return; }
    pick();
  });
  ScrollTrigger.addEventListener('refresh', () => { sizeBoy(); if (active >= 0) place(active); });
  addEventListener('resize', () => { sizeBoy(); if (active >= 0) place(active); });
  sizeBoy();
  gsap.set([boyEl, propEl], { scale: 0, transformOrigin: '50% 100%' });
  gsap.set(propEl, { transformOrigin: '50% 50%' });

  // touch: a press squashes the boy (nothing depends on hover)
  boyEl.addEventListener('pointerdown', () => gsap.fromTo(boyEl, { scaleX: 1.2, scaleY: 0.8 }, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.4)' }));
}
