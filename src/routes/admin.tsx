import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { RoleGuard } from '@/components/RoleGuard'
import { Sidebar } from '@/components/Sidebar'
import { SettingsProvider } from '@/contexts/SettingsContext'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  const { user, loading, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || (role !== 'admin' && role !== 'test'))) {
      router.navigate({ to: '/login' })
    }
  }, [user, loading, role, router])

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>
  if (!user || (role !== 'admin' && role !== 'test')) return null

  return (
    <RoleGuard permission="view_dashboard" resource="admin_dashboard" redirectTo="/login">
      <SettingsProvider>
        <div className="min-h-screen bg-gray-50">
          <Sidebar role={role as 'admin' | 'test'} />
          <div className="lg:pl-64 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
              <img src="/logo.svg" alt="" className="w-[600px] h-[600px] opacity-[0.03]" aria-hidden="true" />
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
