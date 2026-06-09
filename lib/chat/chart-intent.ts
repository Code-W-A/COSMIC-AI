import type { AgentType } from "@/types/agent"

const chartPhrasePattern =
  /\b(birth chart|natal chart|natal wheel|chart wheel|my chart|full chart|see my chart|show my chart|view my chart|wheel chart|zodiac chart|planetary positions|house cusps|aspect table|sun sign|moon sign|rising sign|ascendant sign|harta natal[aă]|hart[aă] natal[aă]|harta mea|hart[aă] mea|roata natal[aă]|roti natale|planete|case astrologice|aspecte|semn solar|semnul soarelui|semn lunar|ascendent|grafic natal|vizualiz(?:a|eaza|ează).*hart[aă])\b/i

const chartKeywordPattern = /\b(chart|natal|horoscope|hart[aă]|horoscop)\b/i

const dailyChartViewPattern =
  /\b(show|view|see|open|full|complete|detailed|vizualiz(?:a|eaza|ează)|arat[aă]|vezi).*(daily|today|horoscope|ghidaj|azi|zilei)\b|\b(daily guidance|ghidaj zilnic|horoscopul zilei|ghidajul zilnic)\b/i

export function asksForChartDetails(message: string, agentType: AgentType) {
  const trimmed = message.trim()
  if (!trimmed) return false

  if (agentType === "birth_chart") return true

  if (agentType === "daily_guidance" && dailyChartViewPattern.test(trimmed)) {
    return true
  }

  if (chartPhrasePattern.test(trimmed)) return true

  if (
    (agentType === "love" ||
      agentType === "career_purpose" ||
      agentType === "spiritual_reflection") &&
    chartKeywordPattern.test(trimmed)
  ) {
    return true
  }

  return false
}

export function getChartAccountPath(agentType: AgentType) {
  if (agentType === "daily_guidance") return "/account?tab=daily_guidance"
  return "/account"
}
