import { NextRequest, NextResponse } from "next/server"
import { settingsKV, getSessionFromRequest } from "@/lib/kv"

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const settings = await settingsKV.get()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Get settings error:", error)
    return NextResponse.json({ error: "获取设置失败" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const body = await request.json()
    const settings = await settingsKV.update(body)
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Update settings error:", error)
    return NextResponse.json({ error: "更新设置失败" }, { status: 500 })
  }
}
