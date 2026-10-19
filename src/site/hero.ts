import gsap from 'gsap';
import { slices } from './design';
export function hero(reduced:boolean){
  const words=Array.from(document.querySelectorAll<HTMLElement>('.hero-word'));
  words.forEach((word,index)=>{
    const strips=slices(word,word.dataset.word!);
    if(reduced)return;
    gsap.fromTo(strips,{x:(i)=>((i+index)%2?1:-1)*innerWidth*.75,y:(i)=>i%2?12:-12},{x:0,y:0,stagger:.055,duration:1.25,delay:index*.16,ease:'expo.out'});
    gsap.to(word,{yPercent:index?12:-15,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
  });
  const positionBoy=()=>{
    const max=words[0],boy=document.querySelector<HTMLElement>('.hero-boy')!;
    // Use the actual font box so the boy stays on the X at every aspect ratio.
    boy.style.left=`${max.offsetLeft+max.offsetWidth*.83-boy.offsetWidth*.5}px`;
    boy.style.top=`${max.offsetTop-boy.offsetHeight*.68}px`;
  };
  positionBoy();window.addEventListener('resize',positionBoy);
}
