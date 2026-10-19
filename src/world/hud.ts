import logo from '../site/art/logo_ink.webp';
import type { District } from './types';
export function createHud(districts:District[],go:(i:number)=>void){
 const hud=document.querySelector<HTMLElement>('#hud')!;
 hud.innerHTML=`<button class="wordmark" aria-label="Back to Ink"><img src="${logo}" alt="Max Gabriel"></button><div class="top-right"><span class="district">Ink</span><button class="menu-toggle" aria-expanded="false" aria-controls="world-menu">MENU</button></div><nav id="world-menu" aria-label="Districts" hidden><ol>${districts.map((d,i)=>`<li><button data-district="${i}"><small>0${i+1}</small>${d.name}<span>↗</span></button></li>`).join('')}</ol></nav><div class="scroll-hint">scroll to wander <span>↓</span></div><div class="progress" role="progressbar" aria-label="Journey progress" aria-valuemin="0" aria-valuemax="100"><i></i></div>`;
 const menu=hud.querySelector<HTMLElement>('nav')!,toggle=hud.querySelector<HTMLButtonElement>('.menu-toggle')!,label=hud.querySelector<HTMLElement>('.district')!,progress=hud.querySelector<HTMLElement>('.progress')!;
 let savedOverflow='';
 const close=()=>{if(menu.hidden)return;menu.hidden=true;document.body.style.overflow=savedOverflow;hud.classList.remove('menu-open');toggle.textContent='MENU';toggle.setAttribute('aria-expanded','false');toggle.focus({preventScroll:true});};
 toggle.onclick=()=>{if(!menu.hidden){close();return;}savedOverflow=document.body.style.overflow;document.body.style.overflow='hidden';menu.hidden=false;hud.classList.add('menu-open');toggle.textContent='CLOSE ×';toggle.setAttribute('aria-expanded','true');menu.querySelector('button')?.focus({preventScroll:true});};
 menu.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const buttons=Array.from(menu.querySelectorAll<HTMLButtonElement>('button'));const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();toggle.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();toggle.focus();}});
 toggle.addEventListener('keydown',e=>{if(e.key==='Tab'&&!menu.hidden){e.preventDefault();const buttons=menu.querySelectorAll<HTMLButtonElement>('button');buttons[e.shiftKey?buttons.length-1:0]?.focus();}});
 hud.querySelector<HTMLButtonElement>('.wordmark')!.onclick=()=>{close();go(0);};
 hud.querySelectorAll<HTMLButtonElement>('[data-district]').forEach(b=>b.onclick=()=>{close();go(Number(b.dataset.district));});
 window.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 let name='';return (d:District,p:number)=>{hud.dataset.dark=String(d.key==='chalk'||d.key==='comic');if(name!==d.name){name=d.name;label.textContent=name;label.getAnimations().forEach(a=>a.cancel());label.animate([
 {clipPath:'polygon(0 0,0 0,0 22%,0 39%,0 62%,0 81%,0 100%,0 100%)',transform:'translateX(-6px) rotate(-5deg)'},
 {clipPath:'polygon(0 0,65% 0,53% 22%,72% 39%,57% 62%,68% 81%,51% 100%,0 100%)',offset:.55},
 {clipPath:'polygon(0 0,100% 0,100% 22%,100% 39%,100% 62%,100% 81%,100% 100%,0 100%)',transform:'translateX(0) rotate(-2deg)'}
 ],{duration:650,fill:'both',easing:'cubic-bezier(.2,.65,.25,1)'});}progress.style.setProperty('--p',String(p));progress.setAttribute('aria-valuenow',String(Math.round(p*100)));if(p>.002)hud.classList.add('moved');};
}
