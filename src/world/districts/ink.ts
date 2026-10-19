import { drawPose, queueArt, poseHeight } from '../../sketch/art';
import { drawPaper,drawGround,drawSpark,drawTitle,titleFit,INK,cycle } from '../../sketch/common';
import { drawOneLine,ONE_HEIGHT } from '../../sketch/oneline';
import { brush,ensoPath } from '../../core/brush';
import type { Frame } from '../../core/frame';
import { side } from '../camera';
import { clamp,type District } from '../types';
const seg=(x:number,a:number,b:number)=>clamp((x-a)/(b-a));
const title=document.createElement('canvas');title.width=1000;title.height=650;
const titleG=title.getContext('2d')!;let titleClock=-1;
const moon=document.createElement('canvas');moon.width=moon.height=384;
const mg=moon.getContext('2d')!;
const wash=mg.createRadialGradient(160,145,15,192,192,169);
wash.addColorStop(0,'#ded8c8');wash.addColorStop(.7,'#b5b1a2');wash.addColorStop(.94,'#93978b');wash.addColorStop(1,'#b1b2a500');
mg.fillStyle=wash;mg.beginPath();mg.arc(192,192,170,0,Math.PI*2);mg.fill();
// A broken dry rim around a tonal wash, rather than a cartoon face.
brush(mg,ensoPath(192,192,163,9,.99,-2.4),{width:12,color:'#555d53',seed:12,dry:.65,press:.6,tail:.12,alpha:.52,halo:.08});
const layers=[{key:'ink_far',depth:.16,height:.78,y:.08},{key:'ink_mid',depth:.4,height:.65,y:.22}];
export const ink: District={key:'ink',name:'Ink',len:8,preload(){
 for(const [name,n] of [['home',4],['idle',4],['walk8',8],['run8',8],['leap',4],['firststep',4],['powerup',3]] as const)for(let i=0;i<n;i++)queueArt(`${name}_${i}`,0);queueArt('curious',0);
},draw(f,L){
 const {ctx:g,w,h,face,t}=f,ground=h*.79;
 const intro=Math.max(f.intro,seg(L,0,.09)*3.1),birth=seg(intro,.55,2.1);
 const run=seg(L,.32,.66),anticipate=seg(L,.66,.74),jump=seg(L,.74,.99);
 const lift=Math.sin(jump*Math.PI*.82)*Math.min(h*.36,face*4.6);
 const x=w*(.37+.16*seg(L,.05,.65)+.1*jump),y=ground-lift;
 const zoom=1+.14*run+.08*anticipate-.15*jump,camY=lift*.42;
 const hx=(v:number)=>w*.48+(v-w*.48)*zoom;
 const hy=(v:number)=>ground+(v-ground)*zoom+camY;
 drawPaper(g,w,h);g.save();g.translate(w*.48,ground+camY);g.scale(zoom,zoom);g.translate(-w*.48,-ground);
 side(f,L*3+Math.sin(t*.22)*.012,layers);
 const mx=w*.87-L*w*.2,my=h*.23+Math.sin(t*.65)*face*.025,r=Math.min(w*.105,h*.082);
 const since=f.since('moon');
 const wink=since<1.5?Math.sin(Math.PI*seg(since,.12,1.4))**2:0;
 g.save();g.translate(mx,my);g.scale(1,1-wink*.88);g.drawImage(moon,-r,-r,r*2,r*2);g.restore();
 if(wink>0){g.strokeStyle=INK;g.lineWidth=r*.055;g.beginPath();g.moveTo(mx-r*.87,my);g.quadraticCurveTo(mx,my+r*.65*wink,mx+r*.87,my);g.stroke();}
 // One faint breathing wash makes the find readable without hover.
 g.strokeStyle=`rgba(113,119,99,${.09+.12*Math.max(0,Math.sin(t*1.3))})`;g.lineWidth=1;g.beginPath();g.arc(mx,my,r*1.08,0,Math.PI*2);g.stroke();
 f.hot('moon',hx(mx),hy(my),r*zoom*1.3);
 drawGround(g,-w,w*2,ground,face*.065);
 let pose='home_3',squash=1+Math.sin(t*2.5)*.012,rot=0;
 if(L>.045)pose=`firststep_${Math.min(3,Math.floor(seg(L,.045,.13)*4))}`;
 if(L>.13)pose=cycle('walk8',8,seg(L,.13,.35)*3,8);
 if(L>.35)pose=cycle('run8',8,seg(L,.35,.66)*5,8);
 if(L>.66){pose=`powerup_${Math.min(2,Math.floor(anticipate*3))}`;squash=1-.24*Math.sin(anticipate*Math.PI*.5);}
 if(L>.74){pose=`leap_${Math.min(3,Math.floor(jump*4))}`;squash=1+.19*Math.sin(jump*Math.PI);rot=-.12*Math.sin(jump*Math.PI);}
 if(f.idle>3&&L>.08&&L<.65){pose=cycle('idle',4,t-f.idle+Math.min(f.idle-3,1.4),1.5);squash=1+Math.sin(t*2)*.018;}
 if(f.idle>3&&L<=.045&&intro>3.2)pose=Math.sin((f.idle-3)*.7)>.55?'curious':'home_3';
 const fill=seg(birth,.72,1);
 if(fill>0)drawPose(g,pose,x,y,face,{alpha:fill,squash,rot,boil:.004});
 if(birth<1)drawOneLine(g,x,ground,poseHeight('home_3',face)/ONE_HEIGHT,birth,Math.max(1.4,face*.028),INK);
 f.hot('boy',hx(x),hy(y-face*1.45),face*1.7*zoom);
 const drop=seg(intro,2.3,3.1),sx=x+face*(1.4-.9*jump),sy=drop<1?-face+(ground+face*.7)*drop*drop:y-face*(.35+1.5*jump)-Math.abs(Math.sin(t*3))*face*.13;
 if(intro>2.3)drawSpark(g,sx,sy,face*.14,drop<1?1.3:1,1);
 g.restore();
 // The title completes on the clock and holds at the opening until scrolling.
 const alpha=1-seg(L,.025,.23);
 if(alpha>0){
  const clock=Math.min(3,intro);
  if(titleClock!==clock){titleClock=clock;titleG.clearRect(0,0,1000,650);drawTitle({ctx:titleG,intro:clock} as Frame,500,20,titleFit(900,570));}
  const scale=Math.min(w*.78/1000,h*.34/650);
  g.save();g.globalAlpha=alpha;g.drawImage(title,w*.4-500*scale-L*w*.5,h*.135,1000*scale,650*scale);g.restore();
 }
 if(f.crossedFwd(.74)){f.shake(5);f.flash(.055);}
},tap(id,f){if(id==='moon')f.flash(.045,'#efe9dc');}};
