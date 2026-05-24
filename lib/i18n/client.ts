"use client"

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  getLocaleFromPathname,
  isLocale,
  stripLocalePrefix,
  withLocalePath,
  type Locale,
} from "@/lib/i18n/locale"
import { translate } from "@/lib/i18n/messages"

function getCookieLocale() {
  if (typeof document === "undefined") return null
  const chunk = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${LOCALE_COOKIE_NAME}=`))
  if (!chunk) return null
  const [, value = ""] = chunk.split("=")
  return isLocale(value) ? value : null
}

export function resolveClientLocale(pathname: string): Locale {
  return getLocaleFromPathname(pathname) ?? getCookieLocale() ?? DEFAULT_LOCALE
}

export function useCurrentLocale() {
  const pathname = usePathname()
  return resolveClientLocale(pathname)
}

export function useTranslations() {
  const locale = useCurrentLocale()
  return useMemo(() => ({ locale, t: (key: string) => translate(locale, key) }), [locale])
}

export function useLocalizedPath() {
  const locale = useCurrentLocale()
  return (path: string) => withLocalePath(path, locale)
}

export function useLocaleSwitcher() {
  const pathname = usePathname()
  const router = useRouter()
  const locale = useCurrentLocale()

  function switchLocale(nextLocale: Locale) {
    if (nextLocale === locale) return
    if (typeof document !== "undefined") {
      document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`
    }

    const currentBase = stripLocalePrefix(pathname)
    const query = typeof window !== "undefined" ? window.location.search.slice(1) : ""
    const hash = typeof window !== "undefined" ? window.location.hash : ""
    const nextPath = withLocalePath(currentBase, nextLocale)
    const target = `${nextPath}${query ? `?${query}` : ""}${hash}`

    router.push(target)
  }

  return { locale, switchLocale }
}
