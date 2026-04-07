import React from 'react'
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
  addUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => AppUser
  updateUser: (id: string, updates: Partial<AppUser>) => void
  removeUser: (id: string) => void
  addRegistrationAlert: (alert: Omit<RegistrationAlert, 'id' | 'read' | 'createdAt'>) => void
  markAlertRead: (id: string) => void
  clearAllAlerts: () => void
  removeRegistrationAlert: (email: string) => void
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void
}

const SETTINGS_KEY = 'app_settings_v3'

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as SettingsState
      return { ...parsed, auditTrail: parsed.auditTrail || [] }
    }
  } catch { /* ignore */ }
  return {
    superAgentName: 'Super Agent',
    users: [
      { id: 'seed-admin-1', name: 'REAGAN ROBERT KAIJAGE', email: 'rkaijage@gmail.com', role: 'Admin', password: '@Eva0191!', createdAt: new Date().toISOString() },
      { id: 'seed-admin-2', name: 'Test Account', email: 'admin@example.com', role: 'Test', password: 'admin', createdAt: new Date().toISOString() },
    ],
    registrationAlerts: [],
    auditTrail: [],
  }
}

function saveSettings(s: SettingsState) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

const SettingsContext = React.createContext<SettingsContextValue | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<SettingsState>(loadSettings)

  // Sync from Supabase on mount
  React.useEffect(() => {
    async function syncFromSupabase() {
      try {
        // Fetch alerts from Supabase
        const { data: alerts } = await supabase.from('registration_alerts').select('*').order('created_at', { ascending: false }).limit(50)
        if (alerts && alerts.length > 0) {
          const syncedAlerts: RegistrationAlert[] = alerts.map(a => ({
            id: a.id,
            type: a.type,
            name: a.name,
            email: a.email,
            tier: a.tier,
            message: a.message,
            read: a.is_read,
            createdAt: a.created_at,
          }))
          // Merge with localStorage alerts (local first, then add new from Supabase)
          const localAlerts = state.registrationAlerts
          const merged = [...localAlerts]
          for (const alert of syncedAlerts) {
            if (!merged.find(a => a.id === alert.id)) {
              merged.unshift(alert)
            }
          }
          setState(prev => ({ ...prev, registrationAlerts: merged }))
        }
      } catch (e) {
        console.error('Failed to sync from Supabase:', e)
      }
    }
    syncFromSupabase()
  }, [])

  const setSuperAgentName = React.useCallback((name: string) => {
    setState(prev => {
      const next = { ...prev, superAgentName: name }
      saveSettings(next)
      return next
    })
  }, [])

  const addUser = React.useCallback((user: Omit<AppUser, 'id' | 'createdAt'>) => {
    const newUser: AppUser = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    setState(prev => {
      const next = { ...prev, users: [...prev.users, newUser] }
      saveSettings(next)
      return next
    })
    return newUser
  }, [])

  const updateUser = React.useCallback((id: string, updates: Partial<AppUser>) => {
    setState(prev => {
      const next = {
        ...prev,
        users: prev.users.map(u => u.id === id ? { ...u, ...updates } : u),
      }
      saveSettings(next)
      return next
    })
  }, [])

  const removeUser = React.useCallback((id: string) => {
    setState(prev => {
      const next = { ...prev, users: prev.users.filter(u => u.id !== id) }
      saveSettings(next)
      return next
    })
  }, [])

  const addRegistrationAlert = React.useCallback((alert: Omit<RegistrationAlert, 'id' | 'read' | 'createdAt'>) => {
    const newAlert: RegistrationAlert = {
      ...alert,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
    }
    setState(prev => {
      const next = { ...prev, registrationAlerts: [newAlert, ...prev.registrationAlerts] }
      saveSettings(next)
      return next
    })
    return newAlert
  }, [])

  const markAlertRead = React.useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        registrationAlerts: prev.registrationAlerts.map(a => a.id === id ? { ...a, read: true } : a),
      }
      saveSettings(next)
      return next
    })
  }, [])

  const clearAllAlerts = React.useCallback(() => {
    setState(prev => {
      const next = { ...prev, registrationAlerts: [] }
      saveSettings(next)
      return next
    })
  }, [])

  const removeRegistrationAlert = React.useCallback((email: string) => {
    setState(prev => {
      const next = { ...prev, registrationAlerts: prev.registrationAlerts.filter(a => a.email !== email) }
      saveSettings(next)
      return next
    })
  }, [])

  const addAuditEntry = React.useCallback((entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    setState(prev => {
      const next = { ...prev, auditTrail: [newEntry, ...prev.auditTrail] }
      saveSettings(next)
      return next
    })
    return newEntry
  }, [])

  const value = React.useMemo(() => ({
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
  }), [state, setSuperAgentName, addUser, updateUser, removeUser, addRegistrationAlert, markAlertRead, clearAllAlerts, removeRegistrationAlert, addAuditEntry])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = (): SettingsContextValue => {
  const ctx = React.useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export default SettingsContext
