import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { calm } from './motion';
export function startFx(){
 let blot:HTMLDivElement|null=null;
 addEventListener('pointerdown',e=>{
 if(blot){gsap.killTweensOf(blot);blot.remove();}
 const drop=document.createElement('div');blot=drop;drop.className='ink-drop';drop.style.left=`${e.clientX}px`;drop.style.top=`${e.clientY}px`;document.body.append(drop);
 gsap.fromTo(drop,{scale:0,opacity:.8},{scale:1,opacity:0,duration:.6,ease:'power2.out',onComplete:()=>drop.remove()});
 });
 if(!calm){
 const letters=document.querySelectorAll('.hero-word');
 ScrollTrigger.create({onUpdate:s=>{const skew=gsap.utils.clamp(-3,3,s.getVelocity()/-700);gsap.to(letters,{skewY:skew,duration:.2,overwrite:true});gsap.to(letters,{skewY:0,duration:.6,delay:.2,overwrite:'auto'});}});
 }
}
