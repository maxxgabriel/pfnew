// Builds dist/ into the artifact: artifact/maxgabriel.html with the bundle's JS and CSS
// inlined (fonts stay on Google Fonts), and the drawings and paintings beside it in
// artifact/ (published with the page as its supporting files: the bundle resolves them relative to
// itself, and it is inlined into the page). With SINGLE=1 the
// build has already inlined the images too, and the page is one self-contained file.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, copyFileSync, statSync } from 'node:fs';

const dist = 'dist';
const html = readFileSync(`${dist}/index.html`, 'utf8');
const assets = readdirSync(`${dist}/assets`);
const js = assets.filter((f) => f.endsWith('.js')).map((f) => readFileSync(`${dist}/assets/${f}`, 'utf8')).join('\n');
const css = assets.filter((f) => f.endsWith('.css')).map((f) => readFileSync(`${dist}/assets/${f}`, 'utf8')).join('\n');
const pick = (a, b) => html.slice(html.indexOf(a) + a.length, html.indexOf(b));
const fonts = pick('<!--FONTS-->', '<!--/FONTS-->').trim();
const body = pick('<!--BODY-->', '<!--/BODY-->').trim();
const meta = pick('<!--META-->', '<!--/META-->').trim();

// The artifact host supplies the doctype/head/body skeleton itself.
const out = `<title>Max Gabriel</title>
${meta}
${fonts}
<style>${css}</style>
${body}
<script type="module">${js.replace(/<\/script/g, '<\\/script')}</script>
`;
rmSync('artifact', { recursive: true, force: true });
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/maxgabriel.html', out);
let n = 0, bytes = 0;
for (const f of assets) {
  if (f.endsWith('.js') || f.endsWith('.css')) continue;
  copyFileSync(`${dist}/assets/${f}`, `artifact/${f}`);
  n++;
  bytes += statSync(`artifact/${f}`).size;
}
for (const f of readdirSync(dist)) if (/\.(png|svg|jpg|webp)$/.test(f)) copyFileSync(`${dist}/${f}`, `artifact/${f}`);
console.log(`artifact/maxgabriel.html ${(out.length / 1024).toFixed(1)} KB + ${n} files beside it (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
