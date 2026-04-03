import { promises as fs } from 'fs'
import { existsSync, readFileSync, mkdirSync } from 'fs'
import path from 'path'

type BlobEntry = { key: string }

class SimpleStore {
  private store: Record<string, any> = {}
  private file: string
  private name: string
  private isWritable: boolean = true

  constructor(name: string) {
    this.name = name
    const dataDir = path.join(process.cwd(), 'data')
    
    // Safe directory creation
    try {
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true })
      }
      // Test write access
      const testFile = path.join(dataDir, '.write_test')
      fs.writeFileSync(testFile, 'test')
      fs.unlinkSync(testFile)
    } catch (err) {
      console.warn(`Warning: Data directory is read-only. Using memory store only for ${name}.`)
      this.isWritable = false
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
    if (this.isWritable) {
      try {
        await fs.writeFile(this.file, JSON.stringify(this.store, null, 2), 'utf8')
      } catch (err) {
        console.error(`Error saving ${this.name}:`, err)
      }
    }
  }

  async delete(id: string) {
    delete this.store[id]
    if (this.isWritable) {
      try {
        await fs.writeFile(this.file, JSON.stringify(this.store, null, 2), 'utf8')
      } catch (err) {
        console.error(`Error deleting from ${this.name}:`, err)
      }
    }
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
  return registry[name]
}