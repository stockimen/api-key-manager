import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, passkeysKV } from "@/lib/kv"

export const runtime = "edge"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const { id } = await params
    const credentialId = decodeURIComponent(id)

    const deleted = await passkeysKV.deleteCredential(session.userId, credentialId)
    if (!deleted) {
      return NextResponse.json({ error: "通行密钥不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Passkey delete error:", error)
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}
