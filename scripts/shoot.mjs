// Dev-only: photograph the picture, reel by reel.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.URL ?? 'http://localhost:5176';
const OUT = 'scripts/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

/**
 * Walks the whole picture in even steps rather than jumping between anchors:
 * the reels are continuous shots, so what matters is how the frame looks
 * *through* each one, not where a section happens to start.
 */
async function walk(page, prefix, steps = 8) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // let the chisel sequence and the ambient loops settle
  await page.waitForTimeout(3200);

  const height = await page.evaluate(() => document.body.scrollHeight);
  const viewport = await page.evaluate(() => window.innerHeight);
  const travel = Math.max(height - viewport, 0);

  for (let i = 0; i <= steps; i++) {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      travel * (i / steps),
    );
    await page.waitForTimeout(1100);
    await page.screenshot({ path: `${OUT}/${prefix}-${String(i).padStart(2, '0')}.png` });
  }
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await walk(desktop, 'd');

const phone = await browser.newPage({ ...devices['iPhone 14 Pro'] });
await walk(phone, 'm', 4);

await browser.close();
console.log('done');
