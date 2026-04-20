// Bidirectional sync service between Supabase and localStorage
// Works across Cloudflare, PWA (Capacitor), and Localhost

import { supabase } from './supabase'

// Sync metadata tracking
interface SyncMetadata {
  lastSyncTime: number
  pendingPush: string[] // IDs of items waiting to be pushed to Supabase
}

const SYNC_METADATA_KEY = 'sync_metadata'
const SYNC_INTERVAL = 60000 // Sync every 60 seconds

// Local storage helpers
const getStore = (key: string): any[] => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const setStore = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data))
}

const getSyncMetadata = (): SyncMetadata => {
  try {
    const raw = localStorage.getItem(SYNC_METADATA_KEY)
    return raw ? JSON.parse(raw) : { lastSyncTime: 0, pendingPush: [] }
  } catch {
    return { lastSyncTime: 0, pendingPush: [] }
  }
}

const setSyncMetadata = (metadata: SyncMetadata) => {
  localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata))
}

// Table configurations
const TABLES = {
  agents: { key: 'agents', table: 'agents' },
  customers: { key: 'customers', table: 'customers' },
  transactions: { key: 'transactions', table: 'transactions' },
  floatRequests: { key: 'floatRequests', table: 'float_requests' },
  floatExchanges: { key: 'floatExchanges', table: 'float_exchanges' },
  vendors: { key: 'vendors', table: 'vendors' },
} as const

// Pull data from Supabase to localStorage
async function pullFromSupabase(table: string, localKey: string, testOnly = false): Promise<void> {
  try {
    const filterColumn = table === 'vendors' ? 'istestaccount' : 'is_test_account'
    const query = supabase.from(table).select('*')
    
    if (testOnly) {
      query.eq(filterColumn, true)
    } else {
      query.eq(filterColumn, false)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      console.error(`Error pulling ${table} from Supabase:`, error)
      return
    }
    
    if (data) {
      const existing = getStore(localKey)
      const existingIds = new Set(existing.map((item: any) => item.id))
      const newItems = data.filter((item: any) => !existingIds.has(item.id))
      
      if (newItems.length > 0) {
        const merged = [...data, ...existing.filter((item: any) => !data.some((d: any) => d.id === item.id))]
        setStore(localKey, merged)
        console.log(`Pulled ${newItems.length} new items from ${table} (${testOnly ? 'test' : 'real'})`)
      }
    }
  } catch (error) {
    console.error(`Error in pullFromSupabase for ${table}:`, error)
  }
}

// Push data from localStorage to Supabase
async function pushToSupabase(table: string, localKey: string, itemId?: string): Promise<number> {
  try {
    const localData = getStore(localKey)
    const itemsToPush = itemId 
      ? localData.filter((item: any) => item.id === itemId)
      : localData
    
    if (itemsToPush.length === 0) return 0
    
    const filterColumn = table === 'vendors' ? 'istestaccount' : 'is_test_account'
    
    // Batch upsert
    const { error } = await supabase
      .from(table)
      .upsert(
        itemsToPush.map((item: any) => ({
          ...item,
          [filterColumn]: item.isTestAccount || item.is_test_account || false,
        })),
        { onConflict: 'id' }
      )
    
    if (error) {
      console.error(`Error pushing to ${table}:`, error)
      return 0
    }
    
    console.log(`Pushed ${itemsToPush.length} items to ${table}`)
    return itemsToPush.length
  } catch (error) {
    console.error(`Error in pushToSupabase for ${table}:`, error)
    return 0
  }
}

// Full sync - pull all data from Supabase
export async function syncPullAll(): Promise<void> {
  console.log('Starting sync pull from Supabase...')
  
  await Promise.all([
    // Pull real data
    pullFromSupabase(TABLES.agents.table, TABLES.agents.key, false),
    pullFromSupabase(TABLES.customers.table, TABLES.customers.key, false),
    pullFromSupabase(TABLES.transactions.table, TABLES.transactions.key, false),
    pullFromSupabase(TABLES.floatRequests.table, TABLES.floatRequests.key, false),
    pullFromSupabase(TABLES.floatExchanges.table, TABLES.floatExchanges.key, false),
    pullFromSupabase(TABLES.vendors.table, TABLES.vendors.key, false),
    // Pull test data
    pullFromSupabase(TABLES.agents.table, TABLES.agents.key, true),
    pullFromSupabase(TABLES.customers.table, TABLES.customers.key, true),
    pullFromSupabase(TABLES.transactions.table, TABLES.transactions.key, true),
    pullFromSupabase(TABLES.floatRequests.table, TABLES.floatRequests.key, true),
    pullFromSupabase(TABLES.floatExchanges.table, TABLES.floatExchanges.key, true),
    pullFromSupabase(TABLES.vendors.table, TABLES.vendors.key, true),
  ])
  
  const metadata = getSyncMetadata()
  metadata.lastSyncTime = Date.now()
  setSyncMetadata(metadata)
  
  console.log('Sync pull completed')
}

// Push all local changes to Supabase
export async function syncPushAll(): Promise<number> {
  console.log('Starting sync push to Supabase...')
  
  const results = await Promise.all([
    pushToSupabase(TABLES.agents.table, TABLES.agents.key),
    pushToSupabase(TABLES.customers.table, TABLES.customers.key),
    pushToSupabase(TABLES.transactions.table, TABLES.transactions.key),
    pushToSupabase(TABLES.floatRequests.table, TABLES.floatRequests.key),
    pushToSupabase(TABLES.floatExchanges.table, TABLES.floatExchanges.key),
    pushToSupabase(TABLES.vendors.table, TABLES.vendors.key),
  ])
  
  const totalPushed = results.reduce((sum, count) => sum + count, 0)
  
  const metadata = getSyncMetadata()
  metadata.pendingPush = []
  setSyncMetadata(metadata)
  
  console.log(`Sync push completed: ${totalPushed} items`)
  return totalPushed
}

// Bidirectional sync - pull and push
export async function syncBidirectional(): Promise<void> {
  await syncPushAll()
  await syncPullAll()
}

// Mark item as needing sync
export function markForSync(table: string, itemId: string): void {
  const metadata = getSyncMetadata()
  const key = `${table}:${itemId}`
  
  if (!metadata.pendingPush.includes(key)) {
    metadata.pendingPush.push(key)
    setSyncMetadata(metadata)
  }
}

// Start automatic sync
let syncInterval: NodeJS.Timeout | null = null

export function startAutoSync(): void {
  if (syncInterval) return
  
  // Initial sync
  syncBidirectional()
  
  // Periodic sync
  syncInterval = setInterval(() => {
    syncBidirectional()
  }, SYNC_INTERVAL)
  
  console.log('Auto-sync started')
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('Auto-sync stopped')
  }
}

// Sync on network reconnect
export function setupNetworkSync(): void {
  if (typeof window !== 'undefined' && 'navigator' in window && window.addEventListener) {
    window.addEventListener('online', () => {
      console.log('Network reconnected, syncing...')
      syncBidirectional()
    })
  }
}

// Get sync status
export function getSyncStatus(): { lastSyncTime: number; pendingPush: number } {
  const metadata = getSyncMetadata()
  return {
    lastSyncTime: metadata.lastSyncTime,
    pendingPush: metadata.pendingPush.length,
  }
}
