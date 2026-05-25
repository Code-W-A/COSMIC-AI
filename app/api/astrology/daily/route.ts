import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import {
  getCachedOrGenerateDailyGuidance,
  getProfileSunSign,
} from "@/lib/agents/context"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getCosmicProfile } from "@/lib/firebase/firestore"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { logError, logInfo } from "@/lib/logging/logger"
import { ensureProfileBirthLocationForDivine } from "@/lib/location/profile-location"
import { LocationResolverError } from "@/lib/location/resolver"
import { DivineApiHttpError } from "@/lib/divineapi/client"
import { getProfileInputCompleteness } from "@/lib/profile/input-policy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const locale = getRequestLocale(request)
  const user = await requireUser(request)
  const { searchParams } = new URL(request.url)
  const force = searchParams.get("force") === "1"
  const source = searchParams.get("source") ?? "unknown"

  if (isAuthResponse(user)) return user

  try {
    const profile = await getCosmicProfile(user.uid)

    if (!profile) {
      return errorResponse(
        "cosmic_profile_missing",
        "Please complete your cosmic profile first.",
        400
      )
    }
    const profileCompleteness = getProfileInputCompleteness(profile, "astrology_natal")
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
      source: "api.astrology.daily",
    })

    const sign = getProfileSunSign(profileWithLocation)

    if (!sign) {
      return errorResponse(
        "natal_chart_required",
        "Please generate your natal chart first.",
        400
      )
    }

    await logInfo("divineapi.daily", "divine.daily_generate_started", {
      uid: user.uid,
      force,
      source,
      sign,
      hasCoordinates:
        typeof profileWithLocation.latitude === "number" &&
        typeof profileWithLocation.longitude === "number",
      hasTimezoneIana: Boolean(profileWithLocation.timezoneIana),
    })

    const { daily, dateKey, cacheHit } = await getCachedOrGenerateDailyGuidance(
      user.uid,
      sign,
      profileWithLocation,
      locale,
      { force }
    )

    await logInfo("divineapi.daily", "divine.daily_generate_completed", {
      uid: user.uid,
      force,
      source,
      sign,
      cacheHit,
    })

    return successResponse({
      data: {
        sign: daily.sign ?? sign,
        date: daily.date ?? dateKey,
        horoscopeData: daily.horoscopeData,
        categories: daily.categories,
        cacheHit,
      },
    })
  } catch (error) {
    await logError("divineapi.daily", "daily_horoscope_failed", {
      uid: user.uid,
      force,
      source,
      error,
    })

    if (error instanceof LocationResolverError) {
      return errorResponse(
        error.code,
        error.message,
        error.code === "birth_location_unresolved" ? 400 : 502
      )
    }

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

    return errorResponse(
      "daily_horoscope_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to generate daily guidance."
        : getErrorMessage(error),
      500
    )
  }
}
