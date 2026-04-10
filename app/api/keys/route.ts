import { NextRequest, NextResponse } from "next/server"
import { apiKeysKV, getSessionFromRequest } from "@/lib/kv"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const keys = await apiKeysKV.getByUserId(session.userId)
    keys.sort((a, b) => b.priority - a.priority || a.id - b.id)
    return NextResponse.json({ keys })
  } catch (error) {
    console.error("Get keys error:", error)
    return NextResponse.json({ error: "获取密钥失败" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const body = await request.json()
    const { name, key, type, provider, rechargeUrl, appId, secretKey, baseUrl, monitorOnDashboard, priority } = body

    if (!name || !key || !provider) {
      return NextResponse.json({ error: "名称、密钥和提供商为必填项" }, { status: 400 })
    }

    const newKey = await apiKeysKV.addKey(session.userId, {
      userId: session.userId,
      name,
      key,
      type: type || "apikey",
      provider,
      rechargeUrl: rechargeUrl || "",
      appId: type === "complex" ? appId : undefined,
      secretKey: type === "complex" ? secretKey : undefined,
      baseUrl: baseUrl || "",
      monitorOnDashboard: monitorOnDashboard === true,
      priority: typeof priority === 'number' ? priority : 0,
    })

    return NextResponse.json({ key: newKey }, { status: 201 })
  } catch (error) {
    console.error("Add key error:", error)
    return NextResponse.json({ error: "添加密钥失败" }, { status: 500 })
  }
}
