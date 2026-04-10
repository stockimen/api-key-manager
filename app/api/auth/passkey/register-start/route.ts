import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, passkeysKV, userKV, webauthnChallengeKV } from "@/lib/kv"
import { generateChallenge, getRpIdFromRequest, bufferToBase64url } from "@/lib/webauthn"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const user = await userKV.getByUsername(session.username)
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const { name } = body as { name?: string }

    const challenge = generateChallenge()
    const rpId = getRpIdFromRequest(request)

    await webauthnChallengeKV.create({
      challenge,
      type: "registration",
      userId: user.id,
      username: user.username,
    })

    const existingPasskeys = await passkeysKV.getByUserId(user.id)
    const excludeCredentials = existingPasskeys.map((pk) => ({
      type: "public-key",
      id: pk.id,
      transports: pk.transports,
    }))

    return NextResponse.json({
      challenge,
      rp: { name: "API Key Manager", id: rpId },
      user: {
        id: bufferToBase64url(new TextEncoder().encode(String(user.id))),
        name: user.email || user.username,
        displayName: user.username,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      timeout: 120000,
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "preferred",
      },
      attestation: "none",
      credentialName: name || "Passkey",
    })
  } catch (error) {
    console.error("Passkey register-start error:", error)
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}
