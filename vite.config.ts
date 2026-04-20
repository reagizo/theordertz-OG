import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import path from 'path'

// import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Embed Supabase credentials for Capacitor/mobile builds
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://dlgtwwknvlncprphejaj.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZ3R3d2tudmxuY3BycGhlamFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTE1NzQsImV4cCI6MjA5MDgyNzU3NH0.gWTpSQb6zLYO_Ox3YQEA3qCkuRKaJpMtXjxYF6mpy04'),
    'import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZ3R3d2tudmxuY3BycGhlamFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI1MTU3NCwiZXhwIjoyMDkwODI3NTc0fQ.076NYiAofmB6E7gFthmmskllLt44V2pkDMtmnb_K7Tw'),
  },
  plugins: [
    tanstackStart(),
    react(),
    tailwindcss(),
    // cloudflare({
    //   viteEnvironment: {
    //     name: "ssr"
    //   }
    // })
  ],
})