import { drawPose, poseTop, queueArt } from '../../sketch/art';
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
const captions = ['Meanwhile, on the moon…', 'A familiar challenge.', 'Neither gives an inch.', 'One breath. Hold it.', 'And then… gone.'];

function narration(g: CanvasRenderingContext2D, text: string, w: number, h: number) {
  const size=Math.round(Math.min(w*.043,h*.071));
  g.font=`italic 700 ${size}px Georgia, serif`;
  const pad=size*.65, bw=Math.min(w*.92,g.measureText(text).width+pad*2), bh=size*2;
  g.fillStyle='#ffe58b';g.fillRect(w*.035,h*.045,bw,bh);
  g.strokeStyle=BLACK;g.lineWidth=2;g.strokeRect(w*.035,h*.045,bw,bh);
  g.fillStyle=BLACK;g.textAlign='left';g.textBaseline='middle';
  g.fillText(text,w*.035+pad,h*.045+bh/2,bw-pad*2);
}
function scene(f: WorldFrame, i: number, q: number, w: number, h: number, peak: number) {
  const {ctx:g,t}=f, close=f.face*1.6/peak;
  const face=i===0?Math.min(h*.23,w*.11):i===3?close*1.4:close;
  const breath=Math.sin(t*2.5)*face*.025;
  g.fillStyle=i===3?'#ed5365':'#30234e';g.fillRect(0,0,w,h);
  if(i!==3)drawBg(g,'cm_space',w,h,.35+i*.1,1,1.08);
  if(i===0){
    planet(g,w*.71,h*.32,h*.6,t);
    g.save();g.translate(0,h*.68);drawBg(g,'cm_moon',w,h*.4,.25);g.restore();
  } else if(i===1){
    // One cropped Earth edge gives the close-up a different camera from the wide.
    planet(g,w*.95,h*.14,h*1.4,t);
  }
  let key='comic-home_1',x=w*.35,y=h*.92,rot=0,squash=1;
  let rival='',rx=w*.72,ry=y;
  const action=ease((q-.12)/.65);
  if(i===0){
    key=q<.55?'comic-home_1':'comic-curious';x=w*.33;
    rival='comic-saberdraw_0';rx=w*.68;
  }else if(i===1){
    key=`comic-saberdraw_${frame(action,4)}`;x=w*(.46+.06*action);
    y=Math.max(h*.9,h*.27+poseTop(key,face));
    rot=-.12*Math.sin(action*Math.PI);squash=1-.13*Math.sin(action*Math.PI);
  }else if(i===2){
    // Four long, deliberate speed strokes, never a particle field.
    g.strokeStyle='#ffe7a5';g.lineWidth=Math.max(2,h*.018);
    for(let j=0;j<4;j++){
      const yy=h*(.23+j*.2)+Math.sin(t*2+j)*h*.012;
      g.beginPath();g.moveTo(0,yy);g.lineTo(w*(.32+j*.055),yy-h*.13);g.stroke();
    }
    key=`comic-saber_${1+frame(action,5)}`;
    x=w*(.3+.22*action);y=h*.93-Math.sin(action*Math.PI)*h*.15;
    rot=-.2+action*.3;squash=1+.15*Math.sin(action*Math.PI*2);
    rival=`comic-saber_${5-frame(action,5)}`;rx=w*(.85-.18*action);ry=h*.94;
  }else if(i===3){
    burst(g,w*.5,h*.52,w*.58,h*.62,.8+.2*ease(q/.22));
    key=`comic-saberlock_${frame(action,4)}`;rival=key;
    x=w*.34+Math.sin(t*12)*face*.008;rx=w*.67;
    // Crop the legs: this panel belongs to faces and the blade lock.
    y=h*.26+poseTop(key,face);ry=y;rot=.08;squash=.92;
  }else{
    key= q<.45?`comic-swing_${frame(q/.45,3)}`:`comic-escape_${frame((q-.45)/.55,4)}`;
    x=w*(.35+.29*action);y=h*.94-Math.sin(action*Math.PI)*h*.2;
    rot=-.2+action*.4;
  }
  if(rival)drawPose(g,rival,rx,ry+breath,face,{flip:true,rot:-rot,boil:.002});
  if(f.idle>3 && (i===0||i===1||i===4) && t%7<1.2){
    key=t%7<.6?'comic-curious':'comic-comedy_3';
    y=Math.max(h*.92,h*.25+poseTop(key,face));rot=Math.sin(t*3)*.06;
  }
  drawPose(g,key,x,y+breath,face,{rot,squash,boil:.003});
  // Keep narration inside the close-up's visible strip, at a readable screen size.
  g.save();g.translate((w-w/peak)/2,0);
  narration(g,captions[i],w/peak,h/peak);g.restore();
}

export const comic: District = {
  key:'comic',name:'Comic',len:8,
  preload(){for(const key of drawings)queueArt(`comic-${key}`,1);queueArt('comic-fall_3',1);for(const key of ['cm_space','cm_moon','cm_earth'])bgImage(key);},
  draw(f,L){
    const {ctx:g,w,h,t}=f;
    g.fillStyle='#fffdf5';g.fillRect(0,0,w,h);
    // A real six-frame page: three stacked wides on a phone; three across on desktop.
    // The sixth slot is the secret's cover. All camera coordinates derive from L.
    const cols=f.portrait?1:3, gap=Math.max(12,Math.min(w,h)*.022);
    const pw=(w-gap*(cols+1))/cols, ph=f.portrait?(h-gap*4)/3:(h-gap*3)/2;
    const position=clamp(L)*5, shot=Math.min(4,Math.floor(position)),q=clamp(position-shot);
    const peak=f.portrait?Math.min(2.65,h*.85/ph):Math.min(w*.85/pw,h*.85/ph);
    const push=ease(q/.22)*(1-ease((q-.64)/.22));
    const zoom=1+((shot===0?Math.min(peak,1.35):peak)-1)*push*(f.calm?.45:1);
    const fly=shot<4?ease((q-.84)/.16):0;
    const col=shot%cols, row=Math.floor(shot/cols), next=Math.min(4,shot+1);
    const cx=gap+pw/2+(col+(next%cols-col)*fly)*(pw+gap);
    const cy=gap+ph/2+(row+(Math.floor(next/cols)-row)*fly)*(ph+gap);
    // Keep three rows in view on the phone between pushes, including the next scene.
    const baseY=f.portrait?Math.max(h/2,Math.min(cy,h*1.5)):h/2;
    const aimX=w/2+(cx-w/2)*push, aimY=baseY+(cy-baseY)*push;
    g.save();g.translate(w/2,h/2);g.scale(zoom,zoom);g.translate(-aimX,-aimY);
    for(let i=0;i<6;i++){
      const px=gap+(i%cols)*(pw+gap),py=gap+Math.floor(i/cols)*(ph+gap);
      const screenX=w/2+(px-aimX)*zoom,screenY=h/2+(py-aimY)*zoom;
      if(screenX>w||screenX+pw*zoom<0||screenY>h||screenY+ph*zoom<0)continue;
      g.save();g.translate(px,py);g.beginPath();g.rect(0,0,pw,ph);g.clip();
      if(i<5)scene(f,i,i===shot?q:i<shot?1:0,pw,ph,peak);
      else{
        g.fillStyle='#ffe58b';g.fillRect(0,0,pw,ph);
        star(g,pw*.5,ph*.48,Math.min(pw,ph)*(.24+Math.sin(t*1.8)*.015));
        g.fillStyle=BLACK;g.fill();
        narration(g,'A frame worth finding.',pw,ph);
        const hx=screenX+pw*zoom*.5,hy=screenY+ph*zoom*.48;
        if(hx>0&&hx<w&&hy>0&&hy<h)f.hot('comic-star',hx,hy,Math.min(pw,ph)*zoom*.28);
      }
      g.restore();g.strokeStyle=BLACK;g.lineWidth=6;g.strokeRect(px,py,pw,ph);
    }
    g.restore();
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
