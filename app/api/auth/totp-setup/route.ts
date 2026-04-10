import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, userKV } from "@/lib/kv"
import { generateSecret, buildQRUri, verifyTOTP } from "@/lib/totp"
import { verifyTurnstile, getClientIP } from "@/lib/turnstile"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const body = await request.json()
    const { action, code, turnstileToken } = body as { action?: string; code?: string; turnstileToken?: string }

    if (action === "generate") {
      const secret = generateSecret()
      const user = await userKV.getByUsername(session.username)
      if (!user) {
        return NextResponse.json({ error: "用户不存在" }, { status: 404 })
      }

      await userKV.update(session.username, { otpSecret: secret })

      const qrUri = buildQRUri(secret, "API Key Manager", user.username)
      return NextResponse.json({ secret, qrUri })
    }

    if (action === "enable") {
      if (!code) {
        return NextResponse.json({ error: "请输入验证码" }, { status: 400 })
      }

      const user = await userKV.getByUsername(session.username)
      if (!user || !user.otpSecret) {
        return NextResponse.json({ error: "请先生成密钥" }, { status: 400 })
      }

      const valid = await verifyTOTP(user.otpSecret, code)
      if (!valid) {
        return NextResponse.json({ error: "验证码错误" }, { status: 401 })
      }

      await userKV.update(session.username, { otpEnabled: true })
      return NextResponse.json({ success: true })
    }

    if (action === "disable") {
      // Turnstile 验证
      const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
      if (turnstileSecret) {
        if (!turnstileToken) {
          return NextResponse.json({ error: "请完成人机验证" }, { status: 400 })
        }
        const isValid = await verifyTurnstile(turnstileToken, getClientIP(request))
        if (!isValid) {
          return NextResponse.json({ error: "人机验证失败，请重试" }, { status: 400 })
        }
      }

      const user = await userKV.getByUsername(session.username)
      if (!user) {
        return NextResponse.json({ error: "用户不存在" }, { status: 404 })
      }

      if (user.otpEnabled) {
        if (!code) {
          return NextResponse.json({ error: "请输入验证码" }, { status: 400 })
        }
        if (!user.otpSecret) {
          return NextResponse.json({ error: "未设置密钥" }, { status: 400 })
        }
        const valid = await verifyTOTP(user.otpSecret, code)
        if (!valid) {
          return NextResponse.json({ error: "验证码错误" }, { status: 401 })
        }
      }

      await userKV.update(session.username, { otpEnabled: false, otpSecret: undefined })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 })
  } catch (error) {
    console.error("TOTP setup error:", error)
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}
