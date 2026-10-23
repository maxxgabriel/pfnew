import gsap from 'gsap';
import './menu.css';
import { url } from './art';
import manifest from '../assets/sketch/manifest.json';
import { bandText, rollWord, scramble } from './slices';
import { leaveTo } from './wipe';

/*
 * MENU — full-screen overlay in the page colour (docs/study/MATVOYCE_PHONE.md §4, in ink).
 * Open ≈0.65 s: the paper fades in (0.45 s, ease-in-out-quart) while the five lines rise
 * through their clips 70 ms apart, MENU rolls letter by letter to CLOSE and the + turns
 * to ×. Close ≈0.3 s: one plain fade, no stagger. Each line has the boy beside it in a
 * pose for that place, cycling at 10 fps: he pops out on hover (fine pointers) or on
 * press (touch); on phones the SAY HI boy waves once the menu has landed, so the page is
 * never without him. Esc closes, focus stays inside, the film line leaves through the wipe.
 */
type Line = { label: string; to: string; poses: string[]; fps: number; note: string };
const LINES: Line[] = [
  { label: 'WORK', to: '#work', poses: Array.from({ length: 8 }, (_, i) => `sprint8_${i}`), fps: 12, note: 'six pieces' },
  { label: 'WHAT I DO', to: '#make', poses: ['ib_offer_0', 'ib_offer_1'], fps: 4, note: 'four crafts' },
  { label: 'STYLES', to: '#styles', poses: ['home_3', 'pixel-home_3', 'water-home_3', 'clay-home_3', 'comic-home_3', 'hose-home_3'], fps: 5, note: 'seven ways' },
  { label: 'THE FILM', to: './film.html', poses: ['leap_0', 'leap_1', 'leap_2', 'leap_3'], fps: 8, note: 'the sketch' },
  { label: 'SAY HI', to: '#contact', poses: ['bye_0', 'bye_1', 'bye_2', 'bye_3'], fps: 8, note: 'hello' },
];
const SPARK = '<svg class="mn-spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C13 8.2 15.8 11 24 12 15.8 13 13 15.8 12 24 11 15.8 8.2 13 0 12 8.2 11 11 8.2 12 0Z"/></svg>';
const meta = manifest as Record<string, { w: number; h: number; foot: number[] }>;
/** show a pose with its feet planted on the same spot every frame (canvases differ in size and margin) */
const setPose = (img: HTMLImageElement, key: string) => {
  const m = meta[key];
  img.src = url(key);
  if (!m) return;
  img.style.setProperty('--fx', String(m.foot[0] / m.h));
  img.style.setProperty('--fy', String((m.h - m.foot[1]) / m.h));
};
const fine = matchMedia('(hover: hover) and (pointer: fine)');

export function initMenu() {
  const menu = document.querySelector<HTMLElement>('#menu');
  const btn = document.querySelector<HTMLButtonElement>('.hd-menu');
  if (!menu || !btn) return;
  const word = btn.querySelector<HTMLElement>('.menu-word')!;
  const plus = btn.querySelector<HTMLElement>('.menu-plus')!;
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-modal', 'true');
  menu.setAttribute('aria-label', 'Menu');
  menu.setAttribute('data-lenis-prevent', '');
  menu.innerHTML = `
    <p class="mn-top"><span class="mn-hand">where to?</span>${SPARK}</p>
    <nav class="mn-list" aria-label="Sections">
      ${LINES.map((l, i) => `<div class="mn-clip"><a class="mn-line" href="${l.to}" data-i="${i}" aria-label="${l.label.toLowerCase()}">
        <span class="mn-num">0${i + 1}</span><span class="mn-word">${l.label}</span>
        <span class="mn-boy" aria-hidden="true"><img alt="" /><i class="mn-tag">${l.note}</i></span></a></div>`).join('')}
    </nav>
    <div class="mn-foot">
      <div class="mn-clip"><p class="mn-small">Always up for a drawing that moves.</p></div>
      <div class="mn-clip"><a class="mn-mail" href="mailto:hello@example.com">hello@example.com <span aria-hidden="true">↗</span></a></div>
    </div>`;

  const lines = [...menu.querySelectorAll<HTMLAnchorElement>('.mn-line')];
  const rises = [...menu.querySelectorAll<HTMLElement>('.mn-line, .mn-small, .mn-mail')];
  const boys = lines.map((a) => a.querySelector<HTMLElement>('.mn-boy')!);
  const imgs = boys.map((b) => b.querySelector('img')!);
  const bands = lines.map((a) => bandText(a.querySelector<HTMLElement>('.mn-word')!).flat());
  const top = menu.querySelector<HTMLElement>('.mn-hand')!;
  const spark = menu.querySelector<HTMLElement>('.mn-spark')!;
  imgs.forEach((im, i) => setPose(im, LINES[i].poses[0]));
  gsap.set(boys, { autoAlpha: 0, scale: 0.2 });

  let open = false;
  let tl: gsap.core.Timeline | null = null;
  let roll: gsap.core.Tween | null = null;
  let label = 'MENU';
  let active = -1;
  let frame: ReturnType<typeof setInterval> | 0 = 0;
  let loaded = false;
  let restore = '';

  const rollTo = (to: string) => {
    if (roll) { roll.kill(); word.textContent = label; word.style.display = ''; }
    label = to;
    roll = rollWord(word, to, 0.45);
  };

  /** the boy beside line i pops out and starts moving; the others tuck away */
  const show = (i: number) => {
    if (i === active) return;
    if (active >= 0) {
      gsap.to(boys[active], { autoAlpha: 0, scale: 0.4, rotate: 8, y: 10, duration: 0.25, ease: 'power4.inOut', overwrite: true });
      lines[active].classList.remove('is-on');
    }
    clearInterval(frame); frame = 0;
    active = i;
    menu.classList.toggle('has-active', i >= 0);
    if (i < 0) return;
    const l = LINES[i];
    lines[i].classList.add('is-on');
    gsap.fromTo(boys[i], { autoAlpha: 1, scale: 0.25, rotate: -14, y: 30 }, { autoAlpha: 1, scale: 1, rotate: 0, y: 0, duration: 0.55, ease: 'back.out(1.8)', overwrite: true });
    // the word answers in slices: its bands shear sideways and snap back
    gsap.fromTo(bands[i], { xPercent: () => gsap.utils.random(-16, 16) }, { xPercent: 0, duration: 0.45, ease: 'power4.out', stagger: 0.012, overwrite: true });
    let f = 0;
    setPose(imgs[i], l.poses[0]);
    frame = setInterval(() => { f = (f + 1) % l.poses.length; setPose(imgs[i], l.poses[f]); }, 1000 / l.fps);
  };

  const focusables = () => [btn, ...menu.querySelectorAll<HTMLElement>('a[href]')];

  function onKey(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); btn!.focus(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    const i = f.indexOf(document.activeElement as HTMLElement);
    e.preventDefault();
    const n = (i + (e.shiftKey ? -1 : 1) + f.length) % f.length;
    f[i < 0 ? 0 : n].focus();
  }

  function openMenu() {
    if (open) return;
    open = true;
    if (!loaded) { loaded = true; LINES.forEach((l) => l.poses.forEach((k) => { new Image().src = url(k); })); }
    tl?.kill();
    menu!.hidden = false;
    btn!.setAttribute('aria-expanded', 'true');
    btn!.classList.add('is-open');
    document.documentElement.classList.add('menu-open');
    restore = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    rollTo('CLOSE');
    gsap.to(plus, { rotate: 135, duration: 0.5, ease: 'power4.inOut' });
    menu!.classList.remove('landed');
    tl = gsap.timeline({ onComplete: () => menu!.classList.add('landed') });
    gsap.set(menu, { visibility: 'visible' });
    tl.fromTo(menu, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power4.inOut' }, 0)
      .fromTo(rises, { yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 0.6, ease: 'power4.out', stagger: 0.07 }, 0.08)
      .fromTo(spark, { scale: 0, rotate: -120 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'power4.out' }, 0.3)
      .add(scramble(top, 0.4), 0.1)
      .add(() => { if (!fine.matches && active < 0) show(LINES.length - 1); }, 0.62);
    lines[0].focus({ preventScroll: true });
    addEventListener('keydown', onKey);
  }

  function close() {
    if (!open) return;
    open = false;
    tl?.kill();
    btn!.setAttribute('aria-expanded', 'false');
    btn!.classList.remove('is-open');
    rollTo('MENU');
    gsap.to(plus, { rotate: 0, duration: 0.4, ease: 'power4.inOut' });
    removeEventListener('keydown', onKey);
    tl = gsap.timeline({ onComplete: () => {
      menu!.hidden = true;
      show(-1);
      document.documentElement.classList.remove('menu-open');
    } });
    tl.to(menu, { autoAlpha: 0, duration: 0.3, ease: 'power4.inOut' });
    document.documentElement.style.overflow = restore;
  }

  btn.addEventListener('click', () => (open ? close() : openMenu()));

  lines.forEach((a, i) => {
    a.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(i); });
    a.addEventListener('focus', () => { if (a.matches(':focus-visible')) show(i); });
    // touch: press feedback (a quick squash) and the boy pops on the finger
    a.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') show(i);
      gsap.fromTo(a, { scale: 0.96 }, { scale: 1, duration: 0.4, ease: 'power4.out', overwrite: 'auto' });
    });
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const to = LINES[i].to;
      show(i);
      if (to.endsWith('.html')) { leaveTo(to, 'THE FILM…'); return; }
      // let the pose register, then fade away while the page glides to the section
      gsap.delayedCall(fine.matches ? 0.05 : 0.22, () => {
        close();
        const home = (window as unknown as { __home?: { go: (t: string) => void } }).__home;
        if (home) home.go(to); else document.querySelector(to)?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  });
  menu.querySelector('.mn-list')!.addEventListener('pointerleave', (e) => { if ((e as PointerEvent).pointerType === 'mouse') show(-1); });
  menu.querySelector('.mn-mail')!.addEventListener('click', () => close());
}
