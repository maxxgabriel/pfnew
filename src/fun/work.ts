import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { url } from './art';
import { Boy } from './boy';
import { calm, fine, glitchFlash, onBeat, popOnScroll, shake, whileVisible, zoomPunch } from './kit';
import { popIn, sticker, stickerUrl } from './stickers';
import './work.css';
gsap.registerPlugin(ScrollTrigger);

/*
 * THE WORK — six little loops, each a craft at full strength, each with its own trick on a tap:
 * SQUISH (a ball bouncing along a word that squashes under it), GLITCH (colour-split slices, VHS),
 * INK (a brush paints a word in, an ink splat blooms), POW! (pop art: halftone, a burst, offset
 * print, speed lines on the beat), ON TWOS (his run cycle stepping on twos, onion skins; tap for ones,
 * twos, fours), WHOOSH (a ball zips by, smeared, the letters smear after it). Loops run only on screen.
 * The cards are dealt in as they arrive and lean to the pointer with a glare.
 */
type Loop = { start: () => void; stop: () => void; tap: () => void; fit?: () => void };
const el = (tag: string, cls: string, html = '') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; return e; };
const img = (src: string, cls: string) => { const i = document.createElement('img'); i.src = src; i.alt = ''; i.className = cls; i.draggable = false; return i; };
const letters = (host: HTMLElement, word: string, cls: string) => [...word].map((c) => { const s = el('span', cls, c === ' ' ? '&nbsp;' : c); host.append(s); return s; });

// ---------- SQUISH ----------
function squish(stage: HTMLElement): Loop {
  const word = el('div', 'sq-word'), probe = el('i', 'sq-probe'), ball = img(stickerUrl('spark'), 'sq-ball');
  const ls = letters(word, 'SQUISH', 'sq');
  word.append(probe, ball); stage.append(word);
  let tl: gsap.core.Timeline | null = null, fs = 100;
  function fit() {
    tl?.kill(); gsap.set([...ls, ball], { clearProps: 'transform' });
    word.style.fontSize = '100px';
    const w = ls[ls.length - 1].getBoundingClientRect().right - ls[0].getBoundingClientRect().left;
    fs = (100 * stage.clientWidth * 0.74) / w; word.style.fontSize = `${fs}px`;
    const g = document.createElement('canvas').getContext('2d')!, cs = getComputedStyle(ls[0]);
    g.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    const top = probe.offsetTop - g.measureText('H').actualBoundingBoxAscent, wr = word.getBoundingClientRect(), R = ball.offsetWidth / 2;
    const pos = ls.map((l) => { const r = l.getBoundingClientRect(); return { x: r.left - wr.left + r.width / 2 - R, y: top - R * 2 }; });
    tl = gsap.timeline({ repeat: -1, repeatDelay: 0.4, paused: true });
    let prev = { x: pos[0].x - stage.clientWidth * 0.55, y: pos[0].y - fs * 0.6 };
    tl.set(ball, { x: prev.x, y: prev.y });
    const hop = (to: { x: number; y: number }, h: number, t: number, land?: () => void) => {
      tl!.to(ball, { x: to.x, duration: t, ease: 'none' }).to(ball, { y: Math.min(prev.y, to.y) - h, duration: t / 2, ease: 'power2.out' }, '<').to(ball, { y: to.y, duration: t / 2, ease: 'power2.in' }, '>');
      if (land) tl!.call(land);
      prev = to;
    };
    ls.forEach((l, i) => hop(pos[i], fs * (i ? 0.38 : 0.7), i ? 0.3 : 0.45, () => {
      gsap.timeline().to(l, { scaleY: 0.5, scaleX: 1.22, '--ds': 0.45, duration: 0.08, ease: 'power2.out' }).to(l, { scaleY: 1, scaleX: 1, '--ds': 0, duration: 0.9, ease: 'elastic.out(1.15, 0.3)' });
      gsap.fromTo(ball, { scaleY: 0.6, scaleX: 1.35 }, { scaleY: 1, scaleX: 1, duration: 0.45, ease: 'elastic.out(1.2, 0.35)' });
    }));
    hop({ x: pos[pos.length - 1].x + stage.clientWidth * 0.55, y: pos[0].y + fs * 0.4 }, fs * 0.5, 0.5);
  }
  return { fit, start: () => tl?.play(), stop: () => tl?.pause(), tap: () => { gsap.timeline().to(ls, { yPercent: -30, duration: 0.18, stagger: 0.04, ease: 'power2.out' }).to(ls, { yPercent: 0, duration: 0.5, stagger: 0.04, ease: 'bounce.out' }); } };
}

// ---------- GLITCH ----------
function glitch(stage: HTMLElement): Loop {
  const box = el('div', 'gl-box', '<span class="gl-w" data-text="GLITCH">GLITCH</span><i class="gl-bar"></i>');
  stage.append(box);
  if (stickerUrl('vhs')) stage.append(img(stickerUrl('vhs'), 'gl-vhs'));
  const w = box.querySelector<HTMLElement>('.gl-w')!;
  const burst = (strong = false) => {
    box.classList.remove('burst'); void box.offsetWidth; box.classList.add('burst');
    gsap.fromTo(w, { x: strong ? -18 : -8, skewX: strong ? 30 : 12 }, { x: 0, skewX: 0, duration: strong ? 0.5 : 0.32, ease: 'steps(5)' });
    if (strong) { glitchFlash(); shake(stage, 10, 0.3); }
  };
  let tl: gsap.core.Timeline | null = null;
  return {
    start: () => { tl = gsap.timeline({ repeat: -1, repeatDelay: 1.1 }).call(() => burst()).call(() => burst(), [], 0.45); },
    stop: () => tl?.kill(), tap: () => burst(true),
  };
}

// ---------- INK ----------
function ink(stage: HTMLElement): Loop {
  const box = el('div', 'ink-box');
  const splat = stickerUrl('splat') ? img(stickerUrl('splat'), 'ink-splat') : el('i', 'ink-splat ink-splat-css');
  const word = el('span', 'ink-w', 'INK');
  const brush = img(stickerUrl('brush'), 'ink-brush');
  box.append(splat, word, brush); stage.append(box);
  const tl = gsap.timeline({ repeat: -1, paused: true, repeatDelay: 0.3 });
  tl.set(word, { clipPath: 'inset(0 100% 0 0)' }).set(splat, { scale: 0, rotation: -20 }).set(brush, { xPercent: -160, yPercent: 10, rotation: -18 })
    .to(brush, { xPercent: 150, yPercent: -6, rotation: 10, duration: 0.9, ease: 'power2.inOut' })
    .to(word, { clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: 'power2.inOut' }, '<0.08')
    .to(splat, { scale: 1, rotation: 0, duration: 0.7, ease: 'elastic.out(1.1, 0.45)' }, '-=0.15')
    .to(word, { scale: 1.08, duration: 0.12, yoyo: true, repeat: 1 }, '<')
    .to({}, { duration: 1.1 })
    .to([word, splat], { clipPath: 'inset(0 0 0 100%)', duration: 0.5, ease: 'power3.in' })
    .set(splat, { clipPath: 'none' });
  return { start: () => tl.play(), stop: () => tl.pause(), tap: () => gsap.fromTo(splat, { scale: 1.35 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1.2, 0.3)' }) };
}

// ---------- POW! ----------
function pow(stage: HTMLElement): Loop {
  const box = el('div', 'pow-box');
  const lines = el('i', 'pow-lines');
  const burst = stickerUrl('shout') ? img(stickerUrl('shout'), 'pow-burst') : el('i', 'pow-burst pow-burst-css');
  const word = el('span', 'pow-w', 'POW!');
  box.append(lines, burst, word); stage.append(box);
  const hit = (big = false) => {
    gsap.fromTo(burst, { scale: big ? 0.4 : 0.75, rotation: gsap.utils.random(-14, 14) }, { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(3)', overwrite: true });
    gsap.fromTo(word, { scale: big ? 1.8 : 1.35, rotation: -8 }, { scale: 1, rotation: -4, duration: 0.5, ease: 'back.out(3.2)', overwrite: true });
    gsap.fromTo(lines, { opacity: 1, scale: 1.1 }, { opacity: 0.55, scale: 1, duration: 0.5, ease: 'power2.out', overwrite: true });
    if (big) shake(stage, 12, 0.35);
  };
  let stop = () => {};
  return { start: () => { stop = onBeat((n) => { if (n % 2 === 0) hit(); }); }, stop: () => stop(), tap: () => hit(true) };
}

// ---------- ON TWOS ----------
function twos(stage: HTMLElement): Loop {
  const box = el('div', 'tw-box');
  const g2 = img(url('run8_0'), 'tw-ghost tw-g2'), g1 = img(url('run8_0'), 'tw-ghost tw-g1'), boy = img(url('run8_0'), 'tw-boy');
  const hud = el('p', 'tw-hud', '<b>ON TWOS</b><span>FRAME 01</span>');
  box.append(el('i', 'tw-ground'), g2, g1, boy, hud); stage.append(box);
  if (stickerUrl('flipbook')) stage.append(img(stickerUrl('flipbook'), 'tw-flip'));
  const modes = [['ON ONES', 1], ['ON TWOS', 2], ['ON FOURS', 4]] as const;
  let mode = 1, tick = 0, frame = 0, timer = 0;
  const label = hud.querySelector('b')!, count = hud.querySelector('span')!;
  const step = () => {
    tick++;
    if (tick % modes[mode][1]) return;
    frame++;
    const f = (k: number) => url(`run8_${(((frame - k) % 8) + 8) % 8}`);
    boy.src = f(0); g1.src = f(1); g2.src = f(2);
    const x = ((frame * 2.6) % 130) - 15;
    boy.style.left = `${x}%`; g1.style.left = `${x - 2.6}%`; g2.style.left = `${x - 5.2}%`;
    count.textContent = `FRAME ${String((frame % 24) + 1).padStart(2, '0')}`;
  };
  return {
    start: () => { clearInterval(timer); timer = window.setInterval(step, 1000 / 24); },
    stop: () => clearInterval(timer),
    tap: () => { mode = (mode + 1) % modes.length; label.textContent = modes[mode][0]; zoomPunch(label, 1.4); },
  };
}

// ---------- WHOOSH ----------
function whoosh(stage: HTMLElement): Loop {
  const box = el('div', 'wh-box');
  const lines = el('i', 'wh-lines');
  const word = el('div', 'wh-w');
  const ls = letters(word, 'WHOOSH', 'whl');
  const smear = el('i', 'wh-smear'), ball = img(stickerUrl('spark'), 'wh-ball');
  box.append(lines, word, smear, ball); stage.append(box);
  let dir = 1;
  const zip = (fast = 1) => {
    const W = stage.clientWidth, d = dir; dir = -dir;
    const from = d > 0 ? -0.25 * W : 1.25 * W, to = d > 0 ? 1.25 * W : -0.25 * W, t = 0.42 / fast;
    gsap.set(ball, { x: from, scaleX: d });
    gsap.timeline()
      .to(ball, { x: to, duration: t, ease: 'power2.inOut' })
      .fromTo(smear, { x: from, scaleX: 0, opacity: 1, transformOrigin: d > 0 ? '100% 50%' : '0% 50%' }, { x: to, scaleX: 5, duration: t, ease: 'power2.inOut' }, 0)
      .to(smear, { opacity: 0, scaleX: 0, duration: 0.2 }, t)
      .fromTo(lines, { opacity: 0.9, xPercent: d > 0 ? -20 : 20 }, { opacity: 0, xPercent: 0, duration: t + 0.3, ease: 'power2.out' }, 0)
      .to(ls, { skewX: -30 * d, x: 26 * d, scaleX: 1.3, filter: 'blur(2px)', duration: 0.1, stagger: { each: 0.035, from: d > 0 ? 'start' : 'end' }, ease: 'power2.out' }, t * 0.35)
      .to(ls, { skewX: 0, x: 0, scaleX: 1, filter: 'blur(0px)', duration: 0.7, stagger: { each: 0.035, from: d > 0 ? 'start' : 'end' }, ease: 'elastic.out(1.2, 0.35)' }, t * 0.35 + 0.12);
  };
  let tl: gsap.core.Timeline | null = null;
  return { start: () => { tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 }).call(() => zip()); }, stop: () => tl?.kill(), tap: () => zip(1.8) };
}

const LOOPS: Record<string, (stage: HTMLElement) => Loop> = { squish, glitch, ink, pow, twos, whoosh };

export function initWork(root: HTMLElement) {
  popOnScroll(root.querySelector<HTMLElement>('.sec-title')!);
  const cards = [...root.querySelectorAll<HTMLElement>('.card')];
  const loops = cards.map((card) => {
    const loop = LOOPS[card.dataset.loop ?? '']?.(card.querySelector<HTMLElement>('.stage')!);
    if (!loop) return null;
    if (!calm) whileVisible(card, loop.start, loop.stop);
    card.addEventListener('pointerdown', () => { loop.tap(); gsap.fromTo(card, { scale: 0.97 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)' }); });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loop.tap(); } });
    return loop;
  });
  // a sticker or two stuck on, and the stopwatch ticking by the title
  const stuck = [sticker(cards[0], 'badge', 'on-card'), sticker(root.querySelector<HTMLElement>('.sec-head')!, 'stopwatch', 'on-title')];
  ScrollTrigger.create({ trigger: root.querySelector('.deck'), start: 'top 80%', once: true, onEnter: () => popIn(stuck, 0.5) });

  // dealt in as they arrive, each with its own tilt
  cards.forEach((c, i) => gsap.set(c, { rotation: [-2.2, 1.6, -1.2, 2, -1.6, 1.2][i % 6] }));
  ScrollTrigger.batch(cards, {
    start: 'top 92%', once: true,
    onEnter: (batch) => gsap.from(batch, { y: 120, x: (i) => (i % 2 ? 60 : -60), rotation: (i) => (i % 2 ? 14 : -14), opacity: 0, duration: 0.9, ease: 'back.out(1.4)', stagger: 0.12 }),
  });

  // lean to the pointer, with a glare
  if (fine) for (const card of cards) {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' }), ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    gsap.set(card, { transformPerspective: 900 });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      ry(nx * 14); rx(-ny * 10);
      card.style.setProperty('--gx', `${(nx + 0.5) * 100}%`); card.style.setProperty('--gy', `${(ny + 0.5) * 100}%`);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  // he peeks over the first card from behind it
  const peekImg = img('', 'peek'); root.querySelector('.deck')!.prepend(peekImg);
  const peek = new Boy(peekImg), p = { rise: 0 }, spots = [0.8, 0.22];
  let spot = 0;
  const place = () => {
    const c = cards[0], W = c.offsetWidth;
    peek.face = Math.max(28, W * 0.08); peek.flip = spot % 2 === 1;
    peek.x = c.offsetLeft + W * spots[spot % 2]; peek.y = c.offsetTop + peek.height * (1.05 - 0.62 * p.rise);
    peek.apply();
  };
  peek.pose('curious'); peekImg.style.opacity = '1';
  gsap.timeline({ repeat: -1, delay: 2 })
    .to(p, { rise: 1, duration: 0.45, ease: 'back.out(2.4)', onUpdate: place })
    .call(() => { peek.pose('extra_1'); place(); }, [], '+=1.6')
    .call(() => { peek.pose('curious'); place(); }, [], '+=0.7')
    .to(p, { rise: 0, duration: 0.3, ease: 'power2.in', onUpdate: place }, '+=0.9')
    .call(() => { spot++; place(); }, [], '+=0.8');
  return { fit: () => { loops.forEach((l) => l?.fit?.()); place(); } };
}
