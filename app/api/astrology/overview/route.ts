import { Timestamp } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import {
  getCompatibilityReadingsCollection,
  getCosmicProfile,
  getDailyGuidanceCollection,
  getPartnerRef,
} from "@/lib/firebase/firestore"
import { logError, logInfo } from "@/lib/logging/logger"
import { getProfileInputCompleteness } from "@/lib/profile/input-policy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function toDateIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  return null
}

function toRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export async function GET(request: Request) {
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
        generated: Boolean(natalSummary),
        generatedAt: toDateIso(profile.natalChartGeneratedAt),
        summary: natalSummary,
        raw: toRecord(profile.divineNatalRaw),
      },
      daily: {
        generated: Boolean(latestDaily),
        generatedAt: latestDaily ? toDateIso(latestDaily.updatedAt) : null,
        date: latestDaily && typeof latestDaily.date === "string" ? latestDaily.date : null,
        sign: latestDaily && typeof latestDaily.sign === "string" ? latestDaily.sign : null,
        horoscopeData:
          latestDaily && typeof latestDaily.horoscopeData === "string"
            ? latestDaily.horoscopeData
            : null,
        categories: latestDaily ? toRecord(latestDaily.categories) : null,
        raw: latestDaily ? toRecord(latestDaily.divineHoroscopeRaw) : null,
      },
      synastry: {
        generated: Boolean(latestCompatibility),
        generatedAt: latestCompatibility ? toDateIso(latestCompatibility.createdAt) : null,
        mode:
          latestCompatibility && typeof latestCompatibility.mode === "string"
            ? latestCompatibility.mode
            : null,
        summary: latestCompatibility ? toRecord(latestCompatibility.summary) : null,
        raw: latestCompatibility ? toRecord(latestCompatibility.divineCompatibilityRaw) : null,
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
