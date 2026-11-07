import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import manifest from '../assets/sketch/manifest.json';
import { url } from './art';
import { deepPoint, flyInto } from './deep';
import { BEAT, C, calm, darkHeader, glitchFlash, onBeat, shake } from './kit';
import { Speed } from './lines';
import './dive.css';
gsap.registerPlugin(ScrollTrigger);

/*
 * THE DIVE — page two. The scroll is a fall through the tagline. First the camera flies into the A
 * of his name until red fills the screen; then one giant word per world, every world the colour of
 * the letter you fell into, every word doing what it says:
 *   I MAKE LETTERS  red     each letter changes typeface on every beat, a ransom note reshuffling
 *   DANCE           ink     a chorus line on the beat: hops, a crouch, a jump with a spin, a sway
 *   AND SHAPES      butter  letters keep turning into shapes and back
 *   MISBEHAVE       sky     letters act up; then it glitches apart and switches off like an old TV,
 *                           leaving the paper of the next section
 * He falls with you the whole way. Every landing is a slam, a shake, a flash and a burst of speed
 * lines. The scroll drives the camera (scroll back and it rewinds); the beat drives the letters.
 */
type Move = 'letters' | 'dance' | 'shapes' | 'misbehave';
type Def = { text: string; pre?: string; bg: string; fg: string; family: string; weight: string; stretch?: string; move: Move; dark: boolean };
const DEFS: Def[] = [
  { text: 'LETTERS', pre: 'I MAKE', bg: C.hot, fg: C.ink, family: 'Anton', weight: '400', move: 'letters', dark: true },
  { text: 'DANCE', bg: C.ink, fg: C.sun, family: 'Bangers', weight: '400', move: 'dance', dark: true },
  { text: 'SHAPES', pre: 'AND', bg: C.sun, fg: C.cool, family: 'Anybody', weight: '900', stretch: 'condensed', move: 'shapes', dark: false },
  { text: 'MISBEHAVE', bg: C.cool, fg: C.paper, family: 'Anton', weight: '400', move: 'misbehave', dark: true },
];
/** the LETTERS world's typefaces (index 0 is its own, and the one it holds when you dive in) */
const FACES = [
  { family: 'Anton', weight: '400', stretch: 'normal' },
  { family: 'Bangers', weight: '400', stretch: 'normal' },
  { family: 'Montserrat', weight: '900', stretch: 'normal' },
  { family: '"Bebas Neue"', weight: '400', stretch: 'normal' },
  { family: 'Jost', weight: '800', stretch: 'normal' },
  { family: 'Anybody', weight: '900', stretch: 'expanded' },
];
const SHAPES = [
  '<circle cx="50" cy="50" r="48"/>',
  '<path d="M50 2 98 98H2Z"/>',
  '<rect x="3" y="3" width="94" height="94" rx="10"/>',
  '<path d="M2 98A48 48 0 0 1 98 98Z"/>',
  '<path d="M50 0C55 38 62 45 100 50 62 55 55 62 50 100 45 62 38 55 0 50 38 45 45 38 50 0Z"/>',
  '<path d="M4 76 26 24 50 76 74 24 96 76" fill="none" stroke="currentColor" stroke-width="17" stroke-linejoin="round" stroke-linecap="round"/>',
];
type Meta = { w: number; h: number; face: number };
const META = manifest as unknown as Record<string, Meta>;

// scroll lengths, in screens
const Z0 = 0.8, HOLD = 0.32, ZOOM = 0.52, CHAOS = 0.42, CRT = 0.24, SEG = HOLD + ZOOM;
const LEN = Z0 + 3 * SEG + HOLD + CHAOS + CRT;

type World = Def & {
  el: HTMLElement; hit: HTMLElement; cam: HTMLElement; word: HTMLElement; small: HTMLElement | null; probe: HTMLElement;
  cells: HTMLElement[]; glyphs: HTMLElement[]; shapes: SVGSVGElement[];
  fs: number; P: { x: number; y: number }; Z: number; fitX: number[][];
};

export function initDive(opening: HTMLElement, hero: { zoom: (u: number) => void }) {
  const root = opening.querySelector<HTMLElement>('.dive')!;
  const heroEl = opening.querySelector<HTMLElement>('.hero')!;
  root.insertAdjacentHTML('beforeend', '<div class="dv-screen"><div class="dv-bg"></div></div>');
  const screen = root.querySelector<HTMLElement>('.dv-screen')!, bg = root.querySelector<HTMLElement>('.dv-bg')!;
  const lines = new Speed(screen, 'dv-lines');
  const worlds: World[] = DEFS.map((d) => {
    const el = document.createElement('div');
    el.className = `dv-world dv-${d.move}`;
    el.setAttribute('aria-hidden', 'true');
    el.style.color = d.fg;
    el.innerHTML = `<div class="dv-cam"><div class="dv-hit">${d.pre ? `<p class="dv-small">${d.pre}</p>` : ''}<p class="dv-word"></p></div></div>`;
    const word = el.querySelector<HTMLElement>('.dv-word')!;
    Object.assign(word.style, { fontFamily: d.family, fontWeight: d.weight, fontStretch: d.stretch === 'condensed' ? '75%' : '' });
    const cells: HTMLElement[] = [], glyphs: HTMLElement[] = [], shapes: SVGSVGElement[] = [];
    for (const ch of d.text) {
      const c = document.createElement('span'), g = document.createElement('span');
      c.className = 'dl'; g.className = 'dg'; g.textContent = ch;
      c.append(g); word.append(c); cells.push(c); glyphs.push(g);
      if (d.move === 'shapes') {
        const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('preserveAspectRatio', 'none'); s.classList.add('dv-shape');
        c.append(s); shapes.push(s);
      }
    }
    const probe = document.createElement('i');
    probe.className = 'dv-probe';
    word.append(probe);
    screen.append(el);
    return { ...d, el, hit: el.querySelector<HTMLElement>('.dv-hit')!, cam: el.querySelector<HTMLElement>('.dv-cam')!, word, small: el.querySelector<HTMLElement>('.dv-small'), probe,
      cells, glyphs, shapes, fs: 100, P: { x: 0, y: 0 }, Z: 2, fitX: [] };
  });
  screen.insertAdjacentHTML('beforeend', '<i class="dv-fill"></i><img class="dv-boy" alt="" /><i class="dv-flash"></i>');
  const fill = screen.querySelector<HTMLElement>('.dv-fill')!, flash = screen.querySelector<HTMLElement>('.dv-flash')!;
  const boyEl = screen.querySelector<HTMLImageElement>('.dv-boy')!;

  // ---- layout: every word fills the width, stretched tall on tall screens, its dive point found
  let W = 1, H = 1;
  const meas = document.createElement('canvas').getContext('2d')!;
  const measure = (text: string, family: string, weight: string, stretch: string, px: number) => {
    meas.font = `${weight} ${px}px ${family}`;
    if ('fontStretch' in meas) (meas as unknown as { fontStretch: string }).fontStretch = stretch;
    return meas.measureText(text);
  };
  function fit() {
    W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight;
    const phone = W < 760, portrait = H > W;
    for (const w of worlds) {
      rest(w);
      w.word.style.transform = '';
      w.cells.forEach((c) => { c.style.width = ''; });
      w.word.style.fontSize = '100px';
      const wide = w.word.offsetWidth;
      const cap = measure('H', w.family, w.weight, w.stretch ?? 'normal', 100).actualBoundingBoxAscent / 100;
      w.fs = Math.min((W * (phone ? 0.9 : 0.84) * 100) / wide, (H * 0.62) / cap);
      w.word.style.fontSize = `${w.fs}px`;
      const capH = cap * w.fs;
      const tall = gsap.utils.clamp(1, portrait ? 2.6 : 1.25, (H * (portrait ? 0.3 : 0.38)) / capH);
      w.cells.forEach((c) => { c.style.width = `${c.offsetWidth}px`; });
      const base = w.probe.offsetTop;
      const smallH = w.small ? w.small.offsetHeight + H * 0.03 : 0;
      const baseY = H * 0.53 + (capH * tall) / 2 + smallH / 2;
      const left = (W - w.word.offsetWidth) / 2;
      Object.assign(w.word.style, { left: `${left}px`, top: `${baseY - base}px`, transformOrigin: `0 ${base}px`, transform: `scaleY(${tall})` });
      if (w.small) w.small.style.top = `${baseY - capH * tall - smallH}px`;
      // the shapes stand where the letters stand
      w.shapes.forEach((s, i) => {
        const c = w.cells[i];
        Object.assign(s.style, { left: '0px', width: `${c.offsetWidth}px`, top: `${base - c.offsetTop - capH}px`, height: `${capH}px` });
      });
      // the LETTERS world: how much each typeface must narrow to fit each cell
      if (w.move === 'letters') {
        w.fitX = w.glyphs.map((g, i) => FACES.map((f) => Math.min(1, (w.cells[i].offsetWidth * 0.98) / Math.max(1, measure(g.textContent ?? '', f.family, f.weight, f.stretch, w.fs).width))));
      }
      // the dive point: the deepest ink in the thickest letter
      let best = { r: 0, x: 0, y: 0 };
      w.glyphs.forEach((g, i) => {
        const d = deepPoint(g.textContent ?? '', w.family, w.weight, w.stretch ?? 'normal');
        const r = d.r * w.fs;
        if (r > best.r) best = { r, x: left + w.cells[i].offsetLeft + (w.cells[i].offsetWidth - d.adv * w.fs) / 2 + d.x * w.fs, y: baseY + d.y * w.fs * tall };
      });
      w.P = { x: best.x, y: best.y };
      w.Z = Math.max(2, (Math.hypot(W, H) / 2 / Math.max(1.5, best.r)) * 1.2);
    }
    lines.size(W, H);
    boy.face = Math.min(W, H) * (phone ? 0.15 : 0.11);
    boy.cx = W * (phone ? 0.76 : 0.8); boy.cy = H * (phone ? 0.22 : 0.27);
    placeBoy();
    last = -1;
  }

  // ---- him, falling
  const boy = { key: '', face: 40, cx: 0, cy: 0, rot: 0, dx: 0, dy: 0 };
  function pose(key: string) { if (key !== boy.key && META[key]) { boy.key = key; boyEl.src = url(key); placeBoy(); } }
  function placeBoy() {
    const m = META[boy.key];
    if (!m) return;
    const s = boy.face / m.face, w = m.w * s, h = m.h * s;
    boyEl.style.width = `${w}px`; boyEl.style.height = `${h}px`;
    boyEl.style.transform = `translate(${boy.cx + boy.dx - w / 2}px, ${boy.cy + boy.dy - h / 2}px) rotate(${boy.rot}deg)`;
  }
  pose('fall_0');

  // ---- what each word does while you hang in its world
  let stopMove = () => {};
  const rnd = gsap.utils.random;
  function rest(w: World) {
    gsap.killTweensOf([...w.cells, ...w.glyphs, ...w.shapes]);
    gsap.set(w.cells, { x: 0, y: 0, xPercent: 0, yPercent: 0, rotation: 0, scale: 1, scaleX: 1, scaleY: 1 });
    w.glyphs.forEach((g) => { g.style.cssText = ''; gsap.set(g, { scale: 1 }); });
    w.shapes.forEach((s) => gsap.set(s, { scale: 0 }));
    gsap.set(w.word, { '--mis': '0px' });
    w.word.classList.remove('plates');
  }
  function startMove(w: World) {
    stopMove();
    if (calm) { stopMove = () => {}; return; }
    const L = w.cells;
    let off = () => {};
    if (w.move === 'letters') {
      off = onBeat((n) => w.glyphs.forEach((g, i) => {
        const f = (n + i * 2) % FACES.length, face = FACES[f];
        Object.assign(g.style, { fontFamily: face.family, fontWeight: face.weight, fontStretch: face.stretch === 'expanded' ? '125%' : '', color: (n + i) % 3 === 0 ? C.paper : '' });
        gsap.set(g, { scaleX: w.fitX[i]?.[f] ?? 1 });
        gsap.fromTo(L[i], { scale: 1.14, rotation: rnd(-8, 8) }, { scale: 1, rotation: rnd(-3, 3), duration: 0.42, ease: 'back.out(3)', overwrite: true });
      }));
    } else if (w.move === 'dance') {
      off = onBeat((n) => {
        const b = n % 8;
        if (b < 4) L.forEach((c, i) => {
          if (i % 2 !== b % 2) return;
          const side = (i + b) % 4 < 2 ? 1 : -1;
          gsap.timeline({ defaults: { overwrite: 'auto' } })
            .to(c, { yPercent: -26, rotation: 12 * side, scaleY: 1.06, duration: 0.2, ease: 'power2.out' })
            .to(c, { yPercent: 0, rotation: 0, scaleY: 1, duration: 0.17, ease: 'power2.in' })
            .to(c, { scaleY: 0.8, scaleX: 1.12, duration: 0.05 })
            .to(c, { scaleY: 1, scaleX: 1, duration: 0.4, ease: 'elastic.out(1.2, 0.4)' });
        });
        else if (b === 4) gsap.to(L, { scaleY: 0.74, scaleX: 1.1, yPercent: 0, rotation: 0, duration: BEAT * 0.85, ease: 'power2.out', overwrite: true });
        else if (b === 5) gsap.timeline({ defaults: { overwrite: 'auto' } })
          .to(L, { yPercent: -52, scaleY: 1.1, scaleX: 0.94, rotation: 180, duration: BEAT * 0.45, ease: 'power2.out', stagger: 0.025 })
          .to(L, { yPercent: 0, scaleY: 1, scaleX: 1, rotation: 360, duration: BEAT * 0.45, ease: 'power2.in', stagger: 0.025 })
          .set(L, { rotation: 0 })
          .to(L, { scaleY: 0.82, scaleX: 1.1, duration: 0.05 })
          .to(L, { scaleY: 1, scaleX: 1, duration: 0.4, ease: 'elastic.out(1.2, 0.4)' });
        else gsap.to(L, { xPercent: b === 6 ? 14 : -14, rotation: b === 6 ? 9 : -9, duration: BEAT * 0.5, ease: 'back.out(2.5)', stagger: { each: 0.03, from: b === 6 ? 'end' : 'start' }, overwrite: true });
        if (b === 0) gsap.to(L, { xPercent: 0, duration: 0.3, ease: 'power2.out' });
      });
    } else if (w.move === 'shapes') {
      const on = new Set<number>();
      off = onBeat((n) => {
        const k = L.length, pick = [n % k, (n + 3) % k];
        on.forEach((i) => { if (pick.includes(i)) return; on.delete(i); toLetter(w, i); });
        pick.forEach((i, j) => { if (on.has(i)) return; on.add(i); toShape(w, i, SHAPES[(n + i + j * 2) % SHAPES.length]); });
      });
    } else {
      // MISBEHAVE: one or two letters act up on every beat, then pretend nothing happened
      const ACTS: ((c: HTMLElement) => gsap.core.Timeline)[] = [
        (c) => gsap.timeline().set(c, { transformOrigin: '100% 92%' }).to(c, { rotation: 90, duration: 0.42, ease: 'bounce.out' }).to(c, { rotation: 0, duration: 0.4, ease: 'back.out(2.4)' }, `+=${BEAT * 0.6}`).set(c, { transformOrigin: '50% 90%' }),
        (c) => gsap.timeline().to(c, { rotation: 180, duration: 0.08, ease: 'steps(1)' }).to(c, { rotation: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' }, `+=${BEAT * 0.8}`),
        (c) => gsap.timeline().to(c, { yPercent: -70, rotation: rnd(-40, 40), duration: 0.24, ease: 'power2.out' }).to(c, { yPercent: 0, rotation: 0, duration: 0.22, ease: 'power2.in' }).to(c, { scaleY: 0.75, scaleX: 1.2, duration: 0.05 }).to(c, { scaleY: 1, scaleX: 1, duration: 0.45, ease: 'elastic.out(1.2, 0.4)' }),
        (c) => gsap.timeline().to(c, { scaleX: 1.9, duration: 0.12, ease: 'power3.out' }).to(c, { scaleX: 1, duration: 0.8, ease: 'elastic.out(1.1, 0.3)' }, `+=${BEAT * 0.3}`),
        (c) => gsap.timeline().to(c, { scale: 0.25, duration: 0.14, ease: 'power3.in' }).to(c, { scale: 1, duration: 0.6, ease: 'back.out(3)' }, `+=${BEAT * 0.5}`),
        (c) => gsap.timeline().to(c, { x: () => rnd(-1, 1) * c.offsetWidth * 0.5, y: () => rnd(-1, 1) * c.offsetHeight * 0.2, rotation: rnd(-25, 25), duration: 0.1, ease: 'steps(2)' }).to(c, { x: 0, y: 0, rotation: 0, duration: 0.1, ease: 'steps(2)' }, `+=${BEAT * 0.5}`),
      ];
      off = onBeat((n) => {
        if (chaosOn) return;
        const k = L.length, a = (n * 5) % k, b = (n * 7 + 3) % k;
        ACTS[n % ACTS.length](L[a]);
        if (n % 2) ACTS[(n + 3) % ACTS.length](L[b === a ? (b + 1) % k : b]);
      });
    }
    stopMove = () => { off(); stopMove = () => {}; };
  }
  function toShape(w: World, i: number, svg: string) {
    const s = w.shapes[i], g = w.glyphs[i];
    s.innerHTML = svg;
    gsap.timeline({ defaults: { overwrite: 'auto' } })
      .to(g, { scale: 0, duration: 0.12, ease: 'power2.in' }, 0)
      .fromTo(s, { scale: 0, rotation: -120 }, { scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(2.6)' }, 0.06);
  }
  function toLetter(w: World, i: number) {
    const s = w.shapes[i], g = w.glyphs[i];
    gsap.timeline({ defaults: { overwrite: 'auto' } })
      .to(s, { scale: 0, rotation: 90, duration: 0.14, ease: 'power2.in' }, 0)
      .fromTo(g, { scale: 0 }, { scale: 1, duration: 0.45, ease: 'back.out(2.6)' }, 0.08);
  }

  // ---- arriving in a world: the word slams down from the lens
  function arrive(w: World) {
    if (calm) return;
    gsap.fromTo(w.hit, { scale: 2.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: 'power3.in', overwrite: true });
    gsap.timeline({ delay: 0.2 })
      .to(w.hit, { scaleY: 0.9, scaleX: 1.04, duration: 0.05 })
      .to(w.hit, { scaleY: 1, scaleX: 1, duration: 0.55, ease: 'elastic.out(1.2, 0.4)' });
    gsap.delayedCall(0.2, () => {
      shake(screen, 14, 0.32);
      gsap.fromTo(flash, { opacity: 0.6 }, { opacity: 0, duration: 0.16, ease: 'power2.out', overwrite: true });
      gsap.fromTo(burst, { k: 1 }, { k: 0, duration: 0.6, ease: 'power2.out', overwrite: true });
      w.word.classList.add('plates');
      gsap.fromTo(w.word, { '--mis': '14px' }, { '--mis': '0px', duration: 0.45, ease: 'power3.out', onComplete: () => w.word.classList.remove('plates') });
      pose('comedy_3');
      gsap.fromTo(boy, { dy: -H * 0.05, rot: -30 }, { dy: 0, rot: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)', overwrite: true, onUpdate: placeBoy });
    });
    if (w.small) gsap.fromTo(w.small, { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'back.out(2.4)', delay: 0.3, overwrite: true });
  }

  // ---- the scroll
  let cur = -1, target = 0, smooth = 0, last = -1, mode = '', chaosOn = false, chaosK = 0, crtLit = false;
  const burst = { k: 0 };
  function show(k: number) {
    if (k === cur) return;
    const prev = cur;
    cur = k;
    stopMove();
    worlds.forEach((w, i) => { w.el.classList.toggle('on', i === k); if (i !== k) rest(w); });
    mode = '';
    if (k < 0) return;
    bg.style.backgroundColor = worlds[k].bg;
    if (k > prev) arrive(worlds[k]);
    else gsap.set(worlds[k].hit, { scale: 1, opacity: 1 });
  }
  function render(p: number) {
    hero.zoom(Math.min(1, p / Z0));
    const inDive = p >= Z0;
    heroEl.style.visibility = inDive ? 'hidden' : '';
    root.classList.toggle('on', inDive);
    if (!inDive) { show(-1); darkHeader('dive', false); return; }
    const q = p - Z0, k = Math.min(3, Math.floor(q / SEG)), local = q - k * SEG, w = worlds[k];
    show(k);
    darkHeader('dive', (w.dark || local > HOLD + CHAOS) && local < HOLD + CHAOS + CRT * 0.98);
    let m = 'hold', v = 0;
    if (local > HOLD) {
      if (k < 3) { m = 'zoom'; v = Math.min(1, (local - HOLD) / ZOOM); }
      else if (local < HOLD + CHAOS) { m = 'chaos'; v = (local - HOLD) / CHAOS; }
      else { m = 'crt'; v = Math.min(1, (local - HOLD - CHAOS) / CRT); }
    }
    if (m !== mode) {
      mode = m;
      if (m === 'hold') { startMove(w); pose('fall_0'); } else { stopMove(); if (m === 'zoom') rest(w); }
      if (m === 'zoom') pose('fall_3');
      chaosOn = m === 'chaos' || m === 'crt';
      if (!chaosOn) { w.word.classList.remove('plates'); }
    }
    // the camera
    const zv = m === 'zoom' && !calm ? v : 0;
    w.cam.style.transform = zv > 0 ? flyInto(w.P.x, w.P.y, w.Z, zv, W, H) : '';
    fill.style.backgroundColor = worlds[Math.min(3, k + 1)].bg;
    fill.style.opacity = m === 'zoom' ? String(gsap.utils.clamp(0, 1, (v - 0.84) / 0.13)) : '0';
    // the end: it glitches harder and harder, then switches off like an old TV
    chaosK = m === 'chaos' ? v : m === 'crt' ? 1 : 0;
    if (chaosOn) { w.word.classList.add('plates'); gsap.set(w.word, { '--mis': `${chaosK * 16}px` }); }
    const c = m === 'crt' ? v : 0;
    const sy = c < 0.6 ? 1 - 0.994 * gsap.parseEase('power3.in')(c / 0.6) : 0.006;
    const sx = c < 0.6 ? 1 : 1 - gsap.parseEase('power3.in')((c - 0.6) / 0.4);
    screen.style.transform = c > 0 ? `scale(${Math.max(0.0001, sx)}, ${sy})` : '';
    if (c > 0 || crtLit) { flash.style.opacity = c > 0 ? String(Math.min(0.9, c * 2.2)) : '0'; crtLit = c > 0; }
    screen.style.visibility = c >= 1 ? 'hidden' : '';
  }

  // ---- every frame: smooth the scroll, draw the speed lines, keep him tumbling, shake the chaos
  let jitterF = -1;
  gsap.ticker.add((_t, dt) => {
    if (Math.abs(target - smooth) > 1e-4) smooth += (target - smooth) * (1 - Math.exp((-dt / 1000) * 16));
    else smooth = target;
    if (smooth !== last) { last = smooth; render(smooth); }
    if (cur < 0 || mode === 'crt') { if (cur < 0) lines.clear(); return; }
    const w = worlds[cur], t = performance.now() / 1000;
    const zoomV = mode === 'zoom' ? (last - Z0 - cur * SEG - HOLD) / ZOOM : 0;
    if (!calm) lines.draw(Math.max(burst.k, mode === 'zoom' ? 0.3 + 0.7 * zoomV : mode === 'chaos' ? 0.25 + chaosK * 0.5 : 0.2), W / 2, H / 2, w.fg);
    // he tumbles a little all the time (and dives head first while the camera does)
    if (!gsap.isTweening(boy)) {
      boy.rot = mode === 'zoom' ? Math.sin(t * 2.2) * 8 : Math.sin(t * 1.7) * 14;
      boy.dx = Math.sin(t * 0.9) * W * 0.012; boy.dy = Math.sin(t * 1.3) * H * 0.012;
      placeBoy();
    }
    const flail = Math.floor(t / (BEAT * 2)) % 2 === 1;
    if (mode === 'hold' && !calm && !gsap.isTweening(boy)) pose(flail ? 'comedy_3' : 'fall_0');
    // misbehaving harder: every letter jitters in steps, and the picture tears now and then
    if (chaosOn && !calm) {
      const f = Math.floor(t * 12);
      if (f !== jitterF) {
        jitterF = f;
        const a = chaosK;
        w.cells.forEach((c) => gsap.set(c, { x: rnd(-1, 1) * a * c.offsetWidth * 0.35, y: rnd(-1, 1) * a * c.offsetHeight * 0.12, rotation: rnd(-1, 1) * a * 28, scaleX: 1 + rnd(-0.3, 0.6) * a }));
        if (a > 0.35 && f % 6 === 0) glitchFlash(0.18);
      }
    }
  });

  const st = ScrollTrigger.create({
    trigger: opening, start: 'top top', end: () => `+=${innerHeight * LEN}`, pin: true, anticipatePin: 1,
    onUpdate: (s) => { target = s.progress * LEN; },
  });
  return {
    fit,
    /** where page two starts (the first word), in page px */
    startY: () => st.start + innerHeight * (Z0 + 0.02),
  };
}
