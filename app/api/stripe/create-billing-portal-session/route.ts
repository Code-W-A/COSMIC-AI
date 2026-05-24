import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { BillingEnvError, assertBillingEnvReady } from "@/lib/billing/env"
import { getUserDocument } from "@/lib/firebase/firestore"
import { logError, logInfo } from "@/lib/logging/logger"
import { getStripe } from "@/lib/stripe/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}

export async function POST(request: Request) {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  try {
    assertBillingEnvReady()
    const userDocument = await getUserDocument(user.uid)

    if (!userDocument?.stripeCustomerId) {
      return errorResponse(
        "stripe_customer_missing",
        "No billing profile was found yet. Start a subscription first.",
        400
      )
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: userDocument.stripeCustomerId,
      return_url: `${getAppUrl()}/account/subscription`,
    })

    await logInfo("stripe.portal", "billing_portal_session_created", {
      uid: user.uid,
      stripeCustomerId: userDocument.stripeCustomerId,
    })

    return successResponse({ url: session.url })
  } catch (error) {
    if (error instanceof BillingEnvError) {
      await logError("stripe.portal", "billing_env_invalid", {
        uid: user.uid,
        missingKeys: error.missingKeys,
      })
      return errorResponse(
        "billing_env_invalid",
        "Billing environment is not configured correctly.",
        500
      )
    }

    await logError("stripe.portal", "billing_portal_session_failed", {
      uid: user.uid,
      error,
    })

    return errorResponse(
      "billing_portal_session_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to open subscription management."
        : getErrorMessage(error),
      500
    )
  }
}
