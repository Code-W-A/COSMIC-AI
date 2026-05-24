import type { AgentType } from "@/types/agent"
import type { CosmicProfileDocument, SexAtBirth } from "@/types/user"
import { isSexAtBirth } from "@/types/user"

export type AnalysisInputPolicyId =
  | "astrology_natal"
  | "astrology_compatibility"
  | "numerology_core"

export type BirthInputField = "birthDate" | "birthTime" | "birthPlace" | "sexAtBirth"

export interface InputPolicy {
  id: AnalysisInputPolicyId
  requiredFields: BirthInputField[]
}

export interface InputCompleteness {
  isComplete: boolean
  missingFields: BirthInputField[]
}

const inputPolicies: Record<AnalysisInputPolicyId, InputPolicy> = {
  astrology_natal: {
    id: "astrology_natal",
    requiredFields: ["birthDate", "birthTime", "birthPlace", "sexAtBirth"],
  },
  astrology_compatibility: {
    id: "astrology_compatibility",
    requiredFields: ["birthDate", "birthTime", "birthPlace", "sexAtBirth"],
  },
  numerology_core: {
    id: "numerology_core",
    requiredFields: ["birthDate"],
  },
}

const agentToPolicy: Record<AgentType, AnalysisInputPolicyId> = {
  birth_chart: "astrology_natal",
  love: "astrology_natal",
  compatibility: "astrology_compatibility",
  daily_guidance: "astrology_natal",
  career_purpose: "astrology_natal",
  spiritual_reflection: "astrology_natal",
}

function hasRequiredField(
  source: Record<string, unknown>,
  field: BirthInputField
): boolean {
  if (field === "sexAtBirth") {
    return isSexAtBirth(source.sexAtBirth)
  }

  const value = source[field]
  return typeof value === "string" && value.trim().length > 0
}

function evaluateSourceForPolicy(
  source: Record<string, unknown> | null | undefined,
  policyId: AnalysisInputPolicyId
): InputCompleteness {
  const policy = inputPolicies[policyId]
  const safeSource = source ?? {}
  const missingFields = policy.requiredFields.filter(
    (field) => !hasRequiredField(safeSource, field)
  )

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  }
}

export function getInputPolicy(policyId: AnalysisInputPolicyId) {
  return inputPolicies[policyId]
}

export function getAgentInputPolicyId(agentType: AgentType): AnalysisInputPolicyId {
  return agentToPolicy[agentType]
}

export function getAgentInputPolicy(agentType: AgentType) {
  return getInputPolicy(getAgentInputPolicyId(agentType))
}

export function getProfileInputCompleteness(
  profile: Partial<CosmicProfileDocument> | null | undefined,
  policyId: AnalysisInputPolicyId
) {
  return evaluateSourceForPolicy(profile as Record<string, unknown> | null | undefined, policyId)
}

export type PartnerBirthInput = {
  birthDate?: string
  birthTime?: string
  birthPlace?: string
  sexAtBirth?: SexAtBirth | string
}

export function getPartnerInputCompleteness(
  partner: PartnerBirthInput | null | undefined,
  policyId: AnalysisInputPolicyId
) {
  return evaluateSourceForPolicy(partner as Record<string, unknown> | null | undefined, policyId)
}

export function isAstrologyProfileComplete(
  profile: Partial<CosmicProfileDocument> | null | undefined
) {
  return getProfileInputCompleteness(profile, "astrology_natal").isComplete
}
