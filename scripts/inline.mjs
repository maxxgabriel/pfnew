// Builds dist/ into one self-contained HTML file (artifact/maxgabriel.html):
// the bundle's JS and CSS are inlined; fonts stay on Google Fonts.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const dist = 'dist';
const html = readFileSync(`${dist}/index.html`, 'utf8');
const assets = readdirSync(`${dist}/assets`);
const js = assets.filter((f) => f.endsWith('.js')).map((f) => readFileSync(`${dist}/assets/${f}`, 'utf8')).join('\n');
const css = assets.filter((f) => f.endsWith('.css')).map((f) => readFileSync(`${dist}/assets/${f}`, 'utf8')).join('\n');
const pick = (a, b) => html.slice(html.indexOf(a) + a.length, html.indexOf(b));
const fonts = pick('<!--FONTS-->', '<!--/FONTS-->').trim();
const body = pick('<!--BODY-->', '<!--/BODY-->').trim();

// The artifact host supplies the doctype/head/body skeleton itself.
const out = `<title>Max Gabriel</title>
<meta name="description" content="Max Gabriel designs and builds things that move.">
${fonts}
<style>${css}</style>
${body}
<script type="module">${js.replace(/<\/script/g, '<\\/script')}</script>
`;
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/maxgabriel.html', out);
console.log(`artifact/maxgabriel.html ${(out.length / 1024).toFixed(1)} KB`);
