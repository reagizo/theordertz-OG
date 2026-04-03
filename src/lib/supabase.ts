import { createClient } from '@supabase/supabase-js'

// Fallback to empty string to prevent crash if env vars are missing
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Safe storage for server-side (prevents localStorage crash)
const serverStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

// Client for Browser (uses Anon Key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window === 'undefined' ? serverStorage : localStorage,
    autoRefreshToken: typeof window !== 'undefined',
    persistSession: typeof window !== 'undefined',
    detectSessionInUrl: typeof window !== 'undefined',
  },
})

// Admin for Server Functions (uses Service Role Key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})