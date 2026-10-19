import { brush } from '../core/brush';
import type { Pt } from '../core/math';
import { clamp } from './types';
export type Seam = 'cut'|'paint'|'portal'|'blend'|'iris';
const mask=document.createElement('canvas');mask.width=mask.height=64;
const mg=mask.getContext('2d')!,pixels=mg.createImageData(64,64);
const field=new Float32Array(4096);
for(let y=0;y<64;y++)for(let x=0;x<64;x++)field[y*64+x]=.5+.16*Math.sin(x*.08+y*.035)+.15*Math.cos(y*.105-x*.04)+.12*Math.sin(x*.13-y*.09);
const melt=document.createElement('canvas'),meltG=melt.getContext('2d')!;
const paint=document.createElement('canvas');paint.width=paint.height=768;
const pg=paint.getContext('2d')!;
// Four loaded brushes, with their dry tails well beyond the picture edge.
const strokes:Pt[][]=[
 [[-350,100],[160,70],[700,170],[1450,90]],
 [[1350,370],[850,300],[300,360],[-450,300]],
 [[-350,590],[200,650],[750,560],[1450,650]],
 [[1350,920],[800,850],[250,940],[-450,900]],
];
export const seamKinds: Seam[]=['cut','paint','portal','blend','cut','portal','iris'];
function shot(g:CanvasRenderingContext2D,im:HTMLCanvasElement,w:number,h:number,z=1,cx=.5,cy=.56){g.drawImage(im,w*cx*(1-z),h*cy*(1-z),w*z,h*z);}
export function composite(g:CanvasRenderingContext2D,a:HTMLCanvasElement,b:HTMLCanvasElement,q:number,kind:Seam,w:number,h:number,door=false){
 if(q<=0){shot(g,a,w,h);return;}if(q>=1){shot(g,b,w,h);return;}
 const ease=q*q*(3-2*q);
 if(kind==='cut'){
  // Held anticipation, a single-frame cut, then a short lens settle.
  const incoming=q>=.5,k=incoming?1+Math.pow(1-clamp((q-.5)*2),3)*.12:1+.055*Math.pow(q*2,4);
  shot(g,incoming?b:a,w,h,k,.5,.64);return;
 }
 if(kind==='iris'){
  g.fillStyle='#12100f';g.fillRect(0,0,w,h);g.save();g.beginPath();
  const open=Math.abs(q*2-1);g.arc(w*.46,h*.58,Math.hypot(w,h)*.75*open*open,0,Math.PI*2);g.clip();
  shot(g,q<.5?a:b,w,h,1+.16*(1-open),.46,.58);g.restore();return;
 }
 shot(g,a,w,h,1+ease*(kind==='portal'?.16:.035));
 if(kind==='portal'){
  const k=(Math.exp(q*3.8)-1)/(Math.exp(3.8)-1)*4;
  const pw=w*(door?.38:.72)*k,ph=h*.86*k,cx=w*.5,cy=h*.54;
  g.save();g.translate(cx,cy);g.rotate((door?-1:1)*(1-ease)*.045);g.beginPath();g.rect(-pw/2,-ph/2,pw,ph);g.clip();
  g.translate(-cx,-cy);shot(g,b,w,h,1+.3*(1-ease));g.restore();
  g.save();g.translate(cx,cy);g.rotate((door?-1:1)*(1-ease)*.045);g.strokeStyle=door?'#eee9de':'#191820';g.lineWidth=(door?7:12)*(1+k*.3);g.strokeRect(-pw/2,-ph/2,pw,ph);g.restore();return;
 }
 const mw=Math.min(960,b.width),mh=Math.round(mw*h/w);
 if(melt.width!==mw||melt.height!==mh){melt.width=mw;melt.height=mh;}
 meltG.globalCompositeOperation='source-over';meltG.clearRect(0,0,mw,mh);
 shot(meltG,b,mw,mh,1+.065*(1-ease));
 meltG.globalCompositeOperation='destination-in';
 if(kind==='paint'){
  pg.setTransform(.768,0,0,.768,0,0);pg.clearRect(0,0,1000,1000);
  for(let i=0;i<4;i++)brush(pg,strokes[i],{width:360,progress:clamp((q-i*.145)/.48),color:'#fff',seed:21+i,dry:.28,press:1.2,tail:.65,halo:0});
  // Wet paint closes the last flying-white gaps, rather than a hard wipe edge.
  pg.globalAlpha=clamp((q-.84)/.16);pg.fillStyle='#fff';pg.fillRect(0,0,1000,1000);pg.globalAlpha=1;
  meltG.drawImage(paint,0,0,mw,mh);
 }else{
  for(let i=0;i<field.length;i++)pixels.data[i*4+3]=Math.round(clamp((q*1.35-field[i])/.23)*255);
  mg.putImageData(pixels,0,0);meltG.drawImage(mask,0,0,mw,mh);
 }
 meltG.globalCompositeOperation='source-over';g.drawImage(melt,0,0,w,h);
}
