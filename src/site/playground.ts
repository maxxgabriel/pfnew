import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { background, pose } from './art';
export const pieces = [
  ['The Sketch','A little ink drawing. An entire world to get lost in.','SCROLL-DRIVEN FILM','01'],
  ['Six styles','One character, seven ways of seeing. A study in transformation.','STYLE EXPLORATION','02'],
  ['The duel','Two blades beneath a comic moon. Timing is everything.','FRAME BY FRAME','03'],
  ['Living worlds','Painted places with a life of their own.','PARALLAX STUDY','04'],
  ['The run','Finding rhythm, one hand-drawn stride at a time.','SCROLL × VELOCITY','05'],
  ['Fire kick','A wind-up, a held breath, a release of energy.','ACTION STUDY','06'],
];
export function playground(reduced: boolean, lock: (locked: boolean) => void) {
  const track = document.querySelector<HTMLElement>('.gallery-track')!;
  track.innerHTML = pieces.map(([title,,tag,n],i)=>`<article class="piece-card"><button class="piece-open" type="button" data-piece="${i}" aria-label="Open ${title}"><div class="piece-art"><canvas role="img" aria-label="${title}: live hand drawn animation"></canvas><span class="art-label">EXPERIMENT ${n} / ${tag}</span><span class="art-corner" aria-hidden="true">↗</span></div><div class="card-caption"><h3>${title}</h3><span>${tag} / ${n}</span></div></button></article>`).join('');
  const cards = gsap.utils.toArray<HTMLElement>('.piece-card');
  const dialog = document.querySelector<HTMLDialogElement>('.piece-dialog')!;
  const slot = document.querySelector('.piece-slot')!;
  let active: HTMLElement | null = null, origin: HTMLElement | null = null, opener: HTMLButtonElement | null = null, busy = false;
  const close = () => {
    if (!active || !origin || busy) return;
    busy = true;
    active.querySelector('iframe')?.remove();
    const art = active, home = origin, button = opener;
    const state = Flip.getState(art);
    dialog.close();
    home.prepend(art);
    Flip.from(state,{duration:reduced?0:.65,ease:'expo.inOut',absolute:true,onComplete:()=>{lock(false);active=null;busy=false;button?.focus();}});
  };
  document.querySelector<HTMLButtonElement>('.close-piece')!.addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  cards.forEach((card,i)=>{
    const button = card.querySelector<HTMLButtonElement>('button')!;
    button.addEventListener('click',()=>{
      if (busy || active) return;
      busy=true; opener=button; origin=button; active=button.querySelector<HTMLElement>('.piece-art')!;
      const state = Flip.getState(active);
      document.querySelector('#piece-title')!.textContent=pieces[i][0];
      document.querySelector('#piece-description')!.textContent=pieces[i][1];
      lock(true); dialog.showModal(); slot.append(active);
      Flip.from(state,{duration:reduced?0:.8,ease:'expo.inOut',absolute:true,onComplete:()=>{
        busy=false;
        if(i===0 && active){const frame=document.createElement('iframe');frame.title='The Sketch — interactive scroll film';frame.src='./film.html';active.append(frame);}
        document.querySelector<HTMLButtonElement>('.close-piece')!.focus();
      }});
    });
  });
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px) and (min-height: 601px) and (prefers-reduced-motion: no-preference)',()=>{
    const distance = () => Math.max(0,track.scrollWidth-window.innerWidth);
    const travel = gsap.to(track,{x:()=>-distance(),ease:'none',scrollTrigger:{trigger:'.playground',pin:'.gallery-stage',start:'top top',end:()=>`+=${distance()}`,scrub:1,invalidateOnRefresh:true}});
    cards.forEach(card=>{
      gsap.fromTo(card.querySelector('.piece-art'),{clipPath:'inset(12% 16% 12% 16%)'},{clipPath:'inset(0% 0% 0% 0%)',ease:'power4.out',scrollTrigger:{trigger:card,containerAnimation:travel,start:'left 95%',end:'left 45%',scrub:true}});
      gsap.fromTo(card.querySelector('canvas'),{xPercent:-5,scale:1.13},{xPercent:5,ease:'none',scrollTrigger:{trigger:card,containerAnimation:travel,start:'left right',end:'right left',scrub:true}});
    });
  });
  mm.add('(max-width: 899px), (max-height: 600px)',()=>{
    if(reduced)return;
    cards.forEach(card=>gsap.from(card.querySelector('.piece-art'),{clipPath:'inset(12% 10% 12% 10%)',y:35,opacity:.4,duration:.9,ease:'power4.out',scrollTrigger:{trigger:card,start:'top 90%',end:'top 45%',scrub:1}}));
  });
  let velocity=0, progress=0;
  ScrollTrigger.create({trigger:'.playground',start:'top bottom',end:'bottom top',onUpdate:s=>{velocity=s.getVelocity();progress=s.progress;}});
  cards.forEach((card,index)=>{
    const canvas=card.querySelector('canvas')!, ctx=canvas.getContext('2d')!;
    let visible=false,last=-1;
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'150px'});observer.observe(canvas);
    const draw=(time:number)=>{
      if(!visible || document.hidden)return;
      const tick=Math.floor(time*10); if(tick===last)return;last=tick;
      const step=reduced?0:tick;
      const rect=canvas.getBoundingClientRect(), w=Math.round(rect.width), h=Math.round(rect.height), dpr=Math.min(devicePixelRatio,1.5);
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      ctx.fillStyle=['#e3dfd4','#e8432a','#202335','#a9c4cb','#e5dfcf','#eebd76'][index];ctx.fillRect(0,0,w,h);
      const t=reduced?0:time;
      if(index===0){background(ctx,'ink_far',w,h,Math.sin(t*.25)*10);background(ctx,'ink_mid',w,h,Math.sin(t*.3)*15);pose(ctx,`idle_${step%4}`,w*.5,h*.85,h*.53);}
      if(index===1){const styles=['','pixel-','water-','clay-','chalk-','comic-','hose-'];const s=styles[Math.floor(t*1.2)%7];pose(ctx,`${s}home_3`,w*.5,h*.87,h*.64);ctx.font='bold 13px Archivo, sans-serif';ctx.fillStyle='#121110';ctx.fillText((s.replace('-','')||'ink').toUpperCase(),22,h-25);}
      if(index===2){background(ctx,'cm_space',w,h);background(ctx,'cm_moon',w,h,Math.sin(t*.25)*8);pose(ctx,`saber_${step%6}`,w*.4,h*.87,h*.48);pose(ctx,`saber_${(step+3)%6}`,w*.68,h*.87,h*.48,true);}
      if(index===3){const worlds=[['px_sky','px_far','px_mid'],['wc_sky','wc_sea_far','wc_sea_near'],['cm_space','cm_earth'],['hs_sky','hs_cloud_far','hs_cloud_near']];worlds[Math.floor(t/4)%4].forEach((layer,j)=>background(ctx,layer,w,h,Math.sin(t*.35+j)*j*9));}
      if(index===4){ctx.strokeStyle='#121110';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.08,h*.83);ctx.lineTo(w*.92,h*.83);ctx.stroke();const f=reduced?0:Math.floor(t*5+progress*120+Math.abs(velocity)*.002)%8;pose(ctx,`${Math.abs(velocity)>1800?'sprint8':'run8'}_${f}`,w*.5,h*.83,h*.56,velocity<0);}
      if(index===5){const f=step%11;pose(ctx,f<3?`ftkick_${f}`:`firetornado_${f-3}`,w*.5,h*.87,h*.63);}
    };
    gsap.ticker.add(draw);
  });
}
