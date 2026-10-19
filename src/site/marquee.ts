import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { styles, setArt } from './design';
export function marquee(reduced:boolean){
  const rows=Array.from(document.querySelectorAll<HTMLElement>('.style-row'));
  const names=['Ink','Pixel','Clay','Watercolour','Chalk','Comic','Rubber hose'];
  rows.forEach((row,r)=>{
    for(let repeat=0;repeat<3;repeat++)styles.forEach((_,j)=>{
      const i=r?6-j:j,token=document.createElement('div');token.className='style-token';
      if(repeat)token.setAttribute('aria-hidden','true');
      token.innerHTML=`<div class="style-art"><span>${['✎','▦','●','≈','✧','!','◉'][i]}</span></div><p>${names[i]}</p>`;
      row.append(token);setArt(token.querySelector<HTMLElement>('.style-art')!,`style_${styles[i]}`);
    });
  });
  void reduced;
  let visible=false,speed=0;
  const offsets=[0,0];
  ScrollTrigger.create({trigger:'.styles',start:'top bottom',end:'bottom top',onToggle:s=>{visible=s.isActive;},onUpdate:s=>{speed=gsap.utils.clamp(-240,240,s.getVelocity()*.08);}});
  gsap.ticker.add((_time,delta)=>{
    if(!visible||document.hidden)return;
    rows.forEach((row,i)=>{const width=row.scrollWidth/3;offsets[i]=(offsets[i]+(32+speed)*Math.min(delta,50)/1000)%width;gsap.set(row,{x:i?offsets[i]-width:-offsets[i]});});speed*=.95;
  });
}
