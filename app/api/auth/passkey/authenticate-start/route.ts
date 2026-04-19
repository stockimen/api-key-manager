import { NextRequest, NextResponse } from "next/server"
import { webauthnChallengeKV, loginRateLimitKV, isLoginRateLimited, passkeysKV, userKV, isSetupComplete } from "@/lib/kv"
import { generateChallenge, getRpIdFromRequest } from "@/lib/webauthn"
import { getClientIP } from "@/lib/turnstile"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { username } = body as { username?: string }

    // 限流检查（基于 IP）
    const ip = getClientIP(request)
    const rateLimitKey = `passkey:${ip}`
    const rateRecord = await loginRateLimitKV.get(rateLimitKey)
    if (isLoginRateLimited(rateRecord)) {
      return NextResponse.json({ error: "登录尝试过于频繁，请稍后再试" }, { status: 429 })
    }

    // 每次请求递增计数，成功时在 finish 中清除
    await loginRateLimitKV.increment(rateLimitKey)

    if (!(await isSetupComplete())) {
      return NextResponse.json({ error: "系统尚未初始化" }, { status: 503 })
    }

    const challenge = generateChallenge()
    const rpId = getRpIdFromRequest(request)

    let allowCredentials: { type: string; id: string; transports?: string[] }[] = []
    let targetUsername: string | undefined

    if (username) {
      // 指定用户名模式
      const user = await userKV.getByUsername(username)
      if (!user) {
        // 不透露用户是否存在，返回空 allowCredentials
      } else {
        targetUsername = user.username
        const passkeys = await passkeysKV.getByUserId(user.id)
        allowCredentials = passkeys.map((pk) => ({
          type: "public-key",
          id: pk.id,
          transports: pk.transports,
        }))
      }
    }
    // 无用户名时为 discoverable 模式，allowCredentials 保持为空

    await webauthnChallengeKV.create({
      challenge,
      type: "authentication",
      username: targetUsername,
    })

    return NextResponse.json({
      challenge,
      rpId,
      timeout: 120000,
      allowCredentials,
      userVerification: "preferred",
    })
  } catch (error) {
    console.error("Passkey authenticate-start error:", error)
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}
