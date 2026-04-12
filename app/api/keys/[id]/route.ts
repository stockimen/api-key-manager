import { NextRequest, NextResponse } from "next/server"
import { normalizeApiKeyTags } from "@/lib/api-key-tags"
import { apiKeysKV, getSessionFromRequest } from "@/lib/kv"

export const runtime = "edge"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const keyId = parseInt(params.id, 10)
    if (isNaN(keyId)) {
      return NextResponse.json({ error: "无效的密钥ID" }, { status: 400 })
    }

    const body = await request.json()
    const { name, key, type, provider, rechargeUrl, appId, secretKey, baseUrl, monitorOnDashboard, priority, tags } = body
    const normalizedTags = tags === undefined ? undefined : normalizeApiKeyTags(tags)
    const updateData = Object.fromEntries(
      Object.entries({ name, key, type, provider, rechargeUrl, appId, secretKey, baseUrl, monitorOnDashboard, priority, tags: normalizedTags })
        .filter(([_, v]) => v !== undefined)
    )
    const updated = await apiKeysKV.updateKey(session.userId, keyId, updateData)

    if (!updated) {
      return NextResponse.json({ error: "密钥不存在" }, { status: 404 })
    }

    return NextResponse.json({ key: updated })
  } catch (error) {
    console.error("Update key error:", error)
    return NextResponse.json({ error: "更新密钥失败" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const keyId = parseInt(params.id, 10)
    if (isNaN(keyId)) {
      return NextResponse.json({ error: "无效的密钥ID" }, { status: 400 })
    }

    const deleted = await apiKeysKV.deleteKey(session.userId, keyId)
    if (!deleted) {
      return NextResponse.json({ error: "密钥不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete key error:", error)
    return NextResponse.json({ error: "删除密钥失败" }, { status: 500 })
  }
}
