import "server-only"

import * as Sentry from "@sentry/nextjs"

import { isSentryEnabled } from "@/lib/sentry/config"

type ReportMetadata = Record<string, unknown> & { uid?: string }

const sensitiveKeyPattern = /(authorization|token|secret|private|password|card|payment|key)/i

const ignoredMetadataCodes = new Set([
  "unauthenticated",
  "usage_limit_reached",
  "upgrade_required",
  "profile_incomplete",
  "invalid_json",
  "invalid_contact_request",
  "contact_rate_limited",
  "method_not_allowed",
])

const ignoredLogMessages = new Set([
  "firebase_token_verification_failed",
  "stripe_webhook_verification_failed",
])

function sanitizeMetadata(metadata?: ReportMetadata) {
  if (!metadata) return undefined

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (key === "uid") continue
    if (sensitiveKeyPattern.test(key)) continue

    if (value instanceof Error) {
      sanitized[key] = {
        name: value.name,
        message: value.message,
      }
      continue
    }

    sanitized[key] = value
  }

  return sanitized
}

function shouldIgnoreReport(scope: string, message: string, metadata?: ReportMetadata) {
  if (ignoredLogMessages.has(message)) return true

  const code = typeof metadata?.code === "string" ? metadata.code : null
  if (code && ignoredMetadataCodes.has(code)) return true

  if (scope === "auth" && message === "firebase_token_verification_failed") return true

  return false
}

export async function reportErrorToSentry(
  scope: string,
  message: string,
  metadata?: ReportMetadata
) {
  if (!isSentryEnabled()) return
  if (shouldIgnoreReport(scope, message, metadata)) return

  try {
    const extra = sanitizeMetadata(metadata)
    const uid = typeof metadata?.uid === "string" ? metadata.uid : undefined
    const tags = { scope, logMessage: message }

    Sentry.withScope((sentryScope) => {
      sentryScope.setTags(tags)
      if (uid) sentryScope.setUser({ id: uid })
      if (extra) sentryScope.setExtras(extra)

      const errorValue = metadata?.error
      if (errorValue instanceof Error) {
        Sentry.captureException(errorValue)
        return
      }

      Sentry.captureMessage(message, {
        level: "error",
      })
    })
  } catch {
    // Never let Sentry reporting break the app.
  }
}
