import { NextRequest, NextResponse } from "next/server"
import { sessionKV, clearSessionCookie, getSessionFromRequest } from "@/lib/kv"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (session) {
      // 从 cookie 中获取 sessionId
      const cookieHeader = request.headers.get("cookie") || ""
      const match = cookieHeader.match(/session_id=([^;]+)/)
      if (match) {
        await sessionKV.delete(match[1])
      }
    }

    const response = NextResponse.json({ success: true })
    response.headers.set("Set-Cookie", clearSessionCookie())
    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "登出失败" }, { status: 500 })
  }
}
