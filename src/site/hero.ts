import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
export function hero(reduced: boolean) {
  const title = document.querySelector<HTMLElement>('#hero-title')!;
  const measure = document.createElement('canvas').getContext('2d')!;
  const fit = () => {
    const style = getComputedStyle(title), size = parseFloat(style.fontSize);
    measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const text = title.textContent ?? 'MAX GABRIEL';
    const width = measure.measureText(text).width + (parseFloat(style.letterSpacing) || 0) * (text.length - 1);
    if (width > 0) title.style.fontSize = `${size * title.clientWidth / width}px`;
  };
  fit();
  window.addEventListener('resize',fit);
  if (reduced) return;
  const split = SplitText.create('#hero-title',{type:'chars',charsClass:'char'});
  gsap.from(split.chars,{yPercent:110,rotation:9,opacity:0,stagger:.035,duration:1.1,ease:'expo.out'});
  gsap.from('.hero-middle,.hero-top,.hero-foot',{y:25,opacity:0,stagger:.09,duration:.8,delay:.35,ease:'power4.out'});
  gsap.to('#hero-title',{yPercent:18,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
  const skew = gsap.quickTo('#hero-title','skewX',{duration:.5,ease:'power4.out'});
  ScrollTrigger.create({trigger:'.hero',start:'top top',end:'bottom top',onUpdate:s=>skew(gsap.utils.clamp(-5,5,s.getVelocity()/-500)),onLeave:()=>skew(0)});
}
