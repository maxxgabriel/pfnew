import fireURL from '../assets/world/fire.json?url';
import dawnURL from '../assets/world/dawn.json?url';

/* Paint becomes geometry once; the clock only moves light, trees and flame. */
type Shape = { c: string; band: number; pts: number[] };
type Layer = { name: string; depth: number; outline: string; shapes: Shape[] };
type World = { w: number; h: number; layers: Layer[] };
type Cache = { layer: Layer; night: HTMLCanvasElement; dawn: HTMLCanvasElement };
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => { const q = clamp(v); return q * q * (3 - 2 * q); };
const rgb = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const x = rgb(a), y = rgb(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
};
// Multiplication happens once in the night cache; unlit surfaces stay blue.
const nightColour = (c: string) => `rgb(${rgb(c).map((v, i) => Math.round(v * [.62, .69, .86][i])).join(',')})`;
const sheet = (w: number, h: number) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
};

export async function startWorld(name: string) {
  // Fetch only inside this entry point: the ordinary film never loads world data.
  const worlds: World[] = await Promise.all([fireURL, dawnURL].map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`World asset: ${response.status} ${url}`);
    return response.json();
  }));
  const [fire, dawn] = worlds;
  const canvas = document.getElementById('film') as HTMLCanvasElement;
  const g = canvas.getContext('2d', { alpha: false })!;
  const track = document.getElementById('track')!;
  for (const el of document.querySelectorAll<HTMLElement>('.hud, .reel, .hello, .sr-only')) el.hidden = true;
  const style = document.createElement('style');
  style.textContent = '.hud,.reel,.hello,.sr-only{display:none!important}';
  document.head.appendChild(style);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let w = 0, h = 0, scale = 1, ox = 0, oy = 0, ratio = 1;
  let caches: Cache[] = [], dawnCanvas = sheet(1, 1), pass = sheet(1, 1);
  let cost = 0;
  // Match every source band to a dawn colour of comparable luminance.
  const colours = dawn.layers.flatMap(l => l.shapes).sort((a, b) => a.band - b.band);
  const dawnBand = Math.max(...colours.map(s => s.band));
  const fireBand = Math.max(...fire.layers.flatMap(l => l.shapes.map(s => s.band)));
  const bandColour = (band: number) => {
    const target = Math.round(band / Math.max(1, fireBand) * dawnBand);
    return colours.reduce((best, s) => Math.abs(s.band - target) < Math.abs(best.band - target) ? s : best).c;
  };
  function paint(layer: Layer, warm: boolean, backdrop = false) {
    const c = sheet(w, h), ctx = c.getContext('2d')!;
    ctx.setTransform(scale, 0, 0, scale, ox - (backdrop && h > w ? 180 * scale : 0), oy);
    ctx.lineJoin = 'round'; ctx.lineWidth = .8 / scale;
    for (const s of layer.shapes) {
      ctx.beginPath(); ctx.moveTo(s.pts[0], s.pts[1]);
      for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i], s.pts[i + 1]);
      ctx.closePath(); ctx.fillStyle = warm ? mix(s.c, bandColour(s.band), .82) : backdrop ? s.c : nightColour(s.c);
      ctx.fill(); ctx.strokeStyle = layer.outline; ctx.stroke();
    }
    return c;
  }
  function resize() {
    // Internal CSS-pixel resolution bounds fill cost on high-DPR phones.
    w = innerWidth; h = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
    scale = Math.max(w / fire.w, h / fire.h) * 1.025;
    ox = w / 2 - (h > w ? 800 : 768) * scale; oy = (h - fire.h * scale) / 2;
    caches = fire.layers.map(layer => ({ layer, night: paint(layer, false), dawn: paint(layer, true) }));
    dawnCanvas = paint(dawn.layers[0], false, true); pass = sheet(w, h);
    track.style.height = `${h * 5}px`;
  }
  addEventListener('resize', resize); resize();
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  const light = { x: 768, y: 820, radius: 450, colour: '#ffad52', strength: .24 };
  const camera = { x: 0, y: 0, zoom: 1 };
  function flames(t: number, p: number) {
    const x = ox + 768 * scale, y = oy + 850 * scale;
    g.save(); g.translate(x, y); g.scale(scale, scale);
    const colours = ['#8b3029', '#ed642e', '#ffbb50', '#fff0b0'];
    for (let i = 0; i < 4; i++) {
      const width = 70 - i * 15, height = (180 - i * 33) * (1 - p * .35);
      const wave = motion.matches ? 0 : Math.sin(t * 3.4 + i) * 12 + Math.sin(t * 6.1) * 4;
      g.beginPath(); g.moveTo(-width, 0);
      g.bezierCurveTo(-width * 1.3, -height * .35, wave - 20, -height * .52, wave + 15, -height);
      g.bezierCurveTo(wave + 30, -height * .6, width * 1.4, -height * .3, width, 0);
      g.closePath(); g.fillStyle = colours[i]; g.fill(); g.strokeStyle = '#452b2c'; g.lineWidth = 1.5; g.stroke();
    }
    g.restore();
  }
  function frame(now: number) {
    const start = performance.now(), t = now / 1000;
    const p = name === 'dawn' ? 1 : clamp(scrollY / (document.documentElement.scrollHeight - h));
    const lift = ease((p - .18) / .82), relight = ease((p - .25) / .7);
    const wobble = motion.matches ? 0 : Math.sin(t * 4.2) * .025 + Math.sin(t * 7.7) * .012;
    camera.x = motion.matches ? 0 : Math.sin(t * .22) * 2;
    camera.y = lift * h * 1.12; camera.zoom = 1 + (motion.matches ? 0 : Math.sin(t * .18) * .003);
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.drawImage(dawnCanvas, 0, -h * .12 * (1 - lift), w, h * 1.12);
    const sx = (ox + light.x * scale) * (1 - lift) + w / 2 * lift + Math.sin(p * 5.2) * w * .1 + (motion.matches ? 0 : Math.sin(t) * 2);
    const sy = (oy + 690 * scale) * (1 - lift) + h * .22 * lift;
    // A broad, ragged brush edge uncovers dawn as the fire set drops away.
    g.save(); g.beginPath();
    const boundary = lift * (h + 12) - 6;
    g.moveTo(0, h);
    for (let x = 0; x <= w + 24; x += 24) {
      const bend = Math.exp(-(((x - sx) / (w * .4)) ** 2)) * Math.sin(lift * Math.PI);
      g.lineTo(x, boundary + (sy - boundary) * bend * .22 + Math.sin(x * .031) * 5 + Math.sin(x * .087) * 2);
    }
    g.lineTo(w, h); g.closePath(); g.clip();
    g.translate(w / 2, h / 2); g.scale(camera.zoom, camera.zoom); g.translate(-w / 2, -h / 2 + camera.y);
    for (const cache of caches) {
      const { layer } = cache, ctx = pass.getContext('2d')!;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
      ctx.drawImage(cache.night, 0, 0);
      if (relight > 0) { ctx.globalAlpha = relight; ctx.drawImage(cache.dawn, 0, 0); ctx.globalAlpha = 1; }
      // Source-atop preserves cutouts; three crisp pools over the cool cache.
      ctx.globalCompositeOperation = 'source-atop';
      const radius = light.radius * scale * (1 + wobble);
      for (let i = 3; i >= 1; i--) {
        ctx.globalAlpha = light.strength * (1 + wobble) * (1 - relight) * (layer.depth * layer.depth);
        ctx.fillStyle = light.colour; ctx.beginPath();
        ctx.ellipse(ox + light.x * scale, oy + light.y * scale, radius * i / 3, radius * i / 3 * .86, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (layer.name === 'd') flames(t, p);
      g.save();
      const sway = layer.name === 'b' && !motion.matches ? Math.sin(t * .65) * .002 : 0;
      g.transform(1, 0, sway, 1, camera.x * layer.depth - sway * h, -lift * layer.depth * 14);
      g.drawImage(pass, 0, 0); g.restore();
    }
    g.restore();
    // Exactly one spark, carried continuously through the seam.
    g.strokeStyle = '#c65a39'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(sx - 2, sy + 13); g.lineTo(sx, sy); g.stroke();
    g.fillStyle = '#ff6337'; g.beginPath(); g.arc(sx, sy, 2.6, 0, Math.PI * 2); g.fill();
    cost = cost * .9 + (performance.now() - start) * .1;
    requestAnimationFrame(frame);
  }
  (window as unknown as { __world: unknown }).__world = { cost: () => cost, light, camera };
  requestAnimationFrame(frame);
}
