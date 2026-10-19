import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
export function statement(reduced:boolean){
  if(reduced)return;
  const services=Array.from(document.querySelectorAll<HTMLElement>('.service'));
  let active=-1;
  const select=(index:number)=>{
    if(index===active)return;active=index;
    services.forEach((service,i)=>{
      service.classList.toggle('active',i===index);
      gsap.to(service.querySelector('h3'),{scale:i===index?1.035:1,duration:.4,ease:'power3.out',overwrite:true});
      if(i===index)gsap.fromTo(service.querySelectorAll('.service-sticker,.service-boy,.service-spark'),{scale:.1,rotation:-18},{scale:1,rotation:0,duration:.75,stagger:.06,ease:'elastic.out(1,.45)',overwrite:true});
    });
  };
  services.forEach((service,i)=>ScrollTrigger.create({trigger:service,start:'top 60%',end:'bottom 35%',onEnter:()=>select(i),onEnterBack:()=>select(i)}));
  select(0);
}
