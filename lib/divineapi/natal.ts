import "server-only"

import { DivineApiHttpError, divinePost } from "@/lib/divineapi/client"
import { getDivineApiConfig } from "@/lib/divineapi/config"
import { resolveDivineTimezoneOffsetHours } from "@/lib/divineapi/timezone"
import {
  normalizeAspects,
  normalizeHouses,
  normalizeNatalChartResponse,
} from "@/lib/divineapi/normalizers"
import type { BirthDetails, NatalChartData } from "@/lib/divineapi/types"
import type { Locale } from "@/lib/i18n/locale"
import { logError, logInfo } from "@/lib/logging/logger"

export function birthDetailsToDateParts(birthDate: string, birthTime: string) {
  const [year = "", month = "", day = ""] = birthDate.split("-")
  const [hour = "0", min = "0"] = birthTime.split(":")

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
  const dateParts = birthDetailsToDateParts(birthDetails.birthDate, birthDetails.birthTime)
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

  // Keep both documented v2-style fields and legacy fields for compatibility with configured path variants.
  return {
    full_name: birthDetails.name,
    ...dateParts,
    gender: birthDetails.sexAtBirth,
    place: birthDetails.birthPlace,
    pob: birthDetails.birthPlace,
    lat: birthDetails.latitude,
    lon: birthDetails.longitude,
    tzone: String(resolvedTimezone ?? config.DEFAULT_TZONE),
    lan: language ?? config.DEFAULT_LANGUAGE,
    house_system: config.DEFAULT_HOUSE_SYSTEM,
    zodiac: config.DEFAULT_ZODIAC,
    name: birthDetails.name,
    date: birthDetails.birthDate,
    time: birthDetails.birthTime,
  }
}

export async function getNatalChartFromDivineApi(
  birthDetails: BirthDetails,
  language?: Locale
): Promise<NatalChartData> {
  const config = getDivineApiConfig()

  await logInfo("divineapi.natal", "divineapi_natal_request_started", {
    hasName: Boolean(birthDetails.name),
    birthDate: birthDetails.birthDate,
    birthTime: birthDetails.birthTime,
    hasCoordinates:
      typeof birthDetails.latitude === "number" && typeof birthDetails.longitude === "number",
    timezoneIana: birthDetails.timezoneIana ?? null,
    locale: language ?? config.DEFAULT_LANGUAGE,
    pathCandidates: config.NATAL_CHART_PATH_CANDIDATES,
  })

  try {
    const payload = buildNatalChartPayload(birthDetails, language)
    const primaryPaths = [
      config.NATAL_PLANETARY_POSITIONS_PATH,
      ...config.NATAL_CHART_PATH_CANDIDATES,
    ].filter((path, index, paths) => path && paths.indexOf(path) === index)
    let primaryRaw: unknown = null
    let primaryPath: string | null = null

    for (let index = 0; index < primaryPaths.length; index += 1) {
      const path = primaryPaths[index]
      const baseUrlOverride = path.includes("/western-api/v2/")
        ? config.WESTERN_CHART_BASE_URL
        : config.WESTERN_BASE_URL

      try {
        const raw = await divinePost<unknown>({
          product: "western",
          path,
          body: payload,
          includeApiKeyInBody: true,
          baseUrlOverride,
        })
        const normalized = normalizeNatalChartResponse(raw)

        if ((normalized.summary.planets?.length ?? 0) === 0) {
          throw new DivineApiHttpError(
            "DivineAPI natal endpoint returned no planetary placements.",
            200,
            "western",
            path,
            { divineSuccess: "empty_planets" }
          )
        }

        primaryRaw = raw
        primaryPath = path

        await logInfo("divineapi.natal", "divineapi_natal_primary_success", {
          path,
          hasSunSign: Boolean(normalized.summary.sunSign),
          planets: normalized.summary.planets?.length ?? 0,
        })
        break
      } catch (error) {
        const isLast = index === primaryPaths.length - 1
        const shouldTryNext =
          error instanceof DivineApiHttpError &&
          (error.status === 404 ||
            error.status === 405 ||
            error.divineSuccess === "empty_planets" ||
            (typeof error.divineSuccess === "number" && error.divineSuccess !== 1))

        if (!isLast && shouldTryNext) {
          await logInfo("divineapi.natal", "divineapi_natal_path_fallback", {
            failedPath: path,
            status: error.status,
            divineSuccess:
              error instanceof DivineApiHttpError ? error.divineSuccess ?? null : null,
            divineMessage:
              error instanceof DivineApiHttpError ? error.divineMessage ?? null : null,
            nextPath: primaryPaths[index + 1],
          })
          continue
        }

        throw error
      }
    }

    if (!primaryRaw || !primaryPath) {
      throw new Error("Unable to fetch astrology data right now.")
    }

    const supplementary: {
      houses?: unknown
      aspects?: unknown
      chart?: unknown
    } = {}

    async function fetchSupplement(
      key: keyof typeof supplementary,
      path: string,
      baseUrlOverride: string
    ) {
      try {
        await logInfo("divineapi.natal", "divineapi_natal_supplement_started", {
          key,
          path,
          baseUrl: baseUrlOverride,
        })
        supplementary[key] = await divinePost<unknown>({
          product: "western",
          path,
          body: payload,
          includeApiKeyInBody: true,
          baseUrlOverride,
        })
        await logInfo("divineapi.natal", "divineapi_natal_supplement_success", {
          key,
          path,
        })
      } catch (error) {
        await logError("divineapi.natal", "divineapi_natal_supplement_failed", {
          key,
          path,
          error,
        })
      }
    }

    await Promise.all([
      fetchSupplement("houses", config.NATAL_HOUSE_CUSPS_PATH, config.WESTERN_BASE_URL),
      fetchSupplement("aspects", config.NATAL_ASPECT_TABLE_PATH, config.WESTERN_CHART_BASE_URL),
      fetchSupplement("chart", config.NATAL_WHEEL_CHART_PATH, config.WESTERN_CHART_BASE_URL),
    ])

    const combinedRaw = {
      planetary: primaryRaw,
      houses: supplementary.houses ?? null,
      aspects: supplementary.aspects ?? null,
      chart: supplementary.chart ?? null,
    }
    const primaryNormalized = normalizeNatalChartResponse(primaryRaw)
    const combinedNormalized = normalizeNatalChartResponse(combinedRaw)
    const houses = supplementary.houses ? normalizeHouses(supplementary.houses) : []
    const aspects = supplementary.aspects ? normalizeAspects(supplementary.aspects) : []

    const normalized: NatalChartData = {
      raw: combinedRaw,
      summary: {
        ...primaryNormalized.summary,
        houses: houses.length ? houses : combinedNormalized.summary.houses,
        aspects: aspects.length ? aspects : combinedNormalized.summary.aspects,
        chartImageSvg: combinedNormalized.summary.chartImageSvg,
        chartImageBase64: combinedNormalized.summary.chartImageBase64,
      },
    }

    await logInfo("divineapi.natal", "divineapi_natal_request_success", {
      path: primaryPath,
      hasSunSign: Boolean(normalized.summary.sunSign),
      planets: normalized.summary.planets?.length ?? 0,
      houses: normalized.summary.houses?.length ?? 0,
      aspects: normalized.summary.aspects?.length ?? 0,
      hasChart: Boolean(normalized.summary.chartImageSvg || normalized.summary.chartImageBase64),
    })

    return normalized
  } catch (error) {
    await logError("divineapi.natal", "divineapi_natal_request_failed", {
      birthDate: birthDetails.birthDate,
      birthTime: birthDetails.birthTime,
      timezoneIana: birthDetails.timezoneIana ?? null,
      error,
    })
    throw error
  }
}
