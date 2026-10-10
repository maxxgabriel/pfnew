// dev: simulate a finger painting the opening, screenshot along the way → scripts/shots/p-*.png
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:5199/');
await p.waitForFunction(() => window.__film);
await p.waitForTimeout(1200);
let i = 0;
const shot = async () => { await p.waitForTimeout(350); await p.screenshot({ path: `scripts/shots/p-${String(i++).padStart(2, '0')}.png` }); };
const at = async (B) => { await p.evaluate((B) => { window.__film.intro(8); window.__film.seekFilm(B); }, B); await p.waitForTimeout(250); };
const stroke = async (pts) => { await p.mouse.move(...pts[0]); await p.mouse.down(); for (const q of pts.slice(1)) { await p.mouse.move(q[0], q[1], { steps: 6 }); await p.waitForTimeout(16); } await p.mouse.up(); };
await at(0.02); await shot();
await at(0.35); await stroke([[60, 300], [140, 360], [220, 330], [320, 400]]); await shot();
await stroke([[80, 600], [200, 560], [300, 640]]); await shot();
for (const B of [0.9, 1.2, 1.5, 1.75, 1.95, 2.1, 2.25]) { await at(B); await shot(); }
await b.close();
