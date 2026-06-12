import type { AgentType } from "@/types/agent"
import type { MainFocus } from "@/types/user"

const mainFocusToAgent: Record<MainFocus, AgentType> = {
  love: "love",
  compatibility: "compatibility",
  self_discovery: "spiritual_reflection",
  career: "career_purpose",
  daily_guidance: "daily_guidance",
}

export function getRecommendedAgentForMainFocus(mainFocus: string): AgentType {
  if (mainFocus in mainFocusToAgent) {
    return mainFocusToAgent[mainFocus as MainFocus]
  }
  return "birth_chart"
}
