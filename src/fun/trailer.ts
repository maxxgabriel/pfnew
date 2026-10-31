import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { faceUrl, url } from './art';
import { calm, glitchFlash, onBeat, shake, splitChars, whileVisible, zoomPunch } from './kit';
import './trailer.css';
gsap.registerPlugin(ScrollTrigger);

/*
 * THE TRAILER — a neo-noir minute that the scroll plays: teal-black, one red light, letterbox bars,
 * VHS lines and a REC timecode. Card by card: ONE ANIMATOR. (a clean zoom punch) → SEVEN STYLES.
 * (a smash cut; his seven faces strobe one per frame) → ZERO STILL FRAMES. (glitched in) → a freeze
 * frame (everything stops, he's caught mid-leap in print, stamped) → EVERYTHING MOVES. (whip-panned
 * in; punches and shakes on every beat over speed lines) → NOW PLAYING (a neon sign flickering on).
 * His silhouette stands in the red light with a glowing rim and changes pose on every cut.
 */
const POSES = ['still_0', 'snap_1', 'powerup_2', 'leap_3', 'ftkick_1', 'bye_1'];
export const TRAILER_POSES = POSES;
const FACES = ['ink', 'pixel', 'comic', 'water', 'clay', 'chalk', 'hose'];

export function initTrailer(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('.tr-stage')!;
  const cards = [...root.querySelectorAll<HTMLElement>('.tr-card')];
  const flash = root.querySelector<HTMLElement>('.tr-flash')!;
  const boy = root.querySelector<HTMLImageElement>('.tr-boy')!;
  const tc = root.querySelector<HTMLElement>('.tr-tc')!;
  const facesBox = root.querySelector<HTMLElement>('.tr-faces')!;
  const faces = FACES.map((f) => { const im = document.createElement('img'); im.src = faceUrl(f); im.alt = ''; facesBox.append(im); return im; });
  const big = cards[4];
  const bigChars = splitChars(big, 'bc');
  // speed lines behind EVERYTHING MOVES
  const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  lines.setAttribute('viewBox', '-100 -100 200 200'); lines.classList.add('tr-lines');
  lines.innerHTML = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2, r0 = 34 + (i % 3) * 8; return `<path d="M${Math.cos(a) * r0} ${Math.sin(a) * r0} L${Math.cos(a - 0.03) * 150} ${Math.sin(a - 0.03) * 150} L${Math.cos(a + 0.03) * 150} ${Math.sin(a + 0.03) * 150}Z"/>`; }).join('');
  stage.insertBefore(lines, root.querySelector('.tr-cards'));

  let cur = -1;
  function show(k: number) {
    if (k === cur) return;
    const prev = cur;
    cur = k;
    cards.forEach((c, i) => gsap.set(c, { autoAlpha: i === k ? 1 : 0 }));
    stage.classList.toggle('frozen', k === 3);
    stage.classList.toggle('loud', k === 4);
    stage.classList.toggle('neon', k === 5);
    if (k >= 0) boy.src = url(POSES[k]);
    if (prev === -1 || k < 0) return;
    // every cut: a flash, and its own kind of hit
    gsap.fromTo(flash, { opacity: k === 3 ? 1 : 0.7, backgroundColor: k === 1 || k === 4 ? '#ff3d22' : '#ffffff' }, { opacity: 0, duration: k === 3 ? 0.5 : 0.18, ease: 'power2.out', overwrite: true });
    if (k === 0) gsap.fromTo(cards[0], { scale: 1.5, filter: 'blur(12px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'expo.out' });
    if (k === 1) { zoomPunch(cards[1], 1.3); shake(stage, 14, 0.4); }
    if (k === 2) { glitchFlash(); gsap.fromTo(cards[2], { x: -50, skewX: 25 }, { x: 0, skewX: 0, duration: 0.4, ease: 'steps(6)' }); }
    if (k === 3) zoomPunch(cards[3].querySelector('.tr-stamp')!, 1.6);
    if (k === 4) gsap.fromTo(cards[4], { x: '55vw', skewX: -22, filter: 'blur(18px)' }, { x: 0, skewX: 0, filter: 'blur(0px)', duration: 0.42, ease: 'power3.out' });
    if (k === 5) glitchFlash(0.22);
  }

  // the scroll plays it: six cards, the faces strobing through the second, the timecode running
  const N = cards.length;
  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: 'top top', end: () => `+=${innerHeight * (calm ? 3 : 4.6)}`, pin: stage, scrub: 0.4, anticipatePin: 1 },
    onUpdate: () => {
      const p = tl.progress(), f = p * (N + 0.3);
      show(Math.min(N - 1, Math.floor(f)));
      const frames = Math.floor(p * 30 * 24);
      const pad = (v: number) => String(v).padStart(2, '0');
      tc.textContent = `00:00:${pad(Math.floor(frames / 24))}:${pad(frames % 24)}`;
      // seven faces, one per slice of the second card
      const fk = f - 1;
      faces.forEach((im, i) => { im.style.opacity = fk >= 0 && fk < 1 && Math.floor(fk * 7) === i ? '1' : '0'; });
    },
  });
  tl.to({}, { duration: N + 0.3 });
  gsap.set(cards, { autoAlpha: 0 });
  show(0);
  // a glitch flash as the trailer arrives
  ScrollTrigger.create({ trigger: root, start: 'top 60%', onEnter: () => glitchFlash(0.36) });

  // the loud card: the whole word punches on every beat, the stage shakes, the speed lines turn
  let stop = () => {};
  whileVisible(root, () => {
    stop = onBeat((n) => {
      if (cur !== 4 || calm) return;
      gsap.fromTo(bigChars, { yPercent: (i) => ((i + n) % 2 ? -14 : 10), scale: 1.12 }, { yPercent: 0, scale: 1, duration: 0.42, ease: 'back.out(3)', stagger: 0.012, overwrite: true });
      shake(stage, 7, 0.22);
      gsap.fromTo(lines, { rotation: n * 9, scale: 1.08 }, { scale: 1, duration: 0.4, ease: 'power2.out', overwrite: true });
    });
  }, () => stop());
}
