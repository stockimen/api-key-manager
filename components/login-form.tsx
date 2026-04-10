"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import { useLanguage } from "@/lib/i18n/language-context"
import { api } from "@/lib/api-client"
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile"
import { prepareRequestOptions, encodeAuthenticationResponse } from "@/lib/webauthn-client"
import { Eye, EyeOff, ArrowLeft, Fingerprint } from "lucide-react"

export default function LoginForm() {
  const { t } = useLanguage()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  // OTP 两步验证状态
  const [step, setStep] = useState<"credentials" | "otp">("credentials")
  const [tempToken, setTempToken] = useState("")
  const [otpCode, setOtpCode] = useState("")

  // Turnstile 状态（仅在密码登录步骤使用）
  const [turnstileToken, setTurnstileToken] = useState("")
  const turnstileRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetId = useRef<string | null>(null)

  const renderTurnstile = useCallback(() => {
    if (!turnstileRef.current) return
    const siteKey = TURNSTILE_SITE_KEY
    if (!siteKey || !(window as unknown as { turnstile?: { render: Function; remove: Function } }).turnstile) return
    const turnstile = (window as unknown as { turnstile: { render: Function; remove: Function } }).turnstile
    if (turnstileWidgetId.current) {
      try { turnstile.remove(turnstileWidgetId.current) } catch {}
    }
    turnstileWidgetId.current = turnstile.render(turnstileRef.current, {
      sitekey: siteKey,
      callback: (token: string) => setTurnstileToken(token),
      "error-callback": () => setTurnstileToken(""),
      "expired-callback": () => setTurnstileToken(""),
    })
  }, [])

  useEffect(() => {
    if ((window as unknown as { turnstile?: { render: Function } }).turnstile) {
      renderTurnstile()
      return
    }
    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
    script.async = true
    document.head.appendChild(script)
    let timer: ReturnType<typeof setInterval> | undefined
    timer = setInterval(() => {
      if ((window as unknown as { turnstile?: { render: Function } }).turnstile) {
        clearInterval(timer)
        renderTurnstile()
      }
    }, 100)
    return () => {
      script.remove()
      if (timer) clearInterval(timer)
      if (turnstileWidgetId.current) {
        try { (window as unknown as { turnstile?: { remove: Function } }).turnstile?.remove(turnstileWidgetId.current) } catch {}
        turnstileWidgetId.current = null
      }
    }
  }, [renderTurnstile])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const data = await api.post<{ success?: boolean; requireOTP?: boolean; tempToken?: string; user?: { id: number; username: string } }>(
        "/auth/login",
        { username, password, turnstileToken }
      )

      if (data.requireOTP && data.tempToken) {
        setTempToken(data.tempToken)
        setStep("otp")
        return
      }

      if (data.success) {
        router.replace("/dashboard")
        router.refresh()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("login.error")
      setError(message)
      setTurnstileToken("")
      renderTurnstile()
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6) return
    setLoading(true)
    setError("")

    try {
      const data = await api.post<{ success: boolean; user: { id: number; username: string } }>(
        "/auth/verify-otp",
        { tempToken, code }
      )

      if (data.success) {
        router.replace("/dashboard")
        router.refresh()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("login.error")
      setError(message)
      setOtpCode("")
    } finally {
      setLoading(false)
    }
  }

  const handlePasskeyLogin = async () => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      setError("您的浏览器不支持 Passkey，请使用密码登录")
      return
    }
    setLoading(true)
    setError("")

    try {
      const startData = await api.post<{
        challenge: string
        rpId?: string
        timeout?: number
        allowCredentials: { type: string; id: string; transports?: string[] }[]
        userVerification?: string
      }>("/auth/passkey/authenticate-start", { turnstileToken })

      const requestOptions = prepareRequestOptions(startData)
      const assertion = await navigator.credentials.get({ publicKey: requestOptions }) as PublicKeyCredential
      if (!assertion) throw new Error("认证已取消")

      const encoded = encodeAuthenticationResponse(assertion)
      const finishData = await api.post<{ success: boolean; user: { id: number; username: string } }>(
        "/auth/passkey/authenticate-finish",
        { credential: encoded, challenge: startData.challenge },
      )

      if (finishData.success) {
        router.replace("/dashboard")
        router.refresh()
      }
    } catch (err) {
      if (err instanceof Error && (err.name === "AbortError" || err.message === "认证已取消")) {
        setLoading(false)
        return
      }
      const message = err instanceof Error ? err.message : t("login.error")
      setError(message)
      setTurnstileToken("")
      renderTurnstile()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("login.title")}</CardTitle>
        <CardDescription>
          {step === "otp" ? t("auth.enterOtp") : t("login.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "credentials" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("common.username")}</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder={t("common.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("common.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("common.password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            {TURNSTILE_SITE_KEY && (
              <div ref={turnstileRef} className="flex justify-center" />
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading || (TURNSTILE_SITE_KEY && !turnstileToken)}>
              {loading ? t("common.loading") : t("login.button")}
            </Button>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("common.or")}</span>
              </div>
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={handlePasskeyLogin}
              disabled={loading || (TURNSTILE_SITE_KEY && !turnstileToken)}
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              {t("passkey.loginButton")}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={(value) => {
                  setOtpCode(value)
                  if (value.length === 6 && !loading) {
                    handleVerifyOtp(value)
                  }
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <Button
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
              onClick={() => {
                setStep("credentials")
                setOtpCode("")
                setTempToken("")
                setError("")
              }}
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              {t("auth.backToLogin")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
