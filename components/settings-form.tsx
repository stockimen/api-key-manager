"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/i18n/language-context"
import { api, isApiError } from "@/lib/api-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Shield, ShieldOff, QrCode } from "lucide-react"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import QRCode from "qrcode"
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile"

export default function SettingsForm() {
  const { toast } = useToast()
  const { t, language, setLanguage } = useLanguage()

  const [defaultKeyType, setDefaultKeyType] = useState("apikey")
  const [canManageSystemSettings, setCanManageSystemSettings] = useState(true)
  const [systemSaving, setSystemSaving] = useState(false)
  const [systemSuccess, setSystemSuccess] = useState(false)

  const [username, setUsername] = useState("admin")
  const [email, setEmail] = useState("admin@example.com")
  const [userSaving, setUserSaving] = useState(false)
  const [userSuccess, setUserSuccess] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  // TOTP 状态
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [totpStep, setTotpStep] = useState<"idle" | "setup" | "disable">("idle")
  const [totpSecret, setTotpSecret] = useState("")
  const [totpQrUri, setTotpQrUri] = useState("")
  const [totpQrDataUrl, setTotpQrDataUrl] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpError, setTotpError] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [disableLoading, setDisableLoading] = useState(false)
  const [disableError, setDisableError] = useState("")

  // Turnstile 状态（禁用两步验证时使用）
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
    if (totpStep !== "disable") return
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
  }, [totpStep, renderTurnstile])

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await api.get<{ user: { username: string; email: string; otpEnabled?: boolean } }>("/user")
        setUsername(userData.user.username)
        setEmail(userData.user.email)
        setTotpEnabled(userData.user.otpEnabled === true)
      } catch (error) {
        console.error("加载用户信息失败:", error)
      }

      try {
        const settingsData = await api.get<{ settings: { defaultKeyType: string } }>("/settings")
        setDefaultKeyType(settingsData.settings.defaultKeyType)
        setCanManageSystemSettings(true)
      } catch (error) {
        if (isApiError(error) && error.status === 403) {
          setCanManageSystemSettings(false)
        } else {
          console.error("加载系统设置失败:", error)
        }
      }
    }

    loadData()
  }, [])

  // 本地生成 QR 码
  useEffect(() => {
    if (!totpQrUri) {
      setTotpQrDataUrl("")
      return
    }
    QRCode.toDataURL(totpQrUri, { width: 200, margin: 2 })
      .then(setTotpQrDataUrl)
      .catch(() => setTotpQrDataUrl(""))
  }, [totpQrUri])

  useEffect(() => {
    if (systemSuccess) {
      const timer = setTimeout(() => setSystemSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [systemSuccess])

  useEffect(() => {
    if (userSuccess) {
      const timer = setTimeout(() => setUserSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [userSuccess])

  useEffect(() => {
    if (passwordSuccess) {
      const timer = setTimeout(() => setPasswordSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [passwordSuccess])

  const saveSystemSettings = async () => {
    setSystemSaving(true)
    try {
      await api.put("/settings", {
        defaultKeyType: defaultKeyType as "apikey" | "complex",
      })

      setSystemSuccess(true)
      toast({
        title: t("settings.settingsSaved"),
        description: t("settings.systemDescription"),
      })
    } catch (error) {
      console.error("保存系统设置失败:", error)
      toast({
        title: t("common.error"),
        description: "保存系统设置失败，请重试",
        variant: "destructive",
      })
    } finally {
      setSystemSaving(false)
    }
  }

  const saveUserSettings = async () => {
    setUserSaving(true)
    try {
      if (email && !validateEmail(email)) {
        toast({
          title: t("common.error"),
          description: "请输入有效的电子邮箱地址",
          variant: "destructive",
        })
        return
      }

      const data = await api.put<{ user: { username: string; email: string } }>("/user", { username, email })

      setUsername(data.user.username)
      setEmail(data.user.email)

      setUserSuccess(true)
      toast({
        title: t("settings.settingsSaved"),
        description: t("settings.userDescription"),
      })
    } catch (error) {
      console.error("保存用户设置失败:", error)
      toast({
        title: t("common.error"),
        description: "保存用户设置失败，请重试",
        variant: "destructive",
      })
    } finally {
      setUserSaving(false)
    }
  }

  const saveSecuritySettings = async () => {
    setPasswordSaving(true)
    setPasswordError("")

    try {
      if (!currentPassword) {
        setPasswordError("请输入当前密码")
        return
      }

      if (!newPassword) {
        setPasswordError("请输入新密码")
        return
      }

      if (newPassword !== confirmPassword) {
        setPasswordError("两次输入的密码不一致")
        return
      }

      if (newPassword.length < 6) {
        setPasswordError("新密码长度不能少于6个字符")
        return
      }

      await api.put("/user", { currentPassword, newPassword })

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      setPasswordSuccess(true)
      toast({
        title: t("settings.passwordChanged"),
        description: "密码已成功更新",
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "更改密码失败，请重试"
      if (message.includes("密码错误")) {
        setPasswordError("当前密码不正确")
      } else {
        toast({
          title: t("common.error"),
          description: message,
          variant: "destructive",
        })
      }
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleLanguageChange = (newLanguage: "zh-CN" | "en-US") => {
    setLanguage(newLanguage)

    toast({
      title: t("settings.languageChanged"),
      description: newLanguage === "zh-CN" ? "已切换到中文" : "Switched to English",
    })
  }

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleGenerateTotp = async () => {
    setTotpLoading(true)
    setTotpError("")
    try {
      const data = await api.post<{ secret: string; qrUri: string }>("/auth/totp-setup", { action: "generate" })
      setTotpSecret(data.secret)
      setTotpQrUri(data.qrUri)
      setTotpStep("setup")
    } catch {
      setTotpError(t("auth.totpSetupFailed"))
    } finally {
      setTotpLoading(false)
    }
  }

  const handleEnableTotp = async (code?: string) => {
    const otpValue = code ?? totpCode
    if (otpValue.length !== 6) return
    setTotpLoading(true)
    setTotpError("")
    try {
      await api.post("/auth/totp-setup", { action: "enable", code: otpValue })
      setTotpEnabled(true)
      setTotpStep("idle")
      setTotpCode("")
      toast({ title: t("auth.totpEnabled") })
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : t("auth.totpVerifyFailed"))
      setTotpCode("")
    } finally {
      setTotpLoading(false)
    }
  }

  const handleDisableTotp = async () => {
    if (disableCode.length !== 6) return
    setDisableLoading(true)
    setDisableError("")
    try {
      await api.post("/auth/totp-setup", { action: "disable", code: disableCode, turnstileToken })
      setTotpEnabled(false)
      setDisableCode("")
      setTurnstileToken("")
      toast({ title: t("auth.totpDisabled") })
    } catch (err) {
      setDisableError(err instanceof Error ? err.message : t("auth.totpVerifyFailed"))
      setDisableCode("")
      setTurnstileToken("")
      renderTurnstile()
    } finally {
      setDisableLoading(false)
    }
  }

  return (
    <Tabs defaultValue="system" className="w-full max-w-4xl">
      <TabsList className="mb-4">
        <TabsTrigger value="system">{t("common.system")}</TabsTrigger>
        <TabsTrigger value="user">{t("common.user")}</TabsTrigger>
        <TabsTrigger value="security">{t("common.security")}</TabsTrigger>
        <TabsTrigger value="language">{t("common.language")}</TabsTrigger>
      </TabsList>

      <TabsContent value="system">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.systemSettings")}</CardTitle>
            <CardDescription>{t("settings.systemDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!canManageSystemSettings && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>当前账号无权修改系统设置。</AlertDescription>
              </Alert>
            )}

            {systemSuccess && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>系统设置已成功保存</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="defaultKeyType">{t("settings.defaultKeyType")}</Label>
              <Select value={defaultKeyType} onValueChange={setDefaultKeyType} disabled={!canManageSystemSettings}>
                <SelectTrigger>
                  <SelectValue placeholder={t("settings.defaultKeyType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apikey">{t("apiKeys.apiKey")}</SelectItem>
                  <SelectItem value="complex">{t("apiKeys.complexKey")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{t("settings.defaultKeyTypeDescription")}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={saveSystemSettings} disabled={systemSaving || !canManageSystemSettings}>
              {systemSaving ? "保存中..." : t("settings.saveSystemSettings")}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="user">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.userSettings")}</CardTitle>
            <CardDescription>{t("settings.userDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {userSuccess && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>个人设置已成功保存</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">{t("common.username")}</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={saveUserSettings} disabled={userSaving}>
              {userSaving ? "保存中..." : t("settings.saveUserSettings")}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.securitySettings")}</CardTitle>
            <CardDescription>{t("settings.securityDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {passwordSuccess && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>密码已成功更新</AlertDescription>
              </Alert>
            )}

            {passwordError && (
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder={t("settings.currentPassword")}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder={t("settings.newPassword")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">{t("settings.passwordLengthHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("settings.confirmNewPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t("settings.confirmNewPassword")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={saveSecuritySettings} disabled={passwordSaving}>
              {passwordSaving ? "更新中..." : t("settings.changePassword")}
            </Button>
          </CardFooter>
        </Card>

        {/* TOTP 两步验证 */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {totpEnabled ? <Shield className="h-5 w-5 text-green-600" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
              {t("auth.totpTitle")}
            </CardTitle>
            <CardDescription>{t("auth.totpDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {totpError && (
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>{totpError}</AlertDescription>
              </Alert>
            )}

            {totpEnabled && totpStep === "idle" && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>{t("auth.totpEnabledStatus")}</AlertDescription>
              </Alert>
            )}

            {totpEnabled && totpStep === "disable" && (
              <div className="space-y-2">
                <Label>{t("auth.enterDisableCode")}</Label>
                <div className="flex items-center gap-2">
                  <InputOTP maxLength={6} value={disableCode} onChange={setDisableCode}>
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
                {TURNSTILE_SITE_KEY && (
                  <div ref={turnstileRef} className="flex justify-center" />
                )}
                {disableError && <p className="text-sm text-red-500">{disableError}</p>}
              </div>
            )}

            {!totpEnabled && totpStep === "idle" && (
              <p className="text-sm text-muted-foreground">{t("auth.totpNotEnabled")}</p>
            )}

            {totpStep === "setup" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <QrCode className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("auth.scanQrCode")}</p>
                  {totpQrDataUrl && (
                    <img
                      src={totpQrDataUrl}
                      alt="TOTP QR Code"
                      className="rounded-lg border"
                      width={200}
                      height={200}
                    />
                  )}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t("auth.manualEntry")}</p>
                    <code className="bg-muted px-2 py-1 rounded text-xs break-all select-all">{totpSecret}</code>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("auth.verifyAndEnable")}</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={totpCode} onChange={(value) => { setTotpCode(value); if (value.length === 6 && !totpLoading) handleEnableTotp(value) }}>
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
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="gap-2">
            {totpEnabled && totpStep === "idle" && (
              <Button variant="destructive" onClick={() => { setTotpStep("disable"); setDisableCode(""); setDisableError("") }}>
                {t("auth.disableTotp")}
              </Button>
            )}
            {totpEnabled && totpStep === "disable" && (
              <>
                <Button variant="destructive" onClick={handleDisableTotp} disabled={disableLoading || disableCode.length !== 6 || (TURNSTILE_SITE_KEY && !turnstileToken)}>
                  {disableLoading ? "..." : t("auth.disableTotp")}
                </Button>
                <Button variant="outline" onClick={() => { setTotpStep("idle"); setDisableCode(""); setDisableError(""); setTurnstileToken("") }}>
                  {t("common.cancel")}
                </Button>
              </>
            )}
            {!totpEnabled && totpStep === "idle" && (
              <Button onClick={handleGenerateTotp} disabled={totpLoading}>
                {totpLoading ? "..." : t("auth.totpSetup")}
              </Button>
            )}
            {totpStep === "setup" && (
              <>
                <Button onClick={() => handleEnableTotp()} disabled={totpLoading || totpCode.length !== 6}>
                  {totpLoading ? "..." : t("auth.verifyAndEnable")}
                </Button>
                <Button variant="outline" onClick={() => { setTotpStep("idle"); setTotpCode(""); setTotpError("") }}>
                  {t("common.cancel")}
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="language">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.languageSettings")}</CardTitle>
            <CardDescription>{t("settings.languageDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="language">{t("settings.selectLanguage")}</Label>
              <Select value={language} onValueChange={(value) => handleLanguageChange(value as "zh-CN" | "en-US")}>
                <SelectTrigger>
                  <SelectValue placeholder={t("settings.selectLanguage")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">中文简体</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
