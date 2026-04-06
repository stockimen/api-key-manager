"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ApiStatusCard from "@/components/api-balance-card"
import { useLanguage } from "@/lib/i18n/language-context"
import { useState, useEffect } from "react"
import { api } from "@/lib/api-client"
import { Progress } from "@/components/ui/progress"
import { Activity } from "lucide-react"

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

interface ConnectionTestResult {
  status: number
  message: string
  testedAt: string
  latency: number
}

function isAvailableResult(result: ConnectionTestResult | null): boolean {
  if (!result) {
    return false
  }

  return result.message.includes("模型列表可获取") || result.message.includes("链接可访问")
}

export default function DashboardPage() {
  const { t } = useLanguage()
  const [activeKeys, setActiveKeys] = useState(0)
  const [apiAvailability, setApiAvailability] = useState(0)

  useEffect(() => {
    const calculateApiStats = async () => {
      try {
        const data = await api.get<{ keys: ApiKey[] }>("/keys")
        const keys = data.keys

        setActiveKeys(keys.length)

        const testableKeys = keys.filter((key) => key.provider !== "Custom")
        const testResults = await Promise.all(
          testableKeys.map(async (key) => {
            try {
              const result = await api.get<{ result: ConnectionTestResult | null }>(
                `/test-connection?keyId=${key.id}`,
              )
              return result.result
            } catch {
              return null
            }
          }),
        )

        let availableCount = 0
        let totalTestedCount = 0

        testResults.forEach((result) => {
          if (result) {
            totalTestedCount++
            if (isAvailableResult(result)) {
              availableCount++
            }
          }
        })

        const availability = totalTestedCount > 0 ? Math.round((availableCount / totalTestedCount) * 100) : 0
        setApiAvailability(availability)
      } catch (error) {
        console.error("获取统计信息失败:", error)
      }
    }

    calculateApiStats()
  }, [])

  useEffect(() => {
    const handleApiStatusUpdate = () => {
      const recalculate = async () => {
        try {
          const data = await api.get<{ keys: ApiKey[] }>("/keys")
          const keys = data.keys
          setActiveKeys(keys.length)

          const testableKeys = keys.filter((key) => key.provider !== "Custom")
          const testResults = await Promise.all(
            testableKeys.map(async (key) => {
              try {
                const result = await api.get<{ result: ConnectionTestResult | null }>(
                  `/test-connection?keyId=${key.id}`,
                )
                return result.result
              } catch {
                return null
              }
            }),
          )

          let availableCount = 0
          let totalTestedCount = 0

          testResults.forEach((result) => {
            if (result) {
              totalTestedCount++
              if (isAvailableResult(result)) {
                availableCount++
              }
            }
          })

          const availability = totalTestedCount > 0 ? Math.round((availableCount / totalTestedCount) * 100) : 0
          setApiAvailability(availability)
        } catch (error) {
          console.error("重新计算统计失败:", error)
        }
      }

      recalculate()
    }

    window.addEventListener("api-status-updated", handleApiStatusUpdate)
    return () => {
      window.removeEventListener("api-status-updated", handleApiStatusUpdate)
    }
  }, [])

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold mb-6">{t("dashboard.title")}</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.activeKeys")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeKeys}</div>
            <p className="text-xs text-muted-foreground">{t("dashboard.comparedToLastMonth")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.encryptedKeys")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground">{t("dashboard.allKeysEncrypted")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.apiAvailability")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiAvailability}%</div>
            <div className="mt-2">
              <Progress value={apiAvailability} className="h-1.5" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {apiAvailability >= 90
                ? t("dashboard.apiAvailabilityNormal")
                : apiAvailability >= 70
                  ? t("dashboard.apiAvailabilityDelayed")
                  : t("dashboard.apiAvailabilityIssues")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <ApiStatusCard />
      </div>
    </div>
  )
}
