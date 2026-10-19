import { drawPose,queueArt } from '../../sketch/art';
import { bgImage,drawBg } from '../../sketch/bg';
import { cycle,drawSpark } from '../../sketch/common';
import { side } from '../camera';
import { clamp,type District } from '../types';
const copy='MAX GABRIEL. MOTION DESIGNER AND ANIMATOR. I DRAW ONE LITTLE INK BOY AND MAKE HIM MOVE IN EVERY STYLE I CAN.';
const text=document.createElement('canvas');text.width=192;text.height=104;const tg=text.getContext('2d')!;
let lastCount=-1;
function lettering(count:number){if(count===lastCount)return;lastCount=count;tg.clearRect(0,0,192,104);tg.fillStyle='#f6e8b9';tg.font='bold 9px monospace';tg.textBaseline='top';const words=copy.slice(0,count).split(' ');let line='',y=8;for(const word of words){if(tg.measureText(line+word).width>173){tg.fillText(line,8,y);line='';y+=13;}line+=word+' ';}tg.fillText(line,8,y);}
export const pixel:District={key:'pixel',name:'Pixel',len:8,preload(){for(const [name,n] of [['run8',8],['sprint8',8],['moonwalk6',6],['idle',4]] as const)for(let i=0;i<n;i++)queueArt(`pixel-${name}_${i}`,2);},draw(f,L){
 const {ctx:g,w,h,face,t}=f;g.fillStyle='#bed3ca';g.fillRect(0,0,w,h);g.imageSmoothingEnabled=false;drawBg(g,'px_sky',w,h);side(f,L*5,[{key:'px_far',depth:.2,height:.7,y:.1},{key:'px_mid',depth:.6,height:.68,y:.2}]);
 const ground=Math.round(h*.79),block=Math.max(24,Math.round(face*.65)),offset=Math.round(L*w*3)%block;
 g.fillStyle='#393c39';g.fillRect(0,ground,w,h-ground);for(let i=-1;i<w/block+1;i++){g.fillStyle='#929273';g.fillRect(i*block-offset,ground,block-3,block*.4);g.fillStyle='#5d6253';g.fillRect(i*block-offset+4,ground+block*.6,block-8,block*.55);}
 const sx=w*(.78-L*.36),sw=Math.min(w*.65,face*4.6),sh=sw*.54,sy=Math.max(h*.28,ground-face*4.8);
 const since=f.since('sign'),flip=since<.5?Math.abs(Math.cos(since*Math.PI*2)):1;
 g.fillStyle='#554335';g.fillRect(sx-6,sy+sh*.4,12,ground-sy-sh*.4);g.save();g.translate(sx,sy);g.scale(1,Math.max(.05,flip));
 const im=bgImage('px_sign');if(im)g.drawImage(im,-sw/2,-8,sw,sh+16);else{g.fillStyle='#443e35';g.fillRect(-sw/2-5,-5,sw+10,sh+10);g.fillStyle='#665c45';g.fillRect(-sw/2,0,sw,sh);g.fillStyle='#b1a275';g.fillRect(-sw/2+5,5,sw-10,4);}
 lettering(Number.isFinite(since)?Math.floor(Math.max(0,since-.25)*45):16);g.drawImage(text,-sw/2,0,sw,sh);g.restore();f.hot('sign',sx,sy+sh*.5,sw*.55);
 const speed=Math.abs(f.vP),back=f.vP<-.03;const name=back?'moonwalk6':speed>.9?'sprint8':speed>.025?'run8':'idle',n=back?6:name==='idle'?4:8;
 const clock=name==='idle'?t*.24:Math.abs(L*37);const entry=clamp((L-.078125)/.14),x=w*(.52-.12*entry);drawPose(g,cycle(`pixel-${name}`,n,clock,8),x,ground-(1-entry)*h*.3,face,{boil:0,squash:f.idle>3?1+Math.sin(t*2)*.025:1});
 f.hot('boy',x,ground-face*1.5,face*1.7);drawSpark(g,x+face*1.7,ground-face*.45-Math.abs(Math.sin(L*75))*face*.4,face*.12);g.imageSmoothingEnabled=true;
 },tap(id,f){if(id==='sign')f.shake(3);}};
