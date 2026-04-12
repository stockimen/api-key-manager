"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/lib/i18n/language-context"
import LanguageSwitcher from "@/components/language-switcher"
import { LanguageProvider } from "@/lib/i18n/language-context"
import Link from "next/link"
import type { ReactNode } from "react"
import { Key, Shield, BarChart, Settings } from "lucide-react"

export default function Home() {
  return (
    <LanguageProvider>
      <HomeContent />
    </LanguageProvider>
  )
}

function HomeContent() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* 导航栏 */}
      <nav className="bg-white dark:bg-gray-950 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900 dark:text-white">{t("app.title")}</span>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Link href="/login">
                <Button>{t("common.login")}</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 英雄区域 */}
      <div className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {t("app.title")}
        </h1>
        <p className="mt-6 text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto">{t("home.hero.subtitle")}</p>
        <div className="mt-10">
          <Link href="/login">
            <Button size="lg" className="px-8 py-3 text-lg">
              {t("home.hero.cta")}
            </Button>
          </Link>
        </div>
      </div>

      {/* 功能特点 */}
      <div className="py-12 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
              {t("home.features.title")}
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              {t("home.features.subtitle")}
            </p>
          </div>

          <div className="mt-12 grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Key className="h-8 w-8 text-primary" />}
              title={t("home.features.keyManagement.title")}
              description={t("home.features.keyManagement.description")}
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-primary" />}
              title={t("home.features.security.title")}
              description={t("home.features.security.description")}
            />
            <FeatureCard
              icon={<BarChart className="h-8 w-8 text-primary" />}
              title={t("home.features.monitoring.title")}
              description={t("home.features.monitoring.description")}
            />
            <FeatureCard
              icon={<Settings className="h-8 w-8 text-primary" />}
              title={t("home.features.settings.title")}
              description={t("home.features.settings.description")}
            />
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="bg-white dark:bg-gray-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            API Key Manager &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card>
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className="mb-4">{icon}</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400">{description}</p>
      </CardContent>
    </Card>
  )
}

