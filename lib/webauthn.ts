/**
 * WebAuthn 服务端验证库 — 纯 Web Crypto API 实现
 * 支持 Cloudflare Workers Edge Runtime
 */

// ─── Base64URL 工具 ────────────────────────────────────

export function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function base64urlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/")
  const pad = (4 - (base64.length % 4)) % 4
  base64 += "=".repeat(pad)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// ─── 最小 CBOR 解码器 ──────────────────────────────────
// 仅支持 WebAuthn "none" 证明格式所需的类型

function readCborHead(data: Uint8Array, offset: number): { type: number; value: number; offset: number } {
  if (offset >= data.length) throw new Error("CBOR: unexpected end of data")
  const byte = data[offset]
  const majorType = byte >> 5
  const additionalInfo = byte & 0x1f

  if (additionalInfo < 24) {
    return { type: majorType, value: additionalInfo, offset: offset + 1 }
  } else if (additionalInfo === 24) {
    return { type: majorType, value: data[offset + 1], offset: offset + 2 }
  } else if (additionalInfo === 25) {
    const view = new DataView(data.buffer, data.byteOffset + offset + 1, 2)
    return { type: majorType, value: view.getUint16(0), offset: offset + 3 }
  } else if (additionalInfo === 26) {
    const view = new DataView(data.buffer, data.byteOffset + offset + 1, 4)
    return { type: majorType, value: view.getUint32(0), offset: offset + 5 }
  }
  throw new Error(`CBOR: unsupported additional info ${additionalInfo}`)
}

function decodeCbor(data: Uint8Array, offset: number): { value: unknown; offset: number } {
  const head = readCborHead(data, offset)

  switch (head.type) {
    case 0: // unsigned integer
      return { value: head.value, offset: head.offset }

    case 1: // negative integer
      return { value: -1 - head.value, offset: head.offset }

    case 2: { // byte string
      const bytes = data.slice(head.offset, head.offset + head.value)
      return { value: bytes, offset: head.offset + head.value }
    }

    case 3: { // text string
      const bytes = data.slice(head.offset, head.offset + head.value)
      const text = new TextDecoder().decode(bytes)
      return { value: text, offset: head.offset + head.value }
    }

    case 4: { // array
      let pos = head.offset
      const arr: unknown[] = []
      for (let i = 0; i < head.value; i++) {
        const result = decodeCbor(data, pos)
        arr.push(result.value)
        pos = result.offset
      }
      return { value: arr, offset: pos }
    }

    case 5: { // map
      let pos = head.offset
      const map = new Map<unknown, unknown>()
      for (let i = 0; i < head.value; i++) {
        const key = decodeCbor(data, pos)
        const val = decodeCbor(data, key.offset)
        map.set(key.value, val.value)
        pos = val.offset
      }
      return { value: map, offset: pos }
    }

    case 7: // simple values: true(21), false(20), null(22)
      if (head.value === 20) return { value: false, offset: head.offset }
      if (head.value === 21) return { value: true, offset: head.offset }
      if (head.value === 22) return { value: null, offset: head.offset }
      throw new Error(`CBOR: unsupported simple value ${head.value}`)

    default:
      throw new Error(`CBOR: unsupported major type ${head.type}`)
  }
}

function decodeCborFirst(data: Uint8Array): unknown {
  return decodeCbor(data, 0).value
}

// ─── Authenticator Data 解析 ────────────────────────────

interface ParsedAuthData {
  rpIdHash: Uint8Array
  flags: number
  signCount: number
  attestedCredentialData?: {
    aaguid: Uint8Array
    credentialId: Uint8Array
    cosePublicKey: Map<unknown, unknown>
  }
}

function parseAuthData(authData: Uint8Array): ParsedAuthData {
  if (authData.length < 37) throw new Error("authData too short")

  const rpIdHash = authData.slice(0, 32)
  const flags = authData[32]
  const view = new DataView(authData.buffer, authData.byteOffset + 33, 4)
  const signCount = view.getUint32(0)

  const result: ParsedAuthData = { rpIdHash, flags, signCount }

  // bit 0x40 = AT (attested credential data present)
  if (flags & 0x40) {
    if (authData.length < 55) throw new Error("authData: attested credential data too short")

    const aaguid = authData.slice(37, 53)
    const credIdLen = new DataView(authData.buffer, authData.byteOffset + 53, 2).getUint16(0)
    const credentialId = authData.slice(55, 55 + credIdLen)
    const publicKeyBytes = authData.slice(55 + credIdLen)

    // 解码 COSE 公钥
    const cosePublicKey = decodeCborFirst(publicKeyBytes) as Map<unknown, unknown>
    result.attestedCredentialData = { aaguid, credentialId, cosePublicKey }
  }

  return result
}

// ─── COSE Key → JWK 转换 ───────────────────────────────

function coseKeyToJWK(coseKey: Map<unknown, unknown>): { jwk: JsonWebKey; algorithm: number } {
  const kty = coseKey.get(1) as number  // 2=EC2, 3=RSA
  const alg = coseKey.get(3) as number  // -7=ES256, -257=RS256

  if (kty === 2 && alg === -7) {
    // EC2 / P-256 / ES256
    const x = coseKey.get(-2) as Uint8Array
    const y = coseKey.get(-3) as Uint8Array
    return {
      jwk: {
        kty: "EC",
        crv: "P-256",
        x: bufferToBase64url(x.buffer),
        y: bufferToBase64url(y.buffer),
      },
      algorithm: -7,
    }
  }

  if (kty === 3 && alg === -257) {
    // RSA / RS256
    const n = coseKey.get(-1) as Uint8Array
    const e = coseKey.get(-2) as Uint8Array
    return {
      jwk: {
        kty: "RSA",
        n: bufferToBase64url(n.buffer),
        e: bufferToBase64url(e.buffer),
      },
      algorithm: -257,
    }
  }

  throw new Error(`Unsupported COSE key: kty=${kty}, alg=${alg}`)
}

// ─── 签名验证 ──────────────────────────────────────────

async function importPublicKey(jwk: JsonWebKey, algorithm: number): Promise<CryptoKey> {
  if (algorithm === -7) {
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    )
  }
  if (algorithm === -257) {
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    )
  }
  throw new Error(`Unsupported algorithm: ${algorithm}`)
}

async function verifySignature(
  publicKey: CryptoKey,
  algorithm: number,
  signature: ArrayBuffer,
  data: ArrayBuffer,
): Promise<boolean> {
  if (algorithm === -7) {
    return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, signature, data)
  }
  if (algorithm === -257) {
    return crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, publicKey, signature, data)
  }
  throw new Error(`Unsupported algorithm: ${algorithm}`)
}

// ─── Client Data 验证 ──────────────────────────────────

interface ClientData {
  type: string
  challenge: string
  origin: string
}

function parseClientDataJSON(clientDataJSON: ArrayBuffer): ClientData {
  const text = new TextDecoder().decode(clientDataJSON)
  return JSON.parse(text) as ClientData
}

// ─── 高层注册验证 ──────────────────────────────────────

export interface RegistrationResult {
  credentialId: string
  publicKeyJwk: JsonWebKey
  publicKeyAlgorithm: number
  signCount: number
}

export async function verifyRegistration(
  response: {
    id: string
    rawId: string
    response: { clientDataJSON: string; attestationObject: string }
    type: string
  },
  expectedChallenge: string,
  expectedOrigin: string,
  expectedRpId: string,
): Promise<RegistrationResult> {
  // 1. 验证类型
  if (response.type !== "public-key") throw new Error("无效的凭证类型")

  // 2. 验证 id 与 rawId 一致
  const rawIdBuf = base64urlToBuffer(response.rawId)
  if (bufferToBase64url(rawIdBuf) !== response.id) {
    throw new Error("凭证 ID 不一致")
  }

  // 3. 验证 clientDataJSON
  const clientDataBuf = base64urlToBuffer(response.response.clientDataJSON)
  const clientData = parseClientDataJSON(clientDataBuf)
  if (clientData.type !== "webauthn.create") throw new Error("clientData 类型错误")
  if (clientData.challenge !== expectedChallenge) throw new Error("challenge 不匹配")
  if (clientData.origin !== expectedOrigin) throw new Error("origin 不匹配")

  // 4. 解码 attestationObject
  const attObjBuf = base64urlToBuffer(response.response.attestationObject)
  const attObj = decodeCborFirst(new Uint8Array(attObjBuf)) as Map<unknown, unknown>

  const fmt = attObj.get("fmt")
  if (fmt !== "none") throw new Error(`不支持的证明格式: ${fmt}`)

  const authDataBytes = attObj.get("authData") as Uint8Array
  const authData = parseAuthData(authDataBytes)

  // 5. 验证 RP ID
  const expectedHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expectedRpId))
  const expectedHashArr = new Uint8Array(expectedHash)
  if (!timingSafeEqual(authData.rpIdHash, expectedHashArr)) {
    throw new Error("RP ID 验证失败")
  }

  // 6. 验证 UP 标志
  if (!(authData.flags & 0x01)) throw new Error("用户未在场")

  // 7. 提取凭证数据
  if (!authData.attestedCredentialData) throw new Error("缺少凭证数据")

  const { credentialId, cosePublicKey } = authData.attestedCredentialData
  const { jwk, algorithm } = coseKeyToJWK(cosePublicKey)

  return {
    credentialId: bufferToBase64url(credentialId.buffer),
    publicKeyJwk: jwk,
    publicKeyAlgorithm: algorithm,
    signCount: authData.signCount,
  }
}

// ─── 高层认证验证 ──────────────────────────────────────

export interface AuthenticationResult {
  signCount: number
}

export async function verifyAuthentication(
  response: {
    id: string
    rawId: string
    response: { clientDataJSON: string; authenticatorData: string; signature: string }
    type: string
  },
  expectedChallenge: string,
  expectedOrigin: string,
  expectedRpId: string,
  storedCredential: {
    publicKeyJwk: JsonWebKey
    publicKeyAlgorithm: number
    signCount: number
  },
): Promise<AuthenticationResult> {
  // 1. 验证类型
  if (response.type !== "public-key") throw new Error("无效的凭证类型")

  // 2. 验证 id 与 rawId 一致
  const rawIdBuf = base64urlToBuffer(response.rawId)
  if (bufferToBase64url(rawIdBuf) !== response.id) {
    throw new Error("凭证 ID 不一致")
  }

  // 3. 验证 clientDataJSON
  const clientDataBuf = base64urlToBuffer(response.response.clientDataJSON)
  const clientData = parseClientDataJSON(clientDataBuf)
  if (clientData.type !== "webauthn.get") throw new Error("clientData 类型错误")
  if (clientData.challenge !== expectedChallenge) throw new Error("challenge 不匹配")
  if (clientData.origin !== expectedOrigin) throw new Error("origin 不匹配")

  // 4. 解析 authenticatorData（原始字节，非 CBOR）
  const authDataBuf = base64urlToBuffer(response.response.authenticatorData)
  const authData = parseAuthData(new Uint8Array(authDataBuf))

  // 5. 验证 RP ID
  const expectedHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expectedRpId))
  if (!timingSafeEqual(authData.rpIdHash, new Uint8Array(expectedHash))) {
    throw new Error("RP ID 验证失败")
  }

  // 6. 验证 UP 标志
  if (!(authData.flags & 0x01)) throw new Error("用户未在场")

  // 7. 验证签名
  const publicKey = await importPublicKey(storedCredential.publicKeyJwk, storedCredential.publicKeyAlgorithm)
  const signatureBuf = base64urlToBuffer(response.response.signature)
  const signedData = concatBuffers(authDataBuf, await crypto.subtle.digest("SHA-256", clientDataBuf))

  const valid = await verifySignature(publicKey, storedCredential.publicKeyAlgorithm, signatureBuf, signedData)
  if (!valid) throw new Error("签名验证失败")

  // 8. 验证 signCount（防克隆）
  if (storedCredential.signCount !== 0 || authData.signCount !== 0) {
    if (authData.signCount <= storedCredential.signCount) {
      throw new Error("签名计数器异常，可能存在克隆凭证")
    }
  }

  return { signCount: authData.signCount }
}

// ─── 辅助函数 ──────────────────────────────────────────

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i]
  return result === 0
}

function concatBuffers(a: ArrayBuffer, b: ArrayBuffer): ArrayBuffer {
  const combined = new Uint8Array(a.byteLength + b.byteLength)
  combined.set(new Uint8Array(a), 0)
  combined.set(new Uint8Array(b), a.byteLength)
  return combined.buffer
}

// ─── RP ID / Origin 工具 ───────────────────────────────

export function getRpIdFromRequest(request: Request): string {
  const url = new URL(request.url)
  return url.hostname
}

export function getOriginFromRequest(request: Request): string {
  const origin = request.headers.get("origin")
  if (origin) return origin
  const url = new URL(request.url)
  return url.origin
}

// ─── Challenge 生成 ────────────────────────────────────

export function generateChallenge(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return bufferToBase64url(bytes.buffer)
}
