import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, passkeysKV } from "@/lib/kv"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const passkeys = await passkeysKV.getByUserId(session.userId)

    // 返回脱敏列表（不含公钥）
    const list = passkeys.map((pk) => ({
      id: pk.id,
      name: pk.name,
      createdAt: pk.createdAt,
      transports: pk.transports,
    }))

    return NextResponse.json({ passkeys: list })
  } catch (error) {
    console.error("Passkey list error:", error)
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}
