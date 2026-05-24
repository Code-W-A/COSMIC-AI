import "server-only"

import { getOblioConfig } from "@/lib/oblio/config"

type TokenCache = {
  token: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

function getCachedToken() {
  if (!tokenCache) return null
  if (Date.now() >= tokenCache.expiresAt) return null
  return tokenCache.token
}

function toNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

async function requestAccessToken(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCachedToken()
    if (cached) return cached
  }

  const config = getOblioConfig()
  const formData = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
  })

  const response = await fetch(`${config.baseUrl}/api/authorize/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
    cache: "no-store",
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload) {
    throw new Error("Unable to get Oblio access token.")
  }

  const token =
    (typeof payload?.access_token === "string" && payload.access_token) ||
    (typeof payload?.data?.access_token === "string" && payload.data.access_token)

  if (!token) {
    throw new Error("Oblio access token is missing in response.")
  }

  const expiresIn = toNumber(payload?.expires_in ?? payload?.data?.expires_in, 3600)

  tokenCache = {
    token,
    expiresAt: Date.now() + Math.max(300, expiresIn - 30) * 1000,
  }

  return token
}

async function requestOblio<TResponse>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE"
    body?: Record<string, unknown>
    bodyFormat?: "json" | "form"
    forceRefresh?: boolean
    idempotencyKey?: string
  } = {}
) {
  const config = getOblioConfig()
  const token = await requestAccessToken(options.forceRefresh)
  const bodyFormat = options.bodyFormat ?? "json"
  const body =
    bodyFormat === "form" && options.body
      ? new URLSearchParams(
          Object.entries(options.body).reduce<Record<string, string>>((acc, [key, value]) => {
            if (value === undefined || value === null) return acc
            acc[key] = String(value)
            return acc
          }, {})
        )
      : options.body
        ? JSON.stringify(options.body)
        : undefined

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: options.method ?? "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type":
        bodyFormat === "form" ? "application/x-www-form-urlencoded" : "application/json",
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    body,
    cache: "no-store",
  })

  if (response.status === 401 && !options.forceRefresh) {
    return requestOblio<TResponse>(path, {
      ...options,
      forceRefresh: true,
    })
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      (typeof payload?.statusMessage === "string" && payload.statusMessage) ||
      (typeof payload?.message === "string" && payload.message) ||
      "Oblio request failed."
    throw new Error(message)
  }

  if (payload && typeof payload.status === "number" && payload.status >= 400) {
    const message =
      (typeof payload.statusMessage === "string" && payload.statusMessage) ||
      "Oblio API responded with an error."
    throw new Error(message)
  }

  return payload as TResponse
}

export const oblioClient = {
  request: requestOblio,
}
