"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"

import {
  getRemainingQuestions,
  getUpgradeHref,
  markFourOfFiveBannerShown,
  shouldThrottleFourOfFiveBanner,
} from "@/lib/subscription/usage-display"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"

const BANNER_DISMISS_MS = 3000

interface ChatUsageLimitBannerProps {
  used: number
  limit: number
  onDismiss?: () => void
}

export function ChatUsageLimitBanner({ used, limit, onDismiss }: ChatUsageLimitBannerProps) {
  const { t } = useTranslations()
  const localizedPath = useLocalizedPath()
  const remaining = getRemainingQuestions(used, limit)
  const upgradeHref = getUpgradeHref(localizedPath)
  const [visible, setVisible] = useState(() => !shouldThrottleFourOfFiveBanner(used, limit))

  const message =
    remaining === 0 ? t("chat.usage.limitReached") : t("chat.usage.oneRemaining")

  useEffect(() => {
    if (!visible) {
      onDismiss?.()
      return
    }

    if (remaining === 1) {
      markFourOfFiveBannerShown()
    }

    const timer = window.setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, BANNER_DISMISS_MS)

    return () => window.clearTimeout(timer)
  }, [visible, remaining, onDismiss])

  if (!visible) return null

  return (
    <div
      data-testid="chat-usage-limit-banner"
      className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/20 bg-amber-400/5 px-3 py-2"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-200/90" />
        <p className="text-xs font-medium leading-snug text-foreground">{message}</p>
      </div>
      <Link
        href={upgradeHref}
        data-testid="chat-usage-limit-banner-cta"
        className="shrink-0 rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-3 py-1.5 text-[10px] font-semibold text-foreground"
      >
        {t("chat.usage.upgradeCta")}
      </Link>
    </div>
  )
}
