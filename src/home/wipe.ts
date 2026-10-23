import gsap from 'gsap';
import './wipe.css';
import { url } from './art';
import { bandText, bandsIn } from './slices';

/*
 * WIPE — the page transition (docs/study/MATVOYCE_PHONE.md §5, in our ink). A panel of
 * running diagonal ink stripes wipes up from the bottom (its two edges are just two
 * numbers in a clip), one paper pill with the red Spark names the destination and rides
 * up with the panel's top edge, the boy sprints across the stripes while it holds, then
 * the panel wipes off upward. One strong shape, never a swarm.
 *
 * wipe(label, during): in ≈0.5 s ease-in-out-quart → `during` runs (and at least a beat,
 * so the boy can cross) → off ≈0.3 s. Leaving for another page (film.html) plays the
 * wipe and then navigates; coming back to home lifts a 'HOME' wipe off. First visit: nothing.
 */
const RUN = Array.from({ length: 8 }, (_, i) => `sprint8_${i}`);
const SPARK = '<svg class="wp-spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C13 8.2 15.8 11 24 12 15.8 13 13 15.8 12 24 11 15.8 8.2 13 0 12 8.2 11 11 8.2 12 0Z"/></svg>';
const FLAG = 'mg-wipe';

let root: HTMLElement;
let panel: HTMLElement;
let pill: HTMLElement;
let label: HTMLElement;
let boy: HTMLImageElement;
let busy = false;
const edge = { top: 100, bottom: 0 }; // clip inset in %: top 100 = hidden below, bottom 100 = gone upward

function paint() {
  panel.style.clipPath = `inset(${edge.top}% 0 ${edge.bottom}% 0)`;
  // the pill rides the panel's top edge up, then sits centred; on the way out it leaves with the band
  const h = innerHeight;
  const topPx = (edge.top / 100) * h;
  const botPx = h - (edge.bottom / 100) * h;
  const centre = h / 2;
  const y = edge.bottom > 0 ? Math.min(centre, botPx - pill.offsetHeight * 0.6) : Math.max(centre, topPx + pill.offsetHeight * 0.75);
  gsap.set(pill, { y: y - centre });
}

function setLabel(text: string) {
  label.removeAttribute('data-banded');
  label.removeAttribute('aria-label');
  label.textContent = text;
  const letters = bandText(label);
  gsap.set(letters.flat(), { yPercent: 115 });
  return letters;
}

/** the boy sprints across the panel, low, at 12 fps */
function runBoy(dur: number) {
  let f = 0;
  const step = () => { f = (f + 1) % RUN.length; boy.src = url(RUN[f]); };
  const iv = setInterval(step, 1000 / 12);
  const w = innerWidth;
  const tw = gsap.fromTo(boy, { x: -boy.offsetWidth - 20, autoAlpha: 1 }, { x: w * 1.05, duration: dur, ease: 'none', onComplete: () => { clearInterval(iv); gsap.set(boy, { autoAlpha: 0 }); } });
  return () => { clearInterval(iv); tw.kill(); gsap.set(boy, { autoAlpha: 0 }); };
}

function cover(text: string) {
  root.classList.add('on');
  const letters = setLabel(text);
  const tl = gsap.timeline();
  // resolves when the panel has covered the screen (the label's bands may still be landing)
  const covered = new Promise<void>((r) => tl.fromTo(edge, { top: 100, bottom: 0 }, { top: 0, duration: 0.5, ease: 'power4.inOut', onUpdate: paint, onComplete: r }));
  tl.fromTo(pill, { scale: 0.7, rotate: -6 }, { scale: 1, rotate: -2.5, duration: 0.6, ease: 'power4.out' }, 0.15);
  tl.add(bandsIn(letters, { stagger: 0.03, jitter: 0.18 }), 0.2);
  tl.fromTo('.wp-spark', { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.55, ease: 'power4.out' }, 0.32);
  return covered;
}

function uncover() {
  return gsap.to(edge, { bottom: 100, duration: 0.32, ease: 'power4.inOut', onUpdate: paint, onComplete: () => { root.classList.remove('on'); edge.top = 100; edge.bottom = 0; } });
}

/** play the wipe: cover, run `during`, uncover */
export async function wipe(text: string, during: () => void | Promise<void>) {
  if (!root) initWipe();
  if (busy) return;
  busy = true;
  RUN.forEach((k) => { new Image().src = url(k); });
  await cover(text);
  const t0 = performance.now();
  const stop = runBoy(1.25);
  try { await during(); } finally {
    // hold at least one beat so the label reads and the boy gets most of the way across
    const left = 1.0 - (performance.now() - t0) / 1000;
    if (left > 0) await new Promise((r) => setTimeout(r, left * 1000));
    stop();
    await uncover();
    busy = false;
  }
}

/** cover the page and go to another document (the film) */
export function leaveTo(href: string, text: string) {
  try { sessionStorage.setItem(FLAG, '1'); } catch { /* storage blocked: no lift-off on return */ }
  if (!root) initWipe();
  if (busy) return;
  busy = true;
  RUN.forEach((k) => { new Image().src = url(k); });
  void cover(text).then(() => { runBoy(1.25); setTimeout(() => { location.href = href; }, 450); });
}

/** labels for documents we leave to through the wipe */
const labelFor = (a: HTMLAnchorElement) => a.dataset.wipe ?? (/film\.html/.test(a.href) ? 'THE FILM…' : (a.textContent ?? '').trim().toUpperCase().slice(0, 14) + '…');

export function initWipe() {
  if (root) return;
  root = document.querySelector<HTMLElement>('.wipe') ?? document.body.appendChild(Object.assign(document.createElement('div'), { className: 'wipe' }));
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `<div class="wp-panel"><div class="wp-stripes"></div><img class="wp-boy" alt="" /></div>
    <div class="wp-pill">${SPARK}<span class="wp-label"></span></div>`;
  panel = root.querySelector('.wp-panel')!;
  pill = root.querySelector('.wp-pill')!;
  label = root.querySelector('.wp-label')!;
  boy = root.querySelector('.wp-boy')!;
  boy.src = url(RUN[0]);
  gsap.set(boy, { autoAlpha: 0 });
  paint();

  // any same-site link to another page (film.html …) leaves through the wipe, unless a section handled it
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const to = new URL(a.href, location.href);
    if (to.origin !== location.origin || to.pathname === location.pathname || !/\.html$/.test(to.pathname)) return;
    e.preventDefault();
    leaveTo(a.href, labelFor(a));
  });

  // back from the film (or restored from the back/forward cache): lift a HOME wipe off
  const lift = () => {
    busy = true;
    root.classList.add('on');
    setLabel('HOME');
    edge.top = 0; edge.bottom = 0; paint();
    const letters = label.querySelectorAll('.band');
    gsap.set(letters, { yPercent: 0 });
    gsap.set(pill, { rotate: -2.5, scale: 1 });
    gsap.delayedCall(0.45, () => { void uncover().then(() => { busy = false; }); });
  };
  let back = false;
  try { back = sessionStorage.getItem(FLAG) === '1'; sessionStorage.removeItem(FLAG); } catch { /* blocked */ }
  if (back) lift();
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    try { sessionStorage.removeItem(FLAG); } catch { /* blocked */ }
    gsap.killTweensOf(edge);
    busy = false;
    lift();
  });
}
