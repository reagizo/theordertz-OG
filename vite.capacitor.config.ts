import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

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
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'generate-index-html',
      writeBundle() {
        const outDir = path.resolve(__dirname, 'dist/capacitor')
        const indexPath = path.join(outDir, 'index.html')
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>The Order – Service Interface Portal System</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/main-dwFpp9jE.js"></script>
</body>
</html>`
        fs.writeFileSync(indexPath, htmlContent)
      }
    }
  ],
  build: {
    outDir: 'dist/capacitor',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/entry-client.tsx'),
      },
    },
  },
})
