import '@fontsource/anton';
import '@fontsource/inter';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './site.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import Lenis from 'lenis';
import { preloader } from './preloader';
import { hero } from './hero';
import { statement } from './statement';
import { playground } from './playground';
import { marquee } from './marquee';
import { contact } from './contact';
import { mascot } from './mascot';
import { menu } from './menu';
import { hydrateArt } from './design';
import { startLife } from './life';
gsap.registerPlugin(ScrollTrigger,Flip);
const motion=matchMedia('(prefers-reduced-motion: reduce)'),reduced=motion.matches;
const lenis=reduced?null:new Lenis({duration:1.05,smoothWheel:true,anchors:true});
lenis?.on('scroll',ScrollTrigger.update);
if(lenis){gsap.ticker.add(time=>lenis.raf(time*1000));gsap.ticker.lagSmoothing(0);}
function lock(locked:boolean){if(locked){lenis?.stop();document.documentElement.style.overflow='hidden';}else{document.documentElement.style.overflow='';lenis?.start();}}
hydrateArt();marquee(reduced);playground(reduced,lock,position=>{if(lenis)lenis.scrollTo(position,{immediate:true});else window.scrollTo({top:position,behavior:'instant'});});menu(reduced,lock);lock(true);
void preloader(reduced,()=>{
  hero(reduced);statement(reduced);mascot(reduced);
  contact(reduced,()=>{if(lenis)lenis.scrollTo(0,{duration:1.1,easing:t=>1-Math.pow(1-t,4)});else window.scrollTo({top:0,behavior:'instant'});});
  lock(false);ScrollTrigger.refresh();
  startLife();
});
motion.addEventListener('change',()=>location.reload());
window.addEventListener('load',()=>ScrollTrigger.refresh());
