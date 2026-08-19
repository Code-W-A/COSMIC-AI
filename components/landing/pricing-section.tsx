"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Check, Loader2, Sparkles } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ApiClientError, apiFetch } from "@/lib/api/client"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"
import {
  freePlanDisplayPrice,
  getSubscriptionDisplayPrice,
} from "@/lib/pricing/display"
import {
  appendLiveTestPricingParams,
  buildLiveTestCheckoutFields,
  resolveLiveTestPricingState,
} from "@/lib/stripe/live-test-pricing"
import type { BillingInterval } from "@/types/subscription"
import type { PartnerPreview } from "@/lib/partners/types"

export function PricingSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const localizedPath = useLocalizedPath()
  const { t } = useTranslations()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly")
  const [error, setError] = useState("")
  const [referral, setReferral] = useState<PartnerPreview | null>(null)
  const liveTestPricing = useMemo(
    () => resolveLiveTestPricingState(searchParams),
    [searchParams]
  )
  const subscriptionDisplayPrice = getSubscriptionDisplayPrice(billingInterval)

  useEffect(() => {
    let active = true
    fetch("/api/partners/referral-context")
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return
        const next = payload?.referral ?? null
        if (next?.code && next?.name) setReferral(next)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  const pricingPathWithLiveTest = useMemo(
    () => appendLiveTestPricingParams(localizedPath("/pricing"), liveTestPricing),
    [liveTestPricing, localizedPath]
  )

  const plans = useMemo(
    () => [
      {
        name: t("pricing.plan.free.name"),
        plan: "free" as const,
        price: freePlanDisplayPrice,
        period: t("pricing.plan.free.period"),
        description: t("pricing.plan.free.description"),
        features: [
          t("pricing.plan.free.feature1"),
          t("pricing.plan.free.feature2"),
          t("pricing.plan.free.feature3"),
        ],
        cta: t("pricing.plan.free.cta"),
        featured: false,
      },
      {
        name: t("pricing.plan.premium.name"),
        plan: "premium" as const,
        description: t("pricing.plan.premium.description"),
        monthlyPeriod: t("pricing.plan.premium.periodMonthly"),
        annualPeriod: t("pricing.plan.premium.periodAnnual"),
        features: [
          t("pricing.plan.premium.feature1"),
          t("pricing.plan.premium.feature2"),
          t("pricing.plan.premium.feature3"),
          t("pricing.plan.premium.feature4"),
          t("pricing.plan.premium.feature5"),
        ],
        cta: t("pricing.plan.premium.cta"),
        microcopy: t("pricing.plan.premium.microcopy"),
        badge: t("pricing.plan.premium.badge"),
        featured: true,
      },
    ],
    [t]
  )

  const premiumIncludes = useMemo(
    () => [
      t("pricing.premiumIncludes.item1"),
      t("pricing.premiumIncludes.item2"),
      t("pricing.premiumIncludes.item3"),
      t("pricing.premiumIncludes.item4"),
    ],
    [t]
  )

  const pricingFaqs = useMemo(
    () => [
      {
        question: t("pricing.faq.q1.question"),
        answer: t("pricing.faq.q1.answer"),
      },
      {
        question: t("pricing.faq.q2.question"),
        answer: t("pricing.faq.q2.answer"),
      },
      {
        question: t("pricing.faq.q3.question"),
        answer: t("pricing.faq.q3.answer"),
      },
      {
        question: t("pricing.faq.q4.question"),
        answer: t("pricing.faq.q4.answer"),
      },
    ],
    [t]
  )

  async function handlePlanClick(plan: "free" | "premium") {
    setError("")

    if (plan === "free") {
      router.push(localizedPath("/onboarding"))
      return
    }

    setLoadingPlan(plan)

    try {
      const payload = await apiFetch<{ success: true; url: string }>(
        "/api/stripe/create-checkout-session",
        {
          method: "POST",
          body: {
            checkoutType: "subscription",
            plan,
            interval: billingInterval,
            ...buildLiveTestCheckoutFields(liveTestPricing),
          },
        }
      )

      window.location.href = payload.url
    } catch (checkoutError) {
      if (checkoutError instanceof ApiClientError && checkoutError.status === 401) {
        router.push(
          `${localizedPath("/login")}?next=${encodeURIComponent(pricingPathWithLiveTest)}`
        )
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
            : appendLiveTestPricingParams(
                `${localizedPath("/billing/setup")}?plan=${encodeURIComponent(plan)}`,
                liveTestPricing
              )
        router.push(setupUrl)
        return
      }

      setError(
        checkoutError instanceof Error ? checkoutError.message : t("pricing.checkout.error")
      )
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <section id="pricing" className="relative py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/4 h-[500px] w-[500px] rounded-full bg-[#6D4BFF]/8 blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/3 h-[300px] w-[300px] rounded-full bg-[#D66BFF]/6 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-[#B69CFF]">
            {t("pricing.eyebrow")}
          </span>
          <h2 className="text-3xl font-bold text-[#F5F2FF] text-balance sm:text-4xl lg:text-5xl">
            {t("pricing.title")}{" "}
            <span className="text-gradient-cosmic">{t("pricing.titleHighlight")}</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#B8B2D9]">
            {t("pricing.subtitle")}
          </p>
        </motion.div>

        {liveTestPricing && (
          <p className="mx-auto mt-6 max-w-xl rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-100">
            Live test pricing activ
          </p>
        )}

        {referral ? (
          <p className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#8B5CFF]/30 bg-[#6D4BFF]/10 px-4 py-3 text-center text-sm text-[#F5F2FF]">
            {t("pricing.referral.banner")
              .replace("{percent}", String(referral.discountPercent))
              .replace("{name}", referral.name)}
          </p>
        ) : null}

        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] p-1">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                billingInterval === "monthly"
                  ? "bg-[#6D4BFF] text-[#F5F2FF]"
                  : "text-[#B8B2D9] hover:text-[#F5F2FF]"
              }`}
            >
              {t("pricing.billing.monthly")}
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("annual")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                billingInterval === "annual"
                  ? "bg-[#6D4BFF] text-[#F5F2FF]"
                  : "text-[#B8B2D9] hover:text-[#F5F2FF]"
              }`}
            >
              {t("pricing.billing.annualSave")}
            </button>
          </div>
        </div>

        <div className="mt-16 grid items-stretch gap-6 md:grid-cols-2">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.plan}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className={`group relative ${plan.featured ? "md:-mt-4 md:mb-4" : ""}`}
            >
              {plan.featured && "badge" in plan && (
                <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#D66BFF] px-4 py-1.5 text-xs font-semibold text-[#F5F2FF] shadow-lg shadow-[#6D4BFF]/40 ring-1 ring-[#B69CFF]/40">
                    <Sparkles className="h-3 w-3" />
                    {plan.badge}
                  </span>
                </div>
              )}
              <div
                className={`glass h-full rounded-3xl p-8 transition-all duration-500 ${
                  plan.featured
                    ? "border-2 border-[#8B5CFF]/45 bg-[rgba(109,75,255,0.12)] shadow-[0_0_60px_rgba(109,75,255,0.22)] ring-1 ring-[#6D4BFF]/30"
                    : "border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)]"
                }`}
              >
                <h3 className="text-lg font-semibold text-[#F5F2FF]">{plan.name}</h3>
                <p className="mt-1 text-sm text-[#B8B2D9]">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#F5F2FF]">
                    {plan.plan === "premium"
                      ? subscriptionDisplayPrice.current
                      : plan.price}
                  </span>
                  <span className="text-sm text-[#B8B2D9]">
                    {plan.plan === "premium"
                      ? billingInterval === "annual"
                        ? plan.annualPeriod
                        : plan.monthlyPeriod
                      : plan.period}
                  </span>
                </div>
                {plan.plan === "premium" && (
                  <p className="mt-2 text-sm text-[#B8B2D9]">
                    <span className="line-through opacity-70">{subscriptionDisplayPrice.previous}</span>{" "}
                    <span className="font-medium text-[#B69CFF]">{t("pricing.promo.temporary")}</span>
                  </p>
                )}
                {plan.plan === "premium" && billingInterval === "annual" && (
                  <p className="mt-2 text-xs text-[#B69CFF]">{t("pricing.promo.annual")}</p>
                )}

                <ul className="mt-8 space-y-3.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6D4BFF]/20">
                        <Check className="h-3 w-3 text-[#B69CFF]" />
                      </div>
                      <span className="text-sm leading-relaxed text-[#B8B2D9]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  data-testid={`pricing-cta-${plan.plan}`}
                  onClick={() => void handlePlanClick(plan.plan)}
                  disabled={loadingPlan === plan.plan}
                  className={`mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold transition-all ${
                    plan.featured
                      ? "bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] text-[#F5F2FF] shadow-lg shadow-[#6D4BFF]/30 hover:shadow-xl hover:shadow-[#6D4BFF]/40"
                      : "border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] text-[#F5F2FF] hover:bg-[rgba(255,255,255,0.10)]"
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {loadingPlan === plan.plan && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loadingPlan === plan.plan ? t("pricing.checkout.opening") : plan.cta}
                  </span>
                </button>

                {plan.featured && "microcopy" in plan && (
                  <p className="mt-3 text-center text-xs leading-relaxed text-[#9F97C2]">
                    {plan.microcopy}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-14 max-w-3xl rounded-3xl border border-[rgba(109,75,255,0.25)] bg-[rgba(109,75,255,0.08)] p-8 shadow-[0_0_40px_rgba(109,75,255,0.12)]"
        >
          <h3 className="text-center text-xl font-semibold text-[#F5F2FF]">
            {t("pricing.premiumIncludes.title")}
          </h3>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {premiumIncludes.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6D4BFF]/25">
                  <Sparkles className="h-3 w-3 text-[#B69CFF]" />
                </div>
                <span className="text-sm leading-relaxed text-[#D8D2F2]">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mx-auto mt-14 max-w-2xl"
        >
          <h3 className="mb-5 text-center text-xl font-semibold text-[#F5F2FF]">
            {t("pricing.faq.title")}
          </h3>
          <Accordion type="single" collapsible className="space-y-3">
            {pricingFaqs.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`pricing-faq-${index}`}
                className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4"
              >
                <AccordionTrigger className="py-4 text-left text-sm font-semibold text-[#F5F2FF] hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-relaxed text-[#B8B2D9]">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {error && (
          <p className="mx-auto mt-6 max-w-xl rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-center text-sm text-red-100">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
