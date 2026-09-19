import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, '../client/public'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..'),
    },
  },
  server: {
    port: 3200,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../dist/map-authoring'),
    emptyOutDir: true,
  },
});
