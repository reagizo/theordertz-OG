import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resolveAccessByEmailFn } from '@/server/db.functions'

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
  role: string
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string, meta: Record<string, unknown>) => Promise<UserLike>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: 'guest',
  login: async () => {},
  logout: async () => {},
  signup: async () => { throw new Error('Not initialized') },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserLike | null>(null)
  const [loading, setLoading] = useState(true)

  const hydrateRole = useCallback(async (nextUser: UserLike | null) => {
    if (!nextUser?.email) {
      setUser(nextUser)
      return
    }

    const existingRole = nextUser.app_metadata?.roles?.[0]
    if (existingRole && existingRole !== 'guest') {
      setUser(nextUser)
      return
    }

    try {
      const access = await resolveAccessByEmailFn({ data: { email: nextUser.email } })
      const role = access?.role && access.role !== 'guest' ? access.role : undefined
      if (!role) {
        setUser(nextUser)
        return
      }
      setUser({
        ...nextUser,
        app_metadata: {
          ...(nextUser.app_metadata ?? {}),
          roles: [role],
        },
      })
    } catch {
      setUser(nextUser)
    }
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        void hydrateRole(session.user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          void hydrateRole(session.user)
        } else {
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [hydrateRole])

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const signup = useCallback(async (email: string, password: string, meta: Record<string, unknown>) => {
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
    <AuthContext.Provider value={{ user, loading, role, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
