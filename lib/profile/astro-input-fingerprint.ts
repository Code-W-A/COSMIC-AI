import type { CosmicProfileDocument } from "@/types/user"

export type AstroInputSource = Partial<
  Pick<
    CosmicProfileDocument,
    | "birthDate"
    | "birthTime"
    | "birthPlace"
    | "birthPlacePlaceId"
    | "sexAtBirth"
    | "latitude"
    | "longitude"
    | "timezoneIana"
    | "timezoneOffsetAtBirth"
  >
>

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function buildAstroInputFingerprint(source: AstroInputSource | null | undefined) {
  if (!source) return ""

  const payload = {
    birthDate: normalizeString(source.birthDate),
    birthTime: normalizeString(source.birthTime),
    birthPlace: normalizeString(source.birthPlace),
    birthPlacePlaceId: normalizeString(source.birthPlacePlaceId),
    sexAtBirth: normalizeString(source.sexAtBirth),
    latitude: normalizeNumber(source.latitude),
    longitude: normalizeNumber(source.longitude),
    timezoneIana: normalizeString(source.timezoneIana),
    timezoneOffsetAtBirth: normalizeNumber(source.timezoneOffsetAtBirth),
  }

  return JSON.stringify(payload)
}

export function hasAstroInputsChanged(
  before: AstroInputSource | null | undefined,
  after: AstroInputSource | null | undefined
) {
  return buildAstroInputFingerprint(before) !== buildAstroInputFingerprint(after)
}
