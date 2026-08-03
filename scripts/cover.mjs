// Dev-only: step through the cover lift, since it happens in the first
// fraction of the book and the whole-page walk skips straight past it.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.URL ?? 'http://localhost:5176';
const OUT = 'scripts/shots/cover';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);

// The cover spread is 1.6 viewports; sample across its own scroll range.
const span = await page.evaluate(() => {
  const el = document.querySelector('#cover');
  return el ? el.offsetHeight : window.innerHeight;
});

for (const f of [0, 0.15, 0.3, 0.45, 0.6, 0.8]) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), span * f);
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${OUT}/${String(Math.round(f * 100)).padStart(3, '0')}.png` });
}

await browser.close();
console.log('done');
