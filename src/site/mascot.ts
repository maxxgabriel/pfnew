import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { url } from './art';
export function mascot(reduced:boolean){
  const boy=document.querySelector<HTMLImageElement>('.hero-boy')!,runner=document.querySelector<HTMLImageElement>('.runner')!,wave=document.querySelector<HTMLImageElement>('.wave')!;
  boy.src=url('idle_0');runner.src=url('run8_0');wave.src=url('bye_0');
  const serviceBoys=Array.from(document.querySelectorAll<HTMLImageElement>('.service-boy'));
  serviceBoys.forEach((el,i)=>el.src=url(['idle_0','home_3','idle_1','home_3'][i]));
  const menuBoys=Array.from(document.querySelectorAll<HTMLImageElement>('.menu-panel nav img'));
  menuBoys.forEach((el,i)=>el.src=url(`idle_${i%4}`));
  if(reduced)return;
  const hop=gsap.timeline({scrollTrigger:{trigger:'.hero',start:'top top',end:'65% top',scrub:.4}});
  hop.to(boy,{y:-80,x:35,rotation:15,duration:.25,ease:'power2.out'}).to(boy,{y:innerHeight*.8,x:150,rotation:35,opacity:0,duration:.75,ease:'power2.in'});
  let frame=0,last=0,velocity=0,running=false,waving=false;
  ScrollTrigger.create({trigger:'.playground',start:'top bottom',end:'bottom top',onToggle:s=>{running=s.isActive;},onUpdate:s=>{velocity=s.getVelocity();gsap.set(runner,{left:`${8+s.progress*80}%`,scaleX:velocity<0?-1:1});}});
  ScrollTrigger.create({trigger:'.contact',start:'top bottom',end:'bottom top',onToggle:s=>{waving=s.isActive;}});
  gsap.ticker.add(time=>{
    if(document.hidden||time-last<.15)return;last=time;frame++;
    if(boy.getBoundingClientRect().bottom>0)boy.src=url(`idle_${frame%4}`);
    if(running)runner.src=url(`run8_${frame%8}`);
    if(waving)wave.src=url(`bye_${frame%4}`);
    if(document.querySelector<HTMLDialogElement>('.menu-panel')!.open)menuBoys.forEach((el,i)=>el.src=url(`idle_${(frame+i)%4}`));
    serviceBoys.forEach((el,i)=>{if(el.closest('.active'))el.src=url(i===1?`run8_${frame%8}`:`idle_${frame%4}`);});
  });
}
