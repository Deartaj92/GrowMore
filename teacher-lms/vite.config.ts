import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for Electron and local static folder support
  server: {
    port: 3002,
    open: false,
  },
  build: {
    outDir: '../public/teacher-portal',
    emptyOutDir: true,
  },
});
