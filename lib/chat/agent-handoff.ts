import { agentAvatarCatalog } from "@/lib/agents/avatar-catalog"
import type { AgentType } from "@/types/agent"
import { isAgentType } from "@/types/agent"

export type MessageCta = {
  label: string
  href?: string
  action?: "generate_divine_data" | "switch_agent"
  targetAgent?: AgentType
  prefillQuestion?: string
  variant?: "primary" | "secondary"
}

export interface HandoffFields {
  suggestedAgent?: AgentType | null
  agentHandoffReason?: string | null
  suggestedQuestion?: string | null
}

export function buildHandoffCtas(
  handoff: HandoffFields,
  activeAgent: AgentType,
  continueWithLabel: (persona: string, specialty: string) => string,
  getSpecialtyLabel: (agentType: AgentType) => string
): MessageCta[] {
  if (
    !handoff.suggestedAgent ||
    !isAgentType(handoff.suggestedAgent) ||
    handoff.suggestedAgent === activeAgent
  ) {
    return []
  }

  const catalog = agentAvatarCatalog[handoff.suggestedAgent]
  return [
    {
      label: continueWithLabel(catalog.personaName, getSpecialtyLabel(handoff.suggestedAgent)),
      action: "switch_agent",
      targetAgent: handoff.suggestedAgent,
      prefillQuestion: handoff.suggestedQuestion ?? undefined,
      variant: "primary",
    },
  ]
}
