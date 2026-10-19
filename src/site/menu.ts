import gsap from 'gsap';
import { brush } from './ink';
export function menu(_reduced:boolean,lock:(locked:boolean)=>void){
  const panel=document.querySelector<HTMLDialogElement>('.menu-panel')!,toggle=document.querySelector<HTMLButtonElement>('.menu-toggle')!;
  let busy=false;
  function close(){
    if(busy||!panel.open)return;busy=true;toggle.setAttribute('aria-expanded','false');
    gsap.to(panel,{clipPath:'circle(0% at 100% 0%)',duration:.55,ease:'expo.inOut',onComplete:()=>{panel.close();lock(false);busy=false;toggle.focus();}});
  }
  toggle.addEventListener('click',()=>{
    if(panel.open||busy)return;
    lock(true);panel.showModal();toggle.setAttribute('aria-expanded','true');
    gsap.fromTo(panel,{clipPath:'circle(0% at 100% 0%)'},{clipPath:'circle(150% at 100% 0%)',duration:.8,ease:'expo.inOut'});
    panel.querySelectorAll<HTMLElement>('nav a').forEach((el,i)=>brush(el,.15+i*.1));
    panel.querySelector<HTMLButtonElement>('.menu-close')!.focus();
  });
  panel.querySelector('.menu-close')!.addEventListener('click',close);
  panel.addEventListener('cancel',event=>{event.preventDefault();close();});
  panel.querySelectorAll<HTMLAnchorElement>('nav a').forEach(link=>link.addEventListener('click',event=>{
    if(!link.hash)return;event.preventDefault();
    const target=document.querySelector(link.hash);close();
    if(target)gsap.delayedCall(.56,()=>target.scrollIntoView({behavior:'instant'}));
  }));
}
