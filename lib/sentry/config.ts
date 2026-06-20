import type { ErrorEvent, Event } from "@sentry/nextjs"

const sensitiveKeyPattern = /(authorization|token|secret|private|password|card|payment|key)/i

const ignoredErrorPatterns = [
  /^ResizeObserver loop/i,
  /^Loading chunk [\d]+ failed/i,
  /^ChunkLoadError/i,
  /^Failed to fetch dynamically imported module/i,
]

export function getSentryDsn() {
  return process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || process.env.SENTRY_DSN?.trim() || ""
}

function isSentryDebugEnabled() {
  return process.env.SENTRY_DEBUG === "1" || process.env.NEXT_PUBLIC_SENTRY_DEBUG === "1"
}

export function isSentryEnabled() {
  if (process.env.E2E_MOCK_EXTERNALS === "1") return false
  if (process.env.NODE_ENV !== "production" && !isSentryDebugEnabled()) return false
  return Boolean(getSentryDsn())
}

export function getSentryEnvironment() {
  return (
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.VERCEL_ENV?.trim() ||
    process.env.NODE_ENV ||
    "development"
  )
}

function scrubObject(value: Record<string, unknown>) {
  const scrubbed: Record<string, unknown> = {}

  for (const [key, entry] of Object.entries(value)) {
    if (sensitiveKeyPattern.test(key)) continue
    scrubbed[key] = entry
  }

  return scrubbed
}

function scrubEvent(event: Event) {
  if (event.request?.headers) {
    delete event.request.headers.authorization
    delete event.request.headers.cookie
    delete event.request.headers.Authorization
    delete event.request.headers.Cookie
  }

  if (event.extra && typeof event.extra === "object") {
    event.extra = scrubObject(event.extra as Record<string, unknown>)
  }

  if (event.contexts && typeof event.contexts === "object") {
    event.contexts = scrubObject(event.contexts as Record<string, unknown>)
  }

  return event
}

export function beforeSend(event: ErrorEvent) {
  const message = event.message ?? event.exception?.values?.[0]?.value ?? ""

  if (ignoredErrorPatterns.some((pattern) => pattern.test(message))) {
    return null
  }

  return scrubEvent(event)
}

export function getSharedSentryOptions() {
  return {
    dsn: getSentryDsn(),
    enabled: isSentryEnabled(),
    environment: getSentryEnvironment(),
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    beforeSend,
    ignoreErrors: ignoredErrorPatterns.map((pattern) => pattern.source),
  } as const
}
