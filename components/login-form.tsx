"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/i18n/language-context"
import { api } from "@/lib/api-client"

export default function LoginForm() {
  const { t } = useLanguage()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const data = await api.post<{ success: boolean; user: { id: number; username: string; email: string } }>(
        "/auth/login",
        { username, password }
      )

      if (data.success) {
        router.replace("/dashboard")
        router.refresh()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("login.error")
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("login.title")}</CardTitle>
        <CardDescription>{t("login.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="login-form" onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t("common.username")}</Label>
            <Input
              id="username"
              type="text"
              placeholder={t("common.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("common.password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("common.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      </CardContent>
      <CardFooter>
        <Button className="w-full" type="submit" form="login-form" disabled={loading}>
          {loading ? t("common.loading") : t("login.button")}
        </Button>
      </CardFooter>
    </Card>
  )
}
