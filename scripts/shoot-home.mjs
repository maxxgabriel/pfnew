// Dev-only: photograph the new site (home.html) after its opening, at scroll fractions.
// usage: node scripts/shoot-home.mjs <WxH|phone> [fractions] [wait ms]   → scripts/shots/home-<tag>-<f>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('scripts/shots', { recursive: true });
const kind = process.argv[2] ?? 'phone';
const fr = (process.argv[3] ?? '0').split(',').map(Number);
const wait = +(process.argv[4] ?? 1500);
const vp = kind === 'phone' ? { width: 390, height: 844, dpr: 2 } : { width: +kind.split('x')[0], height: +kind.split('x')[1], dpr: 1 };
const touch = vp.width < 900;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr, hasTouch: touch, isMobile: touch });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:5199/home.html'); await p.waitForTimeout(13000);
const tag = kind === 'phone' ? 'p' : kind;
for (const f of fr) {
  await p.evaluate((f) => { const max = document.documentElement.scrollHeight - innerHeight; const y = max * f; const h = window.__home; if (h) h.go(y); else scrollTo(0, y); }, f);
  await p.waitForTimeout(wait);
  await p.screenshot({ path: `scripts/shots/home-${tag}-${f.toFixed(2)}.png` });
}
if (errs.length) console.log('ERRORS:\n' + errs.join('\n'));
await b.close(); console.log('done');
