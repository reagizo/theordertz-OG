import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as mockLogin, signup as mockSignup, getCurrentUser, setCurrentUser, logout as mockLogout } from '@/lib/auth'

interface UserLike {
  id: string
  email: string
  name?: string
  app_metadata?: { roles?: string[] }
  user_metadata?: { full_name?: string; profilePicture?: string }
}

interface AuthContextType {
  user: UserLike | null
  loading: boolean
  role: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string, meta: Record<string, unknown>) => Promise<UserLike>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  login: async () => {},
  logout: async () => {},
  signup: async () => { throw new Error('Not initialized') },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserLike | null>(null)
  const [loading, setLoading] = useState(true)
  // Local, Netlify-free initialization
  useEffect(() => {
    const u = getCurrentUser()
    if (u) {
      setUser(u as UserLike)
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await mockLogin(email, password)
    setUser(u as unknown as UserLike)
    setCurrentUser(u)
  }, [])

  const logout = useCallback(async () => {
    mockLogout()
    setUser(null)
  }, [])

  const signup = useCallback(async (email: string, password: string, meta: Record<string, unknown>) => {
    const u = await mockSignup(email, password, meta)
    setUser(u as unknown as UserLike)
    setCurrentUser(u)
    return u as unknown as UserLike
  }, [])

  const role = user?.app_metadata?.roles?.[0] ?? null

  return (
    <AuthContext.Provider value={{ user, loading, role, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
