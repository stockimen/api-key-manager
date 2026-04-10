import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, passkeysKV, webauthnChallengeKV, type PasskeyCredential } from "@/lib/kv"
import { verifyRegistration, getOriginFromRequest, getRpIdFromRequest, bufferToBase64url } from "@/lib/webauthn"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const body = await request.json()
    const { credential, challenge, name } = body as {
      credential?: {
        id: string
        rawId: string
        type: string
        response: { clientDataJSON: string; attestationObject: string; transports?: string[] }
      }
      challenge?: string
      name?: string
    }

    if (!credential || !challenge) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 验证并删除 challenge
    const challengeData = await webauthnChallengeKV.get(challenge)
    if (!challengeData || challengeData.type !== "registration") {
      return NextResponse.json({ error: "验证已过期，请重试" }, { status: 401 })
    }
    if (challengeData.userId !== session.userId) {
      return NextResponse.json({ error: "验证信息不匹配" }, { status: 403 })
    }
    await webauthnChallengeKV.delete(challenge)

    const origin = getOriginFromRequest(request)
    const rpId = getRpIdFromRequest(request)

    const result = await verifyRegistration(credential, challenge, origin, rpId)

    // 检查是否已注册
    const existing = await passkeysKV.findByCredentialId(result.credentialId)
    if (existing) {
      return NextResponse.json({ error: "该通行密钥已注册" }, { status: 409 })
    }

    const passkey: PasskeyCredential = {
      id: result.credentialId,
      publicKeyJwk: result.publicKeyJwk,
      publicKeyAlgorithm: result.publicKeyAlgorithm,
      signCount: result.signCount,
      transports: credential.response.transports,
      name: name || "Passkey",
      createdAt: new Date().toISOString(),
    }

    await passkeysKV.addCredential(session.userId, session.username, passkey)

    return NextResponse.json({
      success: true,
      credential: {
        id: passkey.id,
        name: passkey.name,
        createdAt: passkey.createdAt,
      },
    })
  } catch (error) {
    console.error("Passkey register-finish error:", error)
    const message = error instanceof Error ? error.message : "注册失败"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
