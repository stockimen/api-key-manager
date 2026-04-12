/**
 * TOTP (Time-based One-Time Password) 工具
 * 纯 Web Crypto API 实现，兼容 Edge Runtime
 */

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer
}

/** 生成随机 TOTP 密钥（RFC 4648 Base32 编码，20 字节） */
export function generateSecret(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  let bits = ""
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0")
  }
  let secret = ""
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    const chunk = parseInt(bits.substring(i, i + 5), 2)
    secret += BASE32_CHARS[chunk]
  }
  return secret
}

/** 构建 otpauth:// URI，用于生成 QR 码 */
export function buildQRUri(secret: string, issuer: string, username: string): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedAccount = encodeURIComponent(username)
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
}

/** Base32 解码 */
function base32Decode(input: string): Uint8Array {
  const cleaned = input.toUpperCase().replace(/=+$/, "")
  const bytes: number[] = []
  let buffer = 0
  let bitsLeft = 0

  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char)
    if (val === -1) continue
    buffer = (buffer << 5) | val
    bitsLeft += 5
    if (bitsLeft >= 8) {
      bitsLeft -= 8
      bytes.push((buffer >> bitsLeft) & 0xff)
    }
  }

  return new Uint8Array(bytes)
}

/** 生成指定时间步的 TOTP 码 */
async function generateTOTPCode(secret: string, timeStep: number): Promise<string> {
  const key = base32Decode(secret)
  const timeBytes = new Uint8Array(8)
  let timeValue = BigInt(timeStep)
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = Number(timeValue & BigInt(0xff))
    timeValue >>= BigInt(8)
  }

  const cryptoKey = await crypto.subtle.importKey("raw", bytesToArrayBuffer(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"])
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, bytesToArrayBuffer(timeBytes)))

  const offset = hmac[hmac.length - 1] & 0x0f
  const binary = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)
  const otp = binary % 1000000

  return otp.toString().padStart(6, "0")
}

/** 验证 TOTP 码，允许前后 window 个时间步（每个 30 秒） */
export async function verifyTOTP(secret: string, code: string, window = 1): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false

  const currentTimeStep = Math.floor(Date.now() / 30000)

  for (let i = -window; i <= window; i++) {
    const expectedCode = await generateTOTPCode(secret, currentTimeStep + i)
    if (expectedCode === code) return true
  }

  return false
}
