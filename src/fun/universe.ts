import gsap from 'gsap';
import { C, glitchFlash } from './kit';
import './universe.css';

/*
 * SEVEN UNIVERSES — the whole site exists seven times, once per way he draws: ink, pixel, comic,
 * watercolour, clay, chalk, rubber hose. A universe is a set of design tokens (paper, ink, the four
 * colours, the typefaces), a paper treatment (universe.css), the drawings (every sticker and every
 * pose of him has a twin where one exists), and a way of moving: how many frames a second anything
 * tweened gets, the default ease, the speed of time. Switching is a dimension glitch: the page
 * slices and splits for a third of a second, the tokens flip in the middle of it, and everyone who
 * cares (the hero, the stickers, him) is told. He is the one who switches: tap him. There is also a
 * strip of seven swatches in the header, the seven faces, and a slow drift of its own when nobody
 * has touched anything for a while.
 */
export type Uni = 'ink' | 'pixel' | 'comic' | 'water' | 'clay' | 'chalk' | 'hose';
export const UNIS: Uni[] = ['ink', 'pixel', 'comic', 'water', 'clay', 'chalk', 'hose'];
export const NAMES: Record<Uni, string> = { ink: 'INK', pixel: 'PIXEL', comic: 'COMIC', water: 'WATERCOLOUR', clay: 'CLAY', chalk: 'CHALK', hose: 'RUBBER HOSE' };
/** the pose prefix of his twin in each universe (none for ink: those are the originals) */
export const TWIN: Record<Uni, string> = { ink: '', pixel: 'pixel-', comic: 'comic-', water: 'water-', clay: 'clay-', chalk: 'chalk-', hose: 'hose-' };
/** how each world moves: frames a second for everything tweened (0: as smooth as the screen), the house ease, the speed of time */
export const MOTION: Record<Uni, { fps: number; ease: string; speed: number }> = {
  ink: { fps: 0, ease: 'power2.out', speed: 1 },
  pixel: { fps: 10, ease: 'steps(4)', speed: 1 },
  comic: { fps: 12, ease: 'back.out(2)', speed: 1.05 },
  water: { fps: 0, ease: 'sine.inOut', speed: 0.72 },
  clay: { fps: 12, ease: 'power1.inOut', speed: 0.9 },
  chalk: { fps: 12, ease: 'power2.out', speed: 0.95 },
  hose: { fps: 12, ease: 'elastic.out(1.2, 0.5)', speed: 1.1 },
};
/** the typefaces each world needs before it can be shown */
const FONTS: Record<Uni, string[]> = {
  ink: [],
  pixel: ['400 20px "Press Start 2P"', '400 20px VT323'],
  comic: ['400 20px Bangers'],
  water: ['400 20px "Caveat Brush"'],
  clay: ['700 20px Fredoka'],
  chalk: ['400 20px "Fredericka the Great"', '700 20px "Cabin Sketch"'],
  hose: ['400 20px Limelight', '900 20px "Londrina Solid"'],
};

let current: Uni = 'ink', switching = false, lastTouch = performance.now();
const subs = new Set<(u: Uni, prev: Uni) => void>();
export const universe = () => current;
export const nextUniverse = () => UNIS[(UNIS.indexOf(current) + 1) % UNIS.length];
/** be told when the universe changes (after the tokens have flipped) */
export function onUniverse(fn: (u: Uni, prev: Uni) => void) { subs.add(fn); return () => subs.delete(fn); }

const root = document.documentElement;
const readTokens = () => {
  const cs = getComputedStyle(root);
  for (const k of ['paper', 'ink', 'hot', 'sun', 'cool', 'mint'] as const) {
    const v = cs.getPropertyValue(k === 'paper' ? '--bg' : `--${k}`).trim();
    if (v) C[k] = v;
  }
};
function applyMotion(u: Uni) {
  const m = MOTION[u];
  gsap.ticker.fps(m.fps || 240);
  gsap.globalTimeline.timeScale(m.speed);
  gsap.defaults({ ease: m.ease });
}
const loadFonts = (u: Uni) => Promise.race([Promise.all(FONTS[u].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 1500))]);

/** the dimension glitch into another universe */
export async function setUniverse(u: Uni, via = 'code') {
  if (u === current || switching) return;
  switching = true;
  lastTouch = performance.now();
  root.classList.add('uni-switching');
  const prev = current;
  await loadFonts(u);
  glitchFlash(0.3);
  gsap.delayedCall(0.2, () => {
    current = u;
    root.dataset.uni = u;
    applyMotion(u);
    readTokens();
    strip?.update();
    subs.forEach((f) => f(u, prev));
    void loadFonts(nextUniverse());
  });
  gsap.delayedCall(0.56, () => { root.classList.remove('uni-switching'); switching = false; });
  void via;
}
/** the landing's stutter: two flickers into a universe, then it takes */
export function stutter(u: Uni) {
  if (current !== 'ink' || switching) return;
  void loadFonts(u).then(() => {
    const flick = (on: boolean) => { root.dataset.uni = on ? u : 'ink'; };
    gsap.timeline()
      .call(() => flick(true), [], 0).call(() => flick(false), [], 0.08)
      .call(() => flick(true), [], 0.26).call(() => flick(false), [], 0.38)
      .call(() => void setUniverse(u, 'stutter'), [], 0.7);
  });
}

// the strip of swatches in the header
let strip: { update: () => void } | null = null;
function makeStrip(header: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'uni-strip';
  el.setAttribute('aria-label', 'The universe');
  el.setAttribute('role', 'group');
  const dots = UNIS.map((u) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `uni-dot uni-dot-${u}`; b.setAttribute('aria-label', `${NAMES[u].toLowerCase()} universe`);
    b.addEventListener('click', () => void setUniverse(u, 'strip'));
    el.append(b);
    return b;
  });
  header.insertBefore(el, header.querySelector('.menu'));
  const update = () => dots.forEach((d, i) => { d.classList.toggle('on', UNIS[i] === current); d.setAttribute('aria-pressed', String(UNIS[i] === current)); });
  update();
  return { update };
}

export function initUniverse(opts: { header: HTMLElement; drift?: boolean }) {
  root.dataset.uni = current;
  readTokens();
  strip = makeStrip(opts.header);
  const touched = () => { lastTouch = performance.now(); };
  for (const e of ['pointerdown', 'wheel', 'touchmove', 'keydown'] as const) addEventListener(e, touched, { passive: true });
  // a slow drift of its own: every minute, if nobody has touched anything for a while
  if (opts.drift !== false) {
    const tick = () => { gsap.delayedCall(60, () => { if (!document.hidden && performance.now() - lastTouch > 15000) void setUniverse(nextUniverse(), 'drift'); tick(); }); };
    tick();
  }
  return { set: setUniverse, stutter, current: universe, next: nextUniverse };
}
