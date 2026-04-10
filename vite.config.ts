import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl =
    env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''
  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_KEY ||
    ''
  // Conditionally enable Cloudflare integration only when explicitly requested.
  // Some build environments (like CI) may not have a valid Wrangler config yet,
  // which would cause the build to fail. Gate the plugin behind CLOUDFLARE env flag.
  const useCloudflare = (env.CLOUDFLARE ?? 'false') === 'true'
  
  // Only include cloudflare plugin if explicitly requested - it will validate 
  // wrangler config during build which requires dist to exist
  const cloudflarePlugin = useCloudflare ? [cloudflare()] : []
  
  return {
  // GitHub Pages serves from a subpath, so use relative base
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
    'process.env.SUPABASE_KEY': JSON.stringify(supabaseAnonKey),
    'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(
      env.SUPABASE_SERVICE_ROLE_KEY || '',
    ),
    'process.env.SUPABASE_SERVICE_KEY': JSON.stringify(
      env.SUPABASE_SERVICE_KEY || '',
    ),
    'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    'process.env.VITE_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(
      env.SUPABASE_SERVICE_ROLE_KEY || '',
    ),
  },
  plugins: [
    ...cloudflarePlugin,
    tanstackStart({
      ssr: true,
      routeTree: {
        generated: './src/routeTree.gen.ts',
        fileHeader: '',
      },
      disableAutoStyleInjection: true,
    }),
    react(),
    tailwindcss(),
    ...(mode === 'production'
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.png', 'logo.png', 'logo.svg'],
            manifest: {
              name: 'The Order-Reagizo Service Company',
              short_name: 'TheOrder',
              description: 'The Order-Reagizo Service Company - Interactive Service Platform',
              theme_color: '#111827',
              background_color: '#f9fafb',
              display: 'standalone',
              orientation: 'portrait',
              scope: '.',
              start_url: '.',
              icons: [
                {
                  src: '/icon-192.png',
                  sizes: '192x192',
                  type: 'image/png',
                  purpose: 'any'
                },
                {
                  src: '/icon-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any'
                },
                {
                  src: '/icon-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable'
                }
              ]
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,png,svg,ico,json}'],
              runtimeCaching: [
                {
                  urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'google-fonts-cache',
                    expiration: {
                      maxEntries: 10,
                      maxAgeSeconds: 60 * 60 * 24 * 365
                    },
                    cacheableResponse: {
                      statuses: [0, 200]
                    }
                  }
                }
              ]
            }
          })
        ]
      : []),
  ],
}
})
