import { NextResponse, type NextRequest } from "next/server"

import {
  LOCALE_COOKIE_NAME,
  getLocaleFromPathname,
  resolvePreferredLocale,
  withLocalePath,
} from "@/lib/i18n/locale"

function shouldBypass(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (shouldBypass(pathname)) return NextResponse.next()

  const urlLocale = getLocaleFromPathname(pathname)

  if (urlLocale) {
    const response = NextResponse.next()
    response.cookies.set(LOCALE_COOKIE_NAME, urlLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    })
    return response
  }

  const locale = resolvePreferredLocale({
    cookieHeader: request.headers.get("cookie"),
    acceptLanguage: request.headers.get("accept-language"),
  })
  const target = request.nextUrl.clone()
  target.pathname = withLocalePath(pathname, locale)

  const response = NextResponse.redirect(target)
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
  return response
}

export const config = {
  matcher: ["/((?!_next|api).*)"],
}

