import { Timestamp } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import type { DailyHoroscopeData } from "@/lib/divineapi/types"
import { getLocalizedDailyHoroscope } from "@/lib/divineapi/localization"
import {
  getCompatibilityReadingsCollection,
  getCosmicProfile,
  getDailyGuidanceCollection,
  getPartnerRef,
} from "@/lib/firebase/firestore"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { logError, logInfo } from "@/lib/logging/logger"
import { isNatalReady } from "@/lib/divineapi/natal-overview"
import { getProfileInputCompleteness } from "@/lib/profile/input-policy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const INCLUDE_RAW_DIVINE = process.env.NODE_ENV !== "production"

function toDateIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  return null
}

function toRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function toDailyHoroscopeData(
  latestDaily: Record<string, unknown> | null,
  dateFallback: string | null
): DailyHoroscopeData | null {
  if (!latestDaily) return null

  const horoscopeData =
    typeof latestDaily.horoscopeData === "string" ? latestDaily.horoscopeData : undefined
  if (!horoscopeData) return null

  return {
    raw: latestDaily.divineHoroscopeRaw ?? null,
    date:
      typeof latestDaily.date === "string"
        ? latestDaily.date
        : dateFallback ?? undefined,
    sign: typeof latestDaily.sign === "string" ? latestDaily.sign : undefined,
    horoscopeData,
    categories: (toRecord(latestDaily.categories) ?? undefined) as DailyHoroscopeData["categories"],
  }
}

export async function GET(request: Request) {
  const locale = getRequestLocale(request)
  const user = await requireUser(request)
  if (isAuthResponse(user)) return user

  try {
    const profile = await getCosmicProfile(user.uid)

    if (!profile) {
      return successResponse({
        profileExists: false,
        profileComplete: false,
        natal: { generated: false },
        daily: { generated: false },
        synastry: { generated: false },
      })
    }

    const profileComplete = getProfileInputCompleteness(profile, "astrology_natal").isComplete
    const natalSummary = (profile.natalSummary ?? null) as Record<string, unknown> | null

    const latestDailySnapshot = await getDailyGuidanceCollection(user.uid)
      .orderBy("updatedAt", "desc")
      .limit(1)
      .get()
    const latestDaily = latestDailySnapshot.docs[0]?.data() ?? null
    const dailyDate =
      latestDaily && typeof latestDaily.date === "string" ? latestDaily.date : null
    const dailySource = toDailyHoroscopeData(latestDaily, dailyDate)
    const localizedDaily = dailySource
      ? await getLocalizedDailyHoroscope(user.uid, dailySource, locale)
      : null

    const latestCompatibilitySnapshot = await getCompatibilityReadingsCollection(user.uid)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get()
    const latestCompatibilityDoc = latestCompatibilitySnapshot.docs[0]
    const latestCompatibility = latestCompatibilityDoc?.data() ?? null

    let latestPartner: Record<string, unknown> | null = null
    const latestPartnerId =
      latestCompatibility && typeof latestCompatibility.partnerId === "string"
        ? latestCompatibility.partnerId
        : null
    if (latestPartnerId) {
      const partnerSnapshot = await getPartnerRef(user.uid, latestPartnerId).get()
      if (partnerSnapshot.exists) {
        latestPartner = {
          id: partnerSnapshot.id,
          ...partnerSnapshot.data(),
        }
      }
    }

    const payload = {
      profileExists: true,
      profileComplete,
      natal: {
        generated: isNatalReady(profile),
        generatedAt: toDateIso(profile.natalChartGeneratedAt),
        summary: natalSummary,
        raw: INCLUDE_RAW_DIVINE ? toRecord(profile.divineNatalRaw) : null,
      },
      daily: {
        generated: Boolean(latestDaily),
        generatedAt: latestDaily ? toDateIso(latestDaily.updatedAt) : null,
        date: localizedDaily?.date ?? dailyDate,
        sign: localizedDaily?.sign ?? (latestDaily && typeof latestDaily.sign === "string" ? latestDaily.sign : null),
        horoscopeData: localizedDaily?.horoscopeData ?? null,
        categories: localizedDaily?.categories ? toRecord(localizedDaily.categories) : null,
        raw: INCLUDE_RAW_DIVINE && latestDaily ? toRecord(latestDaily.divineHoroscopeRaw) : null,
      },
      synastry: {
        generated: Boolean(latestCompatibility),
        generatedAt: latestCompatibility ? toDateIso(latestCompatibility.createdAt) : null,
        mode:
          latestCompatibility && typeof latestCompatibility.mode === "string"
            ? latestCompatibility.mode
            : null,
        summary: latestCompatibility ? toRecord(latestCompatibility.summary) : null,
        raw:
          INCLUDE_RAW_DIVINE && latestCompatibility
            ? toRecord(latestCompatibility.divineCompatibilityRaw)
            : null,
        partner: latestPartner
          ? {
              id: String(latestPartner.id),
              name:
                typeof latestPartner.name === "string" && latestPartner.name.trim()
                  ? latestPartner.name
                  : null,
              birthDate:
                typeof latestPartner.birthDate === "string" ? latestPartner.birthDate : null,
              birthTime:
                typeof latestPartner.birthTime === "string" ? latestPartner.birthTime : null,
              birthPlace:
                typeof latestPartner.birthPlace === "string" ? latestPartner.birthPlace : null,
              sexAtBirth:
                latestPartner.sexAtBirth === "male" || latestPartner.sexAtBirth === "female"
                  ? latestPartner.sexAtBirth
                  : null,
              natalSummary: toRecord(latestPartner.natalSummary),
            }
          : null,
      },
    }

    await logInfo("divineapi", "divine_overview_loaded", {
      uid: user.uid,
      profileComplete,
      hasNatal: payload.natal.generated,
      hasDaily: payload.daily.generated,
      hasSynastry: payload.synastry.generated,
      hasPartner: Boolean(payload.synastry.partner),
    })

    return successResponse(payload)
  } catch (error) {
    await logError("divineapi", "divine_overview_failed", {
      uid: user.uid,
      error,
    })
    return errorResponse(
      "divine_overview_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to load Divine data overview."
        : getErrorMessage(error),
      500
    )
  }
}
