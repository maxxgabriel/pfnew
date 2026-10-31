import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Boy } from './boy';
import { popIn, sticker, stickerUrl } from './stickers';
gsap.registerPlugin(ScrollTrigger);

/*
 * One card, a live loop: SQUISH. A red ball bounces along the word and every letter it lands on
 * squashes flat and springs back fatter. The card is dealt in from the side when it scrolls into
 * view, floats, and leans toward the pointer with a glare; he peeks over its top edge from behind,
 * ducks, and pops up somewhere else.
 */
export const CARD_POSES = ['curious', 'extra_1', 'still_3'];

export function initCard(card: HTMLElement, fine: boolean) {
  const word = card.querySelector<HTMLElement>('.squish')!;
  const stage = card.querySelector<HTMLElement>('.card-stage')!;
  const letters = [...(word.dataset.word ?? '')].map((ch) => {
    const s = document.createElement('span');
    s.className = 'sq'; s.textContent = ch;
    word.append(s);
    return s;
  });
  const ball = document.createElement('img');
  ball.className = 'ball'; ball.src = stickerUrl('spark'); ball.alt = ''; ball.draggable = false;
  // stickers stuck on the card, and the stopwatch on the section title
  const stuck = [sticker(card, 'flipbook'), sticker(card, 'badge'), sticker(document.querySelector<HTMLElement>('.made-head')!, 'stopwatch')];
  const probe = document.createElement('i'); // sits on the baseline, so the ball lands on the real tops of the letters
  probe.className = 'probe';
  word.append(probe, ball);
  let loop: gsap.core.Timeline | null = null;

  function build() {
    loop?.kill();
    gsap.set([...letters, ball], { clearProps: 'transform' });
    word.style.fontSize = '100px';
    const w = letters[letters.length - 1].getBoundingClientRect().right - letters[0].getBoundingClientRect().left;
    const fs = (100 * stage.clientWidth * 0.74) / w;
    word.style.fontSize = `${fs}px`;
    const wr = word.getBoundingClientRect(), R = ball.offsetWidth / 2;
    const g = document.createElement('canvas').getContext('2d')!, cs = getComputedStyle(letters[0]);
    g.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    const capTop = probe.offsetTop - g.measureText('H').actualBoundingBoxAscent;
    const pos = letters.map((l) => { const r = l.getBoundingClientRect(); return { x: r.left - wr.left + r.width / 2 - R, y: capTop - R * 2 }; });
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });
    let prev = { x: pos[0].x - stage.clientWidth * 0.55, y: pos[0].y - fs * 0.6 };
    tl.set(ball, { x: prev.x, y: prev.y, scale: 1 });
    const hop = (to: { x: number; y: number }, h: number, t: number, land?: () => void) => {
      tl.to(ball, { x: to.x, duration: t, ease: 'none' })
        .to(ball, { y: Math.min(prev.y, to.y) - h, duration: t / 2, ease: 'power2.out' }, '<')
        .to(ball, { y: to.y, duration: t / 2, ease: 'power2.in' }, '>');
      if (land) tl.call(land);
      prev = to;
    };
    letters.forEach((l, i) => hop(pos[i], fs * (i ? 0.38 : 0.7), i ? 0.3 : 0.45, () => {
      gsap.timeline()
        .to(l, { scaleY: 0.5, scaleX: 1.22, '--ds': 0.45, duration: 0.08, ease: 'power2.out' })
        .to(l, { scaleY: 1, scaleX: 1, '--ds': 0, duration: 0.9, ease: 'elastic.out(1.15, 0.3)' });
      gsap.fromTo(ball, { scaleY: 0.6, scaleX: 1.35 }, { scaleY: 1, scaleX: 1, duration: 0.45, ease: 'elastic.out(1.2, 0.35)' });
    }));
    hop({ x: pos[pos.length - 1].x + stage.clientWidth * 0.55, y: pos[0].y + fs * 0.4 }, fs * 0.5, 0.5);
    loop = tl;
  }

  // dealt in when it scrolls into view, then it floats
  gsap.set(card, { x: '70vw', rotation: 24, opacity: 0 });
  ScrollTrigger.create({
    trigger: card, start: 'top 88%', once: true,
    onEnter: () => {
      gsap.timeline()
        .to(card, { x: 0, rotation: -2.5, opacity: 1, duration: 0.9, ease: 'back.out(1.4)' })
        .add(popIn(stuck), 0.55)
        .to(card, { y: -8, rotation: -1.2, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0.9);
    },
  });

  // leans toward the pointer, with a glare
  if (fine) {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' }), ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    gsap.set(card, { transformPerspective: 900 });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      ry(nx * 16); rx(-ny * 12);
      card.style.setProperty('--gx', `${(nx + 0.5) * 100}%`); card.style.setProperty('--gy', `${(ny + 0.5) * 100}%`);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }
  card.addEventListener('pointerdown', () => gsap.fromTo(card, { scale: 0.97 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)' }));

  // he peeks over the top edge from behind the card, ducks, and pops up somewhere else
  const peek = new Boy(card.parentElement!.querySelector<HTMLImageElement>('.peek')!);
  const spots = [0.82, 0.2, 0.6];
  let spot = 0;
  function place(rise: number) {
    const W = card.offsetWidth;
    peek.face = Math.max(30, W * 0.085);
    peek.x = card.offsetLeft + W * spots[spot % spots.length];
    peek.y = card.offsetTop + peek.height * (1.05 - 0.62 * rise);
    peek.apply();
  }
  const p = { rise: 0 };
  peek.pose('curious');
  gsap.timeline({ repeat: -1, delay: 1.5 })
    .to(p, { rise: 1, duration: 0.45, ease: 'back.out(2.4)', onUpdate: () => place(p.rise) })
    .call(() => { peek.pose('extra_1'); place(p.rise); }, [], '+=1.6')
    .call(() => { peek.pose('curious'); place(p.rise); }, [], '+=0.7')
    .to(p, { rise: 0, duration: 0.3, ease: 'power2.in', onUpdate: () => place(p.rise) }, '+=0.9')
    .call(() => { spot++; peek.flip = spot % 2 === 1; place(0); }, [], '+=0.8');
  peek.el.style.opacity = '1';

  return { fit: () => { build(); place(p.rise); } };
}
