"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { ApiClientError, apiFetch } from "@/lib/api/client"
import {
  BUCHAREST_SECTORS,
  ROMANIA_COUNTIES,
  getCountryOptions,
  isBucharestCounty,
  isRomaniaCountry,
  normalizeCountryValue,
} from "@/lib/billing/address"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"
import type { BillingProfilePayload, BillingProfileResponse } from "@/types/billing"
import type { BillingInterval, CheckoutType, PaidSubscriptionPlan, ReportSku } from "@/types/subscription"

const paidPlans: PaidSubscriptionPlan[] = ["premium", "cosmic_plus"]

const emptyForm: BillingProfilePayload = {
  type: "individual",
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  city: "",
  county: "",
  country: "Romania",
  postalCode: "",
  isComplete: false,
}

type EditableField = Exclude<keyof BillingProfilePayload, "type" | "isComplete">

function isPaidPlan(value: string | null): value is PaidSubscriptionPlan {
  return Boolean(value && paidPlans.includes(value as PaidSubscriptionPlan))
}

function isBillingInterval(value: string | null): value is BillingInterval {
  return value === "monthly" || value === "annual"
}

function isCheckoutType(value: string | null): value is CheckoutType {
  return value === "subscription" || value === "one_off"
}

function isReportSku(value: string | null): value is ReportSku {
  return value === "relationship_report"
}

type NextCheckoutRequest =
  | {
      checkoutType: "subscription"
      plan: "premium"
      interval: BillingInterval
    }
  | {
      checkoutType: "one_off"
      sku: ReportSku
    }

export function BillingSetupClientPage() {
  const localizedPath = useLocalizedPath()
  const { locale } = useTranslations()
  const isRo = locale === "ro"
  const params = useSearchParams()
  const checkoutType = params.get("checkoutType")
  const planParam = params.get("plan")
  const intervalParam = params.get("interval")
  const skuParam = params.get("sku")
  const nextCheckout = useMemo<NextCheckoutRequest | null>(() => {
    if (isCheckoutType(checkoutType)) {
      if (
        checkoutType === "subscription" &&
        planParam === "premium" &&
        isBillingInterval(intervalParam)
      ) {
        return {
          checkoutType,
          plan: planParam,
          interval: intervalParam,
        }
      }

      if (checkoutType === "one_off" && isReportSku(skuParam)) {
        return {
          checkoutType,
          sku: skuParam,
        }
      }
    }

    // Backward compatibility with old billing setup links.
    if (isPaidPlan(planParam) && planParam === "premium") {
      return {
        checkoutType: "subscription",
        plan: "premium",
        interval: "monthly",
      }
    }

    return null
  }, [checkoutType, intervalParam, planParam, skuParam])

  const [form, setForm] = useState<BillingProfilePayload>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const countryOptions = useMemo(() => getCountryOptions(locale), [locale])
  const isRomaniaSelected = isRomaniaCountry(form.country)
  const isBucharestSelected = isRomaniaSelected && isBucharestCounty(form.county)

  useEffect(() => {
    setForm((current) => {
      if (current.country.trim().length > 0) return current
      return {
        ...current,
        country: "Romania",
      }
    })
  }, [isRo])

  useEffect(() => {
    let active = true

    apiFetch<{ success: true } & BillingProfileResponse>("/api/billing-profile")
      .then((payload) => {
        if (!active) return
        if (payload.profile) {
          setForm((current) => ({
            ...current,
            ...payload.profile,
            country: normalizeCountryValue(payload.profile.country),
          }))
        }
      })
      .catch((profileError) => {
        if (!active) return
        setError(
          profileError instanceof Error
            ? profileError.message
            : isRo
              ? "Nu am putut încărca profilul de facturare."
              : "Unable to load billing profile."
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isRo])

  function setField(field: EditableField, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function setCountry(value: string) {
    setForm((current) => {
      const nextCountry = value
      return {
        ...current,
        country: nextCountry,
        county: "",
        city: "",
      }
    })
  }

  function setCounty(value: string) {
    setForm((current) => ({
      ...current,
      county: value,
      city: "",
    }))
  }

  async function continueToCheckout(request: NextCheckoutRequest) {
    const payload = await apiFetch<{ success: true; url: string }>(
      "/api/stripe/create-checkout-session",
      {
        method: "POST",
        body: request,
      }
    )

    window.location.href = payload.url
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccessMessage("")
    setSaving(true)

    try {
      await apiFetch<{ success: true } & BillingProfileResponse>("/api/billing-profile", {
        method: "POST",
        body: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          addressLine1: form.addressLine1,
          city: form.city,
          county: form.county,
          country: form.country,
          postalCode: form.postalCode,
        },
      })

      setSuccessMessage(isRo ? "Datele de facturare au fost salvate." : "Billing details saved.")

      if (nextCheckout) {
        await continueToCheckout(nextCheckout)
        return
      }
    } catch (saveError) {
      if (saveError instanceof ApiClientError && saveError.status === 401) {
        window.location.href = `${localizedPath("/login")}?next=${encodeURIComponent(localizedPath("/billing/setup"))}`
        return
      }

      setError(
        saveError instanceof Error
          ? saveError.message
          : isRo
            ? "Nu am putut salva datele de facturare."
            : "Unable to save billing details."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthGuard>
      <main className="relative min-h-dvh overflow-hidden bg-background px-4 py-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/4 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#6D4BFF]/10 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-[#D66BFF]/8 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-2xl rounded-3xl border border-border bg-[#0D0820]/70 p-6 backdrop-blur-xl sm:p-8">
          <Link href={localizedPath("/pricing")} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {isRo ? "Înapoi la prețuri" : "Back to pricing"}
          </Link>

          <h1 className="text-2xl font-bold text-foreground">
            {isRo ? "Detalii de facturare" : "Billing details"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isRo
              ? "Completezi o singură dată, apoi reutilizăm datele pentru fiecare factură plătită."
              : "Complete once, then we reuse these details for every paid invoice."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  {isRo ? "Nume complet" : "Full name"}
                </span>
                <input
                  required
                  value={form.fullName}
                  onChange={(event) => setField("fullName", event.target.value)}
                  className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                  placeholder={isRo ? "Nume Prenume" : "John Doe"}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  {isRo ? "Email" : "Email"}
                </span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                  className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                  placeholder={isRo ? "facturare@exemplu.com" : "billing@example.com"}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  {isRo ? "Telefon" : "Phone"}
                </span>
                <input
                  required
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                  placeholder="07•• ••• •••"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  {isRo ? "Adresă" : "Address"}
                </span>
                <input
                  required
                  value={form.addressLine1}
                  onChange={(event) => setField("addressLine1", event.target.value)}
                  className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                  placeholder={isRo ? "Stradă, număr, bloc" : "Street, number, building"}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  {isRo ? "Județ / State" : "County / State"}
                </span>
                {isRomaniaSelected ? (
                  <select
                    required
                    value={form.county}
                    onChange={(event) => setCounty(event.target.value)}
                    className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                  >
                    <option value="">{isRo ? "Selectează județul" : "Select county"}</option>
                    {ROMANIA_COUNTIES.map((county) => (
                      <option key={county} value={county}>
                        {county}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    value={form.county}
                    onChange={(event) => setField("county", event.target.value)}
                    className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                  />
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  {isRo ? "Oraș" : "City"}
                </span>
                {isBucharestSelected ? (
                  <select
                    required
                    value={form.city}
                    onChange={(event) => setField("city", event.target.value)}
                    className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                  >
                    <option value="">{isRo ? "Selectează sectorul" : "Select sector"}</option>
                    {BUCHAREST_SECTORS.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    value={form.city}
                    onChange={(event) => setField("city", event.target.value)}
                    className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                  />
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  {isRo ? "Țară" : "Country"}
                </span>
                <select
                  required
                  value={form.country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                >
                  <option value="">{isRo ? "Selectează țara" : "Select country"}</option>
                  {countryOptions.map((country) => (
                    <option key={country.code} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  {isRo ? "Cod poștal" : "Postal code"}
                </span>
                <input
                  required
                  value={form.postalCode}
                  onChange={(event) => setField("postalCode", event.target.value)}
                  className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                />
              </label>
            </div>

            {error && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {error}
              </p>
            )}

            {successMessage && !nextCheckout && (
              <p className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-5 py-3 text-sm font-semibold text-foreground transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {(loading || saving) && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? isRo
                  ? "Se încarcă..."
                  : "Loading..."
                : saving
                  ? nextCheckout
                    ? isRo
                      ? "Se salvează și continuă..."
                      : "Saving & continuing..."
                    : isRo
                      ? "Se salvează..."
                      : "Saving..."
                  : nextCheckout
                    ? isRo
                      ? "Salvează și continuă"
                      : "Save and continue"
                    : isRo
                      ? "Salvează datele de facturare"
                      : "Save billing details"}
            </button>
          </form>
        </div>
      </main>
    </AuthGuard>
  )
}
