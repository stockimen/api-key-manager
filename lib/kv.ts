/**
 * Cloudflare KV 存储操作
 */

import { decrypt, encrypt, hashPassword } from "./encryption"
import { getEncryptionKey, getKV, isDevelopmentEnvironment } from "./get-kv"
import { normalizeApiKeyTags } from "./api-key-tags"
import {
  DEFAULT_KEY_CATEGORY_ID,
  type KeyCategory,
  ensureValidKeyCategoryId,
  normalizeKeyCategories,
  normalizeStoredKeyCategoryId,
} from "./key-categories"

export type UserRole = "admin" | "user"

// 用户类型
export interface User {
  id: number
  username: string
  passwordHash: string
  salt: string
  email: string
  role: UserRole
  otpSecret?: string
  otpEnabled?: boolean
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
  monitorOnDashboard: boolean
  priority: number
  categoryId: string
  supplement: string
  tags: string[]
  createdAt: string
  lastUsed: string
}

// 存储层类型（旧数据可能缺少 monitorOnDashboard 和 priority）
type StoredApiKey = Omit<ApiKey, "monitorOnDashboard" | "priority" | "categoryId" | "supplement" | "tags"> & {
  monitorOnDashboard?: boolean
  priority?: number
  categoryId?: unknown
  supplement?: unknown
  tags?: unknown
}

// 系统设置类型
export interface SystemSettings {
  defaultKeyType: "apikey" | "complex"
  defaultKeyCategoryId: string
  defaultListCategoryId: string
  keyCategories: KeyCategory[]
  initialized: boolean
}

// 会话类型
export interface Session {
  userId: number
  username: string
  role: UserRole
  createdAt: string
}

export interface LoginRateLimitRecord {
  count: number
  firstAttemptAt: string
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
  defaultKeyCategoryId: DEFAULT_KEY_CATEGORY_ID,
  defaultListCategoryId: DEFAULT_KEY_CATEGORY_ID,
  keyCategories: normalizeKeyCategories(null),
  initialized: false,
}

const SESSION_TTL = 7 * 24 * 60 * 60
const CACHE_TTL = 24 * 60 * 60
const LOGIN_RATE_LIMIT_TTL = 15 * 60
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 10

// ========== 用户操作 ==========

function normalizeRole(role: string | undefined): UserRole {
  return role === "admin" ? "admin" : "user"
}

function normalizeUser(user: Omit<User, "role"> & { role?: string }): User {
  return {
    ...user,
    role: normalizeRole(user.role),
  }
}

export const userKV = {
  async getByUsername(username: string): Promise<User | null> {
    const kv = getKV()
    const data = await kv.get(`user:${username}`)
    if (!data) {
      return null
    }

    return normalizeUser(JSON.parse(data) as Omit<User, "role"> & { role?: string })
  },

  async getAll(): Promise<User[]> {
    const kv = getKV()
    const listResult = await kv.list({ prefix: "user:" })
    const users = await Promise.all(
      listResult.keys.map(async ({ name }) => {
        const raw = await kv.get(name)
        return raw ? normalizeUser(JSON.parse(raw) as Omit<User, "role"> & { role?: string }) : null
      }),
    )

    return users.filter((user): user is User => user !== null)
  },

  async count(): Promise<number> {
    const users = await this.getAll()
    return users.length
  },

  async create(data: Omit<User, "id" | "createdAt">): Promise<User> {
    const kv = getKV()
    const users = await this.getAll()

    const newUser: User = {
      ...data,
      role: normalizeRole(data.role),
      id: users.length > 0 ? Math.max(...users.map((user) => user.id)) + 1 : 1,
      createdAt: new Date().toISOString().split("T")[0],
    }

    await kv.put(`user:${newUser.username}`, JSON.stringify(newUser))
    return newUser
  },

  async update(username: string, data: Partial<User>): Promise<User | null> {
    const kv = getKV()
    const user = await this.getByUsername(username)
    if (!user) {
      return null
    }

    const nextUsername = typeof data.username === "string" ? data.username.trim() : user.username

    if (nextUsername !== username) {
      const existingUser = await this.getByUsername(nextUsername)
      if (existingUser) {
        throw new UserConflictError()
      }
    }

    const updated: User = {
      ...user,
      ...data,
      username: nextUsername,
      role: normalizeRole(data.role ?? user.role),
    }

    await kv.put(`user:${nextUsername}`, JSON.stringify(updated))

    if (nextUsername !== username) {
      await kv.delete(`user:${username}`)
    }

    return updated
  },
}

// ========== API 密钥操作 ==========

function normalizeApiKey(apiKey: StoredApiKey): ApiKey {
  return {
    ...apiKey,
    monitorOnDashboard: apiKey.monitorOnDashboard !== false,
    priority: apiKey.priority ?? 0,
    categoryId: normalizeStoredKeyCategoryId(apiKey.categoryId),
    supplement: typeof apiKey.supplement === "string" ? apiKey.supplement : "",
    tags: normalizeApiKeyTags(apiKey.tags),
  }
}

async function getStoredApiKeys(userId: number): Promise<ApiKey[]> {
  const kv = getKV()
  const data = await kv.get(`keys:${userId}`)
  if (!data) return []
  return (JSON.parse(data) as StoredApiKey[]).map(normalizeApiKey)
}

async function decryptApiKeyRecord(apiKey: ApiKey, encryptionKey: string): Promise<ApiKey> {
  return {
    ...apiKey,
    key: apiKey.key ? await decrypt(apiKey.key, encryptionKey) : "",
    appId: apiKey.appId ? await decrypt(apiKey.appId, encryptionKey) : undefined,
    secretKey: apiKey.secretKey ? await decrypt(apiKey.secretKey, encryptionKey) : undefined,
  }
}

export const apiKeysKV = {
  async getByUserId(userId: number): Promise<ApiKey[]> {
    const encKey = getEncryptionKey()
    const keys = await getStoredApiKeys(userId)
    return Promise.all(keys.map((key) => decryptApiKeyRecord(key, encKey)))
  },

  async getById(userId: number, keyId: number): Promise<ApiKey | null> {
    const encKey = getEncryptionKey()
    const keys = await getStoredApiKeys(userId)
    const apiKey = keys.find((key) => key.id === keyId)
    if (!apiKey) {
      return null
    }

    return decryptApiKeyRecord(apiKey, encKey)
  },

  async exists(userId: number, keyId: number): Promise<boolean> {
    const keys = await getStoredApiKeys(userId)
    return keys.some((key) => key.id === keyId)
  },

  async addKey(userId: number, keyData: Omit<ApiKey, "id" | "createdAt" | "lastUsed">): Promise<ApiKey> {
    const kv = getKV()
    const encKey = getEncryptionKey()
    const keys = await getStoredApiKeys(userId)

    const newKey: ApiKey = {
      ...keyData,
      monitorOnDashboard: keyData.monitorOnDashboard === true,
      priority: keyData.priority ?? 0,
      categoryId: normalizeStoredKeyCategoryId(keyData.categoryId),
      supplement: typeof keyData.supplement === "string" ? keyData.supplement : "",
      tags: normalizeApiKeyTags(keyData.tags),
      id: keys.length > 0 ? Math.max(...keys.map((k) => k.id)) + 1 : 1,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: "-",
    }

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
    const keys = await getStoredApiKeys(userId)
    const index = keys.findIndex((k) => k.id === keyId)
    if (index === -1) return null

    const updateData = { ...data }
    if ("categoryId" in updateData) {
      if (updateData.categoryId === undefined) {
        delete updateData.categoryId
      } else {
        updateData.categoryId = normalizeStoredKeyCategoryId(updateData.categoryId)
      }
    }
    if ("supplement" in updateData) {
      if (updateData.supplement === undefined) {
        delete updateData.supplement
      } else {
        updateData.supplement = typeof updateData.supplement === "string" ? updateData.supplement : ""
      }
    }
    if ("tags" in updateData) {
      if (updateData.tags === undefined) {
        delete updateData.tags
      } else {
        updateData.tags = normalizeApiKeyTags(updateData.tags)
      }
    }
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

    return {
      ...keys[index],
      key: keys[index].key ? await decrypt(keys[index].key, encKey) : "",
      appId: keys[index].appId ? await decrypt(keys[index].appId, encKey) : undefined,
      secretKey: keys[index].secretKey ? await decrypt(keys[index].secretKey, encKey) : undefined,
    }
  },

  async deleteKey(userId: number, keyId: number): Promise<boolean> {
    const kv = getKV()
    const keys = await getStoredApiKeys(userId)
    const index = keys.findIndex((k) => k.id === keyId)
    if (index === -1) return false
    keys.splice(index, 1)
    await kv.put(`keys:${userId}`, JSON.stringify(keys))
    return true
  },
}

// ========== 设置操作 ==========

function normalizeSettings(settings: Partial<SystemSettings> | null): SystemSettings {
  const keyCategories = normalizeKeyCategories(settings?.keyCategories)

  return {
    defaultKeyType: settings?.defaultKeyType === "complex" ? "complex" : "apikey",
    defaultKeyCategoryId: ensureValidKeyCategoryId(settings?.defaultKeyCategoryId, keyCategories),
    defaultListCategoryId: ensureValidKeyCategoryId(settings?.defaultListCategoryId, keyCategories),
    keyCategories,
    initialized: settings?.initialized === true,
  }
}

export const settingsKV = {
  async get(): Promise<SystemSettings> {
    const kv = getKV()
    const data = await kv.get("settings:global")
    return normalizeSettings(data ? (JSON.parse(data) as Partial<SystemSettings>) : null)
  },

  async update(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const kv = getKV()
    const current = await this.get()
    const updated = normalizeSettings({
      ...current,
      ...(data.defaultKeyType ? { defaultKeyType: data.defaultKeyType } : {}),
      ...(Array.isArray(data.keyCategories) ? { keyCategories: data.keyCategories } : {}),
      ...(typeof data.defaultKeyCategoryId === "string" ? { defaultKeyCategoryId: data.defaultKeyCategoryId } : {}),
      ...(typeof data.defaultListCategoryId === "string" ? { defaultListCategoryId: data.defaultListCategoryId } : {}),
      ...(typeof data.initialized === "boolean" ? { initialized: data.initialized } : {}),
    })
    await kv.put("settings:global", JSON.stringify(updated))
    return updated
  },

  async markInitialized(): Promise<SystemSettings> {
    return this.update({ initialized: true })
  },
}

// ========== 会话操作 ==========

export const sessionKV = {
  async create(userId: number, username: string, role: UserRole): Promise<string> {
    const kv = getKV()
    const sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? (crypto as { randomUUID: () => string }).randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`
    const session: Session = {
      userId,
      username,
      role,
      createdAt: new Date().toISOString(),
    }
    await kv.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: SESSION_TTL })
    return sessionId
  },

  async get(sessionId: string): Promise<Session | null> {
    const kv = getKV()
    const data = await kv.get(`session:${sessionId}`)
    if (!data) {
      return null
    }

    const session = JSON.parse(data) as Omit<Session, "role"> & { role?: string }
    return {
      ...session,
      role: normalizeRole(session.role),
    }
  },

  async update(sessionId: string, data: Partial<Session>): Promise<Session | null> {
    const kv = getKV()
    const session = await this.get(sessionId)
    if (!session) return null

    const updated: Session = {
      ...session,
      ...data,
      role: normalizeRole(data.role ?? session.role),
    }
    await kv.put(`session:${sessionId}`, JSON.stringify(updated), { expirationTtl: SESSION_TTL })
    return updated
  },

  async delete(sessionId: string): Promise<void> {
    const kv = getKV()
    await kv.delete(`session:${sessionId}`)
  },
}

// ========== 临时 Token（OTP 登录流程） ==========

export const tempTokenKV = {
  async create(userId: number, username: string): Promise<string> {
    const kv = getKV()
    const token = crypto.randomUUID()
    await kv.put(`temp-token:${token}`, JSON.stringify({ userId, username, createdAt: new Date().toISOString() }), { expirationTtl: 300 })
    return token
  },

  async get(token: string): Promise<{ userId: number; username: string } | null> {
    const kv = getKV()
    const data = await kv.get(`temp-token:${token}`)
    if (!data) return null
    return JSON.parse(data) as { userId: number; username: string }
  },

  async delete(token: string): Promise<void> {
    const kv = getKV()
    await kv.delete(`temp-token:${token}`)
  },
}

// ========== 登录限流 ==========

function getLoginRateLimitKey(identifier: string): string {
  return `rate-limit:login:${identifier}`
}

export const loginRateLimitKV = {
  async get(identifier: string): Promise<LoginRateLimitRecord | null> {
    const kv = getKV()
    const data = await kv.get(getLoginRateLimitKey(identifier))
    return data ? (JSON.parse(data) as LoginRateLimitRecord) : null
  },

  async increment(identifier: string): Promise<LoginRateLimitRecord> {
    const kv = getKV()
    const current = await this.get(identifier)
    const next: LoginRateLimitRecord = current
      ? { ...current, count: current.count + 1 }
      : { count: 1, firstAttemptAt: new Date().toISOString() }

    await kv.put(getLoginRateLimitKey(identifier), JSON.stringify(next), { expirationTtl: LOGIN_RATE_LIMIT_TTL })
    return next
  },

  async clear(identifier: string): Promise<void> {
    const kv = getKV()
    await kv.delete(getLoginRateLimitKey(identifier))
  },
}

export function isLoginRateLimited(record: LoginRateLimitRecord | null): boolean {
  return Boolean(record && record.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS)
}

// ========== Passkey 凭证存储 ==========

export interface PasskeyCredential {
  id: string                    // base64url 编码的 credentialId
  publicKeyJwk: JsonWebKey
  publicKeyAlgorithm: number    // COSE 算法标识 (-7=ES256, -257=RS256)
  signCount: number
  transports?: string[]
  name: string                  // 用户命名，如 "iPhone 15"
  createdAt: string
}

const PASSKEY_CHALLENGE_TTL = 300 // 5 分钟

export const passkeysKV = {
  async getByUserId(userId: number): Promise<PasskeyCredential[]> {
    const kv = getKV()
    const data = await kv.get(`passkeys:${userId}`)
    if (!data) return []
    return JSON.parse(data) as PasskeyCredential[]
  },

  async addCredential(userId: number, username: string, credential: PasskeyCredential): Promise<void> {
    const kv = getKV()
    const creds = await this.getByUserId(userId)
    creds.push(credential)
    await kv.put(`passkeys:${userId}`, JSON.stringify(creds))
    // 索引：credentialId → userId + username
    await kv.put(`passkey-cred:${credential.id}`, JSON.stringify({ userId, username }))
  },

  async deleteCredential(userId: number, credentialId: string): Promise<boolean> {
    const kv = getKV()
    const creds = await this.getByUserId(userId)
    const index = creds.findIndex((c) => c.id === credentialId)
    if (index === -1) return false
    creds.splice(index, 1)
    await kv.put(`passkeys:${userId}`, JSON.stringify(creds))
    await kv.delete(`passkey-cred:${credentialId}`)
    return true
  },

  async updateSignCount(userId: number, credentialId: string, signCount: number): Promise<void> {
    const kv = getKV()
    const creds = await this.getByUserId(userId)
    const cred = creds.find((c) => c.id === credentialId)
    if (cred) {
      cred.signCount = signCount
      await kv.put(`passkeys:${userId}`, JSON.stringify(creds))
    }
  },

  async findByCredentialId(credentialId: string): Promise<{ userId: number; username: string } | null> {
    const kv = getKV()
    const data = await kv.get(`passkey-cred:${credentialId}`)
    if (!data) return null
    return JSON.parse(data) as { userId: number; username: string }
  },
}

export const webauthnChallengeKV = {
  async create(params: {
    challenge: string
    type: "registration" | "authentication"
    userId?: number
    username?: string
  }): Promise<void> {
    const kv = getKV()
    await kv.put(
      `webauthn-challenge:${params.challenge}`,
      JSON.stringify({
        type: params.type,
        userId: params.userId,
        username: params.username,
        createdAt: new Date().toISOString(),
      }),
      { expirationTtl: PASSKEY_CHALLENGE_TTL },
    )
  },

  async get(challenge: string): Promise<{
    type: "registration" | "authentication"
    userId?: number
    username?: string
    createdAt: string
  } | null> {
    const kv = getKV()
    const data = await kv.get(`webauthn-challenge:${challenge}`)
    if (!data) return null
    return JSON.parse(data)
  },

  async delete(challenge: string): Promise<void> {
    const kv = getKV()
    await kv.delete(`webauthn-challenge:${challenge}`)
  },
}

// ========== 连接测试缓存 ==========

function getTestCacheKey(userId: number, keyId: number): string {
  return `cache:test:${userId}:${keyId}`
}

export const cacheKV = {
  async getTestResult(userId: number, keyId: number): Promise<ConnectionTestResult | null> {
    const kv = getKV()
    const data = await kv.get(getTestCacheKey(userId, keyId))
    return data ? JSON.parse(data) : null
  },

  async setTestResult(userId: number, keyId: number, result: ConnectionTestResult): Promise<void> {
    const kv = getKV()
    await kv.put(getTestCacheKey(userId, keyId), JSON.stringify(result), { expirationTtl: CACHE_TTL })
  },
}

// ========== 初始化与迁移 ==========

export async function isSetupComplete(): Promise<boolean> {
  const settings = await settingsKV.get()
  if (settings.initialized) {
    return true
  }

  return (await userKV.count()) > 0
}

export function getSetupToken(): string | null {
  try {
    const token = process.env.SETUP_TOKEN?.trim()
    return token || null
  } catch {
    return null
  }
}

export async function createInitialAdmin(input: {
  username: string
  email: string
  password: string
}): Promise<User> {
  const username = input.username.trim()
  const email = input.email.trim()
  const password = input.password

  if (!username) {
    throw new Error("用户名不能为空")
  }

  if (!email) {
    throw new Error("邮箱不能为空")
  }

  if (password.length < 6) {
    throw new Error("密码长度至少为6个字符")
  }

  if (await isSetupComplete()) {
    throw new Error("系统已初始化")
  }

  const { hash, salt } = await hashPassword(password)
  const user = await userKV.create({
    username,
    email,
    passwordHash: hash,
    salt,
    role: "admin",
  })

  await settingsKV.markInitialized()
  return user
}

export async function ensureSingleAdminMigration(username: string): Promise<User | null> {
  const user = await userKV.getByUsername(username)
  if (!user) {
    return null
  }

  if (user.role === "admin") {
    const settings = await settingsKV.get()
    if (!settings.initialized) {
      await settingsKV.markInitialized()
    }
    return user
  }

  const userCount = await userKV.count()
  if (userCount !== 1) {
    return user
  }

  const migratedUser = await userKV.update(username, { role: "admin" })
  if (!migratedUser) {
    return null
  }

  const settings = await settingsKV.get()
  if (!settings.initialized) {
    await settingsKV.markInitialized()
  }

  return migratedUser
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
  const securePart = isDevelopmentEnvironment() ? "" : "; Secure"
  return `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL}${securePart}`
}

export function clearSessionCookie(): string {
  const securePart = isDevelopmentEnvironment() ? "" : "; Secure"
  return `session_id=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${securePart}`
}
