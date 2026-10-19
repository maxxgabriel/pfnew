import gsap from 'gsap';
let started=false, drying=false;
const queue:HTMLElement[]=[];
export function startInk(){
 if(started)return;started=true;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;width:0;height:0;pointer-events:none';
 svg.innerHTML=`<defs>${['ink','ink-wet'].map(id=>`<filter id="${id}" x="-25%" y="-30%" width="150%" height="160%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="1" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" result="displaced"/><feGaussianBlur in="displaced" stdDeviation="0.6" result="bleed"/><feComponentTransfer in="bleed"><feFuncA type="table" tableValues="0 0.12 0.65 1 1"/></feComponentTransfer></filter>`).join('')}</defs>`;
 document.body.prepend(svg);
 let last=0,seed=0;gsap.ticker.add(time=>{if(document.hidden||time-last<.125)return;last=time;svg.querySelectorAll('feTurbulence').forEach(n=>n.setAttribute('seed',String(seed%3+1)));seed++;});
}
export function wet(el:HTMLElement){startInk();if(!queue.includes(el))queue.push(el);dry();}
function dry(){
 if(drying||!queue.length)return;drying=true;const el=queue.shift()!;
 const displacement=document.querySelector('#ink-wet feDisplacementMap')!,blur=document.querySelector('#ink-wet feGaussianBlur')!;
 el.style.filter='url(#ink-wet)';
 gsap.timeline({onComplete:()=>{el.style.filter='url(#ink)';drying=false;dry();}})
 .fromTo(displacement,{attr:{scale:40}},{attr:{scale:5},duration:.9,ease:'power2.out'},0)
 .fromTo(blur,{attr:{stdDeviation:4}},{attr:{stdDeviation:.6},duration:.9},0);
}
export const hiddenBrush='polygon(0 0,0 0,0 22%,0 45%,0 70%,0 100%,0 100%)';
export const openBrush='polygon(0 0,100% 0,97% 22%,100% 45%,98% 70%,100% 100%,0 100%)';
export function brush(el:HTMLElement,delay=0){
 gsap.fromTo(el,{clipPath:hiddenBrush},{clipPath:openBrush,duration:.55,delay,ease:'power2.out',onStart:()=>wet(el)});
}
