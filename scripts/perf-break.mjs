// Dev-only: frame cost across break.html. Plays the whole piece by moving the playhead a little
// every frame and reports the CPU time of update+render per section, plus the frame interval.
// usage: node scripts/perf-break.mjs [phone|desktop|WxH] [beats per second]
import { chromium } from 'playwright';

const BASE = process.env.URL ?? 'http://localhost:5199/break.html';
const kind = process.argv[2] ?? 'phone';
const speed = Number(process.argv[3] ?? 6);
const vp = kind === 'phone' ? { width: 390, height: 844, deviceScaleFactor: 2 }
  : /^\d+x\d+$/.test(kind) ? { width: +kind.split('x')[0], height: +kind.split('x')[1], deviceScaleFactor: 1 }
    : { width: 1440, height: 900, deviceScaleFactor: 1 };
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : { args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__brk);
await page.evaluate(() => window.__brk.ready);
const out = await page.evaluate(async (bps) => {
  const sections = [[0, 'open'], [26, 'snap'], [46, 'peel'], [66, 'drop'], [98, 'floor'], [122, 'quiet'], [142, 'rise'], [158, 'slam'], [182, 'home']];
  const acc = {};
  let b = 0, last = performance.now();
  await new Promise((done) => {
    const step = (now) => {
      const dt = now - last; last = now;
      const name = sections.filter(([s]) => b >= s).pop()[1];
      (acc[name] ??= []).push(dt);
      b += (bps * Math.min(dt, 50)) / 1000;
      window.__brk.seek(b);
      if (b < 198) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
  return Object.fromEntries(Object.entries(acc).map(([k, v]) => {
    const s = [...v].sort((a, z) => a - z);
    return [k, { frames: v.length, avg: +(v.reduce((a, z) => a + z, 0) / v.length).toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1) }];
  }));
}, speed);
console.log(kind, JSON.stringify(out, null, 1));
await browser.close();
