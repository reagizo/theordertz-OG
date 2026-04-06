import type { RbacPolicy, AccessLogEntry } from '@/lib/types'

const ACCESS_LOG_KEY = 'rbac.access.log'

export const ROLE_POLICIES: Record<string, RbacPolicy> = {
  admin: {
    role: 'admin',
    permissions: [
      'view_dashboard',
      'manage_agents',
      'manage_customers',
      'view_transactions',
      'manage_transactions',
      'view_float_requests',
      'approve_float_requests',
      'reject_float_requests',
      'manage_settings',
      'approve_registrations',
      'reject_registrations',
      'view_audit_logs',
      'manage_credit_portfolios',
      'view_all_reports',
    ],
    restrictions: [],
    responsibilities: [
      'Oversee all platform operations and user accounts',
      'Approve or reject agent and customer registrations',
      'Manage float exchange requests from agents',
      'Monitor transactions and resolve disputes',
      'Configure platform settings and policies',
      'Review audit logs and security reports',
      'Manage credit portfolios and limits',
    ],
  },
  agent: {
    role: 'agent',
    permissions: [
      'view_dashboard',
      'view_own_transactions',
      'create_transactions',
      'submit_float_requests',
      'view_own_float_requests',
      'manage_customers',
      'view_assigned_customers',
    ],
    restrictions: [
      'manage_settings',
      'approve_registrations',
      'manage_agents',
      'view_audit_logs',
      'approve_float_requests',
      'manage_credit_portfolios',
    ],
    responsibilities: [
      'Process customer transactions (cash send, withdrawal, utility bills)',
      'Submit float exchange requests for carrier networks',
      'Manage assigned customer accounts',
      'Maintain accurate transaction records',
      'Provide customer support for payment services',
    ],
  },
  customer: {
    role: 'customer',
    permissions: [
      'view_dashboard',
      'request_services',
      'view_own_history',
      'view_own_profile',
      'update_own_profile',
    ],
    restrictions: [
      'manage_agents',
      'manage_customers',
      'view_transactions',
      'manage_transactions',
      'view_float_requests',
      'approve_float_requests',
      'manage_settings',
      'approve_registrations',
      'view_audit_logs',
      'manage_credit_portfolios',
    ],
    responsibilities: [
      'Request payment services through assigned agents',
      'Maintain accurate profile information',
      'Review transaction history and confirmations',
      'Adhere to platform terms and credit limits',
    ],
  },
  guest: {
    role: 'guest',
    permissions: [
      'view_login',
      'view_register',
    ],
    restrictions: [
      'view_dashboard',
      'manage_agents',
      'manage_customers',
      'view_transactions',
      'manage_transactions',
      'view_float_requests',
      'approve_float_requests',
      'manage_settings',
      'approve_registrations',
      'view_audit_logs',
      'manage_credit_portfolios',
      'request_services',
      'view_own_history',
      'create_transactions',
      'submit_float_requests',
    ],
    responsibilities: [
      'Register for an account to access services',
      'Contact support for assistance',
    ],
  },
}

export function getPolicy(role?: string | null): RbacPolicy {
  const r = (role ?? 'guest') as string
  return ROLE_POLICIES[r] ?? ROLE_POLICIES.guest
}

export function hasPermission(role: string | null | undefined, permission: string): boolean {
  const policy = getPolicy(role)
  return policy.permissions.includes(permission)
}

export function isRestricted(role: string | null | undefined, action: string): boolean {
  const policy = getPolicy(role)
  return policy.restrictions.includes(action)
}

export function logAccess(
  userId: string,
  role: string,
  action: string,
  resource: string,
  allowed: boolean,
  details?: string
): void {
  if (typeof window === 'undefined') return
  const entry: AccessLogEntry = {
    timestamp: new Date().toISOString(),
    userId,
    role,
    action,
    resource,
    allowed,
    details,
  }
  try {
    const raw = localStorage.getItem(ACCESS_LOG_KEY)
    const logs: AccessLogEntry[] = raw ? JSON.parse(raw) : []
    logs.unshift(entry)
    // Keep last 1000 entries
    if (logs.length > 1000) logs.length = 1000
    localStorage.setItem(ACCESS_LOG_KEY, JSON.stringify(logs))
  } catch {
    // Silently fail — logging should never break the app
  }
}

export function getAccessLogs(): AccessLogEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ACCESS_LOG_KEY)
    return raw ? (JSON.parse(raw) as AccessLogEntry[]) : []
  } catch {
    return []
  }
}

export function clearAccessLogs(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACCESS_LOG_KEY)
}

export function checkAccess(
  userId: string,
  role: string | null | undefined,
  permission: string,
  resource: string
): boolean {
  const allowed = hasPermission(role, permission) && !isRestricted(role, permission)
  logAccess(userId, role ?? 'guest', permission, resource, allowed)
  return allowed
}
