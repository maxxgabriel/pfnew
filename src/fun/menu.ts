import gsap from 'gsap';
import { glitchFlash } from './kit';
import { sticker } from './stickers';
import './menu.css';

/*
 * THE MENU — a black page that opens out of the MENU button in a circle. The links rise in one by one,
 * each with its sticker popping beside it; MENU rolls to CLOSE. Choosing a link closes it and glides
 * to the section; Escape or the button closes it too.
 */
export function initMenu(go: (target: string) => void) {
  const btn = document.querySelector<HTMLButtonElement>('.menu')!, panel = document.querySelector<HTMLElement>('.menu-panel')!;
  const word = btn.querySelector<HTMLElement>('.menu-word')!, plus = btn.querySelector('b')!;
  const links = [...panel.querySelectorAll<HTMLAnchorElement>('nav a')];
  const stks = links.map((a) => { const s = sticker(a, a.dataset.sticker ?? 'sparkle', 'm-stk'); return s; });
  const roll = (to: string) => {
    const old = [...word.children];
    const next = [...to].map((c) => { const s = document.createElement('span'); s.textContent = c; s.style.display = 'inline-block'; return s; });
    gsap.timeline().to(old, { yPercent: -120, duration: 0.16, ease: 'power2.in', stagger: 0.03 }).call(() => word.replaceChildren(...next)).fromTo(next, { yPercent: 120 }, { yPercent: 0, duration: 0.36, ease: 'back.out(2.4)', stagger: 0.03 });
  };
  if (!word.children.length) word.replaceChildren(...[...(word.textContent ?? '')].map((c) => { const s = document.createElement('span'); s.textContent = c; s.style.display = 'inline-block'; return s; }));
  let open = false;
  function set(o: boolean) {
    if (o === open) return;
    open = o;
    btn.setAttribute('aria-expanded', String(o));
    roll(o ? 'CLOSE' : 'MENU');
    gsap.to(plus, { rotation: o ? 45 : 0, duration: 0.4, ease: 'back.out(2)' });
    const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (o) {
      panel.hidden = false;
      glitchFlash(0.2);
      gsap.timeline()
        .fromTo(panel, { clipPath: `circle(0px at ${cx}px ${cy}px)` }, { clipPath: `circle(${Math.hypot(innerWidth, innerHeight)}px at ${cx}px ${cy}px)`, duration: 0.7, ease: 'power3.inOut' })
        .fromTo(links, { yPercent: 120, opacity: 0, rotation: 4 }, { yPercent: 0, opacity: 1, rotation: 0, duration: 0.6, ease: 'back.out(2)', stagger: 0.07 }, 0.25)
        .fromTo(stks.map((s) => s.inner), { scale: 0, rotation: -60 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2.4)', stagger: 0.07 }, 0.45);
      links[0].focus({ preventScroll: true });
    } else {
      gsap.to(panel, { clipPath: `circle(0px at ${cx}px ${cy}px)`, duration: 0.45, ease: 'power3.in', onComplete: () => { panel.hidden = true; } });
      btn.focus({ preventScroll: true });
    }
  }
  btn.addEventListener('click', () => set(!open));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  links.forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); set(false); go(a.getAttribute('href') ?? '#top'); }));
}
