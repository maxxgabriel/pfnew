import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { CustomWiggle } from 'gsap/CustomWiggle';
gsap.registerPlugin(CustomEase, CustomWiggle);

/*
 * The hand-drawn stickers (made with ChatGPT from one shared style, cut out by scripts/cutout-fun.mjs).
 * Each one is three layers so nothing fights: host (placed, leans from the pointer) > inner (pops in,
 * does its trick when tapped) > img (its own little life, and the line boil). Each has a personality:
 * the sun swaggers, the boombox pumps on the beat, the ink pot hops, the glove points the way down.
 */
import { onUniverse, universe } from './universe';
const files = import.meta.glob('../assets/fun/*.webp', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const uniFiles = import.meta.glob('../assets/uni/*/*.webp', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const baseUrl = (name: string) => files[`../assets/fun/${name}.webp`] ?? files['../assets/fun/sparkle.webp'];
/** the universe's own drawing of a sticker, if it has been drawn */
export const uniUrl = (u: string, name: string) => uniFiles[`../assets/uni/${u}/${name}.webp`];
/** a sticker's url in the current universe (falls back to the ink drawing, then to the sparkle) */
export const stickerUrl = (name: string) => uniUrl(universe(), name) ?? baseUrl(name);
export const hasSticker = (name: string) => !!files[`../assets/fun/${name}.webp`];
const live = new Set<{ img: HTMLImageElement; name: string }>();
const dress = (img: HTMLImageElement, name: string) => { const u = uniUrl(universe(), name); img.src = u ?? baseUrl(name); img.classList.toggle('uni-art', !!u || universe() === 'ink'); };
/** dress an image as the sticker, for this universe; it is redressed whenever the universe changes */
export function trackSticker(img: HTMLImageElement, name: string) { dress(img, name); live.add({ img, name }); }
onUniverse(() => { for (const { img, name } of live) dress(img, name); });
const BEAT = 60 / 118;

type Bits = { host: HTMLElement; inner: HTMLElement; img: HTMLImageElement };
const lives: Record<string, (img: HTMLImageElement) => void> = {
  sun: (img) => {
    gsap.to(img, { rotation: 7, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.timeline({ repeat: -1, repeatDelay: 2.6 }).to(img, { scaleY: 0.86, scaleX: 1.1, duration: 0.1, ease: 'power2.out' }).to(img, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1.2, 0.35)' });
  },
  sparkle: (img) => gsap.timeline({ repeat: -1 }).to(img, { scale: 1.16, rotation: 12, duration: 0.5, ease: 'sine.inOut' }).to(img, { scale: 0.88, rotation: -6, duration: 0.6, ease: 'sine.inOut' }).to(img, { scale: 1, rotation: 0, duration: 0.5, ease: 'sine.inOut' }),
  inkpot: (img) => gsap.timeline({ repeat: -1, repeatDelay: 2.2 })
    .to(img, { scaleY: 0.82, scaleX: 1.14, duration: 0.14, ease: 'power2.out' })
    .to(img, { y: '-=34', scaleY: 1.1, scaleX: 0.92, rotation: -8, duration: 0.3, ease: 'power2.out' })
    .to(img, { y: '+=34', scaleY: 1, scaleX: 1, rotation: 0, duration: 0.26, ease: 'power2.in' })
    .to(img, { scaleY: 0.86, scaleX: 1.12, duration: 0.07 })
    .to(img, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.35)' }),
  boombox: (img) => {
    gsap.timeline({ repeat: -1 }).to(img, { scale: 1.08, duration: 0.06, ease: 'power2.out' }).to(img, { scale: 1, duration: BEAT - 0.06, ease: 'power3.out' });
    gsap.to(img, { rotation: 4, duration: BEAT * 2, yoyo: true, repeat: -1, ease: 'steps(2)' });
  },
  glove: (img) => gsap.to(img, { y: 14, duration: 0.55, yoyo: true, repeat: -1, ease: 'power1.inOut' }),
  bolt: (img) => gsap.timeline({ repeat: -1, repeatDelay: 1.4 }).to(img, { rotation: -10, duration: 0.05 }).to(img, { rotation: 8, duration: 0.05 }).to(img, { rotation: -5, duration: 0.05 }).to(img, { rotation: 0, duration: 0.3, ease: 'elastic.out(1.4, 0.3)' }),
  badge: (img) => gsap.to(img, { rotation: 360, duration: 16, repeat: -1, ease: 'none' }),
  brush: (img) => gsap.to(img, { rotation: -7, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
  stopwatch: (img) => gsap.timeline({ repeat: -1 }).to(img, { rotation: 5, duration: 0.05 }).to(img, { rotation: 0, duration: BEAT - 0.05, ease: 'elastic.out(1.4, 0.3)' }).to(img, { rotation: -5, duration: 0.05 }).to(img, { rotation: 0, duration: BEAT - 0.05, ease: 'elastic.out(1.4, 0.3)' }),
  flipbook: (img) => gsap.timeline({ repeat: -1, repeatDelay: 1.8 }).to(img, { scaleX: 0.9, skewY: -4, duration: 0.12, ease: 'power2.out' }).to(img, { scaleX: 1, skewY: 0, duration: 0.6, ease: 'elastic.out(1.3, 0.3)' }),
  boing: (img) => gsap.timeline({ repeat: -1, repeatDelay: 0.8 }).to(img, { y: -26, scaleY: 1.08, duration: 0.3, ease: 'power2.out' }).to(img, { y: 0, scaleY: 1, duration: 0.26, ease: 'power2.in' }).to(img, { scaleY: 0.84, scaleX: 1.1, duration: 0.07 }).to(img, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1.3, 0.3)' }),
  hi: (img) => gsap.to(img, { rotation: -6, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
  spark: () => undefined,
};
const wiggle = CustomWiggle.create('stickerWiggle', { wiggles: 7, type: 'easeOut' });
/** a tap: squash, then a spin or a shake, landing on a jelly bounce */
function tap(inner: HTMLElement, spin: boolean) {
  gsap.timeline({ overwrite: true })
    .to(inner, { scaleX: 1.22, scaleY: 0.78, duration: 0.08, ease: 'power2.out' })
    .to(inner, spin ? { scaleX: 1, scaleY: 1, rotation: '+=360', duration: 0.9, ease: 'back.out(1.6)' } : { scaleX: 1, scaleY: 1, rotation: 14, duration: 0.8, ease: wiggle });
}

export function sticker(parent: HTMLElement, name: string, cls = '', spin = true): Bits {
  const host = document.createElement('i');
  host.className = `stk stk-${name} ${cls}`.trim();
  const inner = document.createElement('b');
  inner.className = 'stk-in';
  const img = document.createElement('img');
  trackSticker(img, name); img.alt = ''; img.draggable = false; img.decoding = 'async';
  inner.append(img); host.append(inner); parent.append(host);
  lives[name]?.(img);
  host.addEventListener('pointerdown', () => tap(inner, spin));
  gsap.set(inner, { scale: 0 });
  return { host, inner, img };
}

/** pop a set of stickers in, each with a spin, one after another */
export const popIn = (bits: Bits[], delay = 0) => gsap.fromTo(bits.map((b) => b.inner), { scale: 0, rotation: () => gsap.utils.random(-140, 140) }, { scale: 1, rotation: 0, duration: 0.9, ease: 'back.out(2)', stagger: 0.1, delay });

/** lean away from the pointer on big screens */
export function lean(bits: Bits[], depth: number[]) {
  const movers = bits.map((b, i) => ({ x: gsap.quickTo(b.host, 'x', { duration: 0.9, ease: 'power3.out' }), y: gsap.quickTo(b.host, 'y', { duration: 0.9, ease: 'power3.out' }), k: depth[i % depth.length] }));
  addEventListener('pointermove', (e) => {
    const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
    for (const m of movers) { m.x(nx * m.k); m.y(ny * m.k); }
  });
}
