"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, RefreshCw, AlertCircle, CheckCircle, XCircle, TestTube } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/i18n/language-context"
import { api } from "@/lib/api-client"

// API密钥类型（本地定义，不再依赖旧 storage）
interface ApiKey {
  id: number
  userId: number
  name: string
  key: string
  type: "apikey" | "complex"
  provider: string
  rechargeUrl?: string
  appId?: string
  secretKey?: string
  baseUrl: string
  createdAt: string
  lastUsed: string
}

// API状态信息类型
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

// 连接测试结果类型
interface ConnectionTestResult {
  status: number
  message: string
  testedAt: string
  latency: number
}

// 获取充值URL
function getRechargeUrl(provider: string): string {
  switch (provider) {
    case "OpenAI":
      return "https://platform.openai.com/account/billing/overview"
    case "Anthropic":
      return "https://console.anthropic.com/account/billing"
    case "Baidu":
      return "https://console.bce.baidu.com/billing/#/billing/cbm/recharge"
    case "Google":
      return "https://console.cloud.google.com/billing"
    case "Meta":
      return "https://llama-api.meta.com/billing"
    case "Mistral":
      return "https://console.mistral.ai/billing/"
    case "Cohere":
      return "https://dashboard.cohere.com/account/billing"
    default:
      return "#"
  }
}

export default function ApiStatusCard() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [apiStatuses, setApiStatuses] = useState<ApiStatusInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [testingKeys, setTestingKeys] = useState<Record<number, boolean>>({})

  // 获取API状态信息
  useEffect(() => {
    const fetchApiStatuses = async () => {
      try {
        const data = await api.get<{ keys: ApiKey[] }>("/keys")
        const apiKeys = data.keys

        const statusesPromises = apiKeys.map(async (key) => {
          if (key.provider === "Custom") return null

          // 尝试从 API 缓存获取测试结果
          let testResult: ConnectionTestResult | null = null
          try {
            const cacheData = await api.get<{ result: ConnectionTestResult | null }>(
              `/test-connection?keyId=${key.id}`,
            )
            testResult = cacheData.result
          } catch {
            // 无缓存
          }

          // 如果没有缓存结果，进行测试
          if (!testResult) {
            try {
              const testData = await api.post<{ result: ConnectionTestResult }>("/test-connection", {
                keyId: key.id,
              })
              testResult = testData.result
            } catch {
              testResult = {
                status: 0,
                message: "连接失败",
                testedAt: new Date().toISOString(),
                latency: 0,
              }
            }
          }

          const rechargeUrl = key.rechargeUrl || getRechargeUrl(key.provider)

          return {
            id: key.id,
            provider: key.provider,
            name: key.name,
            status: testResult.status,
            message: testResult.message,
            testedAt: testResult.testedAt,
            url: rechargeUrl,
            latency: testResult.latency || 0,
          }
        })

        const statuses = (await Promise.all(statusesPromises)).filter(Boolean) as ApiStatusInfo[]
        setApiStatuses(statuses)
        setLoading(false)
      } catch (error) {
        console.error("获取API状态失败:", error)
        toast({
          title: t("common.error"),
          description: t("error.fetchFailed"),
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchApiStatuses()
  }, [t, toast])

  // 刷新所有API状态
  const refreshAllStatuses = async () => {
    setLoading(true)
    try {
      const data = await api.get<{ keys: ApiKey[] }>("/keys")
      const apiKeys = data.keys

      const statusesPromises = apiKeys.map(async (key) => {
        if (key.provider === "Custom") return null

        try {
          const testData = await api.post<{ result: ConnectionTestResult }>("/test-connection", {
            keyId: key.id,
          })

          const rechargeUrl = key.rechargeUrl || getRechargeUrl(key.provider)

          return {
            id: key.id,
            provider: key.provider,
            name: key.name,
            status: testData.result.status,
            message: testData.result.message,
            testedAt: testData.result.testedAt,
            url: rechargeUrl,
            latency: testData.result.latency || 0,
          }
        } catch {
          return {
            id: key.id,
            provider: key.provider,
            name: key.name,
            status: 0,
            message: t("error.connectionFailed"),
            testedAt: new Date().toISOString(),
            url: key.rechargeUrl || getRechargeUrl(key.provider),
            latency: 0,
          }
        }
      })

      const statuses = (await Promise.all(statusesPromises)).filter(Boolean) as ApiStatusInfo[]
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

  // 测试单个API
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
                message: t("error.connectionFailed"),
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

  // 获取状态图标
  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    } else if (status === 401 || status === 403) {
      return <XCircle className="h-5 w-5 text-red-500" />
    } else if (status === 429) {
      return <AlertCircle className="h-5 w-5 text-amber-500" />
    } else {
      return <AlertCircle className="h-5 w-5 text-red-500" />
    }
  }

  // 格式化测试时间
  const formatTestedTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString()
  }

  // 找出状态最差的API
  const findWorstApi = () => {
    if (apiStatuses.length === 0) return null

    const priorityOrder: Record<string, number> = {
      [t("api.status.normal")]: 3,
      [t("api.status.rateLimited")]: 2,
      [t("api.status.authFailed")]: 1,
      [t("api.status.connectionError")]: 0,
      [t("error.networkError")]: 0,
      [t("error.serverConnectionFailed")]: 0,
      [t("error.timeout")]: 0,
      [t("error.unknownError")]: 0,
    }

    return apiStatuses.reduce((worst, current) => {
      const worstPriority = priorityOrder[worst.message.split(" ")[0]] || 0
      const currentPriority = priorityOrder[current.message.split(" ")[0]] || 0
      return currentPriority < worstPriority ? current : worst
    }, apiStatuses[0])
  }

  // 翻译API状态消息
  const translateStatusMessage = (message: string) => {
    if (message.includes("连接正常")) return t("api.status.normal")
    if (message.includes("认证失败")) return t("api.status.authFailed")
    if (message.includes("请求频率限制")) return t("api.status.rateLimited")
    if (message.includes("连接异常")) return t("api.status.connectionError")
    if (message.includes("网络错误")) return t("error.networkError")
    if (message.includes("无法连接到服务器")) return t("error.serverConnectionFailed")
    if (message.includes("连接超时")) return t("error.timeout")
    if (message.includes("未知错误")) return t("error.unknownError")
    if (message.includes("连接失败")) return t("error.connectionFailed")
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
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg font-medium">{t("api.status.connectionTest")}</div>
              <p className="text-xs text-muted-foreground">{t("api.status.urlTestDescription")}</p>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                const worstApi = findWorstApi()
                if (!worstApi) return

                let url = worstApi.url
                if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
                  url = "https://" + url
                }

                window.open(url, "_blank", "noopener,noreferrer")

                toast({
                  title: t("api.status.redirecting"),
                  description: t("api.status.rechargeManage").replace("{provider}", worstApi.provider),
                })
              }}
              disabled={apiStatuses.length === 0}
            >
              {t("api.status.rechargeManage")}
              <ExternalLink className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3 mt-4">
            {apiStatuses.map((status) => (
              <div key={status.id} className="p-3 border rounded-md">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {getStatusIcon(status.status)}
                    <span className="font-medium ml-2">{status.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">({status.provider})</span>
                  </div>
                  <div className="flex items-center space-x-2">
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => {
                        let url = status.url
                        if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
                          url = "https://" + url
                        }
                        window.open(url, "_blank", "noopener,noreferrer")
                      }}
                    >
                      {t("api.status.recharge")}
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <div className="text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        status.status >= 200 && status.status < 300
                          ? "bg-green-100 text-green-800"
                          : status.status === 429
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {translateStatusMessage(status.message)}
                    </span>
                    {status.latency > 0 && (
                      <span className="text-xs ml-2 text-muted-foreground">
                        {t("api.status.latency")}:{" "}
                        <span
                          className={`font-medium ${status.latency > 500 ? "text-amber-600" : status.latency > 1000 ? "text-red-600" : "text-green-600"}`}
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
            <p>{t("api.status.rechargeButton")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
