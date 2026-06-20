export function isSentryExamplePageEnabled(providedSecret?: string | null) {
  if (process.env.SENTRY_DEBUG === "1" || process.env.NEXT_PUBLIC_SENTRY_DEBUG === "1") {
    return true
  }

  const configuredSecret = process.env.SENTRY_EXAMPLE_SECRET?.trim()
  if (!configuredSecret) return false

  return Boolean(providedSecret?.trim()) && providedSecret.trim() === configuredSecret
}
