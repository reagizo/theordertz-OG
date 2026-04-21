// Cloudflare Worker for serving Supabase data
// This service provides a direct API to Supabase data, excluding today's created records

export interface Env {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_SERVICE_ROLE_KEY: string
}

// Supabase tables
const TABLES = [
  'users',
  'agents',
  'customers',
  'transactions',
  'float_requests',
  'float_exchanges',
  'audit_log',
  'registration_alerts',
  'password_reset_requests',
]

// Fetch from Supabase with date filter
async function fetchFromSupabase(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  options: { limit?: number; offset?: number; filters?: Record<string, any> } = {}
) {
  const { limit = 100, offset = 0, filters = {} } = options
  
  let url = `${supabaseUrl}/rest/v1/${table}?select=*`
  
  if (limit) url += `&limit=${limit}`
  if (offset) url += `&offset=${offset}`
  
  Object.entries(filters).forEach(([key, value]) => {
    url += `&${key}=eq.${encodeURIComponent(value)}`
  })

  // Filter out records created today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()
  url += `&created_at=lt.${encodeURIComponent(todayISO)}`

  const response = await fetch(url, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Supabase fetch failed: ${response.statusText}`)
  }

  return response.json()
}

// Main endpoint
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Health check
    if (path === '/health') {
      return Response.json({ status: 'healthy', timestamp: new Date().toISOString() }, { headers: corsHeaders })
    }

    // Get all tables
    if (path === '/data/all' && request.method === 'GET') {
      const results = await Promise.all(
        TABLES.map(async (table) => {
          try {
            const data = await fetchFromSupabase(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY, table)
            return { table, success: true, count: data.length, data }
          } catch (error) {
            return { table, success: false, error: String(error) }
          }
        })
      )

      return Response.json({
        success: true,
        timestamp: new Date().toISOString(),
        results,
        summary: {
          total_tables: TABLES.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        }
      }, { headers: corsHeaders })
    }

    // Get specific table
    if (path.startsWith('/data/') && request.method === 'GET') {
      const table = path.split('/')[2]
      
      if (!TABLES.includes(table)) {
        return Response.json({ error: 'Unknown table' }, { status: 400, headers: corsHeaders })
      }

      try {
        const data = await fetchFromSupabase(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY, table)
        return Response.json({
          success: true,
          table,
          count: data.length,
          data,
          timestamp: new Date().toISOString(),
        }, { headers: corsHeaders })
      } catch (error) {
        return Response.json({
          success: false,
          table,
          error: String(error),
        }, { status: 500, headers: corsHeaders })
      }
    }

    // List available tables
    if (path === '/tables' && request.method === 'GET') {
      return Response.json({
        tables: TABLES,
        timestamp: new Date().toISOString(),
      }, { headers: corsHeaders })
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
  },
}
