import { errorResponse, successResponse } from "@/lib/api/responses"
import {
  isClientAnalyticsEvent,
  parseAnalyticsMetadata,
  type AnalyticsLocale,
} from "@/lib/analytics/events"
import { getAnalyticsRateLimitKey, isAnalyticsRateLimited } from "@/lib/analytics/rate-limit"
import { trackAnalyticsEvent } from "@/lib/analytics/track-server"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import { getRequestLocale } from "@/lib/i18n/request-locale"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const rateLimitKey = getAnalyticsRateLimitKey(request)

  if (isAnalyticsRateLimited(rateLimitKey)) {
    return errorResponse("rate_limited", "Too many analytics events.", 429)
  }

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return errorResponse("invalid_json", "Request body must be valid JSON.", 400)
  }

  const event = typeof body.event === "string" ? body.event : ""

  if (!isClientAnalyticsEvent(event)) {
    return errorResponse("invalid_analytics_event", "Unsupported analytics event.", 400)
  }

  const requestLocale = getRequestLocale(request)
  const metadata = parseAnalyticsMetadata(body.metadata)
  const locale: AnalyticsLocale = metadata.locale ?? (requestLocale === "ro" ? "ro" : "en")

  const user = await getCurrentUser(request)
  const uid = user?.uid

  await trackAnalyticsEvent(event, {
    ...metadata,
    locale,
    ...(uid ? { uid } : {}),
  })

  return successResponse()
}
