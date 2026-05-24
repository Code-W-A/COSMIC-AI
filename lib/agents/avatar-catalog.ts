import type { AgentType } from "@/types/agent"

export type AgentAvatarEntry = {
  personaName: string
  displayName: string
  accentColor: string
  avatarSrcSm: string
  avatarSrcMd: string
  avatarSrcLg: string
  altText: string
  personaTagline: string
}

function buildAvatarPaths(agentType: AgentType) {
  const base = `/avatars/agents/${agentType}`
  return {
    avatarSrcSm: `${base}/sm.webp`,
    avatarSrcMd: `${base}/md.webp`,
    avatarSrcLg: `${base}/lg.webp`,
  }
}

export const agentAvatarCatalog: Record<AgentType, AgentAvatarEntry> = {
  birth_chart: {
    personaName: "Astra",
    displayName: "Birth Chart Agent",
    accentColor: "#6D4BFF",
    ...buildAvatarPaths("birth_chart"),
    altText: "Birth Chart agent robotic astrology avatar",
    personaTagline: "Analytical cosmic navigator",
  },
  love: {
    personaName: "Lyra",
    displayName: "Love Agent",
    accentColor: "#D66BFF",
    ...buildAvatarPaths("love"),
    altText: "Love agent robotic astrology avatar",
    personaTagline: "Warm relationship guide",
  },
  compatibility: {
    personaName: "Gemini",
    displayName: "Compatibility Agent",
    accentColor: "#8B5CFF",
    ...buildAvatarPaths("compatibility"),
    altText: "Compatibility agent robotic astrology avatar",
    personaTagline: "Diplomatic harmony mapper",
  },
  daily_guidance: {
    personaName: "Sol",
    displayName: "Daily Guidance Agent",
    accentColor: "#FFB86D",
    ...buildAvatarPaths("daily_guidance"),
    altText: "Daily guidance agent robotic astrology avatar",
    personaTagline: "Grounded daily ritual guide",
  },
  career_purpose: {
    personaName: "Nova",
    displayName: "Career & Purpose Agent",
    accentColor: "#4BC8FF",
    ...buildAvatarPaths("career_purpose"),
    altText: "Career and purpose agent robotic astrology avatar",
    personaTagline: "Strategic vocation mentor",
  },
  spiritual_reflection: {
    personaName: "Luna",
    displayName: "Spiritual Reflection Agent",
    accentColor: "#B69CFF",
    ...buildAvatarPaths("spiritual_reflection"),
    altText: "Spiritual reflection agent robotic astrology avatar",
    personaTagline: "Serene inner wisdom companion",
  },
}
