// Dev: render link-preview candidates (1200x630) straight from the film, HUD hidden.
//   node scripts/og-card.mjs f:2.6,f:24.6 → scripts/shots/og-<beat>.png
import { chromium } from 'playwright';
const beats = (process.argv[2] ?? 'f:3').split(',');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(process.env.URL ?? 'http://localhost:5199');
await page.waitForFunction(() => window.__film);
await page.addStyleTag({ content: '.hud,.reel,#hello,#sign{display:none!important}' });
await page.waitForTimeout(2500);
for (const b of beats) {
  await page.evaluate((b) => { window.__film.autoplay?.(false); window.__film.intro(8); if (b.startsWith('f:')) window.__film.seekFilm(Number(b.slice(2))); else window.__film.seek(Number(b)); }, b);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${process.env.OUT ?? 'scripts/shots'}/og-${b.replace(':', '')}.png` });
}
await browser.close();
