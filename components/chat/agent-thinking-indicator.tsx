"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

import { AgentAvatar } from "@/components/agents/agent-avatar"
import { agentAvatarCatalog } from "@/lib/agents/avatar-catalog"
import {
  getWaitingPhaseIndex,
  getWaitingPhaseMessageKey,
  WAITING_STOP_BUTTON_MS,
  type WaitingPhaseIndex,
} from "@/lib/chat/waiting-phases"
import { useTranslations } from "@/lib/i18n/client"
import type { AgentType } from "@/types/agent"

const PHASE_POLL_MS = 300

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-cosmic-lavender"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        />
      ))}
    </div>
  )
}

interface AgentThinkingIndicatorProps {
  agentType: AgentType
  getAgentLabel: (agentType: AgentType) => string
  hasAstralProfile: boolean
  startedAt: number
  onStop?: () => void
}

export function AgentThinkingIndicator({
  agentType,
  getAgentLabel,
  hasAstralProfile,
  startedAt,
  onStop,
}: AgentThinkingIndicatorProps) {
  const { t } = useTranslations()
  const personaName = agentAvatarCatalog[agentType].personaName
  const accentColor = agentAvatarCatalog[agentType].accentColor
  const mountedRef = useRef(true)
  const [phase, setPhase] = useState<WaitingPhaseIndex>(0)
  const [showStop, setShowStop] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    const initialElapsed = Date.now() - startedAt
    setPhase(getWaitingPhaseIndex(initialElapsed))
    setShowStop(initialElapsed >= WAITING_STOP_BUTTON_MS)

    const timer = window.setInterval(() => {
      if (!mountedRef.current) return

      const elapsed = Date.now() - startedAt
      const nextPhase = getWaitingPhaseIndex(elapsed)

      setPhase((current) => (current === nextPhase ? current : nextPhase))

      if (elapsed >= WAITING_STOP_BUTTON_MS) {
        setShowStop((current) => (current ? current : true))
      }
    }, PHASE_POLL_MS)

    return () => {
      mountedRef.current = false
      window.clearInterval(timer)
    }
  }, [startedAt])

  const messageKey = getWaitingPhaseMessageKey(phase, hasAstralProfile)
  const activePhrase = t(messageKey)

  return (
    <div className="max-w-[82%]" data-testid="chat-typing-indicator">
      <div className="mb-2 flex items-center gap-2">
        <AgentAvatar agentType={agentType} size="md" showRing priority={false} />
        <span className="text-xs font-semibold tracking-wide" style={{ color: accentColor }}>
          {personaName} · {getAgentLabel(agentType)}
        </span>
      </div>
      <div className="rounded-2xl rounded-bl-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-5 py-4">
        <div className="min-h-[1.25rem]">
          <motion.p
            key={messageKey}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="text-sm italic text-[#B8B2D9]"
          >
            {activePhrase}
          </motion.p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <TypingDots />
          {showStop && onStop && (
            <button
              type="button"
              data-testid="chat-stop-button"
              onClick={onStop}
              className="shrink-0 rounded-full border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.06)] px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-[rgba(255,255,255,0.12)] hover:text-foreground"
            >
              {t("chat.waiting.stop")}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
