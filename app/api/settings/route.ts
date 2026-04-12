import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, settingsKV } from "@/lib/kv"

export const runtime = "edge"

function ensureAdminRole(role: string | undefined): boolean {
  return role === "admin"
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    if (!ensureAdminRole(session.role)) {
      return NextResponse.json({ error: "无权限访问系统设置" }, { status: 403 })
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

    if (!ensureAdminRole(session.role)) {
      return NextResponse.json({ error: "无权限修改系统设置" }, { status: 403 })
    }

    const body = await request.json()
    const settings = await settingsKV.update({
      defaultKeyType: body.defaultKeyType,
      defaultKeyCategoryId: body.defaultKeyCategoryId,
      defaultListCategoryId: body.defaultListCategoryId,
      keyCategories: body.keyCategories,
    })
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Update settings error:", error)
    return NextResponse.json({ error: "更新设置失败" }, { status: 500 })
  }
}
