import { FieldValue } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import {
  ensureNatalChart,
  getCachedOrGenerateDailyGuidance,
  getProfileSunSign,
} from "@/lib/agents/context"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { DivineApiHttpError } from "@/lib/divineapi/client"
import { toNatalRevealPayload } from "@/lib/divineapi/natal-overview"
import { getCosmicProfile, getCosmicProfileRef, getDailyGuidanceRef } from "@/lib/firebase/firestore"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { logError, logInfo } from "@/lib/logging/logger"
import { ensureProfileBirthLocationForDivine } from "@/lib/location/profile-location"
import { LocationResolverError } from "@/lib/location/resolver"
import { getProfileInputCompleteness } from "@/lib/profile/input-policy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function useE2EMocks() {
  return process.env.E2E_MOCK_EXTERNALS === "1"
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  const locale = getRequestLocale(request)
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  let source: string | null = null
  let force = false
  try {
    const body = (await request.json()) as { source?: unknown; force?: unknown }
    source = typeof body?.source === "string" ? body.source : null
    force = body?.force === true
  } catch {
    source = null
    force = false
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

    if (useE2EMocks()) {
      const hadNatal = Boolean((profile as { natalSummary?: unknown }).natalSummary)
      const dateKey = todayKey()
      const profileRef = getCosmicProfileRef(user.uid)
      const dailyRef = getDailyGuidanceRef(user.uid, dateKey)
      const dailySnapshot = await dailyRef.get()
      const sign = getProfileSunSign(profileWithLocation) || "Gemini"
      const mockSummary = {
        sunSign: sign,
        moonSign: "Virgo",
        risingSign: "Libra",
        planets: [{ name: "Sun", sign, house: "10", degree: "12.5°" }],
        houses: [{ house: "1", sign: "Libra" }],
        aspects: [{ aspect: "Trine", between: "Sun-Moon" }],
        chartImageSvg:
          "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><rect width='320' height='320' fill='#100a23'/><circle cx='160' cy='160' r='120' stroke='#8B5CFF' stroke-width='2' fill='none'/><text x='160' y='170' text-anchor='middle' fill='#F5F2FF' font-size='20'>E2E Chart</text></svg>",
      }

      await profileRef.set(
        {
          divineNatalRaw: { mocked: true, source: "e2e" },
          natalSummary: mockSummary,
          sunSign: mockSummary.sunSign,
          moonSign: mockSummary.moonSign,
          risingSign: mockSummary.risingSign,
          natalChartGeneratedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      await dailyRef.set(
        {
          sign,
          date: dateKey,
          horoscopeData: "Mock daily guidance for generate-all E2E flow.",
          categories: {
            travel: "Plan ahead.",
            emotions: "Stay calm.",
            health: "Keep balance.",
            career: "Prioritize deep work.",
          },
          divineHoroscopeRaw: { mocked: true, source: "e2e" },
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      const generated = {
        natal: force || !hadNatal,
        daily: force || !dailySnapshot.exists,
      }
      const cached = {
        natal: hadNatal && !force,
        daily: dailySnapshot.exists && !force,
      }

      return successResponse({
        generated,
        cached,
        natal: toNatalRevealPayload(mockSummary),
        compatibilitySupported: false,
        compatibilityReason:
          "Compatibility generation requires partner birth details and is not included in generate-all.",
      })
    }

    await logInfo("divineapi", "divine.generate_all_started", {
      uid: user.uid,
      source: source ?? "unknown",
      force,
      hasCoordinates:
        typeof profileWithLocation.latitude === "number" &&
        typeof profileWithLocation.longitude === "number",
      hasTimezoneIana: Boolean(profileWithLocation.timezoneIana),
    })

    const hadNatal = Boolean((profile as { natalSummary?: unknown }).natalSummary)
    const natal = await ensureNatalChart(user.uid, profileWithLocation, locale, { force })
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
      locale,
      { force }
    )

    const generated = {
      natal: force || !hadNatal,
      daily: force || !cacheHit,
    }
    const cached = {
      natal: hadNatal && !force,
      daily: cacheHit && !force,
    }

    await logInfo("divineapi", "divine.generate_all_completed", {
      uid: user.uid,
      generated,
      cached,
      source: source ?? "unknown",
      force,
    })

    return successResponse({
      generated,
      cached,
      natal: toNatalRevealPayload(natal.summary as unknown as Record<string, unknown>),
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
