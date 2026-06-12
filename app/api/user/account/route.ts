import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { deleteUserAccountFully } from "@/lib/firebase/delete-user"
import { getUserDocument } from "@/lib/firebase/firestore"
import { logError, logInfo } from "@/lib/logging/logger"
import { isPremiumStatus } from "@/lib/subscription/subscription"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(request: Request) {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  try {
    const userDocument = await getUserDocument(user.uid)

    if (!userDocument) {
      return errorResponse("user_not_found", "User profile was not found.", 404)
    }

    if (
      isPremiumStatus(userDocument.subscriptionStatus) &&
      !userDocument.cancelAtPeriodEnd
    ) {
      return errorResponse(
        "active_subscription_blocks_delete",
        "Cancel your active subscription before deleting your account.",
        403
      )
    }

    await logInfo("account", "account.delete_started", {
      uid: user.uid,
      email: user.email ?? null,
      authProvider: user.firebase?.sign_in_provider ?? null,
      subscriptionStatus: userDocument.subscriptionStatus,
    })
    await deleteUserAccountFully(user.uid)

    return successResponse()
  } catch (error) {
    await logError("account", "account.delete_failed", { uid: user.uid, error })

    return errorResponse(
      "account_delete_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to delete your account right now."
        : getErrorMessage(error),
      500
    )
  }
}
