"use client"

import Link from "next/link"

import { getUpgradeHref } from "@/lib/subscription/usage-display"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"

interface SubscriptionUsageMeterProps {
  used: number
  limit: number
  variant?: "compact" | "card"
  showCta?: boolean
  className?: string
}

export function SubscriptionUsageMeter({
  used,
  limit,
  variant = "compact",
  showCta = true,
  className = "",
}: SubscriptionUsageMeterProps) {
  const { t } = useTranslations()
  const localizedPath = useLocalizedPath()
  const upgradeHref = getUpgradeHref(localizedPath)
  const usageLabel = t("chat.usage.questionsUsed")
    .replace("{used}", String(used))
    .replace("{limit}", String(limit))

  if (variant === "card") {
    return (
      <article
        data-testid="subscription-usage-meter"
        className={`rounded-2xl border border-white/10 bg-black/25 p-4 ${className}`}
      >
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("account.usage.title")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("account.usage.subtitle")}</p>
        <p className="mt-3 text-base font-medium text-foreground">{usageLabel}</p>
        {showCta ? (
          <Link
            href={upgradeHref}
            data-testid="subscription-usage-upgrade-cta"
            className="mt-4 inline-flex rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-4 py-2 text-xs font-semibold text-foreground"
          >
            {t("account.usage.upgradeCta")}
          </Link>
        ) : null}
      </article>
    )
  }

  return (
    <div
      data-testid="subscription-usage-meter"
      className={`mt-2 flex flex-wrap items-center justify-between gap-2 px-1 ${className}`}
    >
      <p className="text-[11px] text-muted-foreground">{usageLabel}</p>
      {showCta ? (
        <Link
          href={upgradeHref}
          data-testid="subscription-usage-upgrade-cta"
          className="rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-2.5 py-1 text-[10px] font-semibold text-foreground"
        >
          {t("chat.usage.upgradeCta")}
        </Link>
      ) : null}
    </div>
  )
}
