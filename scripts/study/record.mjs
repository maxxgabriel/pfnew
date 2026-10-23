// Study a reference site's motion: record a video of a scripted session and log every action's time.
// usage: node scripts/study/record.mjs <url> <outDir> <WxH> <script: pass1|hover|...>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const [url, out, size, pass] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
mkdirSync(out, { recursive: true });
const phone = W < 600;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: 1, ignoreHTTPSErrors: true, isMobile: phone, hasTouch: phone,
  userAgent: phone ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  recordVideo: { dir: out, size: { width: W, height: H } },
});
const p = await ctx.newPage();
const t0 = Date.now(); const log = [];
const mark = (what) => { log.push({ t: (Date.now() - t0) / 1000, what }); };
p.on('pageerror', (e) => mark('pageerror ' + e.message.slice(0, 120)));
mark('goto'); await p.goto(url, { waitUntil: 'commit', timeout: 60000 }).catch((e) => mark('goto error ' + e.message));
const wait = (ms) => p.waitForTimeout(ms);
async function wheel(total, step = 90, gap = 70) { for (let y = 0; y < total; y += step) { await p.mouse.wheel(0, step); await wait(gap); } }
if (pass === 'pass1') {
  await wait(9000); mark('intro done (idle)');
  await p.mouse.move(W * .3, H * .4, { steps: 20 }); await p.mouse.move(W * .7, H * .6, { steps: 30 }); await p.mouse.move(W * .5, H * .5, { steps: 20 }); mark('mouse sweep hero'); await wait(1500);
  const docH = await p.evaluate(() => document.documentElement.scrollHeight); mark('docH ' + docH);
  for (let i = 0; i < 40; i++) { mark('scroll screen ' + i + ' y=' + await p.evaluate(() => Math.round(scrollY))); await wheel(H * 0.5); await wait(1200); const y = await p.evaluate(() => scrollY + innerHeight); const dh = await p.evaluate(() => document.documentElement.scrollHeight); if (y >= dh - 5 && i > 3) { mark('bottom'); break; } }
  await wait(2500); mark('end');
  const dom = await p.evaluate(() => [...document.querySelectorAll('a,button,h1,h2,h3,[class*=card],[class*=item],img,video,canvas,section')].slice(0, 400).map((e) => { const r = e.getBoundingClientRect(); return { tag: e.tagName, cls: (e.className?.baseVal ?? e.className ?? '').toString().slice(0, 60), txt: (e.textContent || '').trim().slice(0, 40), top: Math.round(r.top + scrollY), h: Math.round(r.height), x: Math.round(r.left), w: Math.round(r.width) }; }));
  writeFileSync(out + '/dom.json', JSON.stringify(dom, null, 1));
}
writeFileSync(out + '/log.json', JSON.stringify(log, null, 1));
await ctx.close(); await b.close();
console.log(JSON.stringify(log));
