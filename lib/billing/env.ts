import "server-only"

const STRIPE_KEYS = ["STRIPE_SECRET_KEY"] as const
const STRIPE_WEBHOOK_KEYS = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const
const OBLIO_KEYS = ["OBLIO_CLIENT_ID", "OBLIO_CLIENT_SECRET", "OBLIO_CIF"] as const

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
  const missing = [...getStripeWebhookEnvMissingKeys(), ...getOblioEnvMissingKeys()]
  return Array.from(new Set(missing))
}

export function getStripeEnvMissingKeys() {
  return STRIPE_KEYS.filter((key) => !readEnv(key))
}

export function getStripeWebhookEnvMissingKeys() {
  return STRIPE_WEBHOOK_KEYS.filter((key) => !readEnv(key))
}

export function getOblioEnvMissingKeys() {
  const missing: string[] = OBLIO_KEYS.filter((key) => !readEnv(key))

  if (!hasOblioSeriesName()) {
    missing.push("OBLIO_SERIES_NAME")
  }

  return missing
}

export function assertStripeEnvReady() {
  const missing = getStripeEnvMissingKeys()
  if (missing.length > 0) {
    throw new BillingEnvError(missing)
  }
}

export function assertStripeWebhookEnvReady() {
  const missing = getStripeWebhookEnvMissingKeys()
  if (missing.length > 0) {
    throw new BillingEnvError(missing)
  }
}

export function assertOblioEnvReady() {
  const missing = getOblioEnvMissingKeys()
  if (missing.length > 0) {
    throw new BillingEnvError(missing)
  }
}

export function assertBillingEnvReady() {
  const missing = getBillingEnvMissingKeys()
  if (missing.length > 0) {
    throw new BillingEnvError(missing)
  }
}
