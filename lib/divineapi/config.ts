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

export function getDivineApiConfig() {
  const authMode = optionalEnv("DIVINE_API_AUTH_MODE", "body_api_key")

  if (authMode !== "body_api_key" && authMode !== "bearer") {
    throw new Error("DIVINE_API_AUTH_MODE must be body_api_key or bearer")
  }

  return {
    DIVINE_API_KEY: requiredEnv("DIVINE_API_KEY"),
    DIVINE_API_AUTH_MODE: authMode as DivineApiAuthMode,
    HOROSCOPE_BASE_URL: optionalEnv(
      "DIVINE_HOROSCOPE_BASE_URL",
      "https://astroapi-5.divineapi.com"
    ),
    HOROSCOPE_DAILY_PATH: optionalEnv(
      "DIVINE_HOROSCOPE_DAILY_PATH",
      "/api/v5/daily-horoscope"
    ),
    WESTERN_BASE_URL: optionalEnv("DIVINE_WESTERN_BASE_URL", "https://astroapi-5.divineapi.com"),
    NATAL_CHART_PATH: optionalEnv("DIVINE_NATAL_CHART_PATH", "/western-api/v1/natal-chart"),
    SYNASTRY_PATH: process.env.DIVINE_SYNASTRY_PATH || "/western-api/v1/synastry",
    DEFAULT_LANGUAGE: optionalEnv("DIVINE_API_LANGUAGE", "en"),
    DEFAULT_TZONE: optionalEnv("DIVINE_API_DEFAULT_TZONE", "2"),
    DEFAULT_HOUSE_SYSTEM: optionalEnv("DIVINE_API_DEFAULT_HOUSE_SYSTEM", "placidus"),
    DEFAULT_ZODIAC: optionalEnv("DIVINE_API_DEFAULT_ZODIAC", "tropical"),
  }
}
