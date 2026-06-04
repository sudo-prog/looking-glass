import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/looking-glass/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  plugins: [react()],
});
