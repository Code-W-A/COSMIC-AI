import "server-only"

import { DivineApiHttpError, divinePost } from "@/lib/divineapi/client"
import { getDivineApiConfig } from "@/lib/divineapi/config"
import { getNatalChartFromDivineApi } from "@/lib/divineapi/natal"
import { normalizeNatalChartResponse } from "@/lib/divineapi/normalizers"
import { resolveDivineTimezoneOffsetHours } from "@/lib/divineapi/timezone"
import type { BirthDetails, CompatibilityData, NatalChartData } from "@/lib/divineapi/types"
import type { Locale } from "@/lib/i18n/locale"
import { logError, logInfo } from "@/lib/logging/logger"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function synastryPersonRaw(raw: unknown, key: "p1_data" | "p2_data") {
  if (!isRecord(raw) || !isRecord(raw.data)) return raw
  return Array.isArray(raw.data[key]) ? { success: 1, data: raw.data[key] } : raw
}

function buildSynastryPayload(
  userBirthDetails: BirthDetails,
  partnerBirthDetails: BirthDetails,
  language?: Locale
) {
  const config = getDivineApiConfig()
  const userTimezone = resolveDivineTimezoneOffsetHours({
    explicitTimezone: userBirthDetails.timezone,
    timezoneOffsetAtBirth: userBirthDetails.timezoneOffsetAtBirth,
    timezoneIana: userBirthDetails.timezoneIana,
    localDateTime: {
      date: userBirthDetails.birthDate,
      time: userBirthDetails.birthTime,
    },
    fallbackTimezone: config.DEFAULT_TZONE,
  })
  const partnerTimezone = resolveDivineTimezoneOffsetHours({
    explicitTimezone: partnerBirthDetails.timezone,
    timezoneOffsetAtBirth: partnerBirthDetails.timezoneOffsetAtBirth,
    timezoneIana: partnerBirthDetails.timezoneIana ?? userBirthDetails.timezoneIana,
    localDateTime: {
      date: partnerBirthDetails.birthDate,
      time: partnerBirthDetails.birthTime,
    },
    fallbackTimezone: userTimezone ?? config.DEFAULT_TZONE,
  })

  const [p1Year = "", p1Month = "", p1Day = ""] = userBirthDetails.birthDate.split("-")
  const [p1Hour = "0", p1Min = "0"] = userBirthDetails.birthTime.split(":")
  const [p2Year = "", p2Month = "", p2Day = ""] = partnerBirthDetails.birthDate.split("-")
  const [p2Hour = "0", p2Min = "0"] = partnerBirthDetails.birthTime.split(":")

  return {
    p1_name: userBirthDetails.name,
    p1_full_name: userBirthDetails.name,
    p1_year: p1Year,
    p1_month: p1Month,
    p1_day: p1Day,
    p1_hour: p1Hour,
    p1_min: p1Min,
    p1_sec: "0",
    p1_gender: userBirthDetails.sexAtBirth,
    p1_place: userBirthDetails.birthPlace,
    p1_lat: userBirthDetails.latitude,
    p1_lon: userBirthDetails.longitude,
    p1_tzone: String(userTimezone ?? config.DEFAULT_TZONE),
    p2_name: partnerBirthDetails.name,
    p2_full_name: partnerBirthDetails.name,
    p2_year: p2Year,
    p2_month: p2Month,
    p2_day: p2Day,
    p2_hour: p2Hour,
    p2_min: p2Min,
    p2_sec: "0",
    p2_gender: partnerBirthDetails.sexAtBirth,
    p2_place: partnerBirthDetails.birthPlace,
    p2_lat: partnerBirthDetails.latitude,
    p2_lon: partnerBirthDetails.longitude,
    p2_tzone: String(partnerTimezone ?? config.DEFAULT_TZONE),
    lan: language ?? config.DEFAULT_LANGUAGE,
    house_system: config.DEFAULT_HOUSE_SYSTEM,
    zodiac: config.DEFAULT_ZODIAC,
  }
}

export async function getCompatibilityData({
  userNatal,
  partnerBirthDetails,
  userBirthDetails,
  language,
}: {
  userNatal: NatalChartData
  partnerBirthDetails: BirthDetails
  userBirthDetails: BirthDetails
  language?: Locale
}): Promise<CompatibilityData> {
  const config = getDivineApiConfig()

  if (config.SYNASTRY_PATH) {
    await logInfo("divineapi.synastry", "divineapi_synastry_request_started", {
      hasUserName: Boolean(userBirthDetails.name),
      hasPartnerName: Boolean(partnerBirthDetails.name),
      userBirthDate: userBirthDetails.birthDate,
      partnerBirthDate: partnerBirthDetails.birthDate,
      hasUserCoordinates:
        typeof userBirthDetails.latitude === "number" &&
        typeof userBirthDetails.longitude === "number",
      hasPartnerCoordinates:
        typeof partnerBirthDetails.latitude === "number" &&
        typeof partnerBirthDetails.longitude === "number",
      pathCandidates: config.SYNASTRY_PATH_CANDIDATES,
    })

    try {
      const payload = buildSynastryPayload(userBirthDetails, partnerBirthDetails, language)

      for (let index = 0; index < config.SYNASTRY_PATH_CANDIDATES.length; index += 1) {
        const path = config.SYNASTRY_PATH_CANDIDATES[index]

        try {
          const raw = await divinePost<unknown>({
            product: "western",
            path,
            body: payload,
            includeApiKeyInBody: true,
          })

          await logInfo("divineapi.synastry", "divineapi_synastry_request_success", {
            path,
          })

          return {
            raw,
            mode: "synastry_api",
            personA: userNatal,
            personB: normalizeNatalChartResponse(synastryPersonRaw(raw, "p2_data")),
          }
        } catch (error) {
          const isLast = index === config.SYNASTRY_PATH_CANDIDATES.length - 1
          const shouldTryNext =
            error instanceof DivineApiHttpError &&
            (error.status === 404 ||
              error.status === 405 ||
              (typeof error.divineSuccess === "number" && error.divineSuccess !== 1))

          if (!isLast && shouldTryNext) {
            await logInfo("divineapi.synastry", "divineapi_synastry_path_fallback", {
              failedPath: path,
              status: error.status,
              divineSuccess:
                error instanceof DivineApiHttpError ? error.divineSuccess ?? null : null,
              divineMessage:
                error instanceof DivineApiHttpError ? error.divineMessage ?? null : null,
              nextPath: config.SYNASTRY_PATH_CANDIDATES[index + 1],
            })
            continue
          }

          throw error
        }
      }

      throw new Error("Unable to fetch astrology data right now.")
    } catch (error) {
      await logError("divineapi.synastry", "divineapi_synastry_request_failed_fallback_used", {
        userBirthDate: userBirthDetails.birthDate,
        partnerBirthDate: partnerBirthDetails.birthDate,
        error,
      })
    }
  }

  const partnerNatal = await getNatalChartFromDivineApi(partnerBirthDetails, language)

  return {
    mode: "dual_natal_interpretation",
    personA: userNatal,
    personB: partnerNatal,
  }
}
