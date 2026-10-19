// Photograph actual scroll positions; prototype has no special seek override.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('scripts/shots', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const [name, width, height, deviceScaleFactor] of [['phone', 390, 844, 2], ['desktop', 1440, 900, 1]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:5199/?world=fire', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__world);
    for (const p of [0, .35, .6, 1]) {
      await page.evaluate(p => scrollTo(0, p * (document.documentElement.scrollHeight - innerHeight)), p);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `scripts/shots/world-${name}-${p}.png` });
      console.log(name, p, 'ms/frame', await page.evaluate(() => window.__world.cost()));
    }
    if (errors.length) throw new Error(errors.join('\n'));
    await page.close();
  }
} finally { await browser.close(); }
