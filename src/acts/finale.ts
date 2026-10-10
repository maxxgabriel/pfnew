import type { Frame } from '../core/frame';
import { POWERS_AT } from '../core/holds';
import { type Pt, TAU, hash, seg } from '../core/math';
import { drawSprite, glow, withAlpha } from '../core/sprites';
import { C } from '../core/style';
import { pageEnso } from './powers';
import { drawSignedPage } from './sign';

/*
 * FINALE — the page, signed.
 *
 * After the signature (sign.ts) the page stays: the circle, the signature
 * across it, the name's letters breathing, Blot. The two rivals stay too,
 * small now, circling the ensō for as long as anyone is watching.
 */

interface Trail { pts: Pt[] }
const trails: Trail[] = [{ pts: [] }, { pts: [] }];

export function drawFinale(f: Frame) {
  const { ctx, w, h, B, t } = f;
  if (B <= POWERS_AT || f.hold) return;
  const S = Math.min(w, h);
  // the page as the signature left it: the circle, the signature, the living name, Blot
  drawSignedPage(f, 1);
  const E = pageEnso(f);
  const ex = E.x, ey = E.y, er = E.r;

  // ---- the rivals, at peace: two lights circling the ensō forever
  const calm = seg(B, 20.1, 20.5);
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
