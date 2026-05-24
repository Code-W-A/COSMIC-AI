import type { FirestoreTimestampLike } from "@/types/user"
import type { SubscriptionPlan } from "@/types/subscription"

const limitsByPlan: Record<SubscriptionPlan, number> = {
  free: 5,
  premium: 120,
  cosmic_plus: 300,
}

export function getLimitForPlan(plan: SubscriptionPlan) {
  return limitsByPlan[plan] ?? limitsByPlan.free
}

function toDate(value: FirestoreTimestampLike | Date | string | number | null | undefined) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === "string" || typeof value === "number") return new Date(value)
  if (typeof value.toDate === "function") return value.toDate()
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000)
  return null
}

export function shouldResetMonthlyUsage(monthlyUsageResetAt: FirestoreTimestampLike | Date) {
  const resetDate = toDate(monthlyUsageResetAt)

  if (!resetDate) return true

  return resetDate.getTime() <= Date.now()
}

export function getNextMonthlyResetDate(from = new Date()) {
  const next = new Date(from)
  next.setMonth(next.getMonth() + 1)
  return next
}
