import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { ensureNatalChart } from "@/lib/agents/context"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getCosmicProfile } from "@/lib/firebase/firestore"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { logError } from "@/lib/logging/logger"
import { DivineApiHttpError } from "@/lib/divineapi/client"
import { getProfileInputCompleteness } from "@/lib/profile/input-policy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const locale = getRequestLocale(request)
  const user = await requireUser(request)

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

    const natal = await ensureNatalChart(user.uid, profile, locale)

    return successResponse({
      data: {
        sunSign: natal.summary.sunSign,
        moonSign: natal.summary.moonSign,
        risingSign: natal.summary.risingSign,
        planets: natal.summary.planets ?? [],
        houses: natal.summary.houses ?? [],
        aspects: natal.summary.aspects ?? [],
        chartImageSvg: natal.summary.chartImageSvg,
        chartImageBase64: natal.summary.chartImageBase64,
      },
    })
  } catch (error) {
    await logError("divineapi.natal", "natal_generation_failed", {
      uid: user.uid,
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

    return errorResponse(
      "natal_generation_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to generate your natal chart."
        : getErrorMessage(error),
      500
    )
  }
}
