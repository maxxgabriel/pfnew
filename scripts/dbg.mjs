// Dev-only: report the cover's playhead and the board's transform at rest.
import { chromium } from 'playwright';

const BASE = process.env.URL ?? 'http://localhost:5176';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

for (const y of [0, 200, 600, 1200]) {
  await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y);
  await page.waitForTimeout(500);

  const info = await page.evaluate(() => {
    const spread = document.querySelector('#cover');
    const board = spread?.querySelector('[class*="board"]');
    const scrawl = spread?.querySelector('[class*="scrawl"]');
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), h: Math.round(r.height) };
    };
    return {
      spreadTop: Math.round(spread.getBoundingClientRect().top),
      spreadH: spread.offsetHeight,
      board: box(board),
      boardTransform: board ? getComputedStyle(board).transform : null,
      scrawl: box(scrawl),
      scrawlText: scrawl?.textContent,
    };
  });
  console.log(y, JSON.stringify(info));
}

await browser.close();
