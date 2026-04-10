import React from 'react'

export type UserRole = 'Admin' | 'Supervisor' | 'Clerk' | 'Agent' | 'Customer' | 'Test' | 'SuperAgent'
export type CustomerTier = 'd2d' | 'premier'

export type AppUser = {
  id: string
  name: string
  email: string
  role: UserRole
  profilePicture?: string
  password?: string
  createdAt: string
  isTestAccount?: boolean
}

export type RegistrationAlert = {
  id: string
  type: 'agent' | 'customer' | 'super_agent'
  name: string
  email: string
  tier?: CustomerTier
  message: string
  read: boolean
  createdAt: string
  isTestAccount?: boolean
}

export type PasswordResetItem = {
  id: string
  email: string
  newPassword: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  processedAt?: string
  processedBy?: string
}

type SettingsState = {
  superAgentName: string
  users: AppUser[]
  registrationAlerts: RegistrationAlert[]
  testAccounts: AppUser[]
  realAccounts: AppUser[]
  passwordResets: PasswordResetItem[]
}

export const TEST_ADMIN_EMAIL = 'admin@example.com'
export const REAL_ADMIN_EMAIL = 'rkaijage@gmail.com'

export function isTestAccountByNameOrEmail(name: string, email: string): boolean {
  const nameLower = name.toLowerCase()
  const emailLower = email.toLowerCase()
  return nameLower.startsWith('test-') || emailLower.startsWith('test-')
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
  addTestAccount: (user: Omit<AppUser, 'id' | 'createdAt' | 'isTestAccount'>) => void
  addRealAccount: (user: Omit<AppUser, 'id' | 'createdAt' | 'isTestAccount'>) => void
  addPasswordReset: (reset: Omit<PasswordResetItem, 'id' | 'requestedAt' | 'status'>) => void
  approvePasswordReset: (id: string) => void
  rejectPasswordReset: (id: string) => void
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
      { id: 'seed-admin-1', name: 'REAGAN ROBERT KAIJAGE', email: 'rkaijage@gmail.com', role: 'Admin', password: '@Eva0191!', createdAt: new Date().toISOString(), isTestAccount: false },
      { id: 'seed-admin-2', name: 'Owner - Administrator', email: 'admin@example.com', role: 'Admin', password: 'admin', createdAt: new Date().toISOString(), isTestAccount: true },
    ],
    registrationAlerts: [],
    testAccounts: [],
    realAccounts: [],
    passwordResets: [],
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

  const addTestAccount = React.useCallback((user: Omit<AppUser, 'id' | 'createdAt' | 'isTestAccount'>) => {
    const newUser: AppUser = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      isTestAccount: true,
    }
    setState(prev => {
      const next = { ...prev, testAccounts: [...prev.testAccounts, newUser] }
      saveSettings(next)
      return next
    })
    return newUser
  }, [])

  const addRealAccount = React.useCallback((user: Omit<AppUser, 'id' | 'createdAt' | 'isTestAccount'>) => {
    const newUser: AppUser = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      isTestAccount: false,
    }
    setState(prev => {
      const next = { ...prev, realAccounts: [...prev.realAccounts, newUser] }
      saveSettings(next)
      return next
    })
    return newUser
  }, [])

  const addPasswordReset = React.useCallback((reset: Omit<PasswordResetItem, 'id' | 'requestedAt' | 'status'>) => {
    const newReset: PasswordResetItem = {
      ...reset,
      id: crypto.randomUUID(),
      status: 'pending',
      requestedAt: new Date().toISOString(),
    }
    setState(prev => {
      const next = { ...prev, passwordResets: [...prev.passwordResets, newReset] }
      saveSettings(next)
      return next
    })
    return newReset
  }, [])

  const approvePasswordReset = React.useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        passwordResets: prev.passwordResets.map(r => 
          r.id === id ? { ...r, status: 'approved' as const, processedAt: new Date().toISOString() } : r
        ),
      }
      saveSettings(next)
      return next
    })
  }, [])

  const rejectPasswordReset = React.useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        passwordResets: prev.passwordResets.map(r => 
          r.id === id ? { ...r, status: 'rejected' as const, processedAt: new Date().toISOString() } : r
        ),
      }
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
    addTestAccount,
    addRealAccount,
    addPasswordReset,
    approvePasswordReset,
    rejectPasswordReset,
  }), [state, setSuperAgentName, addUser, updateUser, removeUser, addRegistrationAlert, markAlertRead, clearAllAlerts, addTestAccount, addRealAccount, addPasswordReset, approvePasswordReset, rejectPasswordReset])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = (): SettingsContextValue => {
  const ctx = React.useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export default SettingsContext
