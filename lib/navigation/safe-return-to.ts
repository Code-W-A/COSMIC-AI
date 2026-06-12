const ALLOWED_LOCALES = new Set(["en", "ro"])

export function getSafeReturnToPath(value: string | null | undefined) {
  if (!value) return null

  const trimmed = value.trim()
  if (!trimmed.startsWith("/")) return null

  const pathOnly = trimmed.split("?")[0]?.split("#")[0] ?? ""
  const segments = pathOnly.split("/").filter(Boolean)
  if (segments.length === 0) return null

  const [locale, ...rest] = segments
  if (!ALLOWED_LOCALES.has(locale)) return null

  const allowedRoots = new Set(["chat", "account", "onboarding", "pricing", "report"])
  if (!allowedRoots.has(rest[0] ?? "")) return null

  return trimmed
}
