// Dev-only: photograph frames of the film at given beats.
// usage: node scripts/shoot.mjs <beats comma list> [phone|desktop] [intro seconds] [wait ms]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.URL ?? 'http://localhost:5199';
const OUT = process.env.OUT ?? 'scripts/shots';
mkdirSync(OUT, { recursive: true });
// a beat is a raw beat ("18.5"), a film beat ("f:12.2"), a point in a hold ("hold:powers:0.4")
// or an ALTER shot ("alter:slashes:0.3")
const beats = (process.argv[2] ?? '0').split(',');
const kind = process.argv[3] ?? 'phone';
const intro = process.argv[4] === undefined || process.argv[4] === 'live' ? null : Number(process.argv[4]);
const wait = Number(process.argv[5] ?? 700);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const vp = kind === 'phone' ? { width: 390, height: 844, deviceScaleFactor: 2 } : { width: 1440, height: 900, deviceScaleFactor: 1 };
const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__film);
await page.waitForTimeout(1500);
for (const b of beats) {
  await page.waitForFunction(() => window.__film);
  await page.evaluate(([b, i]) => {
    window.__film.intro(i);
    window.__film.autoplay?.(false);
    if (b.startsWith('alter:')) { const [, n, q] = b.split(':'); window.__film.alter(n, Number(q ?? 0.5)); }
    else if (b.startsWith('titan:')) { const [, n, q] = b.split(':'); window.__film.titan(n, Number(q ?? 0.5)); }
    else if (b.startsWith('f:')) window.__film.seekFilm(Number(b.slice(2)));
    else if (b.startsWith('hold:')) { const [, k, q] = b.split(':'); window.__film.hold(k, Number(q ?? 0.5)); }
    else window.__film.seek(Number(b));
  }, [b, intro]);
  await page.waitForTimeout(wait);
  const tag = b.startsWith('alter:') || b.startsWith('hold:') || b.startsWith('titan:') ? b.replace(/:/g, '-') : b.startsWith('f:') ? `f${Number(b.slice(2)).toFixed(2)}` : Number(b).toFixed(2);
  await page.screenshot({ path: `${OUT}/${kind[0]}-${tag}.png` });
}
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
console.log('done');
