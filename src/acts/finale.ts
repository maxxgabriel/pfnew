import { brush, ensoPath } from '../core/brush';
import type { Frame } from '../core/frame';
import { layoutWord, wordWidth } from '../core/glyphs';
import { type Pt, TAU, ease, hash, lerp, seg } from '../core/math';
import { drawSprite, glow, paperTile, withAlpha } from '../core/sprites';
import { C } from '../core/style';
import { drawSeal } from './ink';
import { drawBall } from './machine';

/*
 * FINALE — back to paper.
 *
 * The camera goes through the net and comes out on the page it started on.
 * The way through is an iris that is also a brush stroke: an ensō painted
 * outward until it fills the frame. The ball rests in the middle of a new
 * circle, shrinks back into the drop of ink that started the film, and the
 * name is written again. The two rivals stay, small now, circling each other
 * around the ensō for as long as anyone is watching.
 */

const IRIS = ensoPath(0, 0, 100, 5, 1.02, -1.4);
const RING = ensoPath(0, 0, 100, 8, 0.95, -2.0);
let pattern: CanvasPattern | null = null;
let titleKey = '';
let max: ReturnType<typeof layoutWord>;
let gab: ReturnType<typeof layoutWord>;
let maxSize = 0, gabSize = 0;

interface Trail { pts: Pt[] }
const trails: Trail[] = [{ pts: [] }, { pts: [] }];

/** the finale's beats were authored before the arcade and bullet time were cut in */
export const FINALE_SHIFT = 5.1;

export function drawFinale(fg: Frame) {
  const f: Frame = { ...fg, B: fg.B - FINALE_SHIFT };
  const { ctx, w, h, B, t } = f;
  if (!pattern) pattern = ctx.createPattern(paperTile(512, C.paper), 'repeat');
  const S = Math.min(w, h);
  const diag = Math.hypot(w, h);

  // ---- the iris: an ensō painted outward from the net
  const iris = ease.in3(seg(B, 17.95, 18.7));
  if (iris <= 0) return;
  const R = lerp(S * 0.04, diag * 0.62, iris);
  const cx = w * 0.5, cy = lerp(h * 0.5, h * 0.42, iris);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();
  ctx.fillStyle = pattern!;
  ctx.fillRect(0, 0, w, h);
  // the net comes through as ink: its mesh, brushed, drifting apart and fading
  const mesh = 1 - seg(B, 18.45, 18.95);
  if (mesh > 0) {
    const sp = S * (0.16 + iris * 0.3);
    const n = Math.ceil(diag / sp / 2) + 1;
    for (let k = -n; k <= n; k++) {
      const off = k * sp;
      const sag = sp * 0.12;
      brush(ctx, [[cx + off, cy - diag], [cx + off + sag, cy], [cx + off, cy + diag]], { width: S * 0.006, color: C.ink, dry: 0.8, seed: 300 + k, alpha: mesh * 0.55 });
      brush(ctx, [[cx - diag, cy + off], [cx, cy + off + sag], [cx + diag, cy + off]], { width: S * 0.006, color: C.ink, dry: 0.8, seed: 400 + k, alpha: mesh * 0.55 });
    }
  }
  ctx.restore();
  if (iris < 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(iris * 2);
    ctx.scale(R / 100, R / 100);
    brush(ctx, IRIS, { width: 9 + 6 * (1 - iris), color: C.ink, progress: 1, dry: 0.5, seed: 5, press: 1.2 });
    ctx.restore();
  }
  if (B < 18.75) return;

  // ---- composition
  const ex = w / 2;
  const ey = h * (f.portrait ? 0.3 : 0.31);
  const er = Math.min(w * 0.34, h * (f.portrait ? 0.19 : 0.2));

  // the ball arrives in the middle, rests, then shrinks back into a drop
  const ballIn = ease.out3(seg(B, 18.85, 19.25));
  const shrink = ease.inOut3(seg(B, 19.25, 19.75));
  const by = lerp(h * 0.42, ey, ballIn);
  if (shrink < 1) {
    const r = lerp(S * 0.05, S * 0.012, shrink);
    if (shrink < 0.6) {
      drawBall(ctx, ex, by, r * (1 - shrink * 0.5), t * 0.5, t, 1);
    }
    if (shrink > 0.3) {
      ctx.fillStyle = withAlpha(C.ink, seg(shrink, 0.3, 0.6));
      ctx.beginPath();
      ctx.ellipse(ex, by, r, r * 1.15, 0, 0, TAU);
      ctx.fill();
    }
  }

  // ---- the new circle, painted by scroll
  const ringP = ease.inOut2(seg(B, 19.3, 19.95));
  if (ringP > 0) {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(t * 0.03);
    ctx.scale(er / 100, er / 100);
    brush(ctx, RING, { width: 15, color: C.ink, progress: ringP, dry: 0.42, seed: 8, press: 1.5, tail: 0.12 });
    ctx.restore();
  }
  // the drop at the centre falls a hair and blooms into a soft wash
  if (shrink >= 1) {
    const bloom = ease.out3(seg(B, 19.75, 20.2));
    ctx.globalAlpha = 0.12 * bloom;
    drawSprite(ctx, glow(C.ink, 128), ex, ey, er * 1.6 * bloom + 1);
    ctx.globalAlpha = 1;
  }

  // ---- the name, again
  const key = `${w}x${h}`;
  if (key !== titleKey) {
    titleKey = key;
    maxSize = er * 0.62;
    gabSize = maxSize * 0.36;
    const mw = wordWidth('MAX', maxSize, 0.16);
    const gw = wordWidth('GABRIEL', gabSize, 0.3);
    max = layoutWord('MAX', ex - mw / 2, ey - maxSize * 0.5, maxSize, 0.16);
    gab = layoutWord('GABRIEL', ex - gw / 2, ey + er + S * 0.05, gabSize, 0.3);
  }
  max.strokes.forEach((s, i) => {
    const p = ease.inOut2(seg(B, 19.6 + i * 0.05, 19.72 + i * 0.05));
    brush(ctx, s.pts, { width: maxSize * 0.14, color: C.ink, progress: p, dry: 0.45, seed: 140 + i, press: 1.35, tail: 0.25 });
  });
  gab.strokes.forEach((s, i) => {
    const p = ease.out2(seg(B, 19.9 + i * 0.02, 19.98 + i * 0.02));
    brush(ctx, s.pts, { width: gabSize * 0.13, color: C.ink, progress: p, dry: 0.4, seed: 180 + i, press: 1.3, tail: 0.3 });
  });
  const st = seg(B, 20.3, 20.45);
  if (st > 0) {
    const gl = gab.strokes[gab.strokes.length - 1].pts;
    const sc = st < 1 ? lerp(2.2, 1, ease.outBack(st, 2.2)) : 1;
    drawSeal(ctx, gl[gl.length - 1][0] + gabSize * 0.55, gab.strokes[0].pts[0][1] + gabSize * 0.5, gabSize * 1.05 * sc, -0.06 + (1 - st) * 0.4, Math.min(1, st * 3));
  }

  // ---- the rivals, at peace: two lights circling the ensō forever
  const calm = seg(B, 19.9, 20.3);
  if (calm > 0) {
    for (let i = 0; i < 2; i++) {
      const ph = t * 0.9 + i * Math.PI;
      // a lemniscate around the ring: they cross in the middle every lap
      const a = ph;
      const x = ex + Math.cos(a) * er * 1.25;
      const y = ey + Math.sin(a * 2) * er * 0.45;
      const tr = trails[i].pts;
      tr.push([x, y]);
      if (tr.length > 26) tr.shift();
      const col = i ? C.green : C.blue;
      ctx.lineCap = 'round';
      for (let k = 1; k < tr.length; k++) {
        ctx.strokeStyle = withAlpha(col, (k / tr.length) * 0.7 * calm);
        ctx.lineWidth = S * 0.008 * (k / tr.length);
        ctx.beginPath();
        ctx.moveTo(tr[k - 1][0], tr[k - 1][1]);
        ctx.lineTo(tr[k][0], tr[k][1]);
        ctx.stroke();
      }
      ctx.globalAlpha = calm * 0.5;
      drawSprite(ctx, glow(col, 64), x, y, S * 0.06);
      ctx.globalAlpha = calm;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, S * 0.008, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ---- ink keeps dripping somewhere on the page
  if (calm > 0) {
    for (let k = 0; k < 3; k++) {
      const cyc = (t * 0.25 + k / 3) % 1;
      const id = Math.floor(t * 0.25 + k / 3) * 3 + k;
      const x = w * (0.1 + hash(id) * 0.8);
      const y = h * (0.05 + hash(id * 7) * 0.25);
      ctx.strokeStyle = withAlpha(C.ink, (1 - cyc) * 0.18 * calm);
      ctx.lineWidth = 1;
      for (let r = 0; r < 3; r++) {
        const q = cyc - r * 0.12;
        if (q <= 0) continue;
        ctx.beginPath();
        ctx.ellipse(x, y, S * 0.08 * q, S * 0.025 * q, 0, 0, TAU);
        ctx.stroke();
      }
    }
  }
}
