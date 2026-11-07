import gsap from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { CustomEase } from 'gsap/CustomEase';
import { CustomWiggle } from 'gsap/CustomWiggle';
import { Boy } from './boy';
import { Jelly, type Letter } from './jelly';
import { calm, onBeat } from './kit';
import { Speed } from './lines';
import { retypeset } from './kinetic';
import { PANELS_END, panelsIn } from './panels';
import { popIn, sticker, trackSticker } from './stickers';
import { makeStunts } from './stunts';
import { nextUniverse, onUniverse, setUniverse } from './universe';
gsap.registerPlugin(ScrambleTextPlugin, CustomEase, CustomWiggle);

/*
 * HERO — the name is a playground, and the whole first screen is rubber (jelly.ts). The way in is
 * comic panels (panels.ts) slamming onto the paper, the last one a window onto this page; then the
 * red ball bounces along GABRIEL into the dot after MAX and he drops onto the X; any touch skips it.
 * Then it is yours. Tap the paper: a ring runs through
 * everything. Grab a letter: it stretches toward your finger, pulling its neighbours like a chain,
 * and twangs back when you let go. Fling it: it bounces off the edges and throws him. The big stunts
 * (stunts.ts) fire only when you poke: tap the ball, double-tap a letter. Tap him and he snaps his
 * fingers: the universe changes, and the letters tumble and land again in the new face.
 */
export const HERO_POSES = ['fall_0', 'fall_1', 'fall_2', 'hero_0', 'hero_3', 'still_0', 'leap_0', 'leap_2', 'comedy_0', 'comedy_3', 'extra_1', 'snap_0', 'snap_1', 'powerup_0', 'powerup_2'];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** what the stunts get to play with */
export type Rig = {
  root: HTMLElement; act: HTMLElement; name: HTMLElement; lines: HTMLElement[]; letters: HTMLElement[];
  dot: HTMLImageElement; boy: Boy; speed: Speed;
  fs: () => number; on: () => number;
  top: (i: number) => { x: number; y: number };
  squash: (el: HTMLElement, k?: number) => gsap.core.Timeline;
  air: (dur: number) => void;
};

export function initHero(root: HTMLElement) {
  const act = root.querySelector<HTMLElement>('.hero-act')!;
  const name = act.querySelector<HTMLElement>('.name')!;
  const lines = [...name.querySelectorAll<HTMLElement>('.line')];
  const letters: HTMLElement[] = [], wraps: HTMLElement[] = [];
  for (const ln of lines) {
    for (const ch of ln.dataset.word!) {
      const w = document.createElement('span'), s = document.createElement('span');
      w.className = 'chw'; s.className = 'ch'; s.textContent = ch; s.setAttribute('aria-hidden', 'true');
      w.append(s); ln.append(w); letters.push(s); wraps.push(w);
    }
  }
  const dot = document.createElement('img');
  dot.className = 'dot'; trackSticker(dot, 'spark'); dot.alt = ''; dot.draggable = false;
  lines[0].append(dot);
  const boy = new Boy(act.querySelector<HTMLImageElement>('.boy')!);
  // the hand-drawn cast round the name, and the glove in the scroll ring
  const layer = act.querySelector<HTMLElement>('.stickers')!;
  const cast = ['sun', 'sparkle', 'inkpot', 'boombox', 'bolt'].map((n) => sticker(layer, n));
  const glove = sticker(root.querySelector<HTMLElement>('.badge')!, 'glove', '', false);
  const speed = new Speed(root, 'hero-lines');
  const rings = [0, 1, 2].map(() => { const r = document.createElement('i'); r.className = 'ripple'; act.prepend(r); return r; });
  let ringN = 0;
  const wiggle = CustomWiggle.create('letterWiggle', { wiggles: 6, type: 'easeOut' });
  gsap.set(letters, { opacity: 0 });
  gsap.set(dot, { scale: 0 });

  // the rubber
  const jelly = new Jelly(act);
  const nodes = wraps.map((w) => jelly.addLetter(w));
  cast.forEach((c) => jelly.addFree(c.host));

  // both lines share one size, set by GABRIEL filling the width without running out of height
  let fs = 100, W = 1, H = 1;
  const capK = letters.map(() => 0.1);
  const span = (from: number, to: number) => letters[to].getBoundingClientRect().right - letters[from].getBoundingClientRect().left;
  function fit() {
    jelly.settle();
    name.style.fontSize = '100px';
    W = root.clientWidth; H = root.clientHeight;
    const phone = W < 760;
    // headroom: the letters stretch as they play, so the resting name stays inside the edges
    fs = Math.min((100 * W * (phone ? 0.86 : 0.76)) / span(3, letters.length - 1), (H * (phone ? 0.6 : 0.5)) / 1.6);
    name.style.fontSize = `${fs}px`;
    boy.face = fs * (phone ? 0.34 : 0.31);
    // where the cap line sits inside each letter's box: the dot sits on the baseline, the cap height comes from the font
    const g = document.createElement('canvas').getContext('2d')!, cs = getComputedStyle(letters[0]);
    g.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    const cap = g.measureText('H').actualBoundingBoxAscent;
    const base0 = dot.offsetTop + dot.offsetHeight;
    letters.forEach((el, i) => {
      const line = el.parentElement!.parentElement!, base = base0 + line.offsetTop - lines[0].offsetTop;
      capK[i] = (base - cap - el.offsetTop) / el.offsetHeight;
    });
    speed.size(W, H);
    jelly.pull = fs * 2.2;
    jelly.measure(W, H);
  }

  // act px from the screen (the act may be punched in by a stunt)
  const scaleOf = () => { const b = act.getBoundingClientRect(); return { b, kx: b.width / (act.offsetWidth || 1) || 1, ky: b.height / (act.offsetHeight || 1) || 1 }; };
  // where a letter's top is, in act px (follows squashes, tricks and the rubber)
  const top = (i: number) => {
    const r = letters[i].getBoundingClientRect(), { b, kx, ky } = scaleOf();
    return { x: (r.left - b.left + r.width / 2) / kx, y: (r.top - b.top + r.height * capK[i]) / ky };
  };
  const toAct = (e: PointerEvent) => { const { b, kx, ky } = scaleOf(); return { x: (e.clientX - b.left) / kx, y: (e.clientY - b.top) / ky }; };
  const squash = (el: HTMLElement, k = 0.72) => gsap.timeline()
    .to(el, { scaleY: k, scaleX: 2 - k, duration: 0.07, ease: 'power1.out' })
    .to(el, { scaleY: 1, scaleX: 1, duration: 0.85, ease: 'elastic.out(1.1, 0.3)' });

  // he stands on letter `on` and rides whatever it does
  let on = 2, standing = false, busy = false;
  gsap.ticker.add(() => {
    if (!standing) return;
    const p = top(on);
    boy.x = p.x; boy.y = p.y; boy.apply();
  });
  function hopTo(j: number) {
    if (busy || !standing || j === on) return;
    busy = true; standing = false;
    const from = on, p = { u: 0 };
    const a0 = top(from), z0 = top(j), h = Math.abs(z0.y - a0.y) + fs * 0.45;
    boy.flip = z0.x < a0.x;
    gsap.timeline({ onComplete: () => { busy = false; } })
      .call(() => { boy.pose('leap_0'); boy.sy = 0.9; boy.apply(); })
      .to(p, { u: 1, duration: 0.6, ease: 'none', delay: 0.14, onUpdate: () => {
        const a = top(from), z = top(j), u = p.u;
        boy.x = lerp(a.x, z.x, u); boy.y = lerp(a.y, z.y, u) - Math.sin(u * Math.PI) * h;
        boy.sy = 1; boy.pose(u < 0.5 ? 'leap_2' : 'fall_0').apply();
      } })
      .call(() => { on = j; standing = true; boy.pose('hero_0'); boy.sy = 0.88; squash(letters[j], 0.68); })
      .to(boy, { sy: 1, duration: 0.3, ease: 'back.out(3)' })
      .call(() => { boy.pose(Math.random() < 0.3 ? 'extra_1' : 'hero_3'); });
  }
  /** he jumps clear while his letter does something wild, hangs there flailing, and lands back on it */
  function air(dur: number) {
    if (!standing || busy) return;
    busy = true; standing = false;
    const a0 = top(on), lift = fs * 0.62, p = { u: 0 };
    gsap.timeline({ onComplete: () => { busy = false; } })
      .call(() => { boy.pose('leap_0'); boy.sy = 0.86; boy.apply(); })
      .to(p, { u: 1, duration: dur, ease: 'none', delay: 0.07, onUpdate: () => {
        const u = p.u;
        const h = u < 0.16 ? Math.sin(((u / 0.16) * Math.PI) / 2) : u > 0.84 ? Math.cos((((u - 0.84) / 0.16) * Math.PI) / 2) : 1 + Math.sin(((u - 0.16) / 0.68) * Math.PI * 4) * 0.05;
        const k = u > 0.84 ? (u - 0.84) / 0.16 : 0, b = k ? top(on) : a0;
        boy.x = lerp(a0.x, b.x, k); boy.y = lerp(a0.y, b.y, k) - h * lift; boy.sy = 1;
        boy.pose(u < 0.16 ? 'leap_2' : u > 0.84 ? 'fall_0' : 'comedy_3').apply();
      } })
      .call(() => { standing = true; boy.pose('hero_0'); boy.sy = 0.86; squash(letters[on], 0.72); })
      .to(boy, { sy: 1, duration: 0.3, ease: 'back.out(3)' })
      .call(() => { boy.pose('hero_3'); });
  }
  /** thrown: he flies, tumbles, picks a letter on the way down and lands on it */
  function launch(vx: number, vy: number) {
    if (!standing || busy) return;
    busy = true; standing = false;
    let x = boy.x, y = boy.y, ux = gsap.utils.clamp(-fs * 3, fs * 3, vx * 0.6), uy = gsap.utils.clamp(-fs * 4.5, -fs * 2.6, vy * 0.7), aim = -1;
    const g = fs * 9, t0 = performance.now();
    const land = (j: number) => {
      gsap.ticker.remove(tk);
      on = j; standing = true; boy.rot = 0; boy.flip = false; boy.pose('hero_0'); boy.sy = 0.8;
      const t = top(j);
      squash(letters[j], 0.62);
      jelly.ripple(t.x, t.y, 0.45);
      gsap.timeline({ onComplete: () => { busy = false; } }).to(boy, { sy: 1, duration: 0.35, ease: 'back.out(3)' }).call(() => boy.pose('hero_3'), [], '+=0.2');
    };
    const tk = (_t: number, dms: number) => {
      const dt = Math.min(dms / 1000, 1 / 30);
      uy += g * dt; x += ux * dt; y += uy * dt;
      x = gsap.utils.clamp(fs * 0.25, W - fs * 0.25, x);
      if (uy > 0) {
        // on the way down: the letter nearest to where he is heading, and a drift onto it
        if (aim < 0) { let best = Infinity; letters.forEach((_, i) => { const d = Math.abs(top(i).x - x); if (d < best) { best = d; aim = i; } }); }
        const t = top(aim);
        ux *= Math.max(0, 1 - 4 * dt); x += (t.x - x) * Math.min(1, 5 * dt);
        if (y >= t.y || performance.now() - t0 > 2500) { land(aim); return; }
      }
      boy.flip = ux < 0; boy.rot = gsap.utils.clamp(-40, 40, (ux / fs) * 9);
      boy.x = x; boy.y = y; boy.pose(uy < 0 ? 'fall_1' : 'comedy_3').apply();
    };
    gsap.ticker.add(tk);
  }

  // a letter's little tricks (between the stunts, and when tapped)
  const TRICKS: ((el: HTMLElement) => gsap.core.Animation)[] = [
    (el) => gsap.fromTo(el, { rotationY: 0 }, { rotationY: 360, transformPerspective: 700, duration: 0.9, ease: 'back.out(1.6)' }),
    (el) => gsap.fromTo(el, { scaleX: 1 }, { scaleX: 1.25, duration: 0.9, ease: wiggle }),
    (el) => gsap.timeline().to(el, { yPercent: -38, duration: 0.28, ease: 'power2.out' }).to(el, { yPercent: 0, duration: 0.24, ease: 'power2.in' }).add(squash(el, 0.7)),
    (el) => gsap.timeline().to(el, { '--ds': 0.42, duration: 0.3, ease: 'power2.out' }).to(el, { '--ds': 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' }),
    (el) => gsap.fromTo(el, { rotation: 0 }, { rotation: 14, duration: 0.9, ease: 'elastic.out(1.4, 0.25)', yoyo: true, repeat: 1, repeatDelay: 0.1 }),
    (el) => gsap.timeline().to(el, { '--dg': -0.85, duration: 0.25, ease: 'power2.inOut' }).to(el, { '--dg': 0, duration: 0.7, ease: 'back.out(2)' }, '+=0.25'),
  ];
  const trick = (i: number, k = Math.floor(Math.random() * TRICKS.length)) => TRICKS[k](letters[i]);
  const dotHop = () => gsap.timeline().to(dot, { y: -fs * 0.22, duration: 0.2, ease: 'power2.out' }).to(dot, { y: 0, duration: 0.18, ease: 'power2.in' })
    .to(dot, { scaleY: 0.65, scaleX: 1.3, duration: 0.05 }).to(dot, { scaleY: 1, scaleX: 1, duration: 0.45, ease: 'elastic.out(1.2, 0.35)' });
  // the ring a tap sends out (drawn), and the kick it gives (physics)
  function ripple(x: number, y: number, a = 1) {
    if (calm) return;
    jelly.ripple(x, y, a);
    const r = rings[ringN++ % rings.length];
    gsap.fromTo(r, { x, y, scale: 0.3, opacity: 0.55, rotation: gsap.utils.random(0, 90) }, { scale: (Math.max(W, H) * (0.55 + 0.35 * a)) / 40, opacity: 0, rotation: '+=40', duration: 0.7, ease: 'power2.out', overwrite: true });
  }
  jelly.probes.push({ at: () => ({ x: boy.x, y: boy.y - boy.height / 2 }), hit: (a) => { if (standing && !busy) gsap.fromTo(boy, { sy: 0.78 - 0.1 * a }, { sy: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.4)', overwrite: 'auto' }); } });
  // a fling of his letter, or a hard knock, throws him
  jelly.onShock = (n, s) => {
    const i = nodes.indexOf(n as Letter);
    if (i < 0 || !standing || busy) return;
    if (i === on && s > 1100) launch(n.vx, n.vy);
    else if (Math.abs(top(i).x - boy.x) < fs * 1.1) gsap.fromTo(boy, { sy: 0.8 }, { sy: 1, duration: 0.45, ease: 'elastic.out(1.2, 0.4)', overwrite: 'auto' });
  };

  // the arrival: the panels, then the ball and him; any touch skips it
  function intro() {
    const rest = letters.map((_, i) => top(i));
    const tl = gsap.timeline();
    tl.set(letters, { opacity: 1 }, 0);
    let t0 = 0.05;
    if (calm) tl.fromTo(letters, { scale: 0, rotation: () => gsap.utils.random(-30, 30) }, { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(2.4)', stagger: { each: 0.035, from: 'random' }, immediateRender: false }, 0.05);
    else { tl.add(panelsIn(root, act, name), 0); t0 = PANELS_END; }
    tl.from('.top > *', { y: -140, duration: 0.6, ease: 'back.out(1.8)', stagger: 0.08 }, 0.1);
    root.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el, i) => {
      const text = el.textContent ?? '';
      el.textContent = '';
      tl.to(el, { scrambleText: { text, chars: 'upperCase', speed: 0.8 }, duration: 0.9 }, t0 + 0.1 + i * 0.25);
    });
    tl.add(popIn(cast), t0 + 0.1);
    tl.add(popIn([glove]), t0 + 1.2);
    tl.add(ballRun(rest), t0 + 0.3);
    tl.add(boyIn(), t0 + 1.4);
    tl.call(startLife, [], t0 + 2.3);
    const skip = () => { if (tl.progress() < 1) tl.progress(1); evs.forEach((e) => removeEventListener(e, skip)); };
    const evs = ['pointerdown', 'wheel', 'touchmove', 'keydown'] as const;
    evs.forEach((e) => addEventListener(e, skip, { passive: true }));
    return tl;
  }

  // the red ball: bounces along the tops of GABRIEL, then flies up to be the dot after MAX
  function ballRun(rest: { x: number; y: number }[]) {
    const tl = gsap.timeline();
    const b = act.getBoundingClientRect(), d = dot.getBoundingClientRect();
    const hx = d.left - b.left + d.width / 2, hy = d.top - b.top + d.height / 2, R = dot.offsetWidth / 2;
    const at = (i: number) => ({ x: rest[i].x - hx, y: rest[i].y - R - hy });
    let prev = { x: -hx - R * 4, y: at(3).y - fs * 0.8 };
    tl.set(dot, { scale: 1, x: prev.x, y: prev.y });
    const hop = (to: { x: number; y: number }, height: number, t: number, onLand?: () => void) => {
      const apex = Math.min(prev.y, to.y) - height;
      tl.to(dot, { x: to.x, duration: t, ease: 'none' })
        .to(dot, { y: apex, duration: t / 2, ease: 'power2.out' }, '<')
        .to(dot, { y: to.y, duration: t / 2, ease: 'power2.in' }, '>');
      if (onLand) tl.call(onLand);
      prev = to;
    };
    for (let i = 3; i < letters.length; i++) {
      hop(at(i), fs * 0.3, 0.2, () => {
        squash(letters[i], 0.74);
        gsap.fromTo(dot, { scaleY: 0.6, scaleX: 1.35 }, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.35)' });
      });
    }
    hop({ x: 0, y: 0 }, fs * 0.9, 0.48, () => {
      gsap.fromTo(dot, { scaleY: 0.55, scaleX: 1.4 }, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1.3, 0.3)' });
      squash(letters[2], 0.85);
    });
    return tl;
  }

  // he falls in and lands on the X
  function boyIn() {
    const p = { y: 0 };
    const tl = gsap.timeline();
    tl.call(() => {
      const x = top(2);
      boy.pose('fall_0'); boy.x = x.x; boy.y = -fs; boy.flip = false; boy.apply();
      boy.el.style.opacity = '1';
    });
    tl.to(p, { y: 1, duration: 0.5, ease: 'power2.in', onUpdate: () => { const x = top(2); boy.x = x.x; boy.y = lerp(-fs * 1.5, x.y, p.y); boy.apply(); } });
    tl.call(() => {
      boy.pose('hero_0'); boy.sy = 0.86; standing = true; on = 2;
      squash(letters[2], 0.62);
      gsap.fromTo(name, { y: 0 }, { y: 6, duration: 0.5, ease: wiggle });
    });
    tl.to(boy, { sy: 1, duration: 0.35, ease: 'back.out(3)' });
    tl.call(() => { boy.pose('hero_3'); }, [], '+=0.25');
    return tl;
  }

  // the small life, always on; the stunts, only when poked
  const rig: Rig = { root, act, name, lines, letters, dot, boy, speed, fs: () => fs, on: () => on, top, squash, air };
  const stunts = makeStunts(rig);
  let alive = false, phrase = 0;
  let live: gsap.core.Timeline | null = null;
  function startLife() {
    if (alive) return;
    alive = true;
    if (calm) return;
    onBeat((n) => {
      if (document.hidden || live || jelly.excited || drag) return;
      const b = n % 16;
      if (b === 4) gsap.to(letters, { '--ds': 0.16, duration: 0.42, ease: 'sine.inOut', yoyo: true, repeat: 1, stagger: 0.05 });
      if (b === 9) { const c = letters.map((_, i) => i).filter((i) => i !== on); trick(c[Math.floor(Math.random() * c.length)]); }
      if (b === 13 && Math.random() < 0.7) {
        const step = Math.random() < 0.5 ? -1 : 1;
        let j = on + step * (1 + Math.floor(Math.random() * 2));
        if (j < 0 || j >= letters.length) j = on - step;
        hopTo(Math.max(0, Math.min(letters.length - 1, j)));
      }
      if (n % 4 === 3) dotHop();
    });
  }
  /** a poke: the next stunt, if nothing else is going on */
  function poke() {
    if (!alive || calm || live || busy) return false;
    jelly.settle();
    live = stunts[phrase++ % stunts.length]();
    live.eventCallback('onComplete', () => { live = null; });
    return true;
  }
  // touch: taps, grabs, flings
  let drag: { n: Letter; i: number; id: number; x0: number; y0: number; moved: boolean; lx: number; ly: number; lt: number; vx: number; vy: number } | null = null;
  let lastTap = 0, lastTapI = -1;
  function tapLetter(i: number) {
    const now = performance.now();
    if (now - lastTap < 340 && lastTapI === i && poke()) { lastTap = 0; return; }
    lastTap = now; lastTapI = i;
    if (i === on && standing) { hopTo(i === letters.length - 1 ? i - 1 : i + 1); return; }
    trick(i);
    const t = top(i);
    ripple(t.x, t.y + fs * 0.4, 0.4);
  }
  wraps.forEach((w, i) => {
    w.addEventListener('pointerdown', (e) => {
      if (live || drag) return;
      const p = toAct(e), n = nodes[i];
      drag = { n, i, id: e.pointerId, x0: p.x, y0: p.y, moved: false, lx: p.x, ly: p.y, lt: performance.now(), vx: 0, vy: 0 };
      w.setPointerCapture(e.pointerId);
    });
    w.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const p = toAct(e), now = performance.now(), dt = Math.max(1, now - drag.lt) / 1000;
      if (!drag.moved) {
        if (Math.hypot(p.x - drag.x0, p.y - drag.y0) < 6) return;
        drag.moved = true;
        jelly.grab(drag.n, drag.x0, drag.y0);
      }
      drag.vx = drag.vx * 0.5 + ((p.x - drag.lx) / dt) * 0.5; drag.vy = drag.vy * 0.5 + ((p.y - drag.ly) / dt) * 0.5;
      drag.lx = p.x; drag.ly = p.y; drag.lt = now;
      const k = calm ? 0.35 : 1;
      jelly.drag(drag.n, drag.x0 + (p.x - drag.x0) * k, drag.y0 + (p.y - drag.y0) * k, drag.vx, drag.vy);
    });
    const end = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag;
      drag = null;
      if (!d.moved) { if (e.type === 'pointerup') tapLetter(i); return; }
      const idle = performance.now() - d.lt > 80;
      jelly.release(d.n, idle || calm ? 0 : d.vx, idle || calm ? 0 : d.vy);
    };
    w.addEventListener('pointerup', end);
    w.addEventListener('pointercancel', end);
  });
  // the paper: a tap (not a scroll) sends a ring out from under your finger
  let paper: { id: number; x: number; y: number } | null = null;
  root.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('.chw, .stk, .boy, .dot, .badge, .tag, a, button')) { paper = null; return; }
    const p = toAct(e);
    paper = { id: e.pointerId, x: p.x, y: p.y };
  });
  root.addEventListener('pointerup', (e) => {
    if (!paper || paper.id !== e.pointerId) return;
    const p = toAct(e), q = paper;
    paper = null;
    if (Math.hypot(p.x - q.x, p.y - q.y) < 8) ripple(q.x, q.y, 1);
  });
  root.addEventListener('pointercancel', () => { paper = null; });
  // tap him: he snaps his fingers and the universe changes
  boy.el.addEventListener('pointerdown', () => {
    if (!standing || busy || live) return;
    busy = true;
    ripple(boy.x, boy.y, 0.5);
    gsap.timeline({ onComplete: () => { busy = false; } })
      .call(() => { boy.pose('snap_0'); })
      .call(() => { boy.pose('snap_1'); void setUniverse(nextUniverse(), 'boy'); }, [], 0.18)
      .call(() => { boy.pose('hero_3'); }, [], 1.1);
  });
  // a new universe: the type is measured again and the letters tumble into the new face
  onUniverse((u) => {
    if (live) { live.progress(1); live = null; }
    fit();
    retypeset(letters, u);
  });
  dot.addEventListener('pointerdown', () => {
    if (poke()) return;
    gsap.timeline().to(dot, { y: -fs * 0.9, duration: 0.35, ease: 'power2.out' }).to(dot, { y: 0, duration: 0.3, ease: 'power2.in' }).to(dot, { scaleY: 0.5, scaleX: 1.45, duration: 0.06 }).to(dot, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1.3, 0.3)' });
  });

  /** for checking: run stunt i now */
  const stunt = (i: number) => { live?.progress(1); jelly.settle(); live = stunts[i % stunts.length](); live.eventCallback('onComplete', () => { live = null; }); };
  return { fit, intro, boy, stunt, ripple, jelly };
}
