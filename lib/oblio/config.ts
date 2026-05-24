import "server-only"

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function requiredEnvAny(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }

  throw new Error(`Missing required environment variable: ${names.join(" or ")}`)
}

function optionalEnv(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback
}

export function getOblioConfig() {
  return {
    baseUrl: optionalEnv("OBLIO_BASE_URL", "https://www.oblio.eu"),
    clientId: requiredEnv("OBLIO_CLIENT_ID"),
    clientSecret: requiredEnv("OBLIO_CLIENT_SECRET"),
    cif: requiredEnv("OBLIO_CIF"),
    seriesName: requiredEnvAny(["OBLIO_SERIES_NAME", "OBLIO_SERIES"]),
    language: optionalEnv("OBLIO_DEFAULT_LANGUAGE", "RO"),
    currency: optionalEnv("OBLIO_DEFAULT_CURRENCY", "RON"),
    sendEmail: optionalEnv("OBLIO_SEND_EMAIL", "1") === "1",
  }
}
