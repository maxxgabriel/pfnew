import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { calm, splitChars } from './kit';
import { sticker } from './stickers';
import './skills.css';
gsap.registerPlugin(ScrollTrigger);

/*
 * WHAT I DO — five huge words. The one in the middle of the screen is lit and moves its own way:
 * CHARACTER ANIMATION walks (stepped, like drawings on twos), MOTION DESIGN waves, KINETIC TYPE
 * stretches, CREATIVE CODE keeps scrambling into code and back, ILLUSTRATION prints off-register and
 * boils. The others wait at a tenth. The ground changes colour with each, a sticker pops beside it.
 */
const TINT = ['#ffe8a6', '#cfe9ff', '#ccf2e0', '#ffd6cc', '#e8deff'];
const GLYPHS = '01<>/{}[];=+*#';

export function initSkills(root: HTMLElement) {
  const items = [...root.querySelectorAll<HTMLElement>('.skill')];
  const chars = items.map((it) => splitChars(it, 'sk'));
  const stickers = items.map((it, i) => sticker(it, it.dataset.sticker ?? 'sparkle', i % 2 ? 'sk-right' : 'sk-left'));
  const moves: Record<string, (cs: HTMLElement[], it: HTMLElement) => () => void> = {
    walk: (cs) => { const t = gsap.to(cs, { yPercent: -16, rotation: (i) => (i % 2 ? 4 : -4), duration: 0.24, ease: 'steps(2)', stagger: { each: 0.12, repeat: -1, yoyo: true } }); return () => { t.kill(); gsap.to(cs, { yPercent: 0, rotation: 0, duration: 0.3 }); }; },
    wave: (cs) => { const t = gsap.to(cs, { yPercent: -22, scale: 1.12, duration: 0.5, ease: 'sine.inOut', stagger: { each: 0.07, repeat: -1, yoyo: true } }); return () => { t.kill(); gsap.to(cs, { yPercent: 0, scale: 1, duration: 0.3 }); }; },
    stretch: (cs) => { const t = gsap.to(cs, { scaleX: 1.45, scaleY: 0.86, duration: 0.45, ease: 'power2.inOut', stagger: { each: 0.09, repeat: -1, yoyo: true } }); return () => { t.kill(); gsap.to(cs, { scaleX: 1, scaleY: 1, duration: 0.3 }); }; },
    code: (cs) => {
      const orig = cs.map((c) => c.textContent ?? '');
      const id = window.setInterval(() => {
        cs.forEach((c, i) => { c.textContent = orig[i]; c.classList.remove('glyph'); });
        for (let k = 0; k < 3; k++) { const i = Math.floor(Math.random() * cs.length); if (orig[i].trim()) { cs[i].textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; cs[i].classList.add('glyph'); } }
      }, 90);
      return () => { clearInterval(id); cs.forEach((c, i) => { c.textContent = orig[i]; c.classList.remove('glyph'); }); };
    },
    print: (_cs, it) => { it.classList.add('printing'); const t = gsap.to(it, { '--px': 1, duration: 0.5, ease: 'steps(3)', yoyo: true, repeat: -1 }); return () => { t.kill(); it.classList.remove('printing'); gsap.set(it, { '--px': 0 }); }; },
  };
  let stop = () => {};
  let active = -1;
  function light(i: number) {
    if (i === active) return;
    stop(); stop = () => {};
    if (active >= 0) gsap.to(stickers[active].inner, { scale: 0, rotation: -40, duration: 0.3, ease: 'back.in(2)', overwrite: true });
    active = i;
    items.forEach((it, k) => it.classList.toggle('on', k === i));
    if (i < 0) return;
    gsap.to(root, { backgroundColor: TINT[i], duration: 0.5, ease: 'power2.out', overwrite: true });
    gsap.fromTo(stickers[i].inner, { scale: 0, rotation: 60 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(2.4)', overwrite: true });
    gsap.fromTo(chars[i], { yPercent: 40 }, { yPercent: 0, duration: 0.5, ease: 'back.out(2.6)', stagger: 0.02 });
    if (!calm) stop = moves[items[i].dataset.move ?? 'wave'](chars[i], items[i]);
  }
  // the lit word is the one nearest the middle of the screen
  const pick = () => {
    let best = -1, bd = innerHeight * 0.32;
    items.forEach((it, i) => { const r = it.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - innerHeight / 2); if (d < bd) { bd = d; best = i; } });
    light(best);
  };
  ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onUpdate: pick, onToggle: (s) => { if (!s.isActive) light(-1); } });
}
