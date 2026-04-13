import { NextRequest, NextResponse } from "next/server"
import { apiKeysKV, getSessionFromRequest } from "@/lib/kv"

export const runtime = "edge"

// 使用 POST 传递标签名，避免 DELETE 携带请求体时的兼容性差异。
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const body = await request.json()
    const tag = typeof body?.tag === "string" ? body.tag.trim() : ""

    if (!tag) {
      return NextResponse.json({ error: "标签不能为空" }, { status: 400 })
    }

    const affectedKeyCount = await apiKeysKV.removeTag(session.userId, tag)
    return NextResponse.json({ success: true, affectedKeyCount })
  } catch (error) {
    console.error("Delete tag error:", error)
    return NextResponse.json({ error: "删除标签失败" }, { status: 500 })
  }
}
