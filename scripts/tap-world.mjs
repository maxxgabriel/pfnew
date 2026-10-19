// Dev-only: tap every find in the world and photograph the reaction.
// usage: node scripts/tap-world.mjs <WxH|phone> <P:id,...>   e.g. 4:moon,10:sign,10:block
import { chromium } from 'playwright';
const kind = process.argv[2] ?? 'phone';
const jobs = (process.argv[3] ?? '').split(',').filter(Boolean).map((s) => { const [P, id] = s.split(':'); return { P: +P, id }; });
const vp = kind === 'phone' ? { width: 390, height: 844, dpr: 2 } : { width: +kind.split('x')[0], height: +kind.split('x')[1], dpr: 1 };
const touch = vp.width < 900;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr, hasTouch: touch, isMobile: touch });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5199/world.html'); await p.waitForTimeout(3500);
const tag = kind === 'phone' ? 'p' : kind;
for (const { P, id } of jobs) {
  await p.evaluate((P) => window.__world.go(P), P); await p.waitForTimeout(900);
  const spots = await p.evaluate(() => window.__world.spots());
  const s = spots.find((x) => x.id === id);
  if (!s) { console.log(`P ${P}: no spot '${id}' (have: ${spots.map((x) => x.id).join(' ')})`); continue; }
  if (touch) await p.touchscreen.tap(s.x, s.y); else await p.mouse.click(s.x, s.y);
  for (const ms of [400, 1400]) { await p.waitForTimeout(ms === 400 ? 400 : 1000); await p.screenshot({ path: `scripts/shots/tap-${tag}-${id}-${ms}.png` }); }
  console.log(`P ${P}: tapped ${id} at ${Math.round(s.x)},${Math.round(s.y)}`);
}
if (errs.length) console.log('ERRORS:\n' + errs.join('\n'));
await b.close();
