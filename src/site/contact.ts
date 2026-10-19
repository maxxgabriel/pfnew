import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { styles, setArt } from './design';
export function contact(reduced:boolean,top:()=>void){
  document.querySelector('.back-top')!.addEventListener('click',top);
  if(!reduced){
    gsap.from('.contact-pill',{y:150,scale:.82,duration:1.3,ease:'elastic.out(1,.6)',scrollTrigger:{trigger:'.contact',start:'top 78%'}});
    gsap.fromTo('.footer',{y:100,borderTopLeftRadius:'45%',borderTopRightRadius:'45%'},{y:0,borderTopLeftRadius:0,borderTopRightRadius:0,ease:'none',scrollTrigger:{trigger:'.footer',start:'top bottom',end:'top top',scrub:true}});
  }
  const logo=document.querySelector<HTMLElement>('.living-word')!;
  setArt(logo,'logo_ink');
  if(reduced)return;
  let index=0,last=0,visible=false;
  ScrollTrigger.create({trigger:'.footer',start:'top bottom',end:'bottom top',onToggle:s=>{visible=s.isActive;}});
  gsap.ticker.add(time=>{
    if(!visible||document.hidden||time-last<.8)return;last=time;index=(index+1)%styles.length;
    logo.dataset.style=styles[index];logo.innerHTML='<span>MAX<br>GABRIEL</span>';setArt(logo,`logo_${styles[index]}`);
    gsap.fromTo(logo,{scaleX:1.12,scaleY:.65,rotation:-3},{scaleX:1,scaleY:1,rotation:0,duration:.65,ease:'elastic.out(1,.4)',overwrite:true});
    gsap.fromTo('.logo-spark',{scale:.1,rotation:-30},{scale:1,rotation:20,duration:.5,ease:'back.out(2)',overwrite:true});
  });
}
