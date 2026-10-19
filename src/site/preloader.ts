import gsap from 'gsap';
import { startInk,openBrush,hiddenBrush } from './ink';
export async function preloader(_reduced:boolean,ready:()=>void){
 startInk();await document.fonts.ready;
 const loader=document.querySelector<HTMLElement>('.loader')!,counter=loader.querySelector('.counter')!;
 const stroke=document.createElement('div');stroke.className='loader-stroke';loader.append(stroke);
 const state={value:0};
 gsap.timeline({onComplete:()=>{loader.remove();ready();}})
 .to(state,{value:100,duration:2.3,ease:'power1.inOut',onUpdate:()=>{counter.textContent=String(Math.floor(state.value)).padStart(3,'0');}})
 .fromTo(stroke,{clipPath:hiddenBrush},{clipPath:openBrush,duration:.5,ease:'expo.inOut'})
 .to(loader,{clipPath:'inset(100% 0 0 0)',duration:.6,ease:'expo.inOut'});
}
