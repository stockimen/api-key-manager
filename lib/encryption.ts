/**
 * 加密服务 - 使用 Web Crypto API
 * 支持 Cloudflare Workers 环境
 */

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

// 从加密密钥派生 AES 密钥
async function deriveKey(encryptionKey: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(encryptionKey),
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

/**
 * 加密文本 (AES-GCM)
 */
export async function encrypt(text: string, encryptionKey: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(encryptionKey, salt)

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    toArrayBuffer(text)
  )

  // 格式: salt(16) + iv(12) + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(encrypted).length)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  return toBase64(combined.buffer)
}

/**
 * 解密文本 (AES-GCM)
 */
export async function decrypt(encryptedText: string, encryptionKey: string): Promise<string> {
  const combined = new Uint8Array(fromBase64(encryptedText))
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const ciphertext = combined.slice(28)

  const key = await deriveKey(encryptionKey, salt)

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * 密码哈希 (PBKDF2)
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  )

  return {
    hash: toBase64(derivedBits),
    salt: toBase64(salt.buffer),
  }
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const saltBuffer = fromBase64(salt)
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new Uint8Array(saltBuffer),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  )

  const computedHash = toBase64(derivedBits)
  return computedHash === hash
}
