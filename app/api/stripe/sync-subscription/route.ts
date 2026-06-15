import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { BillingEnvError, assertStripeEnvReady } from "@/lib/billing/env"
import { logError, logInfo } from "@/lib/logging/logger"
import {
  syncCheckoutSessionForUid,
  syncLatestSubscriptionForUid,
} from "@/lib/stripe/sync-subscription"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  try {
    assertStripeEnvReady()
  } catch (error) {
    if (error instanceof BillingEnvError) {
      return errorResponse(
        "billing_env_invalid",
        "Billing environment is not configured correctly.",
        500
      )
    }
    throw error
  }

  let body: Record<string, unknown> = {}

  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""

  try {
    await logInfo("stripe.sync", "subscription_sync_requested", {
      uid: user.uid,
      hasSessionId: Boolean(sessionId),
    })

    const result = sessionId
      ? await syncCheckoutSessionForUid(user.uid, sessionId)
      : await syncLatestSubscriptionForUid(user.uid)

    if (!result) {
      return errorResponse(
        "subscription_sync_failed",
        "Unable to match the Stripe subscription to your account.",
        404
      )
    }

    return successResponse({
      synced: true,
      subscriptionStatus: result.subscriptionStatus,
      subscriptionPlan: result.subscriptionPlan,
      billingInterval: result.billingInterval,
    })
  } catch (error) {
    const message = getErrorMessage(error)

    await logError("stripe.sync", "subscription_sync_failed", {
      uid: user.uid,
      sessionId: sessionId || null,
      error: message,
    })

    if (message === "checkout_session_uid_mismatch" || message === "checkout_session_customer_mismatch") {
      return errorResponse("checkout_session_forbidden", "This checkout session does not belong to your account.", 403)
    }

    if (message === "checkout_session_missing_subscription") {
      return errorResponse("checkout_session_invalid", "This checkout session has no subscription.", 400)
    }

    if (message === "stripe_customer_missing" || message === "stripe_subscription_missing") {
      return errorResponse("stripe_subscription_missing", "No Stripe subscription was found for your account.", 404)
    }

    if (message === "user_not_found") {
      return errorResponse("user_not_found", "User profile was not found.", 404)
    }

    return errorResponse(
      "subscription_sync_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to sync subscription status."
        : message,
      500
    )
  }
}
