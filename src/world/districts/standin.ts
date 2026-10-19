import { drawPose,queueArt } from '../../sketch/art';
import { drawPaper,drawSpark,INK } from '../../sketch/common';
import { bgImage } from '../../sketch/bg';
import { depth,map,panels,side } from '../camera';
import type { District,Key } from '../types';
export function standin(key:Key,name:string,kind:'depth'|'map'|'panels'|'side',paintings:string[],pose:string,find:string):District {
 return {key,name,len:7,preload(){queueArt(pose,5);},draw(f,L){
 const {ctx:g,w,h,face,t}=f;drawPaper(g,w,h);let x=w*.45,y=h*.77;
 if(key==='chalk'){g.fillStyle='#263633';g.fillRect(0,0,w,h);g.strokeStyle='#dedfcd';g.lineWidth=3;g.beginPath();g.moveTo(w*.06,h);g.lineTo(w*.46,h*.33);g.lineTo(w*.54,h*.33);g.lineTo(w*.94,h);g.stroke();}
 if(kind==='depth')depth(f,L,paintings.map((p,i)=>({key:p,depth:.1+i*.4})));
 if(kind==='panels')panels(f,L,paintings);
 if(kind==='side')side(f,L*3,paintings.map((p,i)=>({key:p,depth:.1+i*.2,height:1})));
 if(kind==='map'){[x,y]=map(f,L,'cl_map',[[.2,.4],[.75,.7],[.35,1.1],[.7,1.6]]);}
 if(key==='clay'||key==='chalk'){g.save();g.fillStyle=key==='chalk'?'#e9e9d8':'#70604e';g.font=`${Math.min(w*.13,h*.13)}px 'Caveat Brush'`;g.textAlign='center';g.fillText(name,w*.5,h*.23);g.restore();}
 drawPose(g,pose,x,y+Math.sin(t*2)*face*.04,face*(kind==='map'?.7:1),{rot:Math.sin(t*1.3)*.025});f.hot('boy',x,y-face,face*1.6);
 const fx=w*.76,fy=h*.67,r=face*.6,im=bgImage(find);g.save();g.translate(fx,fy);g.rotate(Math.sin(t*1.4)*.06);g.scale(1,1+Math.sin(f.since(find)*12)*Math.exp(-f.since(find)*4)*.2);
 if(im)g.drawImage(im,-r,-r,r*2,r*2);else{g.strokeStyle=key==='chalk'?'#eee9db':INK;g.fillStyle=key==='hose'?'#c0aa83':'#d6c6a4';g.lineWidth=3;g.fillRect(-r,-r*.7,r*2,r*1.4);g.strokeRect(-r,-r*.7,r*2,r*1.4);g.font=`${r*.45}px 'Caveat Brush'`;g.textAlign='center';g.fillStyle=INK;g.fillText(key==='clay'?'FILM':key==='hose'?'HELLO':'?',0,r*.15);}
 g.restore();f.hot(find,fx,fy,r*1.5);drawSpark(g,x+face,y-face*.3,face*.12);
 },tap(id,f){f.shake(3);if(id==='cl_theatre')openTheatre();if(id==='hs_mailbox')window.location.href='mailto:hello@example.com';}};
}
function openTheatre(){
 const dialog=document.createElement('dialog');dialog.className='theatre';const close=document.createElement('button');close.textContent='CLOSE ×';const iframe=document.createElement('iframe');iframe.title='The Sketch — Max Gabriel';iframe.src=import.meta.env.VITE_FILM_URL||'./film.html';close.onclick=()=>{dialog.close();dialog.remove();};dialog.append(close,iframe);document.body.append(dialog);dialog.showModal();
}
