import { defineConfig } from 'vite';

export default defineConfig({
  base: '/looking-glass/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
