/**
 * One palette across all three worlds. Ink and paper are the ground; blue and
 * green are the two rivals — blades in the ink, colours in the machine,
 * teams under the floodlights; vermilion is the seal, the one warm hit.
 */
export const C = {
  paper: '#ece6d6',
  paperDeep: '#ddd4be',
  ink: '#14120f',
  inkSoft: '#2a2621',
  blue: '#2f5bff',
  blueHot: '#8fb0ff',
  green: '#a6f03a',
  greenHot: '#e2ffb0',
  red: '#ff4021',
  night: '#070b1d',
  nightUp: '#101a3d',
  pitchA: '#18542f',
  pitchB: '#1c6136',
  white: '#fbfaf5',
};

export const F = {
  display: '"Dela Gothic One", "Arial Black", Impact, sans-serif',
  serif: '"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", Georgia, serif',
};

export function font(px: number, family = F.display, weight = 400) {
  // whole pixels only: every distinct size is a fresh glyph cache
  return `${weight} ${Math.max(1, Math.round(px))}px ${family}`;
}

/**
 * Block letters with a solid extrusion and a hard outline: the machine's
 * voice, and the broadcast graphics' too.
 */
export function extruded(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  px: number,
  o: { face: string; side: string; depth?: number; angle?: number; outline?: string; line?: number; align?: CanvasTextAlign },
) {
  ctx.font = font(px);
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = 'middle';
  const depth = o.depth ?? px * 0.14;
  const ang = o.angle ?? Math.PI * 0.25;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const line = o.line ?? Math.max(1.5, px * 0.045);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = o.outline ?? '#14120f';
  ctx.lineWidth = line * 2;
  // back outline then the extrusion steps
  ctx.strokeText(text, x + dx * depth, y + dy * depth);
  ctx.fillStyle = o.side;
  const steps = Math.ceil(depth / 1.5);
  for (let i = steps; i >= 1; i--) {
    const d = (i / steps) * depth;
    ctx.fillText(text, x + dx * d, y + dy * d);
  }
  ctx.strokeText(text, x, y);
  ctx.fillStyle = o.face;
  ctx.fillText(text, x, y);
}
