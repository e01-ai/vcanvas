import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: process.env.VCANVAS_BASE || '/',
  build: {
    outDir: 'dist',
  },
})
