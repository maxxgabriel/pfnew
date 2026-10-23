import gsap from 'gsap';
import './footer.css';
import manifest from '../assets/sketch/manifest.json';
import { artUrl, image } from './art';
import { rollWord } from './slices';

/*
 * FOOTER (#6) — the reference's curtain (docs/study/MATVOYCE_FRAMES.md "Footer",
 * MATVOYCE_PHONE.md §3g) in ink: the page lifts away and an ink-black footer is already
 * there underneath (a fixed layer clipped by the footer box). The fixed header fades out as
 * it arrives (0.25 s, in-out-quart). Centre: the MAX GABRIEL wordmark loops through his seven
 * letterings, each swap cut into four bands that change a beat apart (the slices.ts
 * signature). The boy runs along the bottom chasing the one red Spark, and tumbles round
 * at each edge. The curtain needs a screen at least ~560 px tall; below that (phone
 * landscape) the footer simply scrolls in.
 */
const STYLES = ['ink', 'pixel', 'water', 'clay', 'chalk', 'comic', 'hose'];
const MAIL = 'hello@example.com';
const BANDS = 4;
const MARKUP = `<div class="ft-in">
  <div class="ft-grid">
    <nav class="ft-col ft-explore" aria-label="Explore">
      <p class="ft-h">Explore</p>
      <ul>
        <li><a href="#work" data-go="#work"><span>Work</span></a></li>
        <li><a href="#make" data-go="#make"><span>What I do</span></a></li>
        <li><a href="#styles" data-go="#styles"><span>Styles</span></a></li>
        <li><a href="./film.html"><span>The film</span></a></li>
      </ul>
    </nav>
    <div class="ft-mark" role="img" aria-label="Max Gabriel">
      ${Array.from({ length: BANDS }, (_, i) => `<div class="ft-band" style="--i:${i}"><img alt="" draggable="false" /></div>`).join('')}
    </div>
    <nav class="ft-col ft-follow" aria-label="Follow">
      <p class="ft-h">Follow</p>
      <ul>
        <li><a href="#"><span>Instagram</span></a></li>
        <li><a href="#"><span>Behance</span></a></li>
        <li><a href="#"><span>LinkedIn</span></a></li>
        <li><a href="#"><span>GitHub</span></a></li>
      </ul>
    </nav>
    <div class="ft-mail"><p class="ft-h">Say hi</p><a href="mailto:${MAIL}"><span>${MAIL}</span></a></div>
  </div>
  <div class="ft-base">
    <p class="ft-copy"><span>© Max Gabriel 2026</span></p>
    <button class="ft-top" type="button"><span class="ft-top-w">Back to top</span> <i>↑</i></button>
  </div>
  <canvas class="ft-run" aria-hidden="true"></canvas>
</div>`;

type Meta = { w: number; h: number; foot: number[]; top: number };
const meta = manifest as Record<string, Meta>;
const RUN = Array.from({ length: 8 }, (_, i) => `run8_${i}`);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = gsap.utils.random;

export function initFooter() {
  const root = document.querySelector<HTMLElement>('#footer');
  if (!root) return;
  root.innerHTML = MARKUP;
  const grid = root.querySelector<HTMLElement>('.ft-grid')!;
  const imgs = [...root.querySelectorAll<HTMLImageElement>('.ft-band img')];
  const canvas = root.querySelector<HTMLCanvasElement>('.ft-run')!;
  const hd = document.querySelector<HTMLElement>('#hd');

  // ---- the wordmark: seven letterings, banded swap every ~1.2 s
  const srcs = STYLES.map((s) => artUrl(`logo_${s}`));
  srcs.forEach((s) => { const im = new Image(); im.src = s; });
  let cur = 0;
  imgs.forEach((im) => { im.src = srcs[0]; });
  const swap = () => {
    cur = (cur + 1) % srcs.length;
    const dir = Math.random() < 0.5 ? -1 : 1;
    imgs.forEach((im, i) => {
      const at = i * 0.045 + rand(0, 0.07);
      gsap.timeline({ delay: at })
        .to(im, { x: dir * (i % 2 ? -1 : 1) * 14, scaleY: 1.12, duration: 0.07, ease: 'power2.in' })
        .add(() => { im.src = srcs[cur]; })
        .fromTo(im, { x: -dir * (i % 2 ? -1 : 1) * 22, scaleY: 0.9 }, { x: 0, scaleY: 1, duration: 0.32, ease: 'power4.out' });
    });
  };

  // ---- links: lines rise through their masks once the footer shows
  const rises = [...root.querySelectorAll<HTMLElement>('.ft-col a span, .ft-h, .ft-mail a span, .ft-copy span, .ft-top')];
  gsap.set(rises, { yPercent: 115 });
  gsap.set(imgs, { yPercent: 105 });
  let shown = false, loop: gsap.core.Tween | null = null;
  const show = () => {
    if (shown) return;
    shown = true;
    const tl = gsap.timeline();
    // the wordmark builds in bands from below, out of sync
    imgs.forEach((im, i) => tl.to(im, { yPercent: 0, duration: rand(0.6, 0.85), ease: 'expo.out' }, 0.05 + i * 0.05 + rand(0, 0.12)));
    tl.to(rises, { yPercent: 0, duration: 0.7, ease: 'power4.out', stagger: 0.05 }, 0.15);
    if (reduce) tl.progress(1);
    else loop = gsap.delayedCall(1.6, function again() { swap(); loop = gsap.delayedCall(1.2, again).paused(!live); });
  };

  // the header leaves as the footer arrives (and comes back when it goes). Observers, not
  // scroll positions: the page above changes height (pins, the opening) after load.
  let arrivedFt = false;
  const fadeHd = (on: boolean) => {
    if (on === arrivedFt) return;
    arrivedFt = on;
    if (on) show();
    if (hd) gsap.to(hd, { autoAlpha: on ? 0 : 1, duration: 0.25, ease: 'power4.inOut', overwrite: 'auto' });
  };
  new IntersectionObserver(([e]) => fadeHd(e.isIntersecting), { rootMargin: '0px 0px -40% 0px' }).observe(root);
  // ---- links roll on hover; Back to top rolls and goes
  const top = root.querySelector<HTMLButtonElement>('.ft-top')!;
  const topW = root.querySelector<HTMLElement>('.ft-top-w')!;
  const roll = (el: HTMLElement) => {
    if (el.dataset.rolling) return;
    const word = el.textContent ?? '';
    el.dataset.rolling = '1';
    rollWord(el, word, 0.42).eventCallback('onComplete', () => { el.textContent = word; el.style.display = ''; delete el.dataset.rolling; });
  };
  root.querySelectorAll<HTMLAnchorElement>('.ft-col a, .ft-mail a').forEach((a) => {
    const w = a.querySelector<HTMLElement>('span')!;
    a.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') roll(w); });
    a.addEventListener('pointerdown', () => { gsap.fromTo(a, { scale: 0.94 }, { scale: 1, duration: 0.35, ease: 'power4.out' }); });
    const go = a.dataset.go;
    if (go) a.addEventListener('click', (e) => { e.preventDefault(); const h = home(); if (h) h.go(go); else document.querySelector(go)?.scrollIntoView({ behavior: 'smooth' }); });
  });
  top.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') roll(topW); });
  top.addEventListener('click', () => {
    roll(topW);
    gsap.fromTo(top, { scale: 0.92 }, { scale: 1, duration: 0.4, ease: 'power4.out' });
    const h = home();
    if (h) h.go(0); else scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---- the boy runs along the bottom, chasing the Spark; at an edge he tumbles round
  const ctx = canvas.getContext('2d')!;
  RUN.forEach((k) => image(k));
  image('leap_2');
  const outlined = new Map<string, HTMLCanvasElement>();
  /** his ink would vanish on ink: each frame gets a paper sticker edge, made once */
  const sticker = (key: string) => {
    let c = outlined.get(key);
    if (c) return c;
    const im = image(key), m = meta[key];
    if (!m || !im.complete || !im.naturalWidth) return null;
    const pad = 14;
    c = document.createElement('canvas');
    c.width = m.w + pad * 2; c.height = m.h + pad * 2;
    const g = c.getContext('2d')!;
    for (let a = 0; a < 16; a++) g.drawImage(im, pad + Math.cos((a / 16) * Math.PI * 2) * 9, pad + Math.sin((a / 16) * Math.PI * 2) * 9);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#efe9dc'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(im, pad, pad);
    outlined.set(key, c);
    return c;
  };
  let W = 0, H = 0, dpr = 1;
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  };
  size();
  addEventListener('resize', size);
  new ResizeObserver(size).observe(canvas);
  const st = { x: 60, dir: 1, y: 0, rot: 0, flipping: false, t: 0 };
  let live = false, last = 0;
  const tumble = () => {
    st.flipping = true;
    const hop = H * 0.42;
    gsap.timeline({ onComplete: () => { st.flipping = false; } })
      .to(st, { y: -hop, duration: 0.28, ease: 'power2.out' })
      .to(st, { rot: -st.dir * Math.PI * 2, duration: 0.5, ease: 'power2.inOut' }, 0)
      .add(() => { st.dir *= -1; }, 0.25)
      .to(st, { y: 0, duration: 0.24, ease: 'power2.in' }, 0.28)
      .set(st, { rot: 0 });
  };
  let lastLift = -1;
  const frame = () => {
    const now = performance.now();
    if (!live) return;
    // under the lifting page the footer is in shadow: it brightens and settles as it's uncovered
    const box = root.getBoundingClientRect();
    const lift = gsap.utils.clamp(0, 1, (innerHeight - box.top) / (innerHeight * 0.85));
    if (Math.abs(lift - lastLift) > 0.001) {
      lastLift = lift;
      const e = 1 - (1 - lift) ** 2;
      gsap.set(grid, { scale: 0.94 + 0.06 * e, yPercent: 6 * (1 - e), opacity: 0.3 + 0.7 * e });
    }
    if (!W) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const bh = H * 0.7;                         // his height in the lane
    const speed = Math.max(130, W * 0.16) * (st.flipping ? 0.55 : 1);
    if (!reduce) st.x += st.dir * speed * dt;
    const margin = bh * 0.55;
    if (!st.flipping && ((st.dir > 0 && st.x > W - margin) || (st.dir < 0 && st.x < margin))) tumble();
    st.x = gsap.utils.clamp(margin * 0.6, W - margin * 0.6, st.x);
    st.t += dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // the Spark: one red light ahead of him, bobbing at head height
    const ground = H - 6;
    const sx = gsap.utils.clamp(10, W - 10, st.x + st.dir * bh * 0.95);
    const sy = ground - bh * 0.78 + Math.sin(st.t * 5.2) * bh * 0.08;
    const r = Math.max(5, bh * 0.07);
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 4);
    glow.addColorStop(0, 'rgba(232,67,42,.55)'); glow.addColorStop(1, 'rgba(232,67,42,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, r * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8432a'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    // the boy
    const key = st.flipping ? 'leap_2' : RUN[Math.floor(st.t * 12) % RUN.length];
    const c = sticker(key), m = meta[key];
    if (!c || !m) return;
    const ref = st.flipping ? m : meta.run8_0;
    const s = (bh * (st.flipping ? 0.9 : 1)) / (ref.foot[1] - ref.top);
    ctx.save();
    if (st.flipping) {
      // tumbling: spin round the middle of his body
      ctx.translate(st.x, ground + st.y - bh / 2);
      ctx.rotate(st.rot);
      ctx.scale(st.dir * s, s);
      ctx.drawImage(c, -m.foot[0] - 14, -(m.foot[1] + m.top) / 2 - 14);
    } else {
      ctx.translate(st.x, ground);
      ctx.scale(st.dir * s, s);
      ctx.drawImage(c, -m.foot[0] - 14, -m.foot[1] - 14);
    }
    ctx.restore();
    // a soft ink shadow under him
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(st.x, ground + 2, bh * 0.22 * (1 + st.y / (H * 2)), 3, 0, 0, Math.PI * 2); ctx.fill();
  };
  gsap.ticker.add(frame);
  new IntersectionObserver(([e]) => { live = e.isIntersecting; last = 0; loop?.paused(!live); }).observe(root);
}

function home() {
  return (window as unknown as { __home?: { go: (t: string | number) => void } }).__home;
}
