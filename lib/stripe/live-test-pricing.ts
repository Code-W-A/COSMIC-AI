export const LIVE_TEST_PRICING_QUERY = "test"
export const LIVE_TEST_TOKEN_QUERY = "token"
export const LIVE_TEST_PRICING_SESSION_KEY = "cosmic_live_test_pricing"

export type LiveTestPricingState = {
  enabled: boolean
  token: string
}

type SearchParamsLike = {
  get(name: string): string | null
}

function readEnv(name: string) {
  const value = process.env[name]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function isLiveTestPricingQuery(searchParams: SearchParamsLike) {
  return searchParams.get(LIVE_TEST_PRICING_QUERY) === "true"
}

export function getLiveTestPricingTokenFromQuery(searchParams: SearchParamsLike) {
  const token = searchParams.get(LIVE_TEST_TOKEN_QUERY)
  return typeof token === "string" && token.trim() ? token.trim() : ""
}

export function parseLiveTestPricingFromQuery(
  searchParams: SearchParamsLike
): LiveTestPricingState | null {
  if (!isLiveTestPricingQuery(searchParams)) return null

  const token = getLiveTestPricingTokenFromQuery(searchParams)
  if (!token) return null

  return { enabled: true, token }
}

export function isLiveTestPricingEnabled() {
  return Boolean(
    readEnv("STRIPE_PRICE_PREMIUM_MONTHLY_RON_LIVE_TEST") ||
      readEnv("STRIPE_PRICE_PREMIUM_ANNUAL_RON_LIVE_TEST") ||
      readEnv("STRIPE_PRICE_REPORT_ONEOFF_RON_LIVE_TEST")
  )
}

export function validateLiveTestPricing(clientToken?: string | null) {
  if (!isLiveTestPricingEnabled()) return false

  const requiredToken = readEnv("STRIPE_LIVE_TEST_PRICING_TOKEN")
  if (!requiredToken) return false

  const normalizedClientToken =
    typeof clientToken === "string" && clientToken.trim() ? clientToken.trim() : ""

  return normalizedClientToken.length > 0 && normalizedClientToken === requiredToken
}

export function appendLiveTestPricingParams(
  url: string,
  state: LiveTestPricingState | null | undefined
) {
  if (!state?.enabled || !state.token) return url

  const separator = url.includes("?") ? "&" : "?"
  const params = new URLSearchParams()
  params.set(LIVE_TEST_PRICING_QUERY, "true")
  params.set(LIVE_TEST_TOKEN_QUERY, state.token)

  return `${url}${separator}${params.toString()}`
}

export function readLiveTestPricingSession(): LiveTestPricingState | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.sessionStorage.getItem(LIVE_TEST_PRICING_SESSION_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<LiveTestPricingState>
    if (parsed.enabled !== true || typeof parsed.token !== "string" || !parsed.token.trim()) {
      return null
    }

    return { enabled: true, token: parsed.token.trim() }
  } catch {
    return null
  }
}

export function writeLiveTestPricingSession(state: LiveTestPricingState | null) {
  if (typeof window === "undefined") return

  try {
    if (!state?.enabled || !state.token) {
      window.sessionStorage.removeItem(LIVE_TEST_PRICING_SESSION_KEY)
      return
    }

    window.sessionStorage.setItem(LIVE_TEST_PRICING_SESSION_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function buildLiveTestCheckoutFields(state: LiveTestPricingState | null) {
  if (!state?.enabled || !state.token) return {}

  return {
    liveTestPricing: true,
    liveTestToken: state.token,
  }
}

export function resolveLiveTestPricingState(
  searchParams: SearchParamsLike | null | undefined
): LiveTestPricingState | null {
  const fromQuery = searchParams ? parseLiveTestPricingFromQuery(searchParams) : null
  if (fromQuery) {
    writeLiveTestPricingSession(fromQuery)
    return fromQuery
  }

  return readLiveTestPricingSession()
}
