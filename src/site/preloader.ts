import gsap from 'gsap';
import { load } from './art';
export async function preloader(reduced: boolean, ready: () => void) {
  const loader = document.querySelector<HTMLElement>('.loader')!;
  if (reduced) { loader.remove(); ready(); return; }
  const counter = document.querySelector('.counter')!;
  const state = { value: 0 };
  let done = 0;
  const names = ['idle_0','home_3','cm_space','cm_moon','run8_0','ink_far'];
  const update = () => { counter.textContent = String(Math.round(state.value)).padStart(3,'0'); };
  await Promise.all([Promise.all(names.map(async name => { await load(name); done++; gsap.to(state,{value:done/names.length*100,duration:.3,onUpdate:update}); })), document.fonts.ready, new Promise(resolve => setTimeout(resolve,650))]);
  gsap.timeline({onComplete:() => {loader.remove(); ready();}})
    .to(state,{value:100,duration:.25,onUpdate:update})
    .to('.counter',{yPercent:110,opacity:0,duration:.45,ease:'power4.in'})
    .to('.loader-label,.loader-bottom',{opacity:0,duration:.15},'<')
    .to('.curtain:first-child',{xPercent:-101,duration:.85,ease:'expo.inOut'},'curtain')
    .to('.curtain:nth-child(2)',{xPercent:101,duration:.85,ease:'expo.inOut'},'curtain');
}
