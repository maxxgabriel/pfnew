// Preserve each page's module graph: concatenating every JS file would start the
// film inside the site and break shared imports. Both pages ship with assets/.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync } from 'node:fs';
rmSync('artifact', { recursive: true, force: true });
mkdirSync('artifact', { recursive: true });
for (const file of readdirSync('dist')) cpSync(`dist/${file}`, `artifact/${file}`, { recursive: true });
const html = readFileSync('dist/index.html', 'utf8');
// The artifact host supplies its document skeleton; retain fonts, metadata,
// stylesheet links and module entry while supporting ordinary static hosting.
const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '';
const body = html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? '';
writeFileSync('artifact/maxgabriel.html', `${head}\n${body}`);
console.log('artifact/index.html + maxgabriel.html (site), film.html, and assets/ ready');
