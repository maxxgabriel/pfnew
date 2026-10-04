// Dev-only: per-act JS cost of a frame (ms), optionally under CPU throttle.
import { chromium } from 'playwright';
const rate = Number(process.argv[2] ?? 1);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate });
await page.goto(process.env.URL ?? 'http://localhost:5199');
await page.waitForFunction(() => window.__film);
await page.waitForTimeout(1500);
const out = [];
for (const b of [0.2, 1.8, 3.6, 5.8, 7.5, 9.5, 11.6, 13.2, 14.5, 16.0, 16.7, 19, 20.6]) {
  await page.evaluate((b) => { window.__film.intro(8); window.__film.seek(b); }, b);
  await page.waitForTimeout(1200);
  out.push(`${b}:${(await page.evaluate(() => window.__film.cost())).toFixed(1)}`);
}
console.log(`cpu x${rate} js ms/frame →`, out.join('  '));
await browser.close();
