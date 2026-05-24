export const SUPPORTED_LOCALES = ["ro", "en"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "ro"
export const LOCALE_COOKIE_NAME = "cosmic_locale"

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && SUPPORTED_LOCALES.includes(value as Locale))
}

export function getLocaleFromPathname(pathname: string): Locale | null {
  const [segment] = pathname.split("/").filter(Boolean)
  return isLocale(segment) ? segment : null
}

export function stripLocalePrefix(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean)
  if (!parts.length) return "/"
  if (isLocale(parts[0])) {
    const next = `/${parts.slice(1).join("/")}`
    return next === "/" ? "/" : next.replace(/\/+$/, "")
  }
  return pathname === "/" ? "/" : pathname.replace(/\/+$/, "")
}

export function withLocalePath(pathname: string, locale: Locale): string {
  const stripped = stripLocalePrefix(pathname)
  if (stripped === "/") return `/${locale}`
  return `/${locale}${stripped}`
}

export function getLocaleFromCookieHeader(cookieHeader: string | null): Locale | null {
  if (!cookieHeader) return null
  const chunk = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${LOCALE_COOKIE_NAME}=`))

  if (!chunk) return null
  const [, value = ""] = chunk.split("=")
  return isLocale(value) ? value : null
}

export function detectLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null
  const normalized = acceptLanguage.toLowerCase()
  if (normalized.includes("ro")) return "ro"
  if (normalized.includes("en")) return "en"
  return null
}

export function resolvePreferredLocale({
  cookieHeader,
  acceptLanguage,
}: {
  cookieHeader: string | null
  acceptLanguage: string | null
}): Locale {
  return (
    getLocaleFromCookieHeader(cookieHeader) ??
    detectLocaleFromAcceptLanguage(acceptLanguage) ??
    DEFAULT_LOCALE
  )
}

export function localeToLanguageLabel(locale: Locale) {
  return locale.toUpperCase()
}

