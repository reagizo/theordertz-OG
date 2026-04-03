import React from 'react'

export type UserRole = 'Admin' | 'Supervisor' | 'Clerk' | 'Agent' | 'Customer' | 'Test'
export type CustomerTier = 'd2d' | 'premier'

export type AppUser = {
  id: string
  name: string
  email: string
  role: UserRole
  profilePicture?: string
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
}

type SettingsState = {
  superAgentName: string
  users: AppUser[]
  registrationAlerts: RegistrationAlert[]
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
}

const SETTINGS_KEY = 'app_settings_v3'

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw) as SettingsState
  } catch { /* ignore */ }
  return {
    superAgentName: 'Super Agent',
    users: [
      { id: 'seed-admin', name: 'Admin User', email: 'admin@example.com', role: 'Admin', createdAt: new Date().toISOString() },
    ],
    registrationAlerts: [],
  }
}

function saveSettings(s: SettingsState) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

const SettingsContext = React.createContext<SettingsContextValue | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<SettingsState>(loadSettings)

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

  const value = React.useMemo(() => ({
    settings: state,
    setSuperAgentName,
    addUser,
    updateUser,
    removeUser,
    addRegistrationAlert,
    markAlertRead,
    clearAllAlerts,
  }), [state, setSuperAgentName, addUser, updateUser, removeUser, addRegistrationAlert, markAlertRead, clearAllAlerts])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = (): SettingsContextValue => {
  const ctx = React.useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export default SettingsContext
