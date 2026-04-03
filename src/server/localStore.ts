import { promises as fs } from 'fs'
import { existsSync, readFileSync, mkdirSync } from 'fs'
import path from 'path'

type BlobEntry = { key: string }
class SimpleStore {
  private store: Record<string, any> = {}
  private file: string
  constructor(private name: string) {
    const dataDir = path.join(process.cwd(), 'data')
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }
    this.file = path.join(dataDir, `${name}.json`)
    this.load()
  }
  private load() {
    try {
      if (existsSync(this.file)) {
        const raw = readFileSync(this.file, 'utf8')
        this.store = JSON.parse(raw)
      } else {
        this.store = {}
      }
    } catch {
      this.store = {}
    }
  }
  async get(id: string, _opts: { type?: string } = {}) {
    return this.store[id] ?? null
  }
  async setJSON(id: string, value: any) {
    this.store[id] = value
    await fs.writeFile(this.file, JSON.stringify(this.store, null, 2), 'utf8')
  }
  async list(): Promise<{ blobs: BlobEntry[] }> {
    const keys = Object.keys(this.store)
    return { blobs: keys.map(k => ({ key: k })) }
  }
}

// Simple global registry of stores per name
const registry: Record<string, SimpleStore> = {}
export function getStore(name: string) {
  if (!registry[name]) registry[name] = new SimpleStore(name)
  // @ts-ignore - actual methods used by callers
  return registry[name]
}
