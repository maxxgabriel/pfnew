import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { url } from './art';
export function mascot(reduced: boolean) {
  const peek=document.querySelector<HTMLImageElement>('.hero-boy')!, runner=document.querySelector<HTMLImageElement>('.runner')!, wave=document.querySelector<HTMLImageElement>('.wave')!;
  peek.src=url('idle_0'); runner.src=url('run8_0');wave.src=url('bye_0');
  if(reduced)return;
  gsap.from(peek,{y:140,rotation:12,delay:.8,duration:1.3,ease:'expo.out'});
  let velocity=0, progress=0, running=false,waving=false,frame=0,last=0;
  const duck=gsap.quickTo(peek,'y',{duration:.35,ease:'power4.out'});
  ScrollTrigger.create({trigger:'.hero',start:'top top',end:'bottom top',onUpdate:s=>duck(Math.abs(s.getVelocity())>1100?110:0)});
  ScrollTrigger.create({trigger:'.playground',start:'top bottom',end:'bottom top',onToggle:s=>{running=s.isActive;},onUpdate:s=>{velocity=s.getVelocity();progress=s.progress;gsap.set(runner,{left:`${8+progress*80}%`,scaleX:velocity<0?-1:1});}});
  ScrollTrigger.create({trigger:'.contact',start:'top bottom',end:'bottom top',onToggle:s=>{waving=s.isActive;}});
  gsap.ticker.add(time=>{
    if(document.hidden)return;
    const fps=gsap.utils.clamp(4,22,Math.abs(velocity)/150+4);
    if(time-last<1/fps)return;last=time;frame++;
    if(running)runner.src=url(`run8_${frame%8}`);
    if(waving)wave.src=url(`bye_${frame%4}`);
    velocity*=.88;
  });
}
