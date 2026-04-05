/**
 * 获取 KV 绑定的辅助函数
 * 支持两种环境: Cloudflare Pages 和本地开发
 */

type KVEntry = {
  value: string
  expiresAt?: number
}

type KVStore = Record<string, KVEntry>

const fallbackMemoryStore = new Map<string, KVEntry>()
const cloudflareRequestContextSymbol = Symbol.for("__cloudflare-request-context__")

type CloudflareRequestContext = {
  env?: {
    KV?: KVNamespace
  }
}

class LocalFileKV implements KVNamespace {
  private storagePath: string | null = null
  private writeQueue: Promise<void> = Promise.resolve()

  private getStoragePath(): string | null {
    if (this.storagePath !== null) {
      return this.storagePath
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("node:path") as typeof import("node:path")
      this.storagePath = path.join(process.cwd(), ".dev-data", "kv-store.json")
      return this.storagePath
    } catch {
      this.storagePath = null
      return null
    }
  }

  private async withLock<T>(task: () => Promise<T>): Promise<T> {
    const previous = this.writeQueue
    let release!: () => void

    this.writeQueue = new Promise<void>((resolve) => {
      release = resolve
    })

    await previous

    try {
      return await task()
    } finally {
      release()
    }
  }

  private readMemoryStore(): KVStore {
    return Object.fromEntries(fallbackMemoryStore.entries())
  }

  private writeMemoryStore(store: KVStore): void {
    fallbackMemoryStore.clear()
    Object.entries(store).forEach(([key, value]) => {
      fallbackMemoryStore.set(key, value)
    })
  }

  private pruneExpired(store: KVStore): { store: KVStore; changed: boolean } {
    const nextStore: KVStore = {}
    let changed = false

    Object.entries(store).forEach(([key, entry]) => {
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        changed = true
        return
      }
      nextStore[key] = entry
    })

    return { store: nextStore, changed }
  }

  private async readStore(): Promise<KVStore> {
    const storagePath = this.getStoragePath()
    if (!storagePath) {
      return this.readMemoryStore()
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("node:fs/promises") as typeof import("node:fs/promises")
      const raw = await fs.readFile(storagePath, "utf8")
      if (!raw.trim()) return {}
      return JSON.parse(raw) as KVStore
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
        return {}
      }

      console.warn("读取本地 KV 失败，回退到内存存储:", error)
      return this.readMemoryStore()
    }
  }

  private async writeStore(store: KVStore): Promise<void> {
    const storagePath = this.getStoragePath()
    if (!storagePath) {
      this.writeMemoryStore(store)
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("node:fs/promises") as typeof import("node:fs/promises")
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("node:path") as typeof import("node:path")

      await fs.mkdir(path.dirname(storagePath), { recursive: true })
      await fs.writeFile(storagePath, JSON.stringify(store, null, 2), "utf8")
    } catch (error) {
      console.warn("写入本地 KV 失败，回退到内存存储:", error)
      this.writeMemoryStore(store)
    }
  }

  async get(key: string): Promise<string | null> {
    return this.withLock(async () => {
      const rawStore = await this.readStore()
      const { store, changed } = this.pruneExpired(rawStore)
      const entry = store[key]

      if (changed) {
        await this.writeStore(store)
      }

      return entry?.value ?? null
    })
  }

  async put(key: string, value: string, options?: KVNamespacePutOptions): Promise<void> {
    await this.withLock(async () => {
      const store = await this.readStore()
      const entry: KVEntry = { value }
      if (options?.expirationTtl) {
        entry.expiresAt = Date.now() + options.expirationTtl * 1000
      }
      store[key] = entry
      await this.writeStore(store)
    })
  }

  async delete(key: string): Promise<void> {
    await this.withLock(async () => {
      const store = await this.readStore()
      delete store[key]
      await this.writeStore(store)
    })
  }

  async list(): Promise<{ keys: Array<{ name: string }> }> {
    return this.withLock(async () => {
      const rawStore = await this.readStore()
      const { store, changed } = this.pruneExpired(rawStore)

      if (changed) {
        await this.writeStore(store)
      }

      return { keys: Object.keys(store).map((name) => ({ name })) }
    })
  }
}

let localFileKV: LocalFileKV | null = null

function isLocalFallbackEnabled(): boolean {
  try {
    if (typeof process === "undefined") {
      return false
    }

    return process.env.NODE_ENV === "development" || process.env.ENABLE_LOCAL_KV_FALLBACK === "true"
  } catch {
    return false
  }
}

export function getKV(): KVNamespace {
  // 1. 尝试 Cloudflare Pages request context
  try {
    const ctx = (globalThis as typeof globalThis & {
      [cloudflareRequestContextSymbol]?: CloudflareRequestContext
    })[cloudflareRequestContextSymbol]

    if (ctx?.env?.KV) {
      return ctx.env.KV
    }
  } catch {
    // Not in Cloudflare environment
  }

  // 2. 尝试 process.env
  try {
    if (typeof process !== "undefined" && (process.env as Record<string, unknown>).KV) {
      return (process.env as Record<string, unknown>).KV as KVNamespace
    }
  } catch {
    // ignore
  }

  // 3. 仅在开发环境允许回退到本地持久化文件存储，避免掩盖线上绑定问题
  if (isLocalFallbackEnabled()) {
    if (!localFileKV) {
      localFileKV = new LocalFileKV()
    }
    return localFileKV
  }

  throw new Error("未检测到 Cloudflare KV 绑定。非开发环境请配置 KV，或显式设置 ENABLE_LOCAL_KV_FALLBACK=true。")
}

export function getEncryptionKey(): string {
  try {
    return process.env.ENCRYPTION_KEY || "default-dev-key-change-in-production"
  } catch {
    return "default-dev-key-change-in-production"
  }
}
