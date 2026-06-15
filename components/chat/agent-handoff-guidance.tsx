"use client"

import { AgentAvatar } from "@/components/agents/agent-avatar"
import { agentAvatarCatalog } from "@/lib/agents/avatar-catalog"
import { useTranslations } from "@/lib/i18n/client"
import type { AgentType } from "@/types/agent"

interface AgentHandoffGuidanceProps {
  fromAgentType: AgentType
  toAgentType: AgentType
  reason: string
  suggestedQuestion?: string
  getAgentLabel: (agentType: AgentType) => string
  onSwitch: (targetAgent: AgentType, prefillQuestion?: string) => void
}

export function AgentHandoffGuidance({
  fromAgentType,
  toAgentType,
  reason,
  suggestedQuestion,
  getAgentLabel,
  onSwitch,
}: AgentHandoffGuidanceProps) {
  const { t } = useTranslations()
  const fromCatalog = agentAvatarCatalog[fromAgentType]
  const toCatalog = agentAvatarCatalog[toAgentType]
  const targetSpecialty = getAgentLabel(toAgentType)

  const intro = t("chat.agentHandoff.guidanceIntro")
    .replace("{currentPersona}", fromCatalog.personaName)
    .replace("{targetPersona}", toCatalog.personaName)
    .replace("{targetSpecialty}", targetSpecialty)

  const openLabel = t("chat.agentHandoff.openConversation").replace(
    "{targetPersona}",
    toCatalog.personaName
  )

  return (
    <div
      data-testid="chat-handoff-guidance"
      className="mt-4 border-t border-[rgba(255,255,255,0.08)] pt-4"
    >
      <div
        className="rounded-xl border-l-2 bg-[rgba(255,255,255,0.03)] px-4 py-3"
        style={{ borderLeftColor: toCatalog.accentColor }}
      >
        <div className="mb-2 flex items-center gap-2">
          <AgentAvatar agentType={fromAgentType} size="sm" showRing={false} priority={false} />
          <p className="text-xs font-medium leading-relaxed text-[#B8B2D9]">{intro}</p>
        </div>

        <p
          data-testid="chat-handoff-reason"
          className="text-sm leading-relaxed text-foreground/90"
        >
          {reason}
        </p>

        {suggestedQuestion ? (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">{t("chat.agentHandoff.suggestedQuestion")}</p>
            <p className="mt-1 text-sm italic leading-relaxed text-muted-foreground">
              &ldquo;{suggestedQuestion}&rdquo;
            </p>
          </div>
        ) : null}

        <button
          type="button"
          data-testid="chat-switch-agent-cta"
          onClick={() => onSwitch(toAgentType, suggestedQuestion)}
          className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.05)] px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-[rgba(255,255,255,0.1)] hover:text-foreground"
        >
          <AgentAvatar agentType={toAgentType} size="sm" showRing={false} priority={false} />
          <span>{openLabel}</span>
        </button>
      </div>
    </div>
  )
}
