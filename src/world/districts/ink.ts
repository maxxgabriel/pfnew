import { drawPose, queueArt, poseHeight } from '../../sketch/art';
import { drawPaper,drawGround,drawSpark,drawTitle,titleFit,INK,cycle } from '../../sketch/common';
import { drawOneLine,ONE_HEIGHT } from '../../sketch/oneline';
import { brush,ensoPath } from '../../core/brush';
import type { Frame } from '../../core/frame';
import { side } from '../camera';
import { clamp,type District } from '../types';
export const ink: District={key:'ink',name:'Ink',len:8,preload(){for(const [name,n] of [['home',4],['idle',4],['walk8',8],['run8',8],['leap',4]] as const)for(let i=0;i<n;i++)queueArt(`${name}_${i}`,0);},draw(f,L){
 const {ctx:g,w,h,face,t}=f,y=h*.76,x=w*(.4+Math.min(.12,L*.15));
 drawPaper(g,w,h);side(f,L*3,[{key:'ink_far',depth:.16,height:.68,y:.12},{key:'ink_mid',depth:.4,height:.6,y:.26}]);
 const moonX=w*.79-L*w*.16,moonY=h*.23,r=Math.min(w*.12,h*.08);
 brush(g,ensoPath(moonX,moonY,r,3,.98),{width:r*.21,color:INK,seed:4,dry:.5});
 const wink=f.since('moon')<.8,lean=f.over('moon')?r*.05:0;
 g.strokeStyle=INK;g.lineWidth=Math.max(2,r*.04);g.beginPath();g.moveTo(moonX-r*.35,moonY+lean);g.lineTo(moonX-r*.22,moonY+(wink?r*.05:r*.12));g.moveTo(moonX+r*.22,moonY);g.lineTo(moonX+r*.35,moonY+(wink?0:r*.12));g.stroke();f.hot('moon',moonX,moonY,r*1.3);
 drawGround(g,-w,w*2,y,face*.065);
 const intro=Math.max(f.intro,L*18),a=clamp(1-L*3.4);
 if(a>0)drawTitle({ctx:g,intro} as Frame,w*.42-L*w*.4,h*.19,titleFit(w*.76,h*.32),a);
 const birth=clamp((intro-.5)/1.8);
 if(birth<1){drawOneLine(g,x,y,face*3.1/ONE_HEIGHT,birth,Math.max(1.4,face*.025),INK);}
 const jump=clamp((L-.78)/.22),lift=Math.sin(jump*Math.PI*.75)*h*.27;
 const pose=jump>0?`leap_${Math.min(3,Math.floor(jump*4))}`:f.idle>3?cycle('idle',4,t,2):L<.08?'home_3':cycle(L<.4?'walk8':'run8',8,L*20,8);
 if(birth>.8)drawPose(g,pose,x,y-lift,face,{alpha:clamp((birth-.8)*5),flip:false,rot:jump*.08});
 f.hot('boy',x,y-lift-poseHeight(pose,face)*.5,face*1.5);
 const drop=clamp((intro-2.3)/.8),sx=x+face*1.8,sy=(-face)+(y-face*.3+face)*drop*drop;
 if(intro>2.3)drawSpark(g,sx,sy-Math.abs(Math.sin(t*3))*face*.15,face*.14);
 },tap(id,f){if(id==='moon')f.flash(.08,'#efe9dc');}};
