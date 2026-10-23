import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './styles.css';
import { artUrl, image, pose } from './art';
import { bandText, bandsIn, rollWord, scramble } from './slices';
gsap.registerPlugin(ScrollTrigger);

/*
 * STYLES — the seven styles he draws in (the reference's brands grid, docs/HOME.md §4).
 * Tiles arrive staggered, each one tumbling up out of its own cell. Hover (fine pointer)
 * or tap a tile: its ground wipes up into that style's world, the portrait squashes
 * away, and the boy pops in doing a move drawn in that style (~10 fps) while the tile
 * wobbles and the label rolls to the move's name. On touch, when nobody has tapped yet,
 * one tile at a time plays by itself so the grid is never just pictures.
 */
type Style = { key: string; name: string; move: string; frames: string[]; fps: number; ground: string; light?: boolean; bob?: boolean };
const seq = (k: string, ids: number[]) => ids.map((i) => `${k}_${i}`);
const STYLES: Style[] = [
  { key: 'ink', name: 'Ink', move: 'runs!', frames: seq('run8', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 12, ground: '#e4dccb' },
  { key: 'pixel', name: 'Pixel', move: 'sprints!', frames: seq('pixel-run8', [0, 1, 2, 3, 4, 5, 6, 7]), fps: 10, ground: '#dfe3e6' },
  { key: 'water', name: 'Watercolour', move: 'surfs!', frames: seq('water-surf', [0, 1, 2, 1]), fps: 5, ground: '#e3ecef', bob: true },
  { key: 'clay', name: 'Clay', move: 'points!', frames: seq('clay-ride', [0, 1, 2, 3]), fps: 4, ground: '#efe2d2' },
  { key: 'chalk', name: 'Chalk', move: 'glides!', frames: ['chalk-surf_2'], fps: 1, ground: '#2b2f2c', light: true, bob: true },
  { key: 'comic', name: 'Comic', move: 'draws!', frames: seq('comic-saber', [1, 2, 3, 4, 5]), fps: 7, ground: '#f1e7c9' },
  { key: 'hose', name: 'Rubber hose', move: 'flies!', frames: seq('hose-broom', [0, 1, 2, 3, 5]), fps: 9, ground: '#ece6da', bob: true },
];

export function initStyles() {
  const root = document.querySelector<HTMLElement>('#styles');
  if (!root) return;
  root.innerHTML = `<header class="st-head">
    <p class="st-eyebrow"><span class="st-dot"></span><span class="st-eb">${matchMedia('(hover: hover) and (pointer: fine)').matches ? 'Hover a tile' : 'Tap a tile'}</span></p>
    <h2 class="st-title"><span class="st-l">STYLES</span> <span class="st-l">I DRAW IN</span></h2>
  </header>
  <ul class="st-grid">${STYLES.map((s, i) => `<li class="st-cell"><button class="st-tile" type="button" data-i="${i}" aria-label="${s.name}: play his move" aria-pressed="false">
      <span class="st-ground" style="background:${s.ground}"></span>
      <span class="st-num">0${i + 1}</span>
      <span class="st-facebox"><img class="st-face" src="${artUrl(`style_${s.key}`)}" alt="" loading="lazy" decoding="async"></span>
      <canvas class="st-cv"></canvas>
      <span class="st-label${s.light ? ' light' : ''}"><span class="st-name">${s.name}</span></span>
    </button></li>`).join('')}</ul>`;

  const titleLetters = [...root.querySelectorAll<HTMLElement>('.st-l')].flatMap((l) => bandText(l));
  const eb = root.querySelector<HTMLElement>('.st-eb')!;
  const dot = root.querySelector<HTMLElement>('.st-dot')!;
  const tiles = [...root.querySelectorAll<HTMLButtonElement>('.st-tile')];
  gsap.set(titleLetters.flat(), { yPercent: 115 });
  gsap.set(dot, { scale: 0 });
  eb.style.visibility = 'hidden';
  // every tile starts below its cell, small and turned; the cell clips nothing so the tumble shows
  gsap.set(tiles, { yPercent: 70, scale: 0.55, rotate: () => gsap.utils.random(-14, 14), opacity: 0 });

  ScrollTrigger.create({ trigger: root, start: 'top 78%', once: true, onEnter: () => {
    bandsIn(titleLetters, { stagger: 0.035, jitter: 0.25 });
    scramble(eb, 0.45).delay(0.25);
    gsap.to(dot, { scale: 1, duration: 0.5, ease: 'back.out(3)', delay: 0.3 });
  } });
  // tiles arrive in a staggered wave as the grid comes into view (rows read left → right)
  ScrollTrigger.create({ trigger: root.querySelector('.st-grid'), start: 'top 86%', once: true, onEnter: () => {
    gsap.to(tiles, { yPercent: 0, scale: 1, rotate: 0, opacity: 1, duration: 0.85, ease: 'power4.out', stagger: { each: 0.075, from: 'start' }, clearProps: 'opacity' });
    // each portrait lands with a little squash after its tile
    tiles.forEach((t, i) => gsap.fromTo(t.querySelector('.st-face'), { scaleX: 1.12, scaleY: 0.86 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1.1, 0.45)', delay: 0.32 + i * 0.075 }));
  } });

  // per tile: a canvas the move is drawn on, frames cycled on the gsap ticker while playing
  const state = tiles.map((t, i) => ({ t, s: STYLES[i], cv: t.querySelector('canvas')!, face: t.querySelector<HTMLElement>('.st-face')!, ground: t.querySelector<HTMLElement>('.st-ground')!, name: t.querySelector<HTMLElement>('.st-name')!, on: false, frame: 0, acc: 0, tl: null as gsap.core.Timeline | null, wob: null as gsap.core.Tween | null, timer: null as gsap.core.Tween | null }));
  const dpr = () => Math.min(devicePixelRatio || 1, 2);
  function size() {
    state.forEach((st) => {
      st.cv.width = Math.round(st.t.offsetWidth * dpr()); st.cv.height = Math.round(st.t.offsetHeight * dpr());
    });
  }
  function draw(st: (typeof state)[number]) {
    const ctx = st.cv.getContext('2d')!;
    const w = st.cv.width, h = st.cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    const cw = w / dpr(), ch = h / dpr();
    const bob = st.s.bob ? Math.sin(performance.now() / 230) * ch * 0.025 : 0;
    // a soft ground shadow so he stands in the tile, then the frame
    ctx.fillStyle = st.s.light ? 'rgba(255,255,255,.08)' : 'rgba(27,23,20,.1)';
    ctx.beginPath(); ctx.ellipse(cw / 2, ch * 0.8, cw * 0.24, ch * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    pose(ctx, st.s.frames[st.frame % st.s.frames.length], cw / 2, ch * 0.8 + bob, ch * 0.6);
  }
  gsap.ticker.add((_t, dt) => {
    state.forEach((st) => {
      if (!st.on) return;
      st.acc += dt / 1000;
      if (st.acc > 1 / st.s.fps) { st.acc = 0; st.frame++; }
      draw(st);
    });
  });

  function play(i: number, on: boolean) {
    const st = state[i];
    if (st.on === on) return;
    st.on = on;
    st.t.setAttribute('aria-pressed', String(on));
    st.t.classList.toggle('on', on);
    st.tl?.kill(); st.wob?.kill();
    const tl = gsap.timeline();
    st.tl = tl;
    if (on) {
      st.s.frames.forEach((f) => image(f));
      st.frame = 0; st.acc = 0;
      draw(st);
      // the style's world wipes up from the bottom, the portrait squashes down and away
      tl.fromTo(st.ground, { clipPath: 'inset(100% 0 0 0 round 0)' }, { clipPath: 'inset(0% 0 0 0 round 0)', duration: 0.42, ease: 'power4.inOut' }, 0)
        .to(st.face, { scaleX: 1.25, scaleY: 0, duration: 0.22, ease: 'power4.in', transformOrigin: '50% 100%' }, 0)
        .fromTo(st.cv, { scaleX: 1.4, scaleY: 0, opacity: 1 }, { scaleX: 0.85, scaleY: 1.18, duration: 0.18, ease: 'power4.out' }, 0.2)
        .to(st.cv, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.4)' });
      rollWord(st.name, st.s.move, 0.42);
      // the tile wobbles while he plays: a damped rock, like jelly set down
      st.wob = gsap.fromTo(st.t, { rotate: 0 }, { keyframes: { rotate: [-5, 4, -2.5, 1.5, -0.6, 0] }, duration: 0.9, ease: 'none' });
      gsap.fromTo(st.t, { scale: 0.94 }, { scale: 1.04, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' });
    } else {
      tl.to(st.cv, { scaleX: 1.3, scaleY: 0, duration: 0.2, ease: 'power4.in' }, 0)
        .to(st.ground, { clipPath: 'inset(0 0 100% 0 round 0)', duration: 0.38, ease: 'power4.inOut' }, 0.05)
        .fromTo(st.face, { scaleX: 1.3, scaleY: 0 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1.1, 0.45)', transformOrigin: '50% 100%' }, 0.18);
      rollWord(st.name, st.s.name, 0.38);
      gsap.to(st.t, { scale: 1, rotate: 0, duration: 0.4, ease: 'power4.out' });
    }
  }

  // fine pointer: hover plays; touch: a tap plays for a while (tap again to stop); press squash everywhere
  let touched = false;
  tiles.forEach((t, i) => {
    t.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { touched = true; play(i, true); } });
    t.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') play(i, false); });
    t.addEventListener('pointerdown', () => { gsap.to(t, { scale: 0.95, duration: 0.08, ease: 'power4.out' }); });
    t.addEventListener('click', (e) => {
      touched = true;
      const mouse = (e as PointerEvent).pointerType === 'mouse';
      if (mouse) { gsap.to(t, { scale: 1.04, duration: 0.3, ease: 'power4.out' }); play(i, true); return; }
      const st = state[i];
      st.timer?.kill();
      if (st.on) { play(i, false); return; }
      state.forEach((o, k) => { if (k !== i && o.on) play(k, false); });
      play(i, true);
      st.timer = gsap.delayedCall(3.2, () => { if (st.on) play(i, false); });
    });
  });

  // attract: on touch screens, while nobody has tapped and the grid is in view, one tile plays at a time
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let seen = false, next = 0;
  const attract = gsap.delayedCall(2.4, function tick() {
    if (!touched && seen && !fine) {
      const i = next++ % tiles.length;
      play(i, true);
      gsap.delayedCall(1.7, () => { if (!state[i].timer?.isActive()) play(i, false); });
    }
    attract.restart(true);
  });
  ScrollTrigger.create({ trigger: root.querySelector('.st-grid'), start: 'top 70%', end: 'bottom 20%', onToggle: (self) => { seen = self.isActive; } });

  ScrollTrigger.addEventListener('refreshInit', size);
  size();
}
