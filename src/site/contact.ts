import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
export function contact(reduced: boolean, top: () => void) {
  if(!reduced){
    const split=SplitText.create('.contact h2',{type:'words,chars',charsClass:'char'});
    gsap.from(split.chars,{yPercent:85,rotation:5,opacity:0,stagger:.018,duration:.85,ease:'expo.out',scrollTrigger:{trigger:'.contact h2',start:'top 82%'}});
  }
  const copy=document.querySelector<HTMLButtonElement>('.copy')!,status=document.querySelector<HTMLElement>('.copy-status')!;
  copy.addEventListener('click',async()=>{
    try {await navigator.clipboard.writeText('hello@example.com');status.textContent='Copied. Let’s get something moving.';if(!reduced)gsap.fromTo(status,{y:10,opacity:0},{y:0,opacity:1,duration:.5,ease:'expo.out'});}
    catch {status.textContent='Email: hello@example.com — select the address to copy.';}
  });
  document.querySelector('.back-top')!.addEventListener('click',top);
}
