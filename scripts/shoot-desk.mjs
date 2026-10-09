// Dev-only: photograph the desk's camera (PC): the pause peek at raw beats, or any beat as is.
// usage: node scripts/shoot-desk.mjs <beats> [WxH] [idle seconds]   → scripts/shots/desk/
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const beats = (process.argv[2] ?? '8').split(',');
const [W, H] = (process.argv[3] ?? '1440x900').split('x').map(Number);
const idle = Number(process.argv[4] ?? 6);
mkdirSync('scripts/shots/desk', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(process.env.URL ?? 'http://localhost:5199');
await p.waitForFunction(() => window.__film);
await p.waitForTimeout(1500);
for (const beat of beats) {
  await p.evaluate(([bt, id]) => { window.__film.intro(8); window.__film.autoplay(false); window.__film.idle(null); window.__film.seek(bt); window.__film.idle(id); }, [Number(beat), idle]);
  await p.waitForTimeout(idle > 0 ? 2600 : 900);
  await p.screenshot({ path: `scripts/shots/desk/${process.env.TAG ?? ""}${W}x${H}-${beat}-i${idle}.png` });
}
if (errs.length) console.log(errs.join('\n'));
await b.close();
console.log('done');
