// Multi-platform real-time sync service
// Syncs data between Localhost, Cloudflare, Supabase, Firebase, and all devices

// Firebase and Supabase will be loaded dynamically in browser context only
let supabase: any = null
let supabaseAdmin: any = null
let db: any = null
let doc: any = null
let getDoc: any = null
let setDoc: any = null
let updateDoc: any = null
let deleteDoc: any = null
let onSnapshot: any = null
let collection: any = null
let query: any = null
let getDocs: any = null
let serverTimestamp: any = null

// Load Firebase and Supabase modules only in browser context
async function loadModules() {
  if (typeof window === 'undefined') return false

  try {
    const supabaseModule = await import('./supabase')
    supabase = supabaseModule.supabase
    supabaseAdmin = supabaseModule.supabaseAdmin
  } catch (error) {
    console.error('Failed to load Supabase modules:', error)
  }

  // Firebase is optional - don't fail if it's not configured
  try {
    const firebaseModule = await import('./firebase')
    db = firebaseModule.db

    // Firebase v8 compat library functions
    const firestoreCompat = await import('firebase/firestore')
    doc = firestoreCompat.doc
    getDoc = firestoreCompat.getDoc
    setDoc = firestoreCompat.setDoc
    updateDoc = firestoreCompat.updateDoc
    deleteDoc = firestoreCompat.deleteDoc
    onSnapshot = firestoreCompat.onSnapshot
    collection = firestoreCompat.collection
    query = firestoreCompat.query
    getDocs = firestoreCompat.getDocs
    serverTimestamp = firestoreCompat.serverTimestamp
  } catch (error) {
    console.warn('Firebase not configured, sync will use Supabase only:', (error as any).message)
  }

  return true // Always return true since Supabase is the primary
}

export interface SyncStatus {
  lastSynced: Date | null
  isSyncing: boolean
  pendingChanges: number
  conflicts: number
  lastError: string | null
  platform: 'supabase' | 'firebase' | 'cloudflare' | 'localhost'
}

export interface SyncRecord {
  id: string
  source: 'supabase' | 'firebase' | 'cloudflare' | 'localhost'
  target: 'supabase' | 'firebase' | 'cloudflare' | 'localhost'
  action: 'create' | 'update' | 'delete'
  collection: string
  documentId: string
  data: Record<string, unknown>
  timestamp: Date
  status: 'pending' | 'completed' | 'failed'
  error?: string
}

export interface DeviceInfo {
  deviceId: string
  platform: string
  lastSeen: Date
  lastSynced: Date
  isOnline: boolean
}

class SyncService {
  private syncStatus: Map<string, SyncStatus> = new Map()
  private syncQueue: SyncRecord[] = []
  private isProcessing: boolean = false
  private devices: Map<string, DeviceInfo> = new Map()
  private subscribers: Set<(status: Map<string, SyncStatus>) => void> = new Set()
  private supabaseUnsubscribers: (() => void)[] = []
  private firebaseUnsubscribers: (() => void)[] = []

  constructor() {
    // Only initialize in browser context to prevent server-side errors
    if (typeof window === 'undefined') {
      console.log('Sync service skipped in server context')
      return
    }

    // Initialize asynchronously in browser context
    this.initializeSync().catch(err => {
      console.error('Failed to initialize sync service:', err)
    })
  }

  private async initializeSync() {
    // Load modules first
    const modulesLoaded = await loadModules()
    if (!modulesLoaded) {
      console.error('Failed to load sync modules, sync service disabled')
      return
    }
    
    // Initialize sync status for each platform
    this.syncStatus.set('supabase', {
      lastSynced: null,
      isSyncing: false,
      pendingChanges: 0,
      conflicts: 0,
      lastError: null,
      platform: 'supabase',
    })
    this.syncStatus.set('firebase', {
      lastSynced: null,
      isSyncing: false,
      pendingChanges: 0,
      conflicts: 0,
      lastError: null,
      platform: 'firebase',
    })
    this.syncStatus.set('cloudflare', {
      lastSynced: null,
      isSyncing: false,
      pendingChanges: 0,
      conflicts: 0,
      lastError: null,
      platform: 'cloudflare',
    })
    this.syncStatus.set('localhost', {
      lastSynced: null,
      isSyncing: false,
      pendingChanges: 0,
      conflicts: 0,
      lastError: null,
      platform: 'localhost',
    })

    // Start listening to changes from both platforms
    this.setupSupabaseListeners()
    this.setupFirebaseListeners()
    this.startSyncProcessor()
  }

  // Listen to Supabase changes
  private setupSupabaseListeners() {
    const collections = ['users', 'agents', 'customers', 'transactions', 'float_requests', 'float_exchanges', 'audit_log', 'registration_alerts', 'password_reset_requests']

    collections.forEach(collectionName => {
      const subscription = supabase
        .channel(`${collectionName}-changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: collectionName,
          },
          (payload: any) => {
            console.log(`Supabase change detected in ${collectionName}:`, payload)
            this.handleSupabaseChange(collectionName, payload)
          }
        )
        .subscribe((status: any) => {
          console.log(`Supabase subscription status for ${collectionName}:`, status)
        })

      this.supabaseUnsubscribers.push(() => supabase.removeChannel(subscription))
    })
  }

  // Listen to Firebase changes
  private setupFirebaseListeners() {
    // Skip Firebase listeners if Firebase isn't loaded
    if (!db || !collection || !query || !onSnapshot) {
      console.log('Firebase not available, skipping Firebase listeners')
      this.updateSyncStatus('firebase', { lastError: 'Firebase not configured' })
      return
    }

    const collections = ['users', 'agents', 'customers', 'transactions', 'float_requests', 'float_exchanges', 'audit_log', 'registration_alerts', 'password_reset_requests']

    collections.forEach(collectionName => {
      const q = query(collection(db, collectionName))
      const unsubscribe = onSnapshot(q, (snapshot: any) => {
        snapshot.docChanges().forEach((change: any) => {
          console.log(`Firebase change detected in ${collectionName}:`, change)
          this.handleFirebaseChange(collectionName, change)
        })
      }, (error: any) => {
        console.error(`Firebase listener error for ${collectionName}:`, error)
        this.updateSyncStatus('firebase', { lastError: error.message })
      })

      this.firebaseUnsubscribers.push(unsubscribe)
    })
  }

  // Handle Supabase changes and sync to Firebase
  private async handleSupabaseChange(collection: string, payload: any) {
    const record: SyncRecord = {
      id: `${Date.now()}-${Math.random()}`,
      source: 'supabase',
      target: 'firebase',
      action: this.mapPostgresEventToAction(payload.eventType),
      collection,
      documentId: payload.new?.id || payload.old?.id,
      data: payload.new || payload.old,
      timestamp: new Date(),
      status: 'pending',
    }

    this.syncQueue.push(record)
    this.updateSyncStatus('supabase', { pendingChanges: this.syncQueue.length })
    this.notifySubscribers()
  }

  // Handle Firebase changes and sync to Supabase
  private async handleFirebaseChange(collection: string, change: any) {
    const record: SyncRecord = {
      id: `${Date.now()}-${Math.random()}`,
      source: 'firebase',
      target: 'supabase',
      action: this.mapFirestoreChangeToAction(change.type),
      collection,
      documentId: change.doc.id,
      data: change.doc.data(),
      timestamp: new Date(),
      status: 'pending',
    }

    this.syncQueue.push(record)
    this.updateSyncStatus('firebase', { pendingChanges: this.syncQueue.length })
    this.notifySubscribers()
  }

  // Process sync queue
  private async startSyncProcessor() {
    setInterval(() => {
      this.processSyncQueue()
    }, 1000) // Process every second
  }

  private async processSyncQueue() {
    if (this.isProcessing || this.syncQueue.length === 0) return

    this.isProcessing = true

    while (this.syncQueue.length > 0) {
      const record = this.syncQueue.shift()!
      
      try {
        await this.executeSync(record)
        record.status = 'completed'
      } catch (error) {
        record.status = 'failed'
        record.error = `${error}`
        console.error('Sync failed:', record, error)
      }

      // Log sync record to Firebase for tracking
      await this.logSyncRecord(record)
    }

    this.isProcessing = false
    this.notifySubscribers()
  }

  // Execute individual sync operation
  private async executeSync(record: SyncRecord) {
    if (record.source === 'supabase' && record.target === 'firebase') {
      await this.syncSupabaseToFirebase(record)
    } else if (record.source === 'firebase' && record.target === 'supabase') {
      await this.syncFirebaseToSupabase(record)
    }
  }

  // Sync from Supabase to Firebase
  private async syncSupabaseToFirebase(record: SyncRecord) {
    // Skip Firebase sync if Firebase isn't available
    if (!db || !doc || !getDoc || !setDoc || !serverTimestamp) {
      console.log('Firebase not available, skipping Supabase to Firebase sync')
      record.status = 'completed' // Mark as completed since we're not syncing to Firebase
      return
    }

    const docRef = doc(db, record.collection, record.documentId)

    if (record.action === 'delete') {
      await this.deleteWithRetry(docRef)
    } else {
      // Check for conflicts
      const existingDoc = await getDoc(docRef)
      if (existingDoc.exists()) {
        const existingData = existingDoc.data()
        const conflict = this.detectConflict(existingData, record.data)

        if (conflict) {
          record.status = 'failed'
          record.error = 'Conflict detected - manual resolution required'
          this.updateSyncStatus('firebase', { conflicts: this.syncStatus.get('firebase')!.conflicts + 1 })
          throw new Error('Conflict detected')
        }
      }

      await this.setDocWithRetry(docRef, {
        ...record.data,
        synced_from: 'supabase',
        synced_at: serverTimestamp(),
      })
    }

    this.updateSyncStatus('firebase', { lastSynced: new Date() })
  }

  // Sync from Firebase to Supabase
  private async syncFirebaseToSupabase(record: SyncRecord) {
    if (record.action === 'delete') {
      await supabaseAdmin
        .from(record.collection)
        .delete()
        .eq('id', record.documentId)
    } else {
      // Check for conflicts
      const { data: existingData } = await supabaseAdmin
        .from(record.collection)
        .select('*')
        .eq('id', record.documentId)
        .single()

      if (existingData) {
        const conflict = this.detectConflict(existingData, record.data)
        
        if (conflict) {
          record.status = 'failed'
          record.error = 'Conflict detected - manual resolution required'
          this.updateSyncStatus('supabase', { conflicts: this.syncStatus.get('supabase')!.conflicts + 1 })
          throw new Error('Conflict detected')
        }

        await supabaseAdmin
          .from(record.collection)
          .update({
            ...record.data,
            synced_from: 'firebase',
            synced_at: new Date().toISOString(),
          })
          .eq('id', record.documentId)
      } else {
        await supabaseAdmin
          .from(record.collection)
          .insert({
            ...record.data,
            synced_from: 'firebase',
            synced_at: new Date().toISOString(),
          })
      }
    }

    this.updateSyncStatus('supabase', { lastSynced: new Date() })
  }

  // Conflict detection
  private detectConflict(existing: Record<string, unknown>, incoming: Record<string, unknown>): boolean {
    const existingTimestamp = existing.updated_at || existing.created_at
    const incomingTimestamp = incoming.updated_at || incoming.created_at

    if (!existingTimestamp || !incomingTimestamp) {
      // If no timestamps, assume conflict
      return true
    }

    const existingTime = new Date(existingTimestamp as string).getTime()
    const incomingTime = new Date(incomingTimestamp as string).getTime()

    // If incoming is older than existing by more than 1 second, it's a conflict
    return incomingTime < existingTime - 1000
  }

  // Helper: Map PostgreSQL event types to sync actions
  private mapPostgresEventToAction(eventType: string): 'create' | 'update' | 'delete' {
    switch (eventType) {
      case 'INSERT':
        return 'create'
      case 'UPDATE':
        return 'update'
      case 'DELETE':
        return 'delete'
      default:
        return 'update'
    }
  }

  // Helper: Map Firestore change types to sync actions
  private mapFirestoreChangeToAction(changeType: string): 'create' | 'update' | 'delete' {
    switch (changeType) {
      case 'added':
        return 'create'
      case 'modified':
        return 'update'
      case 'removed':
        return 'delete'
      default:
        return 'update'
    }
  }

  // Retry helpers for Firebase operations
  private async setDocWithRetry(docRef: any, data: any, maxRetries = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await setDoc(docRef, data)
        return
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  private async deleteWithRetry(docRef: any, maxRetries = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (deleteDoc) {
          await deleteDoc(docRef)
        } else {
          // Fallback to update with deleted flag if deleteDoc not available
          await updateDoc(docRef, { _deleted: true })
        }
        return
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  // Log sync record to Firebase for tracking
  private async logSyncRecord(record: SyncRecord) {
    // Skip Firebase logging if Firebase isn't available
    if (!db || !doc || !setDoc) {
      return
    }

    try {
      const syncLogRef = doc(db, 'sync_logs', record.id)
      await setDoc(syncLogRef, {
        ...record,
        timestamp: record.timestamp.toISOString(),
      })
    } catch (error) {
      console.error('Failed to log sync record:', error)
    }
  }

  // Update sync status
  private updateSyncStatus(platform: string, updates: Partial<SyncStatus>) {
    const current = this.syncStatus.get(platform)!
    this.syncStatus.set(platform, { ...current, ...updates })
    this.notifySubscribers()
  }

  // Notify subscribers of sync status changes
  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.syncStatus))
  }

  // Public: Subscribe to sync status changes
  public subscribe(callback: (status: Map<string, SyncStatus>) => void) {
    this.subscribers.add(callback)
    callback(this.syncStatus)

    return () => {
      this.subscribers.delete(callback)
    }
  }

  // Public: Get current sync status
  public getSyncStatus(): Map<string, SyncStatus> {
    return new Map(this.syncStatus)
  }

  // Public: Manual trigger for sync
  public async triggerSync(collection?: string) {
    if (collection) {
      // Sync specific collection
      await this.syncCollection(collection)
    } else {
      // Sync all collections
      const collections = ['users', 'agents', 'customers', 'transactions', 'float_requests', 'float_exchanges', 'audit_log', 'registration_alerts', 'password_reset_requests']
      await Promise.all(collections.map(c => this.syncCollection(c)))
    }
  }

  // Sync a specific collection from both platforms
  private async syncCollection(collectionName: string) {
    this.updateSyncStatus('supabase', { isSyncing: true })
    this.updateSyncStatus('firebase', { isSyncing: true })

    try {
      // Sync from Supabase to Firebase (only if Firebase is available)
      if (db && doc && serverTimestamp) {
        const { data: supabaseData } = await supabaseAdmin
          .from(collectionName)
          .select('*')

        if (supabaseData) {
          for (const item of supabaseData) {
            const docRef = doc(db, collectionName, item.id)
            await this.setDocWithRetry(docRef, {
              ...item,
              synced_from: 'supabase',
              synced_at: serverTimestamp(),
            })
          }
        }
      }

      // Sync from Firebase to Supabase (only if Firebase is available)
      if (db && collection && query && getDocs) {
        const firebaseQuery = query(collection(db, collectionName))
        const firebaseSnapshot = await getDocs(firebaseQuery)

        for (const doc of firebaseSnapshot.docs) {
          const data = doc.data()
          if (data._deleted) continue // Skip deleted records

          const { data: existingData } = await supabaseAdmin
            .from(collectionName)
            .select('*')
            .eq('id', doc.id)
            .single()

          if (existingData) {
            await supabaseAdmin
              .from(collectionName)
              .update({
                ...data,
                synced_from: 'firebase',
                synced_at: new Date().toISOString(),
              })
              .eq('id', doc.id)
          } else {
            await supabaseAdmin
              .from(collectionName)
              .insert({
                ...data,
                synced_from: 'firebase',
                synced_at: new Date().toISOString(),
              })
          }
        }
      }

      this.updateSyncStatus('supabase', { lastSynced: new Date(), isSyncing: false })
      this.updateSyncStatus('firebase', { lastSynced: new Date(), isSyncing: false })
    } catch (error) {
      console.error(`Error syncing collection ${collectionName}:`, error)
      this.updateSyncStatus('supabase', { isSyncing: false, lastError: `${error}` })
      this.updateSyncStatus('firebase', { isSyncing: false, lastError: `${error}` })
    }
  }

  // Register device for sync tracking
  public registerDevice(deviceId: string, platform: string) {
    const deviceInfo: DeviceInfo = {
      deviceId,
      platform,
      lastSeen: new Date(),
      lastSynced: new Date(),
      isOnline: true,
    }

    this.devices.set(deviceId, deviceInfo)

    // Store in Firebase for cross-device sync
    setDoc(doc(db, 'devices', deviceId), deviceInfo).catch((err: any) => {
      console.error('Failed to register device:', err)
    })
  }

  // Update device heartbeat
  public updateDeviceHeartbeat(deviceId: string) {
    const device = this.devices.get(deviceId)
    if (device) {
      device.lastSeen = new Date()
      device.isOnline = true
      this.devices.set(deviceId, device)

      updateDoc(doc(db, 'devices', deviceId), {
        lastSeen: new Date().toISOString(),
        isOnline: true,
      }).catch((err: any) => {
        console.error('Failed to update device heartbeat:', err)
      })
    }
  }

  // Get all registered devices
  public getDevices(): DeviceInfo[] {
    return Array.from(this.devices.values())
  }

  // Cleanup
  public destroy() {
    this.supabaseUnsubscribers.forEach(unsub => unsub())
    this.firebaseUnsubscribers.forEach(unsub => unsub())
    this.subscribers.clear()
    this.syncQueue = []
  }
}

// Singleton instance
export const syncService = new SyncService()
