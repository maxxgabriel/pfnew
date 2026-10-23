import gsap from 'gsap';
import './cursor.css';

/*
 * CURSOR — fine pointers only. The system arrow is replaced by a small ink brush-tip
 * arrow with the red Spark at its tip (the hotspot). It trails the mouse by a hair
 * (gsap.quickTo), squashes on press, leans and grows over links and buttons, and over
 * anything marked [data-cursor="open"] (work cards) it becomes an ink disc that says
 * OPEN (or the element's data-cursor-label). It hides over iframes and when the pointer
 * leaves the window. Never on touch: the media query decides before anything is made.
 */
const ARROW = `<svg class="cu-arrow" viewBox="0 0 40 46" aria-hidden="true">
  <path class="cu-ink" d="M3.4 2.6c-.9-.4-1.6.3-1.4 1.2l5.6 31.5c.3 1.6 2.1 2 2.9.6l4.6-8.1c3.4 5.2 7.4 10.4 12.5 15.3 1.9 1.8 3.4 1.6 3.9 1.1-4.6-5.8-8.3-11.6-10.6-17.7l10.9-1.5c1.5-.2 2-2 .8-3z"/>
  <path class="cu-hair" d="M8.4 12.2l3.6 17.4M15.6 27.9c2.6 4.4 5.9 8.8 10.1 13" />
</svg>
<svg class="cu-spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C13 8.2 15.8 11 24 12 15.8 13 13 15.8 12 24 11 15.8 8.2 13 0 12 8.2 11 11 8.2 12 0Z"/></svg>`;
const LINKS = 'a[href], button, [role="button"], label, summary, [data-cursor]';

export function initCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (document.querySelector('.cu')) return;
  const el = document.createElement('div');
  el.className = 'cu';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="cu-body">${ARROW}</div><div class="cu-disc"><span class="cu-label">OPEN</span><svg class="cu-dspark" viewBox="0 0 24 24"><path d="M12 0C13 8.2 15.8 11 24 12 15.8 13 13 15.8 12 24 11 15.8 8.2 13 0 12 8.2 11 11 8.2 12 0Z"/></svg></div>`;
  document.body.appendChild(el);
  const body = el.querySelector<HTMLElement>('.cu-body')!;
  const disc = el.querySelector<HTMLElement>('.cu-disc')!;
  const label = el.querySelector<HTMLElement>('.cu-label')!;
  document.documentElement.classList.add('has-cursor');

  gsap.set(el, { autoAlpha: 0 });
  gsap.set(disc, { scale: 0, autoAlpha: 0 });
  const xTo = gsap.quickTo(el, 'x', { duration: 0.14, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.14, ease: 'power3.out' });
  // the arrow leans into the direction of travel (a brush dragged, not a pointer slid)
  const lean = gsap.quickTo(body, 'rotate', { duration: 0.35, ease: 'power3.out' });

  let shown = false;
  let mode: '' | 'link' | 'open' = '';
  let lastX = 0;
  let vx = 0;

  const setMode = (m: typeof mode, text = 'OPEN') => {
    if (m === mode && (m !== 'open' || label.textContent === text)) return;
    mode = m;
    el.dataset.mode = m;
    if (m === 'open') {
      label.textContent = text;
      gsap.to(disc, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'power4.out', overwrite: true });
      gsap.to(body, { scale: 0.5, autoAlpha: 0, duration: 0.25, ease: 'power4.inOut', overwrite: 'auto' });
    } else {
      gsap.to(disc, { scale: 0, autoAlpha: 0, duration: 0.3, ease: 'power4.inOut', overwrite: true });
      gsap.to(body, { scale: m === 'link' ? 1.35 : 1, autoAlpha: 1, duration: 0.4, ease: 'power4.out', overwrite: 'auto' });
    }
  };

  const show = (on: boolean) => {
    if (on === shown) return;
    shown = on;
    gsap.to(el, { autoAlpha: on ? 1 : 0, duration: 0.2, ease: 'power4.inOut', overwrite: 'auto' });
  };

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') { show(false); return; }
    if (!shown) gsap.set(el, { x: e.clientX, y: e.clientY });
    xTo(e.clientX); yTo(e.clientY);
    vx = vx * 0.5 + (e.clientX - lastX) * 0.5;
    lastX = e.clientX;
    const t = e.target as Element;
    if (t.closest('iframe')) { show(false); return; }
    show(true);
    const open = t.closest<HTMLElement>('[data-cursor="open"]');
    if (open) setMode('open', open.dataset.cursorLabel ?? 'OPEN');
    else setMode(t.closest(LINKS) ? 'link' : '');
  }, { passive: true });

  // the lean follows the hand's speed and settles back when it stops
  gsap.ticker.add(() => { if (!shown) return; lean(gsap.utils.clamp(-16, 16, vx * 0.8)); vx *= 0.82; });

  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    gsap.to(mode === 'open' ? disc : body, { scaleX: 1.12, scaleY: 0.8, duration: 0.12, ease: 'power4.out', overwrite: 'auto' });
  });
  addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse') return;
    gsap.to(mode === 'open' ? disc : body, { scaleX: mode === 'link' ? 1.35 : 1, scaleY: mode === 'link' ? 1.35 : 1, duration: 0.5, ease: 'back.out(3)', overwrite: 'auto' });
  });
  document.documentElement.addEventListener('pointerleave', () => show(false));
  addEventListener('blur', () => show(false));
}
