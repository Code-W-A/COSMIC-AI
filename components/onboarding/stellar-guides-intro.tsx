"use client"

import { motion } from "framer-motion"

import { AgentAvatar } from "@/components/agents/agent-avatar"
import { agentAvatarCatalog } from "@/lib/agents/avatar-catalog"
import { getRecommendedAgentForMainFocus } from "@/lib/onboarding/main-focus-agent"
import { useTranslations } from "@/lib/i18n/client"
import { isMainFocus } from "@/types/user"

interface StellarGuidesIntroProps {
  mainFocus: string
  onStartChat: () => void
}

export function StellarGuidesIntro({ mainFocus, onStartChat }: StellarGuidesIntroProps) {
  const { t } = useTranslations()
  const recommendedAgent = getRecommendedAgentForMainFocus(mainFocus)
  const catalog = agentAvatarCatalog[recommendedAgent]
  const focusKey = isMainFocus(mainFocus)
    ? (`onboarding.guides.focus.${mainFocus}` as const)
    : null

  return (
    <div
      data-testid="onboarding-stellar-guides"
      className="relative z-10 w-full max-w-lg text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-foreground">{t("onboarding.guides.title")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("onboarding.guides.subtitle")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, delay: 0.15 }}
        className="mt-8 rounded-3xl border border-[rgba(109,75,255,0.25)] bg-[rgba(255,255,255,0.04)] px-6 py-8"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[#B69CFF]">
          {t("onboarding.guides.recommended")}
        </p>
        <div className="mt-5 flex flex-col items-center">
          <AgentAvatar agentType={recommendedAgent} size="lg" showRing priority={false} />
          <p className="mt-4 text-xl font-bold text-foreground">{catalog.personaName}</p>
          <p className="mt-1 text-sm text-muted-foreground">{catalog.displayName}</p>
          <p className="mt-3 text-sm text-foreground/90">{catalog.personaTagline}</p>
          {focusKey && (
            <p className="mt-4 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs text-muted-foreground">
              {t(focusKey)}
            </p>
          )}
        </div>
      </motion.div>

      <button
        type="button"
        data-testid="onboarding-start-chat"
        onClick={onStartChat}
        className="mt-8 w-full rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-6 py-3.5 text-sm font-semibold text-foreground shadow-[0_0_30px_rgba(109,75,255,0.25)]"
      >
        {t("onboarding.guides.startChat")}
      </button>
    </div>
  )
}
