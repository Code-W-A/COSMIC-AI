import { NextResponse } from "next/server"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { createUserDocumentIfMissing } from "@/lib/firebase/firestore"
import { logError, logInfo } from "@/lib/logging/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  try {
    const userCreated = await createUserDocumentIfMissing(user)

    await logInfo("auth", userCreated ? "user_created" : "user_already_exists", {
      uid: user.uid,
      email: user.email,
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
