import { NextResponse, type NextRequest } from "next/server"

import {
  LOCALE_COOKIE_NAME,
  getLocaleFromPathname,
  resolvePreferredLocale,
  withLocalePath,
} from "@/lib/i18n/locale"
import {
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
  REFERRAL_QUERY_PARAM,
  getReferralCodeFromSearchParams,
  parseReferralCodeFromPathname,
} from "@/lib/partners/codes"

function shouldBypass(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname === "/sentry-example-page" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  )
}

function applyReferralCookie(request: NextRequest, response: NextResponse) {
  const fromPath = parseReferralCodeFromPathname(request.nextUrl.pathname)
  const fromQuery = getReferralCodeFromSearchParams(request.nextUrl.searchParams)
  const referralCode = fromPath ?? fromQuery
  if (!referralCode) return response
  if (request.cookies.get(REFERRAL_COOKIE_NAME)?.value) return response

  response.cookies.set(REFERRAL_COOKIE_NAME, referralCode, {
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
  })
  return response
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (shouldBypass(pathname)) return NextResponse.next()

  const pathReferralCode = parseReferralCodeFromPathname(pathname)
  if (pathReferralCode) {
    const locale =
      getLocaleFromPathname(pathname) ??
      resolvePreferredLocale({
        cookieHeader: request.headers.get("cookie"),
        acceptLanguage: request.headers.get("accept-language"),
      })
    const target = request.nextUrl.clone()
    target.pathname = `/${locale}`
    target.searchParams.set(REFERRAL_QUERY_PARAM, pathReferralCode)
    const response = NextResponse.redirect(target)
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    })
    return applyReferralCookie(request, response)
  }

  const urlLocale = getLocaleFromPathname(pathname)

  if (urlLocale) {
    const response = NextResponse.next()
    response.cookies.set(LOCALE_COOKIE_NAME, urlLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    })
    return applyReferralCookie(request, response)
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
  return applyReferralCookie(request, response)
}

export const config = {
  matcher: ["/((?!_next|api).*)"],
}

