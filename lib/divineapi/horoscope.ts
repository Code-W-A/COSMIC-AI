import "server-only"

import { divinePost } from "@/lib/divineapi/client"
import { getDivineApiConfig } from "@/lib/divineapi/config"
import { normalizeDailyHoroscopeResponse } from "@/lib/divineapi/normalizers"
import {
  getDatePartsForOffset,
  getDatePartsInTimeZone,
  resolveDivineTimezoneOffsetHours,
} from "@/lib/divineapi/timezone"
import type { DailyHoroscopeData, ZodiacSign } from "@/lib/divineapi/types"
import { logError, logInfo } from "@/lib/logging/logger"

export async function getDailyHoroscopeFromDivineApi({
  sign,
  date = new Date(),
  timezone,
  timezoneIana,
  language,
}: {
  sign: ZodiacSign | string
  date?: Date
  timezone?: string | number
  timezoneIana?: string
  language?: string
}): Promise<DailyHoroscopeData> {
  const config = getDivineApiConfig()
  const resolvedTimezone = resolveDivineTimezoneOffsetHours({
    explicitTimezone: timezone,
    timezoneIana,
    referenceDate: date,
    fallbackTimezone: config.DEFAULT_TZONE,
  })
  const dateParts =
    (timezoneIana ? getDatePartsInTimeZone(timezoneIana, date) : null) ??
    (typeof resolvedTimezone === "number" ? getDatePartsForOffset(resolvedTimezone, date) : null)
  const body = {
    sign,
    day: String(dateParts?.day ?? date.getUTCDate()),
    month: String(dateParts?.month ?? date.getUTCMonth() + 1),
    year: String(dateParts?.year ?? date.getUTCFullYear()),
    h_day: "today",
    tzone: String(resolvedTimezone ?? config.DEFAULT_TZONE),
    lan: language ?? config.DEFAULT_LANGUAGE,
  }

  await logInfo("divineapi.daily", "divineapi_daily_request_started", {
    sign,
    timezoneIana: timezoneIana ?? null,
    resolvedTimezone: resolvedTimezone ?? null,
    date: `${body.year}-${body.month}-${body.day}`,
    language: body.lan,
  })

  try {
    const raw = await divinePost<unknown>({
      product: "horoscope",
      path: config.HOROSCOPE_DAILY_PATH,
      body,
      includeApiKeyInBody: true,
    })
    const normalized = normalizeDailyHoroscopeResponse(raw)

    await logInfo("divineapi.daily", "divineapi_daily_request_success", {
      sign: normalized.sign ?? sign,
      hasCategories: Boolean(normalized.categories && Object.keys(normalized.categories).length > 0),
    })

    return normalized
  } catch (error) {
    await logError("divineapi.daily", "divineapi_daily_request_failed", {
      sign,
      timezoneIana: timezoneIana ?? null,
      resolvedTimezone: resolvedTimezone ?? null,
      error,
    })
    throw error
  }
}
