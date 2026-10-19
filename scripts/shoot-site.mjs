// Dev-only: photograph the motion site at scroll positions.
// usage: node scripts/shoot-site.mjs <WxH|phone> [fractions comma list] [open]   → scripts/shots/site-*.png
// `open` also taps the first Playground card and shoots the expanded piece.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'scripts/shots';
mkdirSync(OUT, { recursive: true });
const kind = process.argv[2] ?? '1440x900';
const fr = (process.argv[3] ?? '0,0.1,0.2,0.35,0.5,0.65,0.8,1').split(',').map(Number);
const vp = kind === 'phone' ? { width: 390, height: 844, dpr: 2 } : { width: +kind.split('x')[0], height: +kind.split('x')[1], dpr: 1 };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr, hasTouch: kind === 'phone', isMobile: kind === 'phone' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5199/', { waitUntil: 'load' });
await page.waitForTimeout(4500); // preloader + intro
const tag = kind === 'phone' ? 'p' : kind;
await page.screenshot({ path: `${OUT}/site-${tag}-intro.png` });
for (const f of fr) {
  await page.evaluate((f) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    window.scrollTo(0, max * f);
  }, f);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/site-${tag}-${String(f).padEnd(4, '0')}.png` });
}
if (process.argv[4] === 'open') {
  const card = page.locator('[data-piece], .piece, .card').first();
  await card.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(800);
  await card.click({ force: true }).catch((e) => errors.push('click: ' + e.message));
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/site-${tag}-open.png` });
}
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
console.log('done');
