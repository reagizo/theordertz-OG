import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: './',
  resolve: {
    alias: [
      { find: '@tanstack/react-start', replacement: path.resolve(__dirname, './src/capacitor-polyfills/tanstack-start.ts') },
      { find: '@/server/db.functions', replacement: path.resolve(__dirname, './src/capacitor-polyfills/db.functions.ts') },
      { find: '@/server/db.server', replacement: path.resolve(__dirname, './src/capacitor-polyfills/db.server.ts') },
      { find: '@/server/localStore', replacement: path.resolve(__dirname, './src/capacitor-polyfills/localStore.ts') },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, './src/$1') },
    ],
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist/capacitor',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
})
