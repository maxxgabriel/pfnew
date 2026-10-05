import './style.css';
import { drawInk, drawPaperOver } from './acts/ink';
import { drawMachine, drawMachineBall, drawMachineCut } from './acts/machine';
import { drawMatch } from './acts/match';
import { drawCredits } from './acts/credits';
import { drawFinale } from './acts/finale';
import { alterShotP, drawAlter } from './acts/alter';
import { drawPowers } from './acts/powers';
import { drawSign } from './acts/sign';
import { drawDive } from './acts/dive';
import { posterRepaint, whipK, whipShift, whipSmear } from './core/cuts';
import { drawWorldTexture, worldOf } from './core/texture';
import { drawDrift } from './core/drift';
import { addTap, drawTaps } from './core/taps';
import { drawAfterSplit, drawTitan, titanShotP } from './acts/titan';
import { ACT, CHAPTERS, type Frame } from './core/frame';
import { clamp, damp, seg } from './core/math';
import { canvas, grainTiles } from './core/sprites';
import { ALTER_AT, HOLDS, POWERS_AT, RAW_END, TITAN_AT, toFilm, toRaw } from './core/holds';

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
const seekRaw = (r: number) => window.scrollTo({ top: r * beatPx, behavior: reduced ? 'auto' : 'smooth' });

CHAPTERS.forEach((c, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = c.n;
  b.setAttribute('aria-label', `Chapter ${c.n}: ${c.name}`);
  b.style.left = `${(toRaw(c.at) / RAW_END) * 100}%`;
  if (c.name === 'Alter') b.classList.add('feature');
  // chapters that live inside a hold jump to the start of the hold, not past it
  const inHold = HOLDS.find((hd) => hd.kind === ({ Alter: 'alter', Hello: 'powers' } as Record<string, string>)[c.name]);
  b.addEventListener('click', () => (inHold ? seekRaw(toRaw(inHold.at)) : seek(i === 0 ? 0 : c.at + 0.35)));
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
  if (frame.hold?.kind === 'alter') c = CHAPTERS.findIndex((ch) => ch.name === 'Alter');
  if (frame.hold?.kind === 'powers') c = CHAPTERS.findIndex((ch) => ch.name === 'Hello');
  if (frame.hold?.kind === 'dive') c = CHAPTERS.findIndex((ch) => ch.name === 'Match');
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
  const onPaper = B < 1.75 || (B > 6.7 && B < 7.55) || (B > POWERS_AT && B < 26.8) || (frame.hold?.kind === 'powers' && frame.hold.p > 0.68);
  document.documentElement.classList.toggle('on-paper', onPaper);
  hello.classList.toggle('on', (B > 20.7 && B < 22.6) || B > 29.45);
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
  frame.B = B; frame.vB = vB; frame.t = t; frame.dt = dt;
  frame.intro = introOverride ?? (ready ? (now - readyAt) / 1000 : 0);
  // landing mid-film skips the title sequence
  if (B > 1.2 && frame.intro < 6) frame.intro = 6;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  shakeAmt = damp(shakeAmt, 0, 9, dt);
  if (shakeAmt > 0.3) {
    ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
  }

  // the whip-pan between worlds moves the whole frame
  const wk = whipK(frame);
  if (wk > 0) ctx.translate(0, whipShift(wk, h));

  if (B < 6.8) {
    drawInk(frame);
    posterRepaint(frame);
  }
  // after TITAN the poster is torn open: the machine is gone and the night behind the page shows
  const torn = B > TITAN_AT;
  if (B >= 6.85 && B < ACT.machineEnd && !torn) drawMachine(frame);
  if (torn && B < ACT.matchStart) drawMatch({ ...frame, B: ACT.matchStart });
  if (B >= 6.75 && B < 7.9) {
    drawPaperOver(frame);
    drawMachineBall(frame);
  }
  // after the pull-back the film is on paper: the match is over
  if (B >= ACT.matchStart && B < ACT.matchEnd && !(B > POWERS_AT || frame.hold?.kind === 'powers')) drawMatch(frame);
  // what's left of the bolt climbs the night to where ALTER's target ring locks on
  if (torn && !frame.hold && B < ALTER_AT) drawAfterSplit(frame, seg(B, TITAN_AT, ALTER_AT - 0.04));
  if (frame.hold?.kind === 'alter' && frame.hold.p < 0.045) drawAfterSplit(frame, 1);
  // the gold bolt out of the machine, and its afterimage over the night sky
  if (B >= ACT.cut[0] && B < ACT.cut[1] + 0.1 && !torn) drawMachineCut(frame);
  if (B >= ACT.finaleStart && B < ACT.creditsStart + 0.4) drawFinale(frame);
  if (B >= ACT.creditsStart) drawCredits(frame);

  if (frame.hold?.kind === 'alter') drawAlter(frame, frame.hold.p);
  if (frame.hold?.kind === 'titan') drawTitan(frame, frame.hold.p);
  if (frame.hold?.kind === 'powers') drawPowers(frame, frame.hold.p);
  if (frame.hold?.kind === 'sign') drawSign(frame, frame.hold.p);
  if (frame.hold?.kind === 'dive') drawDive(frame, frame.hold.p);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (wk > 0) whipSmear(ctx, cvs, wk, w, h);
  post(t, dt);
  hud();
  cost = cost * 0.9 + (performance.now() - c0) * 0.1;
}

// tap to play: a tap (a click, so a scroll flick never fires one) gets an answer from the world on screen
let tapWorld: Parameters<typeof addTap>[3] = null;
let tapT = 0;
window.addEventListener('click', (e) => {
  if ((e.target as Element | null)?.closest?.('a, button, #hello, .reel-marks')) return;
  addTap(e.clientX, e.clientY, tapT, tapWorld);
});

function post(t: number, dt: number) {
  // letterbox: the film tightens to scope for the fights
  const lb = frame.hold?.kind === 'alter' ? 1 : Math.max(seg(B, 2.5, 3.0) * (1 - seg(B, 6.0, 6.5)), seg(B, 15.3, 15.7) * (1 - seg(B, 17.9, 18.3)), seg(B, 27.0, 27.3) * (1 - seg(B, 28.8, 29.1)));
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
  // each world printed on its own stuff, with the same drifting specks in its costume
  const wld = worldOf(frame, TITAN_AT);
  const onPage = frame.hold?.kind === 'sign' || (!frame.hold && B > POWERS_AT && B < ACT.creditsStart);
  tapWorld = wld ?? (onPage ? 'page' : null);
  tapT = t;
  drawDrift(ctx, tapWorld, w, h, t, B);
  drawTaps(ctx, w, h, t);
  drawWorldTexture(ctx, wld, w, h, t);
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
  /** jump into a hold (thunder, alter, dash, powers…) at its progress p */
  hold(kind: string, p = 0.5) {
    const h = HOLDS.find((k) => k.kind === kind)!;
    jumpRaw(toRaw(h.at) + h.len * Math.min(0.9999, p));
  },
  /** jump to TITAN's shot `name` at its own progress q */
  titan(name: string, q = 0.5) {
    const h = HOLDS.find((k) => k.kind === 'titan')!;
    jumpRaw(toRaw(h.at) + h.len * titanShotP(name, q));
  },
  /** jump to ALTER's shot `name` at its own progress q */
  alter(name: string, q = 0.5) {
    const h = HOLDS.find((k) => k.kind === 'alter')!;
    jumpRaw(toRaw(h.at) + h.len * alterShotP(name, q));
  },
  cost: () => cost,
};
