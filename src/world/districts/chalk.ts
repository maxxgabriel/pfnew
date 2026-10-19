import { drawPose, poseHeight, queueArt } from '../../sketch/art';
import { bgImage } from '../../sketch/bg';
import { clamp, type District } from '../types';

const ease = (v: number) => { const q = clamp(v); return q * q * (3 - 2 * q); };
const chalkWhite = '#e8e7d2';
// Handwritten, open strokes: the title is drawn, rather than a font being faded in.
const letters = [
  [42, 3, 13, 0, 0, 17, 1, 57, 16, 71, 43, 65],
  [0, 0, 0, 72, -1, -1, 43, 1, 43, 70, -1, -1, 1, 36, 43, 33],
  [0, 72, 22, 0, 46, 72, -1, -1, 9, 46, 35, 44],
  [0, 0, 2, 71, 43, 69],
  [0, 0, 0, 72, -1, -1, 44, 0, 1, 37, 46, 72],
];
function title(g: CanvasRenderingContext2D, w: number, h: number, L: number) {
  const write = clamp((L - .018) / .115) * 5;
  const alpha = 1 - ease((L - .17) / .065);
  if (!alpha || !write) return;
  const s = Math.min(w * .82 / 290, h * .19 / 72);
  g.save(); g.translate((w - 290 * s) / 2, h * .17); g.scale(s, s);
  g.globalAlpha = alpha; g.strokeStyle = chalkWhite; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 5; i++) {
    const p = clamp(write - i), a = letters[i];
    if (!p) continue;
    g.save(); g.translate(i * 60, Math.sin(i * 3) * 3); g.beginPath();
    let pen = false;
    const end = p * (a.length / 2 - 1);
    for (let j = 0; j <= Math.floor(end); j++) {
      const x = a[j * 2], y = a[j * 2 + 1];
      if (x === -1) { pen = false; continue; }
      if (pen) g.lineTo(x, y); else g.moveTo(x, y);
      pen = true;
      if (j === Math.floor(end) && j + 1 < a.length / 2 && a[(j + 1) * 2] !== -1) {
        const q = end - j; g.lineTo(x + (a[(j + 1) * 2] - x) * q, y + (a[(j + 1) * 2 + 1] - y) * q);
      }
    }
    g.lineWidth = 4.2; g.stroke(); g.globalAlpha = alpha * .24; g.lineWidth = 7; g.stroke(); g.globalAlpha = alpha;
    g.restore();
  }
  g.restore();
}
function cloud(g: CanvasRenderingContext2D, x: number, y: number, width: number, alpha: number, flip = false) {
  const im = bgImage('ch_cloud'); if (!im) return;
  g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.scale(flip ? -1 : 1, 1);
  const height = width * im.naturalHeight / im.naturalWidth;
  g.drawImage(im, -width / 2, -height / 2, width, height); g.restore();
}
function streak(g: CanvasRenderingContext2D, x: number, y: number, size: number, lean: number, alpha: number) {
  g.save(); g.globalAlpha *= alpha; g.strokeStyle = chalkWhite; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - lean * size * 2.5, y - size * .35);
  g.quadraticCurveTo(x - lean * size, y + size * .2, x + size * .45, y);
  g.lineWidth = size * .34; g.globalAlpha *= .13; g.stroke();
  g.lineWidth = size * .11; g.stroke(); g.restore();
}
export const chalk: District = {
  key: 'chalk', name: 'Chalk', len: 8,
  preload() { queueArt('chalk-home_3', 2); queueArt('chalk-surf_2', 2); for (const key of ['ch_sky', 'ch_cloud', 'ch_door']) bgImage(key); },
  draw(f, L) {
    const { ctx: g, w, h, face, t } = f;
    const ride = ease((L - .25) / .43), brake = ease((L - .69) / .12), approach = ease((L - .78) / .22);
    const carve = Math.sin(ride * Math.PI * 2) * Math.sin(ride * Math.PI);
    const whip = f.calm ? 0 : Math.sin(ease((L - .43) / .13) * Math.PI) * .055;
    g.fillStyle = '#20332e'; g.fillRect(0, 0, w, h);
    const sky = bgImage('ch_sky');
    if (sky) {
      const zoom = 1.03 + ride * .26 + approach * .3;
      const s = Math.max(w / sky.naturalWidth, h / sky.naturalHeight) * zoom;
      const dw = sky.naturalWidth * s, dh = sky.naturalHeight * s;
      // Keep the painted road's vanishing point in frame even on portrait screens.
      const px = Math.min(0, Math.max(w - dw, w * .5 - dw * .5 - carve * w * .035));
      const py = Math.min(0, Math.max(h - dh, h * (.46 + whip) - dh * .59));
      g.drawImage(sky, px, py, dw, dh);
    }
    const wind = Math.sin(t * .23) * w * .045;
    cloud(g, w * .02 + wind - ride * w * .23, h * (.38 + whip), w * (1 + ride * .6), .67);
    cloud(g, w * .99 - wind + ride * w * .23, h * (.48 + whip), w * (1.1 + ride * .7), .8, true);

    // The destination is on the road from the outset, growing in perspective.
    const door = bgImage('ch_door');
    const doorH = h * (.07 + .36 * ease((L - .37) / .43) + 1.45 * approach * approach);
    const doorW = door ? doorH * door.naturalWidth / door.naturalHeight : doorH * .44;
    const doorY = h * (.49 + .34 * ease((L - .4) / .4) + .4 * approach);
    if (door) g.drawImage(door, w * .5 - doorW * .5, doorY - doorH, doorW, doorH);

    const born = clamp((L - .035) / .14);
    const crouch = Math.sin(clamp((L - .18) / .095) * Math.PI);
    const lift = Math.sin(clamp((L - .265) / .16) * Math.PI) * h * .14;
    const x = w * (.5 + carve * .24 - brake * .13 + approach * .13);
    const y = h * (.65 + ride * .18 - approach * .15) - lift + Math.sin(t * 1.8) * face * .035;
    const size = face * (.57 + ride * .62 - approach * .35);
    const surfing = L > .265 && L < .795;
    const pose = surfing ? 'chalk-surf_2' : 'chalk-home_3';
    const ph = poseHeight(pose, size);
    const since = f.since('eraser');
    const wipe = ease((since - .35) / .6), redraw = ease((since - 1.6) / 1.1);
    const reacting = since < 3.5;
    const visibility = reacting ? 1 - wipe + redraw : 1;
    const reveal = Math.min(born, visibility);
    const dustOff = since > 2.7 && since < 3.5 ? Math.sin((since - 2.7) * 24) * (3.5 - since) : 0;
    if (surfing) {
      streak(g, x, y + size * .12, size * 1.8, carve < 0 ? -1 : 1, 1 - approach);
      cloud(g, x, y + size * .19, size * 4.3, .95);
    }
    if (reacting) streak(g, x, y - ph * .38, size * 2, 1, wipe * (1 - redraw) * 2);
    const idle = f.idle > 3 ? Math.sin(t * 2.1) * .045 : 0;
    drawPose(g, pose, x + dustOff * size * .13, y, size, {
      reveal, rot: carve * -.24 + idle + dustOff * .08,
      squash: 1 - crouch * .24 + Math.sin(clamp((L - .27) / .12) * Math.PI) * .19 - Math.sin(brake * Math.PI) * .2,
      boil: .008, t,
    });
    f.hot('boy', x, y - ph * .5, Math.max(size * 1.4, ph * .45));
    // A chalk nib follows the single drawing front; it disappears once he is complete.
    if (reveal > 0 && reveal < .99) {
      const lineY = y - ph * (1 - reveal);
      g.save(); g.strokeStyle = chalkWhite; g.globalAlpha = .7; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x - size * .7, lineY); g.lineTo(x + size * .65, lineY + 2); g.stroke(); g.restore();
    }

    const ex = w * .79, ey = h * .86 + Math.sin(t * 1.7) * 3;
    const es = Math.min(w * .16, h * .085);
    const sweep = ease((since - .1) / .85), retreat = ease((since - 1.15) / .5);
    const eraserX = reacting ? ex + (x - ex + size * 1.4) * sweep * (1 - retreat) : ex;
    const eraserY = reacting ? ey + (y - ph * .5 - ey) * sweep * (1 - retreat) : ey;
    g.save(); g.translate(eraserX, eraserY); g.rotate(-.16 + (reacting ? sweep * .35 : 0));
    g.fillStyle = '#101e1c'; g.fillRect(-es * .5, es * .04, es, es * .27);
    g.fillStyle = '#9a9d88'; g.fillRect(-es * .5, -es * .23, es, es * .28);
    g.strokeStyle = chalkWhite; g.lineWidth = 1.5; g.strokeRect(-es * .5, -es * .23, es, es * .28);
    const glint = Math.pow(Math.max(0, Math.cos(t * 1.4)), 12);
    g.globalAlpha = .25 + glint * .65 + (f.over('eraser') ? .25 : 0);
    g.beginPath(); g.moveTo(-es * .38, -es * .14); g.lineTo(es * .3, -es * .14); g.stroke(); g.restore();
    f.hot('eraser', eraserX, eraserY, Math.max(28, es * .75));
    title(g, w, h, L);
    if (f.crossedFwd(.72)) f.shake(f.calm ? 0 : 3);
  },
  tap(id, f) { if (id === 'eraser') f.shake(f.calm ? 0 : 2); },
};
