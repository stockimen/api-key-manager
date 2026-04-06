import { NextRequest, NextResponse } from "next/server"
import { userKV, getSessionFromRequest, getSessionIdFromRequest, sessionKV, UserConflictError } from "@/lib/kv"
import { hashPassword, verifyPassword } from "@/lib/encryption"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const user = await userKV.getByUsername(session.username)
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: "获取用户信息失败" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword, username, email } = body

    // 修改密码
    if (currentPassword && newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "密码长度至少为6个字符" }, { status: 400 })
      }

      const user = await userKV.getByUsername(session.username)
      if (!user) {
        return NextResponse.json({ error: "用户不存在" }, { status: 404 })
      }

      const valid = await verifyPassword(currentPassword, user.passwordHash, user.salt)
      if (!valid) {
        return NextResponse.json({ error: "当前密码错误" }, { status: 400 })
      }

      const { hash, salt } = await hashPassword(newPassword)
      await userKV.update(session.username, { passwordHash: hash, salt })

      return NextResponse.json({ success: true })
    }

    // 更新个人资料
    if (username || email) {
      const user = await userKV.getByUsername(session.username)
      if (!user) {
        return NextResponse.json({ error: "用户不存在" }, { status: 404 })
      }

      const normalizedUsername = typeof username === "string" ? username.trim() : undefined
      const normalizedEmail = typeof email === "string" ? email.trim() : undefined

      if (typeof username === "string" && !normalizedUsername) {
        return NextResponse.json({ error: "用户名不能为空" }, { status: 400 })
      }

      if (normalizedUsername && normalizedUsername !== session.username) {
        const existingUser = await userKV.getByUsername(normalizedUsername)
        if (existingUser) {
          return NextResponse.json({ error: "用户名已存在" }, { status: 409 })
        }
      }

      const updated = await userKV.update(session.username, {
        ...(normalizedUsername ? { username: normalizedUsername } : {}),
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
      })

      if (!updated) {
        return NextResponse.json({ error: "用户不存在" }, { status: 404 })
      }

      if (updated.username !== session.username) {
        const sessionId = getSessionIdFromRequest(request)
        if (sessionId) {
          await sessionKV.update(sessionId, { username: updated.username })
        }
      }

      return NextResponse.json({
        user: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
          createdAt: updated.createdAt,
        },
      })
    }

    return NextResponse.json({ error: "未提供有效的更新字段" }, { status: 400 })
  } catch (error) {
    if (error instanceof UserConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }

    console.error("Update user error:", error)
    return NextResponse.json({ error: "更新用户信息失败" }, { status: 500 })
  }
}
