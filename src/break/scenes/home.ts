import { flat, type Ctx } from '../director';
import { meta } from '../art';
import { beatsOf, frame, hit, inOutCubic, inQuart, lerp, outBack, outQuart, seg, smooth } from '../math';
import { PAPER, RED } from '../page';
import { T } from '../timeline';
import { impact } from './open';
import { ringPose, riseHub } from './quiet';
import { members, mix, pose, put, rest } from './slabs';

/*
 * SLAM — the final drop. The page slams back from behind, paper now, and the camera is a browser again.
 * The outlines circling him are yanked into place one after another, top to bottom, each landing solid
 * in ink: his site. The Spark flies into the logo and becomes its dot. He winds up a fire tornado and
 * kicks the name onto the page — MAX GABRIEL, stamped in brush — and drops onto the button, which now
 * says hi. HOME — it is a website again: it scrolls like one, the nav sticks, he sits on it, and the
 * name keeps changing style, one of his seven every two bars.
 */
const NAMES = ['logo_ink', 'logo_pixel', 'logo_comic', 'logo_water', 'logo_clay', 'logo_chalk', 'logo_hose'];
const CARD_ART = ['style_pixel', 'style_comic', 'style_water'];
export const homeKeys = [...NAMES, ...CARD_ART, 'sticker_seal', 'paint_1', 'say_hi', 'firetornado_0', 'firetornado_1', 'firetornado_2', 'firetornado_3', 'firetornado_4', 'firetornado_5', 'firetornado_6', 'firetornado_7', 'ftkick_1', 'bye_0', 'bye_1', 'bye_2', 'bye_3', 'idle_1'];

export function home(c: Ctx) {
  const { b, t, L, page } = c;
  if (b < T.slam) return;
  const S = T.slam, X = b - S, B = beatsOf(t), n = Math.floor(B), face = L.face;
  const kick = S + 12, down = S + 14, H0 = T.home;
  c.rib.vis = false;

  // a browser again; at the end it scrolls like one
  const s = (L.pageH - L.H) * inOutCubic(seg(b, H0 + 2, T.end));
  flat(c, s);
  c.theme = '#efe9dc';
  c.bg.copy(PAPER);

  // the sheet slams back from behind, in paper
  const sh = page.sheet.look;
  Object.assign(sh, { z: -700 * (1 - outQuart(seg(b, S, S + 0.5))), rx: 0, alpha: 1, ink: 1, vis: true });

  // the parts: from the ring (or from off the page) into place, top to bottom, one after another
  const ring = members(c).filter((m) => m.id !== 'media');
  const all = [...members(c, true), { id: 'nav', cx: L.W / 2, cy: L.get('nav').h / 2, w: L.W, h: L.get('nav').h, look: page.get('nav').look }];
  const order = [...all].sort((a, z) => a.cy - z.cy);
  const landAt = new Map<string, number>();
  order.forEach((m, r) => {
    const Ti = S + 0.7 + 0.42 * r;
    landAt.set(m.id, Ti);
    const ri = ring.indexOf(m as (typeof ring)[number]);
    const from = ri >= 0 ? ringPose(c, ri, ring.length, Math.min(b, Ti - 0.55), B)
      : m.id === 'nav' ? pose({ x: m.cx, y: m.cy - 500, z: 300 }) : m.id === 'media' ? pose({ x: m.cx, y: m.cy + L.H, z: 200, rx: -1 }) : pose({ x: m.cx, y: riseHub(c, b).y, z: 200, rz: 1.2 });
    const k = inQuart(seg(b, Ti - 0.55, Ti));
    const p = mix(from, rest(m), k);
    const land = b - Ti;
    if (land >= 0) { p.sy = 1 - 0.12 * hit(land, 7); p.y += 4 * hit(land, 7); }
    if (m.id === 'nav') p.y += s;            // the nav sticks to the top
    put(m, p);
    m.look.vis = k > 0 || ri >= 0;
    m.look.alpha = ri >= 0 ? 1 : smooth(seg(b, Ti - 0.55, Ti - 0.3));
    m.look.wire = 1 - smooth(seg(b, Ti - 0.25, Ti));
    m.look.ink = 1; m.look.color = null; m.look.flash = 0.6 * hit(land, 6);
    if (m.id === 'cta') m.look.color = RED;
  });
  // children (card images and lines, the nav's logo and links) turn to ink with their parents
  for (const p of page.pieces) if (p.b.parent) { p.look.ink = 1; p.look.color = null; }
  // the headline bars give way to the name when it lands
  for (const id of ['head1', 'head2']) page.get(id).look.alpha *= 1 - seg(b, kick, kick + 0.2);
  const ml = page.media.look;
  ml.open = [0, 0, 0, 0]; ml.strain = 0; ml.ink = 1;
  c.cam.shake = Math.max(c.cam.shake, ...order.map((m) => 5 * hit(b - landAt.get(m.id)!, 7)), 16 * hit(b - kick, 4), 8 * hit(b - down, 6));
  impact(c, X, RED, 0.18);
  impact(c, b - kick, RED, 0.16);

  // stamped art: arrives with a bounce when its piece lands
  // size is the art's height in px; his drawings are scaled by head size, so convert
  const stamp = (i: number, key: string, x: number, y: number, size: number, at: number, extra = {}) => {
    const k = seg(b, at, at + 0.35), m = meta(key);
    if (k <= 0 || !m) return;
    const face = (size * m.face) / Math.max(1, m.foot[1] - m.top);
    c.deco[i].set(key, x, y, 1.5, face * lerp(1.5, 1, outBack(k)), { mid: true, alpha: smooth(seg(b, at, at + 0.12)), ...extra });
  };
  const at = (id: string) => landAt.get(id) ?? S;
  const bd = L.get('badge');
  stamp(0, 'sticker_seal', bd.x + bd.w / 2, bd.y + bd.h / 2, bd.h * 1.7, at('badge'));
  const cta = L.get('cta'), ccx = cta.x + cta.w / 2;
  stamp(1, 'say_hi', ccx, cta.y + cta.h / 2 + 2, cta.h * 0.62, at('cta'));
  for (let i = 0; i < 3; i++) {
    const im = L.get(`card${i}img`);
    stamp(2 + i, CARD_ART[i], im.x + im.w / 2, im.y + im.h / 2, im.h * 0.9, at(`card${i}`));
  }
  const md = L.get('media');
  stamp(5, 'paint_1', md.x + md.w / 2, md.y + md.h / 2, md.h * 0.86, at('media'));
  // the name: kicked in between the seal and the buttons (the copy lines under it give way), then
  // one of his seven styles every two bars
  const top0 = bd.y + bd.h + 10, bot0 = cta.y - 14;
  const nh = Math.min((Math.min(L.W * 0.84, 780) * 400) / 900, bot0 - top0), nx = L.W / 2, ny = (top0 + bot0) / 2;
  const name = b < H0 ? NAMES[0] : NAMES[Math.floor(B / 8) % 7];
  stamp(6, name, nx, ny, nh, kick);
  for (let i = 0; i < 3; i++) {
    const p = page.byId.get(`line${i}`);
    if (p && p.b.y < ny + nh / 2) p.look.alpha *= 1 - seg(b, kick, kick + 0.2);
  }

  // the Spark flies into the logo and becomes its dot
  const lg = L.get('logo'), hub = riseHub(c, S);
  const fly = inOutCubic(seg(b, S, S + 1.4));
  if (fly < 1) {
    c.fx.spark.disc(lerp(hub.x, lg.x + lg.w / 2, fly), lerp(hub.y - face * 3.1, lg.y + lg.h / 2 + s, fly), 6, lerp(face * 0.75, lg.w / 2, fly), RED, 1.2 * (1 - fly), 1);
  }

  // him: hanging in the air while it all lands, the fire tornado, the kick, down onto the button, hello
  const hx = L.W / 2, hy = Math.min(ny - face * 0.5, L.H * 0.42);
  if (b < kick - 4) {
    c.boy.set(b < S + 1 ? 'powerup_2' : 'powerup_1', hx, lerp(riseHub(c, S).y, hy, smooth(seg(b, S, S + 3))), 8, face * 1.1, { flash: 0.4 * hit(X, 5) });
  } else if (b < kick) {
    const u = seg(b, kick - 4, kick);
    c.boy.set(`firetornado_${frame(b - (kick - 4), 8, 2)}`, hx, hy - face * 0.8 * Math.sin(u * Math.PI), 8, face * 1.6, { flip: false });
  } else if (b < down) {
    const u = seg(b, kick, down), y0 = hy, y1 = cta.y;
    const key = b < kick + 0.5 ? 'ftkick_1' : u < 0.85 ? 'fall_0' : 'hero_0';
    c.boy.set(key, lerp(hx, ccx, u), lerp(y0, y1, u * u) - Math.sin(u * Math.PI) * face, 8, face, {});
  } else if (b < H0 + 1) {
    const x = b - down, key = x < 0.5 ? 'hero_0' : x < 1.4 ? 'hero_1' : x < 3 ? 'hero_3' : `bye_${frame(B, 4, 1)}`;
    const press = 6 * hit(x, 6);
    page.get('cta').look.y += press;
    c.boy.set(key, ccx, cta.y + press, 8, face, { flip: ccx > L.W / 2 });
  } else {
    // he hops down into the corner of the screen and stays with you as the page scrolls, waving now and then
    const u = seg(b, H0 + 1, H0 + 2.2);
    const cx2 = L.W - face * 1.5, cy2 = s + L.H - 18;
    const x = lerp(ccx, cx2, u), y = lerp(cta.y, cy2, u) - Math.sin(u * Math.PI) * face * 2;
    c.boy.set(u < 1 ? (u < 0.5 ? 'leap_3' : 'fall_0') : n % 8 < 5 ? 'hero_3' : `bye_${frame(B, 4, 2)}`, x, y, 8, face * 0.85, { flip: true });
  }

  // the button says hi (for real: the link sits over it)
  c.hi = b >= down + 1;
}
