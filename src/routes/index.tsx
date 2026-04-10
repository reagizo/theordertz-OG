import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import Logo from '@/components/Logo'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { user, loading, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    try {
      if (!user) {
        router.navigate({ to: '/login' })
      } else if (role === 'admin' || role === 'test' || role === 'supervisor' || role === 'clerk' || role === 'accountant') {
        router.navigate({ to: '/admin' })
      } else if (role === 'agent') {
        router.navigate({ to: '/agent' })
      } else if (role === 'customer') {
        router.navigate({ to: '/customer' })
      } else {
        router.navigate({ to: '/login' })
      }
    } catch (err) {
      console.error('Navigation error:', err)
    }
  }, [user, loading, role, router])

  return (
    <div className="min-h-screen bg-green-900 flex items-center justify-center">
      <div className="text-center">
        <Logo size="lg" showName className="justify-center mb-6" />
        <div className="flex items-center justify-center gap-2 text-green-200">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading...</span>
        </div>
      </div>
    </div>
  )
}
