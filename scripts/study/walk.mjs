// Record a whole-page walk of our site as a visitor would: wait for the opening, then scroll steadily to the end.
// usage: node scripts/study/walk.mjs <url> <outDir> <WxH> <scroll seconds>
import { chromium } from 'playwright';
const [url, out, size, secs] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number); const phone = W < 600;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone, recordVideo: { dir: out, size: { width: W, height: H } } });
const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(url); await p.waitForTimeout(14500);
if (!phone) await p.mouse.move(W * 0.6, H * 0.5);
const total = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const steps = Math.round(+secs * 1000 / 50), dy = total / steps;
for (let i = 0; i < steps; i++) {
  if (phone) await p.evaluate((dy) => scrollBy(0, dy), dy); else await p.mouse.wheel(0, dy);
  await p.waitForTimeout(50);
}
await p.waitForTimeout(3500);
await ctx.close(); await b.close();
