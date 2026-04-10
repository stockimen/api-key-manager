/**
 * WebAuthn 客户端工具 — 浏览器端编码/解码
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

// ─── WebAuthn 支持检测 ─────────────────────────────────

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && window.PublicKeyCredential !== undefined
}

// ─── 注册选项编码（服务端 JSON → 浏览器 API 参数）─────

export interface ServerCreationOptions {
  challenge: string
  rp: { name: string; id: string }
  user: { id: string; name: string; displayName: string }
  pubKeyCredParams: { type: string; alg: number }[]
  timeout?: number
  excludeCredentials: { type: string; id: string; transports?: string[] }[]
  authenticatorSelection: {
    authenticatorAttachment?: string
    residentKey?: string
    requireResidentKey?: boolean
    userVerification?: string
  }
  attestation?: string
}

export function prepareCreationOptions(
  serverOptions: ServerCreationOptions,
): PublicKeyCredentialCreationOptions {
  return {
    challenge: base64urlToBuffer(serverOptions.challenge),
    rp: serverOptions.rp,
    user: {
      id: base64urlToBuffer(serverOptions.user.id),
      name: serverOptions.user.name,
      displayName: serverOptions.user.displayName,
    },
    pubKeyCredParams: serverOptions.pubKeyCredParams as PublicKeyCredentialParameters[],
    timeout: serverOptions.timeout,
    excludeCredentials: serverOptions.excludeCredentials.map((c) => ({
      type: c.type as "public-key",
      id: base64urlToBuffer(c.id),
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
    authenticatorSelection: serverOptions.authenticatorSelection as AuthenticatorSelectionCriteria,
    attestation: (serverOptions.attestation || "none") as AttestationConveyancePreference,
  }
}

// ─── 认证选项编码 ──────────────────────────────────────

export interface ServerRequestOptions {
  challenge: string
  rpId?: string
  timeout?: number
  allowCredentials: { type: string; id: string; transports?: string[] }[]
  userVerification?: string
}

export function prepareRequestOptions(
  serverOptions: ServerRequestOptions,
): PublicKeyCredentialRequestOptions {
  return {
    challenge: base64urlToBuffer(serverOptions.challenge),
    rpId: serverOptions.rpId,
    timeout: serverOptions.timeout,
    allowCredentials: serverOptions.allowCredentials.map((c) => ({
      type: c.type as "public-key",
      id: base64urlToBuffer(c.id),
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
    userVerification: (serverOptions.userVerification || "preferred") as UserVerificationRequirement,
  }
}

// ─── 注册响应编码（浏览器 API → 服务端 JSON）──────────

export function encodeRegistrationResponse(
  credential: PublicKeyCredential,
): {
  id: string
  rawId: string
  type: string
  response: {
    clientDataJSON: string
    attestationObject: string
    transports?: string[]
  }
} {
  const response = credential.response as AuthenticatorAttestationResponse
  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      attestationObject: bufferToBase64url(response.attestationObject),
      transports: response.getTransports?.(),
    },
  }
}

// ─── 认证响应编码 ──────────────────────────────────────

export function encodeAuthenticationResponse(
  credential: PublicKeyCredential,
): {
  id: string
  rawId: string
  type: string
  response: {
    clientDataJSON: string
    authenticatorData: string
    signature: string
    userHandle?: string
  }
} {
  const response = credential.response as AuthenticatorAssertionResponse
  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      authenticatorData: bufferToBase64url(response.authenticatorData),
      signature: bufferToBase64url(response.signature),
      userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : undefined,
    },
  }
}
