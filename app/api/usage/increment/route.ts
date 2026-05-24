import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { logError, logInfo, logWarn } from "@/lib/logging/logger"
import { incrementUsageForUser, UsageUserMissingError } from "@/lib/subscription/usage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  try {
    const result = await incrementUsageForUser(user.uid)

    if (!result.allowed) {
      await logWarn("usage", "usage_limit_reached", {
        uid: user.uid,
        monthlyQuestionLimit: result.monthlyQuestionLimit,
      })

      await logInfo("growth", "paywall_viewed", {
        uid: user.uid,
        source: "usage_increment",
        monthlyQuestionLimit: result.monthlyQuestionLimit,
      })

      return Response.json(
        {
          success: false,
          error: {
            code: "usage_limit_reached",
            message: "You have reached your monthly free question limit.",
          },
          allowed: false,
          upgradeRequired: true,
          message: "You have reached your monthly free question limit.",
        },
        { status: 403 }
      )
    }

    if (result.reset) {
      await logInfo("usage", "usage_reset", {
        uid: user.uid,
        monthlyQuestionLimit: result.monthlyQuestionLimit,
      })
    }

    await logInfo("usage", "usage_incremented", {
      uid: user.uid,
      monthlyQuestionCount: result.monthlyQuestionCount,
      monthlyQuestionLimit: result.monthlyQuestionLimit,
    })

    return successResponse({
      allowed: true,
      remaining: result.remaining,
    })
  } catch (error) {
    if (error instanceof UsageUserMissingError) {
      return errorResponse("user_not_found", "User profile was not found.", 404)
    }

    await logError("usage", "usage_increment_failed", { uid: user.uid, error })

    return errorResponse(
      "usage_increment_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to update usage."
        : getErrorMessage(error),
      500
    )
  }
}
