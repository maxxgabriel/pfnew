import gsap from 'gsap';
import { hiddenBrush,openBrush,wet } from './ink';
export function flood(){
 const title=document.querySelector<HTMLElement>('.flood h2')!;
 // the ink wells up while the section is still arriving, so there is never an empty screen before the flood
 gsap.set('.flood-blot',{scale:0});
 gsap.to('.flood-blot',{scale:.38,ease:'power1.in',scrollTrigger:{trigger:'.flood',start:'top 85%',end:'top top',scrub:true}});
 gsap.timeline({scrollTrigger:{trigger:'.flood',start:'top top',end:()=>`+=${innerHeight*1.3}`,pin:true,scrub:true,invalidateOnRefresh:true}})
 .to('.flood-blot',{scale:1,duration:.45,ease:'power2.inOut'})
 .fromTo(title,{clipPath:hiddenBrush},{clipPath:openBrush,duration:.25,onStart:()=>wet(title)})
 .to('.flood-ink',{clipPath:'inset(100% 0 0 0)',duration:.4,ease:'power2.inOut'},'+=.15');
}
