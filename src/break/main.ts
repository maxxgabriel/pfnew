import * as THREE from 'three';
import Lenis from 'lenis';
import '@fontsource/permanent-marker';
import './break.css';
import { canvasArt, preload, seq } from './art';
import { Director } from './director';
import { makeLayout } from './layout';
import { floorKeys } from './scenes/floor';
import { homeKeys } from './scenes/home';
import { TOTAL, pxPerBeat } from './timeline';

/*
 * BREAK LOOSE — a scroll-driven piece in the shape of a music video, with no music: the rhythm is in
 * the cutting. A generic website falls apart and the ink boy turns it into Max's site. The scroll
 * position is the playhead (in beats); the clock only drives the loops that keep it alive while you
 * watch. Fine pointers get smooth wheel scrolling; phones scroll natively.
 */
THREE.ColorManagement.enabled = false;
const canvas = document.querySelector<HTMLCanvasElement>('.stage')!;
const track = document.querySelector<HTMLElement>('.track')!;
const hi = document.querySelector<HTMLAnchorElement>('.hi')!;
const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const dpr = () => Math.min(devicePixelRatio || 1, 2);
const size = () => ({ W: canvas.clientWidth || innerWidth, H: canvas.clientHeight || innerHeight });

let { W, H } = size();
let L = makeLayout(W, H), ppb = pxPerBeat(H);
const dir = new Director(L, calm);
function applySize() {
  renderer.setPixelRatio(dpr());
  renderer.setSize(W, H, false);
  dir.post.setSize(Math.round(W * dpr()), Math.round(H * dpr()), dpr());
  track.style.height = `${Math.round(TOTAL * ppb + H)}px`;
}
applySize();

const lenis = touch ? null : new Lenis({ duration: 1.15, smoothWheel: true });
let b = 0, target = 0, t = 0, last = performance.now(), moved = 0;
let frozen: number | null = null, forcedIdle: number | null = null;
const read = () => (lenis ? lenis.scroll : scrollY) / ppb;

addEventListener('resize', () => {
  const n = size();
  if (n.W === W && Math.abs(n.H - H) < 120) return; // a phone toolbar sliding in and out: keep the stage
  const at = b;
  ({ W, H } = n);
  L = makeLayout(W, H); ppb = pxPerBeat(H);
  dir.layout(L); applySize();
  if (lenis) lenis.scrollTo(at * ppb, { immediate: true, force: true }); else scrollTo(0, at * ppb);
});

function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  lenis?.raf(now);
  t = frozen ?? t + dt;
  const nt = Math.max(0, Math.min(TOTAL, read()));
  if (Math.abs(nt - target) > 1e-4) moved = t;
  target = nt;
  b += (target - b) * (1 - Math.exp(-dt * (lenis ? 14 : 9)));
  if (Math.abs(target - b) < 1e-4) b = target;
  dir.update(b, t, forcedIdle ?? Math.min(1, Math.max(0, (t - moved - 0.5) / 0.6)));
  dir.render(renderer);
  if (theme.content !== dir.c.theme) theme.content = dir.c.theme;
  // the painted button becomes a real link at the end
  if (dir.c.hi) {
    const r = dir.ctaRect();
    Object.assign(hi.style, { transform: `translate(${r.x}px, ${r.y}px)`, width: `${r.w}px`, height: `${r.h}px` });
    if (!hi.classList.contains('on')) { hi.classList.add('on'); hi.tabIndex = 0; }
  } else if (hi.classList.contains('on')) { hi.classList.remove('on'); hi.tabIndex = -1; }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// his drawings for the opening first, the rest after
const first = ['closeup_0', 'closeup_2', 'leap_0', 'leap_2', 'leap_3', 'fall_2', 'fall_0', 'hero_0', 'hero_1', 'hero_3'];
const rest = [
  'still_0', 'still_3', ...seq('snap', 2), ...seq('moonwalk6', 6), ...seq('swing', 4), ...seq('ride', 4), ...seq('powerup', 3), ...floorKeys(),
  'fine_0', 'fine_1', 'curious', ...homeKeys,
];
// the button's words, in the site's marker lettering
canvasArt('say_hi', 512, 160, async (g) => {
  await document.fonts.load('120px "Permanent Marker"');
  g.font = '120px "Permanent Marker"'; g.fillStyle = '#efe9dc'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('SAY HI', 256, 86);
});
const ready = preload(first).then(() => preload(rest));

// dev hook for scripts/shoot-break.mjs: jump the playhead, stop the clock, fake an idle viewer
(window as unknown as { __brk: object }).__brk = {
  ready,
  seek(beat: number) {
    b = target = beat;
    if (lenis) lenis.scrollTo(beat * ppb, { immediate: true, force: true }); else scrollTo(0, beat * ppb);
  },
  freeze(time: number | null) { frozen = time; if (time !== null) t = time; },
  idle(v: number | null) { forcedIdle = v; },
  get b() { return b; },
};
