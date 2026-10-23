import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './hero.css';
import manifest from '../assets/sketch/manifest.json';
import { artUrl, image } from './art';
import { bandText, scramble, slot } from './slices';
gsap.registerPlugin(ScrollTrigger);

/*
 * HERO — the opening (docs/study/MATVOYCE_FRAMES.md, in our ink): silence → the tagline
 * scrambles in → the counter rises from under the screen edge, stretched → it counts in
 * steps, every digit rolling in bands → 100 sinks away → MAX / GABRIEL assemble in bands →
 * the REEL (a tilted ink-framed window) scales in between the lines, the boy running in it →
 * the camera pushes → he LEAPS OUT of the reel and lands on the X → the red Spark lands as
 * the dot → the scroll chip. Scrolling is locked until he has landed.
 * After: the reel plays his style twins (pixel, watercolour, comic, clay, rubber hose) with a
 * banded cut between them. Desktop (fine pointer): the hero pins and the reel grows to fill
 * the screen while the name pushes off the edges; scrolling steps the showreel. Phones: no
 * pin, the reel parallaxes. Idle: he breathes, shifts how he sits; a tap makes him hop.
 */
const MARKUP = `<h1 class="sr">Max Gabriel</h1>
  <div class="counter" aria-hidden="true"></div>
  <div class="reel" aria-hidden="true"><canvas class="reel-cv"></canvas><span class="reel-tag"><i></i><b>PLAYING: INK</b></span></div>
  <div class="name" aria-hidden="true">
    <div class="line line-max"><span class="word">MAX</span></div>
    <i class="spark"></i>
    <div class="line line-gab"><span class="word">GABRIEL</span></div>
  </div>
  <canvas class="boy" role="button" tabindex="-1" aria-label="The ink boy. Tap him."></canvas>
  <a class="chip" href="#work" aria-label="Scroll to the work"><span class="chip-run">SCROLL ——— SCROLL ——— SCROLL ——— SCROLL ——— </span></a>`;
const rand = gsap.utils.random;
const clamp01 = gsap.utils.clamp(0, 1);
type Meta = { w: number; h: number; foot: number[]; top: number; face: number };
const META = manifest as unknown as Record<string, Meta>;
const frames = (k: string, idx: number[]) => idx.map((i) => `${k}_${i}`);
const n = (c: number) => Array.from({ length: c }, (_, i) => i);

/** draw a drawing with its foot at (x, y); the size comes from a face size, so a sequence keeps one scale */
function drawPose(ctx: CanvasRenderingContext2D, key: string, x: number, y: number, face: number, faceRef?: number, sy = 1) {
  const im = image(key), m = META[key];
  if (!m || !im.complete || !im.naturalWidth) return;
  const s = face / (faceRef ?? m.face);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s * sy); ctx.drawImage(im, -m.foot[0], -m.foot[1]); ctx.restore();
}

/* ---------- the reel: one canvas, a scene = painted layers + one of his cycles ---------- */
type Layer = { key: string; speed?: number; hf?: number; bottom?: number; fit?: 'cover' | 'contain'; spot?: [number, number, number] };
type Scene = { name: string; bg: string; layers: Layer[]; front?: Layer[]; frames: string[]; fps: number; x: number; foot: number; face: number; bob?: number; pixel?: boolean; ping?: boolean };
const INK: Scene = { name: 'INK', bg: '#efe9dc', layers: [{ key: 'ink_far', speed: 0.05, hf: 0.86, bottom: 0.8 }, { key: 'ink_mid', speed: 0.2, hf: 0.66, bottom: 1.06 }], frames: frames('run8', n(8)), fps: 12, x: 0.4, foot: 0.94, face: 0.2 };
const SHOW: Scene[] = [
  { name: 'PIXEL', bg: '#7cc6f6', layers: [{ key: 'px_sky', fit: 'cover' }, { key: 'px_far', speed: 0.05, hf: 0.66, bottom: 0.84 }, { key: 'px_mid', speed: 0.2, hf: 0.56, bottom: 1.02 }], frames: frames('pixel-run8', n(8)), fps: 12, x: 0.4, foot: 0.95, face: 0.18, pixel: true },
  { name: 'WATERCOLOUR', bg: '#123', layers: [{ key: 'wc_sky', fit: 'cover' }, { key: 'wc_sea_far', speed: 0.06, hf: 0.6, bottom: 1.0 }], front: [{ key: 'wc_sea_near', speed: 0.34, hf: 0.36, bottom: 1.14 }], frames: frames('water-surf', [0, 1, 2]), fps: 5, ping: true, x: 0.46, foot: 0.84, face: 0.2, bob: 0.025 },
  { name: 'COMIC', bg: '#0b1630', layers: [{ key: 'cm_space', fit: 'cover' }], frames: frames('comic-saber', [1, 2, 3, 4, 5]), fps: 9, ping: true, x: 0.5, foot: 0.95, face: 0.22 },
  { name: 'CLAY', bg: '#2a1f1a', layers: [{ key: 'cl_theatre', fit: 'contain' }], frames: frames('clay-ride', n(4)), fps: 3, x: 0.5, foot: 0.85, face: 0.14 },
  { name: 'RUBBER HOSE', bg: '#f39a4a', layers: [{ key: 'hs_sky', fit: 'cover' }, { key: 'hs_sun', spot: [0.78, 0.32, 0.5] }, { key: 'hs_cloud_far', speed: 0.06, hf: 0.42, bottom: 0.8 }], front: [{ key: 'hs_cloud_near', speed: 0.26, hf: 0.42, bottom: 1.16 }], frames: frames('hose-broom', [0, 1, 2, 3, 5]), fps: 10, x: 0.46, foot: 0.7, face: 0.19, bob: 0.03 },
];
const SCENES = [INK, ...SHOW];

function drawLayer(ctx: CanvasRenderingContext2D, L: Layer, W: number, H: number, t: number) {
  const im = image(L.key);
  if (!im.complete || !im.naturalWidth) return;
  const nw = im.naturalWidth, nh = im.naturalHeight;
  if (L.fit) {
    const s = (L.fit === 'cover' ? Math.max(W / nw, H / nh) * 1.08 : Math.min(W / nw, H / nh) * 0.98);
    const iw = nw * s, ih = nh * s;
    ctx.drawImage(im, (W - iw) / 2 + (L.fit === 'cover' ? Math.sin(t * 0.25) * W * 0.03 : 0), (H - ih) / 2, iw, ih);
    return;
  }
  if (L.spot) { const sz = H * L.spot[2]; ctx.drawImage(im, W * L.spot[0] - sz / 2, H * L.spot[1] - sz / 2 + Math.sin(t * 0.8) * H * 0.01, sz, sz); return; }
  // a strip that scrolls left; every other tile is mirrored so the seams always meet
  const ih = H * (L.hf ?? 1), iw = (ih * nw) / nh;
  const off = t * (L.speed ?? 0) * H;
  let k = Math.floor(off / iw);
  const y = H * (L.bottom ?? 1) - ih;
  for (let x = k * iw - off; x < W; x += iw, k++) {
    if (k % 2) { ctx.save(); ctx.translate(x + iw, y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, iw + 1, ih); ctx.restore(); }
    else ctx.drawImage(im, x, y, iw + 1, ih);
  }
}

function drawScene(ctx: CanvasRenderingContext2D, sc: Scene, W: number, H: number, t: number, boy: boolean) {
  ctx.imageSmoothingEnabled = !sc.pixel;
  ctx.fillStyle = sc.bg; ctx.fillRect(0, 0, W, H);
  for (const L of sc.layers) drawLayer(ctx, L, W, H, t);
  if (boy) {
    const c = sc.frames.length;
    let f = Math.floor(t * sc.fps);
    f = sc.ping && c > 1 ? (f % (2 * c - 2) < c ? f % (2 * c - 2) : 2 * c - 2 - (f % (2 * c - 2))) : f % c;
    const bob = (sc.bob ?? 0) * H * Math.sin(t * 2.6);
    drawPose(ctx, sc.frames[f], W * sc.x, H * sc.foot + bob, H * sc.face, META[sc.frames[0]].face);
  }
  ctx.imageSmoothingEnabled = true;
  for (const L of sc.front ?? []) drawLayer(ctx, L, W, H, t);
}

export async function initHero(o: { lock: (on: boolean) => void }) {
  const hero = document.querySelector<HTMLElement>('#hero')!;
  hero.innerHTML = MARKUP;
  const touch = matchMedia('(pointer: coarse)').matches;
  const narrow = () => innerWidth <= 700;
  const counter = hero.querySelector<HTMLElement>('.counter')!;
  const slots = [slot(), slot(), slot()];
  slots.forEach((s) => counter.appendChild(s.el));
  const setDigits = (value: number, tl: gsap.core.Timeline, at: number) => {
    const d = String(value).padStart(3, '0');
    slots.forEach((s, i) => s.strips.forEach((strip, b) => {
      // every band rolls to the digit with its own small lag: the digit shears, then snaps clean
      tl.to(strip, { yPercent: -Number(d[i]) * 10, duration: 0.42, ease: 'power3.inOut' }, at + i * 0.03 + b * rand(0.01, 0.05));
    }));
  };

  const max = bandText(hero.querySelector<HTMLElement>('.line-max .word')!);
  const gab = bandText(hero.querySelector<HTMLElement>('.line-gab .word')!);
  const allBands = [...max, ...gab];
  const lineMax = hero.querySelector<HTMLElement>('.line-max')!;
  const lineGab = hero.querySelector<HTMLElement>('.line-gab')!;
  const spark = hero.querySelector<HTMLElement>('.spark')!;
  const boy = hero.querySelector<HTMLCanvasElement>('.boy')!;
  const bctx = boy.getContext('2d')!;
  const reel = hero.querySelector<HTMLElement>('.reel')!;
  const rcv = reel.querySelector<HTMLCanvasElement>('.reel-cv')!;
  const rctx = rcv.getContext('2d')!;
  const tag = reel.querySelector<HTMLElement>('.reel-tag b')!;
  const chip = hero.querySelector<HTMLElement>('.chip')!;
  const menuWord = document.querySelector<HTMLElement>('.menu-word')!;

  // every drawing the hero uses starts loading now (ink first)
  for (const sc of SCENES) { sc.frames.forEach((k) => image(k)); sc.layers.forEach((l) => image(l.key)); sc.front?.forEach((l) => image(l.key)); }
  ['hero_1', 'leap_0', 'leap_1', 'leap_3', 'headout_0', 'idle_0', 'idle_1'].forEach((k) => image(k));

  /* ---------- the reel's place: between the lines (phone), the open space right of MAX (wider) ---------- */
  function reelBox() {
    const W = innerWidth, H = hero.clientHeight;
    const mB = lineMax.offsetTop + lineMax.offsetHeight, gT = lineGab.offsetTop;
    if (narrow()) {
      const w = W * 0.8, h = Math.min(H * 0.22, (gT - mB) * 0.82);
      return { l: (W - w) / 2, t: (mB + gT) / 2 - h / 2, w, h };
    }
    const mR = lineMax.offsetLeft + lineMax.offsetWidth, space = W - mR;
    const w = Math.min(W * 0.36, space - W * 0.08), h = Math.min(H * 0.3, w * 0.62);
    const cx = mR + space * 0.47, cy = lineMax.offsetTop + lineMax.offsetHeight * 0.58;
    return { l: cx - w / 2, t: cy - h / 2, w, h };
  }
  const placeReel = () => { const b = reelBox(); gsap.set(reel, { left: b.l, top: b.t, width: b.w, height: b.h }); };

  /* ---------- the reel's clock and its banded cuts ---------- */
  const R = { inkBoy: true, shown: 0, want: 0, cut: null as null | { t0: number; from: number; to: number }, live: true };
  const CUT = 0.5;
  function cutTo(i: number) {
    R.want = i;
    const now = gsap.ticker.time;
    if (R.cut && (now - R.cut.t0) / CUT < 0.5) { R.cut.to = i; return; }
    if (i === R.shown && !R.cut) return;
    R.cut = { t0: now, from: R.shown, to: i };
  }
  function drawReel() {
    const hr = hero.getBoundingClientRect();
    R.live = hr.bottom > 0 && hr.top < innerHeight;
    if (!R.live) return;
    const W = reel.clientWidth, H = reel.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(3.2e6 / (W * H)));
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (rcv.width !== cw || rcv.height !== ch) { rcv.width = cw; rcv.height = ch; }
    const t = gsap.ticker.time;
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let k = -1;
    if (R.cut) {
      k = (t - R.cut.t0) / CUT;
      if (k >= 0.5 && R.shown !== R.cut.to) { R.shown = R.cut.to; tag.textContent = `PLAYING: ${SCENES[R.shown].name}`; void scramble(tag, 0.3); }
      if (k >= 1) { R.cut = null; k = -1; if (R.want !== R.shown) cutTo(R.want); }
    }
    const sc = SCENES[R.shown];
    drawScene(rctx, sc, W, H, t, sc !== INK || R.inkBoy);
    if (k >= 0) {
      // the cut: five horizontal bands of ink (one red) wipe across, out of sync, then off the other side
      const B = 5, bh = H / B;
      for (let i = 0; i < B; i++) {
        const lag = (i % 2 ? 0.12 : 0) + i * 0.04;
        rctx.fillStyle = i === 2 ? '#e8432a' : '#1b1714';
        if (k < 0.5) { const p = gsap.parseEase('power4.in')(clamp01((k / 0.5 - lag) / 0.7)); rctx.fillRect(0, i * bh - 0.5, W * p, bh + 1); }
        else { const p = gsap.parseEase('power4.out')(clamp01(((k - 0.5) / 0.5 - lag) / 0.7)); rctx.fillRect(W * p, i * bh - 0.5, W * (1 - p), bh + 1); }
      }
    }
  }
  gsap.ticker.add(drawReel);

  /* ---------- the boy on the page: a canvas that draws one pose, foot at the bottom centre ---------- */
  const B = { key: 'leap_0', alive: false, busy: false, w: 0, h: 0, bw: 150, x: 0, y: 0 };
  function sizeBoy() {
    B.bw = narrow() ? gsap.utils.clamp(130, 170, innerWidth * 0.36) : Math.min(gsap.utils.clamp(140, 240, innerWidth * 0.13), innerHeight * 0.3);
    B.w = B.bw * 1.4; B.h = B.bw * 1.5;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    boy.width = Math.round(B.w * dpr); boy.height = Math.round(B.h * dpr);
    boy.style.width = `${B.w}px`; boy.style.height = `${B.h}px`;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeBoy();
  const putBoy = (x: number, y: number) => { B.x = x; B.y = y; gsap.set(boy, { left: x - B.w / 2, top: y - B.h }); };
  function drawBoy() {
    bctx.clearRect(0, 0, B.w, B.h);
    const breath = B.alive && !B.busy ? 1 + 0.028 * Math.sin(gsap.ticker.time * 2.4) : 1;
    drawPose(bctx, B.key, B.w / 2, B.h - 2, B.bw * 0.42, undefined, breath);
  }
  gsap.ticker.add(drawBoy);
  /** the foot point on the X of MAX (hero coordinates) */
  function boySeat() {
    const x = max[2][0].parentElement!.getBoundingClientRect();
    const h = hero.getBoundingClientRect();
    return { x: x.left + x.width * 0.5 - h.left, y: x.top - h.top + x.height * 0.12 + B.bw * 0.28 };
  }
  /** where the running boy's feet are on screen right now (the reel is scaled, tilted and pushed) */
  function reelFoot() {
    const r = reel.getBoundingClientRect(), h = hero.getBoundingClientRect();
    const s = Number(gsap.getProperty(reel, 'scale')), a = (Number(gsap.getProperty(reel, 'rotation')) * Math.PI) / 180;
    const W = reel.clientWidth, H = reel.clientHeight;
    const dx = (W * INK.x - W / 2) * s, dy = (H * INK.foot - H / 2) * s;
    return { x: r.left + r.width / 2 + dx * Math.cos(a) - dy * Math.sin(a) - h.left, y: r.top + r.height / 2 + dx * Math.sin(a) + dy * Math.cos(a) - h.top, face: H * INK.face * s };
  }

  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => { el.style.visibility = 'hidden'; });
  gsap.set(allBands.flat(), { yPercent: 115 });
  gsap.set(counter, { yPercent: 100 });
  gsap.set(menuWord, { clipPath: 'inset(0 100% 0 0)' });
  // before the push the two lines sit smaller and closer to the centre
  gsap.set(lineMax, { scale: 0.72, x: () => innerWidth * 0.12, y: () => innerHeight * 0.1, transformOrigin: '0% 0%' });
  gsap.set(lineGab, { scale: 0.72, x: () => -innerWidth * 0.1, y: () => -innerHeight * 0.08, transformOrigin: '100% 100%' });
  placeReel();
  // the reel waits closed; before the push it sits a little smaller and nearer the centre, like the name
  const pre = () => { const b = reelBox(); return narrow() ? { x: 0, y: 0 } : { x: (innerWidth / 2 - (b.l + b.w / 2)) * 0.3, y: (innerHeight / 2 - (b.t + b.h / 2)) * 0.3 }; };
  gsap.set(reel, { scale: 0, rotation: -2.5, x: () => pre().x, y: () => pre().y });

  o.lock(true);
  await document.fonts.ready;
  placeReel();
  const tl = gsap.timeline({ delay: 0.9 });

  // 1. the tagline and place scramble in
  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el, i) => tl.add(scramble(el, 0.45), 0.05 + i * 0.12));

  // 2. the counter rises from under the bottom edge, stretched tall, digits staggered
  slots.forEach((s, i) => tl.fromTo(s.el, { yPercent: 70, scaleY: 1.45, scaleX: 0.86 }, { yPercent: 0, scaleY: 1, scaleX: 1, duration: 0.95, ease: 'expo.out' }, 0.2 + i * 0.09));
  tl.to(counter, { yPercent: 0, duration: 0.01 }, 0.2);
  // the whole block drifts up a little while it counts: nothing is ever still
  tl.to(counter, { y: () => -innerHeight * 0.05, duration: 5.2, ease: 'none' }, 0.6);

  // 3. it counts in steps and holds: 000 → 035 → 070 → 100
  let at = 1.25;
  for (const v of [12, 23, 35]) { setDigits(v, tl, at); at += 0.16; }
  at += 0.75;
  for (const v of [48, 59, 70]) { setDigits(v, tl, at); at += 0.16; }
  at += 0.7;
  for (const v of [84, 92, 100]) { setDigits(v, tl, at); at += 0.16; }
  at += 0.55;

  // 4. 100 sinks out through the bottom edge in bands; the header's MENU wipes on in steps
  slots.forEach((s, i) => s.strips.forEach((strip, b) => tl.to(strip.parentElement, { yPercent: 130, duration: 0.5, ease: 'power3.in' }, at + i * 0.04 + b * 0.03)));
  tl.to(menuWord, { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'steps(5)' }, at + 0.1);

  // 5. MAX / GABRIEL assemble band by band, letters out of sync
  const start = at + 0.18;
  allBands.forEach((bands, li) => bands.forEach((b) => tl.to(b, { yPercent: 0, duration: rand(0.55, 0.85), ease: 'expo.out' }, start + li * 0.045 + rand(0, 0.32))));

  // 6. the reel scales in from nothing, already tilted, as the name settles; the boy is running in it
  tl.to(reel, { scale: 0.84, duration: 0.38, ease: 'power4.out' }, start + 0.85);
  at = start + 2.15;

  // 7. the camera push: the lines grow and spread to the edges, the reel with them
  tl.to([lineMax, lineGab], { scale: 1, x: 0, y: 0, duration: 0.85, ease: 'power3.inOut' }, at);
  tl.to(reel, { scale: 1, x: 0, y: 0, duration: 0.85, ease: 'power3.inOut' }, at);

  // 8. he leaps OUT of the reel: crouch where he ran, then an arc up onto the X of MAX
  const leapAt = at + 0.3, fly = 0.68;
  const arc = { p: 0, sx: 0, sy: 0, s0: 1 };
  tl.add(() => {
    const f = reelFoot();
    R.inkBoy = false;
    B.key = 'leap_0';
    arc.sx = f.x; arc.sy = f.y; arc.s0 = f.face / (B.bw * 0.42);
    putBoy(f.x, f.y);
    gsap.set(boy, { opacity: 1, scale: arc.s0, scaleY: arc.s0 * 0.86, rotation: 0 });
  }, leapAt);
  tl.add(() => { B.key = 'leap_1'; }, leapAt + 0.1);
  tl.fromTo(arc, { p: 0 }, {
    p: 1, duration: fly, ease: 'none',
    onUpdate: () => {
      const s = boySeat(), p = arc.p;
      // a short arc whose top keeps his head on screen
      const hop = Math.min(innerHeight * 0.07 + Math.max(0, arc.sy - s.y) * 0.12, Math.max(10, s.y - B.bw * 1.15 - 12));
      const px = gsap.parseEase('power1.inOut')(p);
      putBoy(arc.sx + (s.x - arc.sx) * px, arc.sy + (s.y - arc.sy) * p - hop * 4 * p * (1 - p));
    },
  }, leapAt + 0.1);
  tl.to(boy, { scale: 1, duration: fly * 0.9, ease: 'power2.out' }, leapAt + 0.1);
  tl.fromTo(boy, { rotation: 0 }, { rotation: -12, duration: fly * 0.5, ease: 'power1.out', yoyo: true, repeat: 1 }, leapAt + 0.1);
  // 9. he lands, squashes, and sits; the X dips under him
  const land = leapAt + 0.1 + fly;
  tl.add(() => { B.key = 'leap_0'; }, land - 0.02);
  tl.to(boy, { scaleY: 0.72, scaleX: 1.25, duration: 0.08, ease: 'power1.out' }, land);
  tl.add(() => { B.key = 'headout_0'; }, land + 0.16);
  tl.to(boy, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.35)' }, land + 0.08);
  tl.to(lineMax, { y: 10, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.out' }, land);
  // the red Spark lands as the dot
  tl.add(() => { const x = max[2][0].parentElement!.getBoundingClientRect(); const h = hero.getBoundingClientRect(); gsap.set(spark, { left: x.right + x.width * 0.04 - h.left, top: x.bottom - x.height * 0.42 - h.top }); }, land + 0.28);
  tl.fromTo(spark, { scale: 0, y: -innerHeight * 0.5 }, { scale: 1, y: 0, duration: 0.55, ease: 'bounce.out' }, land + 0.33);
  // the reel, now empty, keeps rolling for a beat, then cuts to his style twins
  tl.add(() => { cutTo(1); }, land + 0.5);

  // 10. the scroll chip pops in
  tl.fromTo(chip, { opacity: 0, scale: 0.6, rotate: -6 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.2)' }, land + 0.8);

  // the header logo arrives last; then the page is free to scroll
  tl.add(() => {
    const logo = document.querySelector<HTMLElement>('.hd-logo')!;
    logo.style.backgroundImage = `url(${artUrl('logo_ink')})`;
    gsap.to(logo, { opacity: 1, duration: 0.4 });
    B.alive = true;
    boy.style.pointerEvents = 'auto'; boy.tabIndex = 0;
    initScroll();
    o.lock(false);
    autoplay();
    idle();
  }, land + 0.8);

  /* ---------- the showreel's own clock: a new style twin every few seconds ---------- */
  let auto = 0, steps = 0;
  const showIdx = () => 1 + ((auto + steps) % SHOW.length);
  function autoplay() { gsap.delayedCall(2.8, () => { if (R.live) { auto++; cutTo(showIdx()); } autoplay(); }); }

  /* ---------- idle life: he breathes (in drawBoy), shifts how he sits now and then ---------- */
  function idle() {
    gsap.delayedCall(rand(3.2, 4.6), () => {
      if (!B.busy) {
        const k = Math.random() < 0.5 ? 'idle_0' : 'idle_1';
        B.key = k;
        gsap.fromTo(boy, { scaleY: 0.9, scaleX: 1.08 }, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
        gsap.delayedCall(rand(1.6, 2.4), () => { if (!B.busy && B.key === k) { B.key = 'headout_0'; gsap.fromTo(boy, { scaleY: 0.92, scaleX: 1.06 }, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }); } });
      }
      idle();
    });
  }
  /* a tap: squash on press, a happy hop on release */
  boy.addEventListener('pointerdown', () => { if (!B.alive || B.busy) return; gsap.to(boy, { scaleY: 0.8, scaleX: 1.18, duration: 0.08, ease: 'power1.out', overwrite: 'auto' }); });
  const hop = () => {
    if (!B.alive || B.busy) return;
    B.busy = true;
    const h = gsap.timeline({ onComplete: () => { B.busy = false; } });
    h.add(() => { B.key = 'leap_3'; });
    h.to(boy, { scaleY: 1.12, scaleX: 0.9, duration: 0.12, ease: 'power2.out' }, 0);
    h.to(boy, { y: -B.bw * 0.55, duration: 0.28, ease: 'power2.out' }, 0);
    h.to(boy, { y: 0, duration: 0.24, ease: 'power2.in' }, 0.28);
    h.to(boy, { scaleY: 1, scaleX: 1, duration: 0.2 }, 0.12);
    h.add(() => { B.key = 'headout_0'; }, 0.52);
    h.to(boy, { scaleY: 0.78, scaleX: 1.2, duration: 0.07, ease: 'power1.out' }, 0.52);
    h.to(boy, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' }, 0.59);
    h.to(lineMax, { y: 6, duration: 0.06, yoyo: true, repeat: 1 }, 0.52);
  };
  boy.addEventListener('click', hop);
  boy.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hop(); } });

  /* ---------- scroll ---------- */
  function initScroll() {
    // the chip leaves once you scroll
    ScrollTrigger.create({ start: 30, end: 'max', onToggle: (s) => gsap.to(chip, { autoAlpha: s.isActive ? 0 : 1, duration: 0.3, ease: 'power4.inOut' }) });
    if (touch) {
      // phones: no pin; the reel drifts up a little faster than the page and tilts further
      gsap.fromTo(reel, { yPercent: 0, rotation: -2.5 }, { yPercent: -40, rotation: -5, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      return;
    }
    // desktop: pin; the reel grows to fill the screen while MAX and GABRIEL push off the edges,
    // then each further stretch of scroll cuts to the next style twin; then it lets go
    const GROW = 0.3;
    const stl = gsap.timeline();
    stl.fromTo(reel, { left: () => reelBox().l, top: () => reelBox().t, width: () => reelBox().w, height: () => reelBox().h, rotation: -2.5 },
      { left: 0, top: 0, width: () => innerWidth, height: () => hero.clientHeight, rotation: 0, duration: GROW, ease: 'power2.inOut' }, 0);
    stl.fromTo([lineMax, boy, spark], { x: 0 }, { x: () => -(lineMax.offsetLeft + lineMax.offsetWidth + innerWidth * 0.12), duration: GROW, ease: 'power2.in' }, 0);
    stl.fromTo(lineMax, { scale: 1 }, { scale: 1.25, duration: GROW, ease: 'power2.in' }, 0);
    stl.fromTo(lineGab, { x: 0, scale: 1 }, { x: () => innerWidth - lineGab.offsetLeft + lineGab.offsetWidth * 0.3 + innerWidth * 0.05, scale: 1.25, duration: GROW, ease: 'power2.in' }, 0);
    stl.set({}, {}, 1);
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * 2}`, pin: true, scrub: 0.5, animation: stl,
      refreshPriority: 10, invalidateOnRefresh: true,
      onUpdate: (s) => {
        const p = s.progress, n2 = p < GROW + 0.04 ? 0 : Math.min(SHOW.length - 1, Math.floor(((p - GROW - 0.04) / (1 - GROW - 0.04)) * SHOW.length));
        if (n2 !== steps) { steps = n2; cutTo(showIdx()); }
      },
    });
  }
  addEventListener('resize', () => { sizeBoy(); if (scrollY < 4) placeReel(); if (B.alive && scrollY < 4) { const s = boySeat(); putBoy(s.x, s.y); } });
}
