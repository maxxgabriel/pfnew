// Dev-only: photograph ONE spread across its own length.
//
// walk() in shoot.mjs samples the whole book evenly, which is right for
// checking continuity but useless for checking a single shot — a 3-viewport
// spread gets two frames out of eight. This finds a spread by id and steps
// through only its own scroll range.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.URL ?? 'http://localhost:5176';
const ID = process.argv[2];
const STEPS = Number(process.argv[3] ?? 8);
const MOBILE = process.argv.includes('--mobile');

if (!ID) {
  console.error('usage: node scripts/spread.mjs <spread-id> [steps] [--mobile]');
  process.exit(1);
}

const OUT = `scripts/shots/${ID}`;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = MOBILE
  ? await browser.newPage({ ...devices['iPhone 14 Pro'] })
  : await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const box = await page.evaluate((id) => {
  const el = document.getElementById(id);
  if (!el) return null;
  const top = el.getBoundingClientRect().top + window.scrollY;
  return { top, height: el.offsetHeight };
}, ID);

if (!box) {
  console.error(`no spread with id "${ID}"`);
  await browser.close();
  process.exit(1);
}

/*
 * A pinned spread's playhead runs 0→1 as its top travels from the top of the
 * viewport to (height - viewport) above it, which is exactly the range the
 * Spread component measures. Sampling that same range means frame i here is
 * playhead i/steps there.
 */
const travel = Math.max(box.height - (await page.evaluate(() => window.innerHeight)), 1);
const prefix = MOBILE ? 'm' : 'd';

for (let i = 0; i <= STEPS; i++) {
  const y = box.top + travel * (i / STEPS);
  await page.evaluate((to) => window.scrollTo({ top: to, behavior: 'instant' }), y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${prefix}-${String(i).padStart(2, '0')}.png` });
}

await browser.close();
console.log(`shot ${STEPS + 1} frames of "${ID}" → ${OUT}`);
