export const agentTypes = [
  "birth_chart",
  "love",
  "compatibility",
  "daily_guidance",
  "career_purpose",
  "spiritual_reflection",
] as const

export type AgentType = (typeof agentTypes)[number]

export function isAgentType(value: unknown): value is AgentType {
  return typeof value === "string" && agentTypes.includes(value as AgentType)
}
