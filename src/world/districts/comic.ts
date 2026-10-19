import { drawPose, queueArt } from '../../sketch/art';
import { bgImage, drawBg } from '../../sketch/bg';
import { clamp, type District, type WorldFrame } from '../types';

const BLACK = '#141020', PAPER = '#ffe7a5', RED = '#f04c5c';
const drawings = ['saberdraw_0','saberdraw_1','saberdraw_2','saberdraw_3',
  'saber_1','saber_2','saber_3','saber_4','saber_5',
  'saberlock_0','saberlock_1','saberlock_2','saberlock_3',
  'swing_0','swing_1','swing_2','escape_0','escape_1','escape_2','escape_3',
  'curious','comedy_3','home_1','home_3','hero_0','bye_0'];
const dotTile = document.createElement('canvas');
dotTile.width = dotTile.height = 12;
const dots = dotTile.getContext('2d')!;
dots.fillStyle = '#141020'; dots.beginPath(); dots.arc(3,3,1.7,0,Math.PI*2); dots.fill();
let pattern: CanvasPattern | null = null;
const ease = (v: number) => { const q = clamp(v); return q*q*(3-2*q); };
const frame = (q: number, n: number) => Math.min(n-1, Math.floor(clamp(q)*n));

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath();
  for(let i=0;i<10;i++) { const a=i*Math.PI/5-Math.PI/2, s=i%2?r*.43:r;
    if(i===0)g.moveTo(x+Math.cos(a)*s,y+Math.sin(a)*s);else g.lineTo(x+Math.cos(a)*s,y+Math.sin(a)*s);
  } g.closePath();
}
function halftone(g: CanvasRenderingContext2D, alpha: number) {
  pattern ??= g.createPattern(dotTile,'repeat');
  if(pattern){g.save();g.globalAlpha*=alpha;g.fillStyle=pattern;g.fill();g.restore();}
}
function planet(g: CanvasRenderingContext2D, x: number, y: number, size: number, t: number) {
  const im=bgImage('cm_earth'); if(!im)return;
  g.save();g.translate(x,y);g.rotate(Math.sin(t*.09)*.12+t*.012);
  const s=size/Math.max(im.naturalWidth,im.naturalHeight);
  g.drawImage(im,-im.naturalWidth*s/2,-im.naturalHeight*s/2,im.naturalWidth*s,im.naturalHeight*s);g.restore();
}
function burst(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, strength: number) {
  g.save();g.translate(x,y);g.scale(strength,strength);g.beginPath();
  for(let i=0;i<24;i++){const a=i*Math.PI/12,r=i%2?.23:1;
    const px=Math.cos(a)*w*r,py=Math.sin(a)*h*r;
    if(i===0)g.moveTo(px,py);else g.lineTo(px,py);
  }g.closePath();g.fillStyle=PAPER;g.fill();g.strokeStyle=BLACK;g.lineWidth=5;g.stroke();halftone(g,.2);g.restore();
}
function scene(f: WorldFrame, i: number, q: number, w: number, h: number) {
  const {ctx:g,t}=f, face=Math.min(f.face*1.1,w*.125,h*.115), floor=h*.84;
  g.fillStyle='#30234e';g.fillRect(0,0,w,h);drawBg(g,'cm_space',w,h,.3+i*.1,1,1.08);
  planet(g,w*(.72-i*.07),h*.24,Math.min(w*.48,h*.36),t+i*8);
  // The moon is cover fitted into a full-width floor, including ultrawide views.
  g.save();g.translate(0,h*.69);drawBg(g,'cm_moon',w,h*.36,.25);g.restore();
  g.fillStyle=BLACK;g.beginPath();g.ellipse(w*.5,floor+face*.16,w*.3,face*.19,0,0,Math.PI*2);g.fill();
  let x=w*.36,y=floor,rot=0,squash=1,key='comic-home_1';
  let rivalX=w*.8,rivalY=floor,rivalKey='comic-saberlock_0';
  const breath=Math.sin(t*2.5)*face*.022;
  if(i===0){
    const draw=clamp((q-.18)/.64);key=`comic-saberdraw_${frame(draw,4)}`;
    x=w*(.34+.08*ease(draw));squash=1-.12*Math.sin(draw*Math.PI);rot=-.09*Math.sin(draw*Math.PI);
    rivalX=w*.85; rivalKey='comic-saberdraw_0';
  } else if(i===1){
    const attack=ease((q-.15)/.7);key=`comic-saber_${1+frame(attack,5)}`;
    x=w*(.19+.27*attack);y-=Math.sin(attack*Math.PI)*h*.16;
    squash=1+.17*Math.sin(attack*Math.PI*2);rot=-.16+attack*.3;
    rivalX=w*(.83-.19*attack);rivalKey=`comic-saber_${5-frame(attack,5)}`;
  } else if(i===2){
    const hit=ease(q/.22),strain=Math.sin(t*13)*.008;
    burst(g,w*.51,h*.48,w*.78,h*.57,.65+hit*.35);
    key=`comic-saberlock_${frame(q,4)}`;rivalKey=key;
    x=w*(.35+.07*hit)+face*strain;rivalX=w*(.65-.07*hit)-face*strain;
    squash=.89+.1*ease((q-.25)/.7);rot=.1;rivalY+=face*.05;
  } else if(i===3){
    const swing=ease((q-.12)/.66);key=`comic-swing_${frame(swing,3)}`;
    x=w*(.34+.22*swing);y-=Math.sin(swing*Math.PI)*h*.18;rot=-.35+swing*.6;
    squash=1+.13*Math.sin(swing*Math.PI);
    rivalX=w*(.65+.45*swing);rivalY-=Math.sin(swing*Math.PI*.7)*h*.3;rivalKey='comic-fall_3';
    // One sweeping blade arc, rather than a field of trails.
    g.save();g.strokeStyle=PAPER;g.lineWidth=face*.3;g.beginPath();
    g.ellipse(w*.5,h*.47,w*.34,h*.23,-.35,Math.PI*1.02,Math.PI*(1.08+swing*.88));g.stroke();g.restore();
  } else {
    const leave=ease((q-.12)/.82);key=`comic-escape_${frame(leave,4)}`;
    x=w*(.3+.65*leave);y-=Math.sin(leave*Math.PI)*h*.37;rot=leave*.22;
    rivalX=-w;rivalKey='comic-home_3';
    if(q>.92){key='comic-bye_0';x=w*.82;y=floor-h*.12;}
  }
  if(rivalX>-face*3 && rivalX<w+face*3){
    drawPose(g,rivalKey,rivalX,rivalY+breath,face,{flip:true,tint:'#21152f',rot:-rot,boil:0});
    drawPose(g,rivalKey,rivalX,rivalY+breath,face,{flip:true,alpha:.52,rot:-rot,boil:0});
  }
  if(f.idle>3){const bit=(t%6);if(bit<1.3){key=bit<.7?'comic-curious':'comic-comedy_3';rot=Math.sin(bit*Math.PI)*.07;}}
  drawPose(g,key,x,y+breath,face,{rot,squash,boil:.003});
}

export const comic: District = {
  key:'comic',name:'Comic',len:8,
  preload(){for(const key of drawings)queueArt(`comic-${key}`,1);queueArt('comic-fall_3',1);for(const key of ['cm_space','cm_moon','cm_earth'])bgImage(key);},
  draw(f,L){
    const {ctx:g,w,h,t}=f;
    g.fillStyle=BLACK;g.fillRect(0,0,w,h);drawBg(g,'cm_space',w,h);
    // Five panels share a page coordinate system. Hold, then whip across the gutter.
    const position=clamp(L)*5, shot=Math.min(4,Math.floor(position)),q=clamp(position-shot);
    const fly=shot<4?ease((q-.76)/.24):0,cam=shot+fly;
    const gutter=Math.max(12,w*.035),pw=w-gutter*2,ph=h*.86,top=h*.075;
    for(let i=Math.max(0,shot-1);i<=Math.min(4,shot+1);i++){
      const px=gutter+(i-cam)*(w+gutter),py=top+(i%2?1:-1)*h*.018;
      if(px>w || px+pw<0)continue;
      g.save();g.translate(px,py);g.beginPath();g.rect(0,0,pw,ph);g.clip();
      const local=i===shot?q:i>shot?0:1;
      // A small push concentrates the lock; the camera movement stays reversible.
      const zoom=i===2?1+.12*ease(local/.6):1+.035*ease(local);
      g.translate(pw*.5,ph*.55);g.scale(zoom,zoom);g.translate(-pw*.5,-ph*.55);
      scene(f,i,local,pw,ph);g.restore();
      g.strokeStyle=BLACK;g.lineWidth=Math.max(7,w*.008);g.strokeRect(px,py,pw,ph);
      g.strokeStyle=PAPER;g.lineWidth=2;g.strokeRect(px+5,py+5,pw-10,ph-10);
    }
    // Screen-space find remains reachable during camera flights, on touch too.
    const sx=w*.83,sy=h*.19+Math.sin(t*1.7)*Math.min(5,h*.006),sr=Math.min(w*.055,h*.045);
    const since=f.since('comic-star'),pop=since<.42?Math.sin(since/.42*Math.PI):0;
    g.save();g.translate(sx,sy);g.rotate(Math.sin(t*.6)*.12+pop*.4);
    star(g,0,0,sr*(1+pop*.5+(f.over('comic-star')?.12:0)));g.fillStyle=PAPER;g.fill();halftone(g,.8);g.strokeStyle=BLACK;g.lineWidth=3;g.stroke();
    const glint=Math.pow(Math.max(0,Math.sin(t*1.1)),16);
    g.globalAlpha=glint;g.strokeStyle='#fff9df';g.lineWidth=2;g.beginPath();g.moveTo(-sr*.55,0);g.lineTo(sr*.55,0);g.moveTo(0,-sr*.55);g.lineTo(0,sr*.55);g.stroke();g.restore();
    f.hot('comic-star',sx,sy,Math.max(24,sr*1.5));
    if(L>.02&&L<.24){
      const a=ease((L-.02)/.025)*(1-ease((L-.17)/.07)),size=Math.min(w*.19,h*.18);
      g.save();g.globalAlpha=a;g.translate(w*.48,h*.31-(1-a)*h*.1);g.rotate(-.075);
      g.font=`900 italic ${size}px Impact, Arial Black, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
      const scale=Math.min(1,w*.86/g.measureText('COMIC').width);g.scale(scale,1);
      g.strokeStyle=BLACK;g.lineWidth=size*.14;g.strokeText('COMIC',4,6);g.fillStyle=RED;g.fillText('COMIC',0,0);
      if(pattern){g.fillStyle=pattern;g.fillText('COMIC',0,0);}g.strokeStyle=PAPER;g.lineWidth=2;g.strokeText('COMIC',0,0);g.restore();
    }
    if(since<6){
      const enter=ease((since-.18)/.55),exit=ease((since-5)/.8),a=enter*(1-exit);
      const bw=Math.min(w*.78,h*.64),bh=Math.min(h*.47,bw*1.12),bx=w*.5-bw*.5+(1-a)*(w+bw),by=h*.48-bh*.5;
      g.save();g.translate(bx,by);g.rotate(-.045*a);g.fillStyle=BLACK;g.fillRect(8,10,bw,bh);g.fillStyle=PAPER;g.fillRect(0,0,bw,bh);
      g.beginPath();g.rect(0,0,bw,bh);halftone(g,.12);g.strokeStyle=BLACK;g.lineWidth=7;g.strokeRect(0,0,bw,bh);
      const wink=since>1.1&&since<2.1;
      drawPose(g,wink?'comic-comedy_3':'comic-curious',bw*.5,bh*.88,Math.min(bw*.17,bh*.2),{squash:1+Math.sin(clamp((since-.65)*2)*Math.PI)*.1,rot:wink?-.06:0});
      g.restore();
    }
    if(f.crossedFwd(.4)||f.crossedFwd(.6)||f.crossedFwd(.8)){f.shake(f.calm?2:10);f.flash(f.calm?.025:.12,PAPER);}
  },
  tap(id,f){if(id==='comic-star'){f.shake(f.calm?1:5);f.flash(.08,PAPER);}},
};
