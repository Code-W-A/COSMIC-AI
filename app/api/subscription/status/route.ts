import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getUserDocument } from "@/lib/firebase/firestore"
import { logError, logInfo } from "@/lib/logging/logger"
import { isPremiumStatus } from "@/lib/subscription/subscription"
import type { FirestoreTimestampLike } from "@/types/user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function timestampToIso(value?: FirestoreTimestampLike | null) {
  if (!value) return null
  if (typeof value.toDate === "function") return value.toDate().toISOString()
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000).toISOString()
  return null
}

function timestampToMillis(value?: FirestoreTimestampLike | null) {
  if (!value) return null
  if (typeof value.toDate === "function") return value.toDate().getTime()
  if (typeof value.seconds === "number") return value.seconds * 1000
  return null
}

export async function GET(request: Request) {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  try {
    const userDocument = await getUserDocument(user.uid)

    if (!userDocument) {
      return errorResponse("user_not_found", "User profile was not found.", 404)
    }

    await logInfo("subscription", "subscription_status_checked", { uid: user.uid })

    const graceUntilIso = timestampToIso(userDocument.graceUntil)
    const graceUntilMs = timestampToMillis(userDocument.graceUntil)
    const isInGrace = typeof graceUntilMs === "number" && graceUntilMs > Date.now()
    const isPremium =
      isPremiumStatus(userDocument.subscriptionStatus) ||
      (isInGrace && userDocument.subscriptionPlan !== "free")

    return successResponse({
      subscriptionStatus: userDocument.subscriptionStatus,
      subscriptionPlan: userDocument.subscriptionPlan,
      billingInterval: userDocument.subscriptionInterval ?? null,
      currentPeriodEnd: timestampToIso(userDocument.currentPeriodEnd),
      cancelAtPeriodEnd: userDocument.cancelAtPeriodEnd ?? false,
      isInGrace,
      graceUntil: graceUntilIso,
      graceReason: userDocument.graceReason ?? null,
      monthlyQuestionCount: userDocument.monthlyQuestionCount ?? 0,
      monthlyQuestionLimit: userDocument.monthlyQuestionLimit ?? 5,
      isPremium,
    })
  } catch (error) {
    await logError("subscription", "subscription_status_failed", {
      uid: user.uid,
      error,
    })

    return errorResponse(
      "subscription_status_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to load subscription status."
        : getErrorMessage(error),
      500
    )
  }
}
