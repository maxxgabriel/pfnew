import gsap from 'gsap';
import { load } from './art';
export async function preloader(reduced:boolean,ready:()=>void){
  const loader=document.querySelector<HTMLElement>('.loader')!;
  if(reduced){await document.fonts.ready;loader.remove();ready();return;}
  const counter=document.querySelector<HTMLElement>('.counter')!;
  counter.innerHTML=Array.from({length:3},()=>`<div class="digit">${Array.from({length:4},(_,i)=>`<div class="digit-slice" style="--slice-top:${i*25}%;--slice-bottom:${75-i*25}%"><div class="digit-column">${Array.from({length:11},(_,n)=>`<span>${n%10}</span>`).join('')}</div></div>`).join('')}</div>`).join('');
  const digits=Array.from(counter.children).map(el=>Array.from(el.querySelectorAll<HTMLElement>('.digit-column')));
  let previous='000';
  const state={value:0};
  const roll=()=>{
    const next=String(Math.floor(state.value)).padStart(3,'0');
    digits.forEach((columns,i)=>{
      if(next[i]===previous[i])return;
      const value=Number(next[i]);
      columns.forEach((column,slice)=>{
        const wrap=value===0&&previous[i]==='9';
        gsap.to(column,{y:`${-(wrap?10:value)}em`,x:0,duration:.13,ease:'power2.inOut',overwrite:true,onComplete:()=>{if(wrap)gsap.set(column,{y:0});}});
        gsap.fromTo(column,{x:(slice%2?1:-1)*(7+slice*3)},{x:0,duration:.13,ease:'power2.out',overwrite:'auto'});
      });
    });previous=next;
  };
  await document.fonts.ready;
  void Promise.all(['idle_0','home_3','cm_space','cm_moon','run8_0','ink_far'].map(load));
  gsap.timeline({onComplete:()=>{loader.remove();ready();}})
    .to(state,{value:100,duration:2.5,ease:'none',onUpdate:roll})
    .to({}, {duration:.22})
    .to('.digit-column',{x:(i)=>i%2?150:-150,yPercent:-30,opacity:0,stagger:.012,duration:.4,ease:'expo.in'})
    .to(loader,{opacity:0,duration:.15});
}
