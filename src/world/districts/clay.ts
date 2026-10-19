import { drawPose, queueArt } from '../../sketch/art';
import { bgImage } from '../../sketch/bg';
import { cycle, drawPaper } from '../../sketch/common';
import { drawOneLine, ONE_HEIGHT } from '../../sketch/oneline';
import { map, type Point } from '../camera';
import { clamp, type District } from '../types';

// Coordinates measured on the painting, bottom island to top island.
const route: readonly Point[] = [[.46,.88],[.50,.81],[.43,.73],[.57,.65],[.43,.54],[.61,.43],[.49,.36],[.54,.26],[.48,.20],[.61,.12],[.61,.08]];
const cameraPath: readonly Point[] = [[.5,.5],[.5,.5]];
const theatreCutout = document.createElement('canvas');
let theatreReady = false;
let dialog: HTMLDialogElement | undefined;
let filmPending = false;
let returnFocus: HTMLElement | null = null;
const smooth = (q: number) => { q=clamp(q); return q*q*(3-2*q); };

function theatreImage() {
  if (theatreReady) return theatreCutout;
  const im=bgImage('cl_theatre');
  if (!im) return null;
  theatreCutout.width=im.naturalWidth; theatreCutout.height=im.naturalHeight;
  const g=theatreCutout.getContext('2d')!;
  g.drawImage(im,0,0);
  const pixels=g.getImageData(0,0,theatreCutout.width,theatreCutout.height);
  for(let i=0;i<pixels.data.length;i+=4){
    const r=pixels.data[i],green=pixels.data[i+1],b=pixels.data[i+2];
    const key=clamp((green-Math.max(r,b)-30)/95);
    pixels.data[i+3]=Math.round(pixels.data[i+3]*(1-key));
    if(key>0) pixels.data[i+1]=Math.min(green,Math.max(r,b)+30);
  }
  g.putImageData(pixels,0,0);theatreReady=true;
  return theatreCutout;
}

function openFilm() {
  const url=import.meta.env.VITE_FILM_URL;
  if(url){window.open(url,'_blank','noopener,noreferrer');return;}
  if(dialog?.open)return;
  returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  dialog=document.createElement('dialog');dialog.className='theatre';
  dialog.setAttribute('aria-label','The Sketch — Max Gabriel');
  const close=document.createElement('button');close.type='button';close.textContent='CLOSE ×';
  close.setAttribute('aria-label','Close film and return to clay islands');
  const iframe=document.createElement('iframe');iframe.title='The Sketch — Max Gabriel';iframe.src='./film.html';iframe.allow='fullscreen';
  close.onclick=()=>dialog?.close();
  dialog.addEventListener('close',()=>{dialog?.remove();dialog=undefined;returnFocus?.focus();},{once:true});
  dialog.append(iframe,close);document.body.append(dialog);dialog.showModal();close.focus();
}

export const clay: District = {
  key:'clay',name:'Clay',len:8,
  preload(){
    for(const [name,n] of [['fall',4],['hero',1],['home',2],['leap',1],['ride',4]] as const)
      for(let i=0;i<n;i++)queueArt(`clay-${name}_${i}`,4);
    bgImage('cl_map');bgImage('cl_theatre');
  },
  draw(f,L){
    const {ctx:g,w,h,face}=f;
    const t=Math.floor(f.t*12)/12;
    // Four deliberately uneven jumps: crouch, fast launch, float, drop, held landing.
    const journey=clamp((L-.10)/.69)*4;
    const leg=Math.min(3,Math.floor(journey)),q=journey-leg;
    const travel=smooth((q-.18)/.56);
    const a=route[leg*2],m=route[leg*2+1],b=route[leg*2+2];
    const bend=Math.sin(travel*Math.PI);
    let px=a[0]+(b[0]-a[0])*travel+(m[0]-(a[0]+b[0])*.5)*bend;
    let py=a[1]+(b[1]-a[1])*travel;
    if(L>=.79){const end=smooth((L-.79)/.10);px=route[8][0]+(route[9][0]-route[8][0])*end;py=route[8][1]+(route[9][1]-route[8][1])*end;}
    // The engine cuts to Chalk at L=.922: let the fall be unmistakable before it.
    const exit=clamp((L-.885)/.065);
    const push=1+.16*Math.sin(travel*Math.PI)+.20*(1-smooth(Math.abs(L-.47)/.10));
    const pw=Math.max(w*1.10,h*.84)*push,ph=pw*1.5;
    const cx=Math.max(w*.5/pw,Math.min(1-w*.5/pw,px));
    const cy=Math.max(h*.5/ph,Math.min(1-h*.5/ph,py-.055));
    const jitter=f.calm?0:Math.sin(t*57)*.65;
    const ox=w*.5-cx*pw+jitter,oy=h*.5-cy*ph+Math.cos(t*43)*jitter;
    g.fillStyle='#79b8ca';g.fillRect(0,0,w,h);
    // Apply the winding camera outside map's plate renderer: this preserves the
    // painting's aspect and the exact same projection for props and the boy.
    g.save();g.translate(ox,oy);
    map({...f,w:pw,h:ph*.5},0,'cl_map',cameraPath);g.restore();

    const tx=ox+pw*.495,ty=oy+ph*.432;
    const tw=pw*.28,th=tw*(1006/1454),since=f.since('cl_theatre');
    const arrival=smooth((L-.385)/.055)*(1-smooth((L-.54)/.04));
    const reaction=Number.isFinite(since)?Math.sin(since*18)*Math.exp(-since*3):0;
    const wobble=arrival*Math.sin(t*8)*.015+reaction*.08;
    const theatre=theatreImage();
    g.save();g.translate(tx,ty);g.rotate(wobble);
    g.scale(1+reaction*.05,1-reaction*.08);
    if(theatre)g.drawImage(theatre,-tw*.5,-th,tw,th);
    else {g.fillStyle='#ad5334';g.fillRect(-tw*.5,-th,tw,th);}
    // The screen is a live miniature of the film's opening ink line.
    const screenW=tw*.48,screenH=th*.41;
    g.save();g.beginPath();g.rect(-screenW*.5,-th*.56,screenW,screenH);g.clip();
    g.translate(-screenW*.5,-th*.56);drawPaper(g,screenW,screenH);
    drawOneLine(g,screenW*.5,screenH*.91,screenH*.72/ONE_HEIGHT,1,Math.max(.7,screenW*.006),'#262322');g.restore();
    const curtain=(1-arrival)*.37+Math.max(0,1-since*2)*.45;
    g.fillStyle='#9d2f22';
    for(const side of [-1,1]){g.save();g.translate(side*screenW*.5,-th*.56);g.scale(side,1);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(-screenW*curtain,screenH*.45,0,screenH);g.lineTo(-screenW*curtain,screenH);g.lineTo(-screenW*curtain,0);g.fill();g.restore();}
    // One slow, broad marquee glint makes the find legible without hover.
    const glint=Math.pow(Math.max(0,Math.sin(t*1.5)),10);
    g.strokeStyle=`rgba(255,238,166,${.2+glint*.8})`;g.lineWidth=Math.max(2,tw*.018);
    g.beginPath();g.ellipse(0,-th*.70,tw*.31,th*.04,0,Math.PI,Math.PI*2);g.stroke();g.restore();
    if(tx>-tw&&tx<w+tw&&ty>-th&&ty<h+th)f.hot('cl_theatre',tx,ty-th*.48,Math.max(32,tw*.46));

    const lift=Math.sin(travel*Math.PI)*Math.min(h*.25,pw*.15);
    let x=ox+px*pw,y=oy+py*ph-lift;
    let pose='clay-hero_0',squash=1,rot=0;
    if(L<.10){pose=cycle('clay-home',2,L*12,12);y-=(1-smooth(L/.10))*h*.23;}
    else if(L<.79){
      if(q<.18){pose='clay-home_1';squash=1-.27*Math.sin(q/.18*Math.PI*.5);}
      else if(q<.52){pose='clay-leap_0';squash=1+.18*Math.sin(travel*Math.PI);rot=(b[0]-a[0])*.6;}
      else if(q<.74){pose=cycle('clay-fall',4,travel*.33,12);rot=-.08;}
      else if(q<.87){pose='clay-fall_3';squash=1-.30*Math.sin((q-.74)/.13*Math.PI);}
    }else if(L<.885){pose=cycle('clay-ride',4,L*8,12);y+=Math.sin(t*3)*face*.025;}
    if(f.idle>3&&q>.87&&L<.79){pose=cycle('clay-home',2,t*.12,12);squash=1+Math.sin(t*3)*.035;rot=Math.sin(t*2)*.035;}
    if(exit>0){pose=cycle('clay-fall',4,exit*.32,12);y+=exit*exit*h*.95;x+=exit*face;rot=exit*.65;squash=1+exit*.18;}
    const size=face*(f.portrait?.68:.85);
    g.save();g.fillStyle='#3c514747';g.beginPath();g.ellipse(ox+px*pw,oy+py*ph+3,size*(.60-travel*(1-travel)),size*.15,0,0,Math.PI*2);g.fill();g.restore();
    drawPose(g,pose,x,y+Math.sin(t*2)*size*.015,size,{squash,rot,flip:leg===2,boil:0,t});
    f.hot('boy',x,y-size*1.3,size*1.5);
    for(const at of [.10+.69*.185,.10+.69*.435,.10+.69*.685,.10+.69*.935])if(f.crossedFwd(at))f.shake(5);

    const titleIn=smooth((L-.025)/.035),titleOut=1-smooth((L-.16)/.06);
    if(titleIn*titleOut>0){
      g.save();g.globalAlpha=titleIn*titleOut;g.translate(w*.5,h*.25-(1-titleIn)*h*.13);g.rotate(-.055);
      const fs=Math.round(Math.min(w*.22,h*.21));g.font=`900 ${fs}px 'Arial Rounded MT Bold', sans-serif`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
      g.lineWidth=fs*.10;g.strokeStyle='#89462e';g.strokeText('CLAY',0,fs*.055);g.fillStyle='#d8733e';g.fillText('CLAY',0,fs*.055);
      g.strokeStyle='#f5bc70';g.lineWidth=fs*.055;g.strokeText('CLAY',0,0);g.fillStyle='#edaa5d';g.fillText('CLAY',0,0);
      g.strokeStyle='#a8623840';g.lineWidth=1.5;
      // Broad thumb impressions, one per letter, rather than a texture field.
      for(let i=0;i<4;i++){g.beginPath();g.ellipse((i-1.5)*fs*.67,fs*.08,fs*.105,fs*.15,-.5,0,Math.PI*1.6);g.stroke();}
      g.restore();
    }
  },
  tap(id,f){
    if(id!=='cl_theatre'||filmPending||dialog?.open)return;
    f.shake(5);
    if(import.meta.env.VITE_FILM_URL){openFilm();return;}
    // Let the marquee recoil, curtains close, and stage reopen before the film.
    filmPending=true;
    window.setTimeout(()=>{filmPending=false;openFilm();},720);
  },
};
