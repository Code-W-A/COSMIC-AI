import type {
  BillingInterval,
  PaidSubscriptionPlan,
  ReportSku,
  SubscriptionPlan,
} from "@/types/subscription"

export type PricingMode = "standard" | "live_test"

type SubscriptionCatalogEntry = {
  plan: PaidSubscriptionPlan
  interval: BillingInterval
  envName: string
}

const subscriptionCatalog: SubscriptionCatalogEntry[] = [
  { plan: "premium", interval: "monthly", envName: "STRIPE_PRICE_PREMIUM_MONTHLY_RON" },
  { plan: "premium", interval: "annual", envName: "STRIPE_PRICE_PREMIUM_ANNUAL_RON" },
  // Legacy fallback for existing setups while migrating to RON catalog.
  { plan: "premium", interval: "monthly", envName: "STRIPE_PRICE_PREMIUM_MONTHLY" },
  { plan: "cosmic_plus", interval: "monthly", envName: "STRIPE_PRICE_COSMIC_PLUS_MONTHLY" },
]

const liveTestSubscriptionCatalog: SubscriptionCatalogEntry[] = [
  {
    plan: "premium",
    interval: "monthly",
    envName: "STRIPE_PRICE_PREMIUM_MONTHLY_RON_LIVE_TEST",
  },
  {
    plan: "premium",
    interval: "annual",
    envName: "STRIPE_PRICE_PREMIUM_ANNUAL_RON_LIVE_TEST",
  },
]

const oneOffCatalog: Record<ReportSku, string[]> = {
  relationship_report: ["STRIPE_PRICE_REPORT_ONEOFF_RON"],
}

const liveTestOneOffCatalog: Record<ReportSku, string[]> = {
  relationship_report: ["STRIPE_PRICE_REPORT_ONEOFF_RON_LIVE_TEST"],
}

function getEnvValue(name: string) {
  const value = process.env[name]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function resolvePriceIdFromCatalog(
  catalog: SubscriptionCatalogEntry[],
  plan: PaidSubscriptionPlan,
  interval: BillingInterval
) {
  const candidates = catalog.filter((entry) => entry.plan === plan && entry.interval === interval)

  for (const candidate of candidates) {
    const value = getEnvValue(candidate.envName)
    if (value) return value
  }

  const missing = candidates.map((candidate) => candidate.envName).join(" or ")
  throw new Error(
    `Missing required environment variable for ${plan} ${interval}: ${missing || "unknown"}`
  )
}

function resolveOneOffPriceIdFromCatalog(catalog: Record<ReportSku, string[]>, sku: ReportSku) {
  const envNames = catalog[sku] ?? []

  for (const envName of envNames) {
    const value = getEnvValue(envName)
    if (value) return value
  }

  throw new Error(
    `Missing required environment variable for one-off SKU "${sku}": ${envNames.join(" or ")}`
  )
}

export function getSubscriptionPriceId(
  plan: PaidSubscriptionPlan,
  interval: BillingInterval,
  mode: PricingMode = "standard"
) {
  const catalog = mode === "live_test" ? liveTestSubscriptionCatalog : subscriptionCatalog
  return resolvePriceIdFromCatalog(catalog, plan, interval)
}

export function getOneOffPriceId(sku: ReportSku, mode: PricingMode = "standard") {
  const catalog = mode === "live_test" ? liveTestOneOffCatalog : oneOffCatalog
  return resolveOneOffPriceIdFromCatalog(catalog, sku)
}

function lookupSubscriptionCatalogFromPriceId(catalog: SubscriptionCatalogEntry[], priceId: string) {
  for (const entry of catalog) {
    const value = getEnvValue(entry.envName)
    if (value && value === priceId) {
      return {
        plan: entry.plan,
        interval: entry.interval,
      }
    }
  }

  return null
}

function lookupReportSkuFromPriceId(
  catalog: Record<ReportSku, string[]>,
  priceId: string
): ReportSku | null {
  for (const [sku, envNames] of Object.entries(catalog) as [ReportSku, string[]][]) {
    for (const envName of envNames) {
      const value = getEnvValue(envName)
      if (value && value === priceId) return sku
    }
  }

  return null
}

export function getSubscriptionCatalogFromPriceId(priceId?: string | null): {
  plan: SubscriptionPlan
  interval: BillingInterval | null
} {
  if (!priceId) return { plan: "free", interval: null }

  const standardMatch = lookupSubscriptionCatalogFromPriceId(subscriptionCatalog, priceId)
  if (standardMatch) return standardMatch

  const liveTestMatch = lookupSubscriptionCatalogFromPriceId(liveTestSubscriptionCatalog, priceId)
  if (liveTestMatch) return liveTestMatch

  return { plan: "free", interval: null }
}

export function getReportSkuFromPriceId(priceId?: string | null): ReportSku | null {
  if (!priceId) return null

  return (
    lookupReportSkuFromPriceId(oneOffCatalog, priceId) ??
    lookupReportSkuFromPriceId(liveTestOneOffCatalog, priceId)
  )
}

export function isPaidPlan(value: unknown): value is PaidSubscriptionPlan {
  return value === "premium" || value === "cosmic_plus"
}
