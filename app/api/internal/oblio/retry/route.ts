import { errorResponse, successResponse } from "@/lib/api/responses"
import { BillingEnvError, assertBillingEnvReady } from "@/lib/billing/env"
import { logError, logWarn } from "@/lib/logging/logger"
import { runPendingOblioRetries } from "@/lib/oblio/invoice"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getRetrySecret() {
  return process.env.OBLIO_RETRY_SECRET?.trim() || ""
}

export async function POST(request: Request) {
  try {
    assertBillingEnvReady()
  } catch (error) {
    if (error instanceof BillingEnvError) {
      await logError("oblio.retry", "billing_env_invalid", {
        missingKeys: error.missingKeys,
      })
      return errorResponse(
        "billing_env_invalid",
        "Billing environment is not configured correctly.",
        500
      )
    }
    throw error
  }

  const retrySecret = getRetrySecret()
  const providedSecret = request.headers.get("x-oblio-retry-secret")?.trim() || ""

  if (!retrySecret || providedSecret !== retrySecret) {
    await logWarn("oblio.retry", "oblio_retry_unauthorized", {
      hasSecret: Boolean(providedSecret),
    })

    return errorResponse("forbidden", "Forbidden", 403)
  }

  let limit = 20

  try {
    const body = await request.json().catch(() => null)
    if (body && typeof body === "object" && typeof (body as { limit?: unknown }).limit === "number") {
      const candidate = (body as { limit: number }).limit
      if (candidate >= 1 && candidate <= 100) {
        limit = candidate
      }
    }
  } catch {
    // Ignore invalid JSON; use defaults.
  }

  try {
    const result = await runPendingOblioRetries(limit)
    return successResponse(result)
  } catch (error) {
    await logError("oblio.retry", "oblio_retry_failed", {
      error,
    })
    return errorResponse("oblio_retry_failed", "Unable to process retries.", 500)
  }
}
