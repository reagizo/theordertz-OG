import { useAuth } from '@/components/AuthProvider'
import { getPolicy } from '@/lib/rbac'

export function UserDashboard() {
  const { user, role } = useAuth()
  const policy = getPolicy(role)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium text-gray-900">{user?.name ?? user?.email ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{user?.email ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-medium capitalize text-gray-900">{role}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">User ID</p>
            <p className="font-mono text-sm text-gray-900">{user?.id ?? 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Responsibilities</h2>
        <ul className="space-y-2">
          {policy.responsibilities.map((resp, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-900 flex-shrink-0" />
              <span className="text-gray-700">{resp}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Permissions</h2>
        <div className="flex flex-wrap gap-2">
          {policy.permissions.map((perm) => (
            <span
              key={perm}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
            >
              {perm.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {policy.restrictions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Restrictions</h2>
          <div className="flex flex-wrap gap-2">
            {policy.restrictions.map((rest) => (
              <span
                key={rest}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
              >
                {rest.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
