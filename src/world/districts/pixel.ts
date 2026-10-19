import { drawPose,queueArt,poseHeight } from '../../sketch/art';
import { bgImage,drawBg } from '../../sketch/bg';
import { cycle,drawSpark } from '../../sketch/common';
import { side } from '../camera';
import { clamp,type District } from '../types';
const copy='MAX GABRIEL. MOTION DESIGNER AND ANIMATOR. I DRAW ONE LITTLE INK BOY AND MAKE HIM MOVE IN EVERY STYLE I CAN.';
// A real bitmap alphabet: every letter remains on the same pixel grid as the terrain.
const alphabet:Record<string,string>={A:'01110/10001/10001/11111/10001/10001/10001',B:'11110/10001/10001/11110/10001/10001/11110',C:'01111/10000/10000/10000/10000/10000/01111',D:'11110/10001/10001/10001/10001/10001/11110',E:'11111/10000/10000/11110/10000/10000/11111',F:'11111/10000/10000/11110/10000/10000/10000',G:'01111/10000/10000/10111/10001/10001/01111',H:'10001/10001/10001/11111/10001/10001/10001',I:'11111/00100/00100/00100/00100/00100/11111',J:'00111/00010/00010/00010/10010/10010/01100',K:'10001/10010/10100/11000/10100/10010/10001',L:'10000/10000/10000/10000/10000/10000/11111',M:'10001/11011/10101/10101/10001/10001/10001',N:'10001/11001/10101/10011/10001/10001/10001',O:'01110/10001/10001/10001/10001/10001/01110',P:'11110/10001/10001/11110/10000/10000/10000',Q:'01110/10001/10001/10001/10101/10010/01101',R:'11110/10001/10001/11110/10100/10010/10001',S:'01111/10000/10000/01110/00001/00001/11110',T:'11111/00100/00100/00100/00100/00100/00100',U:'10001/10001/10001/10001/10001/10001/01110',V:'10001/10001/10001/10001/10001/01010/00100',W:'10001/10001/10001/10101/10101/10101/01010',X:'10001/10001/01010/00100/01010/10001/10001',Y:'10001/10001/01010/00100/00100/00100/00100',Z:'11111/00001/00010/00100/01000/10000/11111','.':'0/0/0/0/0/0/1','[':'01110/01000/01000/01000/01000/01000/01110',']':'01110/00010/00010/00010/00010/00010/01110','?':'01110/10001/00001/00010/00100/00000/00100'};
const glyphs=new Map<string,HTMLCanvasElement>();
for(const [letter,rows] of Object.entries(alphabet)){
 const c=document.createElement('canvas');c.width=5;c.height=7;const g=c.getContext('2d')!;g.fillStyle='#fff';rows.split('/').forEach((row,y)=>{for(let x=0;x<row.length;x++)if(row[x]==='1')g.fillRect(x,y,1,1);});glyphs.set(letter,c);
}
function bitmap(g:CanvasRenderingContext2D,s:string,x:number,y:number,size:number){for(let i=0;i<s.length;i++){const im=glyphs.get(s[i]);if(im)g.drawImage(im,Math.round(x+i*size*6),Math.round(y),size*5,size*7);}}
const text=document.createElement('canvas');text.width=180;text.height=64;const tg=text.getContext('2d')!;
let lastCount=-1;
function lettering(count:number){if(count===lastCount)return;lastCount=count;tg.clearRect(0,0,180,64);let x=4,y=3;for(const word of copy.slice(0,count).split(' ')){if(x+word.length*6>176){x=4;y+=11;}bitmap(tg,word,x,y,1);x+=(word.length+1)*6;}}
const terrain=document.createElement('canvas');terrain.width=64;terrain.height=64;const terrainG=terrain.getContext('2d')!;
terrainG.fillStyle='#79533d';terrainG.fillRect(0,0,64,64);terrainG.fillStyle='#573e32';terrainG.fillRect(0,32,64,3);terrainG.fillRect(31,0,3,32);terrainG.fillRect(12,32,3,32);terrainG.fillStyle='#a2764b';terrainG.fillRect(5,6,18,5);terrainG.fillRect(40,19,15,5);terrainG.fillRect(20,43,24,5);terrainG.fillStyle='#604332';terrainG.fillRect(4,20,14,5);terrainG.fillRect(39,53,18,5);
let terrainPattern:CanvasPattern|null=null;
const layers=[{key:'px_far',depth:.2,height:.7,y:.1},{key:'px_mid',depth:.6,height:.68,y:.2}];
export const pixel:District={key:'pixel',name:'Pixel',len:8,preload(){for(const [name,n] of [['rubberhose',4],['run8',8],['sprint8',8],['moonwalk6',6],['idle',4]] as const)for(let i=0;i<n;i++)queueArt(`pixel-${name}_${i}`,2);queueArt('pixel-home_3',2);},draw(f,L){
 const {ctx:g,w,h,t}=f;const face=f.portrait?f.face:h*.30/(poseHeight('pixel-home_3',1)||3.6);g.fillStyle='#bed3ca';g.fillRect(0,0,w,h);g.imageSmoothingEnabled=false;drawBg(g,'px_sky',w,h);side(f,L*5+Math.sin(t*.2)*.008,layers);
 const ground=Math.round(h*.81),tile=Math.max(24,Math.round(face*.6)),offset=Math.round(L*w*3)%tile;
 if(!terrainPattern)terrainPattern=g.createPattern(terrain,'repeat');
 g.save();g.translate(-(Math.round(L*w*3)%64),ground);g.fillStyle=terrainPattern??'#79533d';g.fillRect(0,0,w+64,h-ground);g.restore();
 for(let i=-1;i<w/tile+1;i++){
  const x=i*tile-offset;g.fillStyle='#344e36';g.fillRect(x,ground,tile,14);g.fillStyle='#6e934e';g.fillRect(x,ground,tile,5);g.fillStyle='#a1bc62';g.fillRect(x+3,ground,tile-7,2);g.fillStyle='#43633b';g.fillRect(x+tile*.6,ground+8,tile*.3,9);
 }
 const sx=w*((f.portrait?.52:.43)-.06*L),sw=Math.min(w*(f.portrait?.94:.44),h*.66),since=f.since('sign');
 const sign=bgImage('px_sign'),sh=sw*(sign?sign.naturalHeight/sign.naturalWidth:1);
 const sy=ground-sh*.91;
 const bump=since<.5?Math.sin(since/.5*Math.PI)*face*.1:0;
 g.save();g.translate(Math.round(sx-sw/2),Math.round(sy-bump));
 if(sign)g.drawImage(sign,0,0,sw,sh);
 const tx=sw*.13,ty=sh*.205,tw=sw*.74,th=sh*.235;
 if(Number.isFinite(since)){
  lettering(Math.min(copy.length,Math.floor(Math.max(0,since-.2)*42)));
  g.drawImage(text,tx,ty,tw,th);
 }else if(Math.sin(t*3)>-.35){
  const size=Math.max(1,Math.floor(tw/48));
  bitmap(g,'[ TAP ]',sw/2-41*size/2,sh*.29,size);
 }
 // One warm corner glint keeps the painted find visible between blinks.
 g.fillStyle='#fff0b5';g.globalAlpha=.2+.65*Math.max(0,Math.sin(t*1.6));g.fillRect(sw*.84,sh*.2,4,4);g.restore();
 f.hot('sign',sx,sy-bump+sh*.32,sw*.44);
 const bx=w*.77,bs=Math.round(face*.76),by=ground-face*3.65,secret=f.since('block');
 const impact=.58,blockBump=secret>=impact&&secret<impact+.3?Math.sin((secret-impact)/.3*Math.PI)*face*.16:0;
 g.save();g.translate(Math.round(bx-bs/2),Math.round(by-bs/2-blockBump));g.fillStyle='#473327';g.fillRect(-3,-3,bs+6,bs+6);g.fillStyle=secret<2.4?'#a67d42':'#dda64c';g.fillRect(0,0,bs,bs);g.fillStyle='#ffe39a';g.fillRect(3,3,bs-6,4);g.fillRect(3,3,4,bs-6);g.fillStyle='#976038';g.fillRect(4,bs-7,bs-8,4);
 g.globalAlpha=.25+.65*Math.max(0,Math.sin(t*1.7));g.fillStyle='#fff3bf';g.fillRect(bs-8,8,4,4);g.globalAlpha=1;
 const gs=Math.max(1,Math.floor(bs/11));bitmap(g,secret<2.4?'.':'?',bs/2-gs*2.5,bs/2-gs*3.5,gs);g.restore();f.hot('block',bx,by,bs*.85);
 // One coin rises, turns edge-on, hangs, and returns to the block.
 if(secret>=impact&&secret<2.1){const k=clamp((secret-impact)/1.5),cy=by-bs*.7-Math.sin(k*Math.PI)*face*1.4,cw=Math.max(3,Math.abs(Math.cos(k*Math.PI*4))*face*.35);g.fillStyle='#78512d';g.fillRect(bx-cw/2-2,cy-2,cw+4,face*.55+4);g.fillStyle='#ffe89a';g.fillRect(bx-cw/2,cy,cw,face*.55);}
 const speed=Math.abs(f.vP),back=f.vP<-.03,entry=clamp((L-.078125)/.14),baseX=w*(.48-.15*entry);
 let x=baseX,y=ground-(1-entry)*h*.3,pose=speed>.025?cycle(`pixel-${back?'moonwalk6':speed>.9?'sprint8':'run8'}`,back?6:8,Math.abs(L*37),8):'pixel-home_3',squash=1+Math.sin(t*2.4)*.014;
 if(speed<=.025)y+=(ground-y)*clamp(f.idle/.3);
 if(speed<=.025&&f.idle>6)pose=f.idle<7?'pixel-idle_3':'pixel-idle_2';
 if(secret<1.8){
  const approach=clamp(secret/.3),returning=clamp((secret-1.25)/.55);x=baseX+(bx-baseX)*approach*(1-returning);
  const jump=clamp((secret-.38)/.4);
  const rise=Math.max(face*.3,ground-(by+bs/2)-poseHeight('pixel-rubberhose_2',face)*1.12);
  y=ground-Math.sin(jump*Math.PI)*rise;
  pose=secret<.3||secret>1.25?cycle('pixel-run8',8,secret,12):`pixel-rubberhose_${Math.min(3,Math.floor(jump*4))}`;
  squash=secret<.38?1-.2*Math.sin(clamp((secret-.3)/.08)*Math.PI):1+.12*Math.sin(jump*Math.PI);
 }
 drawPose(g,pose,x,y,face,{boil:0,squash});f.hot('boy',x,y-face*1.5,face*1.55);drawSpark(g,x+face*1.45,y-face*.45-Math.abs(Math.sin(t*2.4))*face*.12,face*.12);
 const titleAlpha=clamp((L-.025)/.025)*clamp((.25-L)/.045);
 const enter=clamp((L-.025)/.065),bounce=1+2.70158*(enter-1)**3+1.70158*(enter-1)**2;
 const titleY=h*.16-(1-bounce)*h*.18-clamp((L-.205)/.045)*h*.15;
 if(titleAlpha>0){g.save();g.globalAlpha=titleAlpha;const size=Math.max(2,Math.floor(Math.min(w/38,h/28)));const tw=5*size*6;g.fillStyle='#314436';g.fillRect(w/2-tw/2-12,titleY-9,tw+24,size*7+18);bitmap(g,'PIXEL',w/2-tw/2,titleY,size);g.restore();}
 g.imageSmoothingEnabled=true;
if(f.crossedFwd(.218))f.shake(4);
},tap(id,f){if(id==='sign')f.shake(2);}};
