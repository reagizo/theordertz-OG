// Cloudflare Worker for server-side sync between Supabase, Firebase, and Cloudflare
// This worker handles sync operations that need to run on the server

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      // Route handling
      if (path === '/sync/status') {
        return handleSyncStatus(request, env, corsHeaders)
      } else if (path === '/sync/trigger') {
        return handleSyncTrigger(request, env, corsHeaders)
      } else if (path === '/sync/collection') {
        return handleSyncCollection(request, env, corsHeaders)
      } else if (path === '/sync/devices') {
        return handleDevices(request, env, corsHeaders)
      } else if (path === '/sync/heartbeat') {
        return handleHeartbeat(request, env, corsHeaders)
      } else {
        return new Response('Not Found', { status: 404, headers: corsHeaders })
      }
    } catch (error) {
      console.error('Sync worker error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  },

  async scheduled(event, env, ctx) {
    // Scheduled sync task (runs periodically)
    console.log('Running scheduled sync task')
    await performScheduledSync(env)
  },
}

// Handle sync status requests
async function handleSyncStatus(request, env, corsHeaders) {
  const status = await getSyncStatus(env)
  return new Response(
    JSON.stringify(status),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Handle manual sync trigger
async function handleSyncTrigger(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  const body = await request.json()
  const { collection } = body

  await performSync(env, collection)

  return new Response(
    JSON.stringify({ success: true, message: 'Sync triggered' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Handle collection-specific sync
async function handleSyncCollection(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  const body = await request.json()
  const { collection } = body

  if (!collection) {
    return new Response(
      JSON.stringify({ error: 'Collection name required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const result = await syncCollection(env, collection)

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Handle device registration and heartbeat
async function handleHeartbeat(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  const body = await request.json()
  const { deviceId, platform } = body

  if (!deviceId) {
    return new Response(
      JSON.stringify({ error: 'Device ID required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  await updateDeviceHeartbeat(env, deviceId, platform)

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Handle devices list
async function handleDevices(request, env, corsHeaders) {
  const devices = await getDevices(env)
  return new Response(
    JSON.stringify(devices),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Get sync status from KV
async function getSyncStatus(env) {
  const supabaseStatus = await env.SYNC_STATUS.get('supabase', { type: 'json' })
  const firebaseStatus = await env.SYNC_STATUS.get('firebase', { type: 'json' })
  const cloudflareStatus = await env.SYNC_STATUS.get('cloudflare', { type: 'json' })

  return {
    supabase: supabaseStatus || { lastSynced: null, isSyncing: false, pendingChanges: 0 },
    firebase: firebaseStatus || { lastSynced: null, isSyncing: false, pendingChanges: 0 },
    cloudflare: cloudflareStatus || { lastSynced: null, isSyncing: false, pendingChanges: 0 },
  }
}

// Perform sync operation
async function performSync(env, collection = null) {
  const collections = collection ? [collection] : ['users', 'agents', 'customers', 'transactions', 'registration_alerts', 'test_accounts', 'real_accounts']

  for (const coll of collections) {
    await syncCollection(env, coll)
  }
}

// Sync a specific collection
async function syncCollection(env, collection) {
  console.log(`Syncing collection: ${collection}`)
  
  // Update sync status
  await env.SYNC_STATUS.put('supabase', JSON.stringify({ isSyncing: true, collection }))
  await env.SYNC_STATUS.put('firebase', JSON.stringify({ isSyncing: true, collection }))

  try {
    // Sync from Supabase to Firebase
    const supabaseData = await fetchFromSupabase(env, collection)
    await sendToFirebase(env, collection, supabaseData)

    // Sync from Firebase to Supabase
    const firebaseData = await fetchFromFirebase(env, collection)
    await sendToSupabase(env, collection, firebaseData)

    // Update sync status with success
    const timestamp = new Date().toISOString()
    await env.SYNC_STATUS.put('supabase', JSON.stringify({ lastSynced: timestamp, isSyncing: false, collection }))
    await env.SYNC_STATUS.put('firebase', JSON.stringify({ lastSynced: timestamp, isSyncing: false, collection }))

    return { success: true, collection, timestamp }
  } catch (error) {
    console.error(`Error syncing ${collection}:`, error)
    
    // Update sync status with error
    await env.SYNC_STATUS.put('supabase', JSON.stringify({ isSyncing: false, error: error.message, collection }))
    await env.SYNC_STATUS.put('firebase', JSON.stringify({ isSyncing: false, error: error.message, collection }))

    return { success: false, collection, error: error.message }
  }
}

// Fetch data from Supabase
async function fetchFromSupabase(env, collection) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${collection}`, {
    headers: {
      'apikey': env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Supabase fetch failed: ${response.statusText}`)
  }

  return response.json()
}

// Send data to Firebase
async function sendToFirebase(env, collection, data) {
  // Firebase REST API endpoint
  const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}`

  for (const item of data) {
    const docId = item.id
    const docUrl = `${firebaseUrl}/${docId}`

    // Convert data to Firestore format
    const firestoreData = convertToFirestoreFormat(item)

    const response = await fetch(docUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.FIREBASE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        fields: firestoreData,
      }),
    })

    if (!response.ok && response.status !== 404) {
      console.error(`Firebase write failed for ${collection}/${docId}:`, response.statusText)
    }
  }
}

// Fetch data from Firebase
async function fetchFromFirebase(env, collection) {
  const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}`

  const response = await fetch(firebaseUrl, {
    headers: {
      'Authorization': `Bearer ${env.FIREBASE_ACCESS_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Firebase fetch failed: ${response.statusText}`)
  }

  const result = await response.json()
  
  // Convert Firestore format back to regular JSON
  if (result.documents) {
    return result.documents.map(doc => convertFromFirestoreFormat(doc))
  }

  return []
}

// Send data to Supabase
async function sendToSupabase(env, collection, data) {
  const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/${collection}`

  for (const item of data) {
    const docId = item.id
    
    // Check if document exists
    const checkResponse = await fetch(`${supabaseUrl}?id=eq.${docId}`, {
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })

    const existingData = await checkResponse.json()

    if (existingData && existingData.length > 0) {
      // Update existing document
      const updateResponse = await fetch(`${supabaseUrl}?id=eq.${docId}`, {
        method: 'PATCH',
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(item),
      })

      if (!updateResponse.ok) {
        console.error(`Supabase update failed for ${collection}/${docId}:`, updateResponse.statusText)
      }
    } else {
      // Insert new document
      const insertResponse = await fetch(supabaseUrl, {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(item),
      })

      if (!insertResponse.ok) {
        console.error(`Supabase insert failed for ${collection}/${docId}:`, insertResponse.statusText)
      }
    }
  }
}

// Convert regular JSON to Firestore format
function convertToFirestoreFormat(data) {
  const fields = {}

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null }
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value }
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) ? { integerValue: value } : { doubleValue: value }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value }
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() }
    } else if (Array.isArray(value)) {
      fields[key] = { arrayValue: { values: value.map(v => convertToFirestoreFormat({ _temp: v })._temp) } }
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: convertToFirestoreFormat(value) } }
    } else {
      fields[key] = { stringValue: String(value) }
    }
  }

  return fields
}

// Convert Firestore format back to regular JSON
function convertFromFirestoreFormat(doc) {
  const result = { id: doc.name.split('/').pop() }
  const fields = doc.fields || {}

  for (const [key, value] of Object.entries(fields)) {
    if (value.nullValue !== undefined) {
      result[key] = null
    } else if (value.stringValue !== undefined) {
      result[key] = value.stringValue
    } else if (value.integerValue !== undefined) {
      result[key] = parseInt(value.integerValue)
    } else if (value.doubleValue !== undefined) {
      result[key] = parseFloat(value.doubleValue)
    } else if (value.booleanValue !== undefined) {
      result[key] = value.booleanValue
    } else if (value.timestampValue !== undefined) {
      result[key] = new Date(value.timestampValue)
    } else if (value.arrayValue !== undefined) {
      result[key] = value.arrayValue.values?.map(v => convertFromFirestoreFormat({ fields: { _temp: v } })._temp)
    } else if (value.mapValue !== undefined) {
      result[key] = convertFromFirestoreFormat({ fields: value.mapValue.fields })
    }
  }

  return result
}

// Update device heartbeat
async function updateDeviceHeartbeat(env, deviceId, platform) {
  const deviceData = {
    deviceId,
    platform,
    lastSeen: new Date().toISOString(),
    isOnline: true,
  }

  await env.DEVICES.put(deviceId, JSON.stringify(deviceData))
}

// Get all devices
async function getDevices(env) {
  const devices = []
  const list = await env.DEVICES.list()

  for (const key of list.keys) {
    const deviceData = await env.DEVICES.get(key.name, { type: 'json' })
    if (deviceData) {
      devices.push(deviceData)
    }
  }

  return devices
}

// Scheduled sync task
async function performScheduledSync(env) {
  console.log('Starting scheduled sync')
  
  try {
    await performSync(env)
    console.log('Scheduled sync completed successfully')
  } catch (error) {
    console.error('Scheduled sync failed:', error)
  }
}
