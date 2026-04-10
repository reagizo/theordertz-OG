import { createFileRoute } from '@tanstack/react-router'
import { listUsersFn } from '@/server/db.functions'

export const Route = createFileRoute('/admin/users')({
  loader: () => {
    try {
      return listUsersFn()
    } catch (err) {
      console.error('Users loader error:', err)
      return []
    }
  },
  component: AdminUsersTable,
})

function AdminUsersTable() {
  const rows = Route.useLoaderData() as Record<string, unknown>[]
  const keys =
    rows.length > 0
      ? Array.from(
          new Set(rows.flatMap((r) => Object.keys(r))),
        ).sort()
      : []

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="text-sm text-gray-600 mt-1">
          Data from the <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">public.users</code>{' '}
          table (Supabase).
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          No rows returned. Create a <code className="rounded bg-gray-50 px-1">users</code> table in
          Supabase and grant access for the service role or adjust RLS so this query succeeds.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-600">
              <tr>
                {keys.map((k) => (
                  <th key={k} className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/80">
                  {keys.map((k) => (
                    <td key={k} className="px-4 py-2 text-gray-800 max-w-xs truncate" title={String(row[k])}>
                      {formatCell(row[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
