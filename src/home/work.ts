import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './work.css';
import manifest from '../assets/sketch/manifest.json';
import { background, image, pose } from './art';
import { bandText, bandsIn, bandsOut, rollWord, scramble } from './slices';
gsap.registerPlugin(ScrollTrigger);

/*
 * WORK — the six pieces (docs/HOME.md §2). Each card is a live canvas of the boy.
 * Desktop: the stage pins and a strip of tilted ink-framed cards scrubs sideways; a card
 * straightens and grows as it reaches the centre, and the centred piece's title rolls in
 * letter by letter (in bands). Phone / short screens: one card at a time; swipe it or tap
 * the arrows, the title slides sideways (0.35 s). Either way the boy SITS ON THE ACTIVE
 * CARD'S FRAME: he turns to look the way you're going, and hops to the next card when it
 * changes (crouch → leap → land with a squash → sit).
 */
export const PIECES = [
  { title: 'The Sketch', line: 'A little ink drawing. A whole world to get lost in.', tag: 'Scroll-driven film', bg: '#e4dccb' },
  { title: 'Six styles', line: 'One boy, seven ways of seeing him.', tag: 'Style exploration', bg: '#e4dccb' },
  { title: 'The duel', line: 'Two blades under a comic moon. Timing is everything.', tag: 'Frame by frame', bg: '#1b1714' },
  { title: 'Living worlds', line: 'Painted places with a life of their own.', tag: 'Parallax study', bg: '#e4dccb' },
  { title: 'The run', line: 'Rhythm, one hand-drawn stride at a time.', tag: 'Scroll × velocity', bg: '#efe9dc' },
  { title: 'Fire kick', line: 'A wind-up, a held breath, a release.', tag: 'Action study', bg: '#e4dccb' },
];
const N = PIECES.length;

/** open a piece (the wipe module hooks in later via the `work:open` event) */
export function openPiece(i: number) {
  const ev = new CustomEvent('work:open', { detail: { index: i, piece: PIECES[i] }, cancelable: true });
  if (!dispatchEvent(ev)) return;
  if (i === 0) location.assign('./film.html');
  else console.log(`[work] open piece ${i + 1}: ${PIECES[i].title}`);
}

const pad2 = (n: number) => String(n + 1).padStart(2, '0');
const TILT = [-4, 3, -2.5, 4, -3.5, 2.5];
const STYLES = ['', 'pixel-', 'water-', 'clay-', 'chalk-', 'comic-', 'hose-'];
const WORLDS = [['px_sky', 'px_far', 'px_mid'], ['wc_sky', 'wc_sea_far', 'wc_sea_near'], ['cm_space', 'cm_earth'], ['hs_sky', 'hs_cloud_far', 'hs_cloud_near']];
const meta = manifest as Record<string, { foot: number[]; top: number }>;

const MARKUP = `
  <div class="wk-head">
    <p class="wk-kicker"><span class="wk-scr">(02) Things I made move</span></p>
    <h2 class="wk-h" aria-label="Featured work"><span data-slice>FEATURED</span> <span data-slice>WORK</span></h2>
  </div>
  <div class="wk-stage">
    <p class="wk-meta"><span class="wk-num"><span class="wk-count">01</span><span class="dim"> / 0${N}</span></span><span class="wk-tag">${PIECES[0].tag}</span></p>
    <div class="wk-track">
      ${PIECES.map((p, i) => `<article class="wk-card${i === 0 ? ' on' : ''}" data-i="${i}">
        <button class="wk-in" type="button" aria-label="Open ${p.title}">
          <span class="wk-art"><canvas role="img" aria-label="${p.title}: live drawing of the ink boy"></canvas></span>
          <span class="wk-lab">${pad2(i)} — ${p.tag}</span><span class="wk-arrow" aria-hidden="true">↗</span>
          <i class="wk-seat" aria-hidden="true"></i>
        </button>
      </article>`).join('')}
    </div>
    <canvas class="wk-boy" aria-hidden="true"></canvas>
    <div class="wk-foot">
      <div class="wk-title" aria-live="polite"></div>
      <p class="wk-line">${PIECES[0].line}</p>
      <div class="wk-ctrl">
        <button class="wk-btn wk-prev" type="button" aria-label="Previous piece">←</button>
        <button class="wk-open" type="button"><span>Open piece</span> <b>↗</b></button>
        <button class="wk-btn wk-next" type="button" aria-label="Next piece">→</button>
      </div>
    </div>
    <div class="wk-bar" aria-hidden="true"><i></i></div>
  </div>`;

export function initWork() {
  const sec = document.querySelector<HTMLElement>('#work');
  if (!sec) return;
  sec.innerHTML = MARKUP;
  const $ = <T extends Element = HTMLElement>(s: string) => sec.querySelector<T>(s)!;
  const stage = $('.wk-stage'), track = $('.wk-track'), titleBox = $('.wk-title'), lineEl = $('.wk-line');
  const countEl = $('.wk-count'), tagEl = $('.wk-tag'), barDot = $('.wk-bar i');
  const boyCv = $<HTMLCanvasElement>('.wk-boy'), bctx = boyCv.getContext('2d')!;
  const cards = [...sec.querySelectorAll<HTMLElement>('.wk-card')];
  const inners = cards.map((c) => c.querySelector<HTMLElement>('.wk-in')!);
  const seats = cards.map((c) => c.querySelector<HTMLElement>('.wk-seat')!);
  const cvs = cards.map((c) => c.querySelector('canvas')!);

  let mode: 'strip' | 'carousel' = 'carousel';
  let active = 0;
  const hov = cards.map(() => 0);                 // hover amount per card (desktop)
  const rate = cards.map(() => ({ v: 1 }));       // preview speed per card
  const clock = cards.map(() => 0);
  const visible = cards.map(() => false);
  let scrollV = 0, lastY = scrollY, warm = false;

  // ---------- head: kicker scrambles in with the sliced title ----------
  const kick = $('.wk-scr');
  kick.style.visibility = 'hidden';
  ScrollTrigger.create({ trigger: sec, start: 'top 85%', once: true, onEnter: () => { scramble(kick, 0.5); } });

  // ---------- titles ----------
  let titleEl: HTMLElement | null = null;
  let tagTw: gsap.core.Tween | null = null, countTw: gsap.core.Tween | null = null;
  function setTitle(i: number, dir: number, first = false) {
    const old = titleEl;
    const el = document.createElement('span');
    el.className = 'wk-tt';
    el.textContent = PIECES[i].title.toUpperCase();
    titleBox.appendChild(el);
    titleEl = el;
    if (mode === 'strip') {
      // the new title rolls in letter by letter, in bands; the old one drops out
      if (old) { const L = bandText(old); gsap.killTweensOf(L.flat()); bandsOut(L).eventCallback('onComplete', () => old.remove()); }
      const L = bandText(el);
      gsap.set(L.flat(), { yPercent: 115 });
      if (!first) bandsIn(L, { stagger: 0.035, jitter: 0.12 });
      else ScrollTrigger.create({ trigger: stage, start: 'top 75%', once: true, onEnter: () => { bandsIn(L, { stagger: 0.04, jitter: 0.25 }); } });
    } else {
      // sideways slide, 0.35 s, the two overlap
      if (old) gsap.to(old, { x: -dir * 48, opacity: 0, filter: 'blur(3px)', duration: 0.22, ease: 'power4.inOut', onComplete: () => old.remove() });
      if (first) {
        gsap.set(el, { yPercent: 110 });
        ScrollTrigger.create({ trigger: titleBox, start: 'top 92%', once: true, onEnter: () => { gsap.to(el, { yPercent: 0, duration: 0.7, ease: 'power4.out' }); } });
      } else gsap.fromTo(el, { x: dir * 48, opacity: 0, filter: 'blur(3px)' }, { x: 0, opacity: 1, filter: 'blur(0px)', duration: 0.35, ease: 'power4.out', delay: 0.08 });
    }
    if (first) return;
    countTw?.progress(1);
    countTw = rollWord(countEl, pad2(i), 0.4);
    tagTw?.progress(1);
    tagEl.textContent = PIECES[i].tag;
    tagTw = scramble(tagEl, 0.35);
    gsap.fromTo(lineEl, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power4.out', overwrite: true, onStart: () => { lineEl.textContent = PIECES[i].line; } });
  }

  // ---------- the boy ----------
  const boy = { x: 0, y: 0, face: 1, faceTo: 1, sq: 1, hopP: 1, fx: 0, fy: 0, landT: -9, dir: 1, placed: false, look: 0 };
  ['headout_0', 'leap_0', 'leap_1', 'leap_2', 'home_0', 'lookback_0', 'lookback_1'].forEach((k) => image(k));
  /** where he sits: the seat marker on the top edge of a card, in stage coordinates */
  function seatOf(i: number) {
    const r = seats[i].getBoundingClientRect(), s = stage.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top };
  }
  function hop(dir: number) {
    const s = { x: boy.x, y: boy.y };
    boy.fx = s.x; boy.fy = s.y; boy.dir = dir; boy.hopP = 0; boy.faceTo = dir;
    gsap.killTweensOf(boy, 'hopP');
    gsap.to(boy, { hopP: 1, duration: 0.62, ease: 'none', onComplete: () => {
      boy.landT = gsap.ticker.time;
      gsap.fromTo(boy, { sq: 0.8 }, { sq: 1, duration: 0.5, ease: 'elastic.out(1.2,0.45)' });
    } });
  }
  function turn(to: number) {
    if (boy.faceTo === to) return;
    boy.faceTo = to;
    gsap.to(boy, { face: to, duration: 0.22, ease: 'power4.inOut', overwrite: 'auto' });
  }
  // relative pose heights (each drawing has its own scale; tuned by eye)
  const H: Record<string, number> = { headout_0: 0.62, leap_0: 0.62, leap_1: 0.98, leap_2: 0.98, home_0: 0.7, lookback_0: 0.96, lookback_1: 0.96 };
  function drawBoy(t: number) {
    const dpr = Math.min(devicePixelRatio, 2);
    const B = boyCv.clientWidth;
    if (!B) return;
    const px = Math.round(B * dpr);
    if (boyCv.width !== px || boyCv.height !== px) { boyCv.width = px; boyCv.height = px; }
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, B, B);
    const target = seatOf(active);
    let { x, y } = target, key = 'headout_0', flip = boy.face < 0, sx = Math.abs(boy.face), sy = 1;
    if (!boy.placed) { boy.x = x; boy.y = y; boy.placed = true; }
    if (boy.hopP < 1) {
      const p = boy.hopP, e = p < 0.18 ? 0 : gsap.parseEase('power2.inOut')((p - 0.18) / 0.82);
      x = boy.fx + (target.x - boy.fx) * e;
      y = boy.fy + (target.y - boy.fy) * e - Math.sin(Math.PI * e) * B * 0.55;
      key = p < 0.18 ? 'leap_0' : p < 0.55 ? 'leap_1' : p < 0.9 ? 'leap_2' : 'home_0';
      flip = boy.dir < 0; sx = 1;
      if (p < 0.18) { sy = 1 - p * 0.9; }
    } else if (t - boy.landT < 0.14) key = 'home_0';
    else if (boy.look > 0) { key = t % 0.5 < 0.25 ? 'lookback_0' : 'lookback_1'; flip = false; sx = 1; }
    boy.x = x; boy.y = y;
    // the seat sits on the card's rotated top edge; tilt with it a little
    const card = cards[active];
    const rot = boy.hopP < 1 ? 0 : (Number(gsap.getProperty(card, 'rotation')) || 0) * 0.8;
    boyCv.style.transform = `translate3d(${x - B / 2}px, ${y - B + B * 0.04}px, 0) rotate(${rot}deg)`;
    const m = meta[key];
    if (!m) return;
    const breathe = boy.hopP >= 1 ? 1 + Math.sin(t * 2.6) * 0.018 : 1;
    bctx.save();
    bctx.translate(B / 2, B * 0.96);
    bctx.scale(sx * (2 - boy.sq), sy * boy.sq * breathe);
    pose(bctx, key, 0, 0, B * (H[key] ?? 0.8), flip);
    bctx.restore();
  }

  // ---------- live previews (the drawings each piece used: src/site/playground.ts) ----------
  function preview(i: number, t: number) {
    const cv = cvs[i], ctx = cv.getContext('2d')!;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio, 1.5);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PIECES[i].bg;
    ctx.fillRect(0, 0, w, h);
    const step = Math.floor(t * 10);
    if (i === 0) { background(ctx, 'ink_far', w, h, Math.sin(t * 0.25) * 10); background(ctx, 'ink_mid', w, h, Math.sin(t * 0.3) * 15); pose(ctx, `idle_${step % 4}`, w * 0.5, h * 0.86, h * 0.5); }
    if (i === 1) {
      const s = STYLES[Math.floor(t * 1.2) % 7];
      pose(ctx, `${s}home_3`, w * 0.5, h * 0.88, h * 0.64);
      ctx.font = '700 12px Inter, sans-serif'; ctx.fillStyle = '#1b1714';
      ctx.fillText((s.replace('-', '') || 'ink').toUpperCase(), 16, h - 18);
    }
    if (i === 2) { background(ctx, 'cm_space', w, h); background(ctx, 'cm_moon', w, h, Math.sin(t * 0.25) * 8); pose(ctx, `saber_${step % 6}`, w * 0.38, h * 0.88, h * 0.46); pose(ctx, `saber_${(step + 3) % 6}`, w * 0.66, h * 0.88, h * 0.46, true); }
    if (i === 3) WORLDS[Math.floor(t / 4) % 4].forEach((layer, j) => background(ctx, layer, w, h, Math.sin(t * 0.35 + j) * j * 9));
    if (i === 4) {
      ctx.strokeStyle = '#1b1714'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w * 0.06, h * 0.84); ctx.lineTo(w * 0.94, h * 0.84); ctx.stroke();
      const fast = Math.abs(scrollV) > 1800 || rate[i].v > 1.5;
      pose(ctx, `${fast ? 'sprint8' : 'run8'}_${Math.floor(t * 12) % 8}`, w * 0.5, h * 0.84, h * 0.56, scrollV < -40);
    }
    if (i === 5) { const f = step % 11; pose(ctx, f < 3 ? `ftkick_${f}` : `firetornado_${f - 3}`, w * 0.5, h * 0.88, h * 0.62); }
  }
  const io = new IntersectionObserver((es) => es.forEach((e) => { visible[cvs.indexOf(e.target as HTMLCanvasElement)] = e.isIntersecting; }), { rootMargin: '200px' });
  cvs.forEach((c) => io.observe(c));

  // ---------- strip (desktop): pinned, scrubbed sideways ----------
  let strip: ScrollTrigger | null = null, stripX = 0;
  const geo = { cw: 0, gap: 0, dist: 0 };
  function measure() {
    geo.cw = cards[0].offsetWidth;
    geo.gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    geo.dist = (geo.cw + geo.gap) * (N - 1);
  }
  function layoutStrip() {
    const p = strip ? strip.progress : 0;
    const targetX = -p * geo.dist;
    stripX += (targetX - stripX) * 0.22;
    if (Math.abs(targetX - stripX) < 0.1) stripX = targetX;
    track.style.transform = `translate3d(${stripX}px,0,0)`;
    const span = geo.cw + geo.gap;
    const f = -stripX / span;
    cards.forEach((c, i) => {
      const d = i - f, ad = Math.min(1, Math.abs(d)), h = hov[i];
      const rot = TILT[i] * (0.35 + 0.65 * ad) * (1 - h);
      const sc = 1 - 0.2 * ad + 0.03 * h;
      const y = ad * ad * innerHeight * 0.045 - h * 14;
      gsap.set(c, { rotation: rot, scale: sc, y });
      c.style.setProperty('--lift', String(h));
      c.style.zIndex = String(10 - Math.round(Math.abs(d) * 2));
    });
    barDot.style.transform = `translateX(${p * 100}%)`;
    const a = Math.max(0, Math.min(N - 1, Math.round(f)));
    if (a !== active) { const dir = a > active ? 1 : -1; active = a; markActive(); setTitle(a, dir); hop(dir); }
    else if (boy.hopP >= 1) {
      // he turns to look at the card that's coming
      const near = f - active;
      if (Math.abs(near) > 0.22) turn(near > 0 ? 1 : -1);
    }
  }
  function markActive() { cards.forEach((c, i) => c.classList.toggle('on', i === active)); }

  // ---------- carousel (phone): one at a time, swipe + arrows ----------
  let busy = false;
  function goTo(next: number, dir: number, fromX = 0) {
    if (busy || mode !== 'carousel') return;
    next = (next + N) % N;
    if (next === active) return;
    busy = true;
    const a = cards[active], b = cards[next];
    const vw = stage.clientWidth;
    active = next;
    hop(dir);
    gsap.set(b, { visibility: 'visible', zIndex: 2 });
    gsap.set(a, { zIndex: 1 });
    gsap.fromTo(a, { x: fromX }, { x: -dir * vw * 1.15, rotation: -dir * 12, duration: 0.5, ease: 'power4.inOut', onComplete: () => { gsap.set(a, { visibility: 'hidden', x: 0, rotation: TILT[cards.indexOf(a)] }); a.classList.remove('on'); } });
    gsap.fromTo(b, { x: dir * vw * 1.15, rotation: dir * 12 }, { x: 0, rotation: TILT[next] * 0.6, duration: 0.6, ease: 'power4.out', delay: 0.08, onStart: () => b.classList.add('on'), onComplete: () => { busy = false; } });
    setTitle(next, dir);
    barDot.style.transform = `translateX(${(next / (N - 1)) * 100}%)`;
  }
  $('.wk-prev').addEventListener('click', () => goTo(active - 1, -1));
  $('.wk-next').addEventListener('click', () => goTo(active + 1, 1));
  $('.wk-open').addEventListener('click', () => openPiece(active));
  track.addEventListener('keydown', (e) => {
    if (mode !== 'carousel' || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault(); goTo(active + (e.key === 'ArrowLeft' ? -1 : 1), e.key === 'ArrowLeft' ? -1 : 1);
    requestAnimationFrame(() => inners[active].focus({ preventScroll: true }));
  });

  // swipe: the card follows the finger; past 60 px (or a flick) it goes
  let dragId = -1, sx0 = 0, sy0 = 0, dx = 0, t0 = 0, moved = false;
  track.addEventListener('pointerdown', (e) => {
    const i = cards.findIndex((c) => c.contains(e.target as Node));
    if (i < 0) return;
    // press feedback (touch has no hover): a quick squash
    if (e.pointerType !== 'mouse' || mode === 'carousel') gsap.fromTo(inners[i], { scaleX: 1, scaleY: 1 }, { scaleX: 1.035, scaleY: 0.94, duration: 0.08, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: true });
    moved = false;
    if (mode !== 'carousel' || busy) return;
    dragId = e.pointerId; sx0 = e.clientX; sy0 = e.clientY; dx = 0; t0 = performance.now();
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerId !== dragId) return;
    dx = e.clientX - sx0;
    if (!moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - sy0)) { moved = true; track.setPointerCapture?.(e.pointerId); }
    if (!moved) return;
    gsap.set(cards[active], { x: dx, rotation: TILT[active] * 0.6 + dx * 0.03 });
    turn(dx < 0 ? 1 : -1);
  });
  const release = (e: PointerEvent) => {
    if (e.pointerId !== dragId) return;
    dragId = -1;
    if (!moved) return;
    const v = dx / Math.max(1, performance.now() - t0);
    if (Math.abs(dx) > 60 || Math.abs(v) > 0.5) goTo(active + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1, dx);
    else gsap.to(cards[active], { x: 0, rotation: TILT[active] * 0.6, duration: 0.5, ease: 'power4.out' });
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  track.addEventListener('click', (e) => {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
    const i = cards.findIndex((c) => c.contains(e.target as Node));
    if (i < 0) return;
    if (mode === 'carousel' && i !== active) return;
    openPiece(i);
  }, true);

  // hover (fine pointer): it straightens, lifts with a hard shadow, the preview speeds up
  cards.forEach((c, i) => {
    c.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      const o = { h: hov[i] };
      gsap.to(o, { h: 1, duration: 0.45, ease: 'power4.out', onUpdate: () => { hov[i] = o.h; }, overwrite: true });
      gsap.to(rate[i], { v: 2.6, duration: 0.4, ease: 'power4.out', overwrite: true });
      if (mode === 'carousel') gsap.to(c, { rotation: 0, y: -10, duration: 0.45, ease: 'power4.out' });
      c.classList.add('hot');
    });
    c.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      const o = { h: hov[i] };
      gsap.to(o, { h: 0, duration: 0.6, ease: 'power4.out', onUpdate: () => { hov[i] = o.h; }, overwrite: true });
      gsap.to(rate[i], { v: 1, duration: 0.6, ease: 'power4.out', overwrite: true });
      if (mode === 'carousel') gsap.to(c, { rotation: TILT[i] * 0.6, y: 0, duration: 0.6, ease: 'power4.out' });
      c.classList.remove('hot');
    });
    // keyboard on the strip: focusing a card scrolls it to the centre
    inners[i].addEventListener('focus', () => {
      if (mode !== 'strip' || !strip) return;
      const y = strip.start + (i / (N - 1)) * (strip.end - strip.start);
      const h = (window as unknown as { __home?: { go: (y: number) => void } }).__home;
      if (h) h.go(y); else scrollTo(0, y);
    });
  });

  // ---------- modes ----------
  const mm = gsap.matchMedia();
  mm.add({ wide: '(min-width: 900px) and (min-height: 560px)', narrow: '(max-width: 899px), (max-height: 559px)' }, (ctx) => {
    const wide = !!ctx.conditions?.wide;
    mode = wide ? 'strip' : 'carousel';
    sec.classList.toggle('is-strip', wide);
    titleBox.textContent = ''; titleEl = null;
    active = 0; markActive(); boy.placed = false; boy.hopP = 1;
    countEl.textContent = '01'; tagEl.textContent = PIECES[0].tag; lineEl.textContent = PIECES[0].line;
    setTitle(0, 1, true);
    if (wide) {
      measure(); stripX = 0;
      strip = ScrollTrigger.create({
        trigger: stage, pin: true, start: 'top top', end: () => `+=${geo.dist * 1.15}`,
        invalidateOnRefresh: true, refreshPriority: -1, onRefresh: measure,
      });
    } else {
      cards.forEach((c, i) => gsap.set(c, { x: 0, y: 0, scale: 1, rotation: TILT[i] * 0.6, visibility: i === 0 ? 'visible' : 'hidden', zIndex: i === 0 ? 2 : 1 }));
      barDot.style.transform = 'translateX(0%)';
    }
    return () => {
      strip = null;
      track.style.transform = '';
      cards.forEach((c) => { gsap.set(c, { clearProps: 'all' }); c.style.removeProperty('--lift'); });
    };
  });

  // ---------- one ticker for the strip, the previews and the boy ----------
  let last = gsap.ticker.time, acc = 0;
  gsap.ticker.add(() => {
    const t = gsap.ticker.time, dt = Math.min(0.1, t - last);
    last = t;
    const r = sec.getBoundingClientRect();
    const near = r.bottom > -innerHeight * 0.5 && r.top < innerHeight * 1.5;
    if (!near) return;
    if (!warm) {
      warm = true;
      const r8 = [0, 1, 2, 3, 4, 5, 6, 7];
      ['ink_far', 'ink_mid', 'cm_space', 'cm_moon', ...WORLDS.flat(), ...STYLES.map((st) => `${st}home_3`), ...r8.slice(0, 4).map((k) => `idle_${k}`),
        ...r8.slice(0, 6).map((k) => `saber_${k}`), ...r8.map((k) => `run8_${k}`), ...r8.map((k) => `sprint8_${k}`), ...r8.slice(0, 3).map((k) => `ftkick_${k}`), ...r8.map((k) => `firetornado_${k}`)].forEach((k) => image(k));
    }
    scrollV = scrollV * 0.85 + ((scrollY - lastY) / Math.max(dt, 0.001)) * 0.15;
    lastY = scrollY;
    if (mode === 'strip') layoutStrip();
    cards.forEach((_, i) => { clock[i] += dt * rate[i].v; });
    acc += dt;
    if (acc >= 1 / 24) {
      acc = 0;
      cards.forEach((c, i) => {
        if (!visible[i] || document.hidden) return;
        // the carousel paints the active card and its neighbours (so a card never arrives blank)
        if (mode === 'carousel' && i !== active && (i - active + N) % N !== 1 && (active - i + N) % N !== 1 && getComputedStyle(c).visibility === 'hidden') return;
        preview(i, clock[i]);
      });
    }
    drawBoy(t);
  });

  // when he's been sitting still for a while, he glances at you
  const glance = () => {
    gsap.delayedCall(gsap.utils.random(5, 8), () => {
      if (boy.hopP >= 1 && dragId < 0) gsap.fromTo(boy, { look: 1 }, { look: 0, duration: 1.4, ease: 'none', onComplete: glance });
      else glance();
    });
  };
  glance();
}
