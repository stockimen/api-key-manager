import { NextRequest, NextResponse } from "next/server"
import { apiKeysKV, cacheKV, getSessionFromRequest } from "@/lib/kv"

export const runtime = "edge"

const REQUEST_TIMEOUT_MS = 10000

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

    const apiKey = await apiKeysKV.getById(session.userId, keyId)
    if (!apiKey) {
      return NextResponse.json({ error: "密钥不存在" }, { status: 404 })
    }

    const result = await testConnection(apiKey)
    await cacheKV.setTestResult(session.userId, keyId, result)

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

    const exists = await apiKeysKV.exists(session.userId, keyId)
    if (!exists) {
      return NextResponse.json({ error: "密钥不存在" }, { status: 404 })
    }

    const result = await cacheKV.getTestResult(session.userId, keyId)
    return NextResponse.json({ result })
  } catch (error) {
    console.error("Get cached test result error:", error)
    return NextResponse.json({ error: "获取测试结果失败" }, { status: 500 })
  }
}

type ConnectionResult = {
  status: number
  message: string
  testedAt: string
  latency: number
}

type FetchProbeResult = {
  response?: Response
  latency: number
  timedOut?: boolean
  networkError?: boolean
}

async function testConnection(apiKey: { key: string; baseUrl: string; provider: string }): Promise<ConnectionResult> {
  const testedAt = new Date().toISOString()
  const normalizedUrl = normalizeUrl(apiKey.baseUrl)

  if (!normalizedUrl) {
    return {
      status: 0,
      message: "URL不能为空",
      testedAt,
      latency: 0,
    }
  }

  const reachabilityResult = await probeUrlReachability(normalizedUrl)
  if (!reachabilityResult.response) {
    return {
      status: 0,
      message: reachabilityResult.timedOut ? "连接超时" : "无法连接到服务器",
      testedAt,
      latency: 0,
    }
  }

  const baseStatus = reachabilityResult.response.status
  const baseLatency = reachabilityResult.latency
  const modelListUrl = buildModelListUrl(normalizedUrl)

  if (modelListUrl) {
    const modelResult = await probeModelList(modelListUrl, apiKey)

    if (modelResult.response?.ok) {
      return {
        status: modelResult.response.status,
        message: "模型列表可获取",
        testedAt,
        latency: modelResult.latency,
      }
    }

    if (modelResult.response && [401, 403].includes(modelResult.response.status)) {
      return {
        status: modelResult.response.status,
        message: "链接可访问，模型列表鉴权失败",
        testedAt,
        latency: modelResult.latency,
      }
    }
  }

  return {
    status: baseStatus,
    message: `链接可访问 (${baseStatus})`,
    testedAt,
    latency: baseLatency,
  }
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) {
    return ""
  }

  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).toString()
  } catch {
    return ""
  }
}

function buildModelListUrl(baseUrl: string): string | null {
  try {
    const url = new URL(baseUrl)
    const path = url.pathname.replace(/\/+$/, "")

    if (path.endsWith("/models")) {
      return url.toString()
    }

    if (path.endsWith("/chat/completions")) {
      url.pathname = `${path.slice(0, -"/chat/completions".length) || ""}/models`
      return url.toString()
    }

    if (path.endsWith("/completions")) {
      url.pathname = `${path.slice(0, -"/completions".length) || ""}/models`
      return url.toString()
    }

    url.pathname = `${path || ""}/models`
    return url.toString()
  } catch {
    return null
  }
}

function buildApiHeaders(apiKey: { key: string; provider: string }): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (!apiKey.key) {
    return headers
  }

  if (apiKey.provider === "Anthropic") {
    headers["x-api-key"] = apiKey.key
    headers["anthropic-version"] = "2023-06-01"
    return headers
  }

  headers.Authorization = `Bearer ${apiKey.key}`
  return headers
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<FetchProbeResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const startTime = performance.now()

  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    return {
      response,
      latency: Math.round(performance.now() - startTime),
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { latency: 0, timedOut: true }
    }

    return { latency: 0, networkError: true }
  } finally {
    clearTimeout(timeout)
  }
}

async function probeUrlReachability(url: string): Promise<FetchProbeResult> {
  const headResult = await fetchWithTimeout(url, {
    method: "HEAD",
    redirect: "follow",
  })

  if (!headResult.response || ![405, 501].includes(headResult.response.status)) {
    return headResult
  }

  return fetchWithTimeout(url, {
    method: "GET",
    redirect: "follow",
  })
}

async function probeModelList(
  url: string,
  apiKey: { key: string; provider: string },
): Promise<FetchProbeResult> {
  return fetchWithTimeout(url, {
    method: "GET",
    headers: buildApiHeaders(apiKey),
    redirect: "follow",
  })
}
