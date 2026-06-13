import "server-only"

type RateLimitEntry = {
  timestamps: number[]
}

const hits = new Map<string, RateLimitEntry>()

export function isAnalyticsRateLimited(
  key: string,
  { maxRequests = 60, windowMs = 60_000 }: { maxRequests?: number; windowMs?: number } = {}
) {
  const now = Date.now()
  const entry = hits.get(key)
  const timestamps = (entry?.timestamps ?? []).filter((timestamp) => now - timestamp < windowMs)

  if (timestamps.length >= maxRequests) {
    hits.set(key, { timestamps })
    return true
  }

  timestamps.push(now)
  hits.set(key, { timestamps })
  return false
}

export function getAnalyticsRateLimitKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown"
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown"
}
