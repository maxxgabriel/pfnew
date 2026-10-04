import './style.css';
import { drawInk, drawPaperOver } from './acts/ink';
import { drawMachine, drawMachineBall } from './acts/machine';
import { drawMatch } from './acts/match';
import { drawArcade } from './acts/arcade';
import { drawCredits } from './acts/credits';
import { drawFinale } from './acts/finale';
import { ACT, CHAPTERS, type Frame } from './core/frame';
import { clamp, damp, seg } from './core/math';
import { canvas, grainTiles } from './core/sprites';
import { SIDE, TEAM, type Side } from './core/side';
import { RAW_END, toFilm, toRaw, type Mapped } from './core/timeline';
import { drawManifesto } from './acts/manifesto';
import { drawMuralClose, drawScrollInterlude } from './acts/scroll';
import { drawGlass } from './acts/overlay';

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
// the film renders here while an interlude holds it, so it can be framed as a painting
let stage: HTMLCanvasElement | null = null;
let stageCtx: CanvasRenderingContext2D | null = null;
let snaps: HTMLCanvasElement[] = [];
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
    beatPx = Math.max(400, h * 0.66);
    track.style.height = `${Math.round(RAW_END * beatPx + h)}px`;
  }
  const v = canvas(w, h);
  const g = v.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.22)');
  v.ctx.fillStyle = g;
  v.ctx.fillRect(0, 0, w, h);
  vignette = v.c;
  const st = canvas(w * dpr, h * dpr);
  stage = st.c;
  stageCtx = st.ctx;
  snaps = [];
  grainPat = grain.map((c) => ctx.createPattern(c, 'repeat')!);
}
window.addEventListener('resize', resize);
resize();

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ------------------------------------------------------------ playhead */

// R is the raw scroll playhead; B is film time (R with the interludes taken out)
let R = 0, B = 0, prevB = 0, vB = 0;
let mapped: Mapped = { film: 0, ins: null, p: 0 };
let target = 0;
let lastScrollAt = 0;
const readScroll = () => {
  target = clamp(window.scrollY / beatPx, 0, RAW_END);
  lastScrollAt = performance.now() / 1000;
};
window.addEventListener('scroll', readScroll, { passive: true });

let shakeAmt = 0, flashAmt = 0, flashColor = '#ffffff';

const frame: Frame = {
  ctx, w, h, u: 1, portrait: true, B, vB, t: 0, dt: 0, intro: 0, idle: 0, reduced,
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
const seek = (filmBeat: number) => window.scrollTo({ top: toRaw(filmBeat) * beatPx, behavior: reduced ? 'auto' : 'smooth' });

CHAPTERS.forEach((c, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = c.n;
  b.setAttribute('aria-label', `Chapter ${c.n}: ${c.name}`);
  b.style.left = `${(toRaw(c.at) / RAW_END) * 100}%`;
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

/* ---- pick a side */
const pick = document.getElementById('pick')!;
const chip = document.getElementById('side-chip')!;
function setSide(sd: Side, chosen = true) {
  SIDE.pick = sd;
  SIDE.chosen = SIDE.chosen || chosen;
  SIDE.changedAt = performance.now() / 1000;
  snaps = [];
  chip.style.setProperty('--c', TEAM[sd].c);
  chip.querySelector('span')!.textContent = TEAM[sd].name;
  chip.setAttribute('aria-label', `Your side: ${TEAM[sd].word}. Tap to switch.`);
  pick.querySelectorAll<HTMLElement>('.hilt').forEach((b) => b.classList.toggle('lit', b.dataset.side === sd));
}
pick.querySelectorAll<HTMLElement>('.hilt').forEach((b) =>
  b.addEventListener('click', () => {
    setSide(b.dataset.side as Side);
    pick.classList.add('done');
    frame.flash(0.25, TEAM[b.dataset.side as Side].c);
  }),
);
chip.addEventListener('click', () => {
  const next: Side = SIDE.pick === 'blue' ? 'green' : 'blue';
  setSide(next);
  frame.flash(0.3, TEAM[next].c);
});
setSide(SIDE.pick, false);

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
  fill.style.width = `${(R / RAW_END) * 100}%`;
  // dark type over paper, light type over everything else
  const ink = mapped.ins;
  const onPaper = ink ? ink.kind === 'manifesto' : B < 1.75 || (B > 6.7 && B < 7.55) || (B > 23.65 && B < 30.8);
  document.documentElement.classList.toggle('on-paper', onPaper);
  hello.classList.toggle('on', !mapped.ins && ((B > 25.25 && B < 26.6) || B > 33.45));
  // the choice is offered once the title has painted itself, and stays offered
  // (dimmed to the pick) until the viewer scrolls away from the title
  pick.classList.toggle('on', frame.intro > 4.6 && B < 0.22);
  chip.classList.toggle('on', B > 0.22 && B < 33.4);
}

/* ---------------------------------------------------------------- loop */

let ready = false, readyAt = 0, last = performance.now(), t0 = last;
let introOverride: number | null = null;
/** dev: 0 = live idle timer, otherwise a fixed idle of (value - 1) seconds */
let idleOff = 0;
let forceV: number | null = null;

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
  mapped = toFilm(R);
  B = mapped.film;

  frame.w = w; frame.h = h;
  frame.portrait = h > w;
  frame.u = Math.min(w, h * 0.62) / 100;
  frame.B = B; frame.vB = vB; frame.t = t; frame.dt = dt;
  frame.intro = introOverride ?? (ready ? (now - readyAt) / 1000 : 0);
  frame.idle = idleOff ? idleOff - 1 : Math.abs(target - R) < 0.01 ? now / 1000 - Math.max(lastScrollAt, readyAt / 1000) : 0;
  // landing mid-film skips the title sequence
  if (B > 1.2 && frame.intro < 6) frame.intro = 6;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  shakeAmt = damp(shakeAmt, 0, 9, dt);
  if (shakeAmt > 0.3) {
    ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
  }

  const ins = mapped.ins;
  if (ins && ins.kind === 'scroll' && stageCtx) {
    // render the held frame offstage, then hang it on the scroll
    stageCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    frame.ctx = stageCtx;
    drawFilm(frame);
    frame.ctx = ctx;
    drawScrollInterlude(frame, mapped.p, ins.act, stage, snapshot, dpr);
  } else if (ins && ins.kind === 'mural') {
    drawMuralClose(frame, mapped.p, snapshot);
  } else {
    drawFilm(frame);
    if (ins && ins.kind === 'manifesto') drawManifesto(frame, mapped.p);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawGlass(frame, { vR: forceV ?? vB, inInterlude: !!mapped.ins });
  sliceReel();
  post(t, dt);
  hud();
  cost = cost * 0.9 + (performance.now() - c0) * 0.1;
}

function drawFilm(fr: Frame) {
  const b = fr.B;
  if (b < 6.8) drawInk(fr);
  if (b >= 6.85 && b < ACT.machineEnd) drawMachine(fr);
  if (b >= 6.75 && b < 7.9) {
    drawPaperOver(fr);
    drawMachineBall(fr);
  }
  // the match starts underneath the arcade's warp-out, so it is drawn first
  if (b >= ACT.matchStart && b < ACT.matchEnd) drawMatch(fr);
  if (b >= ACT.arcadeStart && b < ACT.arcadeEnd) drawArcade(fr);
  if (b >= ACT.finaleStart && b < ACT.creditsStart + 0.4) drawFinale(fr);
  if (b >= ACT.creditsStart) drawCredits(fr);
}

/** a still of each act, rendered once, for the scroll's finished panels */
const REP = [3.62, 9.4, 13.95, 20.2, 25.58];
function snapshot(i: number): HTMLCanvasElement | null {
  if (snaps[i]) return snaps[i];
  const c = canvas(w, h);
  const fr: Frame = {
    ...frame, ctx: c.ctx, B: REP[i], intro: 10,
    crossed: () => false, crossedFwd: () => false, shake: () => {}, flash: () => {},
  };
  drawFilm(fr);
  snaps[i] = c.c;
  return c.c;
}

/** each blade clash cuts the chapter reel in two */
const reel = document.querySelector('.reel')!;
function sliceReel() {
  for (const c of [3.55, 4.12, 4.45, 4.75]) {
    if (frame.crossedFwd(c)) {
      reel.classList.remove('sliced');
      void (reel as HTMLElement).offsetWidth;
      reel.classList.add('sliced');
    }
  }
}

function post(t: number, dt: number) {
  // letterbox: the film tightens to scope for the fights
  const lb = Math.max(seg(B, 2.5, 3.0) * (1 - seg(B, 6.0, 6.5)), seg(B, 19.3, 19.7) * (1 - seg(B, 21.9, 22.3)), seg(B, 31.0, 31.3) * (1 - seg(B, 32.8, 33.1)));
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
  if (vignette && mapped.ins?.kind !== 'manifesto') ctx.drawImage(vignette, 0, 0, w, h);
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
  /** jump to a raw (scroll) beat */
  seek(b: number) {
    window.scrollTo(0, b * beatPx);
    target = b;
    R = b;
    mapped = toFilm(b);
    B = prevB = mapped.film;
  },
  /** jump to a film beat */
  seekFilm(b: number) {
    (window as unknown as { __film: { seek(x: number): void } }).__film.seek(toRaw(b) + 1e-4);
  },
  raw: (b: number) => toRaw(b),
  intro(s: number | null) { introOverride = s; },
  cost: () => cost,
  idle: () => frame.idle,
  setV(v: number | null) { forceV = v; },
  setIdle(v: number | null) { idleOff = v === null ? 0 : v + 1; },
};
