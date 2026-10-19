import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
export function marquee(reduced: boolean) {
  if(reduced)return;
  const marquee=document.querySelector<HTMLElement>('.marquee')!;
  let speed=35,x=0,visible=false;
  ScrollTrigger.create({trigger:'.marquee-section',start:'top bottom',end:'bottom top',onToggle:s=>{visible=s.isActive;},onUpdate:s=>{const v=s.getVelocity();if(Math.abs(v)>10)speed=Math.sign(v)*Math.min(350,35+Math.abs(v)*.1);}});
  gsap.ticker.add((_time,delta)=>{
    if(!visible||document.hidden)return;
    const width=marquee.scrollWidth/3;x-=speed*Math.min(delta,50)/1000;
    x=((x%width)-width)%width;gsap.set(marquee,{x});speed=gsap.utils.interpolate(speed,Math.sign(speed)*35,.025);
  });
  gsap.fromTo('.marquee-section',{backgroundColor:'#121110',color:'#f1eee7'},{backgroundColor:'#e8432a',color:'#121110',ease:'none',scrollTrigger:{trigger:'.marquee-section',start:'top bottom',end:'top 25%',scrub:true}});
  gsap.fromTo('.contact',{backgroundColor:'#e8432a'},{backgroundColor:'#f1eee7',ease:'none',scrollTrigger:{trigger:'.contact',start:'top bottom',end:'top 20%',scrub:true}});
}
