/**
 * Cloudflare KV 存储操作
 */

import { getKV, getEncryptionKey } from "./get-kv"
import { encrypt, decrypt, hashPassword } from "./encryption"

// 用户类型
export interface User {
  id: number
  username: string
  passwordHash: string
  salt: string
  email: string
  createdAt: string
}

// API密钥类型
export interface ApiKey {
  id: number
  userId: number
  name: string
  key: string
  type: "apikey" | "complex"
  provider: string
  rechargeUrl?: string
  appId?: string
  secretKey?: string
  baseUrl: string
  createdAt: string
  lastUsed: string
}

// 系统设置类型
export interface SystemSettings {
  defaultKeyType: "apikey" | "complex"
}

// 会话类型
export interface Session {
  userId: number
  username: string
  createdAt: string
}

export class UserConflictError extends Error {
  constructor(message = "用户名已存在") {
    super(message)
    this.name = "UserConflictError"
  }
}

// 连接测试结果类型
export interface ConnectionTestResult {
  status: number
  message: string
  testedAt: string
  latency: number
}

const DEFAULT_SETTINGS: SystemSettings = {
  defaultKeyType: "apikey",
}

// ========== 初始化 ==========

export async function initializeDefaultData(): Promise<void> {
  const kv = getKV()
  const existingUser = await kv.get("user:admin")
  if (existingUser) return

  // 创建默认 admin 用户，密码为 "password"
  const { hash: passwordHash, salt } = await hashPassword("password")

  const defaultUser: User = {
    id: 1,
    username: "admin",
    passwordHash,
    salt,
    email: "admin@example.com",
    createdAt: new Date().toISOString().split("T")[0],
  }

  await kv.put("user:admin", JSON.stringify(defaultUser))
  await kv.put("settings:global", JSON.stringify(DEFAULT_SETTINGS))
}

// ========== 用户操作 ==========

export const userKV = {
  async getByUsername(username: string): Promise<User | null> {
    const kv = getKV()
    const data = await kv.get(`user:${username}`)
    return data ? JSON.parse(data) : null
  },

  async update(username: string, data: Partial<User>): Promise<User | null> {
    const kv = getKV()
    const user = await this.getByUsername(username)
    if (!user) return null
    const nextUsername = typeof data.username === "string" ? data.username.trim() : user.username

    if (nextUsername !== username) {
      const existingUser = await this.getByUsername(nextUsername)
      if (existingUser) {
        throw new UserConflictError()
      }
    }

    const updated = { ...user, ...data, username: nextUsername }
    await kv.put(`user:${nextUsername}`, JSON.stringify(updated))

    if (nextUsername !== username) {
      await kv.delete(`user:${username}`)
    }

    return updated
  },
}

// ========== API 密钥操作 ==========

export const apiKeysKV = {
  async getByUserId(userId: number): Promise<ApiKey[]> {
    const kv = getKV()
    const encKey = getEncryptionKey()
    const data = await kv.get(`keys:${userId}`)
    if (!data) return []
    const keys: ApiKey[] = JSON.parse(data)
    // 解密密钥字段
    return await Promise.all(
      keys.map(async (k) => ({
        ...k,
        key: k.key ? await decrypt(k.key, encKey) : "",
        appId: k.appId ? await decrypt(k.appId, encKey) : undefined,
        secretKey: k.secretKey ? await decrypt(k.secretKey, encKey) : undefined,
      }))
    )
  },

  async addKey(userId: number, keyData: Omit<ApiKey, "id" | "createdAt" | "lastUsed">): Promise<ApiKey> {
    const kv = getKV()
    const encKey = getEncryptionKey()
    const raw = await kv.get(`keys:${userId}`)
    const keys: ApiKey[] = raw ? JSON.parse(raw) : []

    const newKey: ApiKey = {
      ...keyData,
      id: keys.length > 0 ? Math.max(...keys.map((k) => k.id)) + 1 : 1,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: "-",
    }

    // 加密敏感字段后存储
    const encrypted = {
      ...newKey,
      key: await encrypt(newKey.key, encKey),
      appId: newKey.appId ? await encrypt(newKey.appId, encKey) : undefined,
      secretKey: newKey.secretKey ? await encrypt(newKey.secretKey, encKey) : undefined,
    }

    keys.push(encrypted)
    await kv.put(`keys:${userId}`, JSON.stringify(keys))
    return newKey
  },

  async updateKey(userId: number, keyId: number, data: Partial<ApiKey>): Promise<ApiKey | null> {
    const kv = getKV()
    const encKey = getEncryptionKey()
    const raw = await kv.get(`keys:${userId}`)
    if (!raw) return null
    const keys: ApiKey[] = JSON.parse(raw)
    const index = keys.findIndex((k) => k.id === keyId)
    if (index === -1) return null

    // 如果更新了敏感字段，需要重新加密
    const updateData = { ...data }
    if (updateData.key) {
      updateData.key = await encrypt(updateData.key, encKey)
    }
    if (updateData.appId) {
      updateData.appId = await encrypt(updateData.appId, encKey)
    }
    if (updateData.secretKey) {
      updateData.secretKey = await encrypt(updateData.secretKey, encKey)
    }

    keys[index] = { ...keys[index], ...updateData }
    await kv.put(`keys:${userId}`, JSON.stringify(keys))

    // 返回解密后的数据
    return {
      ...keys[index],
      key: keys[index].key ? await decrypt(keys[index].key, encKey) : "",
      appId: keys[index].appId ? await decrypt(keys[index].appId, encKey) : undefined,
      secretKey: keys[index].secretKey ? await decrypt(keys[index].secretKey, encKey) : undefined,
    }
  },

  async deleteKey(userId: number, keyId: number): Promise<boolean> {
    const kv = getKV()
    const raw = await kv.get(`keys:${userId}`)
    if (!raw) return false
    const keys: ApiKey[] = JSON.parse(raw)
    const index = keys.findIndex((k) => k.id === keyId)
    if (index === -1) return false
    keys.splice(index, 1)
    await kv.put(`keys:${userId}`, JSON.stringify(keys))
    return true
  },
}

// ========== 设置操作 ==========

export const settingsKV = {
  async get(): Promise<SystemSettings> {
    const kv = getKV()
    const data = await kv.get("settings:global")
    return data ? JSON.parse(data) : DEFAULT_SETTINGS
  },

  async update(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const kv = getKV()
    const current = await this.get()
    const updated = { ...current, ...data }
    await kv.put("settings:global", JSON.stringify(updated))
    return updated
  },
}

// ========== 会话操作 ==========

const SESSION_TTL = 7 * 24 * 60 * 60

export const sessionKV = {
  async create(userId: number, username: string): Promise<string> {
    const kv = getKV()
    // 兼容 Node.js 和浏览器环境的随机 ID 生成
    const sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? (crypto as { randomUUID: () => string }).randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`
    const session: Session = {
      userId,
      username,
      createdAt: new Date().toISOString(),
    }
    await kv.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: SESSION_TTL })
    return sessionId
  },

  async get(sessionId: string): Promise<Session | null> {
    const kv = getKV()
    const data = await kv.get(`session:${sessionId}`)
    return data ? JSON.parse(data) : null
  },

  async update(sessionId: string, data: Partial<Session>): Promise<Session | null> {
    const kv = getKV()
    const session = await this.get(sessionId)
    if (!session) return null

    const updated = { ...session, ...data }
    await kv.put(`session:${sessionId}`, JSON.stringify(updated), { expirationTtl: SESSION_TTL })
    return updated
  },

  async delete(sessionId: string): Promise<void> {
    const kv = getKV()
    await kv.delete(`session:${sessionId}`)
  },
}

// ========== 连接测试缓存 ==========

const CACHE_TTL = 24 * 60 * 60

export const cacheKV = {
  async getTestResult(keyId: number): Promise<ConnectionTestResult | null> {
    const kv = getKV()
    const data = await kv.get(`cache:test:${keyId}`)
    return data ? JSON.parse(data) : null
  },

  async setTestResult(keyId: number, result: ConnectionTestResult): Promise<void> {
    const kv = getKV()
    await kv.put(`cache:test:${keyId}`, JSON.stringify(result), { expirationTtl: CACHE_TTL })
  },
}

// ========== 认证辅助 ==========

export function getSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") || ""
  const match = cookieHeader.match(/session_id=([^;]+)/)
  return match ? match[1] : null
}

export async function getSessionFromRequest(request: Request): Promise<Session | null> {
  const sessionId = getSessionIdFromRequest(request)
  if (!sessionId) return null
  return sessionKV.get(sessionId)
}

export function createSessionCookie(sessionId: string): string {
  return `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL}`
}

export function clearSessionCookie(): string {
  return "session_id=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
}
