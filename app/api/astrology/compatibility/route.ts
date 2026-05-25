import { FieldValue } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import {
  ensureNatalChart,
  parsePartnerBirthDetails,
  profileToBirthDetails,
} from "@/lib/agents/context"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getCompatibilityData } from "@/lib/divineapi/compatibility"
import {
  getCompatibilityReadingsCollection,
  getCosmicProfile,
  getPartnerRef,
} from "@/lib/firebase/firestore"
import { toFirestoreData } from "@/lib/firebase/sanitize"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { logError, logInfo } from "@/lib/logging/logger"
import { DivineApiHttpError } from "@/lib/divineapi/client"
import {
  buildBirthLocationPatch,
  ensureProfileBirthLocationForDivine,
  getResolvedBirthLocationFromSource,
} from "@/lib/location/profile-location"
import { LocationResolverError, resolveBirthLocation } from "@/lib/location/resolver"
import {
  getPartnerInputCompleteness,
  getProfileInputCompleteness,
} from "@/lib/profile/input-policy"
import type { BirthDetails } from "@/lib/divineapi/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const locale = getRequestLocale(request)
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return errorResponse("invalid_json", "Request body must be valid JSON.", 400)
  }

  const partnerId = typeof body.partnerId === "string" && body.partnerId.trim() ? body.partnerId.trim() : null
  const savePartner = body.savePartner !== false
  const source = typeof body.source === "string" ? body.source : "unknown"

  try {
    const profile = await getCosmicProfile(user.uid)

    if (!profile) {
      return errorResponse(
        "cosmic_profile_missing",
        "Please complete your cosmic profile first.",
        400
      )
    }
    const profileCompleteness = getProfileInputCompleteness(profile, "astrology_compatibility")
    if (!profileCompleteness.isComplete) {
      return errorResponse(
        "profile_incomplete",
        "Your profile is incomplete for this analysis. Please complete your birth details first.",
        400
      )
    }

    const profileWithLocation = await ensureProfileBirthLocationForDivine({
      uid: user.uid,
      profile,
      locale,
      source: "api.astrology.compatibility",
    })

    let partner: BirthDetails | null = null

    if (partnerId) {
      const partnerSnapshot = await getPartnerRef(user.uid, partnerId).get()
      if (!partnerSnapshot.exists) {
        return errorResponse(
          "compatibility_partner_incomplete",
          "Partner birth date, birth time, birth place, and sex at birth are required.",
          400
        )
      }
      partner = parsePartnerBirthDetails(partnerSnapshot.data())
      if (!partner) {
        return errorResponse(
          "compatibility_partner_incomplete",
          "Partner birth date, birth time, birth place, and sex at birth are required.",
          400
        )
      }

      const savedPartnerData = partnerSnapshot.data() as Record<string, unknown>
      const savedResolvedLocation = getResolvedBirthLocationFromSource(savedPartnerData)
      const resolvedLocation =
        savedResolvedLocation ??
        (await resolveBirthLocation({
          placeId:
            typeof savedPartnerData.birthPlacePlaceId === "string"
              ? savedPartnerData.birthPlacePlaceId
              : undefined,
          birthPlace: partner.birthPlace,
          birthDate: partner.birthDate,
          birthTime: partner.birthTime,
          locale,
          uid: user.uid,
          source: "api.astrology.compatibility.saved_partner",
        }))

      if (!savedResolvedLocation) {
        await getPartnerRef(user.uid, partnerId).set(
          toFirestoreData({
            ...buildBirthLocationPatch(resolvedLocation),
            updatedAt: FieldValue.serverTimestamp(),
          }),
          { merge: true }
        )
      }

      partner = {
        ...partner,
        birthPlace: resolvedLocation.birthPlace,
        birthPlacePlaceId: resolvedLocation.placeId,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
        timezoneIana: resolvedLocation.timezoneIana,
        timezoneOffsetAtBirth: resolvedLocation.timezoneOffsetAtBirth,
        timezone: resolvedLocation.timezoneOffsetAtBirth,
      }
    } else {
      const partnerCompleteness = getPartnerInputCompleteness(
        body.partner as {
          birthDate?: string
          birthTime?: string
          birthPlace?: string
          sexAtBirth?: string
        } | null,
        "astrology_compatibility"
      )
      if (!partnerCompleteness.isComplete) {
        return errorResponse(
          "compatibility_partner_incomplete",
          "Partner birth date, birth time, birth place, and sex at birth are required.",
          400
        )
      }
      partner = parsePartnerBirthDetails(body.partner)
      if (!partner) {
        return errorResponse(
          "compatibility_partner_incomplete",
          "Partner birth date, birth time, birth place, and sex at birth are required.",
          400
        )
      }

      const partnerBody =
        body.partner && typeof body.partner === "object"
          ? (body.partner as Record<string, unknown>)
          : {}
      const providedResolvedLocation = getResolvedBirthLocationFromSource(partnerBody)
      const resolvedLocation =
        providedResolvedLocation ??
        (await resolveBirthLocation({
          placeId:
            typeof partnerBody.birthPlacePlaceId === "string"
              ? partnerBody.birthPlacePlaceId
              : undefined,
          birthPlace: partner.birthPlace,
          birthDate: partner.birthDate,
          birthTime: partner.birthTime,
          locale,
          uid: user.uid,
          source: "api.astrology.compatibility.partner_input",
        }))

      partner = {
        ...partner,
        birthPlace: resolvedLocation.birthPlace,
        birthPlacePlaceId: resolvedLocation.placeId,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
        timezoneIana: resolvedLocation.timezoneIana,
        timezoneOffsetAtBirth: resolvedLocation.timezoneOffsetAtBirth,
        timezone: resolvedLocation.timezoneOffsetAtBirth,
      }
    }

    await logInfo("divineapi.synastry", "divine.compatibility_generate_started", {
      uid: user.uid,
      source,
      savePartner,
      partnerId: partnerId ?? null,
    })

    const userNatal = await ensureNatalChart(user.uid, profileWithLocation, locale)
    const compatibility = await getCompatibilityData({
      userNatal,
      partnerBirthDetails: partner,
      userBirthDetails: profileToBirthDetails(profileWithLocation),
      language: locale,
    })
    const compatibilityRef = getCompatibilityReadingsCollection(user.uid).doc()

    const resolvedPartnerRef =
      savePartner || partnerId ? getPartnerRef(user.uid, partnerId ?? undefined) : null

    if (resolvedPartnerRef) {
      await resolvedPartnerRef.set(
        toFirestoreData({
          ...partner,
          natalSummary: compatibility.personB?.summary ?? null,
          divineNatalRaw: compatibility.personB?.raw ?? null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true }
      )
    }

    await compatibilityRef.set(
      toFirestoreData({
        mode: compatibility.mode,
        partnerId: resolvedPartnerRef?.id ?? null,
        userNatalSummary: compatibility.personA?.summary ?? null,
        partnerNatalSummary: compatibility.personB?.summary ?? null,
        summary: compatibility.summary ?? null,
        divineCompatibilityRaw: compatibility.raw ?? null,
        createdAt: FieldValue.serverTimestamp(),
      })
    )

    await logInfo("divineapi.synastry", "divine.compatibility_generate_completed", {
      uid: user.uid,
      source,
      savePartner,
      partnerId: resolvedPartnerRef?.id ?? null,
      compatibilityReadingId: compatibilityRef.id,
    })

    return successResponse({
      data: {
        partnerId: resolvedPartnerRef?.id ?? null,
        compatibilityReadingId: compatibilityRef.id,
        mode: compatibility.mode,
        userNatalSummary: compatibility.personA?.summary,
        partnerNatalSummary: compatibility.personB?.summary,
        summary: compatibility.summary,
      },
    })
  } catch (error) {
    await logError("divineapi.synastry", "compatibility_generation_failed", {
      uid: user.uid,
      source,
      savePartner,
      partnerId,
      error,
    })

    if (error instanceof DivineApiHttpError) {
      const code =
        error.status === 401
          ? "divineapi_unauthorized"
          : error.status === 403
            ? "divineapi_forbidden"
            : "divineapi_unavailable"
      const message =
        code === "divineapi_unauthorized"
          ? "Astrology provider authentication failed."
          : code === "divineapi_forbidden"
            ? "Astrology provider access was forbidden."
            : "Astrology provider is unavailable right now."

      return errorResponse(code, message, 502)
    }

    if (error instanceof LocationResolverError) {
      return errorResponse(
        error.code,
        error.message,
        error.code === "birth_location_unresolved" ? 400 : 502
      )
    }

    return errorResponse(
      "compatibility_generation_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to generate compatibility data."
        : getErrorMessage(error),
      500
    )
  }
}
