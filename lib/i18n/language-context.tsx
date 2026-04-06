"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { type Language, type TranslationKey, getTranslations } from "./translations"

interface TranslationParams {
  [key: string]: string | number
}

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, params?: TranslationParams) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
  defaultLanguage?: Language
}

function applyTranslationParams(template: string, params?: TranslationParams): string {
  if (!params) {
    return template
  }

  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, String(value))
  }, template)
}

export function LanguageProvider({ children, defaultLanguage = "zh-CN" }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const savedLanguage = localStorage.getItem("language") as Language
      return savedLanguage || defaultLanguage
    }
    return defaultLanguage
  })

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage)
    if (typeof window !== "undefined") {
      localStorage.setItem("language", newLanguage)
    }
  }

  const t = (key: TranslationKey, params?: TranslationParams): string => {
    const translations = getTranslations(language)
    const value = translations[key] || key
    return applyTranslationParams(value, params)
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = language
    }
  }, [language])

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
