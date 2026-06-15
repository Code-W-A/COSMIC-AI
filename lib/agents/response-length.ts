import type { AgentType } from "@/types/agent"

export type ResponseLengthTier = "brief" | "standard" | "deep"

export type ResponseVerbosity = "low" | "medium" | "high"

export interface ResponseLengthProfile {
  tier: ResponseLengthTier
  verbosity: ResponseVerbosity
  maxOutputTokens: number
  lengthHint: string
}

const TIER_SETTINGS: Record<
  ResponseLengthTier,
  Pick<ResponseLengthProfile, "verbosity" | "maxOutputTokens" | "lengthHint">
> = {
  brief: {
    verbosity: "low",
    maxOutputTokens: 700,
    lengthHint: "Respond briefly in 1-3 sentences unless a little warmth helps.",
  },
  standard: {
    verbosity: "medium",
    maxOutputTokens: 1200,
    lengthHint: "Respond in a natural medium length (about 3-6 sentences). Vary structure; do not force three paragraphs.",
  },
  deep: {
    verbosity: "high",
    maxOutputTokens: 1800,
    lengthHint:
      "The user invited depth. Respond thoroughly in about 4-8 sentences with clear structure, without filler.",
  },
}

const BRIEF_ACK_PATTERN =
  /^(da|ok|okay|yes|yep|thanks|thank you|mulțumesc|mersi|bine|sigur|sure|got it|understood)[.!?\s]*$/i

const DEEP_KEYWORD_PATTERN =
  /\b(detaliat|detaliu|analizeaz[aă]|explic[aă]|explain|deep|depth|complet|complete|tot|everything|în detaliu|in detail|pas cu pas|step by step)\b/i

const SHORT_MESSAGE_MAX = 60
const LONG_MESSAGE_MIN = 220

function tierRank(tier: ResponseLengthTier) {
  return tier === "brief" ? 0 : tier === "standard" ? 1 : 2
}

function maxTier(a: ResponseLengthTier, b: ResponseLengthTier): ResponseLengthTier {
  return tierRank(a) >= tierRank(b) ? a : b
}

function classifyMessageTier(message: string): ResponseLengthTier {
  const trimmed = message.trim()
  if (!trimmed) return "brief"

  if (trimmed.length <= SHORT_MESSAGE_MAX || BRIEF_ACK_PATTERN.test(trimmed)) {
    return "brief"
  }

  const questionMarks = (trimmed.match(/\?/g) ?? []).length
  if (
    trimmed.length >= LONG_MESSAGE_MIN ||
    questionMarks >= 2 ||
    DEEP_KEYWORD_PATTERN.test(trimmed)
  ) {
    return "deep"
  }

  return "standard"
}

function applyAgentBias(agentType: AgentType, messageTier: ResponseLengthTier): ResponseLengthTier {
  switch (agentType) {
    case "daily_guidance":
      return messageTier === "deep" ? "standard" : messageTier
    case "spiritual_reflection":
      return messageTier === "brief" ? "brief" : "standard"
    case "love":
    case "compatibility":
      return messageTier
    case "career_purpose":
    case "birth_chart":
      return messageTier === "brief" ? "standard" : maxTier(messageTier, "standard")
    default:
      return messageTier
  }
}

export function resolveResponseLength(context: {
  agentType: AgentType
  message: string
}): ResponseLengthProfile {
  const messageTier = classifyMessageTier(context.message)
  const tier = applyAgentBias(context.agentType, messageTier)
  const settings = TIER_SETTINGS[tier]

  return {
    tier,
    ...settings,
  }
}

export function resolveMockAnswerLength(context: {
  agentType: AgentType
  message: string
}): ResponseLengthTier {
  return resolveResponseLength(context).tier
}
