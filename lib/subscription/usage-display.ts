export const CHAT_USAGE_WARNING_SESSION_KEY = "chat-usage-warning-4of5"

export function getRemainingQuestions(count: number, limit: number) {
  return Math.max(limit - count, 0)
}

export function shouldShowUsageUpsell(isPremium: boolean) {
  return !isPremium
}

export function shouldShowLimitBanner(count: number, limit: number, isPremium: boolean) {
  if (isPremium) return false
  return getRemainingQuestions(count, limit) <= 1
}

export function getUpgradeHref(localizedPath: (path: string) => string) {
  return localizedPath("/pricing")
}

export function shouldThrottleFourOfFiveBanner(count: number, limit: number) {
  const remaining = getRemainingQuestions(count, limit)
  if (remaining !== 1) return false
  if (typeof window === "undefined") return false
  return window.sessionStorage.getItem(CHAT_USAGE_WARNING_SESSION_KEY) === "1"
}

export function markFourOfFiveBannerShown() {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(CHAT_USAGE_WARNING_SESSION_KEY, "1")
}
