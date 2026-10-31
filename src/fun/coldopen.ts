import gsap from 'gsap';
import { BEAT, C } from './kit';
import './coldopen.css';

/*
 * THE COLD OPEN — before the page, a trailer's first seconds. Black, then the name arrives one
 * letter per hit: every letter is a smash cut to its own colour and its own typeface, punched in
 * from close to the lens with a shake and an RGB split. MAX on the beat, GABRIEL twice as fast, then
 * the whole name lands on the page (the hero takes it from there). The typeface's name and the count
 * sit small in the corners, like a specimen. Drawn on one canvas, so every glyph is centred on its
 * ink and the colour plates are exact. Any tap, key or scroll fast-forwards it.
 */
type Slam = { ch: string; bg: string; fg: string; family: string; weight?: string; stretch?: string; spec: string; pat?: 'dots' | 'stripes' | 'burst'; shadow?: string; outline?: boolean };
const SLAMS: Slam[] = [
  { ch: 'M', bg: C.hot, fg: C.paper, family: 'Anton', spec: 'Anton' },
  { ch: 'A', bg: C.sun, fg: C.ink, family: 'Bangers', spec: 'Bangers', pat: 'dots' },
  { ch: 'X', bg: C.cool, fg: C.ink, family: 'Montserrat', weight: '900', spec: 'Montserrat Black', shadow: C.paper },
  { ch: 'G', bg: C.ink, fg: C.sun, family: 'Anton', spec: 'Anton', pat: 'burst' },
  { ch: 'A', bg: C.paper, fg: C.hot, family: '"Bebas Neue"', spec: 'Bebas Neue' },
  { ch: 'B', bg: C.hot, fg: C.ink, family: 'Bangers', spec: 'Bangers', pat: 'stripes' },
  { ch: 'R', bg: C.mint, fg: C.ink, family: 'Jost', weight: '800', spec: 'Jost Extra Bold' },
  { ch: 'I', bg: C.ink, fg: C.paper, family: 'Anybody', weight: '900', stretch: 'extra-expanded', spec: 'Anybody Black Expanded, outline', shadow: C.hot, outline: true },
  { ch: 'E', bg: C.sun, fg: C.hot, family: 'Montserrat', weight: '900', spec: 'Montserrat Black', pat: 'dots' },
  { ch: 'L', bg: C.cool, fg: C.paper, family: 'Anton', spec: 'Anton', shadow: C.ink },
];
/** MAX on the beat, GABRIEL on the half beats, the name lands on beat 7 */
const AT = [0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];
const LEAD = 0.25;
export const COLD_LAND = LEAD + 7 * BEAT;

export function coldOpen(el: HTMLElement) {
  el.innerHTML = '<canvas></canvas><p class="co-spec"></p><p class="co-count"></p>';
  const cv = el.querySelector('canvas')!, g = cv.getContext('2d')!;
  const spec = el.querySelector<HTMLElement>('.co-spec')!, count = el.querySelector<HTMLElement>('.co-count')!;
  let W = 1, H = 1, dpr = 1;
  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  };
  size();
  addEventListener('resize', size);

  // each glyph's size (fills the screen without touching the edges) and its ink box
  const font = (s: Slam, px: number) => `${s.weight ?? '400'} ${px}px ${s.family}`;
  const setFont = (s: Slam, px: number) => {
    g.font = font(s, px);
    if ('fontStretch' in g) (g as unknown as { fontStretch: string }).fontStretch = s.stretch ?? 'normal';
  };
  const ink = SLAMS.map((s) => {
    setFont(s, 100);
    const m = g.measureText(s.ch);
    return { l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent };
  });
  const pats = { dots: tile('dots'), stripes: tile('stripes') };

  const st = { i: -1, s: 1, rot: 0, mis: 0, sx: 0, sy: 0, flash: 0, spin: 0 };
  function draw() {
    const s = SLAMS[st.i];
    if (!s) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = s.bg; g.fillRect(0, 0, W, H);
    if (s.pat === 'dots' || s.pat === 'stripes') { g.fillStyle = g.createPattern(pats[s.pat], 'repeat')!; g.fillRect(0, 0, W, H); }
    if (s.pat === 'burst') burst(s.fg);
    const k = ink[st.i];
    const px = Math.min((W * 0.8) / ((k.l + k.r) / 100), (H * 0.62) / ((k.a + k.d) / 100));
    const u = px / 100;
    // draw the ink centred on the screen
    const ox = -((k.r - k.l) / 2) * u, oy = ((k.a - k.d) / 2) * u;
    g.save();
    g.translate(W / 2 + st.sx, H / 2 + st.sy);
    g.rotate((st.rot * Math.PI) / 180);
    g.scale(st.s, st.s);
    setFont(s, px);
    if (st.mis > 0.4) {
      g.globalAlpha = 0.9;
      g.fillStyle = C.cool; g.fillText(s.ch, ox - st.mis, oy + st.mis * 0.5);
      g.fillStyle = s.bg === C.hot ? C.sun : C.hot; g.fillText(s.ch, ox + st.mis, oy - st.mis * 0.5);
      g.globalAlpha = 1;
    }
    if (s.shadow) { const o = px * 0.035; g.fillStyle = s.shadow; g.fillText(s.ch, ox + o, oy + o); }
    if (s.outline) {
      // a hollow letter: the ground shows through, the red plate peeks out from behind
      g.fillStyle = s.bg; g.fillText(s.ch, ox, oy);
      g.lineWidth = Math.max(3, px * 0.022); g.lineJoin = 'round'; g.strokeStyle = s.fg; g.strokeText(s.ch, ox, oy);
    } else { g.fillStyle = s.fg; g.fillText(s.ch, ox, oy); }
    g.restore();
    if (st.flash > 0.01) { g.fillStyle = `rgba(255,255,255,${st.flash})`; g.fillRect(0, 0, W, H); }
  }
  function burst(color: string) {
    const R = Math.hypot(W, H);
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(st.spin);
    g.fillStyle = color; g.globalAlpha = 0.13;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      g.beginPath(); g.moveTo(0, 0);
      g.lineTo(Math.cos(a - 0.07) * R, Math.sin(a - 0.07) * R);
      g.lineTo(Math.cos(a + 0.07) * R, Math.sin(a + 0.07) * R);
      g.closePath(); g.fill();
    }
    g.restore();
  }

  const tl = gsap.timeline({ onUpdate: draw });
  SLAMS.forEach((s, i) => {
    const t = LEAD + AT[i] * BEAT, down = AT[i] % 1 === 0 && AT[i] < 3;
    tl.call(() => {
      st.i = i;
      spec.textContent = s.spec; spec.style.color = count.style.color = s.fg;
      count.textContent = `${String(i + 1).padStart(2, '0')} / 10`;
    }, [], t);
    tl.fromTo(st, { s: down ? 1.75 : 1.45, rot: gsap.utils.random(-14, 14), mis: down ? 22 : 14 },
      { s: 1, rot: gsap.utils.random(-3, 3), mis: 0, duration: down ? 0.34 : 0.22, ease: 'expo.out', immediateRender: false }, t);
    tl.fromTo(st, { flash: down ? 0.75 : 0.35 }, { flash: 0, duration: 0.12, ease: 'power2.out', immediateRender: false }, t);
    // the shake, decaying
    const amp = down ? 16 : 9;
    tl.to(st, { duration: down ? 0.3 : 0.18, ease: 'none', onUpdate() { const q = 1 - this.progress(); st.sx = gsap.utils.random(-amp, amp) * q; st.sy = gsap.utils.random(-amp, amp) * q; }, onComplete: () => { st.sx = st.sy = 0; } }, t);
  });
  tl.to(st, { spin: 0.6, duration: 7 * BEAT, ease: 'none' }, LEAD);

  // any tap, key or scroll fast-forwards
  const skip = () => { if (tl.progress() < 1) tl.timeScale(7); };
  const evs = ['pointerdown', 'keydown', 'wheel', 'touchmove'] as const;
  evs.forEach((e) => addEventListener(e, skip, { passive: true }));
  tl.call(() => {
    evs.forEach((e) => removeEventListener(e, skip));
    removeEventListener('resize', size);
    el.remove();
  }, [], COLD_LAND);
  return tl;

  function tile(kind: 'dots' | 'stripes') {
    const t = document.createElement('canvas'), n = kind === 'dots' ? 14 : 22;
    t.width = t.height = n * dpr;
    const c = t.getContext('2d')!;
    c.scale(dpr, dpr);
    c.fillStyle = 'rgba(21, 19, 17, 0.13)';
    if (kind === 'dots') { c.beginPath(); c.arc(n / 2, n / 2, n * 0.24, 0, Math.PI * 2); c.fill(); }
    else { c.beginPath(); c.moveTo(0, n); c.lineTo(n * 0.35, n); c.lineTo(n, n * 0.35); c.lineTo(n, 0); c.lineTo(n * 0.65, 0); c.lineTo(0, n * 0.65); c.closePath(); c.fill(); }
    return t;
  }
}
