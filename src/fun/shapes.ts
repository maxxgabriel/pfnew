import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { CustomEase } from 'gsap/CustomEase';
import { CustomWiggle } from 'gsap/CustomWiggle';
gsap.registerPlugin(MorphSVGPlugin, CustomEase, CustomWiggle);

/*
 * Four big shapes with lives of their own (never a swarm): a star that turns and blooms into a sun
 * and a flower, a moon that rocks like a cradle, a squiggle that wriggles, a blob that never holds
 * still. Each has a trick when you tap it. They lean away from the pointer on big screens.
 */
const pt = (a: number, r: number) => `${(50 + Math.cos(a) * r).toFixed(2)} ${(50 + Math.sin(a) * r).toFixed(2)}`;
const polar = (r: (a: number) => number, n = 96) => {
  let d = '';
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 - Math.PI / 2; d += `${i ? 'L' : 'M'}${pt(a, r(a))}`; }
  return `${d}Z`;
};
const spikes = (k: number, ro: number, ri: number) => {
  let d = '';
  for (let i = 0; i < k * 2; i++) { const a = (i / (k * 2)) * Math.PI * 2 - Math.PI / 2; d += `${i ? 'L' : 'M'}${pt(a, i % 2 ? ri : ro)}`; }
  return `${d}Z`;
};
export const PATHS = {
  star: spikes(8, 47, 25),
  sun: spikes(12, 48, 37),
  flower: polar((a) => 33 + 13 * Math.cos(6 * a)),
  blob1: polar((a) => 38 + 6 * Math.sin(2 * a + 0.5) + 4 * Math.sin(3 * a + 1.3)),
  blob2: polar((a) => 37 + 7 * Math.sin(2 * a + 2.1) + 5 * Math.sin(3 * a + 0.2)),
  blob3: polar((a) => 39 + 5 * Math.sin(2 * a + 4.0) + 6 * Math.sin(3 * a + 2.6)),
  squigA: 'M6 50 C14 22 26 22 34 50 S54 78 62 50 S82 22 94 50',
  squigB: 'M6 50 C14 78 26 78 34 50 S54 22 62 50 S82 78 94 50',
  moon: 'M8 38 A42 42 0 0 0 92 38 Z',
};

const NS = 'http://www.w3.org/2000/svg';
function shape(name: string, d: string, grad: [string, string], gloss = true) {
  // three layers so nothing fights: host (placed, leans from the pointer) > inner (enters, does tricks) > svg (its life)
  const host = document.createElement('i');
  host.className = `sh sh-${name}`;
  const inner = document.createElement('b');
  inner.className = 'sh-in';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.innerHTML = `<defs><linearGradient id="g-${name}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(${grad[0]})"/><stop offset="1" style="stop-color:var(${grad[1]})"/></linearGradient></defs><path d="${d}"/>${gloss ? '<ellipse class="gloss" cx="36" cy="30" rx="12" ry="7" transform="rotate(-30 36 30)"/>' : ''}`;
  inner.append(svg);
  host.append(inner);
  return { host, inner, svg, path: svg.querySelector('path')! };
}

export function initShapes(layer: HTMLElement, fine: boolean) {
  const star = shape('star', PATHS.star, ['--sun', '--hot']);
  const moon = shape('moon', PATHS.moon, ['--hot', '--cool']);
  const squig = shape('squig', PATHS.squigA, ['--cool', '--hot'], false);
  const blob = shape('blob', PATHS.blob1, ['--mint', '--cool']);
  const all = [star, moon, squig, blob];
  layer.append(...all.map((s) => s.host));

  // lives
  gsap.to(star.svg, { rotation: 360, duration: 12, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
  const bloom = { duration: 0.8, ease: 'elastic.out(1, 0.45)' };
  gsap.timeline({ repeat: -1, repeatDelay: 1.6 })
    .to(star.path, { morphSVG: PATHS.sun, ...bloom }, 1.6)
    .to(star.path, { morphSVG: PATHS.flower, ...bloom }, '+=1.6')
    .to(star.path, { morphSVG: PATHS.star, ...bloom }, '+=1.6');
  gsap.fromTo(moon.svg, { rotation: -16 }, { rotation: 16, duration: 1.5, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 20%' });
  gsap.to(squig.path, { morphSVG: PATHS.squigB, duration: 0.55, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to(squig.svg, { x: 14, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.timeline({ repeat: -1 })
    .to(blob.path, { morphSVG: PATHS.blob2, duration: 1.8, ease: 'sine.inOut' })
    .to(blob.path, { morphSVG: PATHS.blob3, duration: 1.8, ease: 'sine.inOut' })
    .to(blob.path, { morphSVG: PATHS.blob1, duration: 1.8, ease: 'sine.inOut' });
  gsap.to(blob.svg, { y: -12, rotation: 8, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 50%' });

  // tricks on tap
  const wiggle = CustomWiggle.create('shapeWiggle', { wiggles: 7, type: 'easeOut' });
  const trick = new Map<HTMLElement, () => void>([
    [star.host, () => gsap.fromTo(star.inner, { rotation: 0, scale: 1 }, { rotation: 720, scale: 1.25, duration: 0.6, ease: 'power3.out', yoyo: true, repeat: 1, overwrite: true })],
    [moon.host, () => gsap.fromTo(moon.inner, { rotationX: 0 }, { rotationX: 360, duration: 0.8, ease: 'back.out(2)', overwrite: true })],
    [squig.host, () => gsap.fromTo(squig.inner, { x: 0 }, { x: 22, duration: 0.8, ease: wiggle, overwrite: true })],
    [blob.host, () => gsap.timeline().to(blob.inner, { scaleX: 1.35, scaleY: 0.65, duration: 0.12, ease: 'power2.out', overwrite: true }).to(blob.inner, { scaleX: 1, scaleY: 1, duration: 0.9, ease: 'elastic.out(1.2, 0.3)' })],
  ]);
  for (const [el, fn] of trick) el.addEventListener('pointerdown', fn);

  // they pop in, with a spin
  gsap.set(all.map((s) => s.inner), { scale: 0 });
  const enter = (at: number) => gsap.fromTo(all.map((s) => s.inner), { scale: 0, rotation: () => gsap.utils.random(-120, 120) }, { scale: 1, rotation: 0, duration: 0.9, ease: 'back.out(2.2)', stagger: 0.09, delay: at });

  // lean away from the pointer (fine pointers only)
  if (fine) {
    const movers = all.map((s, i) => ({ x: gsap.quickTo(s.host, 'x', { duration: 0.9, ease: 'power3.out' }), y: gsap.quickTo(s.host, 'y', { duration: 0.9, ease: 'power3.out' }), k: [26, -18, 22, -30][i] }));
    addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      for (const m of movers) { m.x(nx * m.k); m.y(ny * m.k); }
    });
  }
  return { enter, hosts: all.map((s) => s.host) };
}
