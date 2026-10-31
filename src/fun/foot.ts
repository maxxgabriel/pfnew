import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { calm } from './kit';
import { sticker, stickerUrl } from './stickers';
import './foot.css';
gsap.registerPlugin(ScrollTrigger);

/*
 * THE FOOTER — night again, with one red glow. The spray can crosses the wall and the graffiti MAX
 * appears behind its nozzle, drips and all. The rocket is the way back up: tap it and it shakes,
 * lights and launches, and the page goes up with it.
 */
export function initFoot(root: HTMLElement, toTop: () => void) {
  const tagBox = root.querySelector<HTMLElement>('.foot-tag')!;
  const tag = document.createElement('img');
  tag.src = stickerUrl('graffiti'); tag.alt = ''; tag.className = 'tag-img'; tag.draggable = false;
  tagBox.append(tag);
  const can = sticker(tagBox, 'spraycan', 'f-can', false);
  const rocket = sticker(root.querySelector<HTMLElement>('.up')!, 'rocket', 'f-rocket', false);
  gsap.set([can.inner, rocket.inner], { scale: 1 });
  gsap.set(tag, { clipPath: 'inset(0 100% 0 0)' });
  gsap.set(can.host, { xPercent: -120, opacity: 0 });

  ScrollTrigger.create({
    trigger: tagBox, start: 'top 85%', once: true,
    onEnter: () => {
      gsap.timeline()
        .to(can.host, { opacity: 1, duration: 0.2 })
        .to(can.host, { left: '92%', xPercent: 0, duration: 1.3, ease: 'power1.inOut' }, 0)
        .to(tag, { clipPath: 'inset(0 0% 0 0)', duration: 1.25, ease: 'power1.inOut' }, 0.08)
        .to(can.host, { y: -40, rotation: 30, opacity: 0, duration: 0.4, ease: 'power2.in' })
        .fromTo(tag, { scale: 1.08 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.1, 0.4)' }, '-=0.3');
    },
  });
  if (!calm) gsap.to(tag, { rotation: -1.5, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });

  // the rocket home
  root.querySelector<HTMLAnchorElement>('.up')!.addEventListener('click', (e) => {
    e.preventDefault();
    gsap.timeline()
      .to(rocket.inner, { x: () => gsap.utils.random(-3, 3), duration: 0.04, repeat: 9, yoyo: true, ease: 'none' })
      .to(rocket.inner, { y: -innerHeight, duration: 0.7, ease: 'power3.in' })
      .call(toTop)
      .set(rocket.inner, { y: 80, x: 0 })
      .to(rocket.inner, { y: 0, duration: 0.6, ease: 'back.out(2)' }, '+=0.8');
  });
}
