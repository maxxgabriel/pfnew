// dev: scroll through the film in real time (the water is a live simulation), screenshot at film beats
//   node scripts/water-run.mjs 0.6,1.8,... [seconds per beat]
import { chromium } from 'playwright';
const beats = process.argv[2].split(',').map(Number);
const spb = Number(process.argv[3] ?? 2.2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:5199/');
await p.waitForFunction(() => window.__film);
await p.evaluate(() => window.__film.intro(null));
await p.waitForTimeout(3000);
let B = 0, i = 0;
for (const target of beats) {
  // glide to the beat at spb seconds per beat
  const steps = Math.max(1, Math.round(((target - B) * spb) / 0.1));
  for (let k = 1; k <= steps; k++) {
    await p.evaluate((x) => window.__film.seekFilm(x), B + ((target - B) * k) / steps);
    await p.waitForTimeout(100);
  }
  B = target;
  await p.waitForTimeout(400);
  await p.screenshot({ path: `scripts/shots/r-${String(i++).padStart(2, '0')}.png` });
  console.log('shot', target, await p.evaluate(() => window.__film.cost().toFixed(1)));
}
await b.close();
