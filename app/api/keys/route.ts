import { NextRequest, NextResponse } from "next/server"
import { apiKeysKV, getSessionFromRequest, initializeDefaultData } from "@/lib/kv"

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    await initializeDefaultData()
    const keys = await apiKeysKV.getByUserId(session.userId)
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
    const { name, key, type, provider, rechargeUrl, appId, secretKey, baseUrl } = body

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
    })

    return NextResponse.json({ key: newKey }, { status: 201 })
  } catch (error) {
    console.error("Add key error:", error)
    return NextResponse.json({ error: "添加密钥失败" }, { status: 500 })
  }
}
