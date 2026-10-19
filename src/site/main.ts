import './site.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import Lenis from 'lenis';
import { preloader } from './preloader';
import { hero } from './hero';
import { statement } from './statement';
import { playground } from './playground';
import { marquee } from './marquee';
import { contact } from './contact';
import { mascot } from './mascot';
import { cursor } from './cursor';
gsap.registerPlugin(ScrollTrigger,SplitText,Flip);
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const reduced=motion.matches;
const lenis=reduced?null:new Lenis({duration:1.05,smoothWheel:true,anchors:true});
lenis?.on('scroll',ScrollTrigger.update);
if(lenis){gsap.ticker.add(time=>lenis.raf(time*1000));gsap.ticker.lagSmoothing(0);}
function lock(locked:boolean){if(locked){lenis?.stop();document.documentElement.style.overflow='hidden';}else{document.documentElement.style.overflow='';lenis?.start();}}
playground(reduced,lock);
mascot(reduced);
cursor(reduced);
contact(reduced,()=>{if(lenis)lenis.scrollTo(0,{duration:1.1,easing:t=>1-Math.pow(1-t,4)});else window.scrollTo({top:0,behavior:'instant'});});
void preloader(reduced,()=>{hero(reduced);statement(reduced);marquee(reduced);ScrollTrigger.refresh();});
motion.addEventListener('change',()=>location.reload());
window.addEventListener('load',()=>ScrollTrigger.refresh());
