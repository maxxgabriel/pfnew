import { drawPose, drawWaterWave, queueArt } from '../../sketch/art';
import { bgImage, drawBg } from '../../sketch/bg';
import { depth, type Layer } from '../camera';
import { clamp, type District, type WorldFrame } from '../types';

const sky: Layer[] = [{ key: 'wc_sky', depth: .12 }];
const smooth = (a: number, b: number, n: number) => {
  const q = clamp((n - a) / (b - a));
  return q * q * (3 - 2 * q);
};
const pulse = (a: number, b: number, n: number) => Math.sin(clamp((n - a) / (b - a)) * Math.PI);

// Cover each sea band independently: the transparent crest keeps its silhouette,
// while its painted lower edge always extends below the viewport.
function band(f: WorldFrame, key: string, top: number, height: number, zoom: number, drift: number) {
  const im = bgImage(key);
  if (!im) return;
  const s = Math.max(f.w * 1.18 / im.naturalWidth, height / im.naturalHeight) * zoom;
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  f.ctx.drawImage(im, (f.w - dw) / 2 + drift, top, dw, dh);
}

function spray(f: WorldFrame, x: number, y: number, strength: number, direction: number) {
  if (strength < .001) return;
  const g = f.ctx, size = Math.min(f.w * .68, f.h * .44) * strength;
  g.save(); g.translate(x, y); g.scale(direction, 1);
  // A single translucent sheet, with a dark wet edge and warm paper foam.
  g.fillStyle = 'rgba(184,222,224,.72)';
  g.beginPath(); g.moveTo(-f.face * .5, 0);
  g.bezierCurveTo(-size * .55, -size * .12, -size, -size * .62, -size * .9, -size);
  g.bezierCurveTo(-size * .65, -size * .52, -size * .12, -size * .73, size * .12, -size * .1);
  g.quadraticCurveTo(size * .26, size * .1, -f.face * .5, 0); g.fill();
  g.strokeStyle = 'rgba(239,238,215,.8)'; g.lineWidth = Math.max(2, f.face * .055); g.stroke();
  g.restore();
}

function title(f: WorldFrame, L: number) {
  const a = smooth(.025, .065, L) * (1 - smooth(.16, .235, L));
  if (a <= 0) return;
  const { ctx: g, w, h } = f;
  const size = Math.min(w * .19, h * .16);
  g.save(); g.translate(w * .5, h * .3 - smooth(.16, .235, L) * h * .08);
  g.rotate(-.045); g.globalAlpha = a;
  g.textAlign = 'center'; g.font = `${size}px "Caveat Brush", cursive`;
  // Broad wet underpaint, bleeding edges, then the pigment settling in.
  g.fillStyle = 'rgba(75,139,162,.24)';
  g.beginPath(); g.ellipse(0, -size * .2, w * .47, size * .82, -.04, 0, Math.PI * 2); g.fill();
  for (let i = 3; i > 0; i--) {
    g.lineWidth = i * size * .035; g.strokeStyle = 'rgba(180,215,213,.12)';
    g.strokeText('Watercolour', 0, 0, w * .9);
  }
  g.fillStyle = '#e5e9d4'; g.fillText('Watercolour', 0, 0, w * .9);
  g.restore();
}

function bottle(f: WorldFrame, L: number) {
  const { ctx: g, w, h, face, t } = f;
  const since = f.since('bottle');
  const open = smooth(.35, 1.05, since) * (1 - smooth(7.5, 8.4, since));
  // Infinity is the untapped state, and smooth's two factors correctly close it.
  const bw = Math.min(w * .2, h * .19), bh = bw * 1.36;
  const x = w * (.8 - .065 * Math.sin(L * 5)), y = h * .8 + Math.sin(t * 1.7) * face * .13;
  g.save(); g.translate(x, y); g.rotate(.15 * Math.sin(t * 1.3) - .2);
  if (f.over('bottle')) g.scale(1.07, 1.07);
  const im = bgImage('wc_bottle');
  if (im) g.drawImage(im, -bw / 2, -bh / 2, bw, bh);
  // Cover the painted cork after the pop, with one matching wet wash.
  if (since < 8.5) {
    g.fillStyle = '#bdd9d2'; g.beginPath(); g.ellipse(bw * .27, -bh * .36, bw * .12, bh * .1, .5, 0, Math.PI * 2); g.fill();
    const pop = clamp(since / .42);
    g.save(); g.translate(bw * .27 + pop * bw * .7, -bh * .43 - Math.sin(pop * Math.PI * .7) * bh);
    g.rotate(pop * 4); g.globalAlpha *= 1 - smooth(.35, .7, since);
    g.fillStyle = '#c9a66c'; g.fillRect(-bw * .09, -bw * .07, bw * .18, bw * .2); g.restore();
  }
  const glint = Math.pow(Math.max(0, Math.sin(t * 1.2)), 12);
  g.strokeStyle = `rgba(255,244,203,${.3 + glint * .7})`; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-bw * .18, -bh * .12); g.quadraticCurveTo(-bw * .05, -bh * .27, bw * .1, -bh * .26); g.stroke();
  g.restore(); f.hot('bottle', x, y, Math.max(30, bh * .53));
  if (open <= 0) return;
  const nw = Math.min(w * .87, 650), nh = Math.min(h * .4, 300);
  const nx = x + (w * .5 - x) * open, ny = y + (h * .48 - y) * open;
  g.save(); g.translate(nx, ny); g.rotate((1 - open) * -.5); g.scale(.15 + open * .85, Math.max(.035, open));
  g.fillStyle = 'rgba(8,35,58,.22)'; g.fillRect(-nw / 2 + 7, -nh / 2 + 10, nw, nh);
  g.fillStyle = '#e9e0bc';
  g.beginPath(); g.moveTo(-nw / 2, -nh / 2 + 8); g.quadraticCurveTo(0, -nh / 2 - 10, nw / 2, -nh / 2 + 5);
  g.lineTo(nw / 2 - 4, nh / 2); g.quadraticCurveTo(0, nh / 2 - 9, -nw / 2, nh / 2 + 5); g.closePath(); g.fill();
  g.fillStyle = '#c2b58f'; g.fillRect(-nw / 2, -nh / 2, nw, 8); g.fillRect(-nw / 2, nh / 2 - 6, nw, 8);
  g.fillStyle = '#24485b'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const font = Math.min(nw * .085, nh * .14); g.font = `${font}px "Caveat Brush", cursive`;
  g.fillText('You found the note.', 0, -font * 1.25, nw * .86);
  g.fillText('Keep scrolling,', 0, font * .05, nw * .86);
  g.fillText('it gets weirder.', 0, font * 1.35, nw * .86);
  g.restore();
}

export const water: District = {
  key: 'water', name: 'Watercolour', len: 8,
  preload() {
    for (const k of ['water-leap_2', 'water-fall_3', 'water-home_3', 'water-surf_0', 'water-surf_1', 'water-surf_2', 'wave_0', 'wave_1', 'wave_2']) queueArt(k, 3);
    for (const k of ['wc_sky', 'wc_cloud', 'wc_sea_far', 'wc_sea_near', 'wc_bottle']) bgImage(k);
  },
  draw(f, L) {
    const { ctx: g, w, h, t, face } = f;
    const drop = smooth(.08, .24, L), curl = smooth(.32, .7, L);
    const crash = smooth(.73, .83, L), recover = smooth(.85, .95, L);
    const carve = Math.sin(clamp((L - .25) / .48) * Math.PI * 2);
    const push = .12 * drop + .12 * curl - .14 * recover;
    const whip = f.calm ? 0 : carve * .025;
    g.save(); g.imageSmoothingEnabled = true;
    g.fillStyle = '#102b47'; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h * .55); g.rotate(whip); g.scale(1.08 + push, 1.08 + push); g.translate(-w / 2, -h * .55);
    // Start at the top of the cover crop so the painted moon survives ultrawide.
    depth(f, L * 1.5, sky); drawBg(g, 'wc_sky', w, h, 0, 1, 1 + L * .05);
    band(f, 'wc_cloud', h * .28 + Math.sin(t * .23) * h * .012, h * .19, 1.08, Math.sin(t * .15) * w * .025);
    band(f, 'wc_sea_far', h * .47, h * .57, 1 + L * .13, -carve * w * .025);
    // Perspective bands accelerate away from the horizon and toward the lens.
    for (let i = 0; i < 3; i++) {
      const z = ((L * 2.8 + t * .035 + i / 3) % 1 + 1) % 1;
      const d = z * z;
      g.globalAlpha = smooth(0, .15, z) * .7;
      band(f, 'wc_sea_near', h * (.48 + d * .49), h * (.15 + d * .48), 1 + d * .28, Math.sin(t * .5 + i) * w * .025);
    }
    g.globalAlpha = 1;
    const waveW = Math.max(w * 1.15, h * .85) * (.62 + curl * .55);
    g.save(); g.translate(w * (.18 + curl * .17), h * (.85 + crash * .17) + Math.sin(t * .9) * face * .07);
    g.rotate(-.06 + carve * .045); g.scale(-1, 1);
    drawWaterWave(g, L < .39 ? 'wave_0' : L < .57 ? 'wave_1' : 'wave_2', waveW); g.restore();
    let x = w * (.51 + carve * (f.portrait ? .16 : .23));
    let y = h * (.31 + .43 * drop) - Math.sin(clamp((L - .08) / .16) * Math.PI) * h * .1;
    let pose = L < .24 ? 'water-leap_2' : L < .38 ? 'water-surf_1' : L < .55 ? 'water-surf_0' : 'water-surf_2';
    let rot = L < .24 ? -.35 * (1 - drop) : -carve * .23;
    let squash = 1 - pulse(.235, .285, L) * .23;
    if (L > .73 && L < .88) {
      pose = 'water-fall_3'; x += Math.sin(crash * Math.PI) * w * .12;
      y += Math.sin(crash * Math.PI * .85) * h * .18; rot = crash * 2.6; squash = 1 + .16 * Math.sin(crash * Math.PI);
    } else if (L >= .88) {
      pose = L < .94 ? 'water-home_3' : 'water-leap_2';
      y = h * .79 - recover * h * .17 - smooth(.95, 1, L) * h * .29;
      rot = -.18 * recover; squash = 1 + pulse(.92, 1, L) * .12;
    }
    const idle = f.idle > 3 ? Math.sin((f.idle - 3) * 2) : 0;
    y += Math.sin(t * 1.8) * face * .045 - Math.max(0, idle) * face * .1;
    rot += idle * .045;
    const size = face * (.67 + drop * .4 + curl * .12);
    drawPose(g, pose, x, y, size, { rot, squash, boil: .012 });
    spray(f, x, y, pulse(.24, .31, L), 1);
    spray(f, x, y, pulse(.34, .48, L), -1);
    spray(f, x, y, pulse(.55, .7, L), 1);
    spray(f, x, y, pulse(.765, .88, L) * 1.5, -1);
    g.restore();
    // Hotspots use the same camera projection as the painted character.
    const dx = (x - w / 2) * (1.08 + push), dy = (y - h * .55) * (1.08 + push);
    f.hot('boy', w / 2 + dx * Math.cos(whip) - dy * Math.sin(whip), h * .55 + dx * Math.sin(whip) + dy * Math.cos(whip) - size, size * 1.4);
    title(f, L); bottle(f, L);
    // Impact accents are local functions of L, so reverse scrolling retraces them.
    if (f.crossedFwd(.245)) f.shake(face * .09);
    if (f.crossedFwd(.795)) { f.shake(face * .16); f.flash(.12, '#d9e9df'); }
    g.restore();
  },
  tap(id, f) { if (id === 'bottle') f.shake(f.face * .045); },
};
