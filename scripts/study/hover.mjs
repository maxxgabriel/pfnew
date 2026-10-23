// Study a reference site's HOVER / MENU / CLICK motion on desktop: record a video while the mouse
// visits every interactive element, opens the menu, and clicks through to a work page.
// Logs every action time, plus the custom cursor's class + transform on every frame (page clock).
// usage: node scripts/study/hover.mjs <url> <outDir> [WxH]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const [url, out, size = '1440x900'] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: 1, ignoreHTTPSErrors: true,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  recordVideo: { dir: out, size: { width: W, height: H } },
});
// Every frame: note the custom cursor's class and transform when they change (wall clock ms).
await ctx.addInitScript(() => {
  window.__cur = [];
  let last = '';
  const tick = () => {
    const c = document.querySelector('[class*="styles_cursor__"]');
    if (c) {
      const s = c.className.replace(/styles_|__\w{5}/g, '') + ' | ' + (c.style.transform || getComputedStyle(c).transform);
      if (s !== last) { window.__cur.push([Date.now(), s]); last = s; }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const p = await ctx.newPage();
const t0 = Date.now(); const log = [];
const T = () => +((Date.now() - t0) / 1000).toFixed(2);
const mark = (what) => { log.push({ t: T(), what }); console.log(T(), what); };
p.on('pageerror', (e) => mark('pageerror ' + e.message.slice(0, 100)));
p.on('framenavigated', (f) => { if (f === p.mainFrame()) mark('navigated ' + f.url()); });
const wait = (ms) => p.waitForTimeout(ms);
let mx = W / 2, my = H / 2;
async function move(x, y, steps = 25) { await p.mouse.move(x, y, { steps }); mx = x; my = y; }
const scrollY = () => p.evaluate(() => Math.round(window.scrollY));
async function wheelBy(dy) { const n = Math.max(1, Math.round(Math.abs(dy) / 100)); for (let i = 0; i < n; i++) { await p.mouse.wheel(0, dy / n); await wait(35); } await wait(1400); }
// rects of all elements matching sel (document coords + viewport coords)
const rects = (sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((e, i) => { const r = e.getBoundingClientRect(); return { i, x: r.left, y: r.top, w: r.width, h: r.height, txt: (e.textContent || '').trim().slice(0, 24), vis: r.width > 2 && r.height > 2 && getComputedStyle(e).visibility !== 'hidden' }; }), sel);
async function bringIntoView(sel, i, frac = 0.45) {
  for (let k = 0; k < 4; k++) {
    const r = (await rects(sel))[i]; if (!r) return null;
    const cy = r.y + r.h / 2;
    if (cy > 80 && cy < H - 80) return r;
    await wheelBy(cy - H * frac);
  }
  return (await rects(sel))[i];
}
async function hover(sel, i, label, { dwell = 1500, off = 0.8, path = null } = {}) {
  const r = await bringIntoView(sel, i);
  if (!r || !r.vis) { mark(`skip ${label} (not visible)`); return; }
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  mark(`hover-in ${label} "${r.txt}" rect=${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)}x${Math.round(r.h)} y=${await scrollY()}`);
  await move(cx, cy, 20);
  mark(`arrived ${label}`);
  if (path) { await path(r); } else await wait(dwell);
  const ox = Math.min(W - 10, Math.max(10, cx + (cx > W / 2 ? -1 : 1) * Math.max(160, r.w * 0.6)));
  const oy = Math.min(H - 10, Math.max(10, cy + (cy > H / 2 ? -1 : 1) * Math.max(120, r.h * 0.8)));
  mark(`hover-out ${label}`);
  await move(ox, oy, 12);
  await wait(off * 1000);
}
// probe a grid of points over a region, logging the cursor state at each
async function probe(label, x0, y0, x1, y1, n = 4) {
  for (let a = 0; a < n; a++) for (let c = 0; c < n; c++) {
    const x = x0 + (x1 - x0) * (c + 0.5) / n, y = y0 + (y1 - y0) * (a + 0.5) / n;
    await move(x, y, 6); await wait(250);
    const cls = await p.evaluate(() => document.querySelector('[class*="styles_cursor__"]')?.className.replace(/styles_|__\w{5}/g, ''));
    mark(`probe ${label} ${Math.round(x)},${Math.round(y)} cursor=${cls}`);
  }
}

mark('goto'); await p.goto(url, { waitUntil: 'commit', timeout: 60000 }).catch((e) => mark('goto error ' + e.message));
await wait(10000); mark('intro done');
await move(W * 0.5, H * 0.5, 10); await wait(600);

// ---- 1. hero + header -------------------------------------------------------------------------
mark('hero sweep MAT start');
await move(30, 180, 30); await move(560, 180, 60); await move(560, 300, 15); await move(30, 300, 60); mark('hero sweep MAT end'); await wait(800);
mark('hero sweep VOYCE start');
await move(620, 720, 30); await move(1410, 720, 80); await move(1000, 600, 30); mark('hero sweep VOYCE end'); await wait(800);
mark('hero fast flick'); await move(200, 200, 4); await move(1200, 700, 4); await wait(1500);
mark('hero idle (mouse still) 2s'); await wait(2000);
await hover('header [class*="styles_logo_link__"]', 0, 'header logo');
const soc = await rects('header [class*="lineUnderColor"]');
for (let i = 0; i < soc.length; i++) await hover('header [class*="lineUnderColor"]', i, 'header social ' + i);
await hover('header [class*="content__center"]', 0, 'header blurb (non-link)', { dwell: 900 });
await hover('header [class*="content__right"]', 0, 'header UK based (non-link)', { dwell: 900 });
await hover('header [class*="toggle_menu_btn__"]', 0, 'MENU button', { dwell: 2000 });
await hover('[class*="styles_scroller_inner"]', 0, 'SCROLL chip');
// balls (green circles, fixed bottom corners)
for (const s of ['left', 'right']) { const r = (await rects(`[class*="styles_ball__${s}"]`))[0]; if (r && r.vis) { mark(`ball ${s} rect=${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)}`); await move(Math.min(W - 5, Math.max(5, r.x + r.w / 2)), Math.min(H - 5, r.y + r.h * 0.3), 20); await wait(1500); await move(W / 2, H / 2, 12); await wait(800); } }

// ---- 2. scroll down through the page ----------------------------------------------------------
mark('scroll to feature works');
const fw = (await rects('[class*="styles_featureWorks__"]'))[0];
await wheelBy(fw.y + 50); await wait(1500);
mark('feature works y=' + await scrollY());
await probe('featureWorks', 100, 100, W - 100, H - 100, 4);
// dwell on whatever showed view project
for (let k = 0; k < 4; k++) { await wheelBy(300); mark('fw step y=' + await scrollY()); await probe('featureWorks-s' + k, 200, 150, W - 200, H - 150, 3); }

const wwd = await rects('[class*="wWDo_heading__fyFBk"]');
for (let i = 0; i < wwd.length; i++) {
  await hover('[class*="wWDo_heading__fyFBk"]', i, 'what-he-does ' + i, { path: async (r) => { await move(r.x + r.w * 0.2, r.y + r.h * 0.5, 15); await wait(600); await move(r.x + r.w * 0.8, r.y + r.h * 0.5, 30); await wait(600); } });
}
const brandSel = '[class*="styles_brands_item"] img';
const br = await rects(brandSel);
const onscreenBrands = [];
await bringIntoView(brandSel, 0);
for (const r of await rects(brandSel)) if (r.x > 100 && r.x < W - 250 && r.y > 0 && r.y < H) onscreenBrands.push(r.i);
mark('brands count ' + br.length + ' onscreen ' + onscreenBrands.length);
for (const i of onscreenBrands.slice(0, 3)) await hover(brandSel, i, 'brand logo ' + i, { dwell: 1500 });
mark('brands row hover-hold 3s (does the crawl stop?)'); { const r = (await rects(brandSel))[onscreenBrands[0]]; if (r) { await move(r.x + r.w / 2, r.y + r.h / 2, 10); await wait(3000); } }

await hover('[class*="styles_button__aOF4Y"]', 0, 'CONTACT pill', { path: async (r) => {
  await wait(1200);
  mark('contact pill: move inside L->R'); await move(r.x + r.w * 0.15, r.y + r.h * 0.5, 25); await wait(500); await move(r.x + r.w * 0.85, r.y + r.h * 0.5, 50); await wait(500);
  mark('contact pill: move inside T->B'); await move(r.x + r.w * 0.5, r.y + r.h * 0.2, 25); await move(r.x + r.w * 0.5, r.y + r.h * 0.8, 25); await wait(1200);
} });

// ---- footer --------------------------------------------------------------------------------
mark('scroll to bottom');
await wheelBy(4000); await wait(1500); mark('bottom y=' + await scrollY());
await move(W / 2, H / 2, 15); await wait(800);
const fItems = await rects('footer [class*="styles_menu_item__"] a');
for (let i = 0; i < fItems.length; i++) await hover('footer [class*="styles_menu_item__"] a', i, 'footer menu ' + i, { dwell: 1500 });
const fLines = await rects('footer [class*="lineUnderColor"]');
for (let i = 0; i < fLines.length; i++) await hover('footer [class*="lineUnderColor"]', i, 'footer line link ' + i, { dwell: 1500 });
await hover('footer [class*="footer_center_inner"]', 0, 'footer big wordmark/gif', { path: async (r) => { await move(r.x + r.w * 0.2, r.y + r.h * 0.5, 15); await move(r.x + r.w * 0.8, r.y + r.h * 0.5, 40); await wait(800); } });
await hover('footer [class*="styles_logo_link__"]', 0, 'footer logo');
await hover('footer [class*="toggle_menu_btn__"]', 0, 'footer MENU button');

// ---- 3. menu ---------------------------------------------------------------------------------
mark('scroll to top'); await wheelBy(-9000); await wait(1500); mark('top y=' + await scrollY());
const mb = (await rects('header [class*="toggle_menu_btn__"]'))[0];
await move(mb.x + mb.w / 2, mb.y + mb.h / 2, 20); await wait(800);
mark('CLICK menu open'); await p.mouse.click(mb.x + mb.w / 2, mb.y + mb.h / 2); await wait(2500); mark('menu open settled');
const nav = await rects('[class*="styles_nav_menu__"] .menu-item');
for (let i = 0; i < nav.length; i++) await hover('[class*="styles_nav_menu__"] .menu-item', i, 'nav item ' + i, { dwell: 2000 });
await hover('[class*="styles_nav__"] [class*="styles_link__97QS5"]', 0, 'nav Contact Mat', { dwell: 1500 });
const mb2 = (await rects('header [class*="toggle_menu_btn__"]'))[0];
await move(mb2.x + mb2.w / 2, mb2.y + mb2.h / 2, 20); await wait(1200); mark('hover CLOSE');
mark('CLICK menu close'); await p.mouse.click(mb2.x + mb2.w / 2, mb2.y + mb2.h / 2); await wait(2500); mark('menu closed settled');

// ---- 4. click through to work ----------------------------------------------------------------
mark('CLICK menu open (2)'); await p.mouse.click(mb2.x + mb2.w / 2, mb2.y + mb2.h / 2); await wait(2000);
const w0 = (await rects('[class*="styles_nav_menu__"] .menu-item a'))[0];
await move(w0.x + w0.w / 2, w0.y + w0.h / 2, 20); await wait(800);
mark('CLICK nav Work'); await p.mouse.click(w0.x + w0.w / 2, w0.y + w0.h / 2); await wait(5000); mark('work page settled url=' + p.url());
await move(W / 2, H / 2, 15); await wait(1000);
await probe('work page', 100, 100, W - 100, H - 100, 4);
// find a project link on the work page
const proj = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => { const r = a.getBoundingClientRect(); return { href: a.getAttribute('href'), x: r.left, y: r.top, w: r.width, h: r.height }; }).filter((a) => a.w > 100 && a.h > 100 && a.y > 0 && a.y < innerHeight && !/^(http|mailto)/.test(a.href)));
mark('work links ' + JSON.stringify(proj.slice(0, 6).map((a) => a.href + '@' + Math.round(a.x) + ',' + Math.round(a.y) + ' ' + Math.round(a.w) + 'x' + Math.round(a.h))));
writeFileSync(out + '/work.html', await p.evaluate(() => document.body.outerHTML));
if (proj.length) {
  const a = proj[0];
  mark('hover project tile ' + a.href); await move(a.x + a.w / 2, a.y + a.h / 2, 20); await wait(2000);
  await move(a.x + a.w * 0.3, a.y + a.h * 0.3, 15); await wait(1000);
  mark('CLICK project ' + a.href); await p.mouse.click(a.x + a.w * 0.3, a.y + a.h * 0.3); await wait(6000); mark('project page settled url=' + p.url());
  await move(W / 2, H / 2, 15); await wait(800); await probe('project page', 100, 100, W - 100, H - 100, 3);
  await wheelBy(900); await wait(1500); mark('project scrolled y=' + await scrollY()); await probe('project page s1', 100, 100, W - 100, H - 100, 3);
  writeFileSync(out + '/project.html', await p.evaluate(() => document.body.outerHTML));
  mark('BACK (history)'); await p.goBack().catch((e) => mark('back err ' + e.message)); await wait(5000); mark('back settled url=' + p.url());
}
// back-to-work link / logo home
const logo = (await rects('header [class*="styles_logo_link__"]'))[0];
if (logo && logo.vis) { await move(logo.x + logo.w / 2, logo.y + logo.h / 2, 20); await wait(1200); mark('CLICK logo home'); await p.mouse.click(logo.x + logo.w / 2, logo.y + logo.h / 2); await wait(6000); mark('home settled url=' + p.url()); }
await wait(1500); mark('end');

const cur = await p.evaluate(() => window.__cur).catch(() => []);
writeFileSync(out + '/cursor.json', JSON.stringify(cur.map(([t, s]) => [+((t - t0) / 1000).toFixed(3), s])));
writeFileSync(out + '/log.json', JSON.stringify(log, null, 1));
await ctx.close(); await b.close();
