import "server-only"

import type { DecodedIdToken } from "firebase-admin/auth"
import { NextResponse } from "next/server"

import { errorResponse } from "@/lib/api/responses"
import { requireUser, isAuthResponse } from "@/lib/auth/requireUser"
import { getUserDocument } from "@/lib/firebase/firestore"
import { isPremiumStatus } from "@/lib/subscription/subscription"

export async function requirePremium(
  request: Request
): Promise<DecodedIdToken | NextResponse> {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  const userDocument = await getUserDocument(user.uid)

  if (!userDocument || !isPremiumStatus(userDocument.subscriptionStatus)) {
    return errorResponse(
      "premium_required",
      "A premium subscription is required for this feature.",
      403
    )
  }

  return user
}
