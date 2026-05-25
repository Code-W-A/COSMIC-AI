import { existsSync, readFileSync } from "node:fs"

const ENV_FILE = ".env"

function loadDotEnv(path = ENV_FILE) {
  if (!existsSync(path)) return

  const content = readFileSync(path, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue

    const index = trimmed.indexOf("=")
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) {
      process.env[key] = value.replace(/\\n/g, "\n")
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function optionalEnv(name, fallback) {
  return process.env[name]?.trim() || fallback
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function isFailedDivinePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false
  if (!("success" in payload)) return false
  return payload.success !== 1 && payload.success !== true
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  let payload = null

  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`Non-JSON response from ${new URL(url).origin}: HTTP ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 260)}`)
  }

  return payload
}

function buildGoogleUrl(base, params) {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function buildDivineUrl(base, path) {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
}

async function runGoogleSmoke() {
  const apiKey = requiredEnv("GOOGLE_MAPS_API_KEY")
  const autocompleteUrl = optionalEnv(
    "GOOGLE_PLACES_AUTOCOMPLETE_URL",
    "https://maps.googleapis.com/maps/api/place/autocomplete/json"
  )
  const detailsUrl = optionalEnv(
    "GOOGLE_PLACES_DETAILS_URL",
    "https://maps.googleapis.com/maps/api/place/details/json"
  )
  const timezoneUrl = optionalEnv(
    "GOOGLE_TIMEZONE_URL",
    "https://maps.googleapis.com/maps/api/timezone/json"
  )

  const autocomplete = await fetchJson(
    buildGoogleUrl(autocompleteUrl, {
      input: "Bucharest Romania",
      key: apiKey,
      language: "en",
    })
  )

  if (autocomplete.status !== "OK" || !autocomplete.predictions?.[0]?.place_id) {
    throw new Error(`Google autocomplete failed: ${JSON.stringify(autocomplete).slice(0, 260)}`)
  }

  const placeId = autocomplete.predictions[0].place_id
  const details = await fetchJson(
    buildGoogleUrl(detailsUrl, {
      place_id: placeId,
      fields: "place_id,formatted_address,name,geometry/location",
      key: apiKey,
      language: "en",
    })
  )

  const lat = details.result?.geometry?.location?.lat
  const lon = details.result?.geometry?.location?.lng
  if (details.status !== "OK" || typeof lat !== "number" || typeof lon !== "number") {
    throw new Error(`Google place details failed: ${JSON.stringify(details).slice(0, 260)}`)
  }

  const timestamp = Math.floor(Date.UTC(1995, 2, 2, 9, 0, 0) / 1000)
  const timezone = await fetchJson(
    buildGoogleUrl(timezoneUrl, {
      location: `${lat},${lon}`,
      timestamp,
      key: apiKey,
    })
  )

  if (timezone.status !== "OK" || !timezone.timeZoneId) {
    throw new Error(`Google timezone failed: ${JSON.stringify(timezone).slice(0, 260)}`)
  }

  const offsetHours = ((timezone.rawOffset ?? 0) + (timezone.dstOffset ?? 0)) / 3600
  return {
    birthPlace: details.result.formatted_address ?? details.result.name ?? "Bucharest, Romania",
    latitude: lat,
    longitude: lon,
    timezoneIana: timezone.timeZoneId,
    timezoneOffsetAtBirth: offsetHours,
  }
}

async function divinePost({ baseUrl, path, body, authMode, apiKey, authToken }) {
  const headers = { "Content-Type": "application/json" }
  const requestBody = { ...body, api_key: apiKey }

  if (authMode === "bearer") {
    headers.Authorization = `Bearer ${authToken || apiKey}`
  }

  const payload = await fetchJson(buildDivineUrl(baseUrl, path), {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  })

  if (isFailedDivinePayload(payload)) {
    throw new Error(`Divine returned failure payload: ${JSON.stringify(payload).slice(0, 360)}`)
  }

  return payload
}

async function runDivineSmoke(location) {
  const apiKey = requiredEnv("DIVINE_API_KEY")
  const authMode = optionalEnv("DIVINE_API_AUTH_MODE", "body_api_key")
  const authToken = process.env.DIVINE_API_AUTH_TOKEN?.trim()
  const westernBaseUrl = optionalEnv("DIVINE_WESTERN_BASE_URL", "https://astroapi-5.divineapi.com")
  const westernChartBaseUrl = optionalEnv(
    "DIVINE_WESTERN_CHART_BASE_URL",
    "https://astroapi-8.divineapi.com"
  )
  const horoscopeBaseUrl = optionalEnv(
    "DIVINE_HOROSCOPE_BASE_URL",
    "https://astroapi-5.divineapi.com"
  )
  const natalPrimary = optionalEnv(
    "DIVINE_NATAL_CHART_PATH",
    optionalEnv("DIVINE_NATAL_PLANETARY_POSITIONS_PATH", "/western-api/v1/natal-chart")
  )
  const natalPlanetaryPath = process.env.DIVINE_NATAL_PLANETARY_POSITIONS_PATH?.trim()
  const natalHouseCuspsPath = optionalEnv("DIVINE_NATAL_HOUSE_CUSPS_PATH", "/western-api/v1/house-cusps")
  const natalAspectTablePath = optionalEnv("DIVINE_NATAL_ASPECT_TABLE_PATH", "/western-api/v2/aspect-table")
  const natalWheelPath = process.env.DIVINE_NATAL_WHEEL_CHART_PATH?.trim()
  const dailyPath = optionalEnv("DIVINE_HOROSCOPE_DAILY_PATH", "/api/v5/daily-horoscope")
  const language = optionalEnv("DIVINE_API_LANGUAGE", "en")

  const natalPaths = unique([
    natalPrimary,
    natalPlanetaryPath,
    natalWheelPath,
    "/western-api/v1/planetary-positions",
    "/western-api/v1/natal-wheel-chart",
    "/western-api/v2/natal-wheel-chart",
    "/western-api/v2/natal-insights",
    "/api/v5/natal-chart",
    "/api/v5/western/natal-chart",
    "/western-api/v1/natal-chart",
  ])
  const natalBody = {
    full_name: "Smoke Test",
    name: "Smoke Test",
    day: "02",
    month: "03",
    year: "1995",
    hour: "09",
    min: "00",
    sec: "0",
    date: "1995-03-02",
    time: "09:00",
    gender: "female",
    place: location.birthPlace,
    pob: location.birthPlace,
    lat: location.latitude,
    lon: location.longitude,
    tzone: String(location.timezoneOffsetAtBirth),
    lan: language,
    house_system: optionalEnv("DIVINE_API_DEFAULT_HOUSE_SYSTEM", "P"),
    zodiac: optionalEnv("DIVINE_API_DEFAULT_ZODIAC", "tropical"),
  }

  let natalResult = null
  const natalErrors = []
  for (const path of natalPaths) {
    try {
      natalResult = {
        path,
        payload: await divinePost({
          baseUrl: westernBaseUrl,
          path,
          body: natalBody,
          authMode,
          apiKey,
          authToken,
        }),
      }
      break
    } catch (error) {
      natalErrors.push(`${path}: ${error.message}`)
    }
  }

  if (!natalResult) {
    throw new Error(`All Divine natal candidates failed:\n${natalErrors.join("\n")}`)
  }

  const daily = await divinePost({
    baseUrl: horoscopeBaseUrl,
    path: dailyPath,
    body: {
      sign: "Pisces",
      day: "02",
      month: "03",
      year: "1995",
      h_day: "today",
      tzone: String(location.timezoneOffsetAtBirth),
      lan: language,
    },
    authMode,
    apiKey,
    authToken,
  })

  const houses = await divinePost({
    baseUrl: westernBaseUrl,
    path: natalHouseCuspsPath,
    body: natalBody,
    authMode,
    apiKey,
    authToken,
  })

  const aspects = await divinePost({
    baseUrl: westernChartBaseUrl,
    path: natalAspectTablePath,
    body: natalBody,
    authMode,
    apiKey,
    authToken,
  })

  return {
    natalPath: natalResult.path,
    natalKeys: Object.keys(natalResult.payload ?? {}).slice(0, 12),
    natalDataCount: Array.isArray(natalResult.payload?.data)
      ? natalResult.payload.data.length
      : null,
    houseCount: Array.isArray(houses?.data?.houses) ? houses.data.houses.length : null,
    aspectCount: Array.isArray(aspects?.data) ? aspects.data.length : null,
    dailyKeys: Object.keys(daily ?? {}).slice(0, 12),
  }
}

async function main() {
  loadDotEnv()

  console.log("[smoke] Google location resolver")
  const location = await runGoogleSmoke()
  console.log("[ok] Google:", {
    birthPlace: location.birthPlace,
    hasCoordinates: true,
    timezoneIana: location.timezoneIana,
    timezoneOffsetAtBirth: location.timezoneOffsetAtBirth,
  })

  console.log("[smoke] Divine natal + daily")
  const divine = await runDivineSmoke(location)
  console.log("[ok] Divine:", divine)
}

main().catch((error) => {
  console.error("[failed]", error.message)
  process.exitCode = 1
})
