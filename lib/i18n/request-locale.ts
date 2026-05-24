import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locale"

export function getRequestLocale(request: Request): Locale {
  const headerLocale = request.headers.get("x-locale")
  if (isLocale(headerLocale)) return headerLocale
  return DEFAULT_LOCALE
}

