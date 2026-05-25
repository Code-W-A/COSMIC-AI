import "server-only"

import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { getCompatibilityData } from "@/lib/divineapi/compatibility"
import { getDailyHoroscopeFromDivineApi } from "@/lib/divineapi/horoscope"
import { getNatalChartFromDivineApi } from "@/lib/divineapi/natal"
import type {
  BirthDetails,
  CompatibilityData,
  DailyHoroscopeData,
  NatalChartData,
} from "@/lib/divineapi/types"
import {
  getCompatibilityReadingsCollection,
  getCosmicProfileRef,
  getDailyGuidanceRef,
  getPartnerRef,
} from "@/lib/firebase/firestore"
import { toFirestoreData } from "@/lib/firebase/sanitize"
import { logInfo } from "@/lib/logging/logger"
import type { AgentContext, UsedAstrologyData } from "@/lib/agents/types"
import {
  getAgentInputPolicy,
  getAgentInputPolicyId,
  getPartnerInputCompleteness,
  getProfileInputCompleteness,
} from "@/lib/profile/input-policy"
import {
  buildLocalDateKeyForOffset,
  buildLocalDateKeyForTimeZone,
  getDatePartsInTimeZone,
  getOffsetHoursForTimeZoneAtLocalDateTime,
  resolveDivineTimezoneOffsetHours,
} from "@/lib/divineapi/timezone"
import type { AgentType } from "@/types/agent"
import type { CosmicProfileDocument } from "@/types/user"
import type { Locale } from "@/lib/i18n/locale"

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function getOptionalNumber(value: unknown) {
  return typeof value === "number" ? value : undefined
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function profileToBirthDetails(profile: CosmicProfileDocument): BirthDetails {
  const expanded = profile as CosmicProfileDocument & {
    latitude?: number
    longitude?: number
    timezoneIana?: string
    timezoneOffsetNow?: number
    timezoneOffsetAtBirth?: number
    timezone?: string | number
  }

  return {
    name: profile.name,
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    birthPlace: profile.birthPlace,
    sexAtBirth: profile.sexAtBirth,
    latitude: expanded.latitude,
    longitude: expanded.longitude,
    timezoneIana: expanded.timezoneIana,
    timezoneOffsetAtBirth: expanded.timezoneOffsetAtBirth,
    timezone:
      expanded.timezoneOffsetAtBirth ??
      expanded.timezoneOffsetNow ??
      expanded.timezone,
  }
}

export function parsePartnerBirthDetails(value: unknown): BirthDetails | null {
  const partner = toRecord(value)
  const birthDate = getOptionalString(partner.birthDate)
  const birthTime = getOptionalString(partner.birthTime)
  const birthPlace = getOptionalString(partner.birthPlace)
  const sexAtBirth = getOptionalString(partner.sexAtBirth)
  const completeness = getPartnerInputCompleteness(
    {
      birthDate: birthDate ?? undefined,
      birthTime: birthTime ?? undefined,
      birthPlace: birthPlace ?? undefined,
      sexAtBirth: sexAtBirth ?? undefined,
    },
    "astrology_compatibility"
  )

  if (!completeness.isComplete || !sexAtBirth || (sexAtBirth !== "male" && sexAtBirth !== "female")) {
    return null
  }

  const requiredBirthDate = birthDate as string
  const requiredBirthTime = birthTime as string
  const requiredBirthPlace = birthPlace as string

  return {
    name: getOptionalString(partner.name),
    birthDate: requiredBirthDate,
    birthTime: requiredBirthTime,
    birthPlace: requiredBirthPlace,
    birthPlacePlaceId: getOptionalString(partner.birthPlacePlaceId),
    sexAtBirth,
    latitude: getOptionalNumber(partner.latitude),
    longitude: getOptionalNumber(partner.longitude),
    timezoneIana: getOptionalString(partner.timezoneIana),
    timezoneOffsetAtBirth: getOptionalNumber(partner.timezoneOffsetAtBirth),
    timezone:
      typeof partner.timezone === "string" || typeof partner.timezone === "number"
        ? partner.timezone
        : undefined,
  }
}

export function getProfileSunSign(profile: CosmicProfileDocument) {
  const expanded = profile as CosmicProfileDocument & {
    natalSummary?: NatalChartData["summary"]
    zodiacSign?: string
  }

  return profile.sunSign ?? expanded.natalSummary?.sunSign ?? expanded.zodiacSign
}

export async function saveNatalToProfile(uid: string, natal: NatalChartData) {
  await getCosmicProfileRef(uid).set(
    {
      divineNatalRaw: natal.raw,
      natalSummary: toFirestoreData(natal.summary),
      sunSign: natal.summary.sunSign ?? null,
      moonSign: natal.summary.moonSign ?? null,
      risingSign: natal.summary.risingSign ?? null,
      natalChartGeneratedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

export async function ensureNatalChart(
  uid: string,
  profile: CosmicProfileDocument,
  locale?: Locale,
  options?: {
    force?: boolean
  }
) {
  const expanded = profile as CosmicProfileDocument & {
    natalSummary?: NatalChartData["summary"]
  }
  const cachedSunSign =
    profile.sunSign ??
    expanded.natalSummary?.sunSign ??
    ((expanded as CosmicProfileDocument & { zodiacSign?: string }).zodiacSign ?? undefined)
  const cachedPlanetCount = Array.isArray(expanded.natalSummary?.planets)
    ? expanded.natalSummary.planets.length
    : 0
  const hasUsableCachedNatal = Boolean(expanded.natalSummary && cachedSunSign && cachedPlanetCount > 0)

  if (hasUsableCachedNatal && !options?.force) {
    return {
      raw: profile.divineNatalRaw,
      summary: expanded.natalSummary,
    } as NatalChartData
  }

  await logInfo("divineapi.natal", "natal_generation_started", { uid })
  const natal = await getNatalChartFromDivineApi(profileToBirthDetails(profile), locale)
  await saveNatalToProfile(uid, natal)
  await logInfo("divineapi.natal", "natal_generation_success", { uid })

  return natal
}

export async function getCachedOrGenerateDailyGuidance(
  uid: string,
  sign: string,
  profile?: CosmicProfileDocument,
  locale?: Locale,
  options?: {
    force?: boolean
  }
): Promise<{ dateKey: string; daily: DailyHoroscopeData; cacheHit: boolean }> {
  const timezoneIana = getOptionalString(profile?.timezoneIana)
  const profileOffsetNow =
    (typeof profile?.timezoneOffsetNow === "number" && Number.isFinite(profile.timezoneOffsetNow)
      ? profile.timezoneOffsetNow
      : typeof profile?.timezone === "number" && Number.isFinite(profile.timezone)
        ? profile.timezone
        : undefined)
  const dateKey =
    buildLocalDateKeyForTimeZone(timezoneIana) ??
    (typeof profileOffsetNow === "number" ? buildLocalDateKeyForOffset(profileOffsetNow) : null) ??
    localDateKey()
  const localDateParts = timezoneIana ? getDatePartsInTimeZone(timezoneIana) : null
  const localNoonOffset =
    timezoneIana && localDateParts
      ? getOffsetHoursForTimeZoneAtLocalDateTime(timezoneIana, {
          date: `${localDateParts.year}-${String(localDateParts.month).padStart(2, "0")}-${String(localDateParts.day).padStart(2, "0")}`,
          time: "12:00",
        })
      : undefined
  const dailyReferenceDate =
    localDateParts && typeof localNoonOffset === "number"
      ? new Date(
          Date.UTC(localDateParts.year, localDateParts.month - 1, localDateParts.day, 12, 0, 0) -
            localNoonOffset * 3_600_000
        )
      : new Date()
  const ref = getDailyGuidanceRef(uid, dateKey)
  const snapshot = await ref.get()

  if (snapshot.exists && !options?.force) {
    const data = snapshot.data() ?? {}
    await logInfo("divineapi.daily", "daily_horoscope_cache_hit", { uid, sign, dateKey })

    return {
      dateKey,
      cacheHit: true,
      daily: {
        raw: data.divineHoroscopeRaw,
        date: typeof data.date === "string" ? data.date : dateKey,
        sign: typeof data.sign === "string" ? data.sign : sign,
        horoscopeData:
          typeof data.horoscopeData === "string" ? data.horoscopeData : undefined,
        categories: toRecord(data.categories) as DailyHoroscopeData["categories"],
      },
    }
  }

  const resolvedTimezone = resolveDivineTimezoneOffsetHours({
    explicitTimezone:
      profile?.timezoneOffsetNow ??
      profile?.timezone,
    timezoneIana,
    referenceDate: dailyReferenceDate,
  })

  const daily = await getDailyHoroscopeFromDivineApi({
    sign,
    date: dailyReferenceDate,
    timezone: resolvedTimezone,
    timezoneIana,
    language: locale,
  })
  await ref.set({
    sign: daily.sign ?? sign,
    date: daily.date ?? dateKey,
    horoscopeData: daily.horoscopeData ?? null,
    categories: toFirestoreData(daily.categories ?? {}),
    divineHoroscopeRaw: daily.raw,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await logInfo("divineapi.daily", "daily_horoscope_generated", { uid, sign, dateKey })

  return { dateKey, daily, cacheHit: false }
}

export async function saveCompatibilityData({
  uid,
  partner,
  compatibility,
}: {
  uid: string
  partner: BirthDetails
  compatibility: CompatibilityData
}) {
  const partnerRef = getPartnerRef(uid)

  await partnerRef.set(
    toFirestoreData({
      ...partner,
      natalSummary: compatibility.personB?.summary ?? null,
      divineNatalRaw: compatibility.personB?.raw ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  )

  const compatibilityRef = getCompatibilityReadingsCollection(uid).doc()
  await compatibilityRef.set(
    toFirestoreData({
      mode: compatibility.mode,
      partnerId: partnerRef.id,
      userNatalSummary: compatibility.personA?.summary ?? null,
      partnerNatalSummary: compatibility.personB?.summary ?? null,
      divineCompatibilityRaw: compatibility.raw ?? null,
      createdAt: FieldValue.serverTimestamp(),
    })
  )

  return {
    partnerId: partnerRef.id,
    compatibilityReadingId: compatibilityRef.id,
  }
}

export function buildAgentContext({
  uid,
  locale,
  agentType,
  message,
  profile,
  natal,
  daily,
  compatibility,
  astrologySnapshotCanonical,
  localizedAstrology,
}: {
  uid: string
  locale: Locale
  agentType: AgentType
  message: string
  profile: CosmicProfileDocument
  natal?: NatalChartData
  daily?: DailyHoroscopeData
  compatibility?: CompatibilityData
  astrologySnapshotCanonical?: Record<string, unknown>
  localizedAstrology?: {
    locale: "ro"
    segments: Record<string, string>
  }
}): AgentContext {
  const usedAstrologyData: UsedAstrologyData = {
    natal: Boolean(natal),
    daily: Boolean(daily),
    compatibility: Boolean(compatibility),
  }

  const policyId = getAgentInputPolicyId(agentType)
  const policy = getAgentInputPolicy(agentType)
  const inputCompleteness = getProfileInputCompleteness(profile, policyId)

  return {
    uid,
    locale,
    agentType,
    message,
    profile: {
      name: profile.name,
      mainFocus: profile.mainFocus,
      sexAtBirth: profile.sexAtBirth,
    },
    inputPolicy: {
      policyId,
      requiredFields: policy.requiredFields,
    },
    inputCompleteness,
    natal,
    daily,
    compatibility,
    astrologySnapshotCanonical,
    localizedAstrology,
    usedAstrologyData,
  }
}

export function firestoreDateNow() {
  return Timestamp.now()
}
