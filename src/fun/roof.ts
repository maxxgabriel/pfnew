import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { faceUrl, url } from './art';
import { Boy } from './boy';
import { C, calm, glitchFlash, shake } from './kit';
import { Speed } from './lines';
import { stickerUrl } from './stickers';
import './roof.css';
gsap.registerPlugin(ScrollTrigger);

/*
 * ROOFTOPS — night, a Ben-Day sky, the red ball for a moon. The old trailer's lines are a skyline:
 * ONE ANIMATOR, SEVEN STYLES, ZERO STILL FRAMES, EVERYTHING MOVES, every letter a tower with lit
 * windows, each word in its own typeface; posters and a graffiti tag at street level, the NOW PLAYING
 * sign in neon, a billboard or two. He runs the roofs as you scroll (on twos, drawn smears on the
 * jumps, speed lines, a comic inset punching in on the big gaps, the colour plates slipping out of
 * register in the air), a graffiti train crosses behind him, and the billboard lights turn him pixel
 * or comic while he is in them. At the last roof he stops, looks down, and steps off: the leap of
 * faith, the camera rolling upside down so falling looks like rising, straight into the next section.
 * The scroll is the only clock: scrub back and he runs back.
 */
const WORDS = [
  { text: 'ONE ANIMATOR', cls: 'clean', k: 0.74 },
  { text: 'SEVEN STYLES', cls: 'bold', k: 0.92 },
  { text: 'ZERO STILL FRAMES', cls: 'glitch', k: 0.84 },
  { text: 'EVERYTHING MOVES', cls: 'big', k: 1 },
];
const RUN = Array.from({ length: 8 }, (_, i) => `run8_${i}`), PIX = Array.from({ length: 8 }, (_, i) => `pixel-run8_${i}`);
export const ROOF_POSES = [...RUN, ...PIX, 'leap_0', 'leap_2', 'fall_0', 'fall_1', 'fall_3', 'hero_0', 'hero_3', 'curious', 'idle_0', 'idle_1', 'comic-leap', 'comic-fall_0', 'closeup_0', 'closeup_1', 'closeup_2'];
const RUN_END = 0.8, EDGE = 0.85; // of the pin: the run, a pause at the edge, the leap
const INSETS = ['closeup_0', 'closeup_2', 'closeup_1'];
type Seg = { x0: number; x1: number; y: number };
const hash = (i: number) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const WINDOWS = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 12"><rect width="10" height="12" fill="#151c25"/><rect x="2" y="2" width="2.6" height="3.4" fill="#ffd54a"/><rect x="6" y="2" width="2.6" height="3.4" fill="#ffd54a" opacity=".3"/><rect x="2" y="7.4" width="2.6" height="3.4" fill="#ffd54a" opacity=".75"/><rect x="6" y="7.4" width="2.6" height="3.4" fill="#2b3745"/></svg>')}")`;

export function initRoof(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('.rf-stage')!;
  stage.innerHTML = `
    <div class="rf-sky"></div>
    <div class="rf-moon"><img alt="" /></div>
    <div class="rf-world">
      <div class="rf-far"></div>
      <div class="rf-rail"><i class="rf-track"></i><div class="rf-train"><div class="car c1"><img alt="" class="face"/><img alt="" class="tag"/></div><div class="car c2"><img alt="" class="face"/></div><div class="car c3"><img alt="" class="face"/></div><i class="spark s1"></i><i class="spark s2"></i></div></div>
      <div class="rf-city">
        <div class="rf-wall"><img class="rf-graf" alt="" /><img class="rf-can" alt="" /><i class="drip d1"></i><i class="drip d2"></i><i class="drip d3"></i></div>
        <i class="rf-ground"></i>
        <img class="rf-smear" alt="" />
        <img class="rf-boy" alt="" />
      </div>
    </div>
    <div class="rf-insets"></div>
    <i class="rf-flash"></i>`;
  stage.style.setProperty('--windows', WINDOWS);
  const q = <T extends HTMLElement = HTMLElement>(s: string) => stage.querySelector<T>(s)!;
  const world = q('.rf-world'), far = q('.rf-far'), city = q('.rf-city'), rail = q('.rf-rail'), train = q('.rf-train');
  const wall = q('.rf-wall'), ground = q('.rf-ground'), flash = q('.rf-flash'), moon = q('.rf-moon');
  q<HTMLImageElement>('.rf-moon img').src = stickerUrl('spark');
  q<HTMLImageElement>('.rf-graf').src = stickerUrl('graffiti');
  q<HTMLImageElement>('.rf-can').src = stickerUrl('spraycan');
  q<HTMLImageElement>('.car.c1 .tag').src = stickerUrl('graffiti');
  ['ink', 'pixel', 'comic'].forEach((s, i) => { q<HTMLImageElement>(`.car.c${i + 1} .face`).src = faceUrl(s); });
  const boy = new Boy(q<HTMLImageElement>('.rf-boy')), smear = q<HTMLImageElement>('.rf-smear');
  const lines = new Speed(stage, 'rf-lines');
  const insets = INSETS.map((k, i) => {
    const el = document.createElement('div');
    el.className = `rf-inset rf-inset-${i}`;
    el.innerHTML = `<img alt="" src="${url(k)}" />`;
    q('.rf-insets').append(el);
    gsap.set(el, { scale: 0 });
    return el;
  });
  // the far skyline: plain blocks, one of them wearing the neon sign
  const blocks: HTMLElement[] = [];
  for (let i = 0; i < 16; i++) {
    const b = document.createElement('i');
    b.className = 'blk';
    far.append(b); blocks.push(b);
  }
  const neon = document.createElement('b');
  neon.className = 'rf-neon'; neon.textContent = 'NOW PLAYING';
  far.append(neon);
  // the words as towers
  const words = WORDS.map((w) => {
    const el = document.createElement('div');
    el.className = `rf-word rf-${w.cls}`;
    for (const ch of w.text) {
      if (ch === ' ') { const s = document.createElement('i'); s.className = 'sp'; el.append(s); continue; }
      const s = document.createElement('span'); s.className = 'bld'; s.textContent = ch; el.append(s);
    }
    const probe = document.createElement('i'); probe.className = 'probe'; el.append(probe);
    city.insertBefore(el, ground);
    return { ...w, el, probe };
  });
  // posters at street level, two billboards up top
  const posters = ['vhs', 'badge', 'popcorn'].map((n, i) => { const im = document.createElement('img'); im.className = `rf-poster rf-poster-${i}`; im.src = stickerUrl(n); im.alt = ''; city.insertBefore(im, ground); return im; });
  const boards = ['pixel', 'comic'].map((s) => {
    const el = document.createElement('div');
    el.className = `rf-board rf-board-${s}`;
    el.innerHTML = `<i class="cone"></i><div class="frame"><img alt="" src="${faceUrl(s)}" /></div>`;
    city.insertBefore(el, ground);
    return { el, style: s, x0: 0, x1: 0 };
  });

  // ---- layout
  let W = 1, H = 1, fs = 100, phone = false, groundY = 0, startX = 0, runLen = 1, edgeX = 0, edgeY = 0, worldW = 1, trainW = 1, fitted = false;
  let segs: Seg[] = [];
  const gaps: { x0: number; x1: number; big: boolean; i: number }[] = [];
  const caps = new Map<string, number>();
  const capOf = (el: HTMLElement) => {
    const cs = getComputedStyle(el), key = `${cs.fontWeight}|${cs.fontFamily}`;
    if (!caps.has(key)) { const g = document.createElement('canvas').getContext('2d')!; g.font = `${cs.fontWeight} 100px ${cs.fontFamily}`; caps.set(key, g.measureText('H').actualBoundingBoxAscent / 100); }
    return caps.get(key)! * parseFloat(cs.fontSize);
  };
  function fit() {
    W = root.clientWidth; H = root.clientHeight; phone = W < 760;
    fs = H * (phone ? 0.2 : 0.36);
    groundY = H * (phone ? 0.8 : 0.86);
    stage.style.setProperty('--fs', `${fs}px`);
    stage.style.setProperty('--ground', `${groundY}px`);
    // the wall he starts on
    const wallX0 = W * 0.06, wallX1 = W * 0.5, wallY = groundY - fs * 0.82;
    Object.assign(wall.style, { left: `${wallX0}px`, width: `${wallX1 - wallX0}px`, top: `${wallY}px`, height: `${groundY - wallY}px` });
    segs = [{ x0: wallX0 + fs * 0.1, x1: wallX1 - fs * 0.1, y: wallY }];
    let cursor = wallX1 + fs * 0.9;
    words.forEach((w, wi) => {
      w.el.style.fontSize = `${fs * w.k}px`;
      const letters = [...w.el.querySelectorAll<HTMLElement>('.bld')];
      letters.forEach((l, li) => { l.style.fontSize = `${(0.8 + 0.3 * hash(wi * 31 + li)).toFixed(3)}em`; });
      w.el.style.left = `${cursor}px`;
      w.el.style.top = '0px';
      const base = w.probe.offsetTop;
      w.el.style.top = `${groundY - base}px`;
      letters.forEach((l) => { segs.push({ x0: cursor + l.offsetLeft + l.offsetWidth * 0.06, x1: cursor + l.offsetLeft + l.offsetWidth * 0.94, y: groundY - capOf(l) }); });
      cursor += w.el.offsetWidth + fs * 1.15;
    });
    segs.sort((a, b) => a.x0 - b.x0);
    gaps.length = 0;
    for (let i = 1; i < segs.length; i++) { const g = segs[i].x0 - segs[i - 1].x1; if (g > 3) gaps.push({ x0: segs[i - 1].x1, x1: segs[i].x0, big: g > fs * 0.75, i: gaps.length }); }
    const last = segs[segs.length - 1];
    startX = segs[0].x0 + fs * 0.3; edgeX = last.x1 - fs * 0.05; edgeY = last.y; runLen = edgeX - startX;
    worldW = cursor + W * 0.6;
    ground.style.width = `${worldW}px`;
    // the far skyline
    const farW = worldW * 0.3 + W * 1.4;
    let fx = -W * 0.2;
    blocks.forEach((b, i) => {
      const bw = fs * (0.5 + hash(i + 7) * 0.9), bh = fs * (0.5 + hash(i + 70) * 1.3);
      Object.assign(b.style, { left: `${fx}px`, width: `${bw}px`, height: `${bh}px`, top: `${groundY - fs * 0.35 - bh}px`, display: fx > farW ? 'none' : '' });
      fx += bw + fs * (0.08 + hash(i + 700) * 0.3);
    });
    const nb = blocks[5];
    Object.assign(neon.style, { left: `${parseFloat(nb.style.left) - fs * 0.1}px`, top: `${parseFloat(nb.style.top) - fs * 0.28}px` });
    // posters on the first towers, the billboards over the second word and the third gap
    const at = (n: number) => segs[Math.min(segs.length - 1, n)];
    posters.forEach((p, i) => { const s = at([3, 9, 20][i]); Object.assign(p.style, { left: `${s.x0 + (s.x1 - s.x0) * 0.1}px`, top: `${groundY - fs * (0.38 + i * 0.05)}px`, width: `${fs * 0.3}px` }); });
    const bigGaps = gaps.filter((g) => g.big);
    const second = words[1], sl = second.el.offsetLeft + second.el.offsetWidth * 0.5;
    const b0 = boards[0], b1 = boards[1];
    b0.x0 = sl - fs * 0.9; b0.x1 = sl + fs * 0.9;
    const g3 = bigGaps[2] ?? bigGaps[bigGaps.length - 1];
    b1.x0 = g3.x0 - fs * 0.2; b1.x1 = g3.x1 + fs * 0.2;
    for (const b of [b0, b1]) {
      const roof = segs.filter((s) => s.x1 > b.x0 && s.x0 < b.x1).reduce((m, s) => Math.min(m, s.y), groundY);
      const top = roof - fs * 1.15;
      Object.assign(b.el.style, { left: `${b.x0}px`, width: `${b.x1 - b.x0}px`, top: `${top}px`, height: `${groundY - top}px` });
      b.el.style.setProperty('--roof', `${((roof - top) / (groundY - top)) * 100}%`);
    }
    boy.face = fs * 0.24;
    lines.size(W, H);
    trainW = fs * 3 * 2.2;
    gsap.set(train, { y: groundY - fs * 1.62 });
    fitted = true;
    last_ = -1;
  }

  // ---- where he is, for a place along the run
  function at(x: number) {
    const i = segs.findIndex((s) => x >= s.x0 && x <= s.x1);
    if (i >= 0) {
      const s = segs[i], prev = segs[i - 1], next = segs[i + 1], hw = fs * 0.5;
      if (prev && s.x0 - prev.x1 <= 3 && Math.abs(prev.y - s.y) > 3 && x - s.x0 < hw / 2) { const t = 0.5 + (x - s.x0) / hw; return { y: lerp(prev.y, s.y, t) - (fs * 0.1 + Math.abs(prev.y - s.y) * 0.3) * 4 * t * (1 - t), t, big: false }; }
      if (next && next.x0 - s.x1 <= 3 && Math.abs(next.y - s.y) > 3 && s.x1 - x < hw / 2) { const t = (x - (s.x1 - hw / 2)) / hw; return { y: lerp(s.y, next.y, t) - (fs * 0.1 + Math.abs(next.y - s.y) * 0.3) * 4 * t * (1 - t), t, big: false }; }
      return { y: s.y, t: 0, big: false };
    }
    let L = segs[0], R = segs[segs.length - 1];
    for (const s of segs) { if (s.x1 < x) L = s; if (s.x0 > x) { R = s; break; } }
    const g = R.x0 - L.x1, t = gsap.utils.clamp(0, 1, (x - L.x1) / Math.max(1, g)), big = g > fs * 0.75;
    return { y: lerp(L.y, R.y, t) - (big ? fs * 0.55 + Math.abs(R.y - L.y) * 0.3 : fs * 0.14 + Math.abs(R.y - L.y) * 0.35) * 4 * t * (1 - t), t, big };
  }
  const pOf = (x: number) => ((x - startX) / runLen) * RUN_END;

  // ---- every frame
  let target = 0, smooth = 0, last_ = -1, prevX = 0, dist = 0, stillFor = 0, dir = 1, insetOn = -1, wasBig = false;
  const sm = (v: number) => v * v * (3 - 2 * v);
  function render(p: number, dt: number) {
    const run = Math.min(1, p / RUN_END);
    let x: number, y: number, t = 0, big = false, q = 0;
    if (p < EDGE) { x = p < RUN_END ? startX + run * runLen : edgeX; ({ y, t, big } = at(x)); }
    else { q = (p - EDGE) / (1 - EDGE); x = edgeX + q * fs * 0.5; y = edgeY + Math.pow(q, 1.7) * H * 2.6; }
    const vx = dt > 0 ? (x - prevX) / dt : 0;
    if (Math.abs(x - prevX) > 0.2) { dir = x >= prevX ? 1 : -1; dist += Math.abs(x - prevX); stillFor = 0; } else stillFor += dt;
    prevX = x;
    // the camera: with him; in the leap it rolls over and he drifts to the middle
    const anchorX = lerp(W * 0.38, W * 0.5, sm(Math.min(1, q / 0.5))), anchorY = lerp(groundY - fs * 0.9, H * 0.5, sm(Math.min(1, q / 0.5)));
    const camX = x - anchorX, camY = q > 0 ? y - anchorY : 0;
    const theta = calm ? 0 : 180 * sm(gsap.utils.clamp(0, 1, q / 0.8));
    world.style.transform = `rotate(${theta}deg)`;
    city.style.transform = `translate(${-camX}px, ${-camY}px)`;
    far.style.transform = `translate(${-camX * 0.28}px, ${-camY * 0.3}px)`;
    rail.style.transform = `translate(${-camX * 0.55}px, ${-camY * 0.55}px)`;
    moon.style.transform = `translate(${-camX * 0.04}px, 0)`;
    // him
    boy.x = x; boy.y = y; boy.flip = dir < 0;
    const inPix = x > boards[0].x0 && x < boards[0].x1, inComic = x > boards[1].x0 && x < boards[1].x1;
    if (q > 0) boy.pose(q < 0.82 ? 'fall_3' : 'fall_0');
    else if (p >= RUN_END) boy.pose(stillFor > 0.3 ? 'curious' : 'hero_0');
    else if (t > 0 && big) boy.pose(inComic ? (t < 0.7 ? 'comic-leap' : 'comic-fall_0') : t < 0.45 ? 'leap_2' : t < 0.8 ? 'leap_0' : 'fall_0');
    else if (t > 0) boy.pose(inPix ? PIX[2] : 'leap_2');
    else if (stillFor > 3) boy.pose('idle_0');
    else if (stillFor > 0.35) boy.pose('hero_0');
    else boy.pose((inPix ? PIX : RUN)[Math.floor(dist / (fs * 0.075)) % 8]);
    boy.apply();
    // a drawn smear behind him when he is really moving
    const fast = Math.abs(vx) > fs * 3 || (t > 0 && big);
    if (fast) {
      smear.src = boy.el.src;
      Object.assign(smear.style, { width: boy.el.style.width, height: boy.el.style.height, opacity: '0.32', transformOrigin: boy.el.style.transformOrigin, transform: `${boy.el.style.transform} translate(${-dir * fs * 0.22}px, 0) scale(${(boy.flip ? -1 : 1) * 1.7}, 1)` });
    } else smear.style.opacity = '0';
    // speed lines, the plates slipping in the air, the inset on a big gap
    const air = big ? Math.sin(t * Math.PI) : 0;
    if (!calm) lines.draw(Math.max(air * 0.7, q > 0 ? 0.4 + q * 0.6 : 0, Math.min(0.5, Math.abs(vx) / (fs * 10))), anchorX, anchorY, q > 0 ? '#f6f1e7' : C.sun);
    else lines.clear();
    city.style.setProperty('--mis', `${(air * 6 + q * 7).toFixed(1)}px`);
    const gi = big && t > 0 && t < 1 ? gaps.filter((g) => g.big).findIndex((g) => x >= g.x0 && x <= g.x1) : -1;
    if (gi !== insetOn) {
      if (insetOn >= 0) gsap.to(insets[insetOn % insets.length], { scale: 0, duration: 0.2, ease: 'power3.in', overwrite: true });
      if (gi >= 0 && !calm) { const el = insets[gi % insets.length]; gsap.fromTo(el, { scale: 1.5, rotation: gi % 2 ? 4 : -4 }, { scale: 1, rotation: gi % 2 ? -2 : 2, duration: 0.22, ease: 'expo.out', overwrite: true }); shake(stage, 6, 0.18); }
      insetOn = gi;
    }
    if (big !== wasBig) { if (!big && !calm && q === 0) { gsap.fromTo(boy, { sy: 0.82 }, { sy: 1, duration: 0.45, ease: 'elastic.out(1.2, 0.4)', overwrite: 'auto' }); } wasBig = big; }
    // the train crosses behind, right to left, while he is in the middle of the run
    const tp = (p - 0.2) / 0.36;
    if (tp > 0 && tp < 1) { train.style.visibility = 'visible'; gsap.set(train, { x: W + 80 + camX * 0.55 - tp * (W + trainW + 160) }); } else train.style.visibility = 'hidden';
    // the leap's end: white, and the next page
    flash.style.opacity = String(gsap.utils.clamp(0, 1, (q - 0.86) / 0.14));
    stage.classList.toggle('leaping', q > 0);
  }
  gsap.ticker.add((_t, dms) => {
    const dt = Math.min(dms / 1000, 1 / 30);
    if (Math.abs(target - smooth) > 1e-4) smooth += (target - smooth) * (1 - Math.exp(-dt * 14)); else smooth = target;
    if (!fitted || (!visible && smooth === last_)) return;
    last_ = smooth;
    render(smooth, dt);
  });

  let visible = false;
  ScrollTrigger.create({
    trigger: root, start: 'top top', end: () => `+=${runLen / (phone ? 1.8 : 2.4) + H * 1.3}`, pin: stage, anticipatePin: 1,
    onUpdate: (s) => { target = s.progress; },
    onToggle: (s) => { visible = s.isActive; },
  });
  // it arrives out of register and snaps clean; the tag drips; the neon buzzes on
  ScrollTrigger.create({
    trigger: root, start: 'top 70%', once: true,
    onEnter: () => {
      if (calm) return;
      glitchFlash(0.3);
      gsap.fromTo(city, { '--reg': '14px' }, { '--reg': '0px', duration: 0.9, ease: 'elastic.out(1.1, 0.4)' });
      gsap.fromTo(stage.querySelectorAll('.drip'), { scaleY: 0 }, { scaleY: 1, duration: 1.6, ease: 'power2.in', stagger: 0.2, delay: 0.6 });
      stage.classList.add('lit');
    },
  });
  return { fit, poses: ROOF_POSES, pOf, boy };
}
