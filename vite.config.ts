import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Trois pages : Falcon 9 (index.html), Starship (starship.html) et les planètes (planetes.html).
      input: {
        falcon9: 'index.html',
        starship: 'starship.html',
        planetes: 'planetes.html',
      },
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          postprocessing: ['postprocessing', '@react-three/postprocessing'],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
