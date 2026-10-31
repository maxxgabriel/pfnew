// Dev-only: photograph break.html at given beats.
// usage: node scripts/shoot-break.mjs <beats comma list> [phone|desktop|WxH] [clock seconds] [idle 0..1]
// env: URL (default http://localhost:5199/break.html), OUT (default scripts/shots/break), CHROMIUM (browser path)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.URL ?? 'http://localhost:5199/break.html';
const OUT = process.env.OUT ?? 'scripts/shots/break';
mkdirSync(OUT, { recursive: true });
const beats = (process.argv[2] ?? '0').split(',').map(Number);
const kind = process.argv[3] ?? 'phone';
const clock = Number(process.argv[4] ?? 2);
const idle = process.argv[5] === undefined ? 0 : Number(process.argv[5]);
const vp = kind === 'phone' ? { width: 390, height: 844, deviceScaleFactor: 2 }
  : /^\d+x\d+$/.test(kind) ? { width: +kind.split('x')[0], height: +kind.split('x')[1], deviceScaleFactor: 1 }
    : { width: 1440, height: 900, deviceScaleFactor: 1 };
const args = ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM, args } : { args });
const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, hasTouch: kind === 'phone', isMobile: kind === 'phone' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__brk);
await page.evaluate(() => window.__brk.ready);
await page.evaluate(([c, i]) => { window.__brk.freeze(c); window.__brk.idle(i); }, [clock, idle]);
for (const b of beats) {
  await page.evaluate((x) => window.__brk.seek(x), b);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/${kind}-${b.toFixed(2)}.png` });
}
console.log(errors.length ? errors.join('\n') : 'ok');
await browser.close();
