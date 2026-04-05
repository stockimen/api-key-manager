/**
 * API 客户端 - 统一的 fetch 封装
 */

const API_BASE = "/api"

interface ApiOptions {
  method?: string
  body?: unknown
}

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isUnauthorizedError(error: unknown): boolean {
  return isApiError(error) && error.status === 401
}

export async function apiClient<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body } = options

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    credentials: "include",
  }

  if (body && method !== "GET") {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions)
  const rawText = await response.text()
  let data: unknown = null

  if (rawText) {
    try {
      data = JSON.parse(rawText)
    } catch {
      data = rawText
    }
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error?: unknown }).error ?? "请求失败")
        : `请求失败 (${response.status})`

    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"))
    }

    throw new ApiError(errorMessage, response.status, data)
  }

  return data as T
}

// 便捷方法
export const api = {
  get: <T>(endpoint: string) => apiClient<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) => apiClient<T>(endpoint, { method: "POST", body }),
  put: <T>(endpoint: string, body: unknown) => apiClient<T>(endpoint, { method: "PUT", body }),
  delete: <T>(endpoint: string) => apiClient<T>(endpoint, { method: "DELETE" }),
}
