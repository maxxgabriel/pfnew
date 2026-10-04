import './style.css';
import { drawInk, drawPaperOver } from './acts/ink';
import { drawMachine, drawMachineBall } from './acts/machine';
import { drawMatch } from './acts/match';
import { drawFinale } from './acts/finale';
import { ACT, CHAPTERS, type Frame } from './core/frame';
import { clamp, damp, seg } from './core/math';
import { canvas, grainTiles } from './core/sprites';

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
    track.style.height = `${Math.round(ACT.END * beatPx + h)}px`;
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

let B = 0, prevB = 0, vB = 0;
let target = 0;
const readScroll = () => (target = clamp(window.scrollY / beatPx, 0, ACT.END));
window.addEventListener('scroll', readScroll, { passive: true });

let shakeAmt = 0, flashAmt = 0, flashColor = '#ffffff';

const frame: Frame = {
  ctx, w, h, u: 1, portrait: true, B, vB, t: 0, dt: 0, intro: 0, reduced,
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
const seek = (b: number) => window.scrollTo({ top: b * beatPx, behavior: reduced ? 'auto' : 'smooth' });

CHAPTERS.forEach((c, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = c.n;
  b.setAttribute('aria-label', `Chapter ${c.n}: ${c.name}`);
  b.style.left = `${(c.at / ACT.END) * 100}%`;
  b.addEventListener('click', () => seek(i === 0 ? 0 : c.at + 0.35));
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
  CHAPTERS.forEach((ch, i) => { if (B >= ch.at - 0.05) c = i; });
  if (c !== chapter) {
    chapter = c;
    chN.textContent = CHAPTERS[c].n;
    chName.textContent = CHAPTERS[c].name;
    chapterEl.classList.remove('swap');
    void chapterEl.offsetWidth;
    chapterEl.classList.add('swap');
    [...marks.children].forEach((m, i) => m.classList.toggle('on', i <= c));
  }
  fill.style.width = `${(B / ACT.END) * 100}%`;
  // dark type over paper, light type over everything else
  const onPaper = B < 1.75 || (B > 6.7 && B < 7.55) || B > 18.55;
  document.documentElement.classList.toggle('on-paper', onPaper);
  hello.classList.toggle('on', B > 20.15);
}

/* ---------------------------------------------------------------- loop */

let ready = false, readyAt = 0, last = performance.now(), t0 = last;
let introOverride: number | null = null;

let cost = 0;
function loop(now: number) {
  requestAnimationFrame(loop);
  const c0 = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = (now - t0) / 1000;

  prevB = B;
  B = Math.abs(target - B) < 0.0005 ? target : damp(B, target, reduced ? 14 : 6.5, dt);
  vB = dt > 0 ? (B - prevB) / dt : 0;

  frame.w = w; frame.h = h;
  frame.portrait = h > w;
  frame.u = Math.min(w, h * 0.62) / 100;
  frame.B = B; frame.vB = vB; frame.t = t; frame.dt = dt;
  frame.intro = introOverride ?? (ready ? (now - readyAt) / 1000 : 0);
  // landing mid-film skips the title sequence
  if (B > 1.2 && frame.intro < 6) frame.intro = 6;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  shakeAmt = damp(shakeAmt, 0, 9, dt);
  if (shakeAmt > 0.3) {
    ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
  }

  if (B < 6.8) drawInk(frame);
  if (B >= 6.85 && B < ACT.machineEnd) drawMachine(frame);
  if (B >= 6.75 && B < 7.9) {
    drawPaperOver(frame);
    drawMachineBall(frame);
  }
  if (B >= ACT.matchStart && B < ACT.matchEnd) drawMatch(frame);
  if (B >= ACT.finaleStart) drawFinale(frame);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  post(t, dt);
  hud();
  cost = cost * 0.9 + (performance.now() - c0) * 0.1;
}

function post(t: number, dt: number) {
  // letterbox: the film tightens to scope for the fights
  const lb = Math.max(seg(B, 2.5, 3.0) * (1 - seg(B, 6.0, 6.5)), seg(B, 15.3, 15.7) * (1 - seg(B, 16.9, 17.3)));
  if (lb > 0) {
    const bar = h * 0.085 * lb;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, bar);
    ctx.fillRect(0, h - bar, w, bar);
  }
  if (flashAmt > 0.01) {
    ctx.globalAlpha = flashAmt;
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    flashAmt = damp(flashAmt, 0, 10, dt);
  }
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
(window as unknown as { __film: unknown }).__film = {
  seek(b: number) {
    window.scrollTo(0, b * beatPx);
    target = b;
    B = b;
    prevB = b;
  },
  intro(s: number | null) { introOverride = s; },
  cost: () => cost,
};
