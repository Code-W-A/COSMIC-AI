import {
  getEffectivePlanForStatus,
  isGraceEligibleStatus,
  isPremiumStatus,
  normalizeStripeSubscriptionStatus,
} from "@/lib/subscription/subscription"
import { getSubscriptionCatalogFromPriceId } from "@/lib/stripe/prices"
import type { BillingInterval, SubscriptionPlan } from "@/types/subscription"

export interface StripeSubscriptionStateInput {
  status: string
  deleted?: boolean
  cancelAtPeriodEnd?: boolean
  metadataPlan?: string | null
  metadataInterval?: string | null
  priceId?: string | null
  recurringInterval?: string | null
  currentPeriodEndSeconds?: number | null
  existingGraceUntilMs?: number | null
  nowMs?: number
}

export interface ResolvedStripeSubscriptionState {
  stripeStatus: string
  subscriptionStatus: ReturnType<typeof normalizeStripeSubscriptionStatus>
  subscriptionPlan: SubscriptionPlan
  billingInterval: BillingInterval | null
  currentPeriodEndSeconds: number | null
  cancelAtPeriodEnd: boolean
  shouldClearGrace: boolean
  isInGrace: boolean
  keepPaidPlanViaGrace: boolean
  priceId: string | null
}

function resolveBillingInterval(input: StripeSubscriptionStateInput): BillingInterval | null {
  if (input.deleted) return null
  if (input.recurringInterval === "month") return "monthly"
  if (input.recurringInterval === "year") return "annual"
  if (input.metadataInterval === "monthly" || input.metadataInterval === "annual") {
    return input.metadataInterval
  }
  return getSubscriptionCatalogFromPriceId(input.priceId).interval
}

function resolveStripePlan(
  input: StripeSubscriptionStateInput,
  subscriptionStatus: ReturnType<typeof normalizeStripeSubscriptionStatus>
): SubscriptionPlan {
  const catalogPlan = getSubscriptionCatalogFromPriceId(input.priceId).plan
  if (catalogPlan !== "free") return catalogPlan

  if (input.metadataPlan === "premium" || input.metadataPlan === "cosmic_plus") {
    return input.metadataPlan
  }

  if (isPremiumStatus(subscriptionStatus)) {
    return "premium"
  }

  return "free"
}

export function resolveStripeSubscriptionState(
  input: StripeSubscriptionStateInput
): ResolvedStripeSubscriptionState {
  const deleted = input.deleted ?? false
  const stripeStatus = deleted ? "canceled" : input.status
  const subscriptionStatus = normalizeStripeSubscriptionStatus(stripeStatus)
  const stripePlan = resolveStripePlan(input, subscriptionStatus)
  const billingInterval = resolveBillingInterval(input)
  const nowMs = input.nowMs ?? Date.now()
  const graceUntilMs = input.existingGraceUntilMs ?? null
  const isInGrace = typeof graceUntilMs === "number" && graceUntilMs > nowMs
  const keepPaidPlanViaGrace =
    !deleted && stripePlan !== "free" && isGraceEligibleStatus(subscriptionStatus) && isInGrace
  const hasPremiumStatus = isPremiumStatus(subscriptionStatus)
  const subscriptionPlan = deleted
    ? "free"
    : hasPremiumStatus || keepPaidPlanViaGrace
      ? stripePlan
      : getEffectivePlanForStatus(subscriptionStatus, stripePlan)
  const shouldClearGrace =
    deleted ||
    hasPremiumStatus ||
    stripeStatus === "canceled" ||
    (typeof graceUntilMs === "number" && graceUntilMs <= nowMs)

  return {
    stripeStatus,
    subscriptionStatus,
    subscriptionPlan,
    billingInterval,
    currentPeriodEndSeconds: input.currentPeriodEndSeconds ?? null,
    cancelAtPeriodEnd: deleted ? false : Boolean(input.cancelAtPeriodEnd),
    shouldClearGrace,
    isInGrace,
    keepPaidPlanViaGrace,
    priceId: input.priceId ?? null,
  }
}
