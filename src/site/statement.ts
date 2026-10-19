import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
export function statement(reduced: boolean) {
  if (reduced) return;
  const split = SplitText.create('.statement h2',{type:'words',wordsClass:'word'});
  gsap.to(split.words,{color:(_i,target:HTMLElement)=>target.closest('em')?'#e8432a':'#121110',opacity:1,stagger:.16,duration:.3,ease:'none',scrollTrigger:{trigger:'.statement h2',start:'top 78%',end:'bottom 40%',scrub:true}});
}
