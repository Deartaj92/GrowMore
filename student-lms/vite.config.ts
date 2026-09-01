import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for Electron support
  server: {
    port: 3001,
    open: true,
  },
  build: {
    outDir: '../public/student-portal',
    emptyOutDir: true,
  }
})
