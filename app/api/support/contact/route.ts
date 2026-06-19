import { z } from "zod"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { sendSupportEmail, SupportEmailNotConfiguredError } from "@/lib/email/send-support-email"
import { getCosmicProfile } from "@/lib/firebase/firestore"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { logError, logInfo } from "@/lib/logging/logger"
import { contactTopicValues } from "@/lib/support/contact-topics"
import { isContactRateLimited } from "@/lib/support/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const contactRequestSchema = z.object({
  topic: z.enum(contactTopicValues),
  message: z.string().trim().min(10).max(2000),
})

export async function POST(request: Request) {
  const authResult = await requireUser(request)
  if (isAuthResponse(authResult)) {
    return authResult
  }

  const user = authResult

  if (isContactRateLimited(user.uid)) {
    return errorResponse(
      "contact_rate_limited",
      "Too many support messages. Please try again later.",
      429
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse("invalid_json", "Request body must be valid JSON.", 400)
  }

  const parsed = contactRequestSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse("invalid_contact_request", "Provide a valid topic and message.", 400)
  }

  const requestLocale = getRequestLocale(request)
  const locale = requestLocale === "ro" ? "ro" : "en"
  const userEmail = user.email?.trim()

  if (!userEmail) {
    return errorResponse("invalid_contact_request", "Your account must have an email address.", 400)
  }

  let userName = user.name?.trim() || userEmail

  try {
    const profile = await getCosmicProfile(user.uid)
    if (profile?.name?.trim()) {
      userName = profile.name.trim()
    }
  } catch (error) {
    await logError("support", "contact_profile_lookup_failed", {
      uid: user.uid,
      error: getErrorMessage(error),
    })
  }

  try {
    await sendSupportEmail({
      topic: parsed.data.topic,
      message: parsed.data.message,
      userEmail,
      userName,
      userId: user.uid,
      locale,
    })

    await logInfo("support", "contact_message_sent", {
      uid: user.uid,
      topic: parsed.data.topic,
    })

    return successResponse({ sent: true })
  } catch (error) {
    if (error instanceof SupportEmailNotConfiguredError) {
      await logError("support", "contact_not_configured", { uid: user.uid })
      return errorResponse(
        "contact_not_configured",
        "Support email is not configured on the server.",
        503
      )
    }

    await logError("support", "contact_send_failed", {
      uid: user.uid,
      topic: parsed.data.topic,
      error: getErrorMessage(error),
    })

    return errorResponse(
      "contact_send_failed",
      "Unable to send your message right now. Please try again later.",
      500
    )
  }
}
