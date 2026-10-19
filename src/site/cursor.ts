import gsap from 'gsap';
export function cursor(reduced: boolean) {
  const mm=gsap.matchMedia();
  mm.add('(hover: hover) and (pointer: fine) and (min-width: 900px)',()=>{
    if(reduced)return;
    const dot=document.querySelector<HTMLElement>('.cursor')!;
    const moveX=gsap.quickTo(dot,'x',{duration:.18,ease:'power3.out'}),moveY=gsap.quickTo(dot,'y',{duration:.18,ease:'power3.out'});
    const move=(event:PointerEvent)=>{dot.style.opacity='1';moveX(event.clientX-dot.offsetWidth/2);moveY(event.clientY-dot.offsetHeight/2);};
    window.addEventListener('pointermove',move);
    const cleanups:Array<()=>void>=[];
    document.querySelectorAll<HTMLElement>('a,button').forEach(el=>{
      const enter=()=>dot.classList.add('active'),leave=()=>{dot.classList.remove('active');gsap.to(el,{x:0,y:0,duration:.5,ease:'expo.out'});};
      const magnet=(e:PointerEvent)=>{if(!el.classList.contains('magnetic'))return;const rect=el.getBoundingClientRect();gsap.to(el,{x:(e.clientX-rect.left-rect.width/2)*.15,y:(e.clientY-rect.top-rect.height/2)*.2,duration:.4,ease:'power4.out'});};
      el.addEventListener('pointerenter',enter);el.addEventListener('pointerleave',leave);el.addEventListener('pointermove',magnet);
      cleanups.push(()=>{el.removeEventListener('pointerenter',enter);el.removeEventListener('pointerleave',leave);el.removeEventListener('pointermove',magnet);gsap.set(el,{clearProps:'transform'});});
    });
    document.querySelectorAll<HTMLElement>('.piece-open').forEach(el=>{
      const ripple=(e:PointerEvent)=>{const rect=el.getBoundingClientRect();el.style.setProperty('--mx',`${(e.clientX-rect.left)/rect.width*100}%`);el.style.setProperty('--my',`${(e.clientY-rect.top)/rect.height*100}%`);};
      el.addEventListener('pointermove',ripple);cleanups.push(()=>el.removeEventListener('pointermove',ripple));
    });
    return()=>{window.removeEventListener('pointermove',move);dot.style.opacity='0';cleanups.forEach(fn=>fn());};
  });
}
