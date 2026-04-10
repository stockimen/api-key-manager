import { NextRequest, NextResponse } from "next/server"
import {
  webauthnChallengeKV,
  passkeysKV,
  userKV,
  sessionKV,
  createSessionCookie,
  loginRateLimitKV,
} from "@/lib/kv"
import { verifyAuthentication, getOriginFromRequest, getRpIdFromRequest } from "@/lib/webauthn"
import { getClientIP } from "@/lib/turnstile"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credential, challenge } = body as {
      credential?: {
        id: string
        rawId: string
        type: string
        response: {
          clientDataJSON: string
          authenticatorData: string
          signature: string
          userHandle?: string
        }
      }
      challenge?: string
    }

    if (!credential || !challenge) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 验证并删除 challenge
    const challengeData = await webauthnChallengeKV.get(challenge)
    if (!challengeData || challengeData.type !== "authentication") {
      return NextResponse.json({ error: "验证已过期，请重试" }, { status: 401 })
    }
    await webauthnChallengeKV.delete(challenge)

    // 查找凭证对应的用户
    const credIndex = await passkeysKV.findByCredentialId(credential.id)
    if (!credIndex) {
      return NextResponse.json({ error: "通行密钥未注册" }, { status: 401 })
    }

    const user = await userKV.getByUsername(credIndex.username)
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 })
    }

    // 获取存储的凭证
    const passkeys = await passkeysKV.getByUserId(user.id)
    const storedPasskey = passkeys.find((pk) => pk.id === credential.id)
    if (!storedPasskey) {
      return NextResponse.json({ error: "通行密钥未注册" }, { status: 401 })
    }

    const origin = getOriginFromRequest(request)
    const rpId = getRpIdFromRequest(request)

    const result = await verifyAuthentication(credential, challenge, origin, rpId, {
      publicKeyJwk: storedPasskey.publicKeyJwk,
      publicKeyAlgorithm: storedPasskey.publicKeyAlgorithm,
      signCount: storedPasskey.signCount,
    })

    // 更新签名计数
    await passkeysKV.updateSignCount(user.id, credential.id, result.signCount)

    // 清除限流
    const ip = getClientIP(request)
    await loginRateLimitKV.clear(`passkey:${ip}`)

    // 创建会话（Passkey 登录不需要 TOTP）
    const sessionId = await sessionKV.create(user.id, user.username, user.role)

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    })

    response.headers.set("Set-Cookie", createSessionCookie(sessionId))
    return response
  } catch (error) {
    console.error("Passkey authenticate-finish error:", error)
    const message = error instanceof Error ? error.message : "通行密钥验证失败"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
