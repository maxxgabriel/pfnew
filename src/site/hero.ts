import gsap from 'gsap';
import { brush } from './ink';
import { url } from './art';
import { calm } from './motion';
export function hero(_reduced:boolean){
 const words=Array.from(document.querySelectorAll<HTMLElement>('.hero-word'));
 let count=0;
 words.forEach(word=>{word.replaceChildren();for(const letter of word.dataset.word!){const span=document.createElement('span');span.className='brush-letter';span.textContent=letter;word.append(span);brush(span,count++*.06);}});
 const spark=document.createElement('span');spark.className='hero-spark';words[0].append(spark);
 gsap.fromTo(spark,{y:-innerHeight*.6,scaleX:.8,scaleY:1.3},{y:0,scaleX:1.45,scaleY:.55,duration:.65,delay:.65,ease:'power3.in',onComplete:()=>{gsap.to(spark,{scaleX:1,scaleY:1,duration:.65,ease:'elastic.out(1,.35)'});}});
 document.querySelectorAll<HTMLElement>('.hero .mountain').forEach((el,i)=>{(el as HTMLImageElement).src=url(i?'ink_mid':'ink_far');if(!calm)gsap.to(el,{yPercent:25+i*15,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});});
 const position=()=>{const max=words[0],boy=document.querySelector<HTMLElement>('.hero-boy')!;boy.style.left=`${max.offsetLeft+max.offsetWidth*.76-boy.offsetWidth*.5}px`;boy.style.top=`${max.offsetTop-boy.offsetHeight*.55}px`;};position();addEventListener('resize',position);
 gsap.to('.brush-letter',{yPercent:30,stagger:.015,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
 gsap.timeline({scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}}).to('#ink feDisplacementMap',{attr:{scale:22},duration:.6,ease:'none'}).to('#ink feDisplacementMap',{attr:{scale:5},duration:.4,ease:'none'});
}
