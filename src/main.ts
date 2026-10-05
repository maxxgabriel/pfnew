import './style.css';
import { T, drawStory, storyMove, storyTap } from './water/story';
import { CHAPTERS, type Frame } from './core/frame';
import { clamp, damp } from './core/math';
import { canvas, grainTiles } from './core/sprites';
import { HOLDS, RAW_END, toFilm, toRaw } from './core/holds';

/*
 * THE FILM.
 *
 * One fixed canvas; the page underneath is only a scroll track. Scrolling
 * moves a playhead (in beats) and every scene is a pure function of that
 * playhead plus the wall clock — so scrolling back runs the film backwards,
 * and when the reader stops, the ambient motion keeps playing.
 */

const cvs = document.getElementById('film') as HTMLCanvasElement;
const ctx = cvs.getContext('2d', { alpha: false })!;
const track = document.getElementById('track')!;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

let w = 0, h = 0, dpr = 1, beatPx = 600, lastW = 0;
let vignette: HTMLCanvasElement | null = null;
const grain = grainTiles(4, 180);
let grainPat: CanvasPattern[] = [];

function resize() {
  w = window.innerWidth;
  h = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = Math.round(w * dpr);
  cvs.height = Math.round(h * dpr);
  // the beat length only follows width changes, so the iOS toolbar
  // collapsing does not yank the playhead
  if (w !== lastW) {
    lastW = w;
    beatPx = Math.max(420, h * 0.72);
    track.style.height = `${Math.round(RAW_END * beatPx + h)}px`;
  }
  const v = canvas(w, h);
  const g = v.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.22)');
  v.ctx.fillStyle = g;
  v.ctx.fillRect(0, 0, w, h);
  vignette = v.c;
  grainPat = grain.map((c) => ctx.createPattern(c, 'repeat')!);
}
window.addEventListener('resize', resize);
resize();

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ------------------------------------------------------------ playhead */

// R is the raw scroll playhead; B is film time (R with the holds taken out)
let R = 0, B = 0, prevB = 0, vB = 0;
let target = 0;
const readScroll = () => (target = clamp(window.scrollY / beatPx, 0, RAW_END));
window.addEventListener('scroll', readScroll, { passive: true });

let shakeAmt = 0, flashAmt = 0, flashColor = '#ffffff';

const frame: Frame = {
  ctx, w, h, u: 1, portrait: true, B, vB, t: 0, dt: 0, intro: 0, hold: null, reduced,
  crossed: (b) => (prevB < b) !== (B < b),
  crossedFwd: (b) => prevB < b && B >= b,
  shake: (a) => { if (!reduced) shakeAmt = Math.max(shakeAmt, a); },
  flash: (a, c = '#ffffff') => { flashAmt = Math.max(flashAmt, reduced ? a * 0.3 : a); flashColor = c; },
};

/* ----------------------------------------------------------------- hud */

const chN = document.getElementById('ch-n')!;
const chName = document.getElementById('ch-name')!;
const chapterEl = chName.parentElement!;
const fill = document.getElementById('reel-fill')!;
const marks = document.getElementById('reel-marks')!;
const hello = document.getElementById('hello')!;
const seek = (b: number) => window.scrollTo({ top: toRaw(b) * beatPx, behavior: reduced ? 'auto' : 'smooth' });

CHAPTERS.forEach((c, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = c.n;
  b.setAttribute('aria-label', `Chapter ${c.n}: ${c.name}`);
  b.style.left = `${(toRaw(c.at) / RAW_END) * 100}%`;
  // each mark plays its own tiny loop of that world, then the film jumps there
  b.addEventListener('click', () => seek(i === 0 ? 0 : c.at + 0.1));
  marks.appendChild(b);
});
document.getElementById('home')!.addEventListener('click', () => seek(0));
document.getElementById('again')!.addEventListener('click', () => seek(0));
document.getElementById('copy')!.addEventListener('click', (e) => {
  const btn = e.currentTarget as HTMLButtonElement;
  const text = document.getElementById('mail')!.textContent ?? '';
  const done = () => { btn.textContent = 'Copied'; setTimeout(() => (btn.textContent = 'Copy'), 1600); };
  navigator.clipboard?.writeText(text).then(done, () => {
    const r = document.createRange();
    r.selectNodeContents(document.getElementById('mail')!);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(r);
  });
});

let chapter = -1;
function hud() {
  let c = 0;
  // (a mark shows a touch early, except where chapters sit close together round the holds)
  CHAPTERS.forEach((ch, i) => { if (B >= ch.at - (i && ch.at - CHAPTERS[i - 1].at < 0.2 ? 0 : 0.05)) c = i; });
  if (c !== chapter) {
    chapter = c;
    chN.textContent = CHAPTERS[c].n;
    chName.textContent = CHAPTERS[c].name;
    chapterEl.classList.remove('swap');
    void chapterEl.offsetWidth;
    chapterEl.classList.add('swap');
    [...marks.children].forEach((m, i) => m.classList.toggle('on', i <= c));
  }
  fill.style.width = `${(R / RAW_END) * 100}%`;
  // dark type over paper, light type over everything else
  const onPaper = B < T.night[0] + 0.3 || B > T.dawn[1];
  document.documentElement.classList.toggle('on-paper', onPaper);
  hello.classList.toggle('on', B > T.enso[1] - 0.1);
}

/* ---------------------------------------------------------------- loop */

let ready = false, readyAt = 0, last = performance.now(), t0 = last;
let introOverride: number | null = null;
let velOverride: number | null = null;

let cost = 0;
function loop(now: number) {
  requestAnimationFrame(loop);
  const c0 = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = (now - t0) / 1000;

  const prevR = R;
  R = Math.abs(target - R) < 0.0005 ? target : damp(R, target, reduced ? 14 : 6.5, dt);
  vB = dt > 0 ? (R - prevR) / dt : 0;
  prevB = B;
  const m = toFilm(R);
  B = m.film;
  frame.hold = m.hold;

  frame.w = w; frame.h = h;
  frame.portrait = h > w;
  frame.u = Math.min(w, h * 0.62) / 100;
  frame.B = B; frame.vB = velOverride ?? vB; frame.t = t; frame.dt = dt;
  frame.intro = introOverride ?? (ready ? (now - readyAt) / 1000 : 0);
  // landing mid-film skips the title sequence
  if (B > 1.2 && frame.intro < 6) frame.intro = 6;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  shakeAmt = damp(shakeAmt, 0, 9, dt);
  if (shakeAmt > 0.3) {
    ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
  }

  // ink in water: the whole film (src/water)
  drawStory(frame);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  post(t, dt);
  hud();
  cost = cost * 0.9 + (performance.now() - c0) * 0.1;
}

let tapT = 0;
// the finger stirs the water (listening only: the page still scrolls); a tap drops ink
window.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' || e.buttons & 1) storyMove(e.clientX, e.clientY, tapT, w, h); }, { passive: true });
window.addEventListener('touchmove', (e) => { const p = e.touches[0]; if (p) storyMove(p.clientX, p.clientY, tapT, w, h); }, { passive: true });
window.addEventListener('click', (e) => {
  if ((e.target as Element | null)?.closest?.('a, button, #hello, .reel-marks')) return;
  storyTap(e.clientX, e.clientY, tapT, w, h);
});

function post(t: number, dt: number) {
  if (flashAmt > 0.01) {
    ctx.globalAlpha = flashAmt;
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    flashAmt = damp(flashAmt, 0, 10, dt);
  }
  tapT = t;
  if (vignette) ctx.drawImage(vignette, 0, 0, w, h);
  // grain
  const pat = grainPat[Math.floor(t * 24) % grainPat.length];
  if (pat) {
    ctx.save();
    // overlay grain where blending is cheap; plain low-alpha grain on phones
    ctx.globalAlpha = coarse ? 0.035 : 0.07;
    ctx.globalCompositeOperation = coarse ? 'source-over' : 'overlay';
    ctx.translate((Math.random() * 180) | 0, (Math.random() * 180) | 0);
    ctx.fillStyle = pat;
    ctx.fillRect(-180, -180, w + 180, h + 180);
    ctx.restore();
  }
}

/* ------------------------------------------------------------- startup */

const fontsReady = Promise.race([
  Promise.all([
    document.fonts.load('40px "Dela Gothic One"'),
    document.fonts.load('600 20px "Shippori Mincho"'),
  ]),
  new Promise((r) => setTimeout(r, 2500)),
]);
fontsReady.then(() => {
  ready = true;
  readyAt = performance.now();
});
requestAnimationFrame(loop);

// dev hook: jump the playhead (used by the screenshot scripts)
function jumpRaw(b: number) {
  window.scrollTo(0, b * beatPx);
  target = b;
  R = b;
  B = prevB = toFilm(b).film;
}
(window as unknown as { __film: unknown }).__film = {
  /** jump to a raw (scroll) beat */
  seek: jumpRaw,
  /** jump to a film beat (just past any hold that sits there) */
  seekFilm(b: number) {
    const raw = toRaw(b) + 1e-4;
    window.scrollTo(0, raw * beatPx);
    target = R = raw;
    B = prevB = toFilm(raw).film;
  },
  intro(s: number | null) { introOverride = s; },
  /** dev: pretend the reader is scrolling at v raw beats/s (null to stop) */
  vel(v: number | null) { velOverride = v; },
  /** jump into a hold (thunder, alter, dash, powers…) at its progress p */
  hold(kind: string, p = 0.5) {
    const h = HOLDS.find((k) => k.kind === kind)!;
    jumpRaw(toRaw(h.at) + h.len * Math.min(0.9999, p));
  },
  cost: () => cost,
};
