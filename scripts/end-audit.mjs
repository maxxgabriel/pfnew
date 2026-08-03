import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(1800);

const info = await p.evaluate(() => {
  const reach = document.querySelector('[class*="reach"]');
  const rr = reach.getBoundingClientRect();
  const cs = getComputedStyle(reach);

  // every element whose box intersects the reach band vertically (y within rr, x too)
  const band = (e) => {
    const r = e.getBoundingClientRect();
    return !(r.right < rr.left || r.left > rr.right || r.bottom < rr.top - 30 || r.top > rr.bottom + 30);
  };

  const lines = [];
  for (const el of document.querySelectorAll('div,span,p,h1,h2,h3,a,ul,li,dt,dd')) {
    if (!band(el)) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const info = {
      cls: (el.className.baseVal ?? el.className).toString().slice(0, 40),
      box: [r.x | 0, r.y | 0, r.width | 0, r.height | 0],
      bt: s.borderTopWidth,
      bb: s.borderBottomWidth,
      td: s.textDecorationLine,
      ruleBg: getComputedStyle(el, '::after').backgroundColor,
      ruleBottom: getComputedStyle(el, '::after').bottom,
      ruleH: getComputedStyle(el, '::after').height,
      anim: s.animationName,
    };
    const keeps = info.td !== 'none' || info.bt !== '0px' || info.bb !== '0px' || info.ruleBg !== 'rgba(0, 0, 0, 0)' || info.anim;
    if (keeps) lines.push(info);
  }

  return {
    reach: [rr.x | 0, rr.y | 0, rr.width | 0, rr.height | 0],
    reachDeco: cs.textDecorationLine,
    reachBorder: cs.borderTopWidth,
    lines,
  };
});

console.log(JSON.stringify(info, null, 2));
await b.close();