import { useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { checkAccess, getPolicy } from '@/lib/rbac'
import { useRouter } from '@tanstack/react-router'

interface RoleGuardProps {
  permission: string
  resource?: string
  redirectTo?: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({
  permission,
  resource,
  redirectTo = '/login',
  children,
  fallback,
}: RoleGuardProps) {
  const { user, role } = useAuth()
  const router = useRouter()

  const allowed = checkAccess(
    user?.id ?? 'anonymous',
    role,
    permission,
    resource ?? permission
  )

  useEffect(() => {
    if (!allowed) {
      router.navigate({ to: redirectTo })
    }
  }, [allowed, router, redirectTo])

  if (!allowed) {
    return fallback ?? <AccessDenied />
  }

  return <>{children}</>
}

export function usePermission(permission: string, resource?: string): boolean {
  const { user, role } = useAuth()
  return checkAccess(
    user?.id ?? 'anonymous',
    role,
    permission,
    resource ?? permission
  )
}

export function useRoleResponsibilities(): string[] {
  const { role } = useAuth()
  const policy = getPolicy(role)
  return policy.responsibilities
}

function AccessDenied() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">
          You do not have permission to access this resource.
        </p>
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          Return Home
        </a>
      </div>
    </div>
  )
}
