interface KVNamespacePutOptions {
  expirationTtl?: number
}

interface KVNamespaceListKey {
  name: string
}

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: KVNamespacePutOptions): Promise<void>
  delete(key: string): Promise<void>
  list(): Promise<{ keys: KVNamespaceListKey[] }>
}

interface CloudflareEnv {
  KV: KVNamespace
  ENCRYPTION_KEY: string
}
