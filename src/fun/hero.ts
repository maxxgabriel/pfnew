import gsap from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { CustomEase } from 'gsap/CustomEase';
import { CustomWiggle } from 'gsap/CustomWiggle';
import { Boy } from './boy';
import { lean, popIn, sticker, stickerUrl } from './stickers';
gsap.registerPlugin(ScrambleTextPlugin, CustomEase, CustomWiggle);

/*
 * HERO — the name is a playground. MAX GABRIEL drops in one letter at a time and each lands with a
 * squash; the shapes pop in; the red ball bounces along the tops of GABRIEL (every letter it hits
 * squashes) and flies up to settle as the dot after MAX; then he falls in and lands on the X.
 * After that it never stops: a wave of width runs through the name, a letter does a trick every
 * couple of seconds, he hops from letter to letter. Tap a letter, a shape or him: they answer.
 */
export const HERO_POSES = ['fall_0', 'hero_0', 'hero_3', 'still_0', 'leap_0', 'leap_2', 'comedy_0', 'extra_1', 'snap_1'];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function initHero(root: HTMLElement, fine: boolean) {
  const name = root.querySelector<HTMLElement>('.name')!;
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
  const boy = new Boy(root.querySelector<HTMLImageElement>('.boy')!);
  // the hand-drawn cast round the name, and the glove in the scroll ring
  const layer = root.querySelector<HTMLElement>('.stickers')!;
  const cast = ['sun', 'sparkle', 'inkpot', 'boombox', 'bolt'].map((n) => sticker(layer, n));
  const glove = sticker(root.querySelector<HTMLElement>('.badge')!, 'glove', '', false);
  if (fine) lean(cast, [24, -16, 20, -28, 14]);
  const wiggle = CustomWiggle.create('letterWiggle', { wiggles: 6, type: 'easeOut' });
  gsap.set(letters, { opacity: 0 });
  gsap.set(dot, { scale: 0 });

  // both lines share one size, set by GABRIEL filling the width without running out of height
  let fs = 100;
  const capK = letters.map(() => 0.1);
  const span = (from: number, to: number) => letters[to].getBoundingClientRect().right - letters[from].getBoundingClientRect().left;
  function fit() {
    name.style.fontSize = '100px';
    const W = root.clientWidth, H = innerHeight;
    // headroom: the letters stretch as they play, so the resting name stays well inside the edges
    fs = Math.min((100 * W * (W < 760 ? 0.84 : 0.68)) / span(3, letters.length - 1), (H * (W < 760 ? 0.6 : 0.44)) / 1.6);
    name.style.fontSize = `${fs}px`;
    boy.face = fs * (W < 760 ? 0.34 : 0.31);
    // where the cap line sits inside each letter's box: the dot sits on the baseline, the cap height comes from the font
    const g = document.createElement('canvas').getContext('2d')!, cs = getComputedStyle(letters[0]);
    g.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    const cap = g.measureText('H').actualBoundingBoxAscent;
    const base0 = dot.offsetTop + dot.offsetHeight;
    letters.forEach((el, i) => {
      const line = el.parentElement!, base = base0 + line.offsetTop - lines[0].offsetTop;
      capK[i] = (base - cap - el.offsetTop) / el.offsetHeight;
    });
  }

  // where a letter's top is, in the hero's px (live: follows squashes and tricks)
  const top = (i: number) => {
    const r = letters[i].getBoundingClientRect(), b = root.getBoundingClientRect();
    return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height * capK[i] };
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
    if (busy || j === on) return;
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

  // a letter's tricks
  const TRICKS: ((el: HTMLElement) => gsap.core.Animation)[] = [
    (el) => gsap.fromTo(el, { rotationY: 0 }, { rotationY: 360, transformPerspective: 700, duration: 0.9, ease: 'back.out(1.6)' }),
    (el) => gsap.fromTo(el, { scaleX: 1 }, { scaleX: 1.25, duration: 0.9, ease: wiggle }),
    (el) => gsap.timeline().to(el, { yPercent: -38, duration: 0.28, ease: 'power2.out' }).to(el, { yPercent: 0, duration: 0.24, ease: 'power2.in' }).add(squash(el, 0.7)),
    (el) => gsap.timeline().to(el, { '--ds': 0.42, duration: 0.3, ease: 'power2.out' }).to(el, { '--ds': 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' }),
    (el) => gsap.fromTo(el, { rotation: 0 }, { rotation: 14, duration: 0.9, ease: 'elastic.out(1.4, 0.25)', yoyo: true, repeat: 1, repeatDelay: 0.1 }),
    (el) => gsap.timeline().to(el, { '--dg': -0.85, duration: 0.25, ease: 'power2.inOut' }).to(el, { '--dg': 0, duration: 0.7, ease: 'back.out(2)' }, '+=0.25'),
  ];
  const trick = (i: number, k = Math.floor(Math.random() * TRICKS.length)) => TRICKS[k](letters[i]);

  // the opening (positions are measured at rest, before anything moves)
  function intro() {
    const rest = letters.map((_, i) => top(i));
    const tl = gsap.timeline();
    tl.from('.top > *', { yPercent: -180, duration: 0.7, ease: 'back.out(1.8)', stagger: 0.08 }, 0.05);
    root.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el, i) => {
      const text = el.textContent ?? '';
      el.textContent = '';
      tl.to(el, { scrambleText: { text, chars: 'upperCase', speed: 0.8 }, duration: 0.9 }, 0.15 + i * 0.25);
    });
    letters.forEach((el, i) => {
      const at = 0.35 + i * 0.075;
      tl.set(el, { opacity: 1 }, at)
        .fromTo(el, { y: -(rest[i].y + fs * 1.4), rotation: gsap.utils.random(-50, 50) }, { y: 0, rotation: 0, duration: 0.44, ease: 'power2.in', immediateRender: false }, at)
        .add(squash(el, 0.6), at + 0.44)
        .fromTo(el, { '--dg': 0.3 }, { '--dg': 0, duration: 0.6, ease: 'power2.out', immediateRender: false }, at + 0.44);
    });
    tl.add(popIn(cast), 1.2);
    tl.add(popIn([glove]), 2.2);
    tl.add(ballRun(rest), 1.55);
    tl.add(boyIn(), 3.55);
    tl.call(idle, [], 4.4);
    return tl;
  }

  // the red ball: bounces along the tops of GABRIEL, then flies up to be the dot after MAX
  function ballRun(rest: { x: number; y: number }[]) {
    const tl = gsap.timeline();
    const b = root.getBoundingClientRect(), d = dot.getBoundingClientRect();
    const hx = d.left - b.left + d.width / 2, hy = d.top - b.top + d.height / 2, R = dot.offsetWidth / 2;
    const at = (i: number) => ({ x: rest[i].x - hx, y: rest[i].y - R - hy });
    let prev = { x: -hx - R * 4, y: at(3).y - fs * 0.8 };
    tl.set(dot, { scale: 1, x: prev.x, y: prev.y });
    const hopTime = 0.26;
    const hop = (to: { x: number; y: number }, height: number, t: number, onLand?: () => void) => {
      const apex = Math.min(prev.y, to.y) - height;
      tl.to(dot, { x: to.x, duration: t, ease: 'none' })
        .to(dot, { y: apex, duration: t / 2, ease: 'power2.out' }, `<`)
        .to(dot, { y: to.y, duration: t / 2, ease: 'power2.in' }, `>`);
      if (onLand) tl.call(onLand);
      prev = to;
    };
    for (let i = 3; i < letters.length; i++) {
      hop(at(i), fs * 0.32, hopTime, () => {
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
      p.y = -fs;
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

  // the never-ending part
  function idle() {
    gsap.timeline({ repeat: -1, repeatDelay: 3.6 }).to(letters, { '--ds': 0.16, duration: 0.45, ease: 'sine.inOut', yoyo: true, repeat: 1, stagger: 0.05 });
    gsap.timeline({ repeat: -1, repeatDelay: 2.2 }).call(() => {
      const choices = letters.map((_, i) => i).filter((i) => i !== on);
      trick(choices[Math.floor(Math.random() * choices.length)]);
    });
    gsap.timeline({ repeat: -1, repeatDelay: 5.2 }).call(() => {
      const step = Math.random() < 0.5 ? -1 : 1;
      let j = on + step * (1 + Math.floor(Math.random() * 2));
      if (j < 0 || j >= letters.length) j = on - step;
      hopTo(Math.max(0, Math.min(letters.length - 1, j)));
    }, [], 5.2);
    gsap.timeline({ repeat: -1, repeatDelay: 2.4 }).to(dot, { y: -fs * 0.22, duration: 0.24, ease: 'power2.out' }).to(dot, { y: 0, duration: 0.22, ease: 'power2.in' })
      .to(dot, { scaleY: 0.65, scaleX: 1.3, duration: 0.06 }).to(dot, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.35)' });
  }

  // taps
  letters.forEach((el, i) => el.addEventListener('pointerdown', () => {
    if (i === on && standing) { hopTo(i === letters.length - 1 ? i - 1 : i + 1); return; }
    trick(i);
  }));
  boy.el.addEventListener('pointerdown', () => {
    if (!standing || busy) return;
    busy = true;
    gsap.timeline({ onComplete: () => { busy = false; } })
      .call(() => { boy.pose('comedy_0'); })
      .to(boy, { sy: 1.12, duration: 0.12, ease: 'power2.out' })
      .to(boy, { sy: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.3)' })
      .call(() => { boy.pose('extra_1'); }, [], '+=0.2')
      .call(() => { boy.pose('hero_3'); }, [], '+=0.9');
  });
  dot.addEventListener('pointerdown', () => gsap.timeline().to(dot, { y: -fs * 0.9, duration: 0.35, ease: 'power2.out' }).to(dot, { y: 0, duration: 0.3, ease: 'power2.in' }).to(dot, { scaleY: 0.5, scaleX: 1.45, duration: 0.06 }).to(dot, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1.3, 0.3)' }));

  return { fit, intro, boy };
}
