import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_KEY!

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

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
// Only create this client on the server, and fail fast if the service key is missing.
export const supabaseAdmin =
  typeof window === 'undefined' && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : undefined

// Admin helper: get admin client or throw if not configured
export function getSupabaseAdminOrThrow(): any {
  if (supabaseAdmin) {
    return supabaseAdmin
  }
  throw new Error('Supabase admin client is not configured. Service Role key is missing. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) in your environment.')
}

export type Database = {
  public: {
    Tables: {
      agent_profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          national_id: string | null
          address: string | null
          business_name: string | null
          status: string
          created_at: string
          updated_at: string
          float_balance: number
          commission_rate: number
          commission_earned: number
          is_test_account: boolean
          admin_requested_by: string | null
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone?: string | null
          national_id?: string | null
          address?: string | null
          business_name?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          float_balance?: number
          commission_rate?: number
          commission_earned?: number
          is_test_account?: boolean
          admin_requested_by?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string | null
          national_id?: string | null
          address?: string | null
          business_name?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          float_balance?: number
          commission_rate?: number
          commission_earned?: number
          is_test_account?: boolean
          admin_requested_by?: string | null
        }
      }
      customer_profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          national_id: string | null
          address: string | null
          tier: string
          status: string
          created_at: string
          updated_at: string
          wallet_balance: number
          credit_limit: number
          credit_used: number
          assigned_agent_id: string | null
          is_test_account: boolean
          admin_requested_by: string | null
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone?: string | null
          national_id?: string | null
          address?: string | null
          tier?: string
          status?: string
          created_at?: string
          updated_at?: string
          wallet_balance?: number
          credit_limit?: number
          credit_used?: number
          assigned_agent_id?: string | null
          is_test_account?: boolean
          admin_requested_by?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string | null
          national_id?: string | null
          address?: string | null
          tier?: string
          status?: string
          created_at?: string
          updated_at?: string
          wallet_balance?: number
          credit_limit?: number
          credit_used?: number
          assigned_agent_id?: string | null
          is_test_account?: boolean
          admin_requested_by?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          agent_id: string | null
          customer_id: string | null
          customer_tier: string
          amount: number
          provider: string
          status: string
          is_on_credit: boolean
          created_at: string
          updated_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          agent_id?: string | null
          customer_id?: string | null
          customer_tier?: string
          amount: number
          provider: string
          status?: string
          is_on_credit?: boolean
          created_at?: string
          updated_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          agent_id?: string | null
          customer_id?: string | null
          customer_tier?: string
          amount?: number
          provider?: string
          status?: string
          is_on_credit?: boolean
          created_at?: string
          updated_at?: string
          notes?: string | null
        }
      }
      float_requests: {
        Row: {
          id: string
          agent_id: string | null
          amount: number
          status: string
          created_at: string
          updated_at: string
          notes: string | null
          is_test_account: boolean
        }
        Insert: {
          id?: string
          agent_id?: string | null
          amount: number
          status?: string
          created_at?: string
          updated_at?: string
          notes?: string | null
          is_test_account?: boolean
        }
        Update: {
          id?: string
          agent_id?: string | null
          amount?: number
          status?: string
          created_at?: string
          updated_at?: string
          notes?: string | null
          is_test_account?: boolean
        }
      }
      float_exchanges: {
        Row: {
          id: string
          agent_id: string | null
          amount: number
          status: string
          created_at: string
          updated_at: string
          notes: string | null
          is_test_account: boolean
        }
        Insert: {
          id?: string
          agent_id?: string | null
          amount: number
          status?: string
          created_at?: string
          updated_at?: string
          notes?: string | null
          is_test_account?: boolean
        }
        Update: {
          id?: string
          agent_id?: string | null
          amount?: number
          status?: string
          created_at?: string
          updated_at?: string
          notes?: string | null
          is_test_account?: boolean
        }
      }
      app_settings: {
        Row: {
          id: string
          key: string
          value: unknown
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: unknown
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: unknown
          created_at?: string
          updated_at?: string
        }
      }
      app_users: {
        Row: {
          id: string
          name: string
          email: string
          role: string
          profile_picture: string | null
          password: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role?: string
          profile_picture?: string | null
          password?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: string
          profile_picture?: string | null
          password?: string | null
          created_at?: string
        }
      }
      registration_alerts: {
        Row: {
          id: string
          type: string
          name: string
          email: string
          tier: string | null
          message: string
          is_read: boolean
          created_at: string
          is_test_account: boolean
          admin_requested_by: string | null
        }
        Insert: {
          id?: string
          type: string
          name: string
          email: string
          tier?: string | null
          message: string
          is_read?: boolean
          created_at?: string
          is_test_account?: boolean
          admin_requested_by?: string | null
        }
        Update: {
          id?: string
          type?: string
          name?: string
          email?: string
          tier?: string | null
          message?: string
          is_read?: boolean
          created_at?: string
          is_test_account?: boolean
          admin_requested_by?: string | null
        }
      }
    }
  }
}
