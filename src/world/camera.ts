import { bgImage, drawBg, drawStrip } from '../sketch/bg';
import type { WorldFrame } from './types';
export interface Layer { key: string; depth: number; height?: number; y?: number }
export function side(f: WorldFrame,x: number,layers: Layer[]) {
  for (const l of layers) drawStrip(f.ctx,l.key,f.w,f.h,l.height ?? 1,-x*l.depth*f.w,f.h*(l.y ?? 0));
}
export function depth(f: WorldFrame,z: number,layers: Layer[]) {
  for (const l of layers) drawBg(f.ctx,l.key,f.w,f.h,.5,1,1 + z*l.depth*.65);
}
export type Point = readonly [number,number];
export function map(f: WorldFrame,s: number,plate: string,path: readonly Point[]): Point {
  const k = Math.min(path.length-1.00001,Math.max(0,s)*(path.length-1));
  const a=path[Math.floor(k)],b=path[Math.floor(k)+1],q=k%1;
  const p: Point=[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q];
  const g=f.ctx,im=bgImage(plate);
  if(im){
    const scale=Math.max(f.w/im.naturalWidth,f.h*2/im.naturalHeight);
    const dw=im.naturalWidth*scale,dh=im.naturalHeight*scale;
    const px=p[0]*dw,py=p[1]*dh/2;
    const ox=Math.max(f.w-dw,Math.min(0,f.w/2-px));
    const oy=Math.max(f.h-dh,Math.min(0,f.h/2-py));
    g.drawImage(im,ox,oy,dw,dh);return [px+ox,py+oy];
  }
  return [f.w/2,f.h/2];
}
export function panels(f: WorldFrame,s: number,paintings: string[]) {
  const g=f.ctx,k=s*(paintings.length-1),gap=Math.min(f.w*.035,28);
  // The page fills the lens; the next panel travels across the painting.
  drawBg(g,paintings[Math.min(paintings.length-1,Math.floor(k))],f.w,f.h,.5,1,1.08);
  paintings.forEach((name,i)=>{
    const x=(i-k)*(f.w+gap);
    g.save();g.translate(x,0);g.beginPath();g.rect(0,-12,f.w,f.h+24);g.clip();
    drawBg(g,name,f.w,f.h,.5,1,1.08);g.restore();
    g.strokeStyle='#16151b';g.lineWidth=12;g.strokeRect(x,-12,f.w,f.h+24);
  });
}
