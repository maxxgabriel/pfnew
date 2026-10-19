import '@fontsource/permanent-marker';
import '@fontsource/caveat-brush';
import './world.css';
import { setPoseClock, setLazyPoses } from '../sketch/art';
import { ink } from './districts/ink';
import { pixel } from './districts/pixel';
import { water } from './districts/water';
import { comic } from './districts/comic';
import { clay } from './districts/clay';
import { chalk } from './districts/chalk';
import { hose } from './districts/hose';
import { createHot } from './hot';
import { createHud } from './hud';
import { composite,seamKinds } from './seams';
import { clamp,type WorldFrame,type District } from './types';
const districts=[ink,pixel,water,comic,clay,chalk,hose];
const overlap=1.25,starts:number[]=[];
let total=0;for(const d of districts){starts.push(total);total+=d.len-overlap;}
const end=total+overlap;
const canvas=document.querySelector<HTMLCanvasElement>('#world')!,ctx=canvas.getContext('2d',{alpha:false})!;
const buffers=[document.createElement('canvas'),document.createElement('canvas')];
const gs=buffers.map(c=>c.getContext('2d',{alpha:false})!);
const hot=createHot(canvas);
let w=0,h=0,dpr=1,step=600,P=0,target=0,previous=0,vP=0,idle=0,last=performance.now(),introAt=last;
let shake=0,flash=0,flashColor='#efe9dc',loopOpening=0;
const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
let vignette:CanvasGradient;
function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);step=Math.max(420,h*.72);for(const c of [canvas,...buffers]){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}document.querySelector<HTMLElement>('#track')!.style.height=`${end*step+h}px`;vignette=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.hypot(w,h)*.6);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#1b171419');target=scrollY/step;}
function go(p:number){P=target=Math.max(0,Math.min(end,p));previous=P;vP=0;idle=0;if(P===0)introAt=performance.now();window.scrollTo({top:P*step,behavior:'instant'});}
const hud=createHud(districts,i=>go(starts[i]+(i?overlap:0)));
window.addEventListener('resize',resize);window.addEventListener('scroll',()=>{target=Math.min(end,scrollY/step);},{passive:true});
resize();setLazyPoses(true);districts.forEach(d=>d.preload());
const grain=document.createElement('canvas');grain.width=grain.height=128;const gg=grain.getContext('2d')!,noise=gg.createImageData(128,128);let seed=14;for(let i=0;i<noise.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;noise.data[i]=noise.data[i+1]=noise.data[i+2]=seed>>>24;noise.data[i+3]=255;}gg.putImageData(noise,0,0);const pattern=ctx.createPattern(grain,'repeat');
function frame(g:CanvasRenderingContext2D,d:District,index:number,active:boolean,t:number,dt:number):WorldFrame{
 const f:WorldFrame={ctx:g,w,h,u:Math.min(w,h*.62)/100,portrait:h>w,P,vP,t,dt,idle,calm,face:Math.min(w*.19,h*.088),intro:(performance.now()-introAt)/1000,
 crossedFwd(L){const at=starts[index]+L*d.len;return previous<at&&P>=at;},shake(px){shake=Math.max(shake,calm?px*.15:px);},flash(a,col='#efe9dc'){flash=Math.max(flash,calm?a*.2:a);flashColor=col;},hot(){},since(){return Infinity;},over(){return false;}};
 Object.assign(f,hot.bind(d,f,active));return f;
}
function draw(g:CanvasRenderingContext2D,d:District,index:number,L:number,active:boolean,t:number,dt:number){g.setTransform(dpr,0,0,dpr,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.save();if(shake>.2)g.translate(Math.sin(t*79)*shake,Math.cos(t*93)*shake*.5);d.draw(frame(g,d,index,active,t,dt),clamp(L));g.restore();}
function tick(now:number){requestAnimationFrame(tick);const dt=Math.min(.05,(now-last)/1000);last=now;const t=now/1000;previous=P;P+= (target-P)*(1-Math.exp(-(calm?14:7)*dt));if(Math.abs(P-target)<.0001)P=target;vP=(P-previous)/Math.max(.001,dt);idle=Math.abs(vP)>.015?0:idle+dt;setPoseClock(t);hot.begin();
 let index=0;for(let i=1;i<starts.length;i++)if(P>=starts[i])index=i;
 const incoming=index>0&&P<starts[index]+overlap;
 const looping=P>=total;
 ctx.setTransform(dpr,0,0,dpr,0,0);
 if(incoming||looping){const a=looping?6:index-1,b=looping?0:index,start=looping?total:starts[index],q=clamp((P-start)/overlap),kind=seamKinds[a];
 const cutAt=start+overlap*.5;if(kind==='cut'&&previous<cutAt&&P>=cutAt){shake=calm?1:12;flash=calm?.04:.28;}
 draw(gs[0],districts[a],a,(P-starts[a])/districts[a].len,q<.5,t,dt);
 draw(gs[1],districts[b],b,looping?0:(P-starts[b])/districts[b].len,q>=.5,t,dt);
 ctx.save();if(shake>.2)ctx.translate(Math.sin(t*79)*shake,Math.cos(t*93)*shake*.5);
 composite(ctx,buffers[0],buffers[1],q,kind,w,h,a===5);ctx.restore();
 if(looping&&q>=.5){loopOpening=1;go(0);introAt=now-5000;}
 }else draw(ctx,districts[index],index,(P-starts[index])/districts[index].len,true,t,dt);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 if(loopOpening>0){ctx.save();ctx.fillStyle='#12100f';ctx.beginPath();ctx.rect(0,0,w,h);ctx.arc(w*.46,h*.58,Math.hypot(w,h)*(1-loopOpening),0,Math.PI*2,true);ctx.fill('evenodd');ctx.restore();loopOpening=Math.max(0,loopOpening-dt*1.3);}
 shake*=Math.exp(-dt*11);if(flash>.005){ctx.globalAlpha=flash;ctx.fillStyle=flashColor;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;flash*=Math.exp(-dt*10);}
 ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);if(pattern){ctx.save();ctx.globalAlpha=.035;ctx.translate((Math.floor(t*12)*29)%128,(Math.floor(t*12)*47)%128);ctx.fillStyle=pattern;ctx.fillRect(-128,-128,w+128,h+128);ctx.restore();}hot.draw(ctx,t);
 hud(districts[incoming&&P<starts[index]+overlap*.5?index-1:index],clamp(P/end));
}
(window as unknown as {__world:object}).__world={go,spots:()=>hot.spots()};requestAnimationFrame(tick);
