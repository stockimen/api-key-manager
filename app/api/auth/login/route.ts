import { NextRequest, NextResponse } from "next/server"
import {
  createSessionCookie,
  ensureSingleAdminMigration,
  isLoginRateLimited,
  isSetupComplete,
  loginRateLimitKV,
  sessionKV,
  userKV,
} from "@/lib/kv"
import { verifyPassword } from "@/lib/encryption"

export const runtime = "edge"

function getClientIdentifier(request: NextRequest, username: string): string {
  const forwardedFor = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown"
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown"
  return `${ip}:${username.trim().toLowerCase()}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body as { username?: string; password?: string }

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码都是必填的" }, { status: 400 })
    }

    const rateLimitIdentifier = getClientIdentifier(request, username)
    const currentRateLimit = await loginRateLimitKV.get(rateLimitIdentifier)
    if (isLoginRateLimited(currentRateLimit)) {
      return NextResponse.json({ error: "登录尝试过于频繁，请稍后再试" }, { status: 429 })
    }

    const migratedUser = await ensureSingleAdminMigration(username)
    const user = migratedUser ?? (await userKV.getByUsername(username))

    if (!user) {
      if (!(await isSetupComplete())) {
        return NextResponse.json({ error: "系统尚未初始化" }, { status: 503 })
      }

      await loginRateLimitKV.increment(rateLimitIdentifier)
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.passwordHash, user.salt)
    if (!valid) {
      await loginRateLimitKV.increment(rateLimitIdentifier)
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 })
    }

    await loginRateLimitKV.clear(rateLimitIdentifier)

    const sessionId = await sessionKV.create(user.id, user.username, user.role)

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    })

    response.headers.set("Set-Cookie", createSessionCookie(sessionId))
    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "登录失败" }, { status: 500 })
  }
}
