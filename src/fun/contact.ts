import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { url } from './art';
import { calm, onBeat, splitChars, whileVisible, zoomPunch } from './kit';
import { popIn, sticker, stickerUrl } from './stickers';
import './contact.css';
gsap.registerPlugin(ScrollTrigger);

/*
 * SAY HI — red, halftone, loud. The heading is SAY and then the drawn HI!, which bounces on every
 * other beat. A huge cream pill carries the address over running stripes, with him waving on top.
 * Tap it: the address is copied, a COPIED! burst and two paint splashes pop, and your mail app opens.
 */
export function initContact(root: HTMLElement) {
  const title = root.querySelector<HTMLElement>('.hi-title')!;
  title.innerHTML = '<span class="say">SAY</span><span class="sr"> HI!</span>';
  const chars = splitChars(title.querySelector<HTMLElement>('.say')!, 'hc');
  const hi = sticker(title, 'hi', 'hi-stk');
  const mega = sticker(root, 'megaphone', 'c-mega'), env = sticker(root, 'envelope', 'c-env');
  const pill = root.querySelector<HTMLAnchorElement>('.pill')!, copied = root.querySelector<HTMLElement>('.copied')!;
  const boy = root.querySelector<HTMLImageElement>('.hi-boy')!;
  // everything that belongs to the pill rides with it
  const wrap = document.createElement('div');
  wrap.className = 'pill-wrap';
  pill.replaceWith(wrap);
  wrap.append(pill, boy, copied);
  const boom = sticker(wrap, 'shout', 'c-shout'), s1 = sticker(wrap, 'paintred', 'c-sp1'), s2 = sticker(wrap, 'paintyellow', 'c-sp2');
  boy.src = url('bye_0');
  gsap.set(chars, { yPercent: 110 });
  // the red comes in through an ink splat that grows as you scroll to it
  root.style.setProperty('--splat', `url(${stickerUrl('splat')})`);
  gsap.fromTo(root, { '--m': '60%' }, { '--m': '600%', ease: 'power2.in', scrollTrigger: { trigger: root, start: 'top 95%', end: 'top 25%', scrub: true } });

  ScrollTrigger.create({
    trigger: root, start: 'top 70%', once: true,
    onEnter: () => {
      gsap.to(chars, { yPercent: 0, duration: 0.7, ease: 'back.out(2.4)', stagger: 0.06 });
      popIn([hi, mega, env], 0.25);
      gsap.from(pill, { scale: 0.6, rotation: -6, opacity: 0, duration: 0.8, ease: 'back.out(2)', delay: 0.4 });
      gsap.from(boy, { yPercent: 60, opacity: 0, duration: 0.6, ease: 'back.out(2)', delay: 0.8 });
    },
  });

  // the HI! bounces on every other beat; he waves on threes
  let stop = () => {};
  whileVisible(root, () => {
    if (calm) return;
    const off = onBeat((n) => { if (n % 2 === 0) gsap.fromTo(hi.inner, { scale: 1.16, rotation: n % 4 ? 6 : -6 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)', overwrite: 'auto' }); });
    let f = 0;
    const id = window.setInterval(() => { f++; boy.src = url(`bye_${Math.floor(f / 3) % 4}`); }, 1000 / 24);
    stop = () => { off(); clearInterval(id); };
  }, () => stop());

  // tap: copy (or, where copying is refused, select the address so it can be copied by hand), burst, splash
  pill.addEventListener('click', () => {
    const address = pill.getAttribute('href')?.replace('mailto:', '') ?? '';
    zoomPunch(pill, 1.06);
    const copy = navigator.clipboard?.writeText(address).then(() => true, () => false) ?? Promise.resolve(false);
    void copy.then((ok) => {
      if (!ok) {
        const range = document.createRange();
        range.selectNodeContents(pill.querySelector('.pill-text')!);
        getSelection()?.removeAllRanges(); getSelection()?.addRange(range);
      }
      celebrate(ok ? 'COPIED!' : 'SELECTED!');
    });
  });
  function celebrate(word: string) {
    copied.textContent = word;
    gsap.timeline()
      .fromTo(boom.inner, { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)', overwrite: true })
      .fromTo(copied, { scale: 0, rotation: 20, opacity: 1 }, { scale: 1, rotation: -6, duration: 0.5, ease: 'back.out(3)' }, 0.05)
      .fromTo([s1.inner, s2.inner], { scale: 0, rotation: 90 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2.4)', stagger: 0.08 }, 0)
      .to([boom.inner, copied, s1.inner, s2.inner], { scale: 0, duration: 0.3, ease: 'back.in(2)', stagger: 0.04 }, '+=1.4');
  }
}
