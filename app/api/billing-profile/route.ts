import { FieldValue } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import {
  getUserDocument,
  getUserRef,
  createUserDocumentIfMissing,
} from "@/lib/firebase/firestore"
import { logError, logInfo } from "@/lib/logging/logger"
import {
  getBillingProfilePayload,
  isBillingProfileComplete,
  validateBillingProfileInput,
} from "@/lib/billing/profile"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  try {
    await createUserDocumentIfMissing(user)
    const userDocument = await getUserDocument(user.uid)
    const profile = getBillingProfilePayload(userDocument)

    return successResponse({
      profile,
      isComplete: isBillingProfileComplete(userDocument?.billingProfile),
    })
  } catch (error) {
    await logError("billing.profile", "billing_profile_fetch_failed", {
      uid: user.uid,
      error,
    })

    return errorResponse(
      "billing_profile_fetch_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to load billing profile."
        : getErrorMessage(error),
      500
    )
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

  const input = validateBillingProfileInput(body)

  if (!input) {
    return errorResponse(
      "invalid_billing_profile",
      "All billing fields are required and email must be valid.",
      400
    )
  }

  try {
    await createUserDocumentIfMissing(user)

    const userRef = getUserRef(user.uid)
    const userDocument = await getUserDocument(user.uid)

    await userRef.set(
      {
        billingProfile: {
          ...input,
          isComplete: true,
          createdAt: userDocument?.billingProfile?.createdAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    await logInfo("billing.profile", "billing_profile_saved", {
      uid: user.uid,
      email: input.email,
    })

    return successResponse({
      profile: {
        ...input,
        isComplete: true,
      },
      isComplete: true,
    })
  } catch (error) {
    await logError("billing.profile", "billing_profile_save_failed", {
      uid: user.uid,
      error,
    })

    return errorResponse(
      "billing_profile_save_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to save billing profile."
        : getErrorMessage(error),
      500
    )
  }
}
