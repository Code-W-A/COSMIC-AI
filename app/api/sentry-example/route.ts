import * as Sentry from "@sentry/nextjs"

import { errorResponse } from "@/lib/api/responses"
import { isSentryExamplePageEnabled } from "@/lib/sentry/example-page"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key")

  if (!isSentryExamplePageEnabled(key)) {
    return errorResponse("not_found", "Not found.", 404)
  }

  Sentry.captureException(new Error("Sentry example server error"))

  return errorResponse(
    "sentry_example_triggered",
    "Example server error sent to Sentry.",
    500
  )
}
