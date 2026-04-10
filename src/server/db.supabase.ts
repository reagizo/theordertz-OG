import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/lib/supabase'

// Test Accounts Functions
export const syncTestAccountToSupabase = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; email: string; role: string; profilePicture?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { error } = await supabaseAdmin
        .from('test_accounts')
        .upsert({ name: data.name, email: data.email, role: data.role, profile_picture: data.profilePicture }, { onConflict: 'email' })
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Failed to sync test account to Supabase:', error)
      return { success: false, error: String(error) }
    }
  })

export const getTestAccountsFromSupabase = createServerFn({ method: 'GET' })
  .handler(async () => {
    try {
      const { data, error } = await supabaseAdmin.from('test_accounts').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Failed to get test accounts from Supabase:', error)
      return { success: false, error: String(error), data: [] }
    }
  })

// Real Accounts Functions
export const syncRealAccountToSupabase = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; email: string; role: string; profilePicture?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { error } = await supabaseAdmin
        .from('real_accounts')
        .upsert({ name: data.name, email: data.email, role: data.role, profile_picture: data.profilePicture }, { onConflict: 'email' })
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Failed to sync real account to Supabase:', error)
      return { success: false, error: String(error) }
    }
  })

export const getRealAccountsFromSupabase = createServerFn({ method: 'GET' })
  .handler(async () => {
    try {
      const { data, error } = await supabaseAdmin.from('real_accounts').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Failed to get real accounts from Supabase:', error)
      return { success: false, error: String(error), data: [] }
    }
  })

// Registration Alerts Functions
export const syncRegistrationAlertToSupabase = createServerFn({ method: 'POST' })
  .inputValidator((data: { type: string; name: string; email: string; tier?: string; message: string; is_test_account: boolean }) => data)
  .handler(async ({ data }) => {
    try {
      const { error } = await supabaseAdmin.from('registration_alerts').insert(data)
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Failed to sync registration alert to Supabase:', error)
      return { success: false, error: String(error) }
    }
  })

export const getRegistrationAlertsFromSupabase = createServerFn({ method: 'GET' })
  .handler(async () => {
    try {
      const { data, error } = await supabaseAdmin.from('registration_alerts').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Failed to get registration alerts from Supabase:', error)
      return { success: false, error: String(error), data: [] }
    }
  })

export const markAlertReadInSupabase = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { error } = await supabaseAdmin.from('registration_alerts').update({ read: true }).eq('id', data.id)
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Failed to mark alert as read in Supabase:', error)
      return { success: false, error: String(error) }
    }
  })

export const clearAllAlertsInSupabase = createServerFn({ method: 'POST' })
  .handler(async () => {
    try {
      const { error } = await supabaseAdmin.from('registration_alerts').delete().eq('read', true)
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Failed to clear alerts in Supabase:', error)
      return { success: false, error: String(error) }
    }
  })