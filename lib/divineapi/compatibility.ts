import "server-only"

import { divinePost } from "@/lib/divineapi/client"
import { getDivineApiConfig } from "@/lib/divineapi/config"
import { getNatalChartFromDivineApi } from "@/lib/divineapi/natal"
import { normalizeNatalChartResponse } from "@/lib/divineapi/normalizers"
import { resolveDivineTimezoneOffsetHours } from "@/lib/divineapi/timezone"
import type { BirthDetails, CompatibilityData, NatalChartData } from "@/lib/divineapi/types"
import type { Locale } from "@/lib/i18n/locale"
import { logError, logInfo } from "@/lib/logging/logger"

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

  // TODO: Confirm exact DivineAPI synastry endpoint and payload from dashboard/Postman collection.
  return {
    person1: {
      name: userBirthDetails.name,
      date: userBirthDetails.birthDate,
      time: userBirthDetails.birthTime,
      place: userBirthDetails.birthPlace,
      lat: userBirthDetails.latitude,
      lon: userBirthDetails.longitude,
      tzone: String(userTimezone ?? config.DEFAULT_TZONE),
    },
    person2: {
      name: partnerBirthDetails.name,
      date: partnerBirthDetails.birthDate,
      time: partnerBirthDetails.birthTime,
      place: partnerBirthDetails.birthPlace,
      lat: partnerBirthDetails.latitude,
      lon: partnerBirthDetails.longitude,
      tzone: String(partnerTimezone ?? config.DEFAULT_TZONE),
    },
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
    await logInfo("divineapi.synastry", "divineapi_synastry_request_started")

    try {
      const raw = await divinePost<unknown>({
        product: "western",
        path: config.SYNASTRY_PATH,
        body: buildSynastryPayload(userBirthDetails, partnerBirthDetails, language),
        includeApiKeyInBody: true,
      })

      return {
        raw,
        mode: "synastry_api",
        personA: userNatal,
        personB: normalizeNatalChartResponse(raw),
      }
    } catch (error) {
      await logError("divineapi.synastry", "divineapi_synastry_request_failed_fallback_used", {
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
