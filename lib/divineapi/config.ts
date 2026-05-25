import "server-only"

export type DivineApiAuthMode = "body_api_key" | "bearer"

function requiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function optionalEnv(name: string, fallback: string) {
  return process.env[name] || fallback
}

function pathCandidates(primary: string, fallbacks: string[]) {
  const seen = new Set<string>()
  const values = [primary, ...fallbacks]
  const result: string[] = []

  for (const value of values) {
    const normalized = value.trim()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }

  return result
}

export function getDivineApiConfig() {
  const authMode = optionalEnv("DIVINE_API_AUTH_MODE", "body_api_key")

  if (authMode !== "body_api_key" && authMode !== "bearer") {
    throw new Error("DIVINE_API_AUTH_MODE must be body_api_key or bearer")
  }

  const natalPath = optionalEnv(
    "DIVINE_NATAL_CHART_PATH",
    optionalEnv("DIVINE_NATAL_PLANETARY_POSITIONS_PATH", "/western-api/v1/natal-chart")
  )
  const natalPlanetaryPositionsPath =
    process.env.DIVINE_NATAL_PLANETARY_POSITIONS_PATH || "/western-api/v1/planetary-positions"
  const natalHouseCuspsPath =
    process.env.DIVINE_NATAL_HOUSE_CUSPS_PATH || "/western-api/v1/house-cusps"
  const natalAspectTablePath =
    process.env.DIVINE_NATAL_ASPECT_TABLE_PATH || "/western-api/v2/aspect-table"
  const natalWheelPath =
    process.env.DIVINE_NATAL_WHEEL_CHART_PATH || "/western-api/v2/natal-wheel-chart"
  const synastryPath =
    process.env.DIVINE_SYNASTRY_PATH ||
    process.env.DIVINE_SYNASTRY_PLANETARY_POSITIONS_PATH ||
    "/western-api/v1/synastry"
  const apiToken = process.env.DIVINE_API_AUTH_TOKEN?.trim()

  return {
    DIVINE_API_KEY: requiredEnv("DIVINE_API_KEY"),
    DIVINE_API_AUTH_TOKEN: apiToken && apiToken.length > 0 ? apiToken : null,
    DIVINE_API_AUTH_MODE: authMode as DivineApiAuthMode,
    HOROSCOPE_BASE_URL: optionalEnv(
      "DIVINE_HOROSCOPE_BASE_URL",
      "https://astroapi-5.divineapi.com"
    ),
    HOROSCOPE_DAILY_PATH: optionalEnv(
      "DIVINE_HOROSCOPE_DAILY_PATH",
      "/api/v5/daily-horoscope"
    ),
    WESTERN_BASE_URL: optionalEnv("DIVINE_WESTERN_BASE_URL", "https://astroapi-4.divineapi.com"),
    WESTERN_CHART_BASE_URL: optionalEnv(
      "DIVINE_WESTERN_CHART_BASE_URL",
      "https://astroapi-8.divineapi.com"
    ),
    NATAL_CHART_PATH: natalPath,
    NATAL_PLANETARY_POSITIONS_PATH: natalPlanetaryPositionsPath,
    NATAL_HOUSE_CUSPS_PATH: natalHouseCuspsPath,
    NATAL_ASPECT_TABLE_PATH: natalAspectTablePath,
    NATAL_WHEEL_CHART_PATH: natalWheelPath,
    NATAL_CHART_PATH_CANDIDATES: pathCandidates(natalPath, [
      natalPlanetaryPositionsPath,
      natalHouseCuspsPath,
      natalAspectTablePath,
      natalWheelPath,
      "/western-api/v2/natal-insights",
      "/api/v5/natal-chart",
      "/api/v5/western/natal-chart",
      "/western-api/v1/natal-chart",
    ]),
    SYNASTRY_PATH: synastryPath,
    SYNASTRY_PATH_CANDIDATES: pathCandidates(synastryPath, [
      "/western-api/v2/synastry/aspect-table",
      "/western-api/v2/synastry/planetary-positions",
      "/western-api/v1/synastry/aspect-table",
      "/western-api/v1/synastry/planetary-positions",
      "/api/v5/synastry",
      "/api/v5/western/synastry",
      "/western-api/v1/synastry",
    ]),
    DEFAULT_LANGUAGE: optionalEnv("DIVINE_API_LANGUAGE", "en"),
    DEFAULT_TZONE: optionalEnv("DIVINE_API_DEFAULT_TZONE", "2"),
    DEFAULT_HOUSE_SYSTEM: optionalEnv("DIVINE_API_DEFAULT_HOUSE_SYSTEM", "placidus"),
    DEFAULT_ZODIAC: optionalEnv("DIVINE_API_DEFAULT_ZODIAC", "tropical"),
  }
}
