import { drawPose, queueArt, poseHeight } from '../../sketch/art';
import { drawPaper,drawGround,drawSpark,INK,cycle } from '../../sketch/common';
import { drawOneLine,ONE_HEIGHT } from '../../sketch/oneline';
import { brush,ensoPath } from '../../core/brush';
import { side } from '../camera';
import { clamp,type District } from '../types';
const seg=(x:number,a:number,b:number)=>clamp((x-a)/(b-a));
import logoUrl from '../../site/art/logo_ink.webp?url';
const logo=new Image();logo.src=logoUrl;
const moon=document.createElement('canvas');moon.width=moon.height=384;
const mg=moon.getContext('2d')!;
// Flat pigment, with a feathered perimeter baked once into the moon plate.
mg.fillStyle='#e1d8bd';
for(let i=8;i>=0;i--){
 mg.globalAlpha=i===0?1:.035;
 mg.beginPath();mg.arc(192,192,160+i,0,Math.PI*2);mg.fill();
}
mg.globalAlpha=1;
brush(mg,ensoPath(192,192,161,9,.36,1.25),{width:8,color:'#777563',seed:12,dry:.78,press:.7,tail:.08,alpha:.48,halo:.08});
const shore=document.createElement('canvas');shore.width=1024;shore.height=384;
const sg=shore.getContext('2d')!;
{const gr=sg.createLinearGradient(0,0,0,384);gr.addColorStop(0,'rgba(83,88,80,.62)');gr.addColorStop(.45,'rgba(120,124,114,.3)');gr.addColorStop(1,'rgba(239,233,220,0)');sg.fillStyle=gr;}sg.beginPath();sg.moveTo(0,24);
for(let x=0;x<=1024;x+=16)sg.lineTo(x,24+Math.sin(x*.012)*7+Math.sin(x*.043)*2);
sg.lineTo(1024,384);sg.lineTo(0,384);sg.fill();
// Broad translucent loads settle into the bank, rather than a flat grey footer.
brush(sg,[[0,65],[310,80],[710,95],[1024,76]],{width:95,color:'#74796c',seed:21,dry:.4,alpha:.55,halo:.18});
brush(sg,[[1024,215],[700,230],[300,200],[0,260]],{width:170,color:'#343e38',seed:24,dry:.3,alpha:.36,halo:.2});
const layers=[{key:'ink_far',depth:.16,height:.78,y:.08},{key:'ink_mid',depth:.4,height:.65,y:.22}];
export const ink: District={key:'ink',name:'Ink',len:8,preload(){
 for(const [name,n] of [['home',4],['idle',4],['walk8',8],['run8',8],['leap',4],['firststep',4],['powerup',3]] as const)for(let i=0;i<n;i++)queueArt(`${name}_${i}`,0);queueArt('curious',0);
},draw(f,L){
 const {ctx:g,w,h,t}=f,ground=h*.79;
 const face=f.portrait?f.face:h*.30/(poseHeight('home_3',1)||3.6);
 const intro=Math.max(f.intro,seg(L,0,.09)*3.1),birth=seg(intro,.55,2.1);
 const run=seg(L,.32,.66),anticipate=seg(L,.66,.74),jump=seg(L,.74,.99);
 const lift=Math.sin(jump*Math.PI*.82)*Math.min(h*.36,face*4.6);
 const x=w*(.37+.16*seg(L,.05,.65)+.1*jump),y=ground-lift;
 const zoom=1+.14*run+.08*anticipate-.15*jump,camY=lift*.42;
 const hx=(v:number)=>w*.48+(v-w*.48)*zoom;
 const hy=(v:number)=>ground+(v-ground)*zoom+camY;
 drawPaper(g,w,h);g.save();g.translate(w*.48,ground+camY);g.scale(zoom,zoom);g.translate(-w*.48,-ground);
 side(f,L*3+Math.sin(t*.22)*.012,layers);
 const mx=w*(f.portrait?.78:.84)-L*w*.2,my=h*(f.portrait?.4:.42)+Math.sin(t*.65)*face*.025,r=Math.min(w*.105,h*.082);
 const since=f.since('moon');
 const wink=since<1.5?Math.sin(Math.PI*seg(since,.12,1.4))**2:0;
 g.save();g.translate(mx,my);g.scale(1,1-wink*.88);g.drawImage(moon,-r,-r,r*2,r*2);g.restore();
 if(wink>0){g.strokeStyle=INK;g.lineWidth=r*.055;g.beginPath();g.moveTo(mx-r*.87,my);g.quadraticCurveTo(mx,my+r*.65*wink,mx+r*.87,my);g.stroke();}
 // One faint breathing wash makes the find readable without hover.
 g.strokeStyle=`rgba(113,119,99,${.09+.12*Math.max(0,Math.sin(t*1.3))})`;g.lineWidth=1;g.beginPath();g.arc(mx,my,r*1.08,0,Math.PI*2);g.stroke();
 f.hot('moon',hx(mx),hy(my),r*zoom*1.3);
 g.drawImage(shore,-w,ground-h*.03125,w*3,h*.5);
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
  // the wordmark itself (the brush lettering with the red Spark), painted on left to right with a ragged wet edge
  if(logo.complete&&logo.naturalWidth){
   const q=seg(intro,.35,2.1),lw=Math.min(w*.86,h*.5*logo.naturalWidth/logo.naturalHeight),lh=lw*logo.naturalHeight/logo.naturalWidth;
   const lx=w*.5-lw/2,ly=h*(f.portrait?.11:.08)-L*h*.12,edge=lx+lw*q*1.08;
   g.save();g.globalAlpha=alpha;g.beginPath();g.moveTo(lx-2,ly-2);
   for(let i=0;i<=10;i++){const yy=ly+lh*i/10;g.lineTo(edge+Math.sin(i*2.7+q*9)*lw*.035,yy);}
   g.lineTo(lx-2,ly+lh+2);g.closePath();g.clip();g.drawImage(logo,lx,ly,lw,lh);g.restore();
  }
 }
 if(f.crossedFwd(.74)){f.shake(5);f.flash(.055);}
},tap(id,f){if(id==='moon')f.flash(.045,'#efe9dc');}};
