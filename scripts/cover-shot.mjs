// Dev-only: capture the cover frame exactly as the reader first sees it.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.URL ?? 'http://localhost:5173';
const OUT = 'scripts/shots/cover-probe';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto(BASE, { waitUntil: 'networkidle' });
await desktop.waitForTimeout(3800);
await desktop.screenshot({ path: `${OUT}/cover.png` });
await desktop.screenshot({ path: `${OUT}/cover-zoom.png`, scale: 'device' });

const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
await phone.goto(BASE, { waitUntil: 'networkidle' });
await phone.waitForTimeout(3800);
await phone.screenshot({ path: `${OUT}/cover-mobile.png` });

await browser.close();
console.log('captured');
