import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { BillingEnvError, assertStripeEnvReady } from "@/lib/billing/env"
import { isBillingProfileComplete } from "@/lib/billing/profile"
import {
  createUserDocumentIfMissing,
  getUserDocument,
  getUserRef,
} from "@/lib/firebase/firestore"
import { logError, logInfo } from "@/lib/logging/logger"
import { getOneOffPriceId, getSubscriptionPriceId } from "@/lib/stripe/prices"
import { getStripe } from "@/lib/stripe/server"
import type {
  BillingInterval,
  CheckoutType,
  PaidSubscriptionPlan,
  ReportSku,
} from "@/types/subscription"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getAppUrl(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = request.headers.get("host")
  const baseHost = forwardedHost ?? host

  if (baseHost) {
    const proto = forwardedProto ?? (baseHost.includes("localhost") ? "http" : "https")
    const requestUrl = `${proto}://${baseHost}`
    if (process.env.NODE_ENV !== "production") return requestUrl
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) return envUrl

  return "http://localhost:3000"
}

type SubscriptionCheckoutRequest = {
  checkoutType: "subscription"
  plan: "premium"
  interval: BillingInterval
}

type OneOffCheckoutRequest = {
  checkoutType: "one_off"
  sku: ReportSku
}

type CheckoutRequest = SubscriptionCheckoutRequest | OneOffCheckoutRequest

function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "annual"
}

function isCheckoutType(value: unknown): value is CheckoutType {
  return value === "subscription" || value === "one_off"
}

function isReportSku(value: unknown): value is ReportSku {
  return value === "relationship_report"
}

function isPaidSubscriptionPlan(value: unknown): value is PaidSubscriptionPlan {
  return value === "premium" || value === "cosmic_plus"
}

function getBillingSetupUrl(request: CheckoutRequest) {
  const params = new URLSearchParams()
  params.set("checkoutType", request.checkoutType)

  if (request.checkoutType === "subscription") {
    params.set("plan", request.plan)
    params.set("interval", request.interval)
  } else {
    params.set("sku", request.sku)
  }

  return `/billing/setup?${params.toString()}`
}

function parseCheckoutRequest(body: Record<string, unknown>): CheckoutRequest | null {
  if (!isCheckoutType(body.checkoutType)) {
    // Backward compatibility with old payload: { plan: "premium" }
    if (isPaidSubscriptionPlan(body.plan) && body.plan === "premium") {
      return {
        checkoutType: "subscription",
        plan: body.plan,
        interval: "monthly",
      }
    }

    return null
  }

  if (body.checkoutType === "subscription") {
    if (
      body.plan !== "premium" ||
      !isBillingInterval(body.interval)
    ) {
      return null
    }

    return {
      checkoutType: "subscription",
      plan: body.plan,
      interval: body.interval,
    }
  }

  if (!isReportSku(body.sku)) return null

  return {
    checkoutType: "one_off",
    sku: body.sku,
  }
}

export async function POST(request: Request) {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return errorResponse("invalid_json", "Request body must be valid JSON.", 400)
  }

  const checkoutRequest = parseCheckoutRequest(body)

  if (!checkoutRequest) {
    return errorResponse("invalid_checkout_request", "Provide a valid checkout payload.", 400)
  }

  try {
    assertStripeEnvReady()
    await createUserDocumentIfMissing(user)

    const stripe = getStripe()
    const userRef = getUserRef(user.uid)
    const userDocument = await getUserDocument(user.uid)

    if (!userDocument) {
      return errorResponse("user_not_found", "User profile was not found.", 404)
    }

    if (!isBillingProfileComplete(userDocument.billingProfile)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "billing_profile_required",
            message: "Complete billing details before starting checkout.",
          },
          setupUrl: getBillingSetupUrl(checkoutRequest),
        },
        { status: 409 }
      )
    }

    let stripeCustomerId = userDocument.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? userDocument.email,
        name: user.name ?? userDocument.displayName,
        metadata: {
          uid: user.uid,
        },
      })

      stripeCustomerId = customer.id

      await userRef.set(
        {
          stripeCustomerId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      await logInfo("stripe.checkout", "stripe_customer_created", {
        uid: user.uid,
        stripeCustomerId,
      })
    }

    const appUrl = getAppUrl(request)
    const baseMetadata: Record<string, string> = {
      uid: user.uid,
      checkoutType: checkoutRequest.checkoutType,
    }

    await logInfo("growth", "checkout_started", {
      uid: user.uid,
      checkoutType: checkoutRequest.checkoutType,
      plan: checkoutRequest.checkoutType === "subscription" ? checkoutRequest.plan : undefined,
      interval:
        checkoutRequest.checkoutType === "subscription" ? checkoutRequest.interval : undefined,
      sku: checkoutRequest.checkoutType === "one_off" ? checkoutRequest.sku : undefined,
    })

    const oneOffPriceId =
      checkoutRequest.checkoutType === "one_off"
        ? getOneOffPriceId(checkoutRequest.sku)
        : null

    const session =
      checkoutRequest.checkoutType === "subscription"
        ? await stripe.checkout.sessions.create({
            mode: "subscription",
            customer: stripeCustomerId,
            line_items: [
              {
                price: getSubscriptionPriceId(checkoutRequest.plan, checkoutRequest.interval),
                quantity: 1,
              },
            ],
            success_url: `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/pricing?checkout=cancelled`,
            metadata: {
              ...baseMetadata,
              plan: checkoutRequest.plan,
              interval: checkoutRequest.interval,
              reportType: "",
            },
            subscription_data: {
              metadata: {
                uid: user.uid,
                checkoutType: "subscription",
                plan: checkoutRequest.plan,
                interval: checkoutRequest.interval,
              },
            },
          })
        : await stripe.checkout.sessions.create({
            mode: "payment",
            customer: stripeCustomerId,
            line_items: [
              {
                price: oneOffPriceId as string,
                quantity: 1,
              },
            ],
            success_url: `${appUrl}/report?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/report?checkout=cancelled`,
            metadata: {
              ...baseMetadata,
              plan: "",
              interval: "",
              reportType: checkoutRequest.sku,
              sku: checkoutRequest.sku,
              priceId: oneOffPriceId ?? "",
            },
          })

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout Session URL.")
    }

    await logInfo("stripe.checkout", "checkout_session_created", {
      uid: user.uid,
      checkoutType: checkoutRequest.checkoutType,
      plan: checkoutRequest.checkoutType === "subscription" ? checkoutRequest.plan : undefined,
      interval:
        checkoutRequest.checkoutType === "subscription" ? checkoutRequest.interval : undefined,
      sku: checkoutRequest.checkoutType === "one_off" ? checkoutRequest.sku : undefined,
      checkoutSessionId: session.id,
    })

    return successResponse({ url: session.url })
  } catch (error) {
    if (error instanceof BillingEnvError) {
      await logError("stripe.checkout", "billing_env_invalid", {
        uid: user.uid,
        missingKeys: error.missingKeys,
      })
      return errorResponse(
        "billing_env_invalid",
        "Billing environment is not configured correctly.",
        500
      )
    }

    await logError("stripe.checkout", "checkout_session_failed", {
      uid: user.uid,
      checkoutRequest,
      error,
    })

    return errorResponse(
      "checkout_session_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to start checkout."
        : getErrorMessage(error),
      500
    )
  }
}
