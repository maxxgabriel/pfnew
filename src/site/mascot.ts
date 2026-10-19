import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { url } from './art';
export function mascot(_reduced:boolean){
 const boy=document.querySelector<HTMLImageElement>('.hero-boy')!,runner=document.querySelector<HTMLImageElement>('.runner')!,wave=document.querySelector<HTMLImageElement>('.wave')!;
 const services=Array.from(document.querySelectorAll<HTMLImageElement>('.service-boy')),menu=Array.from(document.querySelectorAll<HTMLImageElement>('.menu-panel nav img'));
 let last=0,frame=0,velocity=0,lastScroll=0,x=12;
 boy.src=url('idle_0');runner.src=url('idle_0');wave.src=url('bye_0');
 ScrollTrigger.create({onUpdate:s=>{velocity=s.getVelocity();lastScroll=performance.now();runner.style.transform=`scaleX(${velocity<0?-1:1})`;}});
 gsap.to(boy,{y:160,x:80,rotation:20,opacity:0,ease:'power2.in',scrollTrigger:{trigger:'.hero',start:'top top',end:'65% top',scrub:true}});
 gsap.ticker.add(time=>{
 if(document.hidden||time-last<1/(8+Math.min(8,Math.abs(velocity)/500)))return;last=time;frame++;
 const running=performance.now()-lastScroll<180;
 if(running){x=gsap.utils.clamp(5,85,x+Math.sign(velocity)*Math.min(2,Math.abs(velocity)/2000));runner.style.left=`${x}%`;}
 runner.src=url(running?`run8_${frame%8}`:`idle_${frame%4}`);
 boy.src=url(`idle_${frame%4}`);wave.src=url(`bye_${frame%4}`);
 services.forEach((el,i)=>{el.src=url(i===1?`run8_${frame%8}`:i===2?`wave_${frame%3}`:`idle_${frame%4}`);});
 if(document.querySelector<HTMLDialogElement>('.menu-panel')!.open)menu.forEach((el,i)=>el.src=url(`idle_${(frame+i)%4}`));
 });
}
