import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/kv"

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: session.userId,
        username: session.username,
      },
    })
  } catch (error) {
    console.error("Session check error:", error)
    return NextResponse.json({ error: "会话验证失败" }, { status: 500 })
  }
}
