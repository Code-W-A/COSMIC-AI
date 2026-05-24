import type { SubscriptionPlan, SubscriptionStatus } from "@/types/subscription"

export const SUBSCRIPTION_GRACE_DAYS = 7
export const SUBSCRIPTION_GRACE_REASON_INVOICE_PAYMENT_FAILED = "invoice_payment_failed"

export function isPremiumStatus(status?: SubscriptionStatus | null) {
  return status === "active" || status === "trialing"
}

export function isGraceEligibleStatus(status: SubscriptionStatus) {
  return status === "past_due" || status === "unpaid" || status === "incomplete"
}

export function normalizeStripeSubscriptionStatus(status: string): SubscriptionStatus {
  if (status === "active") return "active"
  if (status === "trialing") return "trialing"
  if (status === "past_due") return "past_due"
  if (status === "canceled") return "canceled"
  if (status === "unpaid") return "unpaid"
  if (status === "incomplete") return "incomplete"

  return "incomplete"
}

export function getEffectivePlanForStatus(
  status: SubscriptionStatus,
  plan: SubscriptionPlan
): SubscriptionPlan {
  return isPremiumStatus(status) ? plan : "free"
}
