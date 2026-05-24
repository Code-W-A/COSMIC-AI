import "server-only"

import { Timestamp } from "firebase-admin/firestore"

import { getUserRef } from "@/lib/firebase/firestore"
import {
  getLimitForPlan,
  getNextMonthlyResetDate,
  shouldResetMonthlyUsage,
} from "@/lib/subscription/limits"
import type { SubscriptionPlan } from "@/types/subscription"
import type { UserDocument } from "@/types/user"

export class UsageUserMissingError extends Error {
  constructor(uid: string) {
    super(`User document not found for uid: ${uid}`)
    this.name = "UsageUserMissingError"
  }
}

export interface UsageIncrementResult {
  allowed: boolean
  remaining: number
  monthlyQuestionCount: number
  monthlyQuestionLimit: number
  reset: boolean
}

export async function incrementUsageForUser(uid: string): Promise<UsageIncrementResult> {
  const userRef = getUserRef(uid)

  return userRef.firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef)

    if (!snapshot.exists) {
      throw new UsageUserMissingError(uid)
    }

    const user = snapshot.data() as UserDocument
    const plan = (user.subscriptionPlan ?? "free") as SubscriptionPlan
    const monthlyQuestionLimit = getLimitForPlan(plan)
    const reset = shouldResetMonthlyUsage(user.monthlyUsageResetAt)
    const currentCount = reset ? 0 : user.monthlyQuestionCount ?? 0

    if (currentCount >= monthlyQuestionLimit) {
      return {
        allowed: false,
        remaining: 0,
        monthlyQuestionCount: currentCount,
        monthlyQuestionLimit,
        reset: false,
      }
    }

    const nextCount = currentCount + 1

    transaction.update(userRef, {
      monthlyQuestionCount: nextCount,
      monthlyQuestionLimit,
      monthlyUsageResetAt: reset
        ? Timestamp.fromDate(getNextMonthlyResetDate())
        : user.monthlyUsageResetAt,
      updatedAt: Timestamp.now(),
    })

    return {
      allowed: true,
      remaining: Math.max(monthlyQuestionLimit - nextCount, 0),
      monthlyQuestionCount: nextCount,
      monthlyQuestionLimit,
      reset,
    }
  })
}
