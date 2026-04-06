import { NextRequest, NextResponse } from "next/server"
import { createInitialAdmin, getSetupToken, isSetupComplete } from "@/lib/kv"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    if (await isSetupComplete()) {
      return NextResponse.json({ error: "系统已初始化" }, { status: 409 })
    }

    const expectedToken = getSetupToken()
    if (!expectedToken) {
      return NextResponse.json({ error: "未配置 SETUP_TOKEN" }, { status: 500 })
    }

    const authorization = request.headers.get("authorization") || ""
    const providedToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : ""

    if (!providedToken || providedToken !== expectedToken) {
      return NextResponse.json({ error: "初始化令牌无效" }, { status: 403 })
    }

    const body = await request.json()
    const { username, email, password } = body as {
      username?: string
      email?: string
      password?: string
    }

    if (!username || !email || !password) {
      return NextResponse.json({ error: "用户名、邮箱和密码都是必填的" }, { status: 400 })
    }

    const user = await createInitialAdmin({ username, email, password })

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "初始化失败"
    const status = message === "系统已初始化" ? 409 : message.includes("不能为空") || message.includes("至少") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
