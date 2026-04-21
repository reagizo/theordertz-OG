import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// Define User type inline to prevent module loading
interface User {
  id: string
  email: string
  name?: string
  app_metadata?: { roles?: string[] }
  user_metadata?: { full_name?: string; profilePicture?: string }
}

// Lazy load Supabase auth functions only in browser context
let authLogin: any = null
let authLogout: any = null
let authSignup: any = null
let authGetCurrentUser: any = null

async function loadAuthFunctions() {
  if (typeof window === 'undefined') return false
  
  try {
    const authModule = await import('@/lib/auth')
    authLogin = authModule.login
    authLogout = authModule.logout
    authSignup = authModule.signup
    authGetCurrentUser = authModule.getCurrentUser
    return true
  } catch (error) {
    console.error('Failed to load auth functions:', error)
    return false
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  role: string
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  signup: (email: string, password: string, meta: Record<string, unknown>) => Promise<User>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: 'guest',
  login: async () => ({ id: '', email: '', name: '', app_metadata: { roles: ['guest'] } }),
  logout: async () => {},
  signup: async () => { throw new Error('Not initialized') },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load auth functions and check current user
    loadAuthFunctions().then(async (loaded) => {
      if (loaded && authGetCurrentUser) {
        const currentUser = await authGetCurrentUser()
        setUser(currentUser)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    if (!authLogin) {
      await loadAuthFunctions()
      if (!authLogin) {
        throw new Error('Auth functions not loaded')
      }
    }
    const user = await authLogin(email, password)
    setUser(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    if (!authLogout) {
      await loadAuthFunctions()
      if (!authLogout) {
        throw new Error('Auth functions not loaded')
      }
    }
    await authLogout()
    setUser(null)
  }, [])

  const signup = useCallback(async (email: string, password: string, meta: Record<string, unknown>) => {
    if (!authSignup) {
      await loadAuthFunctions()
      if (!authSignup) {
        throw new Error('Auth functions not loaded')
      }
    }
    const user = await authSignup(email, password, meta)
    setUser(user)
    return user
  }, [])

  const role = user?.app_metadata?.roles?.[0] ?? 'guest'

  return (
    <AuthContext.Provider value={{ user, loading, role, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}