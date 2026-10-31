import gsap from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { CustomEase } from 'gsap/CustomEase';
import { CustomWiggle } from 'gsap/CustomWiggle';
import { Boy } from './boy';
import { COLD_LAND, coldOpen } from './coldopen';
import { deepPoint, flyInto } from './deep';
import { BEAT, C, calm, darkHeader, onBeat, shake } from './kit';
import { Speed } from './lines';
import { lean, popIn, sticker, stickerUrl } from './stickers';
import { makeStunts } from './stunts';
gsap.registerPlugin(ScrambleTextPlugin, CustomEase, CustomWiggle);

/*
 * HERO — the name is a playground, and it is loud. After the cold open the whole name smashes onto
 * the page frozen in misregistered print; a beat later it comes alive: the plates snap into
 * register, the red ball bounces along GABRIEL into the dot after MAX, he falls in onto the X. Then
 * it never calms down: on the first beat of every two bars the name pulls a stunt (stunts.ts), and
 * between them letters do tricks, he hops letter to letter, the ball keeps time. Tap anything.
 * When the scroll starts, the camera flies into the A (it turns red) and the dive takes over.
 */
export const HERO_POSES = ['fall_0', 'hero_0', 'hero_3', 'still_0', 'leap_0', 'leap_2', 'comedy_0', 'comedy_3', 'extra_1', 'snap_0', 'snap_1', 'powerup_0', 'powerup_2'];
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

export function initHero(root: HTMLElement, fine: boolean) {
  const cam = root.querySelector<HTMLElement>('.hero-cam')!, act = root.querySelector<HTMLElement>('.hero-act')!;
  const name = act.querySelector<HTMLElement>('.name')!;
  const lines = [...name.querySelectorAll<HTMLElement>('.line')];
  const letters: HTMLElement[] = [];
  for (const ln of lines) {
    for (const ch of ln.dataset.word!) {
      const s = document.createElement('span');
      s.className = 'ch'; s.textContent = ch; s.setAttribute('aria-hidden', 'true');
      ln.append(s); letters.push(s);
    }
  }
  const dot = document.createElement('img');
  dot.className = 'dot'; dot.src = stickerUrl('spark'); dot.alt = ''; dot.draggable = false;
  lines[0].append(dot);
  const boy = new Boy(act.querySelector<HTMLImageElement>('.boy')!);
  // the hand-drawn cast round the name, and the glove in the scroll ring
  const layer = act.querySelector<HTMLElement>('.stickers')!;
  const cast = ['sun', 'sparkle', 'inkpot', 'boombox', 'bolt'].map((n) => sticker(layer, n));
  const glove = sticker(root.querySelector<HTMLElement>('.badge')!, 'glove', '', false);
  if (fine) lean(cast, [24, -16, 20, -28, 14]);
  const ui = [...root.querySelectorAll<HTMLElement>('.tag, .badge')];
  const speed = new Speed(root, 'hero-lines');
  const freeze = document.createElement('i'), fill = document.createElement('i');
  freeze.className = 'freeze'; fill.className = 'hero-fill';
  root.append(freeze, fill);
  const wiggle = CustomWiggle.create('letterWiggle', { wiggles: 6, type: 'easeOut' });
  gsap.set(letters, { opacity: 0 });
  gsap.set(dot, { scale: 0 });

  // both lines share one size, set by GABRIEL filling the width without running out of height
  let fs = 100, base0 = 0;
  const capK = letters.map(() => 0.1);
  const span = (from: number, to: number) => letters[to].getBoundingClientRect().right - letters[from].getBoundingClientRect().left;
  function fit() {
    name.style.fontSize = '100px';
    const W = root.clientWidth, H = root.clientHeight, phone = W < 760;
    // headroom: the letters stretch as they play, so the resting name stays inside the edges
    fs = Math.min((100 * W * (phone ? 0.86 : 0.76)) / span(3, letters.length - 1), (H * (phone ? 0.6 : 0.5)) / 1.6);
    name.style.fontSize = `${fs}px`;
    boy.face = fs * (phone ? 0.34 : 0.31);
    // where the cap line sits inside each letter's box: the dot sits on the baseline, the cap height comes from the font
    const g = document.createElement('canvas').getContext('2d')!, cs = getComputedStyle(letters[0]);
    g.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    const cap = g.measureText('H').actualBoundingBoxAscent;
    base0 = dot.offsetTop + dot.offsetHeight;
    letters.forEach((el, i) => {
      const line = el.parentElement!, base = base0 + line.offsetTop - lines[0].offsetTop;
      capK[i] = (base - cap - el.offsetTop) / el.offsetHeight;
    });
    speed.size(W, H);
    if (zoomAt) zoomAt = target();
  }

  // where a letter's top is, in the stage's own px (follows squashes and tricks, ignores the camera)
  const top = (i: number) => {
    const r = letters[i].getBoundingClientRect(), b = act.getBoundingClientRect();
    const k = b.width / (act.offsetWidth || 1) || 1;
    return { x: (r.left - b.left + r.width / 2) / k, y: (r.top - b.top + r.height * capK[i]) / k };
  };
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

  // the opening: the cold open, the name lands frozen, a beat later everything starts
  function intro() {
    const tl = gsap.timeline();
    const co = document.querySelector<HTMLElement>('.coldopen');
    let t0 = 0;
    if (co && !calm) { tl.add(coldOpen(co), 0); t0 = COLD_LAND; } else co?.remove();
    const rest = letters.map((_, i) => top(i));
    tl.from('.top > *', { y: -140, duration: 0.7, ease: 'back.out(1.8)', stagger: 0.08 }, t0 + (calm ? 0 : BEAT));
    const tags = [...root.querySelectorAll<HTMLElement>('[data-scramble]')];
    tags.forEach((el, i) => {
      const text = el.textContent ?? '';
      el.textContent = '';
      tl.to(el, { scrambleText: { text, chars: 'upperCase', speed: 0.8 }, duration: 0.9 }, t0 + BEAT + 0.1 + i * 0.25);
    });
    // SMASH: the whole name, frozen in misregistered print
    tl.call(() => {
      gsap.set(letters, { opacity: 1 });
      if (calm) return;
      name.classList.add('plates');
      gsap.set(name, { '--mis': `${Math.max(5, fs * 0.045)}px` });
      freeze.style.opacity = '1';
    }, [], t0);
    if (!calm) tl.add(() => { shake(act, 14, 0.3); }, t0);
    // a beat later it plays: the plates snap into register and the letters land
    const t1 = t0 + (calm ? 0 : BEAT);
    tl.call(() => { freeze.style.opacity = '0'; }, [], t1);
    if (!calm) {
      tl.to(name, { '--mis': '0px', duration: 0.7, ease: 'elastic.out(1.2, 0.4)' }, t1);
      tl.call(() => name.classList.remove('plates'), [], t1 + 0.75);
      letters.forEach((el, i) => tl.add(squash(el, 0.7), t1 + i * 0.035));
    }
    tl.add(popIn(cast), t1 + 0.25);
    tl.add(popIn([glove]), t1 + 0.9);
    tl.add(ballRun(rest), t1 + 0.3);
    tl.add(boyIn(), t1 + 2.7);
    tl.call(startLoud, [], t1 + 3.8);
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
      hop(at(i), fs * 0.32, 0.26, () => {
        squash(letters[i], 0.74);
        gsap.fromTo(dot, { scaleY: 0.6, scaleX: 1.35 }, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.35)' });
      });
    }
    hop({ x: 0, y: 0 }, fs * 0.9, 0.55, () => {
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
    tl.to(p, { y: 1, duration: 0.55, ease: 'power2.in', onUpdate: () => { const x = top(2); boy.x = x.x; boy.y = lerp(-fs * 1.5, x.y, p.y); boy.apply(); } });
    tl.call(() => {
      boy.pose('hero_0'); boy.sy = 0.86; standing = true; on = 2;
      squash(letters[2], 0.62);
      gsap.fromTo(name, { y: 0 }, { y: 6, duration: 0.5, ease: wiggle });
    });
    tl.to(boy, { sy: 1, duration: 0.35, ease: 'back.out(3)' });
    tl.call(() => { boy.pose('hero_3'); }, [], '+=0.25');
    return tl;
  }

  // LOUD: a stunt on the first beat of every two bars; little things in between
  const rig: Rig = { root, act, name, lines, letters, dot, boy, speed, fs: () => fs, on: () => on, top, squash, air };
  const stunts = makeStunts(rig);
  let loud = false, paused = false, pending = false, phrase = 0;
  let live: gsap.core.Timeline | null = null;
  function startLoud() {
    if (loud || calm) return;
    loud = true;
    onBeat((n) => {
      if (paused || document.hidden) return;
      const b = n % 8;
      if (b === 0) pending = true;
      if (b > 2) pending = false;
      if (pending && !busy && !live) {
        pending = false;
        live = stunts[phrase++ % stunts.length]();
        live.eventCallback('onComplete', () => { live = null; });
        return;
      }
      if (live) return;
      if (b === 4 && n % 16 === 4) gsap.to(letters, { '--ds': 0.16, duration: 0.42, ease: 'sine.inOut', yoyo: true, repeat: 1, stagger: 0.05 });
      if (b === 5) { const c = letters.map((_, i) => i).filter((i) => i !== on); trick(c[Math.floor(Math.random() * c.length)]); }
      if (b === 6 && Math.random() < 0.7) {
        const step = Math.random() < 0.5 ? -1 : 1;
        let j = on + step * (1 + Math.floor(Math.random() * 2));
        if (j < 0 || j >= letters.length) j = on - step;
        hopTo(Math.max(0, Math.min(letters.length - 1, j)));
      }
      if (b === 3 || b === 7) dotHop();
    });
  }
  /** everything back to rest, nothing new starts (the dive has the screen) */
  function pause() {
    if (paused) return;
    paused = true; pending = false;
    if (live) { live.progress(1); live = null; }
    gsap.killTweensOf(letters); gsap.killTweensOf(name); gsap.killTweensOf(act);
    gsap.set(letters, { x: 0, y: 0, yPercent: 0, rotation: 0, rotationY: 0, scaleX: 1, scaleY: 1, '--ds': 0, '--dg': 0, transformOrigin: '50% 92%', color: '' });
    gsap.set(name, { scale: 1, y: 0, '--mis': '0px', visibility: '' });
    gsap.set(act, { x: 0, y: 0, scale: 1 });
    name.classList.remove('plates');
    root.style.backgroundColor = root.style.color = name.style.color = boy.el.style.filter = '';
    root.classList.remove('impact');
    darkHeader('hero-flip', false);
    speed.clear();
  }
  let wake: gsap.core.Tween | null = null;
  function resume() { wake?.kill(); wake = gsap.delayedCall(0.5, () => { paused = false; }); }

  // the camera flies into the A (it turns red first) until red fills the screen
  let zoomAt: { x: number; y: number; r: number } | null = null;
  function target() {
    const A = letters[1], cs = getComputedStyle(A);
    const d = deepPoint('A', cs.fontFamily, cs.fontWeight, 'condensed', 0.4);
    const sx = d.adv ? A.offsetWidth / (d.adv * fs) : 1;
    return { x: name.offsetLeft + A.offsetLeft + d.x * fs * sx, y: name.offsetTop + base0 + d.y * fs, r: d.r * fs * Math.min(1, sx) };
  }
  function zoom(u: number) {
    if (u <= 0.0005) {
      if (!zoomAt) return;
      zoomAt = null;
      root.classList.remove('zooming');
      cam.style.transform = '';
      fill.style.opacity = '0';
      layer.style.visibility = '';
      ui.forEach((el) => { el.style.opacity = ''; });
      gsap.to(letters[1], { color: C.ink, duration: 0.25, onComplete: () => { letters[1].style.color = ''; } });
      speed.clear();
      darkHeader('hero-zoom', false);
      resume();
      return;
    }
    if (!zoomAt) {
      wake?.kill();
      pause();
      zoomAt = target();
      root.classList.add('zooming');
      gsap.fromTo(letters[1], { scale: 1.18 }, { scale: 1, color: C.hot, duration: 0.45, ease: 'back.out(3)' });
    }
    const W = root.clientWidth, H = root.clientHeight;
    const z = Math.max(2, (Math.hypot(W, H) / 2 / Math.max(1.5, zoomAt.r)) * 1.2);
    cam.style.transform = flyInto(zoomAt.x, zoomAt.y, z, u, W, H);
    fill.style.opacity = String(gsap.utils.clamp(0, 1, (u - 0.84) / 0.13));
    layer.style.visibility = u > 0.1 ? 'hidden' : '';
    ui.forEach((el) => { el.style.opacity = String(Math.max(0, 1 - u * 6)); });
    if (!calm) speed.draw(u < 0.92 ? Math.min(1, u * 1.5) : 0, W / 2, H / 2, C.ink);
    darkHeader('hero-zoom', u > 0.6);
  }

  // taps
  letters.forEach((el, i) => el.addEventListener('pointerdown', () => {
    if (live || zoomAt) return;
    if (i === on && standing) { hopTo(i === letters.length - 1 ? i - 1 : i + 1); return; }
    trick(i);
  }));
  boy.el.addEventListener('pointerdown', () => {
    if (!standing || busy || live) return;
    busy = true;
    gsap.timeline({ onComplete: () => { busy = false; } })
      .call(() => { boy.pose('comedy_0'); })
      .to(boy, { sy: 1.12, duration: 0.12, ease: 'power2.out' })
      .to(boy, { sy: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.3)' })
      .call(() => { boy.pose('extra_1'); }, [], '+=0.2')
      .call(() => { boy.pose('hero_3'); }, [], '+=0.9');
  });
  dot.addEventListener('pointerdown', () => gsap.timeline().to(dot, { y: -fs * 0.9, duration: 0.35, ease: 'power2.out' }).to(dot, { y: 0, duration: 0.3, ease: 'power2.in' }).to(dot, { scaleY: 0.5, scaleX: 1.45, duration: 0.06 }).to(dot, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1.3, 0.3)' }));

  /** for checking: run stunt i now */
  const stunt = (i: number) => { live?.progress(1); live = stunts[i % stunts.length](); live.eventCallback('onComplete', () => { live = null; }); };
  return { fit, intro, boy, zoom, stunt };
}
