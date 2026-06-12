"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

import type { NatalRevealPayload } from "@/lib/divineapi/natal-overview"
import { getNatalChartImageSrc } from "@/lib/onboarding/natal-chart-image"
import { formatZodiacSign } from "@/lib/i18n/zodiac"
import { useTranslations } from "@/lib/i18n/client"

interface NatalChartRevealProps {
  natal: NatalRevealPayload
  onContinue: () => void
}

function displayString(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value)
  return "—"
}

export function NatalChartReveal({ natal, onContinue }: NatalChartRevealProps) {
  const { t, locale } = useTranslations()
  const [stage, setStage] = useState(0)
  const chartSrc = getNatalChartImageSrc(natal)

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 1200),
      window.setTimeout(() => setStage(2), 2600),
      window.setTimeout(() => setStage(3), 4200),
    ]

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const bigThree = [
    { label: t("onboarding.reveal.sun"), sign: natal.sunSign },
    { label: t("onboarding.reveal.moon"), sign: natal.moonSign },
    { label: t("onboarding.reveal.rising"), sign: natal.risingSign },
  ]

  return (
    <div data-testid="onboarding-chart-reveal" className="relative z-10 w-full max-w-2xl">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-foreground">{t("onboarding.reveal.title")}</h2>
      </div>

      {chartSrc && stage >= 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto mb-6 max-w-md rounded-3xl border border-[rgba(109,75,255,0.25)] bg-[rgba(255,255,255,0.04)] p-4 shadow-[0_0_40px_rgba(109,75,255,0.18)]"
        >
          <img
            src={chartSrc}
            alt={t("onboarding.reveal.title")}
            className="w-full rounded-2xl border border-white/10 bg-white/95 object-contain p-3"
          />
        </motion.div>
      )}

      {stage >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 grid gap-3 sm:grid-cols-3"
        >
          {bigThree.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.12 }}
              className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-4 text-center"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatZodiacSign(item.sign, locale)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {stage >= 2 && natal.houses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4"
        >
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t("onboarding.reveal.housesTitle")}
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {natal.houses.slice(0, 12).map((house, index) => (
              <motion.div
                key={`${displayString(house.house)}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-foreground"
              >
                {t("onboarding.reveal.house")} {displayString(house.house)} ·{" "}
                {formatZodiacSign(displayString(house.sign), locale)}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          data-testid="onboarding-reveal-continue"
          onClick={onContinue}
          disabled={stage < 1}
          className="rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-6 py-3 text-sm font-semibold text-foreground disabled:opacity-50"
        >
          {t("onboarding.reveal.continue")}
        </button>
        {stage < 3 && (
          <button
            type="button"
            data-testid="onboarding-reveal-skip"
            onClick={onContinue}
            className="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("onboarding.reveal.skip")}
          </button>
        )}
      </div>
    </div>
  )
}
