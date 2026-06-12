import type { CosmicProfileDocument } from "@/types/user"

export type NatalRevealPayload = {
  sunSign: string | null
  moonSign: string | null
  risingSign: string | null
  chartImageSvg: string | null
  chartImageBase64: string | null
  planets: Array<Record<string, unknown>>
  houses: Array<Record<string, unknown>>
  aspects: Array<Record<string, unknown>>
}

function toRecordList(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item))
  )
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function isNatalReady(profile: CosmicProfileDocument | null | undefined) {
  if (!profile) return false

  const expanded = profile as CosmicProfileDocument & {
    natalSummary?: { sunSign?: string; planets?: unknown[] }
    zodiacSign?: string
  }
  const cachedSunSign =
    profile.sunSign ??
    expanded.natalSummary?.sunSign ??
    expanded.zodiacSign ??
    undefined
  const cachedPlanetCount = Array.isArray(expanded.natalSummary?.planets)
    ? expanded.natalSummary.planets.length
    : 0

  return Boolean(expanded.natalSummary && cachedSunSign && cachedPlanetCount > 0)
}

export function toNatalRevealPayload(
  summary: Record<string, unknown> | null | undefined
): NatalRevealPayload {
  const safe = summary ?? {}

  return {
    sunSign: getOptionalString(safe.sunSign),
    moonSign: getOptionalString(safe.moonSign),
    risingSign: getOptionalString(safe.risingSign),
    chartImageSvg: getOptionalString(safe.chartImageSvg),
    chartImageBase64: getOptionalString(safe.chartImageBase64),
    planets: toRecordList(safe.planets),
    houses: toRecordList(safe.houses),
    aspects: toRecordList(safe.aspects),
  }
}

export function buildNatalGenerationResponse({
  generated,
  cached,
  summary,
}: {
  generated: boolean
  cached: boolean
  summary: Record<string, unknown> | null | undefined
}) {
  return {
    generated,
    cached,
    natal: toNatalRevealPayload(summary),
    data: {
      generated,
      cached,
      ...toNatalRevealPayload(summary),
    },
  }
}
