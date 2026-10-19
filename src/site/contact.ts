import gsap from 'gsap';
import { brush } from './ink';
import { url } from './art';
export function contact(_reduced:boolean,top:()=>void){
 document.querySelector('.back-top')!.addEventListener('click',top);
 gsap.from('.contact-pill',{y:100,scale:.85,duration:1,ease:'back.out(1.8)',scrollTrigger:{trigger:'.contact',start:'top 75%',once:true,onEnter:()=>brush(document.querySelector('.contact h2')!)}});
 gsap.fromTo('.hanko',{scale:2.4,opacity:0,rotation:-24},{scale:1,opacity:1,rotation:-8,duration:.24,ease:'power4.in',scrollTrigger:{trigger:'.contact',start:'top 55%',once:true},onComplete:()=>{
 gsap.to('.hanko',{keyframes:[{x:-5,y:2},{x:4,y:-2},{x:0,y:0}],duration:.16,ease:'steps(2)'});
 gsap.fromTo('main',{y:7},{y:0,duration:.24,ease:'steps(2)',clearProps:'transform'});
 }});
 document.querySelectorAll<HTMLImageElement>('.footer .mountain').forEach((el,i)=>el.src=url(i?'ink_mid':'ink_far'));
 gsap.fromTo('.signature',{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)',ease:'none',scrollTrigger:{trigger:'.footer',start:'top 85%',end:'bottom bottom',scrub:true}});
}
