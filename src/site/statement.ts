import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wet } from './ink';
export function statement(_reduced:boolean){
 const services=Array.from(document.querySelectorAll<HTMLElement>('.service'));
 services.forEach(service=>{
 const line=document.createElement('span');line.className='service-line';line.setAttribute('aria-hidden','true');service.append(line);
 const activate=()=>{services.forEach(s=>s.classList.toggle('active',s===service));wet(service.querySelector('h3')!);gsap.fromTo(service.querySelector('.service-boy'),{scale:0,rotation:-14},{scale:1,rotation:0,duration:.7,ease:'back.out(2)'});};
 ScrollTrigger.create({trigger:service,start:'top 60%',end:'bottom 40%',onEnter:activate,onEnterBack:activate});
 gsap.fromTo(line,{scaleX:0},{scaleX:1,ease:'none',scrollTrigger:{trigger:service,start:'top 65%',end:'center 45%',scrub:true}});
 });
}
