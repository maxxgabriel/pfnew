import gsap from 'gsap';
import './contact.css';
import manifest from '../assets/sketch/manifest.json';
import { image } from './art';
import { bandText, bandsIn, scramble } from './slices';

/*
 * CONTACT (#5) — the reference's big striped pill (docs/study/MATVOYCE_PHONE.md §3f), in our
 * ink: a huge paper pill with running diagonal ink stripes, SAY HI in marker, a thick ink
 * border and a hard offset shadow. It pops in tilted, the word arrives in bands, the boy
 * drops onto its top edge and waves, and a red hanko stamps on once. It breathes a little
 * with the scroll. Hover or press: the pill squashes, the stripes race and the boy jumps.
 * (The manifest's wave_* are painted sea waves, so his wave is bye_0/bye_1.)
 */
const MAIL = 'hello@example.com';
const MARKUP = `<div class="ct">
  <p class="ct-line"><span class="ct-mask"><span class="ct-txt">Always open for new projects and collaborations</span></span></p>
  <div class="ct-stage">
    <a class="ct-pill" href="mailto:${MAIL}" aria-label="Say hi: email ${MAIL}">
      <canvas class="ct-boy" aria-hidden="true"></canvas>
      <span class="ct-face" aria-hidden="true">
        <span class="ct-stripes"></span>
        <span class="ct-word">SAY HI</span>
      </span>
      <span class="ct-seal" aria-hidden="true"><b>M</b><b>G</b></span>
    </a>
  </div>
  <p class="ct-mail"><a href="mailto:${MAIL}">${MAIL}</a></p>
</div>`;

type Meta = { w: number; h: number; foot: number[]; top: number };
const meta = manifest as Record<string, Meta>;
const WAVE = ['bye_0', 'bye_0', 'bye_1', 'bye_1'];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initContact() {
  const root = document.querySelector<HTMLElement>('#contact');
  if (!root) return;
  root.innerHTML = MARKUP;
  const pill = root.querySelector<HTMLElement>('.ct-pill')!;
  const face = root.querySelector<HTMLElement>('.ct-face')!;
  const stage = root.querySelector<HTMLElement>('.ct-stage')!;
  const stripes = root.querySelector<HTMLElement>('.ct-stripes')!;
  const seal = root.querySelector<HTMLElement>('.ct-seal')!;
  const line = root.querySelector<HTMLElement>('.ct-txt')!;
  const mail = root.querySelector<HTMLElement>('.ct-mail a')!;
  const canvas = root.querySelector<HTMLCanvasElement>('.ct-boy')!;
  const ctx = canvas.getContext('2d')!;
  const word = bandText(root.querySelector<HTMLElement>('.ct-word')!);
  ['bye_0', 'bye_1', 'leap_0', 'leap_2', 'leap_3'].forEach((k) => image(k));

  // running stripes: one tile wide, looped on the compositor; hover makes them race
  const tile = () => parseFloat(getComputedStyle(stripes).getPropertyValue('--tile')) || 48;
  const run = gsap.to(stripes, { x: tile, duration: 1.4, ease: 'none', repeat: -1 });

  // ---- the boy, drawn on a canvas so frames of different sizes share one foot point
  const boy = { y: 0, sx: 1, sy: 1, rot: 0, alpha: 0, pose: '' as string };
  let H = 0, W = 0, dpr = 1;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  function draw(now: number) {
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (boy.alpha <= 0) return;
    const key = boy.pose || WAVE[Math.floor(now / 125) % WAVE.length];
    const im = image(key), m = meta[key];
    if (!m || !im.complete || !im.naturalWidth) return;
    const ref = meta.bye_0;
    const s = (H * 0.8) / (ref.foot[1] - ref.top);   // one scale for every frame
    ctx.globalAlpha = boy.alpha;
    ctx.translate(W / 2, H + boy.y);
    ctx.rotate(boy.rot);
    ctx.scale(s * boy.sx, s * boy.sy);
    ctx.drawImage(im, -m.foot[0], -m.foot[1]);
  }
  size();
  new ResizeObserver(size).observe(canvas);
  let live = false;
  const tick = () => { if (live) draw(performance.now()); };
  gsap.ticker.add(tick);
  new IntersectionObserver(([e]) => { live = e.isIntersecting; if (!live) ctx.clearRect(0, 0, canvas.width, canvas.height); }).observe(root);

  // ---- arrival (once): pill pops, word bands in, the boy drops on, the hanko stamps
  gsap.set(pill, { scale: 0.35, rotate: -14, autoAlpha: 0 });
  gsap.set(word.flat(), { yPercent: 115 });
  gsap.set(seal, { autoAlpha: 0, scale: 3, rotate: 40 });
  gsap.set(line, { yPercent: 110 });
  mail.style.visibility = 'hidden';
  let arrived = false;
  const arrive = () => {
    if (arrived) return;
    arrived = true;
    const tl = gsap.timeline();
    tl.to(line, { yPercent: 0, duration: 0.7, ease: 'power4.out' }, 0)
      .to(pill, { autoAlpha: 1, duration: 0.15, ease: 'none' }, 0.05)
      .to(pill, { scale: 1, rotate: -2.5, duration: 0.85, ease: 'back.out(1.9)' }, 0.05)
      .add(bandsIn(word, { stagger: 0.05, jitter: 0.2 }), 0.3)
      // the boy falls in from above the pill and lands with a squash
      .set(boy, { alpha: 1, pose: 'leap_3', y: -innerHeight * 0.45, rot: -0.2 }, 0.65)
      .to(boy, { y: 0, rot: 0, duration: 0.45, ease: 'power2.in' }, 0.65)
      .set(boy, { pose: 'leap_0' }, 1.1)
      .fromTo(boy, { sx: 1.18, sy: 0.8 }, { sx: 1, sy: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)' }, 1.1)
      .fromTo(face, { scaleY: 0.92, scaleX: 1.03 }, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }, 1.1)
      .set(boy, { pose: '' }, 1.32)
      // the seal: drops hard onto the corner, the pill takes the hit
      .to(seal, { autoAlpha: 1, scale: 1, rotate: 9, duration: 0.22, ease: 'power4.in' }, 1.5)
      .fromTo(pill, { y: 0 }, { y: 6, duration: 0.06, yoyo: true, repeat: 1, ease: 'power2.out' }, 1.72)
      .fromTo(seal, { '--ring': 0 }, { '--ring': 1, duration: 0.5, ease: 'power4.out' }, 1.72)
      .add(() => { scramble(mail, 0.5); }, 1.4);
    if (reduce) tl.progress(1);
  };
  // observers, not ScrollTrigger positions: the page above changes height after load
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { arrive(); io.disconnect(); } }, { rootMargin: '0px 0px -18% 0px' });
  io.observe(stage);

  // ---- breathes with the scroll (on the stage, so it never fights the pop or the squash)
  let lastK = -1;
  gsap.ticker.add(() => {
    if (!live) return;
    const r = stage.getBoundingClientRect();
    const k = gsap.utils.clamp(0, 1, (innerHeight - r.top) / (innerHeight + r.height));
    if (Math.abs(k - lastK) < 0.0005) return;
    lastK = k;
    gsap.set(stage, { scale: 0.9 + 0.15 * k });
  });

  // ---- hover / press: squash, race, jump
  let jumping = false;
  const jump = () => {
    if (!arrived || jumping) return;
    jumping = true;
    const h = H * 0.55;
    gsap.timeline({ onComplete: () => { jumping = false; } })
      .set(boy, { pose: 'leap_0' })
      .to(boy, { sx: 1.15, sy: 0.82, duration: 0.08, ease: 'power2.out' })
      .set(boy, { pose: 'leap_2' })
      .to(boy, { y: -h, sx: 0.92, sy: 1.1, duration: 0.3, ease: 'power3.out' })
      .to(boy, { sx: 1, sy: 1, duration: 0.2 }, '<0.1')
      .to(boy, { y: 0, duration: 0.28, ease: 'power2.in' })
      .set(boy, { pose: 'leap_0' })
      .to(boy, { sx: 1.16, sy: 0.84, duration: 0.06 })
      .to(boy, { sx: 1, sy: 1, duration: 0.35, ease: 'elastic.out(1, 0.45)' })
      .set(boy, { pose: '' }, '-=0.2');
  };
  let hover = false, pressed = false;
  const squash = (amt: number) => {
    gsap.to(face, { scaleY: 1 - amt, scaleX: 1 + amt * 0.35, duration: amt ? 0.12 : 0.6, ease: amt ? 'power3.out' : 'elastic.out(1, 0.4)', overwrite: 'auto' });
    gsap.to(run, { timeScale: amt ? 4 : 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
  };
  pill.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hover = true; squash(0.06); jump(); } });
  pill.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover = false; if (!pressed) squash(0); } });
  pill.addEventListener('pointerdown', () => { pressed = true; squash(0.12); jump(); });
  const release = () => { if (!pressed) return; pressed = false; squash(hover ? 0.06 : 0); };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  pill.addEventListener('focus', () => { if (!pressed) { squash(0.06); jump(); } });
  pill.addEventListener('blur', () => squash(0));
}
