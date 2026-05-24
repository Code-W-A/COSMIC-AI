"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CreditCard, Loader2, Sparkles } from "lucide-react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { apiFetch } from "@/lib/api/client"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"
import type { BillingProfilePayload, BillingProfileResponse } from "@/types/billing"
import type { SubscriptionStatusResponse } from "@/types/subscription"

type StatusPayload = { success: true } & SubscriptionStatusResponse

function formatPlan(plan: string | undefined, isRo: boolean) {
  if (!plan || plan === "free") return "Free"
  if (plan === "cosmic_plus") return isRo ? "Cosmic Plus (Legacy)" : "Cosmic Plus (Legacy)"
  if (plan === "premium") return "Premium"
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

function formatInterval(interval: string | null | undefined, isRo: boolean) {
  if (!interval) return null
  if (interval === "annual") return isRo ? "Facturare anuală" : "Annual billing"
  if (interval === "monthly") return isRo ? "Facturare lunară" : "Monthly billing"
  return null
}

function formatDate(value: string | null | undefined, locale: "ro" | "en") {
  if (!value) return null
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export function SubscriptionCard() {
  const localizedPath = useLocalizedPath()
  const { locale } = useTranslations()
  const isRo = locale === "ro"
  const [status, setStatus] = useState<SubscriptionStatusResponse | null>(null)
  const [billingProfile, setBillingProfile] = useState<BillingProfilePayload | null>(null)
  const [billingComplete, setBillingComplete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    Promise.all([
      apiFetch<StatusPayload>("/api/subscription/status"),
      apiFetch<{ success: true } & BillingProfileResponse>("/api/billing-profile"),
    ])
      .then(([subscriptionPayload, billingPayload]) => {
        if (!active) return
        setStatus(subscriptionPayload)
        setBillingProfile(billingPayload.profile)
        setBillingComplete(billingPayload.isComplete)
      })
      .catch((subscriptionError) => {
        if (!active) return
        setError(
          subscriptionError instanceof Error
            ? subscriptionError.message
            : isRo
              ? "Nu am putut încărca abonamentul."
              : "Unable to load subscription."
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function openPortal() {
    setError("")
    setPortalLoading(true)

    try {
      const payload = await apiFetch<{ success: true; url: string }>(
        "/api/stripe/create-billing-portal-session",
        { method: "POST" }
      )
      window.location.href = payload.url
    } catch (portalError) {
      setError(
        portalError instanceof Error
          ? portalError.message
          : isRo
            ? "Nu am putut deschide administrarea abonamentului."
            : "Unable to open subscription management."
      )
      setPortalLoading(false)
    }
  }

  return (
    <AuthGuard>
      <main className="relative min-h-dvh overflow-hidden bg-background px-4 py-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-1/4 h-[460px] w-[460px] rounded-full bg-[#6D4BFF]/10 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-[#D66BFF]/8 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-2xl">
          <Link href={localizedPath("/chat")} className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Sparkles className="h-4 w-4 text-cosmic-lavender" />
            {isRo ? "Înapoi la Cosmic AI" : "Back to Cosmic AI"}
          </Link>

          <div className="rounded-3xl border border-border bg-[#0D0820]/70 p-6 shadow-xl shadow-[#6D4BFF]/10 backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isRo ? "Abonament" : "Subscription"}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {isRo
                    ? "Poți gestiona, actualiza sau anula planul oricând. Dacă anulezi, accesul rămâne activ până la finalul perioadei de facturare."
                    : "You can manage, update, or cancel your plan anytime. If you cancel, access remains active until the end of the billing period."}
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#6D4BFF]/15">
                <CreditCard className="h-5 w-5 text-cosmic-lavender" />
              </div>
            </div>

            {loading ? (
              <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isRo ? "Se încarcă abonamentul..." : "Loading subscription..."}
              </div>
            ) : status ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.04)] p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {isRo ? "Plan" : "Plan"}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatPlan(status.subscriptionPlan, isRo)}
                  </p>
                  {formatInterval(status.billingInterval, isRo) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatInterval(status.billingInterval, isRo)}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.04)] p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {isRo ? "Status" : "Status"}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {status.subscriptionStatus.replace("_", " ")}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.04)] p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {isRo ? "Utilizare" : "Usage"}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {status.monthlyQuestionCount} / {status.monthlyQuestionLimit}{" "}
                    {isRo ? "întrebări luna aceasta" : "questions this month"}
                  </p>
                </div>
              </div>
            ) : null}

            {status?.cancelAtPeriodEnd && (
              <p className="mt-5 rounded-2xl border border-[#B69CFF]/20 bg-[#6D4BFF]/10 px-4 py-3 text-sm text-[#E6DDFF]">
                {isRo
                  ? `Planul tău este setat să se încheie la ${formatDate(status.currentPeriodEnd, "ro") ?? "finalul perioadei curente"}. Îl poți reactiva din portalul de facturare.`
                  : `Your plan is set to end on ${formatDate(status.currentPeriodEnd, "en") ?? "the current period end"}. You can reactivate it from the billing portal.`}
              </p>
            )}

            {status?.isInGrace && (
              <p className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                {isRo
                  ? `Plata a eșuat, dar abonamentul rămâne activ în perioada de grație până la ${formatDate(status.graceUntil, "ro") ?? "expirarea perioadei de grație"}. Actualizează metoda de plată din portal pentru a evita downgrade-ul.`
                  : `Payment failed, but your subscription remains active during grace period until ${formatDate(status.graceUntil, "en") ?? "grace period expiry"}. Update your payment method in the billing portal to avoid downgrade.`}
              </p>
            )}

            {status?.isPremium && !billingComplete && (
              <p className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                {isRo
                  ? "Lipsesc datele de facturare. Completează-le acum ca facturile recurente să fie emise corect."
                  : "Billing details are missing. Add them now so recurring invoices can be issued correctly."}
              </p>
            )}

            <div className="mt-7 rounded-2xl border border-border bg-[rgba(255,255,255,0.04)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {isRo ? "Date de facturare" : "Billing details"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {billingComplete
                      ? isRo
                        ? "Salvate și gata pentru facturare"
                        : "Saved and ready for invoicing"
                      : isRo
                        ? "Necompletate încă"
                        : "Not completed yet"}
                  </p>
                </div>
                <Link
                  href={localizedPath("/billing/setup")}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-[rgba(255,255,255,0.08)]"
                >
                  {billingComplete ? (isRo ? "Editează" : "Edit") : isRo ? "Completează acum" : "Complete now"}
                </Link>
              </div>

              {billingProfile && (
                <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <p>{billingProfile.fullName}</p>
                  <p>{billingProfile.email}</p>
                  <p>{billingProfile.phone}</p>
                  <p>{billingProfile.postalCode}</p>
                  <p className="sm:col-span-2">
                    {billingProfile.addressLine1}, {billingProfile.city}, {billingProfile.county}, {billingProfile.country}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={openPortal}
              disabled={portalLoading || !status}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-5 py-3 text-sm font-semibold text-foreground transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {portalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRo ? "Gestionează abonamentul" : "Manage subscription"}
            </button>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}
