import "server-only"

type RateLimitEntry = {
  timestamps: number[]
}

const hits = new Map<string, RateLimitEntry>()

export function isContactRateLimited(
  uid: string,
  { maxRequests = 3, windowMs = 15 * 60_000 }: { maxRequests?: number; windowMs?: number } = {}
) {
  const now = Date.now()
  const entry = hits.get(uid)
  const timestamps = (entry?.timestamps ?? []).filter((timestamp) => now - timestamp < windowMs)

  if (timestamps.length >= maxRequests) {
    hits.set(uid, { timestamps })
    return true
  }

  timestamps.push(now)
  hits.set(uid, { timestamps })
  return false
}
