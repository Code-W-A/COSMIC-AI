"use client"

import { Languages } from "lucide-react"

import { useLocaleSwitcher, useTranslations } from "@/lib/i18n/client"
import { localeToLanguageLabel, type Locale } from "@/lib/i18n/locale"

interface LanguageSwitcherProps {
  compact?: boolean
  className?: string
}

const options: Locale[] = ["ro", "en"]

export function LanguageSwitcher({ compact = false, className = "" }: LanguageSwitcherProps) {
  const { locale, switchLocale } = useLocaleSwitcher()
  const { t } = useTranslations()

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-[rgba(255,255,255,0.05)] p-1 ${className}`}
      aria-label={t("language.switch")}
      role="group"
    >
      {!compact && <Languages className="ml-2 h-3.5 w-3.5 text-muted-foreground" />}
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => switchLocale(option)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            locale === option
              ? "bg-[#6D4BFF] text-[#F5F2FF]"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={locale === option}
        >
          {localeToLanguageLabel(option)}
        </button>
      ))}
    </div>
  )
}

