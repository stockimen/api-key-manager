"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, XCircle, TestTube } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/i18n/language-context"
import { api } from "@/lib/api-client"
import type { ApiKey } from "@/lib/kv"

interface ApiStatusInfo {
  id: number
  provider: string
  name: string
  status: number
  message: string
  testedAt: string
  url: string
  latency: number
}

interface ConnectionTestResult {
  status: number
  message: string
  testedAt: string
  latency: number
}

type StatusLevel = "success" | "error"

function normalizeExternalUrl(url: string | undefined): string {
  const trimmed = url?.trim() || ""
  if (!trimmed) {
    return ""
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function getVisibleTestableKeys(keys: ApiKey[]): ApiKey[] {
  return keys.filter((key) => key.monitorOnDashboard && key.provider !== "Custom")
}

async function getCachedStatusForKey(key: ApiKey, fallbackMessage: string): Promise<ApiStatusInfo> {
  let testResult: ConnectionTestResult | null = null

  try {
    const cacheData = await api.get<{ result: ConnectionTestResult | null }>(`/test-connection?keyId=${key.id}`)
    testResult = cacheData.result
  } catch {
    // 无缓存
  }

  if (!testResult) {
    testResult = {
      status: 0,
      message: fallbackMessage,
      testedAt: new Date().toISOString(),
      latency: 0,
    }
  }

  return {
    id: key.id,
    provider: key.provider,
    name: key.name,
    status: testResult.status,
    message: testResult.message,
    testedAt: testResult.testedAt,
    url: normalizeExternalUrl(key.rechargeUrl),
    latency: testResult.latency || 0,
  }
}

export default function ApiStatusCard() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [apiStatuses, setApiStatuses] = useState<ApiStatusInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [testingKeys, setTestingKeys] = useState<Record<number, boolean>>({})

  const getStatusLevel = (message: string): StatusLevel => {
    if (message.includes("模型列表可获取") || message.includes("链接可访问")) {
      return "success"
    }

    return "error"
  }

  useEffect(() => {
    const fetchApiStatuses = async () => {
      try {
        const data = await api.get<{ keys: ApiKey[] }>("/keys")
        const visibleKeys = getVisibleTestableKeys(data.keys)

        const statuses = await Promise.all(
          visibleKeys.map((key) => getCachedStatusForKey(key, t("api.status.notTested"))),
        )

        setApiStatuses(statuses)
      } catch (error) {
        console.error("获取API状态失败:", error)
        toast({
          title: t("common.error"),
          description: t("error.fetchFailed"),
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchApiStatuses()
  }, [t, toast])

  const refreshAllStatuses = async () => {
    setLoading(true)
    try {
      const data = await api.get<{ keys: ApiKey[] }>("/keys")
      const visibleKeys = getVisibleTestableKeys(data.keys)

      const statuses = await Promise.all(
        visibleKeys.map(async (key) => {
          try {
            const testData = await api.post<{ result: ConnectionTestResult }>("/test-connection", {
              keyId: key.id,
            })

            return {
              id: key.id,
              provider: key.provider,
              name: key.name,
              status: testData.result.status,
              message: testData.result.message,
              testedAt: testData.result.testedAt,
              url: normalizeExternalUrl(key.rechargeUrl),
              latency: testData.result.latency || 0,
            }
          } catch {
            return {
              id: key.id,
              provider: key.provider,
              name: key.name,
              status: 0,
              message: t("error.serverConnectionFailed"),
              testedAt: new Date().toISOString(),
              url: normalizeExternalUrl(key.rechargeUrl),
              latency: 0,
            }
          }
        }),
      )

      setApiStatuses(statuses)

      toast({
        title: t("dashboard.balanceUpdated"),
        description: t("api.status.refresh"),
      })
      const refreshEvent = new CustomEvent("api-status-updated")
      window.dispatchEvent(refreshEvent)
    } catch (error) {
      console.error("刷新API状态失败:", error)
      toast({
        title: t("common.error"),
        description: t("error.fetchFailed"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testSingleApi = async (apiKeyId: number) => {
    setTestingKeys((prev) => ({ ...prev, [apiKeyId]: true }))

    try {
      const testData = await api.post<{ result: ConnectionTestResult }>("/test-connection", {
        keyId: apiKeyId,
      })

      setApiStatuses((prev) =>
        prev.map((status) =>
          status.id === apiKeyId
            ? {
                ...status,
                status: testData.result.status,
                message: testData.result.message,
                testedAt: testData.result.testedAt,
                latency: testData.result.latency || 0,
              }
            : status,
        ),
      )

      const statusName = apiStatuses.find((s) => s.id === apiKeyId)?.name || ""
      toast({
        title: t("api.status.test"),
        description: `${statusName}: ${testData.result.message}`,
      })
    } catch (error) {
      console.error("测试API失败:", error)
      setApiStatuses((prev) =>
        prev.map((status) =>
          status.id === apiKeyId
            ? {
                ...status,
                status: 0,
                message: t("error.serverConnectionFailed"),
                testedAt: new Date().toISOString(),
                latency: 0,
              }
            : status,
        ),
      )
    } finally {
      setTestingKeys((prev) => ({ ...prev, [apiKeyId]: false }))
    }
  }

  const getStatusIcon = (message: string) => {
    const level = getStatusLevel(message)

    if (level === "success") {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }

    return <XCircle className="h-5 w-5 text-red-500" />
  }

  const formatTestedTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString()
  }

  const translateStatusMessage = (message: string) => {
    if (message.includes("模型列表可获取")) return t("api.status.modelListAvailable")
    if (message.includes("链接可访问，模型列表鉴权失败")) return t("api.status.modelAuthFailed")
    if (message.includes("链接可访问")) return t("api.status.urlReachable")
    if (message.includes("连接正常")) return t("api.status.normal")
    if (message.includes("认证失败")) return t("api.status.authFailed")
    if (message.includes("请求频率限制")) return t("api.status.rateLimited")
    if (message.includes("连接异常")) return t("api.status.connectionError")
    if (message.includes("网络错误")) return t("error.networkError")
    if (message.includes("无法连接到服务器")) return t("error.serverConnectionFailed")
    if (message.includes("连接超时")) return t("error.timeout")
    if (message.includes("未知错误")) return t("error.unknownError")
    if (message.includes("连接失败")) return t("error.connectionFailed")
    if (message.includes("未测试")) return t("api.status.notTested")
    return message
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>{t("api.status.title")}</span>
          <Button variant="ghost" size="sm" onClick={refreshAllStatuses} disabled={loading} className="h-8 px-2">
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            {loading ? t("api.status.refreshing") : t("api.status.refresh")}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-lg font-medium">{t("api.status.connectionTest")}</div>
            <p className="text-xs text-muted-foreground">{t("api.status.urlTestDescription")}</p>
          </div>

          <div className="space-y-3 mt-4">
            {apiStatuses.map((status) => (
              <div key={status.id} className="p-3 border rounded-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center min-w-0">
                    {getStatusIcon(status.message)}
                    <span className="font-medium ml-2 truncate">{status.name}</span>
                    <span className="text-sm text-muted-foreground ml-2 shrink-0">({status.provider})</span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => testSingleApi(status.id)}
                      disabled={testingKeys[status.id]}
                    >
                      <TestTube className={`h-3 w-3 mr-1 ${testingKeys[status.id] ? "animate-spin" : ""}`} />
                      {testingKeys[status.id] ? t("api.status.testing") : t("api.status.test")}
                    </Button>
                    {status.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => {
                          window.open(status.url, "_blank", "noopener,noreferrer")
                        }}
                      >
                        {t("api.status.openLink")}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <div className="text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        getStatusLevel(status.message) === "success"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {translateStatusMessage(status.message)}
                    </span>
                    {status.latency > 0 && (
                      <span className="text-xs ml-2 text-muted-foreground">
                        {t("api.status.latency")}: {" "}
                        <span
                          className={`font-medium ${status.latency > 1000 ? "text-red-600" : status.latency > 500 ? "text-amber-600" : "text-green-600"}`}
                        >
                          {status.latency}ms
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("api.status.lastTested")}: {formatTestedTime(status.testedAt)}
                  </div>
                </div>
              </div>
            ))}

            {apiStatuses.length === 0 && !loading && (
              <div className="text-center py-4 text-muted-foreground">{t("api.status.noApiKeys")}</div>
            )}

            {loading && apiStatuses.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">{t("api.status.loading")}</div>
            )}
          </div>

          <div className="text-xs text-muted-foreground mt-2">
            <p>{t("api.status.autoUpdate")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}