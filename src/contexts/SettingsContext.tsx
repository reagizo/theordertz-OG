import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type UserRole = 'Admin' | 'Supervisor' | 'Clerk' | 'Agent' | 'Customer' | 'Test'
export type CustomerTier = 'd2d' | 'premier'

export type AppUser = {
  id: string
  name: string
  email: string
  role: UserRole
  profilePicture?: string
  password?: string
  createdAt: string
}

export type RegistrationAlert = {
  id: string
  type: 'agent' | 'customer'
  name: string
  email: string
  tier?: CustomerTier
  message: string
  read: boolean
  createdAt: string
  isTestAccount?: boolean
  adminRequestedBy?: string
}

export type AuditEntry = {
  id: string
  timestamp: string
  action: string
  entityType: 'Agent' | 'Customer' | 'Transaction' | 'Float Request'
  entityName: string
  details: string
  actor: string
}

type SettingsState = {
  superAgentName: string
  users: AppUser[]
  registrationAlerts: RegistrationAlert[]
  auditTrail: AuditEntry[]
}

type SettingsContextValue = {
  settings: SettingsState
  setSuperAgentName: (name: string) => void
  addUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => Promise<AppUser>
  updateUser: (id: string, updates: Partial<AppUser>) => Promise<void>
  removeUser: (id: string) => Promise<void>
  addRegistrationAlert: (alert: Omit<RegistrationAlert, 'id' | 'read' | 'createdAt'>) => Promise<RegistrationAlert>
  markAlertRead: (id: string) => Promise<void>
  clearAllAlerts: () => Promise<void>
  removeRegistrationAlert: (email: string) => Promise<void>
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => Promise<AuditEntry>
  refresh: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SettingsState>({
    superAgentName: 'Super Agent',
    users: [],
    registrationAlerts: [],
    auditTrail: [],
  })

  const loadFromSupabase = useCallback(async () => {
    try {
      const [settingRes, usersRes, alertsRes, auditRes] = await Promise.all([
        supabase.from('app_settings').select('value').eq('key', 'super_agent_name').single(),
        supabase.from('app_users').select('*').order('created_at', { ascending: false }),
        supabase.from('registration_alerts').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('audit_trail').select('*').order('created_at', { ascending: false }).limit(200),
      ])

      const users: AppUser[] = (usersRes.data || []).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        profilePicture: u.profile_picture,
        password: u.password,
        createdAt: u.created_at,
      }))

      const alerts: RegistrationAlert[] = (alertsRes.data || []).map(a => ({
        id: a.id,
        type: a.type,
        name: a.name,
        email: a.email,
        tier: a.tier,
        message: a.message,
        read: a.is_read,
        createdAt: a.created_at,
        isTestAccount: a.is_test_account,
        adminRequestedBy: a.admin_requested_by,
      }))

      const auditTrail: AuditEntry[] = (auditRes.data || []).map(a => ({
        id: a.id,
        timestamp: a.created_at,
        action: a.action,
        entityType: a.entity_type,
        entityName: a.entity_name,
        details: a.details,
        actor: a.actor,
      }))

      setState({
        superAgentName: settingRes.data?.value || 'Super Agent',
        users,
        registrationAlerts: alerts,
        auditTrail,
      })
    } catch (e) {
      console.error('Failed to load settings from Supabase:', e)
    }
  }, [])

  useEffect(() => { loadFromSupabase() }, [loadFromSupabase])

  const refresh = useCallback(async () => { await loadFromSupabase() }, [loadFromSupabase])

  const setSuperAgentName = useCallback(async (name: string) => {
    try {
      await supabase.from('app_settings').upsert({
        key: 'super_agent_name',
        value: name,
        updated_at: new Date().toISOString(),
      })
      setState(prev => ({ ...prev, superAgentName: name }))
    } catch (e) {
      console.error('Failed to update super agent name:', e)
    }
  }, [])

  const addUser = useCallback(async (user: Omit<AppUser, 'id' | 'createdAt'>) => {
    const newUser: AppUser = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    try {
      await supabase.from('app_users').insert({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profile_picture: newUser.profilePicture || null,
        password: newUser.password || null,
        created_at: newUser.createdAt,
      })
      setState(prev => ({ ...prev, users: [newUser, ...prev.users] }))
    } catch (e) {
      console.error('Failed to add user:', e)
    }
    return newUser
  }, [])

  const updateUser = useCallback(async (id: string, updates: Partial<AppUser>) => {
    try {
      const updateData: any = { updated_at: new Date().toISOString() }
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.email !== undefined) updateData.email = updates.email
      if (updates.role !== undefined) updateData.role = updates.role
      if (updates.profilePicture !== undefined) updateData.profile_picture = updates.profilePicture
      if (updates.password !== undefined) updateData.password = updates.password

      await supabase.from('app_users').update(updateData).eq('id', id)
      setState(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === id ? { ...u, ...updates } : u),
      }))
    } catch (e) {
      console.error('Failed to update user:', e)
    }
  }, [])

  const removeUser = useCallback(async (id: string) => {
    try {
      await supabase.from('app_users').delete().eq('id', id)
      setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }))
    } catch (e) {
      console.error('Failed to remove user:', e)
    }
  }, [])

  const addRegistrationAlert = useCallback(async (alert: Omit<RegistrationAlert, 'id' | 'read' | 'createdAt'>) => {
    const newAlert: RegistrationAlert = {
      ...alert,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
    }
    try {
      await supabase.from('registration_alerts').insert({
        id: newAlert.id,
        type: newAlert.type,
        name: newAlert.name,
        email: newAlert.email,
        tier: newAlert.tier || null,
        message: newAlert.message,
        is_read: false,
        created_at: newAlert.createdAt,
        is_test_account: newAlert.isTestAccount || false,
        admin_requested_by: newAlert.adminRequestedBy || null,
      })
      setState(prev => ({ ...prev, registrationAlerts: [newAlert, ...prev.registrationAlerts] }))
    } catch (e) {
      console.error('Failed to add registration alert:', e)
    }
    return newAlert
  }, [])

  const markAlertRead = useCallback(async (id: string) => {
    try {
      await supabase.from('registration_alerts').update({ is_read: true }).eq('id', id)
      setState(prev => ({
        ...prev,
        registrationAlerts: prev.registrationAlerts.map(a => a.id === id ? { ...a, read: true } : a),
      }))
    } catch (e) {
      console.error('Failed to mark alert read:', e)
    }
  }, [])

  const clearAllAlerts = useCallback(async () => {
    try {
      await supabase.from('registration_alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      setState(prev => ({ ...prev, registrationAlerts: [] }))
    } catch (e) {
      console.error('Failed to clear alerts:', e)
    }
  }, [])

  const removeRegistrationAlert = useCallback(async (email: string) => {
    try {
      await supabase.from('registration_alerts').delete().eq('email', email)
      setState(prev => ({
        ...prev,
        registrationAlerts: prev.registrationAlerts.filter(a => a.email !== email),
      }))
    } catch (e) {
      console.error('Failed to remove registration alert:', e)
    }
  }, [])

  const addAuditEntry = useCallback(async (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    try {
      await supabase.from('audit_trail').insert({
        id: newEntry.id,
        action: newEntry.action,
        entity_type: newEntry.entityType,
        entity_name: newEntry.entityName,
        details: newEntry.details,
        actor: newEntry.actor,
        created_at: newEntry.timestamp,
      })
      setState(prev => ({ ...prev, auditTrail: [newEntry, ...prev.auditTrail] }))
    } catch (e) {
      console.error('Failed to add audit entry:', e)
    }
    return newEntry
  }, [])

  const value = useMemo(() => ({
    settings: state,
    setSuperAgentName,
    addUser,
    updateUser,
    removeUser,
    addRegistrationAlert,
    markAlertRead,
    clearAllAlerts,
    removeRegistrationAlert,
    addAuditEntry,
    refresh,
  }), [state, setSuperAgentName, addUser, updateUser, removeUser, addRegistrationAlert, markAlertRead, clearAllAlerts, removeRegistrationAlert, addAuditEntry, refresh])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = (): SettingsContextValue => {
  const ctx = React.useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export default SettingsContext
