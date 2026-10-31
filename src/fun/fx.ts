import gsap from 'gsap';
import { calm, fine } from './kit';
import './fx.css';

/*
 * The finish over everything: film grain (a noise tile drawn once, jumped about twelve times a
 * second, multiplied over the page like paper), and on fine pointers a cursor: a red dot that
 * trails a little and opens into a ring over anything you can press.
 */
export function initFx() {
  // grain: one 160px tile of noise
  const S = 160, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!, img = g.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const grain = document.querySelector<HTMLElement>('.grain')!;
  const noise = `url(${cv.toDataURL()})`;
  grain.style.backgroundImage = noise;
  document.documentElement.style.setProperty('--noise', noise); // dark sections add it back in screen mode
  if (!calm) setInterval(() => { grain.style.backgroundPosition = `${Math.random() * S}px ${Math.random() * S}px`; }, 83);

  // cursor
  if (fine) {
    const c = document.querySelector<HTMLElement>('.cursor')!;
    document.documentElement.classList.add('has-cursor');
    const x = gsap.quickTo(c, 'x', { duration: 0.18, ease: 'power3.out' }), y = gsap.quickTo(c, 'y', { duration: 0.18, ease: 'power3.out' });
    addEventListener('pointermove', (e) => { x(e.clientX); y(e.clientY); c.classList.add('on'); });
    document.addEventListener('pointerleave', () => c.classList.remove('on'));
    document.addEventListener('pointerover', (e) => c.classList.toggle('big', !!(e.target as Element).closest('a, button, .card, .stk, .ch, .dot, .boy, .skill, .face')));
    addEventListener('pointerdown', () => gsap.fromTo(c, { scale: 0.7 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }));
  }
}
