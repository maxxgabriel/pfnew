import gsap from 'gsap';
export const styles = ['ink','pixel','clay','water','chalk','comic','hose'];
const art = import.meta.glob('./art/*.webp', {query:'?url', import:'default', eager:true}) as Record<string,string>;
// Accept the art pipeline's numbered exports as well as the final named files.
const aliases:Record<string,string>={};
styles.forEach((style,i)=>{aliases[`logo_${style}`]=`logo_${i}`;aliases[`style_${style}`]=`style_${i}`;});
['spark','eraser','brush','seal','star','film','pencil','hi'].forEach((name,i)=>{aliases[`sticker_${name}`]=`sticker_${i}`;});
export const artwork = (name:string) => art[`./art/${name}.webp`] ?? art[`./art/${aliases[name]}.webp`];
export function setArt(el:HTMLElement,name:string,alt='') {
  const src=artwork(name);
  if(!src)return;
  el.dataset.requestedArt=name;
  const img=new Image();img.alt=alt;img.src=src;img.decoding='async';
  img.addEventListener('load',()=>{if(el.dataset.requestedArt!==name)return;el.replaceChildren(img);el.classList.add('has-art');},{once:true});
}
export function hydrateArt(){document.querySelectorAll<HTMLElement>('[data-art]').forEach(el=>setArt(el,el.dataset.art!));}
export function slices(el:HTMLElement,text:string,count=4){
  el.innerHTML=`<span class="type-measure">${text}</span>`+Array.from({length:count},(_,i)=>`<span class="type-slice" style="--slice-top:${i/count*100}%;--slice-bottom:${100-(i+1)/count*100}%"><span>${text}</span></span>`).join('');
  return Array.from(el.querySelectorAll<HTMLElement>('.type-slice>span'));
}
export function pop(target:gsap.TweenTarget,reduced:boolean){if(!reduced)gsap.fromTo(target,{scale:.15,rotation:-18},{scale:1,rotation:0,duration:.7,ease:'elastic.out(1,.45)',overwrite:true});}
