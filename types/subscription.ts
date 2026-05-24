export const subscriptionStatuses = [
  "free",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "unpaid",
] as const

export type SubscriptionStatus = (typeof subscriptionStatuses)[number]

export const subscriptionPlans = ["free", "premium", "cosmic_plus"] as const

export type SubscriptionPlan = (typeof subscriptionPlans)[number]

export type PaidSubscriptionPlan = Exclude<SubscriptionPlan, "free">
export type BillingInterval = "monthly" | "annual"
export type CheckoutType = "subscription" | "one_off"
export type ReportSku = "relationship_report"

export interface SubscriptionStatusResponse {
  subscriptionStatus: SubscriptionStatus
  subscriptionPlan: SubscriptionPlan
  billingInterval?: BillingInterval | null
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
  isInGrace: boolean
  graceUntil?: string | null
  graceReason?: string | null
  monthlyQuestionCount: number
  monthlyQuestionLimit: number
  isPremium: boolean
}
