import { NextResponse } from "next/server"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getAccountDataSnapshot } from "@/lib/firebase/account-snapshot"
import { createUserDocumentIfMissing } from "@/lib/firebase/firestore"
import { trackAnalyticsEvent } from "@/lib/analytics/track-server"
import { logError, logInfo } from "@/lib/logging/logger"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import {
  applyReferralOnUserCreate,
  grantComplimentaryPartnerPremiumIfEligible,
  resolveReferralCodeFromRequest,
} from "@/lib/partners/attribution"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const locale = getRequestLocale(request)
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  const normalizedLocale: "ro" | "en" = locale === "ro" ? "ro" : "en"

  try {
    let body: Record<string, unknown> = {}
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      body = {}
    }

    const beforeBootstrap = await getAccountDataSnapshot(user.uid)
    const userCreated = await createUserDocumentIfMissing(user)
    const referralCode = resolveReferralCodeFromRequest(
      request,
      typeof body.referralCode === "string" ? body.referralCode : null
    )

    if (userCreated) {
      await applyReferralOnUserCreate({
        uid: user.uid,
        email: user.email,
        referralCode,
      })
    }

    await grantComplimentaryPartnerPremiumIfEligible(user)
    const afterBootstrap = await getAccountDataSnapshot(user.uid)

    if (userCreated) {
      await trackAnalyticsEvent("register_completed", {
        uid: user.uid,
        locale: normalizedLocale,
        source: "landing",
        referralCode: referralCode ?? undefined,
      })
    }

    await logInfo("auth", userCreated ? "user_created" : "user_already_exists", {
      uid: user.uid,
      email: user.email ?? null,
      authProvider: user.firebase?.sign_in_provider ?? null,
      userCreated,
      beforeBootstrap,
      afterBootstrap,
    })

    return successResponse({ userCreated }, userCreated ? 201 : 200)
  } catch (error) {
    await logError("auth", "auth_create_user_failed", {
      uid: user.uid,
      error,
    })

    return errorResponse(
      "auth_create_user_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to create your user profile."
        : getErrorMessage(error),
      500
    )
  }
}

export function GET() {
  return NextResponse.json(
    { success: false, error: { code: "method_not_allowed", message: "Method not allowed." } },
    { status: 405 }
  )
}
