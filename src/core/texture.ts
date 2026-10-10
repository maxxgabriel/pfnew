import type { Frame } from './frame';
import { TAU, hash, rng } from './math';
import { canvas } from './sprites';

/*
 * TEXTURE PER WORLD.
 *
 * Each world is printed on its own stuff, laid over everything as one cheap
 * pattern fill: rice-paper fibres for the ink, risograph speckle and an ink
 * roller's band for the machine, cel scratches and flicker for ALTER,
 * broadcast scanlines for the match. The page at the end is clean paper.
 */

export type World = 'ink' | 'machine' | 'alter' | 'match' | null;

export function worldOf(f: Frame, titanAt: number): World {
  const hd = f.hold?.kind;
  if (hd === 'alter' || hd === 'meteor') return 'alter';
  if (hd === 'titan') return 'machine';
  if (hd === 'powers' || hd === 'sign') return null;
  if (hd === 'dive') return 'match';
  const B = f.B;
  if (B < 6.75) return 'ink';
  if (B < 7.6) return null; // the white paper and the tear
  if (B <= titanAt) return 'machine';
  if (B < 12.63) return 'alter';
  if (B < 18.7) return 'match';
  return null;
}

const tiles: Partial<Record<Exclude<World, null>, CanvasPattern>> = {};

function tile(ctx: CanvasRenderingContext2D, kind: Exclude<World, null>): CanvasPattern {
  const have = tiles[kind];
  if (have) return have;
  const size = kind === 'match' ? 4 : 256;
  const { c, ctx: g } = canvas(size, size);
  const r = rng(kind.length * 31);
  if (kind === 'ink') {
    // fibres: short pale hairs, curling a little
    g.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const x = r() * size, y = r() * size, a = r() * TAU, l = 6 + r() * 22;
      g.strokeStyle = `rgba(236,230,214,${0.05 + r() * 0.08})`;
      g.lineWidth = 0.5 + r() * 0.7;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  } else if (kind === 'machine') {
    // risograph: uneven ink speckle, a few dropouts
    for (let i = 0; i < 900; i++) {
      const v = r();
      g.fillStyle = v > 0.82 ? 'rgba(255,250,235,0.16)' : 'rgba(20,18,15,0.1)';
      g.fillRect(r() * size, r() * size, 1 + r() * 1.6, 1 + r() * 1.6);
    }
  } else if (kind === 'alter') {
    // cel dust: tiny specks and hairs
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.08})`;
      g.beginPath();
      g.arc(r() * size, r() * size, 0.5 + r() * 1.2, 0, TAU);
      g.fill();
    }
  } else {
    // broadcast: a scanline every few pixels
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(0, 0, size, 1);
  }
  const p = ctx.createPattern(c, 'repeat')!;
  tiles[kind] = p;
  return p;
}

export function drawWorldTexture(ctx: CanvasRenderingContext2D, wld: World, w: number, h: number, t: number) {
  if (!wld) return;
  const fr = Math.floor(t * 12);
  ctx.save();
  ctx.fillStyle = tile(ctx, wld);
  if (wld === 'ink') {
    // the fibres drift with the paper, slowly
    ctx.translate((t * 3) % 256, 0);
    ctx.fillRect(-256, 0, w + 256, h);
  } else if (wld === 'machine') {
    ctx.translate(((hash(fr) * 256) | 0) - 256, ((hash(fr + 9) * 256) | 0) - 256);
    ctx.fillRect(0, 0, w + 256, h + 256);
    ctx.setTransform(ctx.getTransform().a, 0, 0, ctx.getTransform().a, 0, 0);
    // an ink roller's band, rolling down the poster
    const y = ((t * 0.18) % 1.4 - 0.2) * h;
    const g = ctx.createLinearGradient(0, y - h * 0.08, 0, y + h * 0.08);
    g.addColorStop(0, 'rgba(20,18,15,0)');
    g.addColorStop(0.5, 'rgba(20,18,15,0.05)');
    g.addColorStop(1, 'rgba(20,18,15,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - h * 0.08, w, h * 0.16);
  } else if (wld === 'alter') {
    ctx.translate(((hash(fr) * 256) | 0) - 256, ((hash(fr + 3) * 256) | 0) - 256);
    ctx.fillRect(0, 0, w + 256, h + 256);
    ctx.setTransform(ctx.getTransform().a, 0, 0, ctx.getTransform().a, 0, 0);
    // a scratch or two down the film, and the flicker of the projector
    for (let i = 0; i < 2; i++) {
      if (hash(fr * 3 + i) < 0.55) continue;
      const x = hash(fr * 7 + i) * w;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x, 0, 1, h);
    }
    ctx.fillStyle = `rgba(255,255,255,${hash(fr * 5) * 0.025})`;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillRect(0, 0, w, h);
    // a soft band rolling up the screen
    const y = (1 - ((t * 0.12) % 1)) * h * 1.3 - h * 0.15;
    const g = ctx.createLinearGradient(0, y - h * 0.06, 0, y + h * 0.06);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.035)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - h * 0.06, w, h * 0.12);
  }
  ctx.restore();
}
