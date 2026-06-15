"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

import { AgentAvatar } from "@/components/agents/agent-avatar"
import { agentAvatarCatalog } from "@/lib/agents/avatar-catalog"
import { useTranslations } from "@/lib/i18n/client"
import type { AgentType } from "@/types/agent"

const AVATAR_ANIMATION_S = 0.5

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setPrefersReducedMotion(mediaQuery.matches)
    update()
    mediaQuery.addEventListener("change", update)
    return () => mediaQuery.removeEventListener("change", update)
  }, [])

  return prefersReducedMotion
}

interface AgentHandoffTransitionBannerProps {
  fromAgentType: AgentType
  toAgentType: AgentType
  getAgentLabel: (agentType: AgentType) => string
}

export function AgentHandoffTransitionBanner({
  fromAgentType,
  toAgentType,
  getAgentLabel,
}: AgentHandoffTransitionBannerProps) {
  const { t } = useTranslations()
  const prefersReducedMotion = usePrefersReducedMotion()
  const toCatalog = agentAvatarCatalog[toAgentType]
  const specialty = getAgentLabel(toAgentType)
  const label = t("chat.agentHandoff.nowSpeakingWith")
    .replace("{persona}", toCatalog.personaName)
    .replace("{specialty}", specialty)

  return (
    <div
      data-testid="chat-handoff-transition-banner"
      className="flex items-center gap-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2"
      style={{ borderLeftColor: toCatalog.accentColor, borderLeftWidth: 2 }}
    >
      <div className="relative h-7 w-7 shrink-0">
        {prefersReducedMotion ? (
          <AgentAvatar agentType={toAgentType} size="sm" showRing priority={false} />
        ) : (
          <>
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 1, x: 0 }}
              animate={{ opacity: 0, x: -8 }}
              transition={{ duration: AVATAR_ANIMATION_S, ease: "easeOut" }}
            >
              <AgentAvatar agentType={fromAgentType} size="sm" showRing={false} priority={false} />
            </motion.div>
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: AVATAR_ANIMATION_S, ease: "easeOut" }}
            >
              <AgentAvatar agentType={toAgentType} size="sm" showRing priority={false} />
            </motion.div>
          </>
        )}
      </div>
      <p className="text-xs font-medium leading-snug text-foreground">{label}</p>
    </div>
  )
}
