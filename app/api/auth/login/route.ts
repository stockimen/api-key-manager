import { NextRequest, NextResponse } from "next/server"
import { userKV, sessionKV, initializeDefaultData, createSessionCookie } from "@/lib/kv"
import { hashPassword, verifyPassword } from "@/lib/encryption"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    // 确保默认数据已初始化
    await initializeDefaultData()

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码都是必填的" }, { status: 400 })
    }

    const user = await userKV.getByUsername(username)
    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 })
    }

    // 处理默认密码的首次初始化
    if (user.passwordHash === "pending") {
      const { hash, salt } = await hashPassword("password")
      user.passwordHash = hash
      user.salt = salt
      await userKV.update(username, { passwordHash: hash, salt })
    }

    const valid = await verifyPassword(password, user.passwordHash, user.salt)
    if (!valid) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 })
    }

    // 创建会话
    const sessionId = await sessionKV.create(user.id, user.username)

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email },
    })

    response.headers.set("Set-Cookie", createSessionCookie(sessionId))
    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "登录失败" }, { status: 500 })
  }
}
