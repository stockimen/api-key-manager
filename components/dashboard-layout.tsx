"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Key, Settings, LogOut, Menu, X } from "lucide-react"
import LanguageSwitcher from "@/components/language-switcher"
import { useLanguage } from "@/lib/i18n/language-context"
import { api, isApiError, isUnauthorizedError } from "@/lib/api-client"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authState, setAuthState] = useState<"checking" | "ready" | "error" | "setup-required">("checking")
  const [authError, setAuthError] = useState("")
  const { t } = useLanguage()

  const checkSession = useCallback(async () => {
    setAuthState("checking")
    setAuthError("")

    try {
      await api.get("/auth/session")
      setAuthState("ready")
    } catch (error) {
      if (isUnauthorizedError(error)) {
        router.replace("/login")
        return
      }

      if (isApiError(error) && error.status === 503) {
        setAuthState("setup-required")
        return
      }

      const message = error instanceof Error ? error.message : "验证登录状态失败，请刷新后重试"
      setAuthError(message)
      setAuthState("error")
    }
  }, [router])

  useEffect(() => {
    void checkSession()
  }, [checkSession])

  useEffect(() => {
    const handleUnauthorized = () => {
      router.replace("/login")
    }

    window.addEventListener("auth:unauthorized", handleUnauthorized)
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized)
    }
  }, [router])

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout", {})
    } catch {
      // ignore
    }
    router.replace("/login")
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const navItems = [
    { href: "/dashboard", label: t("common.dashboard"), icon: <LayoutDashboard className="mr-3 h-4.5 w-4.5" /> },
    { href: "/dashboard/keys", label: t("common.apiKeys"), icon: <Key className="mr-3 h-4.5 w-4.5" /> },
    { href: "/dashboard/settings", label: t("common.settings"), icon: <Settings className="mr-3 h-4.5 w-4.5" /> },
  ]

  if (authState === "checking") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>{t("common.loading")}</p>
      </div>
    )
  }

  if (authState === "setup-required") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold">系统尚未初始化</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            请先调用受保护的 `/api/setup` 完成管理员初始化，然后再登录。
          </p>
        </div>
      </div>
    )
  }

  if (authState === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold">登录状态校验失败</h2>
          <p className="mt-2 text-sm text-muted-foreground">{authError}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button onClick={() => void checkSession()}>重试</Button>
            <Button variant="outline" onClick={() => router.replace("/login")}>
              返回登录
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={toggleSidebar}>
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      <div className="lg:hidden fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-52 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          <div className="border-b px-3 py-3 flex justify-between items-center">
            <h2 className="text-base font-bold">{t("app.title")}</h2>
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
          </div>
          <nav className="flex-1 space-y-1.5 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center rounded-md px-3 py-1.5 text-sm font-medium
                  ${pathname === item.href ? "bg-primary text-primary-foreground" : "text-gray-700 hover:bg-gray-100"}
                `}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="border-t p-3">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center text-sm py-2"
              onClick={handleLogout}
            >
              <LogOut className="mr-1 h-3 w-3" />
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 ml-0 lg:ml-52 transition-all duration-300 flex justify-center">
        <main className="h-full overflow-auto w-full max-w-6xl px-4">{children}</main>
      </div>
    </div>
  )
}

