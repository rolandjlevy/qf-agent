import { defineConfig, transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';

// This project keeps JSX in plain .js files (Next.js convention, no .jsx
// extension). Vite 8's built-in oxc transform only auto-detects JSX by
// extension (.jsx/.tsx), and its top-level `oxc` config option can't
// override that per-file — the fix is a "pre" plugin that runs
// transformWithOxc itself with `lang: 'jsx'` before Vite's own oxc plugin
// ever sees the raw JSX.
function jsxInJsFiles() {
  return {
    name: 'jsx-in-js-files',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.endsWith('.js')) return null;
      return transformWithOxc(code, id, { lang: 'jsx' });
    },
  };
}

export default defineConfig({
  plugins: [react(), jsxInJsFiles()],
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./vitest.setup.js'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
