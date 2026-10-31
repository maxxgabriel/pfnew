/*
 * The generic website: a grey skeleton of the landing page everyone ships (nav, badge, two headline
 * bars, copy lines, two buttons, the big media box with an X, three cards, a footer). No words — every
 * line of copy is a grey bar. Phones get the stacked mobile version. Coordinates are page px, y down.
 */
export type Kind = 'sheet' | 'nav' | 'rule' | 'logo' | 'bar' | 'burger' | 'head' | 'badge' | 'btn' | 'btn2' | 'media' | 'card' | 'cimg' | 'foot' | 'fbar';
export type Block = { id: string; kind: Kind; x: number; y: number; w: number; h: number; r: number; parent?: string };
export type Layout = {
  W: number; H: number; phone: boolean; pageH: number; blocks: Block[]; get: (id: string) => Block;
  /** page scroll that centres the media box */ mediaScroll: number;
  /** the boy's head size in px */ face: number;
};

export function makeLayout(W: number, H: number): Layout {
  const blocks: Block[] = [];
  const add = (id: string, kind: Kind, x: number, y: number, w: number, h: number, r: number, parent?: string) => {
    const b = { id, kind, x, y, w, h, r, parent }; blocks.push(b); return b;
  };
  const mid = (w: number) => (W - w) / 2;
  const phone = W < 700;
  let y = 0;
  if (phone) {
    const p = 20, cw = W - 2 * p;
    add('nav', 'nav', 0, 0, W, 64, 0);
    add('navline', 'rule', 0, 63, W, 1, 0, 'nav');
    add('logo', 'logo', p, 17, 30, 30, 15, 'nav');
    add('logobar', 'bar', p + 38, 26, 72, 12, 6, 'nav');
    for (let i = 0; i < 3; i++) add(`burger${i}`, 'burger', W - p - 24, 24 + i * 7, 24, 3.5, 1.75, 'nav');
    add('badge', 'badge', mid(128), 104, 128, 26, 13);
    add('head1', 'head', mid(cw * 0.9), 150, cw * 0.9, 34, 9);
    add('head2', 'head', mid(cw * 0.62), 194, cw * 0.62, 34, 9);
    [0.92, 0.8, 0.5].forEach((f, i) => add(`line${i}`, 'bar', mid(cw * f), 252 + i * 20, cw * f, 11, 5.5));
    const bx = mid(148 + 12 + 128);
    add('cta', 'btn', bx, 332, 148, 50, 25);
    add('cta2', 'btn2', bx + 160, 332, 128, 50, 25);
    const mh = Math.round(Math.min(cw * 0.86, H * 0.52));
    add('media', 'media', p, 420, cw, mh, 18);
    y = 420 + mh + 72;
    add('shead', 'head', mid(cw * 0.58), y, cw * 0.58, 24, 8); y += 38;
    add('sline', 'bar', mid(cw * 0.78), y, cw * 0.78, 11, 5.5); y += 48;
    for (let i = 0; i < 3; i++) {
      const c = `card${i}`, iw = cw - 24;
      add(c, 'card', p, y, cw, 250, 18);
      add(`${c}img`, 'cimg', p + 12, y + 12, iw, 140, 12, c);
      add(`${c}l0`, 'bar', p + 12, y + 170, iw * 0.5, 16, 8, c);
      add(`${c}l1`, 'bar', p + 12, y + 198, iw * 0.86, 10, 5, c);
      add(`${c}l2`, 'bar', p + 12, y + 216, iw * 0.64, 10, 5, c);
      y += 266;
    }
  } else {
    const p = Math.max(24, Math.min(64, W * 0.045)), cw = Math.min(W - 2 * p, 1200), x0 = (W - cw) / 2;
    add('nav', 'nav', 0, 0, W, 76, 0);
    add('navline', 'rule', 0, 75, W, 1, 0, 'nav');
    add('logo', 'logo', x0, 21, 34, 34, 17, 'nav');
    add('logobar', 'bar', x0 + 46, 32, 86, 13, 6.5, 'nav');
    const lw = Math.min(72, cw * 0.06), lg = lw * 0.5, lx = mid(4 * lw + 3 * lg);
    for (let i = 0; i < 4; i++) add(`link${i}`, 'bar', lx + i * (lw + lg), 32, lw, 12, 6, 'nav');
    add('navbtn', 'btn', x0 + cw - 132, 17, 132, 42, 21, 'nav');
    const k = Math.min(1, H / 820);
    add('badge', 'badge', mid(160), 136 * k, 160, 30, 15);
    const hh = Math.round(58 * Math.max(0.8, k));
    add('head1', 'head', mid(Math.min(cw * 0.7, 860)), 190 * k, Math.min(cw * 0.7, 860), hh, 14);
    add('head2', 'head', mid(Math.min(cw * 0.48, 600)), 190 * k + hh + 14, Math.min(cw * 0.48, 600), hh, 14);
    const ly = 190 * k + 2 * hh + 44;
    add('line0', 'bar', mid(cw * 0.46), ly, cw * 0.46, 14, 7);
    add('line1', 'bar', mid(cw * 0.34), ly + 26, cw * 0.34, 14, 7);
    const bx = mid(176 + 16 + 156), by = ly + 78;
    add('cta', 'btn', bx, by, 176, 56, 28);
    add('cta2', 'btn2', bx + 192, by, 156, 56, 28);
    const mw = Math.min(cw, 1080), mh = Math.round(Math.min(mw * 0.56, H * 0.64)), my = by + 56 + 44;
    add('media', 'media', mid(mw), my, mw, mh, 22);
    y = my + mh + 110;
    add('shead', 'head', mid(cw * 0.3), y, cw * 0.3, 30, 10); y += 50;
    add('sline', 'bar', mid(cw * 0.42), y, cw * 0.42, 14, 7); y += 70;
    const gw = (cw - 56) / 3;
    for (let i = 0; i < 3; i++) {
      const c = `card${i}`, x = x0 + i * (gw + 28), iw = gw - 32;
      add(c, 'card', x, y, gw, 380, 22);
      add(`${c}img`, 'cimg', x + 16, y + 16, iw, 220, 14, c);
      add(`${c}l0`, 'bar', x + 16, y + 260, iw * 0.55, 18, 9, c);
      add(`${c}l1`, 'bar', x + 16, y + 296, iw * 0.9, 12, 6, c);
      add(`${c}l2`, 'bar', x + 16, y + 318, iw * 0.7, 12, 6, c);
    }
    y += 380;
  }
  y += phone ? 56 : 120;
  const fh = phone ? 260 : 320, fp = phone ? 20 : Math.max(24, (W - Math.min(W - 128, 1200)) / 2);
  add('foot', 'foot', 0, y, W, fh, 0);
  add('fl0', 'fbar', fp, y + 48, phone ? 110 : 150, 16, 8, 'foot');
  for (let i = 0; i < 3; i++) add(`fl${i + 1}`, 'fbar', fp, y + 96 + i * 26, phone ? 160 - i * 30 : 220 - i * 40, 10, 5, 'foot');
  if (!phone) for (let c = 0; c < 3; c++) for (let i = 0; i < 3; i++) add(`fc${c}${i}`, 'fbar', W - fp - (3 - c) * 170 + 20, y + 52 + i * 28, 110 - i * 18, 10, 5, 'foot');
  const pageH = y + fh;
  blocks.unshift({ id: 'sheet', kind: 'sheet', x: 0, y: 0, w: W, h: pageH, r: 0 });
  const map = new Map(blocks.map((b) => [b.id, b]));
  const media = map.get('media')!;
  return {
    W, H, phone, pageH, blocks, get: (id) => map.get(id)!,
    mediaScroll: Math.max(0, media.y + media.h / 2 - H / 2),
    face: phone ? Math.max(42, Math.min(60, W * 0.13)) : Math.max(50, Math.min(92, Math.min(W, H * 1.6) * 0.055)),
  };
}
