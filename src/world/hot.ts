import { pokeHero } from '../sketch/art';
import type { District, WorldFrame } from './types';
interface Spot {id:string;x:number;y:number;r:number;district:District;frame:WorldFrame}
export function createHot(canvas: HTMLCanvasElement) {
  let spots: Spot[]=[],prior: Spot[]=[],owner:District,frame:WorldFrame,mx=-999,my=-999;
  const times=new Map<string,number>();
  let blot: {x:number;y:number;t:number}|null=null;
  const hit=(s:Spot)=>Math.hypot(mx-s.x,my-s.y)<s.r;
  window.addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;canvas.style.cursor=spots.some(hit)?'pointer':'default';});
  window.addEventListener('pointerdown',e=>{
    mx=e.clientX;my=e.clientY;blot={x:mx,y:my,t:performance.now()/1000};
    if((e.target as Element).closest('button,a,dialog,iframe'))return;
    const spot=spots.findLast(hit);
    if(spot){times.set(`${spot.district.key}:${spot.id}`,performance.now()/1000);spot.district.tap?.(spot.id,spot.frame);}
    pokeHero(mx,my);
  },{passive:true});
  return {
    begin(){prior=spots;spots=[];},
    bind(d:District,f:WorldFrame,active:boolean){owner=d;frame=f;return {
      hot(id:string,x:number,y:number,r:number){if(active)spots.push({id,x,y,r,district:d,frame:f});},
      since(id:string){return performance.now()/1000-(times.get(`${d.key}:${id}`)??-Infinity);},
      over(id:string){return prior.some(s=>s.district===d&&s.id===id&&hit(s));},
    };},
    draw(g:CanvasRenderingContext2D,t:number){if(!blot)return;const q=(t-blot.t)/.65;if(q>1){blot=null;return;}g.save();g.globalAlpha=(1-q)*.45;g.fillStyle='#1b1714';g.translate(blot.x,blot.y);g.beginPath();for(let i=0;i<28;i++){const a=i/28*Math.PI*2,r=(9+24*Math.sqrt(Math.max(0,q)))*(1+.12*Math.sin(i*7));if(i)g.lineTo(Math.cos(a)*r,Math.sin(a)*r);else g.moveTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.restore();},
    get current(){return {owner,frame};},
  };
}
