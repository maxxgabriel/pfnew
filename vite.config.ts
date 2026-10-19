import { defineConfig } from 'vite';

// Separate site and film entries, with shared asset metadata extracted by Vite.
// Drawings stay external and load only when each experience requests them.
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
    cssCodeSplit: true,
    modulePreload: false,
    rollupOptions: { input: { site: 'index.html', film: 'film.html' } },
  },
});
