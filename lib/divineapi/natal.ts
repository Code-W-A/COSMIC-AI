import "server-only"

import { divinePost } from "@/lib/divineapi/client"
import { getDivineApiConfig } from "@/lib/divineapi/config"
import { resolveDivineTimezoneOffsetHours } from "@/lib/divineapi/timezone"
import { normalizeNatalChartResponse } from "@/lib/divineapi/normalizers"
import type { BirthDetails, NatalChartData } from "@/lib/divineapi/types"
import type { Locale } from "@/lib/i18n/locale"
import { logError, logInfo } from "@/lib/logging/logger"

export function birthDetailsToDateParts(birthDate: string, birthTime?: string) {
  const [year = "", month = "", day = ""] = birthDate.split("-")
  const [hour = "0", min = "0"] = (birthTime || "00:00").split(":")

  return {
    day,
    month,
    year,
    hour,
    min,
    sec: "0",
  }
}

export function buildNatalChartPayload(birthDetails: BirthDetails, language?: Locale) {
  const config = getDivineApiConfig()
  const resolvedTimezone = resolveDivineTimezoneOffsetHours({
    explicitTimezone: birthDetails.timezone,
    timezoneOffsetAtBirth: birthDetails.timezoneOffsetAtBirth,
    timezoneIana: birthDetails.timezoneIana,
    localDateTime: {
      date: birthDetails.birthDate,
      time: birthDetails.birthTime,
    },
    fallbackTimezone: config.DEFAULT_TZONE,
  })

  // TODO: Confirm exact DivineAPI natal-chart payload keys from dashboard/Postman collection. Public docs show endpoint but not full request body.
  return {
    name: birthDetails.name,
    date: birthDetails.birthDate,
    time: birthDetails.birthTime,
    place: birthDetails.birthPlace,
    lat: birthDetails.latitude,
    lon: birthDetails.longitude,
    tzone: String(resolvedTimezone ?? config.DEFAULT_TZONE),
    lan: language ?? config.DEFAULT_LANGUAGE,
    house_system: config.DEFAULT_HOUSE_SYSTEM,
    zodiac: config.DEFAULT_ZODIAC,
  }
}

export async function getNatalChartFromDivineApi(
  birthDetails: BirthDetails,
  language?: Locale
): Promise<NatalChartData> {
  const config = getDivineApiConfig()

  await logInfo("divineapi.natal", "divineapi_natal_request_started")

  try {
    const raw = await divinePost<unknown>({
      product: "western",
      path: config.NATAL_CHART_PATH,
      body: buildNatalChartPayload(birthDetails, language),
      includeApiKeyInBody: true,
    })
    const normalized = normalizeNatalChartResponse(raw)

    await logInfo("divineapi.natal", "divineapi_natal_request_success", {
      hasSunSign: Boolean(normalized.summary.sunSign),
      planets: normalized.summary.planets?.length ?? 0,
    })

    return normalized
  } catch (error) {
    await logError("divineapi.natal", "divineapi_natal_request_failed", { error })
    throw error
  }
}
