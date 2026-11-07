import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { faceUrl } from './art';
import { calm, popOnScroll, whileVisible, zoomPunch } from './kit';
import './styles.css';
gsap.registerPlugin(ScrollTrigger);

/*
 * ONE BOY. SEVEN STYLES. — his face drawn seven ways, fanned out like a hand of cards. The one in the
 * middle is big; every couple of seconds the hand turns to the next; tap any face to pull it to the
 * middle with a zoom punch. Its name rolls in underneath, letter by letter.
 */
const STYLES: [string, string][] = [['ink', 'INK'], ['pixel', 'PIXEL'], ['comic', 'COMIC'], ['water', 'WATERCOLOUR'], ['clay', 'CLAY'], ['chalk', 'CHALK'], ['hose', 'RUBBER HOSE']];

export function initStyles(root: HTMLElement) {
  popOnScroll(root.querySelector<HTMLElement>('.sec-title')!);
  const fan = root.querySelector<HTMLElement>('.fan')!, label = root.querySelector<HTMLElement>('.fan-name')!;
  const faces = STYLES.map(([k, name], i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'face'; b.setAttribute('aria-label', `His face drawn in ${name.toLowerCase()}`);
    const im = document.createElement('img'); im.src = faceUrl(k); im.alt = ''; im.draggable = false;
    b.append(im); fan.append(b);
    b.addEventListener('click', () => { turn(i); zoomPunch(b, 1.25); restart(); });
    return b;
  });
  let at = 0;
  function layout(animate: boolean) {
    const n = faces.length, W = fan.clientWidth, step = Math.min(W / 5.2, 170);
    faces.forEach((f, i) => {
      let d = i - at;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      const v = { x: d * step, y: Math.abs(d) * Math.abs(d) * step * 0.09, rotation: d * 9, scale: d === 0 ? 1 : 0.7 - Math.abs(d) * 0.04, zIndex: 10 - Math.abs(d), opacity: Math.abs(d) > 3 ? 0 : 1 };
      if (animate) gsap.to(f, { ...v, duration: 0.7, ease: 'back.out(1.6)', overwrite: 'auto' });
      else gsap.set(f, v);
    });
  }
  function turn(i: number) {
    at = (i + faces.length) % faces.length;
    layout(true);
    const name = STYLES[at][1];
    label.innerHTML = [...name].map((c) => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    gsap.from(label.children, { yPercent: 110, rotation: () => gsap.utils.random(-25, 25), duration: 0.5, ease: 'back.out(2.6)', stagger: 0.03 });
  }
  let tl: gsap.core.Tween | null = null;
  const restart = () => { tl?.kill(); if (!calm) tl = gsap.delayedCall(2.2, function loop() { turn(at + 1); tl = gsap.delayedCall(2.2, loop); }); };
  layout(false);
  whileVisible(root, restart, () => tl?.kill());
  // dealt out from a stack when it arrives
  ScrollTrigger.create({ trigger: fan, start: 'top 85%', once: true, onEnter: () => {
    gsap.from(faces, { x: 0, y: 80, rotation: 0, scale: 0.4, duration: 0.9, ease: 'back.out(1.6)', stagger: 0.05 });
    // each one glitches in from its own dimension
    if (!calm) faces.forEach((f, i) => gsap.delayedCall(0.3 + i * 0.09, () => { f.classList.add('gi'); gsap.delayedCall(0.55, () => f.classList.remove('gi')); }));
  } });
  addEventListener('resize', () => layout(false));
}
