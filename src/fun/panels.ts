import gsap from 'gsap';
import { url } from './art';
import { shake } from './kit';
import { stickerUrl } from './stickers';
import './panels.css';

/*
 * PANELS — the way in. The paper is blank; comic panels slam onto it on the beat, each a different
 * angle of the same moment: his eyes narrowing, his fist opening into a snap, the red ball in the
 * air, one letter of the name far too close, the sun laughing; Ben-Day dots, the colour plates out
 * of register for a frame, sound-effect stickers popping in the gutters, the camera punching from
 * panel to panel. The last panel is a window onto the landing itself; it blows up to fill the
 * screen and the plates snap into register. About two seconds, and any touch skips it.
 */
type Box = { l: number; t: number; w: number; h: number };
type Def = { kind: 'art' | 'ball' | 'type' | 'sun'; tint: string; rot: number; phone: Box; desk: Box; sfx?: string; swap?: string };
const DEFS: Def[] = [
  { kind: 'art', tint: 'red', rot: -1.5, phone: { l: 4, t: 9, w: 92, h: 17 }, desk: { l: 6, t: 8, w: 44, h: 26 } },
  { kind: 'art', tint: 'sun', rot: 1.6, phone: { l: 4, t: 28, w: 46, h: 26 }, desk: { l: 72, t: 8, w: 22, h: 44 }, sfx: 'shout', swap: 'closeup_1' },
  { kind: 'ball', tint: 'cool', rot: -2, phone: { l: 52, t: 28, w: 44, h: 26 }, desk: { l: 52, t: 8, w: 18, h: 26 } },
  { kind: 'type', tint: 'paper', rot: 1.2, phone: { l: 4, t: 75, w: 56, h: 17 }, desk: { l: 6, t: 66, w: 40, h: 26 } },
  { kind: 'sun', tint: 'red', rot: -2.4, phone: { l: 62, t: 72, w: 34, h: 20 }, desk: { l: 52, t: 60, w: 18, h: 32 }, sfx: 'boing' },
];
export const PANELS_END = 2.3;

export function panelsIn(root: HTMLElement, act: HTMLElement, name: HTMLElement) {
  const W = root.clientWidth, H = root.clientHeight, phone = W < 760;
  const layer = document.createElement('div');
  layer.className = 'panels';
  layer.setAttribute('aria-hidden', 'true');
  root.append(layer);
  const ui = [...root.querySelectorAll<HTMLElement>('.tag, .badge')];
  gsap.set(ui, { opacity: 0 });
  const tl = gsap.timeline();
  const place = (el: HTMLElement, b: Box) => Object.assign(el.style, { left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%` });

  // each panel: slams in from close to the lens, the plates landing a frame late, the camera punching toward it
  DEFS.forEach((d, i) => {
    const p = document.createElement('div');
    p.className = `pn pn-${d.tint} pn-${d.kind}`;
    place(p, phone ? d.phone : d.desk);
    if (d.kind === 'art') { const im = document.createElement('img'); im.src = url(i === 0 ? 'closeup_0' : 'closeup_2'); im.alt = ''; p.append(im); }
    if (d.kind === 'ball') { p.innerHTML = '<i class="pn-burst"></i>'; const im = document.createElement('img'); im.src = stickerUrl('spark'); im.alt = ''; im.className = 'pn-ball'; p.append(im); }
    if (d.kind === 'type') { const t = document.createElement('b'); t.className = 'pn-x'; t.textContent = 'X'; p.append(t); }
    if (d.kind === 'sun') { const im = document.createElement('img'); im.src = stickerUrl('sun'); im.alt = ''; p.append(im); }
    layer.append(p);
    const at = 0.12 + i * 0.26, b = phone ? d.phone : d.desk, cx = b.l + b.w / 2, cy = b.t + b.h / 2;
    gsap.set(p, { scale: 0, rotation: d.rot * 4 });
    tl.to(p, { scale: 1, rotation: d.rot, duration: 0.24, ease: 'expo.out' }, at);
    tl.fromTo(p, { '--mis': '9px' }, { '--mis': '0px', duration: 0.28, ease: 'power3.out' }, at + 0.03);
    tl.fromTo(layer, { scale: 1.06, transformOrigin: `${cx}% ${cy}%` }, { scale: 1, duration: 0.3, ease: 'power2.out', immediateRender: false }, at);
    tl.add(() => { shake(root, 7, 0.18); }, at);
    if (d.swap) tl.call(() => { p.querySelector('img')!.src = url(d.swap!); }, [], at + 0.18);
    if (d.kind === 'ball') tl.fromTo(p.querySelector('.pn-ball'), { y: '60%', x: '-30%' }, { y: '-10%', x: '10%', duration: 0.5, ease: 'power2.out' }, at);
    if (d.sfx) {
      const s = document.createElement('img');
      s.className = `pn-sfx pn-sfx-${i}`; s.src = stickerUrl(d.sfx); s.alt = '';
      layer.append(s);
      tl.fromTo(s, { scale: 0, rotation: -30 }, { scale: 1, rotation: -8, duration: 0.4, ease: 'back.out(3)' }, at + 0.1);
    }
  });

  // the last panel: a window onto the landing, which then becomes the whole screen
  const r = name.getBoundingClientRect(), b = root.getBoundingClientRect();
  const mx = W * (phone ? 0.05 : 0.06), my = H * (phone ? 0.03 : 0.05);
  const win = { t: Math.max(0, r.top - b.top - my), l: Math.max(0, r.left - b.left - mx), b: Math.max(0, H - (r.bottom - b.top) - my), r: Math.max(0, W - (r.right - b.left) - mx) };
  const frame = document.createElement('i');
  frame.className = 'pn-window';
  root.append(frame);
  const put = () => {
    act.style.clipPath = `inset(${win.t}px ${win.r}px ${win.b}px ${win.l}px)`;
    Object.assign(frame.style, { top: `${win.t}px`, left: `${win.l}px`, right: `${win.r}px`, bottom: `${win.b}px` });
  };
  const tw = 0.12 + DEFS.length * 0.26 + 0.1;
  // shut until its panel slams in; then the landing shows through the window, over the other panels
  act.style.clipPath = 'inset(50%)';
  gsap.set(frame, { scale: 0 });
  tl.call(() => { put(); root.classList.add('windowed'); }, [], tw);
  tl.to(frame, { scale: 1, duration: 0.26, ease: 'expo.out' }, tw);
  tl.add(() => { shake(root, 9, 0.2); }, tw);
  tl.fromTo(layer, { scale: 1.08, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.3, ease: 'power2.out', immediateRender: false }, tw);
  const grow = tw + 0.42;
  tl.to(win, { t: 0, l: 0, b: 0, r: 0, duration: 0.5, ease: 'expo.inOut', onUpdate: put }, grow);
  tl.to(frame, { opacity: 0, duration: 0.2, onComplete: () => frame.remove() }, grow + 0.35);
  tl.to(layer.querySelectorAll('.pn, .pn-sfx'), { scale: 0.85, opacity: 0, duration: 0.3, ease: 'power2.in', stagger: 0.02 }, grow + 0.05);
  tl.to(ui, { opacity: 1, duration: 0.4 }, grow + 0.3);
  // the plates snap into register
  tl.call(() => { act.style.clipPath = ''; root.classList.remove('windowed'); layer.remove(); name.classList.add('plates'); }, [], grow + 0.5);
  tl.fromTo(name, { '--mis': `${Math.max(6, r.width * 0.012)}px` }, { '--mis': '0px', duration: 0.7, ease: 'elastic.out(1.2, 0.4)', immediateRender: false }, grow + 0.5);
  tl.add(() => { shake(root, 12, 0.3); }, grow + 0.5);
  tl.call(() => name.classList.remove('plates'), [], grow + 1.2);
  return tl;
}
