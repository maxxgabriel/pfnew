// Record our own page as video (same settings as the study recordings) so it can be judged in motion.
// usage: node scripts/study/rec-local.mjs <url> <outDir> <WxH> <seconds>
import { chromium } from 'playwright';
const [url, out, size, secs] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number); const phone = W < 600;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone, recordVideo: { dir: out, size: { width: W, height: H } } });
const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(url); await p.waitForTimeout(+secs * 1000);
await ctx.close(); await b.close();
