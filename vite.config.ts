import { defineConfig } from 'vite';

// One JS bundle, no code-splitting. The drawings and paintings are separate
// files loaded in the order the film needs them (src/sketch/load.ts); set
// SINGLE=1 to inline everything into one self-contained HTML file instead.
// SITE_URL (e.g. https://maxgabriel.com) makes the link-preview image absolute,
// which most link previews require.
const site = (process.env.SITE_URL ?? '').replace(/\/$/, '');
export default defineConfig({
  base: './',
  plugins: [{
    name: 'site-url',
    transformIndexHtml: (html) => (site ? html.replace(/content="og\.jpg"/g, `content="${site}/og.jpg"`).replace('<!--/META-->', `<meta property="og:url" content="${site}/" />\n    <!--/META-->`) : html),
  }],
  build: {
    target: 'es2022',
    assetsInlineLimit: process.env.SINGLE ? 100_000_000 : 0,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
