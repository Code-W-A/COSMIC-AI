import type {
  BillingInterval,
  PaidSubscriptionPlan,
  ReportSku,
  SubscriptionPlan,
} from "@/types/subscription"

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

const oneOffCatalog: Record<ReportSku, string[]> = {
  relationship_report: ["STRIPE_PRICE_REPORT_ONEOFF_RON"],
}

function getEnvValue(name: string) {
  const value = process.env[name]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function getSubscriptionPriceId(plan: PaidSubscriptionPlan, interval: BillingInterval) {
  const candidates = subscriptionCatalog.filter(
    (entry) => entry.plan === plan && entry.interval === interval
  )

  for (const candidate of candidates) {
    const value = getEnvValue(candidate.envName)
    if (value) return value
  }

  const missing = candidates.map((candidate) => candidate.envName).join(" or ")
  throw new Error(
    `Missing required environment variable for ${plan} ${interval}: ${missing || "unknown"}`
  )
}

export function getOneOffPriceId(sku: ReportSku) {
  const envNames = oneOffCatalog[sku] ?? []

  for (const envName of envNames) {
    const value = getEnvValue(envName)
    if (value) return value
  }

  throw new Error(
    `Missing required environment variable for one-off SKU "${sku}": ${envNames.join(" or ")}`
  )
}

export function getSubscriptionCatalogFromPriceId(priceId?: string | null): {
  plan: SubscriptionPlan
  interval: BillingInterval | null
} {
  if (!priceId) return { plan: "free", interval: null }

  for (const entry of subscriptionCatalog) {
    const value = getEnvValue(entry.envName)
    if (value && value === priceId) {
      return {
        plan: entry.plan,
        interval: entry.interval,
      }
    }
  }

  return { plan: "free", interval: null }
}

export function getReportSkuFromPriceId(priceId?: string | null): ReportSku | null {
  if (!priceId) return null

  for (const [sku, envNames] of Object.entries(oneOffCatalog) as [ReportSku, string[]][]) {
    for (const envName of envNames) {
      const value = getEnvValue(envName)
      if (value && value === priceId) return sku
    }
  }

  return null
}

export function isPaidPlan(value: unknown): value is PaidSubscriptionPlan {
  return value === "premium" || value === "cosmic_plus"
}
