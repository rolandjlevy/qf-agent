import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    exclude: ['node_modules/**', '.next/**'],
  },
});
