import "server-only"

import {
  getCurrentSystemOffsetHours,
  getOffsetHoursForTimeZoneAtDate,
  getOffsetHoursForTimeZoneAtLocalDateTime,
} from "@/lib/divineapi/timezone"
import { logError, logInfo } from "@/lib/logging/logger"
import type { LocationAutocompleteSuggestion, ResolvedBirthLocation } from "@/lib/location/types"

type ResolveBirthLocationInput = {
  placeId?: string
  birthPlace?: string
  birthDate: string
  birthTime: string
  locale?: "ro" | "en"
  uid?: string
  source?: string
}

type GoogleAutocompleteResponse = {
  status?: string
  error_message?: string
  predictions?: Array<{
    description?: string
    place_id?: string
    structured_formatting?: {
      main_text?: string
      secondary_text?: string
    }
  }>
}

type GooglePlaceDetailsResponse = {
  status?: string
  error_message?: string
  result?: {
    place_id?: string
    formatted_address?: string
    name?: string
    geometry?: {
      location?: {
        lat?: number
        lng?: number
      }
    }
  }
}

type GoogleGeocodeResponse = {
  status?: string
  error_message?: string
  results?: Array<{
    place_id?: string
    formatted_address?: string
    geometry?: {
      location?: {
        lat?: number
        lng?: number
      }
    }
  }>
}

type GoogleTimezoneResponse = {
  status?: string
  errorMessage?: string
  timeZoneId?: string
  rawOffset?: number
  dstOffset?: number
}

type ResolvedCoordinates = {
  placeId: string
  birthPlace: string
  latitude: number
  longitude: number
}

export class LocationResolverError extends Error {
  code: "location_autocomplete_failed" | "location_resolve_failed" | "birth_location_unresolved"

  constructor(
    code: "location_autocomplete_failed" | "location_resolve_failed" | "birth_location_unresolved",
    message: string
  ) {
    super(message)
    this.name = "LocationResolverError"
    this.code = code
  }
}

function optionalEnv(name: string, fallback: string) {
  return process.env[name] || fallback
}

function getGoogleMapsApiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    throw new LocationResolverError(
      "location_resolve_failed",
      "Missing GOOGLE_MAPS_API_KEY environment variable."
    )
  }
  return key
}

function getResolverConfig() {
  return {
    apiKey: getGoogleMapsApiKey(),
    autocompleteUrl: optionalEnv(
      "GOOGLE_PLACES_AUTOCOMPLETE_URL",
      "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    ),
    placeDetailsUrl: optionalEnv(
      "GOOGLE_PLACES_DETAILS_URL",
      "https://maps.googleapis.com/maps/api/place/details/json"
    ),
    geocodeUrl: optionalEnv(
      "GOOGLE_GEOCODE_URL",
      "https://maps.googleapis.com/maps/api/geocode/json"
    ),
    timezoneUrl: optionalEnv(
      "GOOGLE_TIMEZONE_URL",
      "https://maps.googleapis.com/maps/api/timezone/json"
    ),
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function buildTimestampFromBirthDateTime(birthDate: string, birthTime: string) {
  const [yearRaw = "", monthRaw = "", dayRaw = ""] = birthDate.split("-")
  const [hourRaw = "12", minuteRaw = "0"] = birthTime.split(":")
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return Math.floor(Date.now() / 1_000)
  }

  return Math.floor(Date.UTC(year, month - 1, day, hour, minute, 0) / 1_000)
}

async function fetchJson<T>(url: URL): Promise<T> {
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} when calling ${url.origin}`)
  }

  return (await response.json()) as T
}

function normalizeAutocompleteStatus(status?: string) {
  if (status === "OK" || status === "ZERO_RESULTS") return status
  return "ERROR"
}

export async function getLocationAutocompleteSuggestions({
  query,
  locale,
  uid,
  source = "unknown",
}: {
  query: string
  locale?: "ro" | "en"
  uid?: string
  source?: string
}): Promise<LocationAutocompleteSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const config = getResolverConfig()
  const url = new URL(config.autocompleteUrl)
  url.searchParams.set("input", trimmed)
  url.searchParams.set("key", config.apiKey)
  if (locale) {
    url.searchParams.set("language", locale)
  }

  await logInfo("location.resolve", "location_autocomplete_started", {
    uid,
    source,
    queryLength: trimmed.length,
    locale: locale ?? null,
  })

  try {
    const payload = await fetchJson<GoogleAutocompleteResponse>(url)
    const status = normalizeAutocompleteStatus(payload.status)

    if (status === "ZERO_RESULTS") {
      await logInfo("location.resolve", "location_autocomplete_success", {
        uid,
        source,
        locale: locale ?? null,
        count: 0,
      })
      return []
    }

    if (status !== "OK") {
      throw new Error(payload.error_message || `Google autocomplete status: ${payload.status}`)
    }

    const suggestions: LocationAutocompleteSuggestion[] = []
    for (const prediction of payload.predictions ?? []) {
      const placeId = prediction.place_id?.trim()
      const description = prediction.description?.trim()
      if (!placeId || !description) continue

      suggestions.push({
        placeId,
        description,
        mainText: prediction.structured_formatting?.main_text?.trim() || description,
        secondaryText: prediction.structured_formatting?.secondary_text?.trim() || null,
      })
    }

    await logInfo("location.resolve", "location_autocomplete_success", {
      uid,
      source,
      locale: locale ?? null,
      count: suggestions.length,
    })

    return suggestions
  } catch (error) {
    await logError("location.resolve", "location_autocomplete_failed", {
      uid,
      source,
      locale: locale ?? null,
      error,
    })
    throw new LocationResolverError(
      "location_autocomplete_failed",
      "Unable to fetch location suggestions right now."
    )
  }
}

async function resolveCoordinatesByPlaceId({
  placeId,
  locale,
}: {
  placeId: string
  locale?: "ro" | "en"
}): Promise<ResolvedCoordinates> {
  const config = getResolverConfig()
  const url = new URL(config.placeDetailsUrl)
  url.searchParams.set("place_id", placeId)
  url.searchParams.set("fields", "place_id,formatted_address,name,geometry/location")
  url.searchParams.set("key", config.apiKey)
  if (locale) {
    url.searchParams.set("language", locale)
  }

  const payload = await fetchJson<GooglePlaceDetailsResponse>(url)

  if (payload.status !== "OK") {
    throw new Error(payload.error_message || `Google place details status: ${payload.status}`)
  }

  const lat = payload.result?.geometry?.location?.lat
  const lon = payload.result?.geometry?.location?.lng
  const normalizedPlaceId = payload.result?.place_id?.trim() || placeId
  const birthPlace =
    payload.result?.formatted_address?.trim() ||
    payload.result?.name?.trim() ||
    ""

  if (!birthPlace || !isFiniteNumber(lat) || !isFiniteNumber(lon)) {
    throw new Error("Google place details did not include valid geometry.")
  }

  return {
    placeId: normalizedPlaceId,
    birthPlace,
    latitude: lat,
    longitude: lon,
  }
}

async function resolveCoordinatesByBirthPlaceText({
  birthPlace,
  locale,
}: {
  birthPlace: string
  locale?: "ro" | "en"
}): Promise<ResolvedCoordinates> {
  const config = getResolverConfig()
  const url = new URL(config.geocodeUrl)
  url.searchParams.set("address", birthPlace)
  url.searchParams.set("key", config.apiKey)
  if (locale) {
    url.searchParams.set("language", locale)
  }

  const payload = await fetchJson<GoogleGeocodeResponse>(url)

  if (payload.status !== "OK" || !(payload.results && payload.results.length > 0)) {
    throw new Error(payload.error_message || `Google geocode status: ${payload.status}`)
  }

  const first = payload.results[0]
  const placeId = first.place_id?.trim() || ""
  const lat = first.geometry?.location?.lat
  const lon = first.geometry?.location?.lng
  const canonicalBirthPlace = first.formatted_address?.trim() || birthPlace.trim()

  if (!placeId || !canonicalBirthPlace || !isFiniteNumber(lat) || !isFiniteNumber(lon)) {
    throw new Error("Google geocode did not include valid place data.")
  }

  return {
    placeId,
    birthPlace: canonicalBirthPlace,
    latitude: lat,
    longitude: lon,
  }
}

async function resolveTimeZoneData({
  latitude,
  longitude,
  birthDate,
  birthTime,
}: {
  latitude: number
  longitude: number
  birthDate: string
  birthTime: string
}) {
  const config = getResolverConfig()
  const url = new URL(config.timezoneUrl)
  url.searchParams.set("location", `${latitude},${longitude}`)
  url.searchParams.set("timestamp", String(buildTimestampFromBirthDateTime(birthDate, birthTime)))
  url.searchParams.set("key", config.apiKey)

  const payload = await fetchJson<GoogleTimezoneResponse>(url)

  if (payload.status !== "OK" || !payload.timeZoneId) {
    throw new Error(payload.errorMessage || `Google timezone status: ${payload.status}`)
  }

  const timezoneIana = payload.timeZoneId
  const resolvedOffsetAtBirth = getOffsetHoursForTimeZoneAtLocalDateTime(timezoneIana, {
    date: birthDate,
    time: birthTime,
  })
  const fallbackOffsetSeconds =
    (isFiniteNumber(payload.rawOffset) ? payload.rawOffset : 0) +
    (isFiniteNumber(payload.dstOffset) ? payload.dstOffset : 0)
  const fallbackOffsetHours = fallbackOffsetSeconds / 3600
  const timezoneOffsetAtBirth =
    typeof resolvedOffsetAtBirth === "number"
      ? resolvedOffsetAtBirth
      : Number.isFinite(fallbackOffsetHours)
        ? fallbackOffsetHours
        : undefined
  const timezoneOffsetNow =
    getOffsetHoursForTimeZoneAtDate(timezoneIana, new Date()) ?? getCurrentSystemOffsetHours()

  if (typeof timezoneOffsetAtBirth !== "number") {
    throw new Error("Unable to resolve timezone offset at birth.")
  }

  return {
    timezoneIana,
    timezoneOffsetAtBirth,
    timezoneOffsetNow,
  }
}

export async function resolveBirthLocation(
  input: ResolveBirthLocationInput
): Promise<ResolvedBirthLocation> {
  const locale = input.locale
  const source = input.source ?? "unknown"

  await logInfo("location.resolve", "location_resolve_started", {
    uid: input.uid,
    source,
    hasPlaceId: Boolean(input.placeId),
    hasBirthPlace: Boolean(input.birthPlace?.trim()),
    birthDate: input.birthDate,
    birthTime: input.birthTime,
  })

  try {
    const coordinates = input.placeId?.trim()
      ? await resolveCoordinatesByPlaceId({
          placeId: input.placeId.trim(),
          locale,
        })
      : input.birthPlace?.trim()
        ? await resolveCoordinatesByBirthPlaceText({
            birthPlace: input.birthPlace.trim(),
            locale,
          })
        : null

    if (!coordinates) {
      throw new LocationResolverError(
        "birth_location_unresolved",
        "Birth location could not be resolved."
      )
    }

    await logInfo("location.resolve", "location_timezone_lookup_started", {
      uid: input.uid,
      source,
      placeId: coordinates.placeId,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    })

    let timezone
    try {
      timezone = await resolveTimeZoneData({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        birthDate: input.birthDate,
        birthTime: input.birthTime,
      })
    } catch (error) {
      await logError("location.resolve", "location_timezone_lookup_failed", {
        uid: input.uid,
        source,
        placeId: coordinates.placeId,
        error,
      })
      throw error
    }

    await logInfo("location.resolve", "location_timezone_lookup_success", {
      uid: input.uid,
      source,
      placeId: coordinates.placeId,
      timezoneIana: timezone.timezoneIana,
      timezoneOffsetAtBirth: timezone.timezoneOffsetAtBirth,
    })

    const resolved: ResolvedBirthLocation = {
      ...coordinates,
      ...timezone,
    }

    await logInfo("location.resolve", "location_resolve_success", {
      uid: input.uid,
      source,
      placeId: resolved.placeId,
      timezoneIana: resolved.timezoneIana,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
    })

    return resolved
  } catch (error) {
    await logError("location.resolve", "location_resolve_failed", {
      uid: input.uid,
      source,
      hasPlaceId: Boolean(input.placeId),
      hasBirthPlace: Boolean(input.birthPlace?.trim()),
      error,
    })

    if (error instanceof LocationResolverError) {
      throw error
    }

    throw new LocationResolverError(
      "location_resolve_failed",
      "Unable to resolve birth location."
    )
  }
}
