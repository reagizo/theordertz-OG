/// <reference types="vite/client" />

/** Inlined at build time via vite.config.ts `define` (browser + SSR). */
declare namespace NodeJS {
  interface ProcessEnv {
    readonly SUPABASE_URL: string
    readonly SUPABASE_KEY: string
    readonly SUPABASE_SERVICE_ROLE_KEY: string
    readonly SUPABASE_SERVICE_KEY: string
  }
}
