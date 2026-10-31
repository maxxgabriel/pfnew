import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { url } from './art';
import { calm, splitChars, whileVisible } from './kit';
import { sticker, stickerUrl } from './stickers';
import './comic.css';
gsap.registerPlugin(ScrollTrigger);

/*
 * ABOUT, AS A COMIC PAGE — pop art on butter yellow with red Ben-Day dots, four panels each revealed
 * through a growing ink splat as you reach it. MEET MAX. (he waves, a speech bubble), HE DRAWS.
 * (the brush paints, a splash, SWOOSH!), THEN HE MAKES IT MOVE. (his run cycle stepping across speed
 * lines, the flipbook), YOUR IDEA COULD BE NEXT. (a leap, BOING!, a button to say hi). Captions
 * are printed slightly off-register; the sound effects pop with an overshoot.
 */
export function initComic(root: HTMLElement) {
  const panels = [...root.querySelectorAll<HTMLElement>('.panel')];
  const [p1, p2, p3, p4] = panels;
  const splat = stickerUrl('splat');
  panels.forEach((p) => { p.style.setProperty('--splat', `url(${splat})`); });

  // panel contents
  const wave = p1.querySelector<HTMLImageElement>('.pboy')!;
  const brush = sticker(p2, 'brush', 'c-brush'), red = sticker(p2, 'paintred', 'c-splash'), yel = sticker(p2, 'paintyellow', 'c-splash2');
  const flip = sticker(p3, 'flipbook', 'c-flip');
  const runner = document.createElement('img'); runner.className = 'c-run'; runner.alt = ''; p3.querySelector('.strip')!.append(runner);
  const leap = p4.querySelector<HTMLImageElement>('.pboy')!;
  const boing = sticker(p4, 'boing', 'c-boing');
  for (const s of [brush, red, yel, flip, boing]) gsap.set(s.inner, { scale: 1 });
  const sfx = [...root.querySelectorAll<HTMLElement>('.sfx')].map((s) => splitChars(s, 'sx'));
  const caps = [...root.querySelectorAll<HTMLElement>('.cap')];

  // each panel: the splat grows over it, then its own entrance
  const entrances = [
    () => gsap.timeline().from(wave, { yPercent: 40, opacity: 0, duration: 0.5, ease: 'back.out(2)' }).from(p1.querySelector('.bubble'), { scale: 0, rotation: -12, duration: 0.6, ease: 'back.out(2.6)', transformOrigin: '10% 100%' }, 0.2),
    () => gsap.timeline().from(brush.host, { xPercent: -160, rotation: -30, duration: 0.7, ease: 'power3.out' }).from([red.inner, yel.inner], { scale: 0, rotation: 90, duration: 0.6, ease: 'back.out(2.4)', stagger: 0.12 }, 0.35),
    () => gsap.timeline().from(flip.inner, { scale: 0, rotation: -60, duration: 0.6, ease: 'back.out(2.4)' }),
    () => gsap.timeline().from(leap, { yPercent: 60, rotation: -15, opacity: 0, duration: 0.6, ease: 'back.out(1.8)' }).from(boing.inner, { scale: 0, rotation: 30, duration: 0.7, ease: 'back.out(2.6)' }, 0.15).from(p4.querySelector('.cta'), { scale: 0, duration: 0.5, ease: 'back.out(3)' }, 0.35),
  ];
  const sfxOf = [null, sfx[0], sfx[1], null];
  panels.forEach((p, i) => {
    gsap.set(p, { '--m': '0%' });
    gsap.set(caps[i], { yPercent: -120, opacity: 0 });
    ScrollTrigger.create({
      trigger: p, start: 'top 82%', once: true,
      onEnter: () => {
        const tl = gsap.timeline();
        tl.to(p, { '--m': '420%', duration: 1.1, ease: 'power3.in' })
          .to(caps[i], { yPercent: 0, opacity: 1, duration: 0.5, ease: 'back.out(2.4)' }, 0.35)
          .add(entrances[i](), 0.45);
        const s = sfxOf[i];
        if (s) tl.fromTo(s, { scale: 0, rotation: () => gsap.utils.random(-30, 30) }, { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(3)', stagger: 0.05 }, 0.75);
      },
    });
  });

  // living drawings: he waves on threes, the runner steps on twos across the panel, the leap bobs
  let stop = () => {};
  whileVisible(root, () => {
    if (calm) return;
    let f = 0;
    const id = window.setInterval(() => {
      f++;
      wave.src = url(`bye_${Math.floor(f / 3) % 4}`);
      runner.src = url(`run8_${Math.floor(f / 2) % 8}`);
      runner.style.left = `${((Math.floor(f / 2) * 3.2) % 120) - 10}%`;
    }, 1000 / 24);
    const bob = gsap.to(leap, { y: -10, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    stop = () => { clearInterval(id); bob.kill(); };
  }, () => stop());
  wave.src = url('bye_0'); runner.src = url('run8_0'); leap.src = url('leap_3');
}
