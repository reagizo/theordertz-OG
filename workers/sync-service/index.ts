// Cloudflare Worker for syncing Supabase ↔ Firebase
// This service handles bidirectional sync between PostgreSQL (Supabase) and Firestore (Firebase)

export interface Env {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_SERVICE_ROLE_KEY: string
  FIREBASE_PROJECT_ID: string
  FIREBASE_SERVICE_ACCOUNT_KEY: string // JSON key as string
}

// Cache for OAuth2 token
let cachedToken: string | null = null
let tokenExpiry: number = 0

// Supabase table schema mapping to Firebase collections
const TABLE_MAPPINGS: Record<string, string> = {
  users: 'users',
  agents: 'agents',
  customers: 'customers',
  transactions: 'transactions',
  float_requests: 'float_requests',
  float_exchanges: 'float_exchanges',
  audit_log: 'audit_log',
  registration_alerts: 'registration_alerts',
  password_reset_requests: 'password_reset_requests',
}

// Fetch from Supabase
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

// Generate OAuth2 access token from service account JSON
async function getAccessToken(serviceAccountKey: string): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }

  const key = JSON.parse(serviceAccountKey)
  
  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }
  
  // Create JWT payload
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }
  
  // Base64url encode header and payload
  const base64UrlEncode = (str: string) => {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  
  // Sign the JWT using Web Crypto API
  const privateKey = key.private_key.replace(/\\n/g, '\n')
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    new TextEncoder().encode(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyData,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  )
  
  const encodedSignature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  )
  
  const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`
  
  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`)
  }
  
  const data = await response.json()
  cachedToken = data.access_token as string
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000 // Refresh 60 seconds before expiry
  
  return cachedToken as string
}

// Write to Firebase Firestore
async function writeToFirebase(
  projectId: string,
  accessToken: string,
  collection: string,
  data: any[],
  operation: 'merge' | 'overwrite' = 'merge'
) {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`
  
  const results = await Promise.allSettled(
    data.map(async (item) => {
      const docId = item.id || item.uuid || crypto.randomUUID()
      const url = `${baseUrl}/${docId}?${operation === 'merge' ? 'updateMask.fieldPaths=updated_at' : ''}`
      
      // Convert data to Firestore format
      const firestoreData = {
        fields: Object.entries(item).reduce((acc, [key, value]) => {
          acc[key] = convertToFirestoreValue(value)
          return acc
        }, {} as Record<string, any>)
      }

      const response = await fetch(url, {
        method: operation === 'merge' ? 'PATCH' : 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(firestoreData),
      })

      if (!response.ok) {
        throw new Error(`Firebase write failed: ${response.statusText}`)
      }

      return response.json()
    })
  )

  const failures = results.filter(r => r.status === 'rejected')
  if (failures.length > 0) {
    console.error(`${failures.length} documents failed to sync to Firebase`)
  }

  return { success: results.length - failures.length, failed: failures.length }
}

// Convert JavaScript values to Firestore format
function convertToFirestoreValue(value: any): any {
  if (value === null) return { nullValue: null }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return { integerValue: value }
  if (typeof value === 'string') return { stringValue: value }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(convertToFirestoreValue) } }
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.entries(value).reduce((acc, [k, v]) => {
      acc[k] = convertToFirestoreValue(v)
      return acc
    }, {} as Record<string, any>) }}
  }
  return { stringValue: String(value) }
}

// Sync a single table from Supabase to Firebase
async function syncTable(
  supabaseUrl: string,
  supabaseKey: string,
  projectId: string,
  serviceAccountKey: string,
  tableName: string
): Promise<{ success: boolean; synced: number; failed: number; error?: string }> {
  try {
    const supabaseData = await fetchFromSupabase(supabaseUrl, supabaseKey, tableName)
    if (!supabaseData || supabaseData.length === 0) {
      return { success: true, synced: 0, failed: 0 }
    }

    const accessToken = await getAccessToken(serviceAccountKey)
    const firebaseCollection = TABLE_MAPPINGS[tableName] || tableName
    const result = await writeToFirebase(projectId, accessToken, firebaseCollection, supabaseData)
    
    return { success: true, synced: result.success, failed: result.failed }
  } catch (error) {
    console.error(`Error syncing ${tableName}:`, error)
    return { success: false, synced: 0, failed: 0, error: String(error) }
  }
}

// Main sync endpoint
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

    // Sync all tables
    if (path === '/sync/all' && request.method === 'POST') {
      const tables = Object.keys(TABLE_MAPPINGS)
      const results = await Promise.all(
        tables.map(table => syncTable(
          env.VITE_SUPABASE_URL,
          env.VITE_SUPABASE_SERVICE_ROLE_KEY,
          env.FIREBASE_PROJECT_ID,
          env.FIREBASE_SERVICE_ACCOUNT_KEY,
          table
        ))
      )

      return Response.json({
        success: true,
        timestamp: new Date().toISOString(),
        results,
        summary: {
          total_synced: results.reduce((sum, r) => sum + r.synced, 0),
          total_failed: results.reduce((sum, r) => sum + (r.failed || 0), 0),
        }
      }, { headers: corsHeaders })
    }

    // Sync specific table
    if (path.startsWith('/sync/') && request.method === 'POST') {
      const table = path.split('/')[2]
      
      if (!TABLE_MAPPINGS[table]) {
        return Response.json({ error: 'Unknown table' }, { status: 400, headers: corsHeaders })
      }

      const result = await syncTable(
        env.VITE_SUPABASE_URL,
        env.VITE_SUPABASE_SERVICE_ROLE_KEY,
        env.FIREBASE_PROJECT_ID,
        env.FIREBASE_SERVICE_ACCOUNT_KEY,
        table
      )

      return Response.json({
        success: true,
        timestamp: new Date().toISOString(),
        result,
      }, { headers: corsHeaders })
    }

    // Get sync status
    if (path === '/sync/status' && request.method === 'GET') {
      return Response.json({
        status: 'ready',
        tables: Object.keys(TABLE_MAPPINGS),
        timestamp: new Date().toISOString(),
      }, { headers: corsHeaders })
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
  },
}
