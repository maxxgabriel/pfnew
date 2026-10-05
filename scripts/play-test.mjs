// dev: the play hold with a simulated finger → scripts/shots/q-*.png
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:5199/');
await p.waitForFunction(() => window.__film);
await p.waitForTimeout(1200);
let i = 0;
const shot = async (wait = 350) => { await p.waitForTimeout(wait); await p.screenshot({ path: `scripts/shots/q-${String(i++).padStart(2, '0')}.png` }); };
const at = async (q) => { await p.evaluate((q) => { window.__film.intro(8); window.__film.hold('play', q); }, q); };
await at(0.06); await shot(200);
await at(0.3); await shot(900);
await p.mouse.move(100, 700, { steps: 5 }); await shot(900);
await p.mouse.move(300, 450, { steps: 8 }); await shot(500);
await p.mouse.move(320, 460, { steps: 3 }); await shot(150);
// tap the spirit nearest the finger
const pos = await p.evaluate(() => 0);
await p.mouse.click(300, 700); await shot(120); await shot(250);
await at(0.82); await shot(400);
await at(0.93); await shot(300);
await b.close();
