// Cut the fun stickers out of their magenta backgrounds, in a headless browser (no Python needed).
//   node scripts/cutout-fun.mjs [name ...]     art/raw/fun/<name>.png → src/assets/fun/<name>.webp + manifest.json
//   SRC=art/raw/uni/pixel OUT=src/assets/uni/pixel node scripts/cutout-fun.mjs     (a universe's set)
// Alpha comes from how magenta a pixel is (min(R,B) - G), edge pixels are un-mixed from the magenta so
// no pink fringe is left (same maths as scripts/cutout.py), then the sticker is cropped to its ink and
// scaled so its longest side is at most 640 px.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';

const SRC = process.env.SRC ?? 'art/raw/fun', OUT = process.env.OUT ?? 'src/assets/fun', MAX = 640;
mkdirSync(OUT, { recursive: true });
const names = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(SRC).filter((f) => f.endsWith('.png') && !f.includes('test')).map((f) => f.slice(0, -4));
const manifest = existsSync(`${OUT}/manifest.json`) ? JSON.parse(readFileSync(`${OUT}/manifest.json`, 'utf8')) : {};
const browser = await chromium.launch();
const page = await browser.newPage();
for (const name of names) {
  const src = `data:image/png;base64,${readFileSync(`${SRC}/${name}.png`).toString('base64')}`;
  const res = await page.evaluate(async ([src, MAX]) => {
    const im = new Image(); im.src = src; await im.decode();
    const W = im.naturalWidth, H = im.naturalHeight;
    const cv = new OffscreenCanvas(W, H), g = cv.getContext('2d');
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, W, H), p = d.data;
    const M = [250, 4, 249];
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, r = p[i], gg = p[i + 1], b = p[i + 2];
      const m = Math.min(r, b) - gg;
      // magenta keys to alpha (and edges are un-mixed from it); a source that already came back
      // transparent keeps its own alpha and colours
      const own = p[i + 3] < 255;
      let a = own ? p[i + 3] / 255 : 1 - Math.min(1, Math.max(0, (m - 40) / (215 - 40)));
      if (x < 6 || y < 6 || x >= W - 6 || y >= H - 6) a = 0;
      if (a < 0.04) { p[i + 3] = 0; continue; }
      if (!own) {
        const k = Math.max(a, 1e-3);
        const fr = (r - (1 - a) * M[0]) / k, fb = (b - (1 - a) * M[2]) / k;
        const fg = Math.max((gg - (1 - a) * M[1]) / k, Math.min(fr, fb) - 60);
        p[i] = Math.min(255, Math.max(0, fr)); p[i + 1] = Math.min(255, Math.max(0, fg)); p[i + 2] = Math.min(255, Math.max(0, fb));
      }
      p[i + 3] = Math.round(a * 255);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    g.putImageData(d, 0, 0);
    const pad = 8; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1, s = Math.min(1, MAX / Math.max(cw, ch));
    const out = new OffscreenCanvas(Math.round(cw * s), Math.round(ch * s));
    const o = out.getContext('2d'); o.imageSmoothingQuality = 'high';
    o.drawImage(cv, x0, y0, cw, ch, 0, 0, out.width, out.height);
    const blob = await out.convertToBlob({ type: 'image/webp', quality: 0.92 });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { b64: btoa(bin), w: out.width, h: out.height };
  }, [src, MAX]);
  writeFileSync(`${OUT}/${name}.webp`, Buffer.from(res.b64, 'base64'));
  manifest[name] = { w: res.w, h: res.h };
  console.log(name, `${res.w}x${res.h}`);
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));
await browser.close();
