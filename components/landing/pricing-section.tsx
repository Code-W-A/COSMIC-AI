"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Check, Loader2, Sparkles } from "lucide-react"

import { ApiClientError, apiFetch } from "@/lib/api/client"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"
import type { BillingInterval } from "@/types/subscription"

const basePlans = [
  {
    name: "Free",
    plan: "free",
    price: "$0",
    period: "forever",
    description: "Start exploring the cosmos",
    features: [
      "Basic cosmic profile",
      "5 AI questions / month",
      "Daily message preview",
    ],
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Premium",
    plan: "premium" as const,
    monthlyPrice: "49 RON",
    annualPrice: "399 RON",
    monthlyPeriod: "/month",
    annualPeriod: "/year",
    description: "Unlock your full cosmic potential",
    features: [
      "120 AI questions / month",
      "Birth chart interpretation",
      "Love and career agents",
      "Compatibility guidance",
      "Priority support",
    ],
    cta: "Start Premium",
    featured: true,
  },
] as const

export function PricingSection() {
  const router = useRouter()
  const localizedPath = useLocalizedPath()
  const { locale } = useTranslations()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly")
  const [error, setError] = useState("")
  const isRo = locale === "ro"
  const plans = isRo
    ? [
        {
          name: "Gratuit",
          plan: "free",
          price: "$0",
          period: "pentru totdeauna",
          description: "Începe explorarea astrologică",
          features: [
            "Profil cosmic de bază",
            "5 întrebări AI / lună",
            "Preview mesaj zilnic",
          ],
          cta: "Începe",
          featured: false,
        },
        {
          name: "Premium",
          plan: "premium" as const,
          monthlyPrice: "49 RON",
          annualPrice: "399 RON",
          monthlyPeriod: "/lună",
          annualPeriod: "/an",
          description: "Deblochează tot potențialul cosmic",
          features: [
            "120 întrebări AI / lună",
            "Interpretare hartă natală",
            "Agenți pentru iubire și carieră",
            "Ghidaj de compatibilitate",
            "Suport prioritar",
          ],
          cta: "Activează Premium",
          featured: true,
        },
      ]
    : basePlans

  async function handlePlanClick(plan: (typeof basePlans)[number]["plan"]) {
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
          },
        }
      )

      window.location.href = payload.url
    } catch (checkoutError) {
      if (checkoutError instanceof ApiClientError && checkoutError.status === 401) {
        router.push(`${localizedPath("/login")}?next=${encodeURIComponent(localizedPath("/pricing"))}`)
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
            : `${localizedPath("/billing/setup")}?plan=${encodeURIComponent(plan)}`
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
            {isRo ? "Prețuri" : "Pricing"}
          </span>
          <h2 className="text-3xl font-bold text-[#F5F2FF] text-balance sm:text-4xl lg:text-5xl">
            {isRo ? "Alege" : "Choose your"}{" "}
            <span className="text-gradient-cosmic">{isRo ? "planul cosmic" : "cosmic plan"}</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#B8B2D9]">
            {isRo
              ? "Începe gratuit sau deblochează insight-uri cosmice mai profunde cu Premium."
              : "Start for free or unlock deeper cosmic insights with a premium plan."}
          </p>
        </motion.div>

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
              {isRo ? "Lunar" : "Monthly"}
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
              {isRo ? "Anual" : "Annual"}
            </button>
          </div>
        </div>

        <div className="mt-16 grid items-center gap-6 md:grid-cols-2">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className={`group relative ${plan.featured ? "md:-mt-4 md:mb-4" : ""}`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#D66BFF] px-4 py-1.5 text-xs font-semibold text-[#F5F2FF] shadow-lg shadow-[#6D4BFF]/30">
                    <Sparkles className="h-3 w-3" />
                    {isRo ? "Cel mai popular" : "Most Popular"}
                  </span>
                </div>
              )}
              <div
                className={`glass rounded-3xl p-8 transition-all duration-500 ${
                  plan.featured
                    ? "border border-[#6D4BFF]/30 bg-[rgba(109,75,255,0.08)] shadow-xl shadow-[#6D4BFF]/10"
                    : "hover:bg-[rgba(255,255,255,0.08)]"
                }`}
              >
                <h3 className="text-lg font-semibold text-[#F5F2FF]">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-[#B8B2D9]">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#F5F2FF]">
                    {"monthlyPrice" in plan
                      ? billingInterval === "annual"
                        ? plan.annualPrice
                        : plan.monthlyPrice
                      : plan.price}
                  </span>
                  <span className="text-sm text-[#B8B2D9]">
                    {"monthlyPrice" in plan
                      ? billingInterval === "annual"
                        ? plan.annualPeriod
                        : plan.monthlyPeriod
                      : plan.period}
                  </span>
                </div>
                {"monthlyPrice" in plan && billingInterval === "annual" && (
                  <p className="mt-2 text-xs text-[#B69CFF]">
                    {isRo ? "Economisești cu facturare anuală" : "Save with annual billing"}
                  </p>
                )}

                <ul className="mt-8 space-y-3.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6D4BFF]/20">
                        <Check className="h-3 w-3 text-[#B69CFF]" />
                      </div>
                      <span className="text-sm text-[#B8B2D9]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handlePlanClick(plan.plan)}
                  disabled={loadingPlan === plan.plan}
                  className={`mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold transition-all ${
                    plan.featured
                      ? "bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] text-[#F5F2FF] shadow-lg shadow-[#6D4BFF]/20 hover:shadow-xl hover:shadow-[#6D4BFF]/30"
                      : "border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] text-[#F5F2FF] hover:bg-[rgba(255,255,255,0.10)]"
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {loadingPlan === plan.plan && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loadingPlan === plan.plan
                      ? isRo
                        ? "Se deschide..."
                        : "Opening..."
                      : plan.cta}
                  </span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {error && (
          <p className="mx-auto mt-6 max-w-xl rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-center text-sm text-red-100">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
