// Dev-only: photograph the explorable world at path positions P (window.__world.go).
// usage: node scripts/shoot-world.mjs <WxH|phone> <P list> [wait ms]   → scripts/shots/world-<tag>-<P>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = 'scripts/shots'; mkdirSync(OUT, { recursive: true });
const kind = process.argv[2] ?? 'phone';
const Ps = (process.argv[3] ?? '0').split(',').map(Number);
const wait = +(process.argv[4] ?? 900);
const vp = kind === 'phone' ? { width: 390, height: 844, dpr: 2 } : { width: +kind.split('x')[0], height: +kind.split('x')[1], dpr: 1 };
const touch = kind === 'phone' || vp.width < 900;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr, hasTouch: touch, isMobile: touch });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:5199/world.html'); await p.waitForTimeout(3500);
const tag = kind === 'phone' ? 'p' : kind;
for (const P of Ps) {
  await p.evaluate((P) => window.__world.go(P), P); await p.waitForTimeout(wait);
  await p.screenshot({ path: `${OUT}/world-${tag}-${P.toFixed(2).padStart(6, '0')}.png` });
}
if (errs.length) console.log('ERRORS:\n' + errs.join('\n'));
await b.close(); console.log('done');
