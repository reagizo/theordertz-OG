import type { RbacPolicy, AccessLogEntry } from '@/lib/types'

const ACCESS_LOG_KEY = 'rbac.access.log'

export const ROLE_POLICIES: Record<string, RbacPolicy> = {
  admin: {
    role: 'admin',
    permissions: [
      'full_system_access',
      'create_users',
      'update_users',
      'delete_users',
      'manage_roles',
      'manage_permissions',
      'view_all_reports',
      'view_all_logs',
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
    ],
    restrictions: [
      'bypass_audit_trails',
    ],
    responsibilities: [
      'Ensure system integrity',
      'Approve high-level changes',
      'Monitor overall performance',
      'Enforce compliance and security standards',
    ],
  },
  supervisor: {
    role: 'supervisor',
    permissions: [
      'manage_team',
      'approve_tasks',
      'reject_tasks',
      'view_performance_reports',
      'escalate_issues',
      'view_dashboard',
      'view_team_transactions',
      'view_team_reports',
      'manage_customers',
      'view_assigned_customers',
    ],
    restrictions: [
      'manage_settings',
      'manage_roles',
      'manage_permissions',
      'delete_users',
      'view_audit_logs',
      'access_sensitive_financial_data',
    ],
    responsibilities: [
      'Oversee daily operations',
      'Ensure team compliance',
      'Provide feedback and guidance',
      'Escalate critical issues to Administrator',
    ],
  },
  clerk: {
    role: 'clerk',
    permissions: [
      'input_records',
      'update_records',
      'generate_standard_reports',
      'view_dashboard',
      'view_own_transactions',
      'view_assigned_modules',
    ],
    restrictions: [
      'approve_records',
      'delete_records',
      'manage_settings',
      'manage_roles',
      'manage_users',
      'approve_registrations',
      'view_audit_logs',
      'manage_credit_portfolios',
    ],
    responsibilities: [
      'Maintain accurate data entry',
      'Support supervisors with documentation',
      'Follow operational procedures',
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
      'manage_assigned_customers',
      'view_assigned_customers',
      'provide_customer_support',
    ],
    restrictions: [
      'manage_settings',
      'approve_registrations',
      'manage_agents',
      'view_audit_logs',
      'approve_float_requests',
      'manage_credit_portfolios',
      'manage_roles',
      'manage_permissions',
      'access_admin_functions',
      'access_supervisor_functions',
    ],
    responsibilities: [
      'Ensure customer satisfaction',
      'Handle requests efficiently',
      'Report issues to Supervisor',
      'Process customer transactions (cash send, withdrawal, utility bills)',
      'Submit float exchange requests for carrier networks',
    ],
  },
  customer: {
    role: 'customer',
    permissions: [
      'view_dashboard',
      'view_own_account',
      'submit_requests',
      'submit_complaints',
      'access_customer_support',
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
      'access_internal_system_data',
      'modify_other_users',
    ],
    responsibilities: [
      'Provide accurate personal details',
      'Use services responsibly',
      'Adhere to terms of service',
    ],
  },
  test: {
    role: 'test',
    permissions: [
      'simulate_user_actions',
      'access_sandbox',
      'generate_test_data',
      'view_dashboard',
      'view_own_transactions',
      'create_transactions',
    ],
    restrictions: [
      'access_production_data',
      'affect_real_accounts',
      'manage_settings',
      'manage_roles',
      'manage_permissions',
      'delete_users',
      'view_audit_logs',
      'approve_registrations',
    ],
    responsibilities: [
      'Validate system functionality',
      'Report bugs and inconsistencies',
      'Ensure testing does not disrupt operations',
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
      'manage_roles',
      'manage_permissions',
      'delete_users',
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
