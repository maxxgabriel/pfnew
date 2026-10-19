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
export function playground(reduced: boolean, lock: (locked: boolean) => void, scrollTo: (position:number) => void) {
  const track = document.querySelector<HTMLElement>('.gallery-track')!;
  track.innerHTML = pieces.map(([title,,tag,n],i)=>`<article class="piece-card${i===0?' is-active':''}" aria-hidden="${i!==0}"><button class="piece-open" type="button" data-piece="${i}" aria-label="Open ${title}"><div class="piece-art"><canvas role="img" aria-label="${title}: live hand drawn animation"></canvas><span class="art-label">EXPERIMENT ${n} / ${tag}</span><span class="art-corner" aria-hidden="true">↗</span></div><div class="card-caption"><h3>${title}</h3><span>${tag} / ${n}</span></div></button></article>`).join('');
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
        if(i===0 && active){
          // a preview build can point at the film hosted elsewhere (VITE_FILM_URL): link out instead of embedding
          const filmUrl=import.meta.env.VITE_FILM_URL as string|undefined;
          if(filmUrl){const a=document.createElement('a');a.className='piece-film-link';a.href=filmUrl;a.target='_blank';a.rel='noopener';a.textContent='Watch the film ↗';active.append(a);}
          else{const frame=document.createElement('iframe');frame.title='The Sketch — interactive scroll film';frame.src='./film.html';active.append(frame);}
        }
        document.querySelector<HTMLButtonElement>('.close-piece')!.focus();
      }});
    });
  });
  let selected=0;
  const heading=document.querySelector<HTMLElement>('.piece-heading')!;
  const count=document.querySelector<HTMLElement>('.gallery-count')!;
  const select=(index:number)=>{
    const next=(index+cards.length)%cards.length;
    if(next===selected)return;
    const previous=selected;selected=next;
    cards.forEach((card,i)=>{
      const current=i===next;
      card.classList.toggle('is-active',current);card.setAttribute('aria-hidden',String(!current));card.inert=!current;
    });
    heading.textContent=pieces[next][0];count.textContent=`${String(next+1).padStart(2,'0')} / 06`;
    if(!reduced){
      gsap.fromTo(cards[next],{xPercent:next>previous?12:-12,scale:.94,opacity:0},{xPercent:0,scale:1,opacity:1,duration:.65,ease:'expo.out',overwrite:true});
      gsap.fromTo(heading,{y:25,opacity:0},{y:0,opacity:1,duration:.5,ease:'expo.out',overwrite:true});
    }
  };
  cards.forEach((card,i)=>{card.inert=i!==0;});
  let carouselScroll:ScrollTrigger|undefined;
  const step=(direction:number)=>{
    const next=(selected+direction+cards.length)%cards.length;
    select(next);
    if(carouselScroll)scrollTo(carouselScroll.start+(next+.15)/cards.length*(carouselScroll.end-carouselScroll.start));
  };
  document.querySelector('.gallery-prev')!.addEventListener('click',()=>step(-1));
  document.querySelector('.gallery-next')!.addEventListener('click',()=>step(1));
  document.querySelector('.open-current')!.addEventListener('click',()=>cards[selected].querySelector<HTMLButtonElement>('.piece-open')!.click());
  // Pin the single stage; the introduction scrolls away before the first piece holds.
  if(!reduced)carouselScroll=ScrollTrigger.create({trigger:'.gallery-stage',pin:true,start:'top top',end:()=>`+=${innerHeight*3.6}`,invalidateOnRefresh:true,onUpdate:self=>{if(!active)select(Math.min(cards.length-1,Math.floor(self.progress*cards.length)));}});
  track.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();step(event.key==='ArrowLeft'?-1:1);}});
  let touchX=0,touchY=0;
  track.addEventListener('touchstart',event=>{touchX=event.touches[0].clientX;touchY=event.touches[0].clientY;},{passive:true});
  track.addEventListener('touchend',event=>{const dx=event.changedTouches[0].clientX-touchX,dy=event.changedTouches[0].clientY-touchY;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1);},{passive:true});
  let velocity=0, progress=0;
  ScrollTrigger.create({trigger:'.playground',start:'top bottom',end:'bottom top',onUpdate:s=>{velocity=s.getVelocity();progress=s.progress;}});
  cards.forEach((card,index)=>{
    const canvas=card.querySelector('canvas')!, ctx=canvas.getContext('2d')!;
    let visible=false,last=-1;
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'150px'});observer.observe(canvas);
    const draw=(time:number)=>{
      if(!visible || document.hidden || (index!==selected && !card.contains(active)))return;
      const tick=Math.floor(time*10); if(tick===last)return;last=tick;
      const step=reduced?0:tick;
      const rect=canvas.getBoundingClientRect(), w=Math.round(rect.width), h=Math.round(rect.height), dpr=Math.min(devicePixelRatio,1.5);
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      ctx.fillStyle=['#e3dfd4','#e8432a','#202335','#a9c4cb','#e5dfcf','#eebd76'][index];ctx.fillRect(0,0,w,h);
      const t=reduced?0:time;
      if(index===0){background(ctx,'ink_far',w,h,Math.sin(t*.25)*10);background(ctx,'ink_mid',w,h,Math.sin(t*.3)*15);pose(ctx,`idle_${step%4}`,w*.5,h*.85,h*.53);}
      if(index===1){const styles=['','pixel-','water-','clay-','chalk-','comic-','hose-'];const s=styles[Math.floor(t*1.2)%7];pose(ctx,`${s}home_3`,w*.5,h*.87,h*.64);ctx.font='600 13px Inter, sans-serif';ctx.fillStyle='#121110';ctx.fillText((s.replace('-','')||'ink').toUpperCase(),22,h-25);}
      if(index===2){background(ctx,'cm_space',w,h);background(ctx,'cm_moon',w,h,Math.sin(t*.25)*8);pose(ctx,`saber_${step%6}`,w*.4,h*.87,h*.48);pose(ctx,`saber_${(step+3)%6}`,w*.68,h*.87,h*.48,true);}
      if(index===3){const worlds=[['px_sky','px_far','px_mid'],['wc_sky','wc_sea_far','wc_sea_near'],['cm_space','cm_earth'],['hs_sky','hs_cloud_far','hs_cloud_near']];worlds[Math.floor(t/4)%4].forEach((layer,j)=>background(ctx,layer,w,h,Math.sin(t*.35+j)*j*9));}
      if(index===4){ctx.strokeStyle='#121110';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.08,h*.83);ctx.lineTo(w*.92,h*.83);ctx.stroke();const f=reduced?0:Math.floor(t*5+progress*120+Math.abs(velocity)*.002)%8;pose(ctx,`${Math.abs(velocity)>1800?'sprint8':'run8'}_${f}`,w*.5,h*.83,h*.56,velocity<0);}
      if(index===5){const f=step%11;pose(ctx,f<3?`ftkick_${f}`:`firetornado_${f-3}`,w*.5,h*.87,h*.63);}
    };
    gsap.ticker.add(draw);
  });
}
