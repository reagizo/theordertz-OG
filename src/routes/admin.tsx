import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { RoleGuard } from '@/components/RoleGuard'
import { Sidebar } from '@/components/Sidebar'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { NotificationSystem } from '@/components/NotificationSystem'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  const { user, loading, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      router.navigate({ to: '/login' })
    }
  }, [user, loading, role, router])

  if (loading) return (
    <div className="min-h-screen bg-[#0A2A66] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C62828]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#F57C00]/20 rounded-full blur-[120px]" />
      </div>
      <div className="flex items-center justify-center gap-2 text-white/70">
        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Loading...</span>
      </div>
    </div>
  )
  if (!user || role !== 'admin') return null

  return (
    <RoleGuard permission="view_dashboard" resource="admin_dashboard" redirectTo="/login">
      <SettingsProvider>
        <NotificationSystem />
        <div className="min-h-screen bg-[#0A2A66]">
          <Sidebar role="admin" />
          <div className="lg:pl-64 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
              <img src="/logo.png" alt="" className="w-[600px] h-[600px] opacity-[0.08] scale-110" aria-hidden="true" />
            </div>
            <main className="p-6 relative z-10">
              <Outlet />
            </main>
          </div>
        </div>
      </SettingsProvider>
    </RoleGuard>
  )
}
