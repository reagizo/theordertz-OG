import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, hasSupabaseConfig } from '@/lib/supabase'
import { resolveAccessByEmailFn } from '@/server/db.functions'
import {
  getCurrentUser as getLocalCurrentUser,
  login as localLogin,
  logout as localLogout,
  signup as localSignup,
} from '@/lib/auth'

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
  roleLoading: boolean
  role: string
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string, meta: Record<string, unknown>) => Promise<UserLike>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  roleLoading: false,
  role: 'guest',
  login: async () => {},
  logout: async () => {},
  signup: async () => { throw new Error('Not initialized') },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserLike | null>(null)
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)
  const roleLoadingRef = useRef(roleLoading)
  roleLoadingRef.current = roleLoading

  const hydrateRole = useCallback(async (nextUser: UserLike | null) => {
    if (!nextUser?.email || !hasSupabaseConfig) {
      setUser(nextUser)
      return
    }

    const existingRole = nextUser.app_metadata?.roles?.[0]
    if (existingRole && existingRole !== 'guest') {
      setUser(nextUser)
      return
    }

    setRoleLoading(true)
    try {
      const access = await resolveAccessByEmailFn({ data: { email: nextUser.email } })
      const resolvedRole = access?.role && access.role !== 'guest' ? access.role : undefined
      if (!resolvedRole) {
        setUser(nextUser)
        return
      }
      setUser({
        ...nextUser,
        app_metadata: {
          ...(nextUser.app_metadata ?? {}),
          roles: [resolvedRole],
        },
      })
    } catch {
      setUser(nextUser)
    } finally {
      setRoleLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!hasSupabaseConfig) {
      setUser(getLocalCurrentUser())
      setLoading(false)
      return
    }

    // Get initial session
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('Supabase session error:', error.message)
        }
        if (data?.session?.user) {
          await hydrateRole(data.session.user)
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Failed to initialize auth session:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    void initSession()

    // Listen for auth changes
    let subscription: any = null
    try {
      const result = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session?.user) {
            void hydrateRole(session.user)
          } else {
            setUser(null)
          }
        }
      )
      subscription = result.data?.subscription
    } catch (err) {
      console.warn('Failed to set up auth state change listener:', err)
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [hydrateRole])

  const login = useCallback(async (email: string, password: string) => {
    if (!hasSupabaseConfig) {
      const user = await localLogin(email, password)
      setUser(user)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      if (data?.session?.user) {
        await hydrateRole(data.session.user)
      }

      // Wait for role resolution to complete before returning
      await new Promise<void>((resolve) => {
        const check = () => {
          if (!roleLoadingRef.current) resolve()
          else setTimeout(check, 50)
        }
        check()
      })
    } finally {
      setLoading(false)
    }
  }, [hydrateRole])

  const logout = useCallback(async () => {
    if (!hasSupabaseConfig) {
      localLogout()
      setUser(null)
      return
    }

    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const signup = useCallback(async (email: string, password: string, meta: Record<string, unknown>) => {
    if (!hasSupabaseConfig) {
      return await localSignup(email, password, meta)
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: meta?.name || '',
          ...meta
        }
      }
    })
    if (error) throw error
    return data.user
  }, [])

  const role = user?.app_metadata?.roles?.[0] ?? 'guest'

  return (
    <AuthContext.Provider value={{ user, loading, roleLoading, role, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
