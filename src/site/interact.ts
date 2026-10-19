import { gsap } from 'gsap';
import { calm as reduced } from './motion';

/*
 * INTERACT — the hover and touch life of every control (round 36).
 *
 * Every link, button, sticker and card answers the pointer, the way the
 * reference site does: text rolls, letters scramble and jump, pills squash
 * and pull toward the cursor, stickers wobble, cards tilt with a shine, and
 * the cursor itself is the red Spark. Hover is only ever an extra: every
 * effect also plays on press, so touch screens get the same life.
 *
 * Opt in with data attributes, or let autoWire() pick sensible defaults:
 *   data-roll       text slides up and a copy rolls in from below
 *   data-scramble   text scrambles through glyphs and resolves
 *   data-jump       each letter hops when the pointer passes it
 *   data-magnet     pulls toward the cursor, springs back
 *   data-squish     squash and stretch on hover, a pop on press
 *   data-wobble     stickers lift and wiggle
 *   data-tilt       cards tilt toward the cursor with a moving shine
 *   data-underline  a line draws in from the left, leaves to the right
 *   data-preview=url a little drawing floats beside the cursor over the item
 *   data-cursor="Open"  the cursor grows into a labelled bubble
 */

const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const done = new WeakSet<Element>();
const once = (el: Element, key: string) => {
  const k = `__i_${key}`;
  if ((el as unknown as Record<string, boolean>)[k]) return false;
  (el as unknown as Record<string, boolean>)[k] = true;
  done.add(el);
  return true;
};
/** hover on desktop, press on touch: one handler for both */
function onEnter(el: HTMLElement, enter: () => void, leave?: () => void) {
  el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') enter(); });
  el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') leave?.(); });
  el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { enter(); setTimeout(() => leave?.(), 420); } });
}

/* ------------------------------------------------------------ text */

function splitChars(el: HTMLElement) {
  const text = el.textContent ?? '';
  el.setAttribute('aria-label', text.trim());
  el.textContent = '';
  return [...text].map((ch) => {
    const s = document.createElement('span');
    s.className = 'ix-ch';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = ch === ' ' ? ' ' : ch;
    el.appendChild(s);
    return s;
  });
}

/** text slides up out of its line while a copy rolls in from below */
export function roll(el: HTMLElement) {
  if (!once(el, 'roll') || !el.textContent?.trim()) return;
  const text = el.textContent;
  el.textContent = '';
  el.classList.add('ix-roll');
  const a = document.createElement('span');
  const b = document.createElement('span');
  a.className = 'ix-roll-a';
  b.className = 'ix-roll-b';
  a.textContent = b.textContent = text;
  b.setAttribute('aria-hidden', 'true');
  el.append(a, b);
  const ca = splitChars(a), cb = splitChars(b);
  el.setAttribute('aria-label', text.trim());
  gsap.set(cb, { yPercent: 105 });
  onEnter(el, () => {
    gsap.to(ca, { yPercent: -105, duration: 0.45, ease: 'expo.out', stagger: 0.018, overwrite: true });
    gsap.to(cb, { yPercent: 0, duration: 0.45, ease: 'expo.out', stagger: 0.018, overwrite: true });
  }, () => {
    gsap.to(ca, { yPercent: 0, duration: 0.45, ease: 'expo.out', stagger: 0.012, overwrite: true });
    gsap.to(cb, { yPercent: 105, duration: 0.45, ease: 'expo.out', stagger: 0.012, overwrite: true });
  });
}

const GLYPHS = '!<>-_/[]{}=+*^?#ABCDEFGHJKMNPQRSTUVWXYZ0123456789';
/** the label scrambles through glyphs and resolves, left to right */
export function scramble(el: HTMLElement) {
  if (!once(el, 'scramble')) return;
  const text = el.textContent ?? '';
  let raf = 0;
  onEnter(el, () => {
    cancelAnimationFrame(raf);
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = (now - t0) / 420;
      el.textContent = [...text].map((c, i) => (c === ' ' || i / text.length < k ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      if (k < 1) raf = requestAnimationFrame(tick); else el.textContent = text;
    };
    raf = requestAnimationFrame(tick);
  });
}

/** each letter hops when the pointer passes over it (poke the big type) */
export function jump(el: HTMLElement) {
  if (!once(el, 'jump')) return;
  for (const c of splitChars(el)) {
    c.style.display = 'inline-block';
    onEnter(c, () => {
      gsap.timeline({ overwrite: true })
        .to(c, { yPercent: -18, scaleY: 1.12, scaleX: 0.92, rotate: gsap.utils.random(-8, 8), duration: 0.16, ease: 'power2.out' })
        .to(c, { yPercent: 0, scaleY: 1, scaleX: 1, rotate: 0, duration: 0.7, ease: 'elastic.out(1.1, 0.35)' });
    });
  }
}

/** a line draws in from the left and leaves to the right */
export function underline(el: HTMLElement) {
  if (!once(el, 'underline')) return;
  el.classList.add('ix-ul');
  onEnter(el, () => el.classList.add('ix-ul-on'), () => { el.classList.remove('ix-ul-on'); el.classList.add('ix-ul-out'); setTimeout(() => el.classList.remove('ix-ul-out'), 450); });
}

/* ------------------------------------------------------------ objects */

/** pulls toward the cursor while it's near, springs back on leave */
export function magnet(el: HTMLElement, strength = 0.35) {
  if (!once(el, 'magnet') || !fine) return;
  const qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
  const qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    qx((e.clientX - (r.left + r.width / 2)) * strength);
    qy((e.clientY - (r.top + r.height / 2)) * strength);
  });
  el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)', overwrite: true }));
}

/** squash and stretch on hover, a pop when pressed */
export function squish(el: HTMLElement) {
  if (!once(el, 'squish')) return;
  onEnter(el, () => {
    gsap.timeline({ overwrite: true })
      .to(el, { scaleX: 1.07, scaleY: 0.93, duration: 0.12, ease: 'power2.out' })
      .to(el, { scaleX: 1, scaleY: 1, duration: 0.8, ease: 'elastic.out(1.2, 0.3)' });
  });
  el.addEventListener('pointerdown', () => {
    gsap.timeline({ overwrite: true })
      .to(el, { scale: 0.9, duration: 0.08, ease: 'power2.in' })
      .to(el, { scale: 1, duration: 0.7, ease: 'elastic.out(1.3, 0.3)' });
  });
}

/** stickers lift off the page and wiggle */
export function wobble(el: HTMLElement) {
  if (!once(el, 'wobble')) return;
  el.classList.add('ix-sticker');
  const base = gsap.getProperty(el, 'rotate') as number;
  onEnter(el, () => {
    gsap.timeline({ overwrite: true })
      .to(el, { scale: 1.12, y: -6, duration: 0.18, ease: 'back.out(3)' })
      .to(el, { keyframes: { rotate: [base - 9, base + 7, base - 4, base + 2, base] }, duration: 0.6, ease: 'none' }, 0)
      .add(() => el.classList.add('ix-lift'), 0);
  }, () => {
    gsap.to(el, { scale: 1, y: 0, rotate: base, duration: 0.6, ease: 'elastic.out(1, 0.4)', overwrite: true });
    el.classList.remove('ix-lift');
  });
}

/** cards tilt toward the cursor; a shine slides across them */
export function tilt(el: HTMLElement, max = 9) {
  if (!once(el, 'tilt') || !fine || reduced) return;
  el.classList.add('ix-tilt');
  // never override an element that is already absolute or fixed (the carousel cards are)
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  const shine = document.createElement('span');
  shine.className = 'ix-shine';
  shine.setAttribute('aria-hidden', 'true');
  el.appendChild(shine);
  gsap.set(el, { transformPerspective: 900 });
  const rx = gsap.quickTo(el, 'rotateX', { duration: 0.5, ease: 'power3.out' });
  const ry = gsap.quickTo(el, 'rotateY', { duration: 0.5, ease: 'power3.out' });
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    ry((px - 0.5) * max * 2);
    rx(-(py - 0.5) * max * 2);
    shine.style.setProperty('--sx', `${px * 100}%`);
    shine.style.setProperty('--sy', `${py * 100}%`);
  });
  el.addEventListener('pointerenter', () => el.classList.add('ix-tilt-on'));
  el.addEventListener('pointerleave', () => {
    el.classList.remove('ix-tilt-on');
    gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)', overwrite: true });
  });
}

/** a little drawing floats beside the cursor while it's over the item (menu and list rows) */
let previewBox: HTMLImageElement | null = null;
export function preview(el: HTMLElement) {
  if (!once(el, 'preview') || !el.dataset.preview) return;
  if (!previewBox) {
    previewBox = document.createElement('img');
    previewBox.className = 'ix-preview';
    previewBox.alt = '';
    document.body.appendChild(previewBox);
  }
  const box = previewBox;
  const px = gsap.quickTo(box, 'x', { duration: 0.55, ease: 'power3.out' });
  const py = gsap.quickTo(box, 'y', { duration: 0.55, ease: 'power3.out' });
  el.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { px(e.clientX + 24); py(e.clientY - 60); } });
  onEnter(el, () => {
    box.src = el.dataset.preview!;
    gsap.to(box, { scale: 1, rotate: gsap.utils.random(-8, 8), opacity: 1, duration: 0.5, ease: 'back.out(2.5)', overwrite: 'auto' });
  }, () => gsap.to(box, { scale: 0.4, opacity: 0, duration: 0.25, ease: 'power2.in', overwrite: 'auto' }));
}

/* ------------------------------------------------------------ the cursor: the red Spark */

function sparkCursor() {
 if(!fine)return;
 const dot=document.createElement('div'),bubble=document.createElement('div'),canvas=document.createElement('canvas');
 dot.className='ix-cursor';bubble.className='cursor-label';canvas.className='cursor-tail';
 dot.style.opacity='0';bubble.style.opacity='0';document.body.append(canvas,bubble,dot);
 const ctx=canvas.getContext('2d')!;const points:{x:number;y:number;t:number}[]=[];
 const resize=()=>{canvas.width=innerWidth;canvas.height=innerHeight;};resize();addEventListener('resize',resize);
 addEventListener('pointermove',e=>{
 if(e.pointerType!=='mouse')return;
 dot.style.opacity='1';dot.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;
 points.push({x:e.clientX,y:e.clientY,t:performance.now()});if(points.length>16)points.shift();
 const target=(e.target as Element).closest('[data-cursor],a,button');const mode=target?.getAttribute('data-cursor')??(target?'link':'');
 bubble.dataset.mode=mode;bubble.textContent=mode==='link'?'':mode;bubble.style.opacity=mode&&mode!=='link'?'1':'0';bubble.style.transform=`translate(${e.clientX+22}px,${e.clientY+16}px)`;
 });
 gsap.ticker.add(()=>{
 const now=performance.now();while(points.length&&now-points[0].t>220)points.shift();ctx.clearRect(0,0,canvas.width,canvas.height);
 if(points.length<2)return;
 // One filled tapered stroke, from the oldest point to the Spark.
 ctx.beginPath();points.forEach((p,i)=>{const next=points[Math.min(i+1,points.length-1)],prev=points[Math.max(0,i-1)];const angle=Math.atan2(next.y-prev.y,next.x-prev.x)+Math.PI/2;const width=i/points.length*4;const x=p.x+Math.cos(angle)*width,y=p.y+Math.sin(angle)*width;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
 for(let i=points.length-1;i>=0;i--){const p=points[i],next=points[Math.min(i+1,points.length-1)],prev=points[Math.max(0,i-1)],angle=Math.atan2(next.y-prev.y,next.x-prev.x)+Math.PI/2,width=i/points.length*4;ctx.lineTo(p.x-Math.cos(angle)*width,p.y-Math.sin(angle)*width);}
 ctx.closePath();ctx.fillStyle='#1b1714';ctx.globalAlpha=Math.max(0,1-(now-points[points.length-1].t)/220);ctx.fill();
 });
 document.addEventListener('pointerleave',()=>{dot.style.opacity='0';bubble.style.opacity='0';});
}

/* ------------------------------------------------------------ wiring */

const RULES: [string, (el: HTMLElement) => void][] = [
  ['[data-roll]', roll],
  ['[data-scramble]', scramble],
  ['[data-jump]', jump],
  ['[data-underline]', underline],
  ['[data-magnet]', (el) => magnet(el)],
  ['[data-squish]', squish],
  ['[data-wobble]', wobble],
  ['[data-tilt]', (el) => tilt(el)],
  ['[data-preview]', preview],
];
/** sensible defaults for markup that didn't opt in */
const AUTO: [string, (el: HTMLElement) => void][] = [
  ['header a, header button, nav a, footer a, .menu a', (el) => { if (!el.querySelector('img, svg') && (el.textContent ?? '').trim().length < 28) roll(el); }],
  ['button, .pill, [class*="pill"], [class*="btn"]', (el) => { squish(el); magnet(el, 0.25); }],
  ['img[src*="sticker"], img[src*="style_"], [class*="sticker"]', wobble],
  ['[data-piece], [class*="card"]:not(.piece-card)', (el) => tilt(el, 6)],
  ['small, .label, [class*="label"], [class*="eyebrow"]', (el) => { if (el.closest('a, button')) scramble(el); }],
];

export function wire(root: ParentNode = document) {
  for (const [sel, fn] of RULES) root.querySelectorAll<HTMLElement>(sel).forEach((el) => fn(el));
  for (const [sel, fn] of AUTO) root.querySelectorAll<HTMLElement>(sel).forEach((el) => { if (!done.has(el)) fn(el); });
}

/** wire everything now, and anything the site adds later */
export function initInteract() {
  sparkCursor();
  wire();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; wire(); });
  }).observe(document.body, { childList: true, subtree: true });
}
