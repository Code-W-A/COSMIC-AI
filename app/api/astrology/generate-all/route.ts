import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import {
  ensureNatalChart,
  getCachedOrGenerateDailyGuidance,
  getProfileSunSign,
} from "@/lib/agents/context"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { DivineApiHttpError } from "@/lib/divineapi/client"
import { getCosmicProfile } from "@/lib/firebase/firestore"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { logError, logInfo } from "@/lib/logging/logger"
import { ensureProfileBirthLocationForDivine } from "@/lib/location/profile-location"
import { LocationResolverError } from "@/lib/location/resolver"
import { getProfileInputCompleteness } from "@/lib/profile/input-policy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const locale = getRequestLocale(request)
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  let source: string | null = null
  try {
    const body = (await request.json()) as { source?: unknown }
    source = typeof body?.source === "string" ? body.source : null
  } catch {
    source = null
  }

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
      source: "api.astrology.generate_all",
    })

    if (source === "chat_cta") {
      await logInfo("chat", "chat.cta_generate_clicked", {
        uid: user.uid,
      })
    }

    await logInfo("divineapi", "divine.generate_all_started", {
      uid: user.uid,
      source: source ?? "unknown",
      hasCoordinates:
        typeof profileWithLocation.latitude === "number" &&
        typeof profileWithLocation.longitude === "number",
      hasTimezoneIana: Boolean(profileWithLocation.timezoneIana),
    })

    const hadNatal = Boolean((profile as { natalSummary?: unknown }).natalSummary)
    const natal = await ensureNatalChart(user.uid, profileWithLocation, locale)
    const sign = natal.summary.sunSign ?? getProfileSunSign(profileWithLocation)

    if (!sign) {
      return errorResponse(
        "natal_chart_missing_sun_sign",
        "Please generate your natal chart first.",
        400
      )
    }

    const { cacheHit } = await getCachedOrGenerateDailyGuidance(
      user.uid,
      sign,
      profileWithLocation,
      locale
    )

    const generated = {
      natal: !hadNatal,
      daily: !cacheHit,
    }
    const cached = {
      natal: hadNatal,
      daily: cacheHit,
    }

    await logInfo("divineapi", "divine.generate_all_completed", {
      uid: user.uid,
      generated,
      cached,
      source: source ?? "unknown",
    })

    return successResponse({
      generated,
      cached,
      compatibilitySupported: false,
      compatibilityReason:
        "Compatibility generation requires partner birth details and is not included in generate-all.",
    })
  } catch (error) {
    await logError("divineapi", "divine.generate_all_failed", {
      uid: user.uid,
      source: source ?? "unknown",
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
      "divine_generate_all_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to generate astrology data."
        : getErrorMessage(error),
      500
    )
  }
}
