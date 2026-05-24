"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { FileText, Loader2, Sparkles } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { AuthGuard } from "@/components/auth/auth-guard"
import { ApiClientError, apiFetch } from "@/lib/api/client"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"

type ReportPurchaseStatusPayload = {
  success: true
  data: {
    hasPaidPurchase: boolean
    canGenerate: boolean
    nextPurchaseId: string | null
    latestConsumedPurchaseId: string | null
  }
}

export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportPageContent />
    </Suspense>
  )
}

function ReportPageContent() {
  const router = useRouter()
  const localizedPath = useLocalizedPath()
  const { t, locale } = useTranslations()
  const isRo = locale === "ro"
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState<ReportPurchaseStatusPayload["data"] | null>(null)
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState("")

  async function refreshStatus() {
    const payload = await apiFetch<ReportPurchaseStatusPayload>("/api/report/purchase")
    setStatus(payload.data)
  }

  useEffect(() => {
    let active = true

    refreshStatus()
      .catch((statusError) => {
        if (!active) return
        setError(
          statusError instanceof Error
            ? statusError.message
            : isRo
              ? "Nu am putut încărca statusul raportului."
              : "Unable to load report status."
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const checkoutState = searchParams.get("checkout")
    if (checkoutState === "success") {
      void refreshStatus().catch(() => null)
    }
  }, [searchParams])

  async function startCheckout() {
    setError("")
    setCheckoutLoading(true)
    try {
      const payload = await apiFetch<{ success: true; url: string }>(
        "/api/stripe/create-checkout-session",
        {
          method: "POST",
          body: {
            checkoutType: "one_off",
            sku: "relationship_report",
          },
        }
      )
      window.location.href = payload.url
    } catch (checkoutError) {
      if (checkoutError instanceof ApiClientError && checkoutError.status === 401) {
        router.push(`${localizedPath("/login")}?next=${encodeURIComponent(localizedPath("/report"))}`)
        return
      }

      if (
        checkoutError instanceof ApiClientError &&
        checkoutError.status === 409 &&
        checkoutError.code === "billing_profile_required"
      ) {
        const setupUrl =
          typeof (checkoutError.payload as { setupUrl?: unknown })?.setupUrl === "string"
            ? (checkoutError.payload as { setupUrl: string }).setupUrl
            : `${localizedPath("/billing/setup")}?checkoutType=one_off&sku=relationship_report`
        router.push(setupUrl)
        return
      }

      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : isRo
            ? "Nu am putut porni checkout-ul."
            : "Unable to start checkout."
      )
    } finally {
      setCheckoutLoading(false)
    }
  }

  async function consumeReportPurchase() {
    setError("")
    setGenerating(true)

    try {
      await apiFetch("/api/report/purchase", {
        method: "POST",
        body: {
          action: "consume",
        },
      })
      setGenerated(true)
      await refreshStatus()
    } catch (consumeError) {
      setError(
        consumeError instanceof Error
          ? consumeError.message
          : isRo
            ? "Nu am putut debloca raportul."
            : "Unable to unlock report."
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <AuthGuard>
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-[#0D0820]/70 p-8 text-center shadow-xl shadow-[#6D4BFF]/10 backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6D4BFF]/15">
            <FileText className="h-7 w-7 text-cosmic-lavender" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("report.title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("report.subtitle")}
          </p>

          {loading ? (
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("report.loading")}
            </p>
          ) : status?.canGenerate ? (
            <button
              type="button"
              onClick={() => void consumeReportPurchase()}
              disabled={generating || generated}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-5 py-3 text-sm font-semibold text-foreground disabled:opacity-60"
            >
              {generating && <Loader2 className="h-4 w-4 animate-spin" />}
              {generated ? t("report.unlocked") : t("report.generate")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startCheckout()}
              disabled={checkoutLoading}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-5 py-3 text-sm font-semibold text-foreground disabled:opacity-60"
            >
              {checkoutLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("report.buy")}
            </button>
          )}

          {generated && (
            <p className="mt-4 rounded-xl border border-[#6D4BFF]/30 bg-[#6D4BFF]/10 px-4 py-3 text-sm text-[#E6DDFF]">
              {t("report.generatedNotice")}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          )}

          <Link
            href={localizedPath("/chat")}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-5 py-3 text-sm font-semibold text-foreground"
          >
            <Sparkles className="h-4 w-4" />
            {t("common.backToChat")}
          </Link>
        </div>
      </main>
    </AuthGuard>
  )
}
