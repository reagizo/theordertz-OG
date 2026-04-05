// Capacitor-compatible localStorage-based store (replaces Node.js localStore)

interface StoreItem {
  value: string
  metadata?: Record<string, unknown>
}

interface Store {
  get: (key: string, options?: { type?: 'json' | 'text' }) => any
  setJSON: (key: string, value: any) => Promise<void>
  set: (key: string, value: string) => Promise<void>
  delete: (key: string) => Promise<void>
  list: () => Promise<{ blobs: Array<{ key: string }> }>
}

const stores = new Map<string, Map<string, StoreItem>>()

export function getStore(name: string): Store {
  if (!stores.has(name)) {
    stores.set(name, new Map())
  }
  const store = stores.get(name)!
  
  return {
    get(key: string, options?: { type?: 'json' | 'text' }) {
      const item = store.get(key)
      if (!item) return null
      if (options?.type === 'json') {
        try {
          return JSON.parse(item.value)
        } catch {
          return null
        }
      }
      return item.value
    },
    async setJSON(key: string, value: any) {
      store.set(key, { value: JSON.stringify(value) })
    },
    async set(key: string, value: string) {
      store.set(key, { value })
    },
    async delete(key: string) {
      store.delete(key)
    },
    async list() {
      const blobs = Array.from(store.keys()).map(key => ({ key }))
      return { blobs }
    },
  }
}
