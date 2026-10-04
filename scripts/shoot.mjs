// Dev-only: photograph frames of the film at given beats.
// usage: node scripts/shoot.mjs <beats comma list> [phone|desktop] [intro seconds] [wait ms]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.URL ?? 'http://localhost:5199';
const OUT = process.env.OUT ?? 'scripts/shots';
mkdirSync(OUT, { recursive: true });
const beats = (process.argv[2] ?? '0').split(',').map(Number);
const kind = process.argv[3] ?? 'phone';
const intro = process.argv[4] === undefined || process.argv[4] === 'live' ? null : Number(process.argv[4]);
const wait = Number(process.argv[5] ?? 700);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const vp = kind === 'phone' ? { width: 390, height: 844, deviceScaleFactor: 2 } : { width: 1440, height: 900, deviceScaleFactor: 1 };
const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__film);
await page.waitForTimeout(1500);
for (const b of beats) {
  await page.evaluate(([b, i, film, idle]) => { window.__film.intro(i); window.__film.setIdle(idle); if (film) window.__film.seekFilm(b); else window.__film.seek(b); }, [b, intro, !!process.env.FILM, process.env.IDLE ? Number(process.env.IDLE) : 0]);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${kind[0]}-${b.toFixed(2)}.png` });
}
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
console.log('done');
