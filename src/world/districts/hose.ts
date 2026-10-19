import { drawPose, poseHeight, queueArt } from '../../sketch/art';
import { bgImage, drawBg } from '../../sketch/bg';
import { cycle } from '../../sketch/common';
import { clamp, type District, type WorldFrame } from '../types';

const black = '#241711', cream = '#fff0c8';
const broom = [0, 1, 2, 3, 5];
const drawings = ['home_3', 'hat_1', 'fall_0', 'leap_3', 'ride_0', 'ride_2', 'closeup_1', 'closeup_2',
  ...broom.map(n => `broom_${n}`), ...[0, 1, 2].flatMap(n => [`knock_${n}`, `broom_wink_${n}`])];
const smooth = (a: number, b: number, x: number) => { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); };
const mix = (a: number, b: number, q: number) => a + (b - a) * q;
let vignette: CanvasGradient | undefined, vw = 0, vh = 0;
// The film engine already supplies animated film grain. Only the edge exposure is local.
function lettering(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, width: number) {
  g.save(); g.translate(x, y); g.font = `900 ${size}px 'Cooper Black', 'Georgia', serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.scale(Math.min(1, width / Math.max(1, g.measureText(text).width)), 1);
  g.lineJoin = 'round'; g.lineWidth = size * .13; g.strokeStyle = black; g.fillStyle = cream;
  g.strokeText(text, 0, size * .065); g.fillText(text, 0, 0); g.restore();
}
function plate(g: CanvasRenderingContext2D, key: string, w: number, h: number, shift: number, y: number) {
  const im = bgImage(key); if (!im) return;
  const sw = Math.max(w * 1.4, h * 1.5), sh = sw * im.naturalHeight / im.naturalWidth;
  g.drawImage(im, (w - sw) / 2 + shift, y - sh * .5, sw, sh);
}
// Split the painted flag once, so the actual mailbox flag can fall independently.
let box: HTMLCanvasElement | undefined, flag: HTMLCanvasElement | undefined;
function mailboxArt() {
  if (box) return;
  const im = bgImage('hs_mailbox'); if (!im) return;
  box = document.createElement('canvas'); flag = document.createElement('canvas');
  box.width = flag.width = im.naturalWidth; box.height = flag.height = im.naturalHeight;
  const b = box.getContext('2d')!, a = flag.getContext('2d')!, W = box.width, H = box.height;
  const outline = (c: CanvasRenderingContext2D) => {
    c.beginPath(); c.moveTo(W * .58, H * .29); c.lineTo(W * .65, 0);
    c.lineTo(W * .86, 0); c.lineTo(W * .86, H * .125); c.lineTo(W * .71, H * .12);
    c.lineTo(W * .68, H * .29); c.closePath();
  };
  a.save(); outline(a); a.clip(); a.drawImage(im, 0, 0); a.restore();
  b.drawImage(im, 0, 0); b.globalCompositeOperation = 'destination-out'; outline(b); b.fill();
  b.globalCompositeOperation = 'destination-over'; b.fillStyle = '#b94720';
  b.beginPath(); b.moveTo(W * .59, H * .12); b.lineTo(W * .72, H * .145);
  b.lineTo(W * .69, H * .30); b.lineTo(W * .58, H * .29); b.fill();
}
function contact(f: WorldFrame, age: number, mx: number, my: number) {
  const { ctx: g, w, h } = f;
  const fly = smooth(.22, 1.25, age), unfold = smooth(.95, 1.65, age);
  const cw = mix(w * .14, w * .96, fly), ch = mix(w * .09, h * .84, fly);
  const cx = mix(mx, w / 2, fly), cy = mix(my, h * .51, fly) - Math.sin(fly * Math.PI) * h * .28;
  g.save(); g.fillStyle = `rgba(36,23,17,${unfold * .58})`; g.fillRect(0, 0, w, h);
  g.translate(cx, cy); g.rotate((1 - fly) * -.5 + Math.sin(age * 12) * Math.exp(-age * 4) * .12);
  g.fillStyle = cream; g.strokeStyle = black; g.lineWidth = Math.max(2, w * .006);
  g.fillRect(-cw / 2, -ch / 2, cw, ch); g.strokeRect(-cw / 2, -ch / 2, cw, ch);
  if (unfold < 1) {
    g.beginPath(); g.moveTo(-cw / 2, -ch / 2); g.lineTo(0, ch * (.18 - unfold * .65));
    g.lineTo(cw / 2, -ch / 2); g.stroke();
  }
  g.globalAlpha = unfold;
  lettering(g, 'Say hi', 0, -ch * .19, Math.min(w * .17, h * .16), cw * .83);
  lettering(g, '—', 0, -ch * .015, Math.min(w * .08, h * .07), cw * .8);
  lettering(g, 'hello@example.com', 0, ch * .12, Math.min(w * .074, h * .09), cw * .85);
  g.strokeStyle = black; g.lineWidth = 2; g.beginPath(); g.moveTo(-cw * .39, ch * .2); g.lineTo(cw * .39, ch * .2); g.stroke();
  const stamp = smooth(1.7, 1.88, age);
  if (stamp > 0) {
    const s = Math.min(w * .14, h * .13) * (1 + (1 - stamp) * 1.6);
    g.save(); g.translate(cw * .31, ch * .34); g.rotate(-.13); g.globalAlpha = stamp;
    g.strokeStyle = g.fillStyle = '#b52d23'; g.lineWidth = s * .075;
    g.strokeRect(-s / 2, -s / 2, s, s); g.strokeRect(-s * .39, -s * .39, s * .78, s * .78);
    g.font = `bold ${s * .52}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MG', 0, s * .025); g.restore();
  }
  g.restore();
  if (unfold > .95) {
    // Tile circles along the full email underline: touch works across its entire width.
    const r = Math.max(24, Math.min(w * .07, h * .055)), yy = cy + ch * .12;
    for (let x = w * .16; x <= w * .85; x += r * 1.4) f.hot('hose-mailto', x, yy, r);
    f.hot('hose-close', w * .5, cy + ch * .43, Math.max(24, w * .12));
    g.save(); g.font = `${Math.min(24, w * .05)}px 'Caveat Brush'`; g.textAlign = 'center'; g.fillStyle = black;
    g.fillText('Back to the sunset ×', w * .5, cy + ch * .44); g.restore();
  }
}
let dismissedAt = -Infinity;
export const hose: District = {
  key: 'hose', name: 'Rubber hose', len: 7,
  preload() { for (const name of drawings) queueArt(`hose-${name}`, 5); },
  draw(f, L) {
    const { ctx: g, w, h, t, face } = f;
    const beat = t * Math.PI * 2 * 1.65, bounce = Math.sin(beat), twoBeat = Math.sin(beat * .5);
    const ground = h * .79, pan = smooth(.25, .57, L), ride = smooth(.66, .81, L);
    const push = 1 + .12 * smooth(.34, .39, L) * (1 - smooth(.46, .53, L));
    const whip = Math.sin(smooth(.65, .73, L) * Math.PI) * (f.calm ? .015 : .09) * w;
    g.fillStyle = '#efaa68'; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w * .5, ground); g.scale(push, push); g.translate(-w * .5 - whip, -ground);
    drawBg(g, 'hs_sky', w, h, .5, 1, 1.04);
    const sun = bgImage('hs_sun'), sr = Math.min(w * .39, h * .31);
    if (sun) g.drawImage(sun, w * .65 - pan * w * .1 - sr, h * .35 - sr + twoBeat * 2, sr * 2, sr * 2);
    plate(g, 'hs_cloud_far', w, h, -pan * w * .12 + Math.sin(t * .17) * w * .025, h * .47 + twoBeat * 3);
    plate(g, 'hs_cloud_near', w, h, -pan * w * .27 + Math.sin(t * .23) * w * .035, h * .72 + bounce * 4);
    // One broad rolling stage, with a single elastic contour instead of detail noise.
    const gy = ground + bounce * 3;
    g.fillStyle = '#aa633a'; g.strokeStyle = black; g.lineWidth = 4;
    g.beginPath(); g.moveTo(-w, gy + 20); g.bezierCurveTo(w * .1, gy - 20, w * .65, gy + 16, w * 2, gy - 10);
    g.lineTo(w * 2, h * 2); g.lineTo(-w, h * 2); g.closePath(); g.fill(); g.stroke();
    const age = f.since('hs_mailbox'), open = Number.isFinite(age) && t - age > dismissedAt;
    mailboxArt();
    const mh = Math.min(h * .37, w * .57), mw = mh * (box ? box.width / box.height : .64);
    const mx = w * (.87 - pan * .11), my = gy - mh * .70;
    const knock = Math.sin(clamp((L - .40) / .065) * Math.PI * 3) * (1 - smooth(.44, .48, L));
    g.save(); g.translate(mx, gy); g.rotate(bounce * .023 + knock * .055); g.scale(1 - bounce * .018, 1 + bounce * .018);
    if (box && flag) {
      g.drawImage(box, -mw / 2, -mh, mw, mh);
      g.save(); g.translate(mw * .15, -mh * .72); g.rotate(open ? smooth(0, .35, age) * 1.8 : 0);
      g.drawImage(flag, -mw * .65, -mh * .28, mw, mh); g.restore();
    }
    g.restore();
    const glint = Math.pow(Math.max(0, Math.sin(t * 1.7)), 14);
    g.save(); g.translate(mx - mw * .21, my); g.strokeStyle = cream; g.lineWidth = 2;
    g.globalAlpha = .35 + glint * .65; const gr = 5 + glint * 8;
    g.beginPath(); g.moveTo(-gr, 0); g.lineTo(gr, 0); g.moveTo(0, -gr); g.lineTo(0, gr); g.stroke(); g.restore();
    // Transform the target through the same camera as the painting.
    const screenX = (x: number) => w * .5 + (x - whip - w * .5) * push;
    const screenY = (y: number) => ground + (y - ground) * push;
    if (!open) f.hot('hs_mailbox', screenX(mx), screenY(my), Math.max(35, mw * .72 * push));
    let pose = 'hose-home_3', x = w * .33, y = gy, rot = 0, squash = 1 + bounce * .055;
    if (L < .14) { y -= Math.sin(smooth(0, .14, L) * Math.PI) * h * .11; pose = 'hose-leap_3'; }
    else if (L < .34) {
      const q = clamp((L - .14) / .2); pose = `hose-broom_${broom[Math.min(4, Math.floor(q * 5))]}`;
      x += Math.sin(q * Math.PI * 2) * w * .12; rot = Math.sin(q * Math.PI * 2) * .2;
      squash += Math.sin(q * Math.PI * 4) * .16;
    } else if (L < .40) {
      pose = cycle('hose-broom_wink', 3, (L - .34) * 13, 3); x = mix(w * .33, mx - mw * .77, smooth(.34, .4, L));
      squash -= Math.sin(smooth(.34, .4, L) * Math.PI) * .2;
    } else if (L < .50) { pose = `hose-knock_${Math.min(2, Math.floor(clamp((L - .4) / .08) * 3))}`; x = mx - mw * .77; rot = knock * -.07; }
    else if (L < .64) { pose = 'hose-hat_1'; x = mix(mx - mw * .77, w * .43, smooth(.50, .57, L)); rot = -.12 * Math.sin(smooth(.5, .64, L) * Math.PI); }
    else if (L < .82) {
      const q = clamp((L - .64) / .18); pose = q < .2 ? 'hose-fall_0' : q < .5 ? 'hose-ride_0' : 'hose-ride_2';
      x = mix(w * .43, w * .63, ride) + Math.sin(q * Math.PI * 2) * w * .2;
      y -= Math.sin(q * Math.PI) * h * .18; squash += Math.sin(q * Math.PI * 4) * .15; rot = Math.sin(q * Math.PI * 2) * .18;
    } else { pose = 'hose-hat_1'; x = mix(w * .63, w * .46, smooth(.82, .87, L)); }
    if (f.idle > 3 && L > .14 && L < .82) { pose = cycle('hose-broom_wink', 3, t, 1.5); rot += Math.sin(t * 2) * .045; }
    g.save(); g.fillStyle = '#40261750'; g.beginPath(); g.ellipse(x, gy + 4, face * .85 * (1 - (gy - y) / h), face * .12, 0, 0, Math.PI * 2); g.fill(); g.restore();
    drawPose(g, pose, x, y, face, { rot, squash, boil: .003 });
    if (!open) f.hot('boy', screenX(x), screenY(y - poseHeight(pose, face) * .5), face * 1.4 * push);
    g.restore();
    if (f.crossedFwd(.435)) f.shake(5);
    // Intro lettering is drawn as a bouncing, outlined cartoon credit.
    const title = smooth(.025, .07, L) * (1 - smooth(.17, .235, L));
    if (title > 0) {
      g.save(); g.globalAlpha = title; g.translate(w * .5, h * .22 - (1 - title) * h * .12); g.rotate(twoBeat * .025);
      g.scale(1 + bounce * .018, 1 - bounce * .025);
      lettering(g, 'RUBBER', 0, -h * .045, Math.min(w * .18, h * .13), w * .86);
      lettering(g, 'HOSE', 0, h * .065, Math.min(w * .22, h * .16), w * .85); g.restore();
    }
    // This arrives before L=.8214, where the engine begins the final iris.
    const end = smooth(.775, .835, L);
    if (end > 0) {
      const r = Math.min(w * .47, h * .43);
      g.save(); g.translate(w * .46, h * .49); g.scale(end, end);
      g.fillStyle = '#733f28'; g.strokeStyle = cream; g.lineWidth = r * .026;
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.arc(0, 0, r * .91, 0, Math.PI * 2); g.lineWidth = r * .008; g.stroke();
      lettering(g, 'See you', 0, -r * .47, r * .27, r * 1.6);
      lettering(g, 'around!', 0, -r * .16, r * .30, r * 1.6);
      drawPose(g, 'hose-hat_1', 0, r * .78, Math.min(face * .82, r * .26), { squash: 1 + bounce * .035, rot: twoBeat * .035 }); g.restore();
    }
    if (!vignette || vw !== w || vh !== h) {
      vw = w; vh = h; vignette = g.createRadialGradient(w * .5, h * .48, Math.min(w, h) * .2, w * .5, h * .5, Math.hypot(w, h) * .62);
      vignette.addColorStop(0, '#24171100'); vignette.addColorStop(1, '#24171170');
    }
    g.fillStyle = vignette; g.fillRect(0, 0, w, h);
    if (open) contact(f, age, screenX(mx), screenY(my));
  },
  tap(id, f) {
    if (id === 'hs_mailbox') f.shake(3);
    if (id === 'hose-close') dismissedAt = f.t;
    if (id === 'hose-mailto') window.location.href = 'mailto:hello@example.com';
  },
};
