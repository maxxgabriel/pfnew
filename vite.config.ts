import { defineConfig } from 'vite';

// One JS bundle, no code-splitting. The drawings and paintings are separate
// files loaded in the order the film needs them (src/sketch/load.ts); set
// SINGLE=1 to inline everything into one self-contained HTML file instead.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: process.env.SINGLE ? 100_000_000 : 0,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
