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
  const g=f.ctx,im=bgImage(plate); g.save(); g.translate(f.w/2-p[0]*f.w,f.h/2-p[1]*f.h);
  if(im) g.drawImage(im,0,0,f.w,f.h*2);
  else {g.strokeStyle='#88796b';g.lineWidth=f.face*.55;g.lineCap='round';g.beginPath();path.forEach((v,i)=>i?g.lineTo(v[0]*f.w,v[1]*f.h):g.moveTo(v[0]*f.w,v[1]*f.h));g.stroke();}
  g.restore(); return [f.w/2,f.h/2];
}
export function panels(f: WorldFrame,s: number,paintings: string[]) {
  const g=f.ctx,k=s*(paintings.length-1),gap=f.w*.08;
  paintings.forEach((name,i)=>{const x=(i-k)*(f.w+gap);g.save();g.translate(x,0);g.beginPath();g.rect(gap,f.h*.14,f.w-gap*2,f.h*.72);g.clip();drawBg(g,name,f.w,f.h,.5);g.restore();g.strokeStyle='#16151b';g.lineWidth=9;g.strokeRect(x+gap,f.h*.14,f.w-gap*2,f.h*.72);});
}
