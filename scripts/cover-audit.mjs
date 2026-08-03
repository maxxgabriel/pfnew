// Dev-only: audit the cover's actual rendered state so I can "see" without images.
import { chromium } from 'playwright';

const BASE = process.env.URL ?? 'http://localhost:5173';

const W = Number(process.env.W ?? 1440);
const H = Number(process.env.H ?? 900);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);

const audit = await page.evaluate(() => {
  const sel = (name) => {
    const el = document.querySelector(`[class*="${name}"]`);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      className: el.className.toString().slice(0, 60),
      box: [r.x | 0, r.y | 0, r.width | 0, r.height | 0],
      bg: cs.backgroundColor,
      bgImage: cs.backgroundImage.slice(0, 60),
      color: cs.color,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      textTransform: cs.textTransform,
      textShadow: cs.textShadow,
      opacity: cs.opacity,
      filter: cs.filter,
      zIndex: cs.zIndex,
      mixBlend: cs.mixBlendMode,
      maskImage: cs.maskImage.slice(0, 40),
    };
  };

  const overlap = (a, b) => {
    const [A, B] = [document.querySelector(`[class*="${a}"]`), document.querySelector(`[class*="${b}"]`)];
    if (!A || !B) return null;
    const ra = A.getBoundingClientRect();
    const rb = B.getBoundingClientRect();
    const x = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
    const y = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
    return [x | 0, y | 0];
  };

  return {
    board: sel('board'),
    mast: sel('mast'),
    line: sel('line'),
    owner: sel('owner'),
    note: sel('note'),
    hero: sel('hero'),
    wham: sel('wham'),
    pow: sel('pow'),
    logoBurst: sel('logoBurst'),
    book: sel('book'),
    overlaps: {
      bustMast: overlap('logoBurst', 'mast'),
      mastHero: overlap('mast', 'hero'),
      heroWham: overlap('hero', 'wham'),
      heroPow: overlap('hero', 'pow'),
      heroNote: overlap('hero', 'note'),
      ownerNote: overlap('owner', 'note'),
      ownerHero: overlap('owner', 'hero'),
      burstWham: overlap('logoBurst', 'wham'),
    },
  };
});

console.log(JSON.stringify(audit, null, 2));
await browser.close();
