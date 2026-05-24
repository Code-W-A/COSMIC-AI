import "server-only"

const CRITICAL_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "OBLIO_CLIENT_ID",
  "OBLIO_CLIENT_SECRET",
  "OBLIO_CIF",
] as const

export class BillingEnvError extends Error {
  missingKeys: string[]

  constructor(missingKeys: string[]) {
    super(`Missing required billing environment variables: ${missingKeys.join(", ")}`)
    this.name = "BillingEnvError"
    this.missingKeys = missingKeys
  }
}

function readEnv(name: string) {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : ""
}

function hasOblioSeriesName() {
  return Boolean(readEnv("OBLIO_SERIES_NAME") || readEnv("OBLIO_SERIES"))
}

export function getBillingEnvMissingKeys() {
  const missing: string[] = CRITICAL_KEYS.filter((key) => !readEnv(key))

  if (!hasOblioSeriesName()) {
    missing.push("OBLIO_SERIES_NAME")
  }

  return missing
}

export function assertBillingEnvReady() {
  const missing = getBillingEnvMissingKeys()
  if (missing.length > 0) {
    throw new BillingEnvError(missing)
  }
}
