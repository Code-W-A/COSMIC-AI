import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import {
  getCachedOrGenerateDailyGuidance,
  getProfileSunSign,
} from "@/lib/agents/context"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getCosmicProfile } from "@/lib/firebase/firestore"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { logError } from "@/lib/logging/logger"
import { DivineApiHttpError } from "@/lib/divineapi/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
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

    const sign = getProfileSunSign(profile)

    if (!sign) {
      return errorResponse(
        "natal_chart_required",
        "Please generate your natal chart first.",
        400
      )
    }

    const { daily, dateKey, cacheHit } = await getCachedOrGenerateDailyGuidance(
      user.uid,
      sign,
      profile,
      locale
    )

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
      "daily_horoscope_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to generate daily guidance."
        : getErrorMessage(error),
      500
    )
  }
}
