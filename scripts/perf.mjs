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
// `node scripts/perf.mjs 1 alter` measures every ALTER shot instead
if (process.argv[3] === 'alter') {
  const names = ['corrupt', 'title', 'wide', 'feet', 'sword', 'eyes', 'ring', 'impact', 'reveal', 'standoff', 'dash', 'clash', 'slashes', 'volley', 'still', 'calm', 'drop', 'beneath', 'release', 'sign', 'expand', 'void', 'shatter', 'charge', 'fire', 'driven', 'strain', 'push', 'snap', 'column', 'after', 'exit'];
  for (const n of names) {
    await page.evaluate((n) => { window.__film.intro(8); window.__film.alter(n, 0.6); }, n);
    await page.waitForTimeout(1000);
    out.push(`${n}:${(await page.evaluate(() => window.__film.cost())).toFixed(1)}`);
  }
  console.log(`cpu x${rate} js ms/frame →`, out.join('  '));
  await browser.close();
  process.exit(0);
}
// raw beats spread over the whole film (every hold included)
for (const b of [31.5, 31.9, 32.5, 33.4, 34.3, 35.2, 35.9, 36.6, 37.4]) {
  await page.evaluate((b) => { window.__film.intro(8); window.__film.seek(b); }, b);
  await page.waitForTimeout(1200);
  out.push(`${b}:${(await page.evaluate(() => window.__film.cost())).toFixed(1)}`);
}
console.log(`cpu x${rate} js ms/frame →`, out.join('  '));
await browser.close();
