import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import {
  ensureNatalChart,
  parsePartnerBirthDetails,
  profileToBirthDetails,
  saveCompatibilityData,
} from "@/lib/agents/context"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getCompatibilityData } from "@/lib/divineapi/compatibility"
import { getCosmicProfile } from "@/lib/firebase/firestore"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { logError } from "@/lib/logging/logger"
import { DivineApiHttpError } from "@/lib/divineapi/client"
import {
  getPartnerInputCompleteness,
  getProfileInputCompleteness,
} from "@/lib/profile/input-policy"

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
  const partner = parsePartnerBirthDetails(body.partner)
  if (!partner) {
    return errorResponse(
      "compatibility_partner_incomplete",
      "Partner birth date, birth time, birth place, and sex at birth are required.",
      400
    )
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
    const profileCompleteness = getProfileInputCompleteness(profile, "astrology_compatibility")
    if (!profileCompleteness.isComplete) {
      return errorResponse(
        "profile_incomplete",
        "Your profile is incomplete for this analysis. Please complete your birth details first.",
        400
      )
    }

    const userNatal = await ensureNatalChart(user.uid, profile, locale)
    const compatibility = await getCompatibilityData({
      userNatal,
      partnerBirthDetails: partner,
      userBirthDetails: profileToBirthDetails(profile),
      language: locale,
    })
    const saved = await saveCompatibilityData({
      uid: user.uid,
      partner,
      compatibility,
    })

    return successResponse({
      data: {
        ...saved,
        mode: compatibility.mode,
        userNatalSummary: compatibility.personA?.summary,
        partnerNatalSummary: compatibility.personB?.summary,
        summary: compatibility.summary,
      },
    })
  } catch (error) {
    await logError("divineapi.synastry", "compatibility_generation_failed", {
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
      "compatibility_generation_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to generate compatibility data."
        : getErrorMessage(error),
      500
    )
  }
}
