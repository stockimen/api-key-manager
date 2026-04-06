/**
 * 加密服务 - 使用 Web Crypto API
 * 支持 Cloudflare Workers 环境
 */

const LEGACY_PBKDF2_ITERATIONS = 100000
const PASSWORD_PBKDF2_ITERATIONS = 15000
const PASSWORD_HASH_PREFIX = "pbkdf2_sha256$"
const ENCRYPTION_FORMAT_V2_PREFIX = "v2:"
const AES_GCM_IV_LENGTH = 12
const LEGACY_ENCRYPTION_SALT_LENGTH = 16

const directEncryptionKeyCache = new Map<string, Promise<CryptoKey>>()

// 将字符串转为 ArrayBuffer
function toArrayBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text)
}

// 将 ArrayBuffer 转为 Base64
function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

// 将 Base64 转为 ArrayBuffer
function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function importPbkdf2Key(input: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", toArrayBuffer(input), "PBKDF2", false, ["deriveBits", "deriveKey"])
}

async function deriveLegacyEncryptionKey(encryptionKey: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await importPbkdf2Key(encryptionKey)

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: LEGACY_PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

async function getDirectEncryptionKey(encryptionKey: string): Promise<CryptoKey> {
  const cached = directEncryptionKeyCache.get(encryptionKey)
  if (cached) {
    return cached
  }

  const keyPromise = (async () => {
    const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(encryptionKey))
    return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  })()

  directEncryptionKeyCache.set(encryptionKey, keyPromise)
  return keyPromise
}

function formatPasswordHash(hash: string, iterations: number): string {
  return `${PASSWORD_HASH_PREFIX}${iterations}$${hash}`
}

function parsePasswordHash(storedHash: string): { hash: string; iterations: number } {
  if (!storedHash.startsWith(PASSWORD_HASH_PREFIX)) {
    return {
      hash: storedHash,
      iterations: LEGACY_PBKDF2_ITERATIONS,
    }
  }

  const parts = storedHash.split("$")
  const iterations = Number.parseInt(parts[1] || "", 10)
  const hash = parts.slice(2).join("$")

  if (!Number.isFinite(iterations) || iterations <= 0 || !hash) {
    throw new Error("密码哈希格式无效")
  }

  return { hash, iterations }
}

/**
 * 加密文本 (AES-GCM)
 * 新格式直接使用 ENCRYPTION_KEY 派生固定 AES 密钥，避免每次请求都进行高成本 PBKDF2。
 */
export async function encrypt(text: string, encryptionKey: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH))
  const key = await getDirectEncryptionKey(encryptionKey)

  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, toArrayBuffer(text))

  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  return `${ENCRYPTION_FORMAT_V2_PREFIX}${toBase64(combined.buffer)}`
}

/**
 * 解密文本 (AES-GCM)
 * 兼容旧格式: salt(16) + iv(12) + ciphertext
 */
export async function decrypt(encryptedText: string, encryptionKey: string): Promise<string> {
  if (encryptedText.startsWith(ENCRYPTION_FORMAT_V2_PREFIX)) {
    const combined = new Uint8Array(fromBase64(encryptedText.slice(ENCRYPTION_FORMAT_V2_PREFIX.length)))
    const iv = combined.slice(0, AES_GCM_IV_LENGTH)
    const ciphertext = combined.slice(AES_GCM_IV_LENGTH)
    const key = await getDirectEncryptionKey(encryptionKey)

    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext)
    return new TextDecoder().decode(decrypted)
  }

  const combined = new Uint8Array(fromBase64(encryptedText))
  const salt = combined.slice(0, LEGACY_ENCRYPTION_SALT_LENGTH)
  const iv = combined.slice(LEGACY_ENCRYPTION_SALT_LENGTH, LEGACY_ENCRYPTION_SALT_LENGTH + AES_GCM_IV_LENGTH)
  const ciphertext = combined.slice(LEGACY_ENCRYPTION_SALT_LENGTH + AES_GCM_IV_LENGTH)

  const key = await deriveLegacyEncryptionKey(encryptionKey, salt)
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext)

  return new TextDecoder().decode(decrypted)
}

/**
 * 密码哈希 (PBKDF2)
 * 新格式会把迭代次数编码到 passwordHash 中，便于未来继续调整且保持兼容。
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await importPbkdf2Key(password)

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PASSWORD_PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  )

  return {
    hash: formatPasswordHash(toBase64(derivedBits), PASSWORD_PBKDF2_ITERATIONS),
    salt: toBase64(salt.buffer),
  }
}

/**
 * 验证密码
 * 兼容旧格式: 直接存储 hash，本地默认按 100000 次 PBKDF2 校验。
 */
export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  const parsed = parsePasswordHash(storedHash)
  const saltBuffer = fromBase64(salt)
  const keyMaterial = await importPbkdf2Key(password)

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new Uint8Array(saltBuffer),
      iterations: parsed.iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  )

  const computedHash = toBase64(derivedBits)
  return computedHash === parsed.hash
}
