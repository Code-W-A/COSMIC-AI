"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Sparkles } from "lucide-react"

import { useTranslations } from "@/lib/i18n/client"

const PHASE_KEYS = [
  "onboarding.generation.phase.sky",
  "onboarding.generation.phase.planets",
  "onboarding.generation.phase.houses",
] as const

interface CosmicGenerationLoadingProps {
  errorMessage?: string | null
  isRetrying?: boolean
  onGenerate: () => Promise<void>
  onSkip: () => void
}

export function CosmicGenerationLoading({
  errorMessage,
  isRetrying = false,
  onGenerate,
  onSkip,
}: CosmicGenerationLoadingProps) {
  const { t } = useTranslations()
  const [phaseIndex, setPhaseIndex] = useState(0)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (errorMessage || hasStartedRef.current) return
    hasStartedRef.current = true
    void onGenerate()
  }, [errorMessage, onGenerate])

  useEffect(() => {
    if (errorMessage) return

    const interval = window.setInterval(() => {
      setPhaseIndex((current) => (current + 1) % PHASE_KEYS.length)
    }, 2400)

    return () => window.clearInterval(interval)
  }, [errorMessage])

  return (
    <div
      data-testid="onboarding-divine-loading"
      className="relative z-10 flex w-full max-w-lg flex-col items-center text-center"
    >
      <div className="relative mb-7 flex h-28 w-28 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-[#B69CFF]/20 shadow-[0_0_60px_rgba(109,75,255,0.28)]" />
        <div className="absolute inset-3 animate-[spin_8s_linear_infinite] rounded-full border border-transparent border-t-[#B69CFF] border-r-[#D66BFF]/70" />
        <div className="absolute inset-7 animate-[spin_5s_linear_infinite_reverse] rounded-full border border-transparent border-b-[#8B5CFF] border-l-[#B69CFF]/60" />
        <div className="relative flex h-16 w-16 animate-[pulse_2.4s_ease-in-out_infinite] items-center justify-center rounded-2xl border border-[#B69CFF]/20 bg-[rgba(255,255,255,0.06)] shadow-[0_0_38px_rgba(109,75,255,0.35)] backdrop-blur-xl">
          <Sparkles className="h-7 w-7 text-[#DCD3FF]" />
        </div>
      </div>

      <h2 className="bg-gradient-to-r from-[#F5F2FF] via-[#B69CFF] to-[#F5F2FF] bg-[length:200%_100%] bg-clip-text text-xl font-bold text-transparent animate-[cosmic-shimmer_2.6s_linear_infinite]">
        {t("onboarding.generation.title")}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {t("onboarding.generation.subtitle")}
      </p>

      <div className="mt-6 h-6">
        <AnimatePresence mode="wait">
          {!errorMessage && (
            <motion.p
              key={PHASE_KEYS[phaseIndex]}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="text-sm font-medium text-[#B69CFF]"
            >
              {t(PHASE_KEYS[phaseIndex])}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-7 h-1 w-44 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <div className="h-full w-1/2 animate-[cosmic-progress_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-[#B69CFF] to-transparent" />
      </div>

      {errorMessage && (
        <div className="mt-8 w-full rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-4 text-left">
          <p className="text-sm text-red-100">{errorMessage}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              data-testid="onboarding-divine-retry"
              disabled={isRetrying}
              onClick={() => void onGenerate()}
              className="rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
            >
              {isRetrying ? t("common.loading") : t("onboarding.generation.retry")}
            </button>
            <button
              type="button"
              data-testid="onboarding-divine-skip"
              onClick={onSkip}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t("onboarding.generation.skipToChat")}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes cosmic-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @keyframes cosmic-progress {
          0% {
            transform: translateX(-110%);
          }
          100% {
            transform: translateX(220%);
          }
        }
      `}</style>
    </div>
  )
}
