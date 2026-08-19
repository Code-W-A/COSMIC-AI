export const REFERRAL_QUERY_PARAM = "ref"
export const REFERRAL_COOKIE_NAME = "cosmic_ref"
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90
export const DEFAULT_REFERRAL_DISCOUNT_PERCENT = 20
export const DEFAULT_REFERRAL_COUPON_ID = "astroai_influencer_20_once"

const REFERRAL_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{1,31}$/

export function normalizeReferralCode(value: string | null | undefined): string | null {
  if (!value) return null
  const code = value.trim().toLowerCase()
  if (!REFERRAL_CODE_PATTERN.test(code)) return null
  return code
}

export function parseReferralCodeFromPathname(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean)
  if (parts[0] === "r" && parts[1]) return normalizeReferralCode(parts[1])
  if ((parts[0] === "ro" || parts[0] === "en") && parts[1] === "r" && parts[2]) {
    return normalizeReferralCode(parts[2])
  }
  return null
}

export function getReferralCodeFromSearchParams(searchParams: {
  get(name: string): string | null
}): string | null {
  return normalizeReferralCode(searchParams.get(REFERRAL_QUERY_PARAM))
}

export function getReferralCodeFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const chunk = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${REFERRAL_COOKIE_NAME}=`))

  if (!chunk) return null
  const [, value = ""] = chunk.split("=")
  return normalizeReferralCode(decodeURIComponent(value))
}

export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null
  const email = value.trim().toLowerCase()
  return email.includes("@") ? email : null
}

export function suggestReferralCode(input: {
  email?: string | null
  name?: string | null
}): string {
  const fromEmail = (input.email ?? "").split("@")[0] ?? ""
  const fromName = input.name ?? ""
  const raw = `${fromEmail || fromName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)

  return normalizeReferralCode(raw) ?? "partner"
}
