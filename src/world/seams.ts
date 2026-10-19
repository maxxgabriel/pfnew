import { clamp } from './types';
export type Seam = 'cut'|'paint'|'portal'|'blend'|'iris';
const mask=document.createElement('canvas');mask.width=mask.height=64;
const mg=mask.getContext('2d')!,pixels=mg.createImageData(64,64);
const field=new Float32Array(4096);
for(let y=0;y<64;y++)for(let x=0;x<64;x++)field[y*64+x]=.5+.16*Math.sin(x*.08+y*.035)+.15*Math.cos(y*.105-x*.04)+.12*Math.sin(x*.13-y*.09);
const melt=document.createElement('canvas'),meltG=melt.getContext('2d')!;
export const seamKinds: Seam[]=['cut','paint','portal','blend','cut','portal','iris'];
export function composite(g:CanvasRenderingContext2D,a:HTMLCanvasElement,b:HTMLCanvasElement,q:number,kind:Seam,w:number,h:number,door=false){
  if(q<=0){g.drawImage(a,0,0,w,h);return;}
  if(q>=1){g.drawImage(b,0,0,w,h);return;}
  g.drawImage(a,0,0,w,h);
  if(kind==='cut'){if(q>=.5)g.drawImage(b,0,0,w,h);return;}
  if(kind==='iris'){
    g.fillStyle='#12100f';g.fillRect(0,0,w,h);g.save();g.beginPath();g.arc(w*.46,h*.58,Math.hypot(w,h)*Math.abs(2*q-1),0,Math.PI*2);g.clip();g.drawImage(q<.5?a:b,0,0,w,h);g.restore();return;
  }
  if(kind==='blend'){
    if(melt.width!==b.width||melt.height!==b.height){melt.width=b.width;melt.height=b.height;}
    for(let i=0;i<field.length;i++){pixels.data[i*4+3]=Math.round(clamp((q*1.25-field[i])/.18)*255);}
    mg.putImageData(pixels,0,0);meltG.globalCompositeOperation='source-over';meltG.clearRect(0,0,melt.width,melt.height);meltG.drawImage(b,0,0);
    meltG.globalCompositeOperation='destination-in';meltG.drawImage(mask,0,0,melt.width,melt.height);meltG.globalCompositeOperation='source-over';
    g.drawImage(melt,0,0,w,h);return;
  }
  g.save();
  if(kind==='paint'){
    g.beginPath();
    for(let i=0;i<4;i++){const reach=clamp(q*1.65-i*.17);const y=i*h/4;g.moveTo(-30,y-20);g.lineTo(w*reach+25,y-10);g.lineTo(w*reach-20,y+h/8);g.lineTo(w*reach+35,y+h/4+12);g.lineTo(-30,y+h/4+20);g.closePath();}g.clip();
  }else if(kind==='portal'){
    const k=q*q*7;g.beginPath();const pw=w*(door?.38:.72)*k,ph=h*.8*k;g.rect(w/2-pw/2,h/2-ph/2,pw,ph);g.clip();
  }else {g.globalAlpha=clamp(q*1.1);}
  g.drawImage(b,0,0,w,h);g.restore();

  if(kind==='portal'&&q>.01&&q<.9){const k=q*q*7;g.strokeStyle=door?'#eee9de':'#191820';g.lineWidth=8;g.strokeRect(w/2-w*(door?.38:.72)*k/2,h/2-h*.8*k/2,w*(door?.38:.72)*k,h*.8*k);}
}
