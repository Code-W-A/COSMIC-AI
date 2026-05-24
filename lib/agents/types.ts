import type { AgentType } from "@/types/agent"
import type { CompatibilityData, DailyHoroscopeData, NatalChartData } from "@/lib/divineapi/types"
import type { Locale } from "@/lib/i18n/locale"

export type AgentCardType =
  | "natal_summary"
  | "daily_guidance"
  | "compatibility_score"
  | "reflection"
  | "premium_teaser"

export interface AgentCard {
  type: AgentCardType
  title: string
  value?: string | null
  description?: string | null
  items?: Array<{
    label: string
    value: string
  }>
}

export interface AgentStructuredResponse {
  answer: string
  cards: AgentCard[]
  followUpQuestions: string[]
}

export interface UsedAstrologyData {
  natal: boolean
  daily: boolean
  compatibility: boolean
}

export interface AgentContext {
  uid: string
  locale: Locale
  agentType: AgentType
  message: string
  profile: {
    name?: string
    mainFocus?: string
  }
  natal?: NatalChartData
  daily?: DailyHoroscopeData
  compatibility?: CompatibilityData
  usedAstrologyData: UsedAstrologyData
}
