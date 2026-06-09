import { FieldValue } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { ensureNatalChart } from "@/lib/agents/context"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getCosmicProfile, getCosmicProfileRef } from "@/lib/firebase/firestore"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { logError, logInfo } from "@/lib/logging/logger"
import { ensureProfileBirthLocationForDivine } from "@/lib/location/profile-location"
import { LocationResolverError } from "@/lib/location/resolver"
import { DivineApiHttpError } from "@/lib/divineapi/client"
import { getProfileInputCompleteness } from "@/lib/profile/input-policy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function useE2EMocks() {
  return process.env.E2E_MOCK_EXTERNALS === "1"
}

function getMockNatalSummary() {
  return {
    sunSign: "Gemini",
    moonSign: "Virgo",
    risingSign: "Libra",
    planets: [{ name: "Sun", sign: "Gemini", house: "10", degree: "12.5°" }],
    houses: [{ house: "1", sign: "Libra" }],
    aspects: [{ aspect: "Trine", between: "Sun-Moon" }],
    chartImageSvg:
      "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><rect width='320' height='320' fill='#100a23'/><circle cx='160' cy='160' r='120' stroke='#8B5CFF' stroke-width='2' fill='none'/><text x='160' y='170' text-anchor='middle' fill='#F5F2FF' font-size='20'>E2E Chart</text></svg>",
  }
}

export async function POST(request: Request) {
  const locale = getRequestLocale(request)
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  let force = false
  let source = "unknown"
  try {
    const body = (await request.json()) as { force?: unknown; source?: unknown }
    force = body?.force === true
    source = typeof body?.source === "string" ? body.source : "unknown"
  } catch {
    force = false
    source = "unknown"
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
      source: "api.astrology.natal",
    })

    if (useE2EMocks()) {
      const summary = getMockNatalSummary()
      await getCosmicProfileRef(user.uid).set(
        {
          divineNatalRaw: { mocked: true, source: "e2e" },
          natalSummary: summary,
          sunSign: summary.sunSign,
          moonSign: summary.moonSign,
          risingSign: summary.risingSign,
          natalChartGeneratedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      return successResponse({
        data: {
          generated: true,
          force,
          sunSign: summary.sunSign,
          moonSign: summary.moonSign,
          risingSign: summary.risingSign,
          planets: summary.planets,
          houses: summary.houses,
          aspects: summary.aspects,
          chartImageSvg: summary.chartImageSvg,
          chartImageBase64: null,
        },
      })
    }

    await logInfo("divineapi.natal", "divine.natal_generate_started", {
      uid: user.uid,
      force,
      source,
      hasCoordinates:
        typeof profileWithLocation.latitude === "number" &&
        typeof profileWithLocation.longitude === "number",
      hasTimezoneIana: Boolean(profileWithLocation.timezoneIana),
    })

    const hadNatal = Boolean((profile as { natalSummary?: unknown }).natalSummary)
    const natal = await ensureNatalChart(user.uid, profileWithLocation, locale, { force })

    await logInfo("divineapi.natal", "divine.natal_generate_completed", {
      uid: user.uid,
      force,
      source,
      generated: force || !hadNatal,
    })

    return successResponse({
      data: {
        generated: force || !hadNatal,
        force,
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
      "natal_generation_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to generate your natal chart."
        : getErrorMessage(error),
      500
    )
  }
}
