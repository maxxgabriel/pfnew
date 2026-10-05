// dev: render the 3D hero turnaround sheet (scripts/hero-sheet.html) → node scripts/hero-sheet.mjs out.png
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1600, height: 1800 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 300)); });
await p.goto('http://localhost:5199/' + (process.argv[3] || 'scripts/hero-sheet.html'));
await p.waitForFunction(() => window.done, null, { timeout: 60000 });
await p.waitForTimeout(300);
await p.screenshot({ path: process.argv[2] });
await b.close();
