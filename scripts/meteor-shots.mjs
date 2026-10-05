// dev: shoot shots of the meteor hold → node scripts/meteor-shots.mjs control:0.3,leap:0.5 (into scripts/shots/)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:5199/');
await p.waitForFunction(() => window.__film);
await p.waitForTimeout(1500);
const list = process.argv[2].split(',');
let i = 0;
for (const it of list) {
  const [n, q] = it.split(':');
  await p.evaluate(([n, q]) => { window.__film.intro(8); window.__film.meteor(n, Number(q)); }, [n, q]);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `scripts/shots/m-${String(i++).padStart(2, '0')}.png` });
}
await b.close();
