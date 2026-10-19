import logo from '../site/art/logo_ink.webp';
import type { District } from './types';
export function createHud(districts:District[],go:(i:number)=>void){
 const hud=document.querySelector<HTMLElement>('#hud')!;
 hud.innerHTML=`<button class="wordmark" aria-label="Back to Ink"><img src="${logo}" alt="Max Gabriel"></button><div class="top-right"><span class="district">Ink</span><button class="menu-toggle" aria-expanded="false" aria-controls="world-menu">MENU</button></div><nav id="world-menu" aria-label="Districts" hidden><ol>${districts.map((d,i)=>`<li><button data-district="${i}"><small>0${i+1}</small>${d.name}<span>↗</span></button></li>`).join('')}</ol></nav><div class="scroll-hint">scroll to wander <span>↓</span></div><div class="progress" role="progressbar" aria-label="Journey progress" aria-valuemin="0" aria-valuemax="100"><i></i></div>`;
 const menu=hud.querySelector<HTMLElement>('nav')!,toggle=hud.querySelector<HTMLButtonElement>('.menu-toggle')!,label=hud.querySelector<HTMLElement>('.district')!,progress=hud.querySelector<HTMLElement>('.progress')!;
 const close=()=>{menu.hidden=true;toggle.textContent='MENU';toggle.setAttribute('aria-expanded','false');};
 toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.textContent=menu.hidden?'MENU':'CLOSE ×';toggle.setAttribute('aria-expanded',String(!menu.hidden));};
 hud.querySelector<HTMLButtonElement>('.wordmark')!.onclick=()=>{close();go(0);};
 hud.querySelectorAll<HTMLButtonElement>('[data-district]').forEach(b=>b.onclick=()=>{close();go(Number(b.dataset.district));});
 window.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 let name='';return (d:District,p:number)=>{hud.dataset.dark=String(d.key==='chalk'||d.key==='comic');if(name!==d.name){name=d.name;label.textContent=name;label.getAnimations().forEach(a=>a.cancel());label.animate([{clipPath:'inset(0 100% 0 0)',transform:'rotate(-5deg)'},{clipPath:'inset(0 0% 0 0)',transform:'rotate(-2deg)'}],{duration:550,fill:'both'});}progress.style.setProperty('--p',String(p));progress.setAttribute('aria-valuenow',String(Math.round(p*100)));if(p>.002)hud.classList.add('moved');};
}
