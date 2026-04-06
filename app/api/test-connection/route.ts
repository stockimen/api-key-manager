import { NextRequest, NextResponse } from "next/server"
import { apiKeysKV, cacheKV, getSessionFromRequest } from "@/lib/kv"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const { keyId } = await request.json()
    if (!keyId) {
      return NextResponse.json({ error: "keyId 为必填项" }, { status: 400 })
    }

    // 获取密钥
    const keys = await apiKeysKV.getByUserId(session.userId)
    const apiKey = keys.find((k) => k.id === keyId)
    if (!apiKey) {
      return NextResponse.json({ error: "密钥不存在" }, { status: 404 })
    }

    // 测试连接
    const result = await testConnection(apiKey)

    // 缓存结果
    await cacheKV.setTestResult(keyId, result)

    return NextResponse.json({ result })
  } catch (error) {
    console.error("Test connection error:", error)
    return NextResponse.json({ error: "测试连接失败" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keyId = parseInt(searchParams.get("keyId") || "0", 10)

    if (!keyId) {
      return NextResponse.json({ error: "keyId 为必填项" }, { status: 400 })
    }

    const result = await cacheKV.getTestResult(keyId)
    return NextResponse.json({ result })
  } catch (error) {
    console.error("Get cached test result error:", error)
    return NextResponse.json({ error: "获取测试结果失败" }, { status: 500 })
  }
}

async function testConnection(apiKey: { key: string; appId?: string; baseUrl: string; provider: string }): Promise<{
  status: number
  message: string
  testedAt: string
  latency: number
}> {
  try {
    const url = apiKey.baseUrl
    if (!url || url.trim() === "") {
      return { status: 0, message: "URL不能为空", testedAt: new Date().toISOString(), latency: 0 }
    }

    const headers: Record<string, string> = {}
    switch (apiKey.provider) {
      case "Anthropic":
        headers["x-api-key"] = apiKey.key
        break
      default:
        headers["Authorization"] = `Bearer ${apiKey.key}`
    }

    const startTime = performance.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const latency = Math.round(performance.now() - startTime)
    let message = "连接正常"
    if (response.status === 401 || response.status === 403) message = "认证失败"
    else if (response.status === 429) message = "请求频率限制"
    else if (response.status >= 300) message = `连接异常 (${response.status})`

    return { status: response.status, message, testedAt: new Date().toISOString(), latency }
  } catch (error) {
    let message = "未知错误"
    if (error instanceof DOMException && error.name === "AbortError") message = "连接超时"
    else if (error instanceof TypeError) message = "无法连接到服务器"

    return { status: 0, message, testedAt: new Date().toISOString(), latency: 0 }
  }
}
