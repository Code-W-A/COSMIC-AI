"use client"

import Link from "next/link"
import { Check, Sparkles } from "lucide-react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"

export default function SubscriptionSuccessPage() {
  const localizedPath = useLocalizedPath()
  const { t } = useTranslations()

  return (
    <AuthGuard>
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-[#0D0820]/70 p-8 text-center shadow-xl shadow-[#6D4BFF]/10 backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6D4BFF]/15">
            <Check className="h-7 w-7 text-cosmic-lavender" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("subscription.success.title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("subscription.success.body")}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={localizedPath("/chat")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-5 py-3 text-sm font-semibold text-foreground"
            >
              <Sparkles className="h-4 w-4" />
              {t("subscription.success.openChat")}
            </Link>
            <Link
              href={localizedPath("/account/subscription")}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-5 py-3 text-sm font-semibold text-foreground"
            >
              {t("subscription.success.viewPlan")}
            </Link>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}
