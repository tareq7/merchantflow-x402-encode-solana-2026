import { defineConfig } from 'vite';
export default defineConfig({
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] }
});
