import { NextRequest, NextResponse } from "next/server"
import { tempTokenKV, sessionKV, userKV, createSessionCookie, loginRateLimitKV } from "@/lib/kv"
import { verifyTOTP } from "@/lib/totp"

export const runtime = "edge"

const MAX_OTP_ATTEMPTS = 5

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tempToken, code } = body as { tempToken?: string; code?: string }

    if (!tempToken || !code) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 速率限制检查
    const rateLimitKey = `otp:${tempToken}`
    const rateRecord = await loginRateLimitKV.get(rateLimitKey)
    if (rateRecord && rateRecord.count >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json({ error: "验证次数过多，请重新登录" }, { status: 429 })
    }

    const tokenData = await tempTokenKV.get(tempToken)
    if (!tokenData) {
      return NextResponse.json({ error: "验证已过期，请重新登录" }, { status: 401 })
    }

    const user = await userKV.getByUsername(tokenData.username)
    if (!user || !user.otpSecret) {
      await tempTokenKV.delete(tempToken)
      return NextResponse.json({ error: "用户不存在或未启用两步验证" }, { status: 401 })
    }

    const valid = await verifyTOTP(user.otpSecret, code)
    if (!valid) {
      await loginRateLimitKV.increment(rateLimitKey)
      return NextResponse.json({ error: "验证码错误" }, { status: 401 })
    }

    await tempTokenKV.delete(tempToken)
    await loginRateLimitKV.clear(rateLimitKey)

    const sessionId = await sessionKV.create(user.id, user.username, user.role)

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    })

    response.headers.set("Set-Cookie", createSessionCookie(sessionId))
    return response
  } catch (error) {
    console.error("Verify OTP error:", error)
    return NextResponse.json({ error: "验证失败" }, { status: 500 })
  }
}
