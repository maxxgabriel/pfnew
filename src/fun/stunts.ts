import gsap from 'gsap';
import type { Rig } from './hero';
import { BEAT, C, darkHeader, glitchFlash, shake } from './kit';

/*
 * The name's stunts, one on the first beat of every two bars, each over in about two seconds and
 * always back to rest:
 *   STRETCH  a squash for the run-up, then the name stretches past both edges, breathes, snaps back
 *   SLOT     every letter spins through five typefaces and four colours like a reel; they stop
 *            left to right, each landing with a squash
 *   PUNCH    the camera punches in on him (an impact frame, speed lines, his hair blown back)
 *   SLICE    he snaps his fingers: the name tears into strips that jolt apart in colour plates,
 *            then slam back together
 *   FLIP     four smash cuts on four beats: red, ink, sky, butter, the letters re-inked each time
 *   DOMINO   the letters topple like dominoes (the X knocks the ball off) and spring back up
 * He jumps clear of anything that would throw him off, and rides the rest.
 */
const FACES = [
  { family: 'Anton', weight: '400' },
  { family: 'Bangers', weight: '400' },
  { family: '"Bebas Neue"', weight: '400' },
  { family: 'Montserrat', weight: '900' },
  { family: 'Jost', weight: '800' },
];
const HUES = [C.hot, C.cool, C.ink, C.sun];

export function makeStunts(r: Rig): (() => gsap.core.Timeline)[] {
  return [stretch, slot, punch, slice, flip, domino];

  function stretch() {
    const L = r.letters;
    return gsap.timeline()
      .to(L, { '--ds': -0.2, scaleY: 0.8, duration: BEAT * 0.5, ease: 'power2.in', stagger: { each: 0.01, from: 'center' } })
      .to(L, { '--ds': 0.76, scaleY: 1.14, duration: 0.34, ease: 'back.out(2)', stagger: { each: 0.018, from: 'center' } })
      .to(L, { scaleY: 1.26, duration: BEAT * 0.75, ease: 'sine.inOut', yoyo: true, repeat: 1 })
      .to(L, { '--ds': 0, scaleY: 1, duration: 1.1, ease: 'elastic.out(1, 0.32)', stagger: { each: 0.03, from: 'edges' } });
  }

  function slot() {
    const L = r.letters, reels: HTMLElement[] = [], stopped = L.map(() => false);
    const spin = { f: 0 };
    let last = -1;
    const done = () => { reels.forEach((s) => s.remove()); reels.length = 0; L.forEach((el) => { el.style.color = ''; }); };
    const tl = gsap.timeline({ onComplete: done });
    tl.call(() => {
      r.air(1.6);
      for (const el of L) {
        const s = document.createElement('span');
        s.className = 'reel'; s.textContent = el.textContent; s.setAttribute('aria-hidden', 'true');
        Object.assign(s.style, { left: `${el.offsetLeft}px`, top: `${el.offsetTop}px`, width: `${el.offsetWidth}px`, height: `${el.offsetHeight}px` });
        r.name.append(s); reels.push(s);
        el.style.color = 'transparent';
      }
    });
    tl.to(spin, { f: 32, duration: 1.95, ease: 'none', onUpdate: () => {
      const f = Math.floor(spin.f);
      if (f === last) return;
      last = f;
      reels.forEach((s, i) => {
        if (stopped[i]) return;
        const face = FACES[(f + i * 2) % FACES.length];
        s.style.fontFamily = face.family; s.style.fontWeight = face.weight;
        s.style.color = HUES[(f + i) % HUES.length];
        gsap.set(s, { yPercent: (f + i) % 2 ? -10 : 10, scaleY: 1.3 });
      });
    } }, 0.02);
    L.forEach((el, i) => tl.call(() => {
      stopped[i] = true;
      reels[i]?.remove();
      el.style.color = '';
      r.squash(el, 0.64);
    }, [], 0.6 + i * 0.1));
    return tl;
  }

  function punch() {
    const tl = gsap.timeline();
    const at = { x: 0, y: 0 }, W = () => r.root.clientWidth, H = () => r.root.clientHeight;
    const burst = { k: 0 };
    tl.call(() => {
      at.x = r.boy.x; at.y = r.boy.y - r.boy.height * 0.5;
      gsap.set(r.act, { transformOrigin: `${at.x}px ${at.y}px` });
      r.boy.pose('powerup_0');
    });
    tl.to(r.act, { scale: 0.96, duration: BEAT * 0.5, ease: 'power2.in' });
    tl.call(() => {
      r.boy.pose('powerup_2');
      r.root.classList.add('impact');
      gsap.delayedCall(0.07, () => r.root.classList.remove('impact'));
    });
    tl.to(r.act, { scale: 2.5, x: () => W() / 2 - at.x, y: () => H() / 2 - at.y, duration: 0.11, ease: 'power4.out' });
    tl.add(() => { shake(r.root, 12, 0.3); }, '<0.08');
    tl.fromTo(burst, { k: 1 }, { k: 0.55, duration: BEAT * 1.6, ease: 'power1.out', onUpdate: () => r.speed.draw(burst.k, W() / 2, H() / 2, C.ink) }, '<');
    tl.call(() => r.boy.pose('powerup_0'), [], `<${BEAT * 0.75}`);
    tl.call(() => r.boy.pose('powerup_2'), [], `<${BEAT * 0.5}`);
    tl.to(r.act, { scale: 1, x: 0, y: 0, duration: 0.6, ease: 'expo.inOut' }, `<${BEAT * 0.4}`);
    tl.to(burst, { k: 0, duration: 0.3, onUpdate: () => r.speed.draw(burst.k, W() / 2, H() / 2, C.ink) }, '<');
    tl.call(() => { r.speed.clear(); r.boy.pose('hero_3'); });
    return tl;
  }

  function slice() {
    const N = 5, bands: HTMLElement[] = [];
    // the strips: copies of the name, each clipped to one band (made now, shown on the snap)
    for (let i = 0; i < N; i++) {
      const c = r.name.cloneNode(true) as HTMLElement;
      c.classList.add('slice', 'plates');
      c.removeAttribute('aria-label'); c.setAttribute('aria-hidden', 'true');
      Object.assign(c.style, { left: `${r.name.offsetLeft}px`, top: `${r.name.offsetTop}px`, width: `${r.name.offsetWidth}px`, visibility: 'hidden',
        clipPath: `inset(${(i / N) * 100}% -40% ${100 - ((i + 1) / N) * 100}% -40%)` });
      r.act.append(c); bands.push(c);
    }
    const done = () => { bands.forEach((b) => b.remove()); r.name.style.visibility = ''; };
    const tl = gsap.timeline({ onComplete: done });
    const t = BEAT * 0.5, w = () => r.root.clientWidth;
    tl.call(() => r.boy.pose('snap_0'));
    tl.call(() => {
      r.boy.pose('snap_1');
      glitchFlash(0.24);
      bands.forEach((b) => { b.style.visibility = ''; });
      r.name.style.visibility = 'hidden';
    }, [], t);
    tl.call(() => r.air(BEAT * 2.4), [], t + 0.2);
    tl.to(bands, { x: (i) => (i % 2 ? -1 : 1) * w() * gsap.utils.random(0.07, 0.2), '--mis': '9px', duration: 0.16, ease: 'steps(3)', stagger: 0.02 }, t + 0.02);
    tl.to(bands, { x: (i) => (i % 2 ? 1 : -1) * w() * gsap.utils.random(0.03, 0.14), duration: 0.14, ease: 'steps(2)', stagger: { each: 0.02, from: 'end' } }, BEAT * 1.6);
    tl.to(bands, { x: 0, '--mis': '0px', duration: 0.12, ease: 'power4.in' }, BEAT * 2.7);
    tl.call(() => { done(); shake(r.act, 10, 0.28); glitchFlash(0.16); }, [], BEAT * 2.7 + 0.13);
    return tl;
  }

  function flip() {
    const SEQ = [
      { bg: C.hot, fg: C.paper, dark: true, inv: false },
      { bg: C.ink, fg: C.sun, dark: true, inv: true },
      { bg: C.cool, fg: C.ink, dark: false, inv: false },
      { bg: C.sun, fg: C.hot, dark: false, inv: false },
    ];
    const cut = (s: (typeof SEQ)[number] | null) => {
      r.root.style.backgroundColor = s ? s.bg : '';
      r.root.style.color = r.name.style.color = s ? s.fg : '';
      r.boy.el.style.filter = s?.inv ? 'invert(1)' : '';
      darkHeader('hero-flip', !!s?.dark);
      if (!s) return;
      gsap.fromTo(r.name, { scale: 1.08 }, { scale: 1, duration: 0.42, ease: 'back.out(3)', overwrite: 'auto' });
      r.name.classList.add('plates');
      gsap.fromTo(r.name, { '--mis': '8px' }, { '--mis': '0px', duration: 0.3, ease: 'power2.out', onComplete: () => r.name.classList.remove('plates') });
    };
    const tl = gsap.timeline({ onComplete: () => cut(null) });
    SEQ.forEach((s, i) => tl.call(() => cut(s), [], i * BEAT));
    tl.call(() => { cut(null); shake(r.act, 6, 0.2); }, [], SEQ.length * BEAT);
    return tl;
  }

  function domino() {
    const tl = gsap.timeline({ onComplete: () => { gsap.set(r.letters, { rotation: 0, transformOrigin: '50% 92%' }); } });
    tl.call(() => r.air(BEAT * 5));
    r.lines.forEach((ln, li) => {
      const ls = [...ln.querySelectorAll<HTMLElement>('.ch')];
      tl.set(ls, { transformOrigin: '100% 92%' }, 0.12);
      // each one tips onto the next and leans there; the last one has nothing to lean on
      tl.to(ls, { rotation: (i) => (i === ls.length - 1 ? 90 : 58), duration: 0.42, ease: 'bounce.out', stagger: 0.085 }, 0.2 + li * 0.05);
      tl.to(ls, { rotation: 0, duration: 0.55, ease: 'back.out(2.2)', stagger: { each: 0.06, from: 'end' } }, BEAT * 3);
    });
    // the X knocks the ball off its perch
    tl.to(r.dot, { y: () => -r.fs() * 0.75, rotation: 200, duration: 0.32, ease: 'power2.out' }, 0.2 + 2 * 0.085 + 0.2);
    tl.to(r.dot, { y: 0, rotation: 360, duration: 0.42, ease: 'bounce.out' });
    tl.set(r.dot, { rotation: 0 });
    return tl;
  }
}
