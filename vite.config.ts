import { defineConfig } from 'vite';

// One bundle, no code-splitting: the build is also inlined into a single
// self-contained HTML file by scripts/inline.mjs.
export default defineConfig({
  build: {
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
